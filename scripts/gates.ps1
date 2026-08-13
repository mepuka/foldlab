$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
& bun (Join-Path $repo "scripts/gates.ts") @args
exit $LASTEXITCODE
