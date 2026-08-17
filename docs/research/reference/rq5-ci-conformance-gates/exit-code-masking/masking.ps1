# Own-authored reproduction: PowerShell's half of the same problem.
# Evidence, not a gate.
#
# PowerShell does not have `set -e` for native commands. A failing native
# command sets $LASTEXITCODE and $? and then execution CONTINUES, even
# under $ErrorActionPreference = 'Stop'. The explicit
# `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` in this estate's
# Windows CI steps is therefore load-bearing, not defensive noise.

Write-Output '== (1) native exit code survives Tee-Object'
& cmd /c 'exit 3' | Tee-Object -FilePath "$env:TEMP\rq5-masking.log" | Out-Null
Write-Output "  LASTEXITCODE=$LASTEXITCODE"

Write-Output ''
Write-Output '== (2) $? after a failing native command'
& cmd /c 'exit 3' | Out-Null
Write-Output "  dollar-question=$?  LASTEXITCODE=$LASTEXITCODE"

Write-Output ''
Write-Output "== (3) `$ErrorActionPreference='Stop' does NOT stop on a native nonzero exit"
$ErrorActionPreference = 'Stop'
& cmd /c 'exit 3' | Out-Null
Write-Output "  still running; LASTEXITCODE=$LASTEXITCODE"
