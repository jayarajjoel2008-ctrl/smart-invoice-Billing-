#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine/Desktop and the Compose plugin, then rerun this script." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin was not found. Install it, then rerun this script." >&2
  exit 1
fi

if [[ ! -f server/.env ]]; then
  cp server/.env.example server/.env
  echo "Created server/.env from the template. Set JWT_SECRET before production use."
fi

if grep -q 'replace-with-a-long-random-secret' server/.env; then
  echo "Warning: replace the placeholder JWT_SECRET in server/.env before production use." >&2
fi

docker compose up --build -d
echo "BillPro AI is starting at http://localhost:3000"
echo "Check status with: docker compose ps"
