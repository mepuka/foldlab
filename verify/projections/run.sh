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
  artifacts/probe.md artifacts/orphans.md
  README.md DECISIONS.md
)
for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "GATE: FAIL — package roster is missing $file" >&2
    exit 1
  fi
done

# The corpus side of the manifest-vs-corpus wall (item 5): the real corpus's
# own emitted type roster — the `type` records of its conformance interchange —
# lives OUTSIDE this package, in the generated fixtures. It is a FILE and the
# source of truth; this manifest mirrors it. If it is ever absent we must say
# so loudly, not run the diff against nothing.
corpus_manifest='../../packages/plait/fixtures/kernel-conformance.ndjson'
if [[ ! -f "$corpus_manifest" ]]; then
  echo "GATE: FAIL — corpus type roster '$corpus_manifest' is absent; cannot wall manifest-vs-corpus" >&2
  exit 1
fi

# The one-metaprogramming-site claim (item 1) is proven across the WHOLE
# package, Main.lean included. Two operations share the environment API and
# must be told apart:
#   - WALKING reads declaration shape (getConstInfo / inductInfo /
#     findDocString?). It belongs to Walk.lean and nowhere else — a second
#     walker would let a projection lie about shape.
#   - LOADING brings a module's environment into memory
#     (importModulesUsingCache). Main.lean's ONE call is an explicit, named
#     allowance: it loads the environment, it does not walk it. The loader
#     token is banned from Projections/ so the walk module stays clear of the
#     loader.
walker_tokens='getConstInfo|findDocString\?|inductInfo'
loader_token='importModulesUsingCache'

first=$(mktemp "./.prose-first.XXXXXX.md")
second=$(mktemp "./.prose-second.XXXXXX.md")
probe_before=$(mktemp "./.probe-before.XXXXXX.md")
probe_mutant=$(mktemp "./.probe-mutant.XXXXXX.md")
probe_restored=$(mktemp "./.probe-restored.XXXXXX.md")
probe_backup=$(mktemp "./.probe-source.XXXXXX.lean")
probe_fallback=$(mktemp "./.probe-fallback.XXXXXX.md")
prose_backup=$(mktemp "./.prose-source.XXXXXX.lean")
orphans_tmp=$(mktemp "./.prose-orphans.XXXXXX.md")
probe_is_mutated=0
prose_is_mutated=0

