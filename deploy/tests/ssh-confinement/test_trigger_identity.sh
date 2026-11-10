#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)
TRIGGER_SCRIPT="$ROOT_DIR/deploy/profelink-deploy-trigger.sh"
WORKFLOW="$ROOT_DIR/.github/workflows/deploy-production.yml"
tmp_dir=$(mktemp -d)
trap 'rm -rf -- "$tmp_dir"' EXIT
bin_dir="$tmp_dir/bin"
mkdir -p "$bin_dir"
calls="$tmp_dir/calls"

cat > "$bin_dir/sudo" <<'EOF'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "${TRIGGER_TEST_CALLS:?}"
cat >> "${TRIGGER_TEST_CALLS:?}"
EOF
chmod +x "$bin_dir/sudo"

valid_tag=0123456789abcdef0123456789abcdef01234567-123456789-2

if PATH="$bin_dir:$PATH" TRIGGER_TEST_CALLS="$calls" SSH_ORIGINAL_COMMAND="deploy $valid_tag" \
  "$TRIGGER_SCRIPT" >"$tmp_dir/output" 2>&1; then
  :
else
  printf 'FAIL: valid release identity should reach the fixed deploy helper\n' >&2
  exit 1
fi
[[ "$(head -n 1 "$calls")" == '-n /usr/local/sbin/profelink-deploy --trigger' ]] || {
  printf 'FAIL: trigger must invoke only the fixed sudo helper and --trigger mode\n' >&2
  exit 1
}
[[ "$(tail -n 1 "$calls")" == "$valid_tag" ]] || {
  printf 'FAIL: trigger must pass the exact release identity on stdin\n' >&2
  exit 1
}

for command in \
  'id' \
  "deploy $valid_tag extra" \
  "deploy $valid_tag; id" \
  'deploy not-a-release-tag'; do
  : > "$calls"
  if PATH="$bin_dir:$PATH" TRIGGER_TEST_CALLS="$calls" SSH_ORIGINAL_COMMAND="$command" \
    "$TRIGGER_SCRIPT" >"$tmp_dir/output" 2>&1; then
    printf 'FAIL: malformed or arbitrary SSH command should be rejected: %s\n' "$command" >&2
    exit 1
  fi
  [[ ! -s "$calls" ]] || {
    printf 'FAIL: rejected SSH command must not invoke sudo\n' >&2
    exit 1
  }
done

grep -Fq 'release-${GITHUB_SHA}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}.tar' "$WORKFLOW" || {
  printf 'FAIL: workflow upload must name the archive with the current run identity\n' >&2
  exit 1
}
grep -Fq 'profelink-ci-trigger@"$DEPLOY_HOST" "deploy ${GITHUB_SHA}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"' "$WORKFLOW" || {
  printf 'FAIL: workflow trigger must send the current run identity\n' >&2
  exit 1
}

printf 'PASS: deployment trigger accepts only one validated release identity.\n'
