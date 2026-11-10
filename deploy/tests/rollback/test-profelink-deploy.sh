#!/usr/bin/env bash
set -Eeuo pipefail

readonly SOURCE_SCRIPT=${1:-/workspace/deploy/profelink-deploy.sh}
readonly TAG_OLD=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-100-1
readonly TAG_NEW=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-101-1
readonly TAG_CANDIDATE=cccccccccccccccccccccccccccccccccccccccc-102-1

failures=0

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  failures=$((failures + 1))
}

assert_eq() {
  local expected=$1 actual=$2 description=$3
  [[ "$actual" == "$expected" ]] || fail "$description (expected '$expected', got '$actual')"
}

assert_contains() {
  local needle=$1 file=$2 description=$3
  grep -Fq -- "$needle" "$file" || fail "$description (missing '$needle')"
}

assert_not_contains() {
  local needle=$1 file=$2 description=$3
  [[ ! -f "$file" ]] || ! grep -Fq -- "$needle" "$file" || fail "$description (unexpected '$needle')"
}

case_dir=
bin_dir=
state_dir=
upload_dir=
output_file=

cleanup_case() {
  [[ -n "${case_dir:-}" ]] && rm -rf -- "$case_dir"
  return 0
}
trap cleanup_case EXIT

marker_values() {
  local marker_root=$state_dir
  if [[ -L "$state_dir/markers-current" ]]; then
    marker_root="$state_dir/markers-current"
  fi
  local active='' previous=''
  [[ -f "$marker_root/active-release" ]] && active=$(cat "$marker_root/active-release")
  [[ -f "$marker_root/previous-release" ]] && previous=$(cat "$marker_root/previous-release")
  printf '%s|%s' "$active" "$previous"
}

write_fake_commands() {
  cat > "$bin_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

state=${FAKE_STATE:?}
case "${1:-}" in
  image)
    case "${2:-}" in
      inspect)
        if [[ "${3:-}" == --format ]]; then
          image=${5:?}
        else
          image=${3:?}
        fi
        if [[ -n "${MISSING_TAG:-}" && "$image" == *:$MISSING_TAG ]]; then
          exit 1
        fi
        if [[ "${3:-}" == --format ]]; then
          printf 'sha256:%s\n' "$image"
        fi
        ;;
      tag)
        printf 'retag:%s:%s\n' "${3:?}" "${4:?}" >> "$state/docker-tags.log"
        printf 'tag:%s:%s\n' "${3:?}" "${4:?}" >> "$state/events.log"
        ;;
      *)
        exit 64
        ;;
    esac
    ;;
  tag)
    # Compatibility in case the implementation uses the top-level alias.
    printf 'retag:%s:%s\n' "${2:?}" "${3:?}" >> "$state/docker-tags.log"
    printf 'tag:%s:%s\n' "${2:?}" "${3:?}" >> "$state/events.log"
    ;;
  load)
    printf 'load\n' >> "$state/events.log"
    exit 0
    ;;
  compose)
    tag=${IMAGE_TAG:?}
    action=''
    for argument in "$@"; do
      case "$argument" in
        config|up|ps)
          action=$argument
          break
          ;;
      esac
    done
    case "$action" in
      config)
        exit 0
        ;;
      up)
        printf 'up:%s\n' "$tag" >> "$state/compose.log"
        if [[ "${LOCK_TEST_PAUSE:-}" == true ]]; then
          touch "$state/locked-up-started"
          /bin/sleep 1
        fi
        [[ "${FAIL_UP_TAG:-}" != "$tag" ]]
        ;;
      ps)
        printf '%s' "$tag" > "$state/current-tag"
        count_file="$state/ps.$tag"
        count=0
        [[ -f "$count_file" ]] && count=$(cat "$count_file")
        printf '%s' "$((count + 1))" > "$count_file"
        service=''
        for argument in "$@"; do
          case "$argument" in
            auth-service|actividades|frontend) service=$argument ;;
          esac
        done
        if [[ -n "$service" ]]; then
          printf 'container-%s\n' "$service"
        else
          printf 'container-1\ncontainer-2\ncontainer-3\n'
        fi
        ;;
      *)
        exit 64
        ;;
    esac
    ;;
  inspect)
    template=${3:-}
    container=${4:-}
    service=${container#container-}
    tag=$(cat "$state/current-tag")
    count=$(cat "$state/ps.$tag")
    if [[ "$template" == *'{{.Image}}'* ]]; then
      if [[ "${WRONG_IMAGE_TAG:-}" == "$tag" && "${WRONG_IMAGE_SERVICE:-}" == "$service" ]]; then
        printf 'sha256:unexpected-image\n'
      else
        printf 'sha256:proyectofinalparadigma-%s:%s\n' "$service" "$tag"
      fi
    elif [[ "${HEALTH_FAIL_TAG:-}" == "$tag" ]] || \
      [[ "${HEALTH_DELAY_TAG:-}" == "$tag" && "$count" -le "${HEALTH_DELAY_ATTEMPTS:-0}" ]]; then
      printf 'starting\n'
    else
      printf 'healthy\n'
    fi
    ;;
  *)
    exit 64
    ;;
