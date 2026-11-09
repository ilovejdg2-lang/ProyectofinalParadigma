#!/bin/sh
set -eu

original_command=${SSH_ORIGINAL_COMMAND:-}
case "$original_command" in
  *[!a-zA-Z0-9\ -]*)
    echo 'Only a release deployment command is accepted.' >&2
    exit 1
    ;;
esac

if ! printf '%s\n' "$original_command" | LC_ALL=C grep -Exq 'deploy [0-9a-f]{40}-[0-9]+-[0-9]+'; then
  echo 'Only a release deployment command is accepted.' >&2
  exit 1
fi

release_tag=${original_command#deploy }
exec sudo -n /usr/local/sbin/profelink-deploy --trigger <<EOF
$release_tag
EOF
