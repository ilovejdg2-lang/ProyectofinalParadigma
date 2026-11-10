#!/usr/bin/env bash
# Detiene la instalación local y conserva el volumen de PostgreSQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.local/entorno.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe .local/entorno.env. No hay una instalación local registrada por el script." >&2
  exit 1
fi
docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml --profile preparar down
echo "Servicios locales detenidos. Los datos siguen en el volumen profelink-local-db."
echo "Para borrar también esa base: docker compose --env-file .local/entorno.env -f docker-compose.local.yml --profile preparar down -v"
