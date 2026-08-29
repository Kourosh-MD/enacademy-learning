#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DB_USER="${DATABASE_USER:-enacademy}"
DB_NAME="${DATABASE_NAME:-enacademy}"

cd "$APP_DIR"
if ! curl --fail --silent --show-error "${BASE_URL:-http://localhost:3000}/api/v1/actuator/health" >/dev/null 2>&1 \
  && ! curl --fail --silent --show-error "${BASE_URL:-http://localhost:3000}" >/dev/null; then
  echo "ENAcademy is not reachable. Run ./start-app.sh first." >&2
  exit 1
fi

echo "Preparing 100 isolated local load-test accounts..."
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < scripts/exam-load-fixture.sql
echo "Running the full login → open → batch save → submit workflow..."
node scripts/exam-load-test.mjs
