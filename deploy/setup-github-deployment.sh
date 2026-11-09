#!/usr/bin/env bash
set -Eeuo pipefail

fail() {
  printf 'ProfeLink CI setup failed: %s\n' "$*" >&2
  exit 1
}

if (( EUID != 0 )); then
  fail 'run this one-time setup with sudo'
fi
if (( $# != 2 )); then
  fail 'usage: sudo ./setup-github-deployment.sh UPLOAD_PUBLIC_KEY TRIGGER_PUBLIC_KEY'
fi

readonly ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
readonly BASE_DIR=/home/deploy/profelink
readonly UPLOAD_USER=profelink-ci-upload
readonly TRIGGER_USER=profelink-ci-trigger
readonly UPLOAD_HOME=/var/lib/profelink-ci-upload
readonly TRIGGER_HOME=/var/lib/profelink-ci-trigger
readonly UPLOAD_SSHD_CONFIG=/etc/ssh/sshd_config.d/profelink-ci-upload.conf
readonly AUTHORIZED_KEYS_HELPER=/usr/local/libexec/profelink-authorized-keys

for file in \
  "$ROOT_DIR/docker-compose.yml" \
  "$ROOT_DIR/docker-compose.prod.yml" \
  "$ROOT_DIR/deploy/profelink-deploy.sh" \
  "$ROOT_DIR/deploy/profelink-deploy-trigger.sh"; do
  [[ -f "$file" && ! -L "$file" ]] || fail "required project file is missing: $file"
done
for file in "$1" "$2"; do
  [[ -f "$file" && ! -L "$file" ]] || fail 'public key paths must be regular files'
  [[ $(wc -l < "$file") -eq 1 ]] || fail 'each public key file must contain exactly one line'
  ssh-keygen -lf "$file" >/dev/null 2>&1 || fail 'invalid SSH public key'
  read -r key_type key_data _ < "$file"
  [[ "$key_type" == ssh-ed25519 && "$key_data" =~ ^[A-Za-z0-9+/]+={0,2}$ ]] || \
    fail 'expected one Ed25519 public key in each file'
done
[[ -f "$BASE_DIR/.env.production" && -f "$BASE_DIR/autenticacion/.env" && -f "$BASE_DIR/actividades/.env" ]] || \
  fail 'production Compose and service environment files must already exist on the Droplet'

for account in "$UPLOAD_USER:$UPLOAD_HOME" "$TRIGGER_USER:$TRIGGER_HOME"; do
  username=${account%%:*}
  home=${account#*:}
  if ! id "$username" >/dev/null 2>&1; then
    useradd --system --home-dir "$home" --shell /bin/sh --no-create-home "$username"
  fi
  passwd --lock "$username" >/dev/null
  install -d -o root -g root -m 0755 "$home"
  install -d -o root -g root -m 0700 "$home/.ssh"
done
install -d -o "$UPLOAD_USER" -g "$UPLOAD_USER" -m 0300 "$UPLOAD_HOME/incoming"

read -r upload_type upload_data _ < "$1"
read -r trigger_type trigger_data _ < "$2"
printf 'restrict %s %s\n' "$upload_type" "$upload_data" > "$UPLOAD_HOME/.ssh/authorized_keys"
printf 'restrict,command="/usr/local/libexec/profelink-deploy-trigger" %s %s\n' "$trigger_type" "$trigger_data" > "$TRIGGER_HOME/.ssh/authorized_keys"
chown root:root "$UPLOAD_HOME/.ssh/authorized_keys" "$TRIGGER_HOME/.ssh/authorized_keys"
chmod 0600 "$UPLOAD_HOME/.ssh/authorized_keys" "$TRIGGER_HOME/.ssh/authorized_keys"

install -d -o root -g root -m 0755 /etc/profelink /etc/ssh/sshd_config.d /usr/local/libexec /var/lib/profelink
release_signers_tmp=$(mktemp)
printf 'github-deploy %s %s\n' "$trigger_type" "$trigger_data" > "$release_signers_tmp"
install -o root -g root -m 0644 "$release_signers_tmp" /etc/profelink/release-signers
upload_sshd_tmp=$(mktemp)
sshd_backup_tmp=$(mktemp)
had_upload_sshd_config=false
authorized_keys_helper_tmp=$(mktemp)
authorized_keys_helper_backup_tmp=$(mktemp)
had_authorized_keys_helper=false
sudoers_tmp=$(mktemp)
trap 'rm -f -- "$upload_sshd_tmp" "$sshd_backup_tmp" "$authorized_keys_helper_tmp" "$authorized_keys_helper_backup_tmp" "$sudoers_tmp" "$release_signers_tmp"' EXIT
if [[ -e "$UPLOAD_SSHD_CONFIG" || -L "$UPLOAD_SSHD_CONFIG" ]]; then
  [[ -f "$UPLOAD_SSHD_CONFIG" && ! -L "$UPLOAD_SSHD_CONFIG" ]] || fail 'existing upload SSH policy is not a regular file'
  cp -p -- "$UPLOAD_SSHD_CONFIG" "$sshd_backup_tmp"
  had_upload_sshd_config=true
fi
if [[ -e "$AUTHORIZED_KEYS_HELPER" || -L "$AUTHORIZED_KEYS_HELPER" ]]; then
  [[ -f "$AUTHORIZED_KEYS_HELPER" && ! -L "$AUTHORIZED_KEYS_HELPER" ]] || fail 'existing authorized-keys helper is not a regular file'
  cp -p -- "$AUTHORIZED_KEYS_HELPER" "$authorized_keys_helper_backup_tmp"
  had_authorized_keys_helper=true
fi

restore_upload_sshd_config() {
  if [[ "$had_upload_sshd_config" == true ]]; then
    install -o root -g root -m 0644 "$sshd_backup_tmp" "$UPLOAD_SSHD_CONFIG"
  else
    rm -f -- "$UPLOAD_SSHD_CONFIG"
  fi
}

restore_authorized_keys_helper() {
  if [[ "$had_authorized_keys_helper" == true ]]; then
    install -o root -g root -m 0755 "$authorized_keys_helper_backup_tmp" "$AUTHORIZED_KEYS_HELPER"
  else
    rm -f -- "$AUTHORIZED_KEYS_HELPER"
  fi
}

cat > "$authorized_keys_helper_tmp" <<EOF
#!/bin/sh
set -eu
case "\${1-}" in
  $UPLOAD_USER) cat '$UPLOAD_HOME/.ssh/authorized_keys' ;;
  $TRIGGER_USER) cat '$TRIGGER_HOME/.ssh/authorized_keys' ;;
  *) exit 0 ;;
