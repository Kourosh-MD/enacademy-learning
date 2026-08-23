#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
  echo "Usage: ./stop-app.sh"
  echo
  echo "Stop ENAcademy containers while preserving database and Redis data."
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

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available." >&2
  exit 1
fi

cd "$APP_DIR"

echo "Stopping ENAcademy..."
docker compose down --remove-orphans
echo "ENAcademy is stopped. PostgreSQL and Redis data were preserved."