cleanup() {
  if [[ "$probe_is_mutated" -eq 1 && -f "$probe_backup" ]]; then
    cp -- "$probe_backup" Projections/Probe.lean
  fi
  if [[ "$prose_is_mutated" -eq 1 && -f "$prose_backup" ]]; then
    cp -- "$prose_backup" Projections/Prose.lean
  fi
  rm -f "$first" "$second" "$probe_before" "$probe_mutant" \
    "$probe_restored" "$probe_backup" "$probe_fallback" "$prose_backup" \
    "$orphans_tmp"
  rm -f Projections/.plant-*.lean
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
    grep -R -nE "$walker_tokens" Projections \
      --exclude=Walk.lean >/dev/null 2>&1 ||
    grep -nE "$walker_tokens" Main.lean >/dev/null 2>&1 ||
    grep -R -nE "$loader_token" Projections >/dev/null 2>&1 ||
    [[ "$(grep -c "$loader_token" Main.lean)" -ne 1 ]]; then
  echo "GATE: FAIL — Walk.lean stopped being the one environment-walk site" >&2
  exit 1
fi
echo "GATE: PASS (source hygiene; one metaprogramming site, one named loader allowance)"

# Negative control for item 1: a second environment-walk site, planted beside
# Walk.lean, must trip the walker-token scan; a walker token slipped into
# Main.lean must trip the Main.lean scan. A scan that cannot find a planted
# site proves nothing.
plant=$(mktemp "Projections/.plant.XXXXXX.lean")
echo 'def planted (n : Name) : Lean.Meta.MetaM Unit := Lean.Meta.getConstInfo n >> return ()' > "$plant"
if ! grep -nE "$walker_tokens" "$plant" >/dev/null 2>&1; then
  echo "GATE: FAIL — planted second env-walk site was not caught by the hygiene scan" >&2
  exit 1
fi
rm -f "$plant"
if ! grep -nE "$walker_tokens" <(sed 's/Lake.importModulesUsingCache/getConstInfo/' Main.lean) >/dev/null 2>&1; then
  echo "GATE: FAIL — a walker token in Main.lean was not caught by the Main.lean scan" >&2
  exit 1
fi
echo "GATE: PASS (hygiene controls: planted walker sites caught)"

# Item 2: the module set travels with each manifest as a `# modules:` directive;
# a future package swaps manifests rather than editing Main.lean. Both live
# manifests must carry exactly one directive.
for manifest in names.txt probe-names.txt; do
  if [[ "$(grep -c '^# modules:' "$manifest")" -ne 1 ]]; then
    echo "GATE: FAIL — '$manifest' must carry exactly one '# modules:' directive" >&2
    exit 1
  fi
done
# Refusal arm: a manifest whose module directive is absent must be refused by
# the walker (a walk with no named environment is meaningless).
noalias=$(mktemp "./.probe-noalias.XXXXXX.txt")
grep -v '^# modules:' names.txt > "$noalias"
if lake exe projections --target=prose --names="$noalias" >/dev/null 2>&1; then
  echo "GATE: FAIL — a manifest without a module directive was not refused" >&2
  rm -f "$noalias"
  exit 1
fi
rm -f "$noalias"
echo "GATE: PASS (module set travels with the manifest; absent directive refused)"

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
if [[ "$manifest_count" -ne 25 || "$artifact_count" -ne "$manifest_count" ]]; then
  echo "GATE: FAIL — pinned manifest/artifact declaration counts moved" >&2
  exit 1
fi
echo "GATE: PASS ($artifact_count declarations; two byte-identical emissions; committed prose fresh)"

if lake exe projections --target=not-a-target --names=names.txt >/dev/null 2>&1; then
  echo "GATE: FAIL — unknown target was accepted" >&2
  exit 1
fi
echo "GATE: PASS (unknown target refused)"

# Item 5 — the manifest-vs-corpus wall: names.txt and the corpus's own emitted
# type roster are the two lists of ONE vocabulary, and Bash diffs them with a
# named failure. The tool-kit's lake dependency graph stays kernel-only; the
# corpus file is read (never written) by the gate.
corpus_types=$(grep -oE '"name":"[^"]+","params":\[' "$corpus_manifest" \
  | sed -E 's/^"name":"//; s/","params":\[$//' | sort)
manifest_types=$(grep '^Kernel\.' names.txt | sed 's/^Kernel\.//' | sort)
if ! diff <(printf '%s\n' "$manifest_types") <(printf '%s\n' "$corpus_types") >/dev/null; then
  echo "GATE: FAIL — the projection manifest and the corpus type roster diverged" >&2
  exit 1
fi
if [[ "$(printf '%s\n' "$corpus_types" | grep -c .)" -ne 25 ]]; then
  echo "GATE: FAIL — corpus type roster count moved" >&2
  exit 1
fi
echo "GATE: PASS (manifest mirrors the corpus's 25-type roster, file to file)"

# Refusal arm for item 5: a manifest that names a type the corpus roster does
# not hold must be refused by this wall.
extra=$(mktemp "./.probe-extra.XXXXXX.txt")
{ grep '^# modules:' names.txt; grep '^Kernel\.' names.txt; echo 'Kernel.FabricFoo'; } > "$extra"
extra_types=$(grep '^Kernel\.' "$extra" | sed 's/^Kernel\.//' | sort)
if diff <(printf '%s\n' "$extra_types") <(printf '%s\n' "$corpus_types") >/dev/null 2>&1; then
  echo "GATE: FAIL — a manifest diverging from the corpus roster was not refused" >&2
  rm -f "$extra"
  exit 1
fi
rm -f "$extra"
echo "GATE: PASS (manifest-vs-corpus divergence refused)"

# Item 4 — the environment side of names.txt. The orphan scan asks the compiled
# environment which eligible (Type-sorted, doc'd) declarations its namespace
# holds and lists any the manifest omits. The committed register is a gate
# artifact: it must be a fresh, byte-identical regeneration, and the one
# remaining orphan Kernel.World must be visible in it for the coordinator: its
# type argument has no projection on the TypeScript side, so it is declared and
# unprojected rather than silently absent.
if ! lake exe projections --target=orphans --names=names.txt > "$orphans_tmp"; then
  echo "GATE: FAIL — orphan scan emission" >&2
  exit 1
fi
assert_kernel_unchanged
if ! diff -u artifacts/orphans.md "$orphans_tmp"; then
  echo "GATE: FAIL — committed orphan register is not a fresh regeneration" >&2
  exit 1
fi
if ! grep -q '^Kernel.World$' artifacts/orphans.md; then
  echo "GATE: FAIL — the known orphan Kernel.World is invisible in the register" >&2
  exit 1
fi
echo "GATE: PASS (orphan register fresh; environment-declared names made visible)"

# Refusal arm for item 4: drop a manifest name the environment still declares;
# the orphan register must move with it — the drift must be visible, not silent.
dropped=$(mktemp "./.prose-drop.XXXXXX.txt")
grep -v '^Kernel.Door$' names.txt > "$dropped"
dropped_out=$(mktemp "./.prose-drop-out.XXXXXX.md")
if ! lake exe projections --target=orphans --names="$dropped" > "$dropped_out" 2>/dev/null; then
  echo "GATE: FAIL — orphan scan on a manifest missing a declared name" >&2
  rm -f "$dropped" "$dropped_out"
  exit 1
fi
if ! grep -q '^Kernel.Door$' "$dropped_out"; then
  echo "GATE: FAIL — dropping a declared name from the manifest did not surface it as an orphan" >&2
  rm -f "$dropped" "$dropped_out"
  exit 1
fi
rm -f "$dropped" "$dropped_out"
echo "GATE: PASS (orphan drift visible when a declared name falls out of the manifest)"

# Probe lane (item 3): the refusal-probe emission renders the envelope AND the
# producer-supplied refusal rows — one carrying an explicit applicability and
# one relying on the printer's fallback — so the fallback path is exercised,
# not dead. Committed probe.md must stay fresh under `--target=refusal-probe`.
if ! lake exe projections --target=refusal-probe --names=probe-names.txt > "$probe_before"; then
  echo "GATE: FAIL — probe emission" >&2
  exit 1
fi
assert_kernel_unchanged
if ! diff -u artifacts/probe.md "$probe_before"; then
  echo "GATE: FAIL — committed probe baseline is stale" >&2
  exit 1
fi
if ! grep -q 'Applicability: machine-applicable' artifacts/probe.md ||
    ! grep -q 'Applicability: advisory' artifacts/probe.md; then
  echo "GATE: FAIL — probe must render a refusal row with applicability AND one relying on the fallback" >&2
  exit 1
fi
echo "GATE: PASS (refusal rows, with and without applicability, render; baseline fresh)"

# Field-rename mutation (existing control): renaming the probe field must move
# the emitted artifact, redden freshness, and restore byte-identically.
cp -- Projections/Probe.lean "$probe_backup"
if ! sed 's/payload : Nat/body : Nat/' "$probe_backup" > Projections/Probe.lean ||
    cmp -s "$probe_backup" Projections/Probe.lean; then
  echo "GATE: FAIL — field-rename mutation did not change the probe source" >&2
  exit 1
fi
probe_is_mutated=1
lake build projections >/dev/null
assert_kernel_unchanged
lake exe projections --target=refusal-probe --names=probe-names.txt > "$probe_mutant"
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
lake exe projections --target=refusal-probe --names=probe-names.txt > "$probe_restored"
assert_kernel_unchanged
if ! cmp -s "$probe_before" "$probe_restored" ||
    ! cmp -s artifacts/probe.md "$probe_restored" ||
    ! cmp -s "$probe_backup" Projections/Probe.lean; then
  echo "GATE: FAIL — field-rename mutation did not restore byte-identically" >&2
  exit 1
fi
echo "GATE: PASS (field-rename mutation moved prose, reddened freshness, and restored byte-identically)"

# Applicability-fallback mutation (item 3): the probe's fallback-applicability
# row reaches `getD "advisory"` in Prose.lean. Mutating that fallback must move
# the emitted probe — proving the fallback is live, not dead code.
cp -- Projections/Prose.lean "$prose_backup"
if ! sed 's/getD "advisory"/getD "onyx"/' "$prose_backup" > Projections/Prose.lean ||
    cmp -s "$prose_backup" Projections/Prose.lean; then
  echo "GATE: FAIL — applicability-fallback mutation did not change Prose.lean" >&2
  exit 1
fi
prose_is_mutated=1
lake build projections >/dev/null
assert_kernel_unchanged
lake exe projections --target=refusal-probe --names=probe-names.txt > "$probe_fallback"
assert_kernel_unchanged
if cmp -s "$probe_before" "$probe_fallback"; then
  echo "GATE: FAIL — mutated applicability fallback did not move the emitted artifact" >&2
  exit 1
fi
if ! grep -q 'Applicability: onyx' "$probe_fallback"; then
  echo "GATE: FAIL — mutated fallback row did not render its fallback applicability" >&2
  exit 1
fi

cp -- "$prose_backup" Projections/Prose.lean
prose_is_mutated=0
lake build projections >/dev/null
assert_kernel_unchanged
lake exe projections --target=refusal-probe --names=probe-names.txt > "$probe_restored"
assert_kernel_unchanged
if ! cmp -s "$probe_before" "$probe_restored" ||
    ! cmp -s artifacts/probe.md "$probe_restored" ||
    ! cmp -s "$prose_backup" Projections/Prose.lean; then
  echo "GATE: FAIL — applicability-fallback mutation did not restore byte-identically" >&2
  exit 1
fi
echo "GATE: PASS (applicability fallback is live; mutation moved the probe and restored byte-identically)"

echo "GATE: PASS (projections toolkit; kernel tree untouched)"

# ─────────────────────────────────────────────────────────────────────────────
# APPENDED BLOCK — DEV-812 slice-A amendment arms (agent/opus-cc-pc).
# Four amendments, four mutation controls. Each temporarily mutates ONE line of
# this package's own source, rebuilds, re-emits the REAL manifest, requires the
# committed bytes to move, then restores and requires byte-identical recovery.
# The block appends its own EXIT handler in front of the roster's `cleanup` so
# a failed arm still restores the source it mutated.
# ─────────────────────────────────────────────────────────────────────────────

amend_backup=$(mktemp "./.amend-source.XXXXXX.lean")
amend_out=$(mktemp "./.amend-out.XXXXXX.md")
amend_err=$(mktemp "./.amend-err.XXXXXX.txt")
amend_target=""

amend_cleanup() {
  if [[ -n "$amend_target" && -f "$amend_backup" ]]; then
    cp -- "$amend_backup" "$amend_target"
  fi
  rm -f "$amend_backup" "$amend_out" "$amend_err"
  cleanup
}
trap amend_cleanup EXIT

amend_begin() {
  amend_target="$1"
  cp -- "$1" "$amend_backup"
}

# Apply one sed script to the PRISTINE backup, so two mutations of one file in
# a row are both taken from the original rather than compounding.
amend_apply() {
  sed "$1" "$amend_backup" > "$amend_target"
  if cmp -s "$amend_backup" "$amend_target"; then
    echo "GATE: FAIL — amendment mutation did not change $amend_target" >&2
    exit 1
  fi
  lake build projections >/dev/null
  assert_kernel_unchanged
}

amend_end() {
  cp -- "$amend_backup" "$amend_target"
  lake build projections >/dev/null
  assert_kernel_unchanged
  lake exe projections --target=prose --names=names.txt > "$amend_out"
  assert_kernel_unchanged
  if ! cmp -s artifacts/prose.md "$amend_out" ||
      ! cmp -s "$amend_backup" "$amend_target"; then
    echo "GATE: FAIL — amendment mutation of $amend_target did not restore byte-identically" >&2
    exit 1
  fi
  amend_target=""
}

# Arm 1 — the binder role is derived, per binder, from the environment.
# Swapping the sort test for a constant test re-roles exactly the parameters
# whose type is an unapplied constant, so the mutant carries BOTH spellings:
# a role that were a constant, or read off an annotation, could not do that.
amend_begin Projections/Walk.lean
amend_apply 's/isSort/isConst/'
lake exe projections --target=prose --names=names.txt > "$amend_out"
assert_kernel_unchanged
if cmp -s artifacts/prose.md "$amend_out"; then
  echo "GATE: FAIL — re-deriving the binder role did not move the emitted prose" >&2
  exit 1
fi
if ! grep -q '(brand ' "$amend_out" || ! grep -q '(type ' "$amend_out"; then
  echo "GATE: FAIL — the mutated role predicate did not discriminate between binders" >&2
  exit 1
fi
if grep -q '(type ' artifacts/prose.md; then
  echo "GATE: FAIL — the committed prose already carries a type-argument parameter" >&2
  exit 1
fi
amend_end
echo "GATE: PASS (amendment 1: the brand/type role is derived per binder from the environment)"

# Arm 2 — the em-dash transliteration is a named table, and an unnamed code
# point is refused rather than mangled. Two mutations: retarget the entry, then
# empty the table and require the walk to name the code point it cannot carry.
amend_begin Projections/Ast.lean
amend_apply 's/(0x2014, "--")/(0x2014, "~~")/'
lake exe projections --target=prose --names=names.txt > "$amend_out"
assert_kernel_unchanged
if cmp -s artifacts/prose.md "$amend_out" || ! grep -q '~~' "$amend_out"; then
  echo "GATE: FAIL — retargeting the em-dash transliteration did not move the emitted prose" >&2
  exit 1
fi
if grep -q '—' artifacts/prose.md; then
  echo "GATE: FAIL — the committed prose still carries an untransliterated em dash" >&2
  exit 1
fi
amend_apply 's/(0x2014, "--")//'
if lake exe projections --target=prose --names=names.txt > "$amend_out" 2> "$amend_err"; then
  echo "GATE: FAIL — an unnamed code point was carried instead of refused" >&2
  exit 1
fi
if ! grep -q 'code point 8212' "$amend_err"; then
  echo "GATE: FAIL — the refusal did not name the code point it could not transliterate" >&2
  exit 1
fi
amend_end
echo "GATE: PASS (amendment 2: the transliteration table is load-bearing and refuses what it cannot name)"

# Arm 3 — the docstring travels verbatim. Re-introducing a trim strictly
# reduces the emitted trailing-space lines, which is exactly the edge
# whitespace the schema target branches on.
amend_begin Projections/Walk.lean
committed_edge=$(grep -c ' $' artifacts/prose.md || true)
amend_apply 's/plain := plain$/plain := plain.trimAscii.toString/'
lake exe projections --target=prose --names=names.txt > "$amend_out"
assert_kernel_unchanged
mutant_edge=$(grep -c ' $' "$amend_out" || true)
if cmp -s artifacts/prose.md "$amend_out"; then
  echo "GATE: FAIL — trimming the docstring did not move the emitted prose" >&2
  exit 1
fi
if [[ "$committed_edge" -lt 1 || "$mutant_edge" -ge "$committed_edge" ]]; then
  echo "GATE: FAIL — the verbatim docstring policy is not observable in the emitted prose" >&2
  exit 1
fi
amend_end
echo "GATE: PASS (amendment 3: docstrings verbatim; $committed_edge edge-space lines survive, $mutant_edge under a trim)"

# Arm 4 — the name-erasure rule of the reference grammar. Turning the rule into
# the identity restores fully qualified heads inside every field type.
amend_begin Projections/Ast.lean
amend_apply 's/(name.splitOn ".").getLastD name/name/'
lake exe projections --target=prose --names=names.txt > "$amend_out"
assert_kernel_unchanged
if cmp -s artifacts/prose.md "$amend_out"; then
  echo "GATE: FAIL — dropping the name-erasure rule did not move the emitted prose" >&2
  exit 1
fi
if ! grep -q 'Digest(Kernel.DeclKind.policy)' "$amend_out" ||
    ! grep -q 'Digest(policy)' artifacts/prose.md ||
    grep -q 'Digest(Kernel.DeclKind.policy)' artifacts/prose.md; then
  echo "GATE: FAIL — the name-erasure rule is not what spells the committed reference grammar" >&2
  exit 1
fi
amend_end
echo "GATE: PASS (amendment 4: the name-erasure rule spells every field type in the reference grammar)"

echo "GATE: PASS (slice-A amendments; four mutations moved prose and restored byte-identically)"
