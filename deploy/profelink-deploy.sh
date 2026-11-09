#!/usr/bin/env bash
set -Eeuo pipefail

readonly BASE_DIR=/home/deploy/profelink
readonly CONFIG_DIR=/etc/profelink
readonly UPLOAD_DIR=/var/lib/profelink-ci-upload/incoming
readonly STATE_DIR=/var/lib/profelink
readonly MARKERS_LINK="$STATE_DIR/markers-current"

fail() {
  printf 'ProfeLink deployment failed: %s\n' "$*" >&2
  exit 1
}

if (( EUID != 0 )); then
  fail 'must run as root through the fixed sudo rule'
fi
umask 077

mode=deploy
case $# in
  1)
    case "$1" in
      --trigger)
        mode=deploy
        ;;
      --rollback)
        mode=rollback
        ;;
      *)
        fail 'only the fixed --trigger and --rollback modes are accepted'
        ;;
    esac
    ;;
  *)
    fail 'one fixed deployment mode is required'
    ;;
esac

expected_release_tag=''
if [[ "$mode" == deploy ]]; then
  IFS= read -r expected_release_tag || fail 'deployment trigger identity is missing or malformed'
  if IFS= read -r -n 1 _; then
    fail 'deployment trigger must provide exactly one release identity'
  fi
  [[ "$expected_release_tag" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || \
    fail 'deployment trigger identity is malformed'
fi

install -d -o root -g root -m 0700 "$STATE_DIR"
command -v flock >/dev/null 2>&1 || fail 'flock is required to serialize production deploy and rollback operations'
exec 9>>"$STATE_DIR/deploy.lock"
flock -n 9 || fail 'another deployment or rollback is already running'

validate_release_tag() {
  local tag=$1 description=$2
  [[ "$tag" =~ ^([0-9a-f]{40}(-[0-9]+-[0-9]+)?|latest)$ ]] || fail "$description has an invalid tag"
}

read_release_markers() {
  local marker_dir marker_target
  active_tag=latest
  previous_tag=''

  if [[ -e "$MARKERS_LINK" || -L "$MARKERS_LINK" ]]; then
    [[ -L "$MARKERS_LINK" ]] || fail 'release marker pointer is not a symlink'
    marker_target=$(readlink "$MARKERS_LINK") || fail 'release marker pointer is unreadable'
    [[ "$marker_target" == markers.* && "$marker_target" != */* ]] || fail 'release marker pointer has an invalid target'
    marker_dir="$STATE_DIR/$marker_target"
    [[ -d "$marker_dir" && ! -L "$marker_dir" ]] || fail 'release marker directory is invalid'
    for name in active-release previous-release; do
      [[ -f "$marker_dir/$name" && ! -L "$marker_dir/$name" ]] || fail "release marker is not a regular file: $name"
    done
    active_tag=$(cat "$marker_dir/active-release")
    previous_tag=$(cat "$marker_dir/previous-release")
    validate_release_tag "$active_tag" 'active release marker'
    validate_release_tag "$previous_tag" 'previous release marker'
    return
  fi

  if [[ -e "$STATE_DIR/active-release" || -L "$STATE_DIR/active-release" ]]; then
    [[ -f "$STATE_DIR/active-release" && ! -L "$STATE_DIR/active-release" ]] || fail 'active release marker is not a regular file'
    active_tag=$(cat "$STATE_DIR/active-release")
    validate_release_tag "$active_tag" 'active release marker'
  fi

  if [[ -e "$STATE_DIR/previous-release" || -L "$STATE_DIR/previous-release" ]]; then
    [[ -f "$STATE_DIR/previous-release" && ! -L "$STATE_DIR/previous-release" ]] || fail 'previous release marker is not a regular file'
    previous_tag=$(cat "$STATE_DIR/previous-release")
    validate_release_tag "$previous_tag" 'previous release marker'
  fi
}

publish_release_markers() {
  local next_active=$1 next_previous=$2 marker_dir marker_link
  validate_release_tag "$next_active" 'active release marker'
  validate_release_tag "$next_previous" 'previous release marker'

  marker_dir=$(mktemp -d "$STATE_DIR/markers.XXXXXXXX") || return 1
  printf '%s\n' "$next_active" > "$marker_dir/active-release" || return 1
  printf '%s\n' "$next_previous" > "$marker_dir/previous-release" || return 1
  chmod 0600 "$marker_dir/active-release" "$marker_dir/previous-release" || return 1

  marker_link="$STATE_DIR/markers-current.new.$$"
  ln -s "$(basename "$marker_dir")" "$marker_link" || return 1
  mv -Tf "$marker_link" "$MARKERS_LINK" || return 1

  # The pointer above is the canonical marker state. The flat files are read
  # only to migrate helpers written before generation-based marker swaps.
  rm -f -- "$STATE_DIR/active-release" "$STATE_DIR/previous-release" || true
}

ensure_images_available() {
  local tag=$1 service image
  for service in auth-service actividades frontend; do
    image="proyectofinalparadigma-$service:$tag"
    docker image inspect "$image" >/dev/null || fail "rollback image is unavailable: $image"
  done
}

compose() {
  local image_tag=$1
  shift
  IMAGE_TAG="$image_tag" docker compose \
    --project-name proyectofinalparadigma \
    --project-directory "$BASE_DIR" \
    --env-file "$BASE_DIR/.env.production" \
    --file "$CONFIG_DIR/docker-compose.yml" \
    --file "$CONFIG_DIR/docker-compose.prod.yml" \
    "$@"
}

healthy() {
  local image_tag=$1
  local attempt service image expected ids id state actual count all_healthy
  for attempt in $(seq 1 36); do
    all_healthy=true
    for service in auth-service actividades frontend; do
      image="proyectofinalparadigma-$service:$image_tag"
      expected=$(docker image inspect --format '{{.Id}}' "$image") || {
        all_healthy=false
        break
      }
      ids=$(compose "$image_tag" ps --quiet "$service" 2>/dev/null || true)
      count=$(printf '%s\n' "$ids" | sed '/^$/d' | wc -l)
      if (( count != 1 )); then
        all_healthy=false
        break
      fi
      id=$(printf '%s\n' "$ids" | sed '/^$/d')
      state=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$id")
      actual=$(docker inspect --format '{{.Image}}' "$id")
      if [[ "$state" != healthy || "$actual" != "$expected" ]]; then
        all_healthy=false
        break
      fi
    done
    if [[ "$all_healthy" == true ]] && \
      curl --fail --silent --show-error --max-time 10 http://127.0.0.1:5001/health/ready >/dev/null && \
      curl --fail --silent --show-error --max-time 10 http://127.0.0.1:5002/salud >/dev/null && \
      curl --fail --silent --show-error --max-time 10 http://127.0.0.1:5173/health >/dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

start_release() {
  local tag=$1
  compose "$tag" up --detach --no-build --force-recreate auth-service actividades frontend
}

restore_former_active() {
  local former_active=$1
  printf 'Attempting to restore former active release %s.\n' "$former_active" >&2
  if start_release "$former_active" && healthy "$former_active"; then
    printf 'Former active release restored: %s\n' "$former_active" >&2
    return 0
  fi
  printf 'Former active release could not be confirmed healthy: %s\n' "$former_active" >&2
  return 1
}

publish_markers_or_restore() {
  local active=$1 previous=$2 former_active=$3 restored=$4 failed=$5
  publish_release_markers "$active" "$previous" && return 0
  restore_former_active "$former_active" && fail "$restored"
  fail "$failed"
}

preserved_image_refs=()

preserve_release_image_tags() {
  local tag service image image_id hold
  for tag in "$active_tag" "$previous_tag"; do
    [[ -n "$tag" ]] || continue
    [[ "$tag" != "$release_tag" ]] || fail 'new release tag collides with a protected rollback tag'
    for service in auth-service actividades frontend; do
      image="proyectofinalparadigma-$service:$tag"
      if ! docker image inspect "$image" >/dev/null 2>&1; then
        [[ "$tag" != "$active_tag" ]] && continue
        fail "rollback image is unavailable: $image"
      fi
      image_id=$(docker image inspect --format '{{.Id}}' "$image") || fail "rollback image identity is unavailable: $image"
      hold="profelink-deploy-hold:${tag}-${service}-$$"
      if ! docker image tag "$image_id" "$hold"; then
        fail "could not preserve rollback image: $image"
      fi
      preserved_image_refs+=("$hold|$image")
    done
  done
}

restore_release_image_tags() {
  local ref hold image
  for ref in "${preserved_image_refs[@]}"; do
    IFS='|' read -r hold image <<< "$ref"
    docker image tag "$hold" "$image" || {
      printf 'Rollback image reference needs manual restoration: %s from %s\n' "$image" "$hold" >&2
      return 1
    }
  done
  for ref in "${preserved_image_refs[@]}"; do
    IFS='|' read -r hold _ <<< "$ref"
    docker image rm "$hold" >/dev/null 2>&1 || true
  done
}

read_release_markers

if [[ "$mode" == rollback ]]; then
  [[ -n "$previous_tag" ]] || fail 'no previous release marker is available for manual rollback'
  ensure_images_available "$previous_tag"
  ensure_images_available "$active_tag"
  compose "$previous_tag" config --quiet || fail 'production Compose configuration is invalid for manual rollback'

  if ! start_release "$previous_tag"; then
    if restore_former_active "$active_tag"; then
      fail 'manual rollback could not be started; former active release was restored; markers unchanged'
    fi
    fail 'manual rollback could not be started; former active release could not be restored; markers unchanged'
  fi
  if ! healthy "$previous_tag"; then
    if restore_former_active "$active_tag"; then
      fail 'manual rollback health checks failed; markers unchanged'
    fi
    fail 'manual rollback health checks failed; former active release could not be restored; markers unchanged'
  fi

  publish_markers_or_restore "$previous_tag" "$active_tag" "$active_tag" \
    'manual rollback marker publication failed; former active release was restored; markers unchanged' \
    'manual rollback marker publication failed; former active release could not be restored; inspect production state'
  printf 'Rollback healthy: %s\n' "$previous_tag"
  exit 0
fi

upload_tag=$expected_release_tag
for name in "release-$upload_tag.tar" "release-$upload_tag.manifest" "release-$upload_tag.manifest.sig"; do
  source_file="$UPLOAD_DIR/$name"
  [[ -f "$source_file" && ! -L "$source_file" ]] || fail "missing regular upload file: $name"
done

work_dir=$(mktemp -d "$STATE_DIR/release.XXXXXXXX")
trap 'rm -rf -- "$work_dir"' EXIT
install -o root -g root -m 0600 "$UPLOAD_DIR/release-$upload_tag.tar" "$work_dir/release.tar"
install -o root -g root -m 0600 "$UPLOAD_DIR/release-$upload_tag.manifest" "$work_dir/release.manifest"
install -o root -g root -m 0600 "$UPLOAD_DIR/release-$upload_tag.manifest.sig" "$work_dir/release.manifest.sig"

ssh-keygen -Y verify -f "$CONFIG_DIR/release-signers" -I github-deploy \
  -n profelink-release -s "$work_dir/release.manifest.sig" \
  < "$work_dir/release.manifest" >/dev/null 2>&1 || fail 'release manifest signature is invalid'
manifest=$(cat "$work_dir/release.manifest")
[[ "$manifest" =~ ^([0-9a-f]{64})[[:space:]]([0-9a-f]{40}-[0-9]+-[0-9]+)$ ]] || \
  fail 'release manifest format is invalid'
expected_sha=${BASH_REMATCH[1]}
release_tag=${BASH_REMATCH[2]}
[[ "$release_tag" == "$expected_release_tag" ]] || fail 'release identity does not match the deployment trigger'
actual_sha=$(sha256sum "$work_dir/release.tar" | cut -d ' ' -f 1)
[[ "$actual_sha" == "$expected_sha" ]] || fail 'archive checksum mismatch'

[[ -s "$work_dir/release.tar" ]] || fail 'release archive is empty'

ensure_images_available "$active_tag"
preserve_release_image_tags
load_status=0
docker load --input "$work_dir/release.tar" || load_status=$?
restore_status=0
restore_release_image_tags || restore_status=$?
(( restore_status == 0 )) || fail 'rollback image references could not be restored after Docker load; inspect preserved hold tags'
(( load_status == 0 )) || fail 'Docker could not load the signed release archive'
images=(
  "proyectofinalparadigma-auth-service:$release_tag"
  "proyectofinalparadigma-actividades:$release_tag"
  "proyectofinalparadigma-frontend:$release_tag"
)
for image in "${images[@]}"; do
  docker image inspect "$image" >/dev/null || fail "loaded image is missing: $image"
done

compose "$release_tag" config --quiet || fail 'production Compose configuration is invalid'
if ! start_release "$release_tag"; then
  if restore_former_active "$active_tag"; then
    fail 'new release did not start; previous release was restored'
  fi
  fail 'new release did not start; previous release could not be restored; markers unchanged'
fi

if ! healthy "$release_tag"; then
  if restore_former_active "$active_tag"; then
    fail 'health checks failed; previous release was restored'
  fi
  fail 'health checks failed; previous release could not be restored; markers unchanged'
fi

publish_markers_or_restore "$release_tag" "$active_tag" "$active_tag" \
  'release marker publication failed; previous release was restored; markers unchanged' \
  'release marker publication failed; previous release could not be restored; inspect production state'
rm -f -- "$UPLOAD_DIR/release-$upload_tag.tar" "$UPLOAD_DIR/release-$upload_tag.manifest" "$UPLOAD_DIR/release-$upload_tag.manifest.sig" \
  "$UPLOAD_DIR/release.sha256" "$UPLOAD_DIR/release.tag"
printf 'Deployment healthy: %s\n' "$release_tag"
