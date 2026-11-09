#!/usr/bin/env bash
set -Eeuo pipefail

command -v docker >/dev/null 2>&1 || {
  printf 'Docker is required for the SFTP runtime integration test.\n' >&2
  exit 2
}

docker run --rm -i alpine:3.22 sh -s <<'CONTAINER_SCRIPT'
set -eu
apk add --no-cache openssh openssh-server openssh-sftp-server >/dev/null

upload_user=profelink-ci-upload
upload_home=/var/lib/profelink-ci-upload
adduser -D -H -h "/home/$upload_user" -s /bin/sh "$upload_user"
printf '%s:test-only-password\n' "$upload_user" | chpasswd >/dev/null
mkdir -p "$upload_home/incoming" \
  "$upload_home/.ssh" \
  /usr/local/libexec \
  "$upload_home/etc"
chown root:root "$upload_home"
chmod 0755 "$upload_home"
[[ "$(stat -c '%U:%G:%a' "$upload_home")" == root:root:755 ]]
chown "$upload_user:$upload_user" "$upload_home/incoming"
chmod 0300 "$upload_home/incoming"
printf 'secret fixture\n' > "$upload_home/etc/passwd"
chmod 0644 "$upload_home/etc/passwd"

ssh-keygen -A >/dev/null
ssh-keygen -q -t ed25519 -N '' -f /tmp/client_key
install -o root -g root -m 0600 /tmp/client_key.pub \
  "$upload_home/.ssh/authorized_keys"
chmod 0700 "$upload_home/.ssh"
[[ "$(stat -c '%U:%G:%a' "$upload_home/.ssh")" == root:root:700 ]]
[[ "$(stat -c '%U:%G:%a' "$upload_home/.ssh/authorized_keys")" == root:root:600 ]]

cat > /usr/local/libexec/profelink-authorized-keys <<'EOF'
#!/bin/sh
set -eu
case "${1-}" in
  profelink-ci-upload) cat /var/lib/profelink-ci-upload/.ssh/authorized_keys ;;
  *) exit 0 ;;
esac
EOF
chown root:root /usr/local/libexec/profelink-authorized-keys
chmod 0755 /usr/local/libexec/profelink-authorized-keys
[[ "$(stat -c '%U:%G:%a' /usr/local/libexec/profelink-authorized-keys)" == root:root:755 ]]
[[ -z "$(/usr/local/libexec/profelink-authorized-keys unrelated-user)" ]]
if su -s /bin/sh "$upload_user" -c "test -r '$upload_home/.ssh/authorized_keys'"; then
  printf 'FAIL: the upload account can read its root-only authorized_keys file\n' >&2
  exit 1
fi

cat > /etc/ssh/sshd_config <<EOF
Port 2222
ListenAddress 127.0.0.1
HostKey /etc/ssh/ssh_host_ed25519_key
PidFile /run/sshd.pid
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
LogLevel VERBOSE
AllowUsers $upload_user
Subsystem sftp internal-sftp
Match User $upload_user
    AuthorizedKeysFile none
    AuthorizedKeysCommand /usr/local/libexec/profelink-authorized-keys %u
    AuthorizedKeysCommandUser root
    ChrootDirectory $upload_home
    ForceCommand internal-sftp -d /incoming -u 077 -p open,close,write,lstat,fstat,stat,realpath,limits
    PermitTTY no
    AllowTcpForwarding no
    AllowAgentForwarding no
    X11Forwarding no
    PermitTunnel no
EOF
sshd -t
/usr/sbin/sshd -E /tmp/sshd.log

ssh_options='-P 2222 -i /tmp/client_key -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
sftp_batch() {
  local batch=$1
  printf '%s\n' "$batch" | sftp $ssh_options "$upload_user@127.0.0.1"
}
expect_sftp_failure() {
  local batch=$1 label=$2
  sftp_batch "$batch" > /tmp/sftp.log 2>&1 || true
  if ! grep -Eiq 'Permission denied|Failure' /tmp/sftp.log; then
    printf 'FAIL: SFTP unexpectedly allowed %s\n' "$label" >&2
    cat /tmp/sftp.log >&2
    exit 1
  fi
}

printf 'verified release payload\n' > /tmp/release.tag
sftp_batch 'put /tmp/release.tag /incoming/release.tag' >/tmp/upload.log 2>&1 || {
  cat /tmp/upload.log >&2
  grep -Ei 'authorized|ownership|key.*file|could not open|trying public|found key|not allowed|failed' /tmp/sshd.log >&2 || true
  exit 1
}
cmp -s /tmp/release.tag "$upload_home/incoming/release.tag" || {
  printf 'FAIL: SFTP upload did not persist the expected contents\n' >&2
  exit 1
}

expect_sftp_failure 'ls /incoming' 'directory listing'
expect_sftp_failure 'get /etc/passwd /tmp/passwd' 'file reads'
expect_sftp_failure 'mkdir /incoming/forbidden' 'directory creation'
expect_sftp_failure 'rm /incoming/release.tag' 'file deletion'
expect_sftp_failure 'put /tmp/release.tag /outside.txt' 'writes outside incoming'
ssh -n -p 2222 -i /tmp/client_key -o IdentitiesOnly=yes -o BatchMode=yes \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  "$upload_user@127.0.0.1" echo shell_access_marker >/tmp/shell.log 2>&1 || true
if grep -q shell_access_marker /tmp/shell.log; then
  printf 'FAIL: upload account unexpectedly received a shell\n' >&2
  exit 1
fi
if ! test -f "$upload_home/incoming/release.tag"; then
  printf 'FAIL: a denied request changed the uploaded release file\n' >&2
  exit 1
fi
if test -e "$upload_home/outside.txt"; then
  printf 'FAIL: an upload escaped the chroot\n' >&2
  exit 1
fi
printf 'PASS: SFTP permits the release upload and rejects reads, listing, mutation, shell, and paths outside incoming.\n'
CONTAINER_SCRIPT