esac
EOF

  cat > "$bin_dir/ssh-keygen" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
signature=''
while (($#)); do
  if [[ "$1" == -s ]]; then
    signature=${2:?}
    break
  fi
  shift
done
expected=$(sha256sum | awk '{print $1}')
[[ -n "$signature" && "$(cat "$signature")" == "$expected" ]]
EOF

  cat > "$bin_dir/mv" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
destination=${@: -1}
if [[ "${FAIL_MARKER_PUBLISH:-}" == true && "$destination" == */markers-current ]]; then
  exit 1
fi
exec /bin/mv "$@"
EOF

  cat > "$bin_dir/curl" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

tag=$(cat "${FAKE_STATE:?}/current-tag")
[[ "${HEALTH_FAIL_TAG:-}" != "$tag" ]]
EOF

  cat > "$bin_dir/sleep" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

marker_root=${TEST_STATE_DIR:?}
if [[ -L "$marker_root/markers-current" ]]; then
  marker_root="$marker_root/markers-current"
fi
active=''
previous=''
[[ -f "$marker_root/active-release" ]] && active=$(cat "$marker_root/active-release")
[[ -f "$marker_root/previous-release" ]] && previous=$(cat "$marker_root/previous-release")
printf '%s|%s\n' "$active" "$previous" >> "${FAKE_STATE:?}/sleep-markers.log"
EOF
  # PowerShell checkouts can leave CRLF in this script, including the heredoc
  # payloads; normalize generated commands so their shebangs work under WSL.
  sed -i 's/\r$//' "$bin_dir/docker" "$bin_dir/curl" "$bin_dir/sleep" "$bin_dir/ssh-keygen" "$bin_dir/mv"
  chmod +x "$bin_dir/docker" "$bin_dir/curl" "$bin_dir/sleep" "$bin_dir/ssh-keygen" "$bin_dir/mv"
}

setup_case() {
  cleanup_case
  case_dir=$(mktemp -d)
  bin_dir="$case_dir/bin"
  state_dir="$case_dir/state"
  upload_dir="$case_dir/upload"
  output_file="$case_dir/output"
  mkdir -p "$bin_dir" "$state_dir" "$upload_dir" "$case_dir/base" "$case_dir/fake-state"
  sed -e "s|^readonly BASE_DIR=.*|readonly BASE_DIR=$case_dir/base|" -e "s|^readonly CONFIG_DIR=.*|readonly CONFIG_DIR=$case_dir/config|" -e "s|^readonly UPLOAD_DIR=.*|readonly UPLOAD_DIR=$upload_dir|" -e "s|^readonly STATE_DIR=.*|readonly STATE_DIR=$state_dir|" "$SOURCE_SCRIPT" > "$case_dir/profelink-deploy"
  sed -i 's/\r$//' "$case_dir/profelink-deploy"
  chmod +x "$case_dir/profelink-deploy"
  write_fake_commands
}

set_legacy_markers() {
  local active=$1 previous=${2:-}
  printf '%s\n' "$active" > "$state_dir/active-release"
  if [[ -n "$previous" ]]; then
    printf '%s\n' "$previous" > "$state_dir/previous-release"
  fi
}

write_upload() {
  local tag=$1
  local archive="$upload_dir/release-$tag.tar"
  printf 'release archive for %s\n' "$tag" > "$archive"
  printf '%s %s\n' "$(sha256sum "$archive" | awk '{print $1}')" "$tag" > "$upload_dir/release-$tag.manifest"
  sha256sum "$upload_dir/release-$tag.manifest" | awk '{print $1}' > "$upload_dir/release-$tag.manifest.sig"
}

run_helper() {
  local status expected_tag=${1:-$TAG_CANDIDATE} trigger_payload
  trigger_payload=${2:-$expected_tag}
  set +e
  if [[ "${1:-}" == --rollback ]]; then
    PATH="$bin_dir:$PATH" \
      FAKE_STATE="$case_dir/fake-state" \
      TEST_STATE_DIR="$state_dir" \
      "$case_dir/profelink-deploy" --rollback > "$output_file" 2>&1
  else
    PATH="$bin_dir:$PATH" \
      FAKE_STATE="$case_dir/fake-state" \
      TEST_STATE_DIR="$state_dir" \
      "$case_dir/profelink-deploy" --trigger <<< "$trigger_payload" > "$output_file" 2>&1
  fi
  status=$?
  set -e
  return "$status"
}

test_successful_manual_rollback_rotates_markers() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  if ! run_helper --rollback; then
    fail 'manual rollback should succeed'
    return
  fi
  assert_eq "$TAG_OLD|$TAG_NEW" "$(marker_values)" 'manual rollback should atomically swap active and previous markers'
  [[ -L "$state_dir/markers-current" ]] || fail 'successful rollback should publish a canonical marker generation'
  assert_contains "Rollback healthy: $TAG_OLD" "$output_file" 'manual rollback should report the healthy restored release'
}

