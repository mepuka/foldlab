$ErrorActionPreference = "Stop"

$module = Resolve-Path (Join-Path $PSScriptRoot "../../proto/go")
Push-Location $module
try {
    go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode corrupted
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode coverage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    # Honest divergence is deliberately red: the command exits 1 and prints
    # the minimized schedule. Do not turn that finding into a passing count.
    go run ./catalogr4/cmd -mode honest
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
