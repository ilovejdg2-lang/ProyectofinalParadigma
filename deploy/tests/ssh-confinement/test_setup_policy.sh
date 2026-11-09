#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)
SETUP_SCRIPT="$ROOT_DIR/deploy/setup-github-deployment.sh"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

require_line() {
  local expected=$1
  grep -Fq -- "$expected" "$SETUP_SCRIPT" || fail "missing confinement control: $expected"
}

require_fragment() {
  local expected=$1
  grep -Fq -- "$expected" "$SETUP_SCRIPT" || fail "missing confinement control: $expected"
}

require_line 'readonly UPLOAD_SSHD_CONFIG=/etc/ssh/sshd_config.d/profelink-ci-upload.conf'
require_fragment '/etc/ssh/sshd_config.d'
require_line 'Match User $UPLOAD_USER'
require_line '    ChrootDirectory $UPLOAD_HOME'
require_line '    ForceCommand internal-sftp -d /incoming -u 077 -p open,close,write,lstat,fstat,stat,realpath,limits'
require_line '    AuthorizedKeysFile none'
require_line '    AuthorizedKeysCommand $AUTHORIZED_KEYS_HELPER %u'
require_line '    AuthorizedKeysCommandUser root'
require_line '    PermitTTY no'
require_line '    AllowTcpForwarding no'
require_line '    AllowAgentForwarding no'
require_line '    X11Forwarding no'
require_line '    PermitTunnel no'
require_line 'install -o root -g root -m 0644 "$upload_sshd_tmp" "$UPLOAD_SSHD_CONFIG"'
require_line 'install -d -o root -g root -m 0755 "$home"'
require_line 'install -d -o root -g root -m 0700 "$home/.ssh"'
require_line 'chmod 0600 "$UPLOAD_HOME/.ssh/authorized_keys" "$TRIGGER_HOME/.ssh/authorized_keys"'
require_line 'printf '\''github-deploy %s %s\n'\'' "$trigger_type" "$trigger_data" > "$release_signers_tmp"'
require_line 'install -o root -g root -m 0644 "$release_signers_tmp" /etc/profelink/release-signers'
require_fragment 'NOPASSWD: /usr/local/sbin/profelink-deploy --trigger\n'
require_line 'command="/usr/local/libexec/profelink-deploy-trigger"'
require_line 'install -o root -g root -m 0755 "$authorized_keys_helper_tmp" "$AUTHORIZED_KEYS_HELPER"'
require_line 'restore_authorized_keys_helper'
require_line 'if ! sshd -t; then'
require_line 'restore_upload_sshd_config'
require_line 'if ! systemctl reload ssh; then'
require_line 'install -d -o "$UPLOAD_USER" -g "$UPLOAD_USER" -m 0300 "$UPLOAD_HOME/incoming"'
require_line 'printf '\''restrict %s %s\n'\'' "$upload_type" "$upload_data" > "$UPLOAD_HOME/.ssh/authorized_keys"'
require_line 'case "\${1-}" in'

if grep -Fq 'command="internal-sftp' "$SETUP_SCRIPT"; then
  fail 'upload key must not provide a weaker alternate forced-command policy'
fi

printf 'PASS: SSH/SFTP confinement policy is installed and validated.\n'
