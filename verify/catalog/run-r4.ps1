$ErrorActionPreference = "Stop"

$bridge = Join-Path $PSScriptRoot "run-wire.ps1"
& $bridge
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$module = Resolve-Path (Join-Path $PSScriptRoot "../../proto/go")
Push-Location $module
try {
    go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $replyMutants = @(
        "catalogr4_reply_created",
        "catalogr4_reply_converged",
        "catalogr4_reply_admitted",
        "catalogr4_reply_refused"
    )
    foreach ($tag in $replyMutants) {
        Write-Host "== reply mutant: $tag (must be caught)"
        go run -tags $tag ./catalogr4/cmd -mode reply-mutant
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    go run ./catalogr4/cmd -mode corrupted
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "== coverage assertion (131/3,079/1,077 + 3/3 + 5/5)"
    go test ./catalogr4 -run '^TestCorpusIsDeterministicAndCoversEveryRatifiedBranch$' -count=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode coverage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    go run ./catalogr4/cmd -mode honest
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
