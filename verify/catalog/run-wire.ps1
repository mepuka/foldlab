$ErrorActionPreference = "Stop"

$here = $PSScriptRoot
$jar = if ($env:TLA_TOOLS_JAR) {
    $env:TLA_TOOLS_JAR
} else {
    Join-Path $here "tools/tla2tools.jar"
}

if (-not (Test-Path -LiteralPath $jar)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $jar) | Out-Null
    curl.exe -fsSL -o $jar "https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$output = Join-Path ([System.IO.Path]::GetTempPath()) ("catalog-wire-tlc-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $output | Out-Null

function Invoke-Tlc([string]$Config, [string]$Module) {
    $out = Join-Path $output ($Config + ".out.txt")
    Push-Location $here
    try {
        if (Get-Command mise -ErrorAction SilentlyContinue) {
            & mise x java@21 -- java '-XX:+UseParallelGC' -cp $jar tlc2.TLC `
                -workers 1 -fp 1 -deadlock -metadir (Join-Path $output ("meta-" + $Config)) `
                -config ($Config + ".cfg") ($Module + ".tla") *> $out
        } else {
            & java '-XX:+UseParallelGC' -cp $jar tlc2.TLC `
                -workers 1 -fp 1 -deadlock -metadir (Join-Path $output ("meta-" + $Config)) `
                -config ($Config + ".cfg") ($Module + ".tla") *> $out
        }
        $code = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    Get-Content -LiteralPath $out | ForEach-Object { Write-Host $_ }
    return $code
}

Write-Output "-- split-model refactor canary --"
$canary = Invoke-Tlc "Catalog.cap2" "Catalog"
if ($canary -ne 0 -or
    -not (Select-String -Quiet -LiteralPath (Join-Path $output "Catalog.cap2.out.txt") `
        -Pattern "119145 states generated, 18295 distinct states found")) {
    Write-Error "split-model canary moved; see $output"
    exit 1
}

Write-Output "-- honest CreateAtomic refinement --"
$honest = Invoke-Tlc "CatalogWire" "CatalogWire"
if ($honest -ne 0 -or
    -not (Select-String -Quiet -LiteralPath (Join-Path $output "CatalogWire.out.txt") `
        -Pattern "Model checking completed. No error has been found.")) {
    Write-Error "CreateAtomic refinement did not close cleanly; see $output"
    exit 1
}

Write-Output "-- faithless CreateAtomic refinement --"
$broken = Invoke-Tlc "CatalogWireBroken" "CatalogWireBroken"
if ($broken -eq 0 -or
    -not (Select-String -Quiet -LiteralPath (Join-Path $output "CatalogWireBroken.out.txt") `
        -Pattern "Action property AtomicRefinement is violated")) {
    Write-Error "faithless CreateAtomic bridge was not refuted; see $output"
    exit 1
}

Write-Output "CREATEATOMIC BRIDGE: PASS (split canary stable, honest bridge clean, faithless bridge refuted)"
Write-Output "Raw TLC output kept in $output"
exit 0
