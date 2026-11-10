# Detiene la instalación local y conserva el volumen de PostgreSQL.
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root
$envFile = Join-Path $Root '.local\entorno.env'
if (-not (Test-Path $envFile)) {
  Write-Error "No existe .local/entorno.env. No hay una instalación local registrada por el script."
}
docker compose --env-file $envFile -f docker-compose.local.yml --profile preparar down
Write-Host "Servicios locales detenidos. Los datos siguen en el volumen profelink-local-db."
Write-Host "Para borrar también esa base: docker compose --env-file .local/entorno.env -f docker-compose.local.yml --profile preparar down -v"