test_latest_previous_marker_is_reenterable() {
  setup_case
  set_legacy_markers "$TAG_NEW" latest

  if ! run_helper --rollback; then
    fail 'manual rollback to latest should succeed'
    return
  fi
  assert_eq "latest|$TAG_NEW" "$(marker_values)" 'latest should remain a valid active marker after rollback'
  assert_contains 'up:latest' "$case_dir/fake-state/compose.log" 'rollback should recreate services from latest'
}

test_missing_previous_images_leave_markers_unchanged() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  if MISSING_TAG="$TAG_OLD" run_helper --rollback; then
    fail 'manual rollback with unavailable images should fail'
  fi
  assert_eq "$TAG_NEW|$TAG_OLD" "$(marker_values)" 'missing rollback images must not alter markers'
  assert_not_contains 'up:' "$case_dir/fake-state/compose.log" 'missing rollback images must not recreate services'
  assert_contains "rollback image is unavailable: proyectofinalparadigma-auth-service:$TAG_OLD" "$output_file" 'missing image failure should name the unavailable rollback image'
}

test_missing_former_active_images_prevent_manual_rollback() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  if MISSING_TAG="$TAG_NEW" run_helper --rollback; then
    fail 'manual rollback without former active images should fail before changing services'
  fi
  assert_eq "$TAG_NEW|$TAG_OLD" "$(marker_values)" 'missing former active images must preserve markers'
  assert_not_contains 'up:' "$case_dir/fake-state/compose.log" 'missing former active images must prevent switching services'
  assert_contains "rollback image is unavailable: proyectofinalparadigma-auth-service:$TAG_NEW" "$output_file" 'missing former active image failure should identify the image'
}

test_delayed_candidate_health_publishes_markers_only_after_success() {
  setup_case
  set_legacy_markers "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"

  if ! HEALTH_DELAY_TAG="$TAG_CANDIDATE" HEALTH_DELAY_ATTEMPTS=2 run_helper; then
    fail 'deployment with delayed health should succeed'
    return
  fi
  assert_eq "$TAG_CANDIDATE|$TAG_OLD" "$(marker_values)" 'delayed healthy deployment should publish the candidate only after health succeeds'
  assert_eq "$(printf '%s|\n%s|' "$TAG_OLD" "$TAG_OLD")" "$(cat "$case_dir/fake-state/sleep-markers.log")" 'markers must remain on the former release during delayed health checks'
  assert_contains "Deployment healthy: $TAG_CANDIDATE" "$output_file" 'successful delayed deployment should report the candidate'
}

test_failed_manual_rollback_restores_former_active_and_preserves_markers() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  if HEALTH_FAIL_TAG="$TAG_OLD" run_helper --rollback; then
    fail 'manual rollback with failed health checks should fail'
  fi
  assert_eq "$TAG_NEW|$TAG_OLD" "$(marker_values)" 'failed manual rollback must leave markers unchanged'
  assert_contains "up:$TAG_OLD" "$case_dir/fake-state/compose.log" 'manual rollback should attempt the previous release'
  assert_contains "up:$TAG_NEW" "$case_dir/fake-state/compose.log" 'failed manual rollback should restore the former active release'
  assert_contains "manual rollback health checks failed; markers unchanged" "$output_file" 'failed manual rollback should report unchanged markers'
  assert_contains "Former active release restored: $TAG_NEW" "$output_file" 'failed manual rollback should report restoration of the former active release'
}

