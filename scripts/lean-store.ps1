<#
lean-store.ps1 - host-level Lean dependency store for verify/fabric-veil.

One populated .lake/packages per pin key lives under
%USERPROFILE%\.foldlab\lean-store\<key>\packages, and every checkout at that
key reaches it through an NTFS junction at verify/fabric-veil/.lake/packages,
so a fresh worktree never re-fetches or re-elaborates dependencies. The key
mirrors GitHub Actions hashFiles() over lean-toolchain, lake-manifest.json,
and setup-windows.ps1 - the CI cache key inputs in
.github/workflows/fabric-veil-gate.yml - so a pin move invalidates CI and the
local store at the same commit. Gate scripts are untouched; the junction is
invisible to run.sh. The package's own .lake/build stays per-tree.

Usage:
  pwsh -File scripts/lean-store.ps1                # create-or-verify for this checkout
  pwsh -File scripts/lean-store.ps1 -Tree <dir>    # same, for another worktree
  pwsh -File scripts/lean-store.ps1 -Seed <dir>    # one-time migration of a built tree
#>
param(
  [string]$Tree,
  [string]$Seed,
  [string]$StoreRoot = (Join-Path $env:USERPROFILE ".foldlab\lean-store")
)
$ErrorActionPreference = "Stop"

function Refuse([string]$Message) { Write-Host "REFUSED: $Message"; exit 1 }

function Resolve-PackageDir([string]$Path) {
  if (-not $Path) { $Path = Join-Path (Split-Path -Parent $PSScriptRoot) "verify\fabric-veil" }
  if (-not (Test-Path -LiteralPath $Path)) { Refuse "tree not found: $Path" }
  $p = (Resolve-Path -LiteralPath $Path).Path
  $nested = Join-Path $p "verify\fabric-veil"
  if (Test-Path -LiteralPath (Join-Path $nested "lean-toolchain")) { $p = $nested }
  foreach ($f in "lean-toolchain", "lake-manifest.json", "setup-windows.ps1") {
    if (-not (Test-Path -LiteralPath (Join-Path $p $f))) { Refuse "not a fabric-veil package directory (missing ${f}): $p" }
  }
  return $p
}