esac
EOF
install -o root -g root -m 0755 "$authorized_keys_helper_tmp" "$AUTHORIZED_KEYS_HELPER"

cat > "$upload_sshd_tmp" <<EOF
# Read only the root-owned CI keys through this allowlisted helper.
Match User $UPLOAD_USER,$TRIGGER_USER
    AuthorizedKeysFile none
    AuthorizedKeysCommand $AUTHORIZED_KEYS_HELPER %u
    AuthorizedKeysCommandUser root

# The upload account can create new files only in its chrooted incoming directory.
Match User $UPLOAD_USER
    ChrootDirectory $UPLOAD_HOME
    ForceCommand internal-sftp -d /incoming -u 077 -p open,close,write,lstat,fstat,stat,realpath,limits
    PermitTTY no
    AllowTcpForwarding no
    AllowAgentForwarding no
    X11Forwarding no
    PermitTunnel no
EOF
install -o root -g root -m 0644 "$upload_sshd_tmp" "$UPLOAD_SSHD_CONFIG"
if ! sshd -t; then
  restore_upload_sshd_config
  restore_authorized_keys_helper
  fail 'OpenSSH configuration validation failed; previous policy restored'
fi
if ! systemctl reload ssh; then
  restore_upload_sshd_config
  restore_authorized_keys_helper
  fail 'OpenSSH policy reload failed; previous policy restored'
fi

install -o root -g root -m 0644 "$ROOT_DIR/docker-compose.yml" /etc/profelink/docker-compose.yml
install -o root -g root -m 0644 "$ROOT_DIR/docker-compose.prod.yml" /etc/profelink/docker-compose.prod.yml
install -o root -g root -m 0750 "$ROOT_DIR/deploy/profelink-deploy.sh" /usr/local/sbin/profelink-deploy
install -o root -g root -m 0755 "$ROOT_DIR/deploy/profelink-deploy-trigger.sh" /usr/local/libexec/profelink-deploy-trigger

printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/profelink-deploy --trigger\n' "$TRIGGER_USER" > "$sudoers_tmp"
visudo --check --file "$sudoers_tmp" >/dev/null || fail 'sudoers rule validation failed'
install -o root -g root -m 0440 "$sudoers_tmp" /etc/sudoers.d/profelink-ci-trigger
visudo --check --file /etc/sudoers.d/profelink-ci-trigger >/dev/null || fail 'installed sudoers rule validation failed'

docker compose version >/dev/null 2>&1 || fail 'Docker Compose plugin is unavailable'
printf 'One-time CI deployment access configured. The two private keys must remain in the GitHub production environment secrets.\n'
