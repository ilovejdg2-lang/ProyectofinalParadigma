# Publica las tres imágenes del equipo en Docker Hub.
# Requiere sesión: docker login
# y la variable DOCKERHUB_NAMESPACE con el usuario u organización.
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

if (-not $env:DOCKERHUB_NAMESPACE) {
  throw "Definí DOCKERHUB_NAMESPACE con el usuario de Docker Hub antes de publicar."
}

$env:DOCKER_BUILDKIT = '1'
docker compose -f docker-compose.yml -f docker-compose.prod.yml build auth-service actividades frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$pares = @(
  @{ Local = 'proyectofinalparadigma-auth-service:latest'; Remota = "$($env:DOCKERHUB_NAMESPACE)/profelink-auth-service:latest" },
  @{ Local = 'proyectofinalparadigma-actividades:latest'; Remota = "$($env:DOCKERHUB_NAMESPACE)/profelink-actividades:latest" },
  @{ Local = 'proyectofinalparadigma-frontend:latest'; Remota = "$($env:DOCKERHUB_NAMESPACE)/profelink-frontend:latest" }
)

foreach ($par in $pares) {
  docker tag $par.Local $par.Remota
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  docker push $par.Remota
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Publicada $($par.Remota)"
}
