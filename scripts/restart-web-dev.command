#!/usr/bin/env bash
# Double-click in Finder to restart the Testlane web dev server.
# Stops anything on :3000, clears .next, runs pnpm dev, then opens Chrome with a
# fresh demo state (?relay-reset=1 clears testlane-demo-v2 localStorage).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${RELAY_DEV_PORT:-3000}"
RESET_URL="http://127.0.0.1:${PORT}/DP/dashboard?relay-reset=1"

# Finder does not load shell profiles; ensure pnpm/node are on PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:${HOME}/.local/share/pnpm:${PATH}"
if [ -f "${HOME}/.zprofile" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.zprofile"
fi
if [ -f "${HOME}/.zshrc" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.zshrc"
fi

cd "${ROOT}"

echo "Testlane dev restart — ${ROOT}"
bash "${ROOT}/scripts/reset-web-dev.sh"
echo ""
echo "Starting dev server…"

pnpm dev &
DEV_PID=$!

cleanup() {
  kill "${DEV_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for http://127.0.0.1:${PORT}…"
ready=0
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "${DEV_PID}" 2>/dev/null; then
    echo "Dev server exited unexpectedly."
    exit 1
  fi
  sleep 1
done

if [ "${ready}" -ne 1 ]; then
  echo "Timed out waiting for dev server on port ${PORT}."
  exit 1
fi

echo "Opening ${RESET_URL}…"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "${RESET_URL}"
else
  open "${RESET_URL}"
fi

trap - EXIT INT TERM
wait "${DEV_PID}"