test_failed_candidate_health_restores_active_without_publishing_markers() {
  setup_case
  set_legacy_markers "$TAG_OLD" "$TAG_NEW"
  write_upload "$TAG_CANDIDATE"

  if HEALTH_FAIL_TAG="$TAG_CANDIDATE" run_helper; then
    fail 'candidate with failed health checks should fail'
  fi
  assert_eq "$TAG_OLD|$TAG_NEW" "$(marker_values)" 'failed candidate health must leave markers unchanged'
  assert_contains "up:$TAG_CANDIDATE" "$case_dir/fake-state/compose.log" 'failed candidate should have been attempted'
  assert_contains "up:$TAG_OLD" "$case_dir/fake-state/compose.log" 'failed candidate should restore the active release'
  assert_contains 'health checks failed; previous release was restored' "$output_file" 'failed candidate should report the restored previous release'
}

test_signed_manifest_rejects_replaced_archive_even_with_matching_checksum() {
  setup_case
  set_legacy_markers "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"
  printf 'attacker replacement\n' > "$upload_dir/release-$TAG_CANDIDATE.tar"

  if run_helper; then
    fail 'a substituted archive without a matching trusted signature must be rejected'
  fi
  assert_contains 'archive checksum mismatch' "$output_file" 'signed archive digest must reject an upload key holder replacing the archive'
  assert_eq "$TAG_OLD|" "$(marker_values)" 'substituted archive must leave release markers unchanged'
  assert_not_contains 'up:' "$case_dir/fake-state/compose.log" 'substituted archive must not start services'
}

test_signed_old_release_cannot_be_replayed_for_current_trigger() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"
  write_upload "$TAG_OLD"
  cp "$upload_dir/release-$TAG_OLD.tar" "$upload_dir/release-$TAG_CANDIDATE.tar"
  cp "$upload_dir/release-$TAG_OLD.manifest" "$upload_dir/release-$TAG_CANDIDATE.manifest"
  cp "$upload_dir/release-$TAG_OLD.manifest.sig" "$upload_dir/release-$TAG_CANDIDATE.manifest.sig"

  if run_helper "$TAG_CANDIDATE"; then
    fail 'a valid old signed release must not deploy under a different current trigger identity'
  fi
  assert_contains 'release identity does not match the deployment trigger' "$output_file" 'mismatched signed release should explain the rejected identity'
  assert_eq "$TAG_NEW|$TAG_OLD" "$(marker_values)" 'rejected replay must preserve active and previous release markers'
  assert_not_contains 'load' "$case_dir/fake-state/events.log" 'rejected replay must fail before Docker loads images'
  assert_not_contains 'up:' "$case_dir/fake-state/compose.log" 'rejected replay must not switch services'
}

test_malformed_trigger_identity_fails_before_docker_or_service_changes() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  if run_helper "$TAG_CANDIDATE" 'not-a-release-identity'; then
    fail 'malformed trigger identity must be rejected'
  fi
  assert_contains 'deployment trigger identity is malformed' "$output_file" 'malformed trigger identity should explain why it was rejected'
  assert_eq "$TAG_NEW|$TAG_OLD" "$(marker_values)" 'malformed trigger identity must preserve release markers'
  assert_not_contains 'load' "$case_dir/fake-state/events.log" 'malformed trigger identity must fail before Docker image loading'
  assert_not_contains 'up:' "$case_dir/fake-state/compose.log" 'malformed trigger identity must not switch services'
}

test_deployment_and_manual_rollback_share_host_lock() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"

  PATH="$bin_dir:$PATH" FAKE_STATE="$case_dir/fake-state" TEST_STATE_DIR="$state_dir" LOCK_TEST_PAUSE=true \
    "$case_dir/profelink-deploy" --rollback > "$case_dir/first-output" 2>&1 &
  first_pid=$!
  for _ in $(seq 1 50); do
    [[ -f "$case_dir/fake-state/locked-up-started" ]] && break
    /bin/sleep 0.1
  done
  [[ -f "$case_dir/fake-state/locked-up-started" ]] || fail 'first rollback did not enter its locked service switch'

  output_file="$case_dir/second-output"
  if run_helper --rollback; then
    fail 'concurrent rollback must fail while another deploy operation owns the lock'
  fi
  assert_contains 'another deployment or rollback is already running' "$output_file" 'concurrent operation should report lock contention'
  wait "$first_pid" || fail 'the lock-owning rollback should complete successfully'
  assert_eq "$TAG_OLD|$TAG_NEW" "$(marker_values)" 'the serialized rollback should publish one consistent marker state'
}

