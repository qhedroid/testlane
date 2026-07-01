#!/usr/bin/env bash
# Start Next.js dev with a single clean process (avoids stale webpack chunk 500s).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${RELAY_DEV_PORT:-3000}"

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti ":${PORT}" 2>/dev/null || true)"
  if [ -n "${PIDS}" ]; then
    echo "Stopping existing process on port ${PORT}…"
    # shellcheck disable=SC2086
    kill ${PIDS} 2>/dev/null || true
    sleep 1
  fi
fi

if [ "${RELAY_DEV_CLEAN:-}" = "1" ]; then
  echo "RELAY_DEV_CLEAN=1 — removing apps/web/.next…"
  rm -rf "${ROOT}/apps/web/.next"
fi

cd "${ROOT}/apps/web"
# Bind to localhost only (avoids network-interface lookup crashes on some Node/macOS setups).
exec pnpm exec next dev --port "${PORT}" --hostname 127.0.0.1
