#!/usr/bin/env bash
# Instalación local con PostgreSQL desechable. No toca Supabase ni el despliegue.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .local
ENV_FILE="$ROOT/.local/entorno.env"

if [[ ! -f "$ENV_FILE" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)"
  else
    PASS="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
  fi
  printf 'LOCAL_DB_PASSWORD=%s\n' "$PASS" > "$ENV_FILE"
  echo "Se creó .local/entorno.env. No lo subas al repositorio."
fi

cat > "$ROOT/.local/credenciales-demo.txt" <<'EOF'
Cuentas que auth-service crea cuando la base local esta vacia.
Este archivo no se versiona. No lo pegues en el README ni en un canal publico.

Docente:        profesor@una.cr / Profesor123!
Estudiante:     estudiante@est.una.ac.cr / Estudiante123!
Administrador:  admin@una.cr / Admin123!
EOF
echo "Cuentas locales: .local/credenciales-demo.txt"

# Compose prioriza la variable del proceso sobre --env-file.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${PUBLIC_API_URL:-}" ]]; then
  LAN="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -z "$LAN" ]]; then LAN="127.0.0.1"; fi
  export PUBLIC_API_URL="http://${LAN}:5002"
fi
export DOCKER_BUILDKIT=1

echo "Levantando PostgreSQL local..."
docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml up -d postgres

echo "Aplicando migraciones de autenticación y actividades..."
docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml --profile preparar run --rm --build preparar-auth
docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml --profile preparar run --rm --build preparar-actividades

echo "Construyendo auth-service, actividades, frontend y Grafana..."
docker compose --env-file "$ENV_FILE" -f docker-compose.local.yml up -d --build otel-lgtm auth-service actividades frontend

cat <<EOF

Frontend:      http://127.0.0.1:\${LOCAL_FRONTEND_PORT:-5173}
Autenticación: http://127.0.0.1:5001/health/ready
Actividades:   http://127.0.0.1:5002/salud
PostgreSQL:    127.0.0.1:54329
Imágenes:      \${PUBLIC_API_URL}/archivos/
Grafana:       http://127.0.0.1:\${LOCAL_GRAFANA_PORT:-3000}
Para detener:  scripts/detener.sh
Las cuentas de demostración no se imprimen aquí. Pedilas por el canal privado del equipo.
EOF
