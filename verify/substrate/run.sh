#!/usr/bin/env bash
# verify/substrate/run.sh — the standalone substrate-model gate.
#
# Green means: every clean configuration is clean, every negative control is
# refuted on its own named violation string, the roster / hygiene / partition /
# import-direction / alphabet-equality arms pass, and the toolchain and
# zero-external-dependency pins hold.
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
  .gitignore lean-toolchain lakefile.toml lake-manifest.json
  Substrate.lean ControlMain.lean AlphabetMain.lean
  Substrate/Definitions.lean Substrate/Laws.lean Substrate/Proofs.lean
  README.md DECISIONS.md
)
for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "GATE: FAIL — package roster is missing $file" >&2
    exit 1
  fi
done

# The transcribed status-events vocabulary lives OUTSIDE this package: it is
# the wire transcription's own canonical rendering, and it is the source of
# truth this model's alphabet is held against. If it is ever absent we say so
# loudly rather than running the equality arm against nothing.
vocabulary='../../go/daemon/wirevocabulary.canonical.json'
if [[ ! -f "$vocabulary" ]]; then
  echo "GATE: FAIL — the transcribed wire vocabulary is absent; cannot wall the model's alphabet" >&2
  exit 1
fi

# ── Toolchain and zero-external-dependency pins, asserted from inside the gate
if ! grep -q 'leanprover/lean4:v4.33.0' lean-toolchain ||
    ! grep -q 'leanprover/lean4:v4.33.0' ../kernel/lean-toolchain; then
  echo "GATE: FAIL — substrate and kernel must share the pinned toolchain" >&2
  exit 1
fi
if [[ "$(grep -c '"type": "path"' lake-manifest.json)" -ne 1 ]] ||
    grep -q '"type": "git"' lake-manifest.json ||
    ! grep -q '"name": "kernel"' lake-manifest.json ||
    ! grep -q '"dir": "../kernel"' lake-manifest.json; then
  echo "GATE: FAIL — substrate must require exactly kernel by path and nothing external" >&2
  exit 1
fi
if ! grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' ../kernel/lake-manifest.json; then
  echo "GATE: FAIL — the upstream kernel manifest grew a dependency" >&2
  exit 1
fi
echo "GATE: PASS (toolchain pin; one read-only kernel path require; zero external dependencies)"

# ── Import direction: the substrate model cites the kernel; the kernel never
# imports its carriers' concerns. A reverse reference is the layering
# inversion this package exists on the far side of.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -n -E 'verify/substrate|\.\./substrate|import Substrate' -- ../kernel >/dev/null 2>&1; then
    echo "GATE: FAIL — kernel has a reverse reference to substrate" >&2
    exit 1
  fi
  if ! git diff --quiet -- ../kernel; then
    echo "GATE: FAIL — the read-only kernel tree moved" >&2
    exit 1
  fi
fi
if ! grep -q '^import Kernel' Substrate/Definitions.lean; then
  echo "GATE: FAIL — the substrate model stopped citing the kernel" >&2
  exit 1
fi
echo "GATE: PASS (import direction: substrate cites kernel; kernel cites nothing here)"

# Portable array read: macOS ships bash 3.2, which has no mapfile, and a gate
# only one host can run is not a gate.
lean_sources=()
while IFS= read -r lean_file; do
  lean_sources+=("$lean_file")
done < <(find Substrate must-not-compile -type f -name '*.lean' -print | LC_ALL=C sort)
lean_sources+=(Substrate.lean ControlMain.lean AlphabetMain.lean)

# ── Source hygiene: no proof escapes, no trusted-code widening.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|admit|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden escape in substrate source" >&2
  exit 1
fi
echo "GATE: PASS (substrate source hygiene)"

# ── Partition: definition files carry no theorems, law files no proof bodies,
# proof files mint no definitions.
if grep -nE '^theorem ' Substrate/Definitions.lean Substrate/Laws.lean; then
  echo "GATE: FAIL — theorem escaped the proof partition" >&2
  exit 1
