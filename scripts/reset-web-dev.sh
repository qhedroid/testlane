#!/usr/bin/env bash
# Stop anything on :3000 and clear the Next.js build cache (fixes vendor-chunk 500s).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${RELAY_DEV_PORT:-3000}"

echo "Stopping processes on port ${PORT}…"
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti ":${PORT}" 2>/dev/null || true)"
  if [ -n "${PIDS}" ]; then
    # shellcheck disable=SC2086
    kill ${PIDS} 2>/dev/null || true
    sleep 1
  fi
fi

echo "Removing apps/web/.next…"
rm -rf "${ROOT}/apps/web/.next"

echo "Done. Start the app with: pnpm dev"
