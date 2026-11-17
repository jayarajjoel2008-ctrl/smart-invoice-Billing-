$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required. Install Docker Desktop and its Compose plugin, then rerun this script.'
}
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Compose plugin was not found. Install it, then rerun this script.'
}

if (-not (Test-Path 'server/.env')) {
  Copy-Item 'server/.env.example' 'server/.env'
  Write-Host 'Created server/.env. Set JWT_SECRET before production use.'
}

$envText = Get-Content 'server/.env' -Raw
if ($envText -match 'replace-with-a-long-random-secret') {
  Write-Warning 'Replace the placeholder JWT_SECRET in server/.env before production use.'
}
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start BillPro AI.' }
Write-Host 'BillPro AI is starting at http://localhost:3000'
Write-Host 'Check status with: docker compose ps'
