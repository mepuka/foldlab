param(
  [switch]$RunGate
)

$ErrorActionPreference = "Stop"
$packageRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $packageRoot "..\..")).Path
$cvc5Root = Join-Path $packageRoot ".lake\packages\cvc5"
$patchPath = Join-Path $repoRoot "docs\research\reference\lean4-landscape-2026-08-17\veil-cvc5-windows.patch"
$substrate = Join-Path $packageRoot ".lake\substrate"
$archiveName = "mingw-w64-ucrt-x86_64-libc++-19.1.4-1-any.pkg.tar.zst"
$archive = Join-Path $substrate $archiveName
$signature = "$archive.sig"
$extractRoot = Join-Path $substrate "libcxx-19.1.4-1"
$libcxx = Join-Path $extractRoot "ucrt64"
$packageUrl = "https://repo.msys2.org/mingw/ucrt64/$archiveName"
$packageSha256 = "A1E582F8D00250C1F40F47BF377FE2D7AAF80881DD4CC049482128ECD638BCBA"
$signatureSha256 = "9553B82A2783EE7D4847E4A63CBE2E046BDFA8F89DD76263D4149714A17CEF25"

function Get-Sha256([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace("-", "") }
    finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}

Set-Location $packageRoot
lake update
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$patchState = "applied"
$ErrorActionPreference = "SilentlyContinue"
& git -C $cvc5Root apply --check $patchPath 2>$null
$canApply = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($canApply -eq 0) {
  git -C $cvc5Root apply $patchPath
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  $ErrorActionPreference = "SilentlyContinue"
  & git -C $cvc5Root apply --reverse --check $patchPath 2>$null
  $canReverse = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($canReverse -ne 0) { throw "cvc5 patch is neither applicable nor already applied" }
  $patchState = "skipped (already applied)"
}

New-Item -ItemType Directory -Force -Path $substrate | Out-Null
if (-not (Test-Path -LiteralPath $archive)) {
  Invoke-WebRequest -Uri $packageUrl -OutFile $archive
}
if (-not (Test-Path -LiteralPath $signature)) {
  Invoke-WebRequest -Uri "$packageUrl.sig" -OutFile $signature
}
if ((Get-Sha256 $archive) -ne $packageSha256) {
  throw "MSYS2 libc++ package sha256 mismatch"
}
if ((Get-Sha256 $signature) -ne $signatureSha256) {
  throw "MSYS2 libc++ signature sha256 mismatch"
}
$keyring = "C:\msys64\usr\share\pacman\keyrings\msys2.gpg"
if (-not (Test-Path -LiteralPath $keyring)) { throw "MSYS2 signing keyring not found: $keyring" }
$gpg = "C:\msys64\usr\bin\gpg.exe"
if (-not (Test-Path -LiteralPath $gpg)) { throw "MSYS2 gpg not found: $gpg" }
$cygpath = "C:\msys64\usr\bin\cygpath.exe"
$gpgHomeWin = Join-Path $substrate "gnupg-msys2"
New-Item -ItemType Directory -Force -Path $gpgHomeWin | Out-Null
$gpgHomePosix = (& $cygpath -u $gpgHomeWin).Trim()
$signaturePosix = (& $cygpath -u $signature).Trim()
$archivePosix = (& $cygpath -u $archive).Trim()
$ErrorActionPreference = "SilentlyContinue"
& $gpg --batch --homedir $gpgHomePosix --list-keys 5F944B027F7FE2091985AA2EFA11531AA0AA7F57 2>$null
$keyPresent = $LASTEXITCODE
if ($keyPresent -ne 0) {
  & $gpg --batch --homedir $gpgHomePosix --import /usr/share/pacman/keyrings/msys2.gpg 2>$null
}
$ErrorActionPreference = "Stop"
& $gpg --batch --homedir $gpgHomePosix --verify $signaturePosix $archivePosix
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path -LiteralPath (Join-Path $libcxx "include\c++\v1"))) {
  New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
  # Pin System32 bsdtar: under an MSYS-first PATH a bare `tar` resolves to
  # Git's GNU tar, which reads `C:\...` as a remote host and dies.
  $bsdtar = Join-Path $env:SystemRoot "System32\tar.exe"
  if (-not (Test-Path -LiteralPath $bsdtar)) { throw "System32 tar.exe not found: $bsdtar" }
  & $bsdtar -xf $archive -C $extractRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$gccVersionRoot = Get-ChildItem -LiteralPath "C:\msys64\ucrt64\lib\gcc\x86_64-w64-mingw32" -Directory |
  Sort-Object Name -Descending | Select-Object -First 1
if ($null -eq $gccVersionRoot) { throw "MSYS2 UCRT64 GCC include root not found" }
$leanPrefix = (& lake env lean --print-prefix).Trim()
$clang = Join-Path $leanPrefix "bin\clang.exe"
if (-not (Test-Path -LiteralPath $clang)) { throw "Lean toolchain clang not found: $clang" }
$env:CPLUS_INCLUDE_PATH = "$(Join-Path $libcxx 'include\c++\v1');$(Join-Path $gccVersionRoot.FullName 'include');C:\msys64\ucrt64\include"
$env:LIBRARY_PATH = "$(Join-Path $libcxx 'lib');$(Join-Path $leanPrefix 'lib');C:\msys64\ucrt64\lib"

Write-Output "fabric-veil environment: platform=$([System.Runtime.InteropServices.RuntimeInformation]::OSDescription) arch=$([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture)"
Write-Output "fabric-veil environment: compiler=$((& $clang --version | Select-Object -First 1))"
Write-Output "fabric-veil environment: cvc5-patch=$patchState"
Write-Output "fabric-veil environment: msys2-libcxx-sha256=$packageSha256 signature-sha256=$signatureSha256 signature-key=5F944B027F7FE2091985AA2EFA11531AA0AA7F57"

if ($RunGate) {
  $gitBash = "C:\Program Files\Git\bin\bash.exe"
  if (-not (Test-Path -LiteralPath $gitBash)) { throw "Git Bash is required to run the cross-platform gate" }
  & $gitBash (Join-Path $packageRoot "run.sh") --configured
  exit $LASTEXITCODE
}