fi
if grep -nE '^(def|abbrev|structure|inductive|instance) ' Substrate/Proofs.lean; then
  echo "GATE: FAIL — definition escaped into a proof partition" >&2
  exit 1
fi
if grep -nE ':= by' Substrate/Laws.lean; then
  echo "GATE: FAIL — a law statement contains a proof body" >&2
  exit 1
fi
expected_laws=(
  SCarriageInvariance SPostureNotAnInput SCarriageInvariantBytes
  SOneDigestPerGroups SFoldFaithful SMutatedGroupMovesBytes
  LAlphabetTranscribed LMachineTotal LReadingsHoldState
  LTransitionNamesItsState LTerminalAbsorbing LTerminalReachable
  LDrainCloseDistinct
  RChainPinWellFounded RNoSelfPredecessor
  RRegisterBase RRegisterConsecution RRegisterSafety
)
actual_laws=()
while IFS= read -r law_name; do
  actual_laws+=("$law_name")
done < <(
  grep -oE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?def[[:space:]]+[A-Z][0-9A-Za-z_]*' \
    Substrate/Laws.lean | sed -E 's/.*def[[:space:]]+//'
)
if [[ "${actual_laws[*]}" != "${expected_laws[*]}" ]] ||
    ! grep -q '^import Substrate.Laws' Substrate/Proofs.lean ||
    ! grep -q '^import Substrate.Proofs' Substrate.lean; then
  echo "GATE: FAIL — law partition is incomplete or orphaned" >&2
  exit 1
fi
echo "GATE: PASS (definitions / statements / proofs partition; ${#expected_laws[@]} laws)"

actual_private=()
while IFS= read -r private_name; do
  actual_private+=("$private_name")
done < <(
  grep -rhoE '^[[:space:]]*(private|protected)[[:space:]]+(theorem|lemma)[[:space:]]+[A-Za-z0-9_]+' Substrate/ \
    | sed -E 's/.*(theorem|lemma)[[:space:]]+//' | LC_ALL=C sort
)
if [[ "${actual_private[*]:-}" != "" ]]; then
  echo "GATE: FAIL — a private/protected theorem appeared (found: ${actual_private[*]}). Visibility modifiers remove theorems from the roster and footprint sweep, so this package pins the private set to empty." >&2
  exit 1
fi
echo "GATE: PASS (no private theorems)"

if lake build; then
  echo "GATE: PASS (lake build)"
else
  echo "GATE: FAIL — lake build" >&2
  exit 1
fi

