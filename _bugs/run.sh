#!/usr/bin/env bash
# Run a repro .ts file with effect/catalog resolution.
# Repro files import from ../packages/core/src/... ; we copy into
# packages/core (where bun resolves the effect catalog dep) and rewrite paths.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$1"
TMP="$ROOT/packages/core/__repro_$(basename "$SRC")"
sed 's#\.\./packages/core/src/#./src/#g' "$SRC" > "$TMP"
trap 'rm -f "$TMP"' EXIT
( cd "$ROOT/packages/core" && bun run "$(basename "$TMP")" )
