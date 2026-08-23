#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
START_TIMEOUT="${ENACADEMY_START_TIMEOUT:-240}"

show_help() {
  echo "Usage: ./start-app.sh"
  echo
  echo "Build and start the complete ENAcademy Docker stack."
  echo "Set ENACADEMY_START_TIMEOUT to change the health-check timeout in seconds."
}

case "${1:-}" in
  "") ;;
  -h|--help)
    show_help
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    show_help >&2
    exit 2
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or is not available in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available. Install the Docker Compose plugin first." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker and try again." >&2
  exit 1
fi

cd "$APP_DIR"

USING_DEFAULTS=false
if [[ ! -f .env ]]; then
  USING_DEFAULTS=true
  echo "No .env file found; using the local development defaults from docker-compose.yml."
  echo "Copy .env.example to .env and replace every placeholder before deployment."
fi

echo "Starting ENAcademy and waiting for every service to become healthy..."
if ! docker compose up --build --detach --wait --wait-timeout "$START_TIMEOUT"; then
  echo "ENAcademy did not become healthy within ${START_TIMEOUT} seconds." >&2
  docker compose ps >&2 || true
  exit 1
fi

echo
echo "ENAcademy is ready."
echo "Web application:  http://localhost:3000"
echo "API documentation: http://localhost:8080/docs"
echo "Email inbox:       http://localhost:8025"
if [[ "$USING_DEFAULTS" == true ]]; then
  echo "Local admin:        admin@enacademy.local / ChangeMe123!"
else
  echo "Admin credentials are configured in .env."
fi
echo "Run ./stop-app.sh when you are finished."
