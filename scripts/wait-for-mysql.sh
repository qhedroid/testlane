#!/usr/bin/env bash
# Wait until the relay-mysql container accepts connections.
set -euo pipefail

MAX_ATTEMPTS="${1:-60}"
SLEEP_SECS="${2:-2}"

echo "Waiting for MySQL (up to $((MAX_ATTEMPTS * SLEEP_SECS))s)…"

for ((i = 1; i <= MAX_ATTEMPTS; i++)); do
  if docker compose exec -T mysql mysqladmin ping -h 127.0.0.1 -u relay -prelay --silent 2>/dev/null; then
    echo "MySQL is ready."
    exit 0
  fi
  printf '.'
  sleep "$SLEEP_SECS"
done

echo ""
echo "MySQL did not become ready in time."
echo "Check: docker compose ps"
echo "Logs:  docker compose logs mysql"
exit 1
