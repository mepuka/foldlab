#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
exec bun "$repo/scripts/gates.ts" "$@"