function Get-StoreKey([string]$PackageDir) {
  # Byte-identical mirror of the CI cache key's hashFiles(): sha256 over the
  # concatenated raw sha256 digests of the three pin files, in workflow
  # argument order, hex lowercase.
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $acc = New-Object System.IO.MemoryStream
    foreach ($f in "lean-toolchain", "lake-manifest.json", "setup-windows.ps1") {
      $digest = $sha.ComputeHash([System.IO.File]::ReadAllBytes((Join-Path $PackageDir $f)))
      $acc.Write($digest, 0, $digest.Length)
    }
    return ([System.BitConverter]::ToString($sha.ComputeHash($acc.ToArray())) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-JunctionTarget([string]$Path) {
  $item = Get-Item -LiteralPath $Path -Force
  foreach ($name in "LinkTarget", "Target") {
    $p = $item.PSObject.Properties[$name]
    if ($p -and $p.Value) { return [string]@($p.Value)[0] }
  }
  return $null
}

function Get-MissingPackages([string]$PackageDir, [string]$PackagesPath) {
  $manifest = Get-Content -LiteralPath (Join-Path $PackageDir "lake-manifest.json") -Raw | ConvertFrom-Json
  $missing = @()
  foreach ($dep in $manifest.packages) {
    $d = Join-Path $PackagesPath $dep.name
    # Full enumeration on purpose: an early-terminated pipeline (Select -First)
    # leaks the directory handle until GC, and any open handle beneath
    # .lake\packages denies the seed's rename.
    if (-not (Test-Path -LiteralPath $d) -or (@(Get-ChildItem -LiteralPath $d -Force).Count -eq 0)) { $missing += $dep.name }
  }
  return ,$missing
}

function Write-Marker([string]$Path, [string]$Key, [string]$Provenance) {
  # Written only after a verified populate; its first line must equal the key.
  Set-Content -LiteralPath $Path -Value @($Key, $Provenance, "written: $([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))") -Encoding ascii
}

if ($Tree -and $Seed) { Refuse "-Tree and -Seed are mutually exclusive" }
$pkg = Resolve-PackageDir $(if ($Seed) { $Seed } else { $Tree })
$key = Get-StoreKey $pkg
$entry = Join-Path ([System.IO.Path]::GetFullPath($StoreRoot)) $key
$storePackages = Join-Path $entry "packages"
$marker = Join-Path $entry ".complete"
$populating = Join-Path $entry ".populating"
$link = Join-Path $pkg ".lake\packages"

Write-Host "store key : $key"
Write-Host "ci key    : fabric-veil-Linux-$key (ubuntu-latest cache key; hash segment shared)"
Write-Host "store     : $storePackages"
Write-Host "tree      : $pkg"

# Get-Item, not Test-Path: Test-Path resolves through a reparse point, so a
# junction whose store entry was deleted would read as absent instead of broken.
$linkItem = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
$linkExists = $null -ne $linkItem
$linkIsJunction = $linkExists -and ($linkItem.Attributes -band [IO.FileAttributes]::ReparsePoint)

if ($Seed -and -not $linkIsJunction) {
  if (-not $linkExists) { Refuse "seed tree has no .lake\packages to migrate: $link" }
  if (Test-Path -LiteralPath $storePackages) {
    if (Test-Path -LiteralPath $marker) { Refuse "store already holds a completed entry for key $key; nothing to seed and refusing to overwrite. Move the tree's real .lake\packages aside, then attach with: lean-store.ps1 -Tree `"$pkg`"" }
    Refuse "store holds an incomplete entry for key $key; refusing to overwrite. If it is an accidental empty entry, delete $entry and re-run the seed"
  }
  if ((Test-Path -LiteralPath $marker) -or (Test-Path -LiteralPath $populating)) { Refuse "store entry carries markers but no packages: $entry. Delete the entry by hand and re-seed" }
  $missing = Get-MissingPackages $pkg $link
  if ($missing.Count -gt 0) { Refuse "seed tree is missing manifest packages ($($missing -join ', ')); a seed must come from a fully built tree" }
  if ([System.IO.Path]::GetPathRoot($link) -ne [System.IO.Path]::GetPathRoot($entry)) { Refuse "tree and store are on different volumes; the seed is a same-volume rename, never a copy" }
  New-Item -ItemType Directory -Force -Path $entry | Out-Null
  # Directory.Move is a pure rename. Move-Item degrades to copy+delete when
  # its rename path fails, which both duplicates 7.6 GB and dies on the
  # read-only git objects inside the packages; the seed must relocate the
  # exact bytes or fail loudly. Retries collect leaked enumeration handles
  # first: an open handle anywhere beneath the source denies the rename.
  foreach ($attempt in 1..4) {
    try { [System.IO.Directory]::Move($link, $storePackages); break }
    catch {
      if ($attempt -eq 4) { Refuse "cannot move packages into the store after 4 attempts: $($_.Exception.InnerException.Message). The tree is unchanged" }
      [GC]::Collect(); [GC]::WaitForPendingFinalizers(); Start-Sleep -Seconds 5
    }
  }
  Write-Marker $marker $key "seeded-from: $link"
  New-Item -ItemType Junction -Path $link -Value $storePackages | Out-Null
  $linkIsJunction = $true
  Write-Host "seeded    : packages moved into the store; junction created back"
}

if (-not $linkExists) {
  if (Test-Path -LiteralPath $marker) {
    if (-not (Test-Path -LiteralPath $storePackages)) { Refuse "store entry has a completion marker but no packages directory: $entry" }
    if ((Get-Content -LiteralPath $marker -TotalCount 1).Trim() -ne $key) { Refuse "completion marker in $entry does not carry key $key; the store entry does not certify these pins" }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $link) | Out-Null
    New-Item -ItemType Junction -Path $link -Value $storePackages | Out-Null
    $linkIsJunction = $true
    Write-Host "attached  : junction created to the existing store entry"
  } elseif (Test-Path -LiteralPath $populating) {
    Refuse "store entry for key $key is still populating (no completion marker yet); attach after its first gate run completes and the marker is written"
  } elseif (Test-Path -LiteralPath $entry) {
    Refuse "store entry exists without a completion marker (half-populated): $entry. The marker is written only after a verified populate; delete the entry and re-seed from a built tree"
  } else {
    New-Item -ItemType Directory -Force -Path $storePackages | Out-Null
    Set-Content -LiteralPath $populating -Value @($key, "first-tree: $pkg") -Encoding ascii
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $link) | Out-Null
    New-Item -ItemType Junction -Path $link -Value $storePackages | Out-Null
    $linkIsJunction = $true
    Write-Host "created   : new empty store entry, junctioned; the first gate run populates it through the junction. Re-run this script after a green gate to write the completion marker"
  }
}

if (-not $linkIsJunction) {
  if (Test-Path -LiteralPath $storePackages) { Refuse ".lake\packages is a real directory but the store already holds key $key; a junction is expected. Move the local directory aside by hand, then re-run this script to attach. No auto-migration" }
  Refuse ".lake\packages is a real directory where a junction is expected. Migrate it into the store with: pwsh -File scripts/lean-store.ps1 -Seed `"$pkg`" (no auto-migration)"
}

$target = Get-JunctionTarget $link
if (-not $target) { Refuse "cannot read the junction target of $link" }
$normTarget = [System.IO.Path]::GetFullPath(($target -replace '^\\\\\?\\', '')).TrimEnd('\')
$normStore = [System.IO.Path]::GetFullPath($storePackages).TrimEnd('\')
if (-not [string]::Equals($normTarget, $normStore, [System.StringComparison]::OrdinalIgnoreCase)) {
  Refuse "junction target does not match the tree's pins: junction -> $target, pins compute key $key -> $normStore. The pins moved or the junction is stale; remove the junction (rmdir) and re-run this script"
}
if (-not (Test-Path -LiteralPath $normStore)) { Refuse "junction target is missing from the store: $normStore" }

if (Test-Path -LiteralPath $marker) {
  if ((Get-Content -LiteralPath $marker -TotalCount 1).Trim() -ne $key) { Refuse "completion marker carries a different key than the tree's pins compute ($key); the store entry does not certify these pins" }
  Write-Host "VERIFIED  : junction -> store key $key; completion marker matches"
  exit 0
}
if (Test-Path -LiteralPath $populating) {
  $missing = Get-MissingPackages $pkg $normStore
  if ($missing.Count -eq 0) {
    Write-Marker $marker $key "populated-through-junction-by: $pkg"
    Remove-Item -LiteralPath $populating
    Write-Host "VERIFIED  : population complete; completion marker written for key $key"
    exit 0
  }
  Write-Host "PENDING   : store entry is still populating (missing: $($missing -join ', ')); run the gate, then re-run this script"
  exit 0
}
Refuse "store entry has no completion marker (half-populated or corrupted): $entry. The marker is written only after a verified populate; re-seed from a built tree or delete the entry and rebuild through the junction"
