#!/usr/bin/env bash
# verify/projections/run.sh — the standalone projection-toolkit gate.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$#" -gt 0 ]]; then
  echo "usage: ./run.sh" >&2
  exit 2
fi

if ! command -v lake >/dev/null 2>&1; then
  echo "GATE: FAIL — lake not found" >&2
  exit 2
fi

required=(
  .gitignore lean-toolchain lakefile.toml lake-manifest.json Projections.lean Main.lean
  Projections/Ast.lean Projections/Walk.lean Projections/Prose.lean
  Projections/Probe.lean names.txt probe-names.txt artifacts/prose.md
  artifacts/probe.md
  README.md DECISIONS.md
)
for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "GATE: FAIL — package roster is missing $file" >&2
    exit 1
  fi
done

first=$(mktemp "./.prose-first.XXXXXX.md")
second=$(mktemp "./.prose-second.XXXXXX.md")
probe_before=$(mktemp "./.probe-before.XXXXXX.md")
probe_mutant=$(mktemp "./.probe-mutant.XXXXXX.md")
probe_restored=$(mktemp "./.probe-restored.XXXXXX.md")
probe_backup=$(mktemp "./.probe-source.XXXXXX.lean")
probe_is_mutated=0

cleanup() {
  if [[ "$probe_is_mutated" -eq 1 && -f "$probe_backup" ]]; then
    cp -- "$probe_backup" Projections/Probe.lean
  fi
  rm -f "$first" "$second" "$probe_before" "$probe_mutant" \
    "$probe_restored" "$probe_backup"
}
trap cleanup EXIT

assert_kernel_unchanged() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
      ! git diff --quiet -- ../kernel; then
    echo "GATE: FAIL — the read-only kernel tree moved" >&2
    exit 1
  fi
}

if ! grep -q 'leanprover/lean4:v4.33.0' lean-toolchain ||
    ! grep -q 'leanprover/lean4:v4.33.0' ../kernel/lean-toolchain; then
  echo "GATE: FAIL — projections and kernel must share the pinned toolchain" >&2
  exit 1
fi
if [[ "$(grep -c '"type": "path"' lake-manifest.json)" -ne 1 ]] ||
    grep -q '"type": "git"' lake-manifest.json ||
    ! grep -q '"name": "kernel"' lake-manifest.json ||
    ! grep -q '"dir": "../kernel"' lake-manifest.json; then
  echo "GATE: FAIL — projections must require exactly kernel by path" >&2
  exit 1
fi
if ! grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' ../kernel/lake-manifest.json; then
  echo "GATE: FAIL — the upstream kernel manifest grew a dependency" >&2
  exit 1
fi
if git grep -n -E 'verify/projections|\.\./projections' -- ../kernel >/dev/null 2>&1; then
  echo "GATE: FAIL — kernel has a reverse reference to projections" >&2
  exit 1
fi
assert_kernel_unchanged
echo "GATE: PASS (topology: one read-only kernel path require; no reverse reference)"

lean_sources=(
  Projections.lean Main.lean Projections/Ast.lean Projections/Walk.lean
  Projections/Prose.lean Projections/Probe.lean
)
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|admit|partial|panic|implemented_by|extern|unsafe|axiom)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden escape in projection source" >&2
  exit 1
fi
if [[ "$(grep -c 'getConstInfo' Projections/Walk.lean)" -lt 2 ]] ||
    ! grep -q 'inductInfo' Projections/Walk.lean ||
    ! grep -q 'findDocString?' Projections/Walk.lean ||
    grep -R -nE 'getConstInfo|findDocString\?' Projections \
      --exclude=Walk.lean >/dev/null 2>&1; then
  echo "GATE: FAIL — Walk.lean stopped being the one environment-walk site" >&2
  exit 1
fi
echo "GATE: PASS (source hygiene; one metaprogramming site)"

if lake build; then
  echo "GATE: PASS (lake build)"
else
  echo "GATE: FAIL — lake build" >&2
  exit 1
fi
assert_kernel_unchanged

if ! lake exe projections --target=prose --names=names.txt > "$first"; then
  echo "GATE: FAIL — first prose emission" >&2
  exit 1
fi
assert_kernel_unchanged
if ! lake exe projections --target=prose --names=names.txt > "$second"; then
  echo "GATE: FAIL — second prose emission" >&2
  exit 1
fi
assert_kernel_unchanged
if ! cmp -s "$first" "$second"; then
  echo "GATE: FAIL — consecutive prose emissions differ" >&2
  exit 1
fi
if ! diff -u artifacts/prose.md "$first"; then
  echo "GATE: FAIL — committed prose is not a fresh regeneration" >&2
  exit 1
fi
manifest_count=$(grep -c '^[A-Za-z]' names.txt)
artifact_count=$(grep -c '^## `.*`$' artifacts/prose.md)
if [[ "$manifest_count" -ne 22 || "$artifact_count" -ne "$manifest_count" ]]; then
  echo "GATE: FAIL — pinned manifest/artifact declaration counts moved" >&2
  exit 1
fi
echo "GATE: PASS ($artifact_count declarations; two byte-identical emissions; committed prose fresh)"

if lake exe projections --target=not-a-target --names=names.txt >/dev/null 2>&1; then
  echo "GATE: FAIL — unknown target was accepted" >&2
  exit 1
fi
echo "GATE: PASS (unknown target refused)"

lake exe projections --target=prose --names=probe-names.txt > "$probe_before"
assert_kernel_unchanged
if ! diff -u artifacts/probe.md "$probe_before"; then
  echo "GATE: FAIL — committed mutation-control baseline is stale" >&2
  exit 1
fi
cp -- Projections/Probe.lean "$probe_backup"
if ! sed 's/payload : Nat/body : Nat/' "$probe_backup" > Projections/Probe.lean ||
    cmp -s "$probe_backup" Projections/Probe.lean; then
  echo "GATE: FAIL — field-rename mutation did not change the probe source" >&2
  exit 1
fi
probe_is_mutated=1
lake build projections >/dev/null
assert_kernel_unchanged
lake exe projections --target=prose --names=probe-names.txt > "$probe_mutant"
assert_kernel_unchanged
if cmp -s "$probe_before" "$probe_mutant" ||
    ! grep -q 'body : Nat' "$probe_mutant"; then
  echo "GATE: FAIL — renamed probe field did not move the emitted artifact" >&2
  exit 1
fi
if diff -q artifacts/probe.md "$probe_mutant" >/dev/null; then
  echo "GATE: FAIL — field-rename mutation did not redden freshness" >&2
  exit 1
fi

cp -- "$probe_backup" Projections/Probe.lean
probe_is_mutated=0
lake build projections >/dev/null
assert_kernel_unchanged
lake exe projections --target=prose --names=probe-names.txt > "$probe_restored"
assert_kernel_unchanged
if ! cmp -s "$probe_before" "$probe_restored" ||
    ! cmp -s artifacts/probe.md "$probe_restored" ||
    ! cmp -s "$probe_backup" Projections/Probe.lean; then
  echo "GATE: FAIL — field-rename mutation did not restore byte-identically" >&2
  exit 1
fi
echo "GATE: PASS (field-rename mutation moved prose, reddened freshness, and restored byte-identically)"

echo "GATE: PASS (projections toolkit; kernel tree untouched)"
