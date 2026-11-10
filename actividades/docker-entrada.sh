#!/bin/sh
set -e
dir="${ALMACEN_IMAGENES_DIR:-/app/almacen-imagenes}"
mkdir -p "$dir"
chown -R node:node "$dir"
exec su-exec node "$@"
