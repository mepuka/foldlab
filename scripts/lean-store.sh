#!/usr/bin/env bash
# Git Bash shim for scripts/lean-store.ps1, which owns the store and junction
# logic. Arguments pass through; give path arguments in Windows form (C:\...).
set -Eeuo pipefail
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ps1=$(cygpath -w "$here/lean-store.ps1" 2>/dev/null || echo "$here/lean-store.ps1")
if command -v pwsh >/dev/null 2>&1; then
  exec pwsh -NoProfile -ExecutionPolicy Bypass -File "$ps1" "$@"
fi
exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ps1" "$@"