# ── Every public theorem is both rostered and footprint-checked; no exclusion
# file exists for this package.
roster=(
  mint_is_fold_of_groups carriage_invariance posture_not_an_input
  carriage_invariant_bytes one_digest_per_groups fold_faithful
  mutated_group_moves_bytes
  alphabet_transcribed machine_total readings_hold_state
  transition_names_its_state terminal_absorbing terminal_reachable
  drain_close_distinct
  chain_rank_lt_length landed_predecessors_are_landed chain_pin_rank_lt
  chain_pin_well_founded chain_no_self_predecessor
  bindings_cons without_cons bindings_without_self bindings_without_other
  bindings_append register_base
  admitted_predecessor_landed admitted_first_over_store admitted_fresh
  bindings_landed bindings_landed_other
  register_consecution register_safety
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
footprint_check=$(mktemp "./.footprint.XXXXXX.lean")
alphabet_mutant=$(mktemp "./.alphabet-mutant.XXXXXX.json")
alphabet_out=$(mktemp "./.alphabet-out.XXXXXX.txt")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$footprint_check" "$alphabet_mutant" "$alphabet_out"' EXIT

printf '%s\n' "${roster[@]}" | LC_ALL=C sort > "$roster_tmp"
grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+[A-Za-z0-9_']+" \
  Substrate | sed -E "s/.*(theorem|lemma)[[:space:]]+//" | LC_ALL=C sort > "$discovered_tmp"
if ! diff -u "$roster_tmp" "$discovered_tmp"; then
  echo "GATE: FAIL — theorem roster has an orphan or stale line" >&2
  exit 1
fi

{
  echo 'import Substrate'
  for name in "${roster[@]}"; do
    echo "#print axioms Substrate.$name"
  done
} > "$footprint_check"
footprint_output=$(lake env lean "$footprint_check" 2>&1) || {
  printf '%s\n' "$footprint_output" >&2
  echo "GATE: FAIL — footprint check did not elaborate" >&2
  exit 1
}
report_count=$(printf '%s\n' "$footprint_output" | grep -c "^'Substrate\.")
if [[ "$report_count" -ne "${#roster[@]}" ]]; then
  printf '%s\n' "$footprint_output" >&2
  echo "GATE: FAIL — expected ${#roster[@]} footprint reports, got $report_count" >&2
  exit 1
fi
unexpected_footprint=$(
  printf '%s\n' "$footprint_output" |
    tr '\n' ' ' |
    grep -oE '\[[^]]*\]' |
    tr ',' '\n' |
    sed -E 's/^\[?[[:space:]]*//; s/[[:space:]]*\]?$//' |
    grep -Ev '^(propext|Classical\.choice|Quot\.sound)$' || true
)
if [[ -n "$unexpected_footprint" ]]; then
  printf '%s\n' "$footprint_output" >&2
  printf 'GATE: FAIL — unexpected theorem footprint:\n%s\n' "$unexpected_footprint" >&2
  exit 1
fi
echo "GATE: PASS (${#roster[@]} theorem roster and footprint)"

# ── The alphabet-equality arm. The model's alphabet roster is DATA held
# against the transcribed status-events vocabulary's own canonical rendering,
# name for name and in the table's own row order. A status event spelled twice
# — once in the transcription and once in this model — is the drift class the
# whole vocabulary discipline refuses, so a divergence reddens here.
if ! lake exe alphabet "$vocabulary" > "$alphabet_out"; then
  cat "$alphabet_out" >&2
  echo "GATE: FAIL — the model's alphabet drifted from the transcribed status-events vocabulary" >&2
  exit 1
fi
if ! grep -q ';verdict=aligned$' "$alphabet_out"; then
  cat "$alphabet_out" >&2
  echo "GATE: FAIL — the alphabet-equality arm did not report alignment" >&2
  exit 1
fi
if ! grep -q ';transitions=7;readings=4;' "$alphabet_out"; then
  cat "$alphabet_out" >&2
  echo "GATE: FAIL — the transcribed placement split moved off seven transitions and four readings" >&2
  exit 1
fi
if ! diff -u controls/alphabet-equality.txt "$alphabet_out"; then
  echo "GATE: FAIL — the committed alphabet-equality record drifted" >&2
  exit 1
fi
echo "GATE: PASS (alphabet equality: model roster equals the transcribed status-events vocabulary)"

# Negative control for the arm: a table with one status event renamed must be
# reported as drift. The mutant is DERIVED from the real transcription at gate
# time rather than committed beside it, because a hand-kept copy of the table
# would be the very twin this arm exists to refuse.
sed 's/"type":"close"/"type":"closeD"/' "$vocabulary" > "$alphabet_mutant"
if cmp -s "$vocabulary" "$alphabet_mutant"; then
  echo "GATE: FAIL — the alphabet drift mutation did not change the table" >&2
  exit 1
fi
if lake exe alphabet "$alphabet_mutant" > "$alphabet_out"; then
  cat "$alphabet_out" >&2
  echo "GATE: FAIL — a renamed status event was not reported as drift" >&2
  exit 1
fi
if ! grep -q ';verdict=drifted$' "$alphabet_out"; then
  cat "$alphabet_out" >&2
  echo "GATE: FAIL — the alphabet drift control did not report drift" >&2
  exit 1
fi
if ! diff -u controls/alphabet-drift.cex.txt "$alphabet_out"; then
  echo "GATE: FAIL — the alphabet drift control trace drifted" >&2
  exit 1
fi
echo "GATE: PASS (alphabet drift control: a renamed status event reddens the arm)"

# ── The executable negative controls. Each drops one ratified law and must be
# refuted on exactly that law's own invariant, with its trace committed.
declare -a exercised_controls=()
check_control() {
  local name="$1"
  local trace="controls/$name.cex.txt"
  local output
  output=$(lake exe control "$name") || {
    echo "GATE: FAIL — $name control survived or failed to run" >&2
    exit 1
  }
  if [[ "$output" != *'verdict=refuted' ]]; then
    echo "GATE: FAIL — $name control was not refuted" >&2
    exit 1
  fi
  if ! diff -u "$trace" <(printf '%s\n' "$output"); then
    echo "GATE: FAIL — $name control trace drifted" >&2
    exit 1
  fi
  exercised_controls+=("$trace")
  echo "GATE: PASS ($name refuted)"
}

check_control mutated-group-moves-bytes
check_control machine-totality
check_control reading-promoted-to-state
check_control drain-close-conflated
check_control chain-cycle
check_control two-landed-current
exercised_controls+=("controls/alphabet-drift.cex.txt")

committed_controls=()
while IFS= read -r control_trace; do
  committed_controls+=("$control_trace")
done < <(find controls -type f -name '*.cex.txt' -print | LC_ALL=C sort)
exercised_sorted=()
while IFS= read -r control_trace; do
  exercised_sorted+=("$control_trace")
done < <(printf '%s\n' "${exercised_controls[@]}" | LC_ALL=C sort)
if [[ "${committed_controls[*]}" != "${exercised_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed control trace is orphaned" >&2
  exit 1
fi

# ── The must-not-compile class: each control file must be REFUSED by the
# elaborator with its pinned diagnosis, and its witness twin must elaborate, so
# the refusal is attributable to the sort discipline and not to file rot.
declare -a exercised_refusals=()
check_must_not_compile() {
  local name="$1"
  local control="must-not-compile/$name.lean"
  local witness="must-not-compile/$name.witness.lean"
  local expected="must-not-compile/$name.expected.txt"
  local diagnostics
  for file in "$control" "$witness" "$expected"; do
    if [[ ! -f "$file" ]]; then
      echo "GATE: FAIL — must-not-compile roster is missing $file" >&2
      exit 1
    fi
  done
  if ! lake env lean "$witness" >/dev/null 2>&1; then
    echo "GATE: FAIL — $name witness twin no longer elaborates" >&2
    exit 1
  fi
  if diagnostics=$(lake env lean "$control" 2>&1); then
    echo "GATE: FAIL — $name control elaborated; the sort discipline moved" >&2
    exit 1
  fi
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if ! grep -qF "$line" <<< "$diagnostics"; then
      printf '%s\n' "$diagnostics" >&2
      echo "GATE: FAIL — $name refusal lost its pinned diagnosis: $line" >&2
      exit 1
    fi
  done < "$expected"
  exercised_refusals+=("$control")
  echo "GATE: PASS ($name refused by the elaborator)"
}

check_must_not_compile cross-register-fence
check_must_not_compile cross-kind-store

committed_refusals=()
while IFS= read -r refusal_control; do
  committed_refusals+=("$refusal_control")
done < <(find must-not-compile -type f -name '*.lean' ! -name '*.witness.lean' -print | LC_ALL=C sort)
exercised_refusals_sorted=()
while IFS= read -r refusal_control; do
  exercised_refusals_sorted+=("$refusal_control")
done < <(printf '%s\n' "${exercised_refusals[@]}" | LC_ALL=C sort)
if [[ "${committed_refusals[*]}" != "${exercised_refusals_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed must-not-compile control is orphaned" >&2
  exit 1
fi

echo "GATE: PASS (substrate model; ${#roster[@]} theorems, 6 executable controls, 1 alphabet drift control, 2 must-not-compile refusals)"
