#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

if git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  GIT_COMMAND=(git -C "$APP_DIR")
elif [[ -d "$APP_DIR/work/repo.git" ]]; then
  GIT_COMMAND=(git --git-dir="$APP_DIR/work/repo.git" --work-tree="$APP_DIR")
else
  echo "No ENAcademy Git repository was found at $APP_DIR." >&2
  exit 1
fi

"${GIT_COMMAND[@]}" config core.hooksPath .githooks

echo "ENAcademy Git hooks are enabled."
echo "Direct pushes to main will be rejected; use a branch and pull request."