test_marker_publication_failure_restores_former_active() {
  local operation=$1 active=$2 previous=$3
  shift 3
  setup_case
  set_legacy_markers "$active" "$previous"
  [[ "$operation" != deployment ]] || write_upload "$TAG_CANDIDATE"

  if FAIL_MARKER_PUBLISH=true run_helper "$@"; then
    fail "$operation must report marker publication failure"
  fi
  assert_eq "$active|$previous" "$(marker_values)" "$operation marker publication failure must preserve old markers"
  assert_contains "up:$active" "$case_dir/fake-state/compose.log" "$operation marker publication failure must restore the former active release"
}

test_deployment_restores_active_and_previous_image_tags_after_load() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"

  if ! run_helper; then
    fail 'deployment should succeed after protecting rollback image tags'
    return
  fi
  local load_line
  load_line=$(grep -n '^load$' "$case_dir/fake-state/events.log" | cut -d: -f1)
  for tag in "$TAG_NEW" "$TAG_OLD"; do
    for service in auth-service actividades frontend; do
      local image="proyectofinalparadigma-$service:$tag"
      local hold_line restore_line
      hold_line=$(grep -n "^tag:sha256:$image:profelink-deploy-hold:" "$case_dir/fake-state/events.log" | cut -d: -f1 | head -n1 || true)
      restore_line=$(grep -n "^tag:profelink-deploy-hold:.*:$image$" "$case_dir/fake-state/events.log" | cut -d: -f1 | tail -n1 || true)
      [[ -n "$hold_line" && "$hold_line" -lt "$load_line" ]] || fail "rollback image tag must be preserved before load: $image"
      [[ -n "$restore_line" && "$restore_line" -gt "$load_line" ]] || fail "rollback image tag must be restored after load: $image"
    done
  done
}

test_pruned_previous_images_do_not_block_deployment() {
  setup_case
  set_legacy_markers "$TAG_NEW" "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"

  if ! MISSING_TAG="$TAG_OLD" run_helper; then
    fail 'deployment should not require a pruned previous release image'
    return
  fi
  assert_eq "$TAG_CANDIDATE|$TAG_NEW" "$(marker_values)" 'successful deployment should rotate markers from the active release'
}

test_successful_deployment_cleans_current_and_legacy_upload_metadata() {
  setup_case
  set_legacy_markers "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"

  if ! run_helper; then
    fail 'deployment should succeed before checking upload cleanup'
    return
  fi
  for name in release.tar release.manifest release.manifest.sig release.sha256 release.tag; do
    [[ ! -e "$upload_dir/$name" ]] || fail "successful deployment should remove upload artifact $name"
  done
  [[ -z "$(find "$upload_dir" -maxdepth 1 -type f -name 'release-*' -print -quit)" ]] || fail 'successful deployment should remove the identity-qualified upload artifacts'
}

test_healthy_candidate_with_wrong_image_id_is_rejected() {
  setup_case
  set_legacy_markers "$TAG_OLD"
  write_upload "$TAG_CANDIDATE"

  if WRONG_IMAGE_TAG="$TAG_CANDIDATE" WRONG_IMAGE_SERVICE=actividades run_helper; then
    fail 'healthy endpoints must not accept a container running the wrong image ID'
  fi
  assert_eq "$TAG_OLD|" "$(marker_values)" 'wrong candidate image must leave release markers unchanged'
  assert_contains "up:$TAG_OLD" "$case_dir/fake-state/compose.log" 'wrong candidate image should restore the former active release'
}

test_successful_manual_rollback_rotates_markers
test_latest_previous_marker_is_reenterable
test_missing_previous_images_leave_markers_unchanged
test_missing_former_active_images_prevent_manual_rollback
test_delayed_candidate_health_publishes_markers_only_after_success
test_failed_manual_rollback_restores_former_active_and_preserves_markers
test_failed_candidate_health_restores_active_without_publishing_markers
test_signed_manifest_rejects_replaced_archive_even_with_matching_checksum
test_signed_old_release_cannot_be_replayed_for_current_trigger
test_malformed_trigger_identity_fails_before_docker_or_service_changes
test_deployment_and_manual_rollback_share_host_lock
test_marker_publication_failure_restores_former_active deployment "$TAG_OLD" "$TAG_NEW"
test_marker_publication_failure_restores_former_active 'manual rollback' "$TAG_NEW" "$TAG_OLD" --rollback
test_deployment_restores_active_and_previous_image_tags_after_load
test_pruned_previous_images_do_not_block_deployment
test_successful_deployment_cleans_current_and_legacy_upload_metadata
test_healthy_candidate_with_wrong_image_id_is_rejected

if (( failures > 0 )); then
  printf '%s rollback test assertion(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'rollback deployment tests passed\n'
