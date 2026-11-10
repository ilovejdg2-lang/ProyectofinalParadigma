# Instalación local con PostgreSQL desechable. No toca Supabase ni el despliegue.
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

$localDir = Join-Path $Root '.local'
New-Item -ItemType Directory -Force -Path $localDir | Out-Null
$envFile = Join-Path $localDir 'entorno.env'

if (-not (Test-Path $envFile)) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 24
  $rng.GetBytes($bytes)
  $password = ([Convert]::ToBase64String($bytes) -replace '\+', 'A' -replace '/', 'B' -replace '=', '')
  Set-Content -Path $envFile -Encoding ascii -Value "LOCAL_DB_PASSWORD=$password"
  Write-Host "Se creó .local/entorno.env. No lo subas al repositorio."
}

# Compose prioriza la variable del proceso sobre --env-file. Si quedó
# un valor viejo en la sesión, Postgres arranca con otra contraseña.
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^LOCAL_DB_PASSWORD=(.*)$') {
    $env:LOCAL_DB_PASSWORD = $Matches[1].Trim()
  }
}

$credenciales = Join-Path $localDir 'credenciales-demo.txt'
@'
Cuentas que auth-service crea cuando la base local esta vacia.
Este archivo no se versiona. No lo pegues en el README ni en un canal publico.

Docente:        profesor@una.cr / Profesor123!
Estudiante:     estudiante@est.una.ac.cr / Estudiante123!
Administrador:  admin@una.cr / Admin123!
'@ | Set-Content -Path $credenciales -Encoding utf8
Write-Host "Cuentas locales: .local/credenciales-demo.txt"

function Elegir-Puerto {
  param([int[]]$Candidatos)
  $escucha = netstat -ano -p tcp | Select-String 'LISTENING'
  foreach ($puerto in $Candidatos) {
    $ocupado = $escucha | Where-Object { $_.Line -match ":$puerto\s" }
    if (-not $ocupado) { return "$puerto" }
  }
  throw "Ningún puerto libre entre $($Candidatos -join ', ')."
}

if (-not $env:LOCAL_FRONTEND_PORT) {
  $env:LOCAL_FRONTEND_PORT = Elegir-Puerto 5173, 5174, 5180, 5181, 5182
}
if (-not $env:LOCAL_GRAFANA_PORT) {
  $env:LOCAL_GRAFANA_PORT = Elegir-Puerto 3000, 3011, 3020, 3021, 3022
}

$compose = @('--env-file', $envFile, '-f', 'docker-compose.local.yml')

function Invoke-Compose {
  # Función simple a propósito: en una función avanzada, -d se lo queda -Debug.
  & docker compose @compose @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Levantando PostgreSQL local..."
Invoke-Compose up -d postgres

Write-Host "Aplicando migraciones de autenticación y actividades..."
Invoke-Compose --profile preparar run --rm --build preparar-auth
Invoke-Compose --profile preparar run --rm --build preparar-actividades

Write-Host "Construyendo auth-service, actividades, frontend y Grafana..."
Invoke-Compose up -d --build otel-lgtm auth-service actividades frontend

Write-Host ""
Write-Host "Frontend:     http://127.0.0.1:$($env:LOCAL_FRONTEND_PORT)"
Write-Host "Autenticación: http://127.0.0.1:5001/health/ready"
Write-Host "Actividades:  http://127.0.0.1:5002/salud"
Write-Host "PostgreSQL:   127.0.0.1:54329"
Write-Host "Grafana:      http://127.0.0.1:$($env:LOCAL_GRAFANA_PORT)"
Write-Host "Para detener: scripts/detener.ps1"
