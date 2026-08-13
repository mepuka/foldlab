$ErrorActionPreference = "Stop"

$bridge = Join-Path $PSScriptRoot "run-wire.ps1"
& $bridge
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$module = Resolve-Path (Join-Path $PSScriptRoot "../../proto/go")
Push-Location $module
try {
    go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode corrupted
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode coverage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode honest
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
