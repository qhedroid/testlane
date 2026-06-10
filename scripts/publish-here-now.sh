#!/usr/bin/env bash
# Publish the Relay fresh UI static export to here.now.
# See docs/deployment/here-now.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/web/src/app/api"
API_BAK="$ROOT/apps/web/.api-export-bak"
OUT_DIR="$ROOT/apps/web/out"
SLUG="${HERENOW_SLUG:-${1:-}}"
PUBLISH_SH="${HOME}/.cursor/skills/here-now/scripts/publish.sh"

if [[ ! -x "$PUBLISH_SH" ]]; then
  PUBLISH_SH="${HOME}/.agents/skills/here-now/scripts/publish.sh"
fi
if [[ ! -x "$PUBLISH_SH" ]]; then
  echo "error: here.now publish.sh not found. Install: npx skills add heredotnow/skill --skill here-now -g" >&2
  exit 1
fi

cleanup() {
  if [[ -d "$API_BAK" ]]; then
    rm -rf "$API_DIR" 2>/dev/null || true
    mv "$API_BAK" "$API_DIR"
  fi
}
trap cleanup EXIT

if [[ -d "$API_DIR" ]]; then
  echo "Moving API routes aside for static export…"
  rm -rf "$API_BAK"
  mv "$API_DIR" "$API_BAK"
fi

echo "Building static export (RELAY_STATIC_EXPORT=1)…"
cd "$ROOT"
RELAY_STATIC_EXPORT=1 pnpm build

if [[ ! -d "$OUT_DIR" ]]; then
  echo "error: expected export output at $OUT_DIR" >&2
  exit 1
fi

ARGS=(
  "$OUT_DIR"
  --client cursor
  --spa
  --title "Relay — QA Workspace Demo"
  --description "Relay prototype demo: Dashboard, Test Cases, and Test Runs"
)
if [[ -n "$SLUG" ]]; then
  ARGS+=(--slug "$SLUG")
  echo "Updating here.now site: $SLUG"
else
  echo "Creating new here.now site…"
fi

"$PUBLISH_SH" "${ARGS[@]}"
