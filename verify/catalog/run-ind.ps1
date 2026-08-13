$ErrorActionPreference = "Stop"

# verify/catalog/run-ind.ps1 — the R3 induction gate (PowerShell mirror of
# run-ind.sh; that file carries the full contract and the bound justifications).
#
# Three proof obligations, one drift tripwire, three controls, and one
# data-cutoff insensitivity control.  PASS only on all verdicts together; a
# control that comes back green FAILS the gate, because a prover that cannot
# fail proves nothing.  Set $env:R3_QUICK = "1" to skip the insensitivity run.

$here = $PSScriptRoot
$apalacheVersion = "0.61.0"
$apalacheBuild = "831d473"
$recordedJarSha = "33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346"
$recordedTgzSha = "68fb56dd9d053cf21d692fd7ec3fbaaeba1395661ec7434fa2b4c47e6fc432b8"
$url = "https://github.com/apalache-mc/apalache/releases/download/v$apalacheVersion/apalache-$apalacheVersion.tgz"

$jar = if ($env:APALACHE_JAR) {
    $env:APALACHE_JAR
} else {
    Join-Path $here "tools/apalache-$apalacheVersion/lib/apalache.jar"
}

if (-not (Test-Path -LiteralPath $jar)) {
    $tgz = Join-Path $here "tools/apalache-$apalacheVersion.tgz"
    New-Item -ItemType Directory -Force -Path (Join-Path $here "tools") | Out-Null
    Write-Output "Downloading apalache-$apalacheVersion.tgz (~183 MB)..."
    curl.exe -fsSL -o $tgz $url
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $tgzSha = (Get-FileHash -LiteralPath $tgz -Algorithm SHA256).Hash.ToLower()
    Write-Output "  artifact sha256: $tgzSha"
    if ($tgzSha -ne $recordedTgzSha) {
        Write-Output "  WARNING: artifact sha differs from the recorded one ($recordedTgzSha)"
    }
    tar xzf $tgz -C (Join-Path $here "tools")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$jarSha = (Get-FileHash -LiteralPath $jar -Algorithm SHA256).Hash.ToLower()
Write-Output "Apalache jar: $jar"
Write-Output "  sha256: $jarSha"
if ($jarSha -eq $recordedJarSha) {
    Write-Output "  matches the sha recorded in README.md for Apalache $apalacheVersion build $apalacheBuild"
} else {
    Write-Output "  WARNING: differs from the recorded sha $recordedJarSha"
    Write-Output "  (verdicts below are still the gate; a differing jar makes the timings incomparable)"
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$logDir = Join-Path $here "_runlogs/gate-$stamp"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Write-Output "Verbatim output: $logDir"
Write-Output ""

$script:failed = 0

function Invoke-Apalache([string]$Label, [string]$Config, [string]$Init, [string]$Inv, [int]$Length) {
    $log = Join-Path $logDir "$Label.log"
    "### label:   $Label"                                  | Out-File -LiteralPath $log -Encoding utf8
    "### started: $((Get-Date).ToUniversalTime().ToString('o'))" | Out-File -LiteralPath $log -Append -Encoding utf8
    "### jar:     $jar  sha256 $jarSha"                    | Out-File -LiteralPath $log -Append -Encoding utf8
    "### cmd:     java -jar apalache.jar check --config=$Config --init=$Init --inv=$Inv --length=$Length CatalogInd.tla" |
        Out-File -LiteralPath $log -Append -Encoding utf8
    "### -----------------------------------------------------------" |
        Out-File -LiteralPath $log -Append -Encoding utf8
    $started = Get-Date
    Push-Location $here
    try {
        if (Get-Command mise -ErrorAction SilentlyContinue) {
            & mise x java@21 -- java -jar $jar check "--config=$Config" "--init=$Init" "--inv=$Inv" "--length=$Length" CatalogInd.tla *>> $log
        } else {
            & java -jar $jar check "--config=$Config" "--init=$Init" "--inv=$Inv" "--length=$Length" CatalogInd.tla *>> $log
        }
    } finally {
        Pop-Location
    }
    $wall = [int]((Get-Date) - $started).TotalSeconds
    "### -----------------------------------------------------------" |
        Out-File -LiteralPath $log -Append -Encoding utf8
    "### wall clock: ${wall}s" | Out-File -LiteralPath $log -Append -Encoding utf8
    return @{ Log = $log; Wall = $wall }
}

function Expect-NoError([string]$Label, [string]$What, [string]$Config, [string]$Init, [string]$Inv, [int]$Length) {
    Write-Output "== $Label — $What"
    Write-Output "   (must be NoError)"
    $r = Invoke-Apalache $Label $Config $Init $Inv $Length
    if (Select-String -Quiet -LiteralPath $r.Log -Pattern "The outcome is: NoError") {
        Write-Output ("   NoError, as required ({0}s) — {1}" -f $r.Wall, $r.Log)
    } else {
        Write-Output "   GATE FAILURE: expected NoError. See $($r.Log)"
        Write-Output "   (a real counterexample-to-induction here is a FINDING about the"
        Write-Output "    invariant — commit the trace, record it in CLIMB.md, and lead with"
        Write-Output "    it; do not repair the hypothesis to make the run green)"
        $script:failed = 1
    }
    Write-Output ""
}

function Expect-Error([string]$Label, [string]$What, [string]$Law, [string]$Config, [string]$Init, [string]$Inv, [int]$Length) {
    Write-Output "== $Label — $What"
    Write-Output "   (must be Error, on exactly: $Law)"
    $r = Invoke-Apalache $Label $Config $Init $Inv $Length
    $isError = Select-String -Quiet -LiteralPath $r.Log -Pattern "The outcome is: Error"
    $named = Select-String -Quiet -LiteralPath $r.Log -Pattern "invariant .*violated"
    if ($isError -and $named) {
        Write-Output ("   refuted as required on {0} ({1}s) — {2}" -f $Law, $r.Wall, $r.Log)
    } else {
        Write-Output "   GATE FAILURE: the planted gap was NOT caught; the prover could not"
        Write-Output "   fail, so the clean verdicts above prove nothing. See $($r.Log)"
        $script:failed = 1
    }
    Write-Output ""
}

Write-Output "-- proof obligations (hypothesis: catalog=Gen(3), mirror=Gen(4), data=Gen(2), creators=Gen(4)) --"
Write-Output ""
Expect-NoError "ob1-base" "obligation 1: base, Init => IndInv" "CatalogInd.cfg" "Init" "IndInv" 0
Expect-NoError "ob2-consecution" "obligation 2: consecution, IndInv /\ Next => IndInv'" "CatalogInd.cfg" "IndInit" "IndInv" 1
Expect-NoError "ob4-actionsafety" "obligation 4: action safety, admission + monotonicity" "CatalogInd.cfg" "IndInit" "SafetySteps" 1

Write-Output "-- drift tripwire (NOT an obligation: IndInit => StateSafety is a tautology; R3-DECISIONS.md D4) --"
Write-Output ""
Expect-NoError "ob3-tripwire" "tripwire: StateSafety still conjoined by IndInv" "CatalogInd.cfg" "IndInit" "StateSafety" 0

Write-Output "-- negative controls (each must be refuted on exactly its own law) --"
Write-Output ""
Expect-Error "ob5-ctrl-nofresh" "control 5: consecution with the CAS-freshness clause dropped" `
    "Convergence" "CatalogInd.cfg" "IndInitSansFreshness" "Convergence" 1
Expect-Error "ob6-ctrl-blind" "control 6: action safety under BlindIngress = TRUE" `
    "AdmissionStep" "CatalogInd.blind.cfg" "IndInit" "AdmissionStep" 1
Expect-NoError "ob6b-ctrl-blind-independence" `
    "control 6b: INDEPENDENCE — blind ingress must NOT disturb MonotonicityStep" `
    "CatalogInd.blind.cfg" "IndInit" "MonotonicityStep" 1

if ($env:R3_QUICK -eq "1") {
    Write-Output "-- insensitivity control SKIPPED (R3_QUICK=1); the data cutoff argument stands on R3-DECISIONS.md D3 --"
    Write-Output ""
} else {
    Write-Output "-- data-cutoff insensitivity control (must agree with obligation 2) --"
    Write-Output ""
    Expect-NoError "ob7-datadeep" "control 7: consecution at data = Gen(3)" `
        "CatalogInd.cfg" "IndInitDataDeep" "IndInv" 1
}

if ($script:failed -eq 0) {
    Write-Output "R3 GATE: PASS — 3 obligations NoError, 1 tripwire NoError, 2 controls refuted"
    Write-Output "on their named laws, 1 independence control clean, data-cutoff insensitivity"
    Write-Output "clean.  Bounds as configured: 2 daemons, 3 values, 2 creators, DataCap = 0;"
    Write-Output "hypothesis catalog=Gen(3) mirror=Gen(4) data=Gen(2) creators=Gen(4)."
    Write-Output "Nothing outside those bounds is claimed."
    Write-Output "Verbatim output kept in $logDir"
    exit 0
} else {
    Write-Output "R3 GATE: FAIL — see the verdicts above."
    exit 1
}
