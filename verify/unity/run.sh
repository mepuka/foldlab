#!/usr/bin/env bash
# verify/unity/run.sh — the unity bridge gate. The bridge requires both
# models read-only; this gate additionally proves it changed neither.
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

for required in lean-toolchain lakefile.toml lake-manifest.json Unity.lean \
    ControlMain.lean Unity/Definitions.lean Unity/Laws.lean \
    Unity/Proofs.lean citations.txt; do
  if [[ ! -f "$required" ]]; then
    echo "GATE: FAIL — package roster is missing $required" >&2
    exit 1
  fi
done

# Toolchain unanimity: one pin across the bridge and both models.
for toolchain in lean-toolchain ../fabric/lean-toolchain \
    ../kernel/lean-toolchain; do
  if ! grep -q 'leanprover/lean4:v4.33.0' "$toolchain"; then
    echo "GATE: FAIL — toolchain pin moved in $toolchain" >&2
    exit 1
  fi
done

# The bridge's manifest names exactly the two models, by path, nothing
# else: no network dependency can appear without reddening this gate.
if [[ "$(grep -c '"type": "path"' lake-manifest.json)" -ne 2 ]] ||
    grep -q '"type": "git"' lake-manifest.json ||
    ! grep -q '"name": "fabric"' lake-manifest.json ||
    ! grep -q '"name": "kernel"' lake-manifest.json; then
  echo "GATE: FAIL — the bridge must require exactly fabric and kernel by path" >&2
  exit 1
fi

# Both upstream manifests stay zero-dependency: the bridge asserts from
# the dependent side what each model's own gate asserts from inside.
for manifest in ../fabric/lake-manifest.json ../kernel/lake-manifest.json; do
  if ! grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' "$manifest"; then
    echo "GATE: FAIL — upstream manifest grew a dependency: $manifest" >&2
    exit 1
  fi
done

# No reverse mention: neither model's gate may come to depend on this
# package — coupling stays one-directional and rollback stays a
# directory deletion.
if grep -q 'unity' ../fabric/run.sh ../kernel/run.sh; then
  echo "GATE: FAIL — an upstream gate mentions the bridge" >&2
  exit 1
fi

# Upstream sources byte-identical to the committed tree: requiring is
# not touching.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git diff --quiet -- ../fabric ../kernel; then
    echo "GATE: FAIL — an upstream model tree moved" >&2
    exit 1
  fi
fi
echo "GATE: PASS (topology: two read-only path requires, both models untouched)"

mapfile -t lean_sources < <(find Unity must-not-compile -type f -name '*.lean' -print | LC_ALL=C sort)
lean_sources+=(Unity.lean ControlMain.lean)

# Kernel-bound source hygiene, at the kernel's own word list.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden kernel escape in Lean source" >&2
  exit 1
fi
echo "GATE: PASS (bridge source hygiene)"

# Partition gate: object files never carry theorem declarations; law
# statements never carry proofs; proof files never mint definitions.
if grep -nE '^theorem ' Unity/Definitions.lean Unity/Laws.lean; then
  echo "GATE: FAIL — theorem escaped the proof partition" >&2
  exit 1
fi
if grep -nE '^(def|abbrev|structure|inductive|instance) ' Unity/Proofs.lean; then
  echo "GATE: FAIL — definition escaped into a proof partition" >&2
  exit 1
fi
if grep -nE ':= by' Unity/Laws.lean; then
  echo "GATE: FAIL — a law statement contains a proof body" >&2
  exit 1
fi
expected_laws=(
  UStageErasureRankAgrees UDerivedOrdersAgree UAdmissionTransports
  UPinsTransport UProgramWfFromC7 URankAgrees UGroundPinInhabited
  UInterpInflationaryAtCell UEvidenceStrictlyGrows
  UWellFencedByConstruction UGreatestReadIsArbitratedRead
  UGreatestReadsAgree UGreatestTieDiverges
)
mapfile -t actual_laws < <(
  grep -oE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?def[[:space:]]+[A-Z][0-9A-Za-z_]*' \
    Unity/Laws.lean | sed -E 's/.*def[[:space:]]+//'
)
if [[ "${actual_laws[*]}" != "${expected_laws[*]}" ]] ||
    ! grep -q '^import Unity.Laws' Unity/Proofs.lean ||
    ! grep -q '^import Unity.Proofs' Unity.lean; then
  echo "GATE: FAIL — law partition is incomplete or orphaned" >&2
  exit 1
fi
echo "GATE: PASS (definitions / statements / proofs partition)"

# The replay fence the kernel gate cannot see from its own directory:
# the stated-only composition law must not grow a consumer here.
if grep -n 'CandidateF13\|ComposedExecution' "${lean_sources[@]}"; then
  echo "GATE: FAIL — the stated-only replay law grew a consumer in the bridge" >&2
  exit 1
fi

# Independent derivation: the bridge derives the program pin law from
# fabric's C7 through the erasure. Citing the kernel's own pin proof or
# its rank lemmas would reduce the inheritance claim to bookkeeping.
if grep -n 'program_pin_well_founded\|node_pin_rank_lt\|node_rank_lt_length' \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — the bridge cited the kernel-side pin proof" >&2
  exit 1
fi

# Anti-vacuity: the discharge carrier is fabric's ground cell, and no
# numeral demonstration may stand in for it anywhere in this package.
if ! grep -q 'GroundEvidence' Unity/Laws.lean; then
  echo "GATE: FAIL — the discharge laws lost the ground carrier" >&2
  exit 1
fi
if grep -n 'Nat\.max' "${lean_sources[@]}"; then
  echo "GATE: FAIL — a numeral carrier appeared in the bridge" >&2
  exit 1
fi
echo "GATE: PASS (replay fence; independent derivation; ground carrier pinned)"

# Citation ledger: the kernel's taught table cites law rows by name.
# The committed ledger pins that set; every fabric row must resolve in
# fabric's roster and every veil-walled row must stay out of it.
mapfile -t cited < <(
  grep -oE '\(([a-z][a-z0-9]*(_[a-z0-9]+)+)\)' ../kernel/Kernel/Definitions.lean |
    tr -d '()' | LC_ALL=C sort -u
)
mapfile -t ledgered < <(cut -f1 citations.txt | LC_ALL=C sort -u)
if [[ "${cited[*]}" != "${ledgered[*]}" ]]; then
  echo "GATE: FAIL — the kernel's citation set drifted from the committed ledger" >&2
  echo "cited:    ${cited[*]}" >&2
  echo "ledgered: ${ledgered[*]}" >&2
  exit 1
fi
fabric_roster=$(sed -n '/^roster=(/,/^)/p' ../fabric/run.sh |
  grep -vE '^roster=\(|^\)')
while IFS=$'\t' read -r name venue; do
  [[ -z "$name" ]] && continue
  case "$venue" in
    fabric)
      if ! grep -qw "$name" <<< "$fabric_roster"; then
        echo "GATE: FAIL — cited fabric row $name is not in fabric's roster" >&2
        exit 1
      fi
      ;;
    veil)
      if grep -qw "$name" <<< "$fabric_roster"; then
        echo "GATE: FAIL — veil-walled citation $name unexpectedly resolves in fabric" >&2
        exit 1
      fi
      ;;
    *)
      echo "GATE: FAIL — unknown citation venue $venue for $name" >&2
      exit 1
      ;;
  esac
done < citations.txt
echo "GATE: PASS (citation ledger: ${#cited[@]} names reconciled, venues checked)"

mapfile -t actual_private < <(
  grep -rhoE '^[[:space:]]*(private|protected)[[:space:]]+(theorem|lemma)[[:space:]]+[A-Za-z0-9_]+' Unity/ \
    | sed -E 's/.*(theorem|lemma)[[:space:]]+//' | sort
)
if [[ "${actual_private[*]:-}" != "" ]]; then
  echo "GATE: FAIL — a private/protected theorem appeared (found: ${actual_private[*]})" >&2
  exit 1
fi
echo "GATE: PASS (no private theorems)"

if lake build; then
  echo "GATE: PASS (lake build)"
else
  echo "GATE: FAIL — lake build" >&2
  exit 1
fi

# Every public theorem is both rostered and footprint-checked; no
# exclusion file exists for this package.
roster=(
  stage_erasure_rank_agrees derived_orders_agree ledger_of_eq_map
  admission_transports pins_transport program_wf_from_c7 rank_agrees
  ground_program_admitted ground_ledger_admitted ground_pin_inhabited
  interp_inflationary_at_cell evidence_strictly_grows
  positioned_token_le positioned_token_determines records_token_le
  well_fenced_by_construction greatest_read_is_arbitrated
  greatest_reads_agree greatest_tie_diverges
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
footprint_check=$(mktemp "./.footprint.XXXXXX.lean")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$footprint_check"' EXIT

printf '%s\n' "${roster[@]}" | LC_ALL=C sort > "$roster_tmp"
grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+[A-Za-z0-9_']+" \
  Unity | sed -E "s/.*(theorem|lemma)[[:space:]]+//" | LC_ALL=C sort > "$discovered_tmp"
if ! diff -u "$roster_tmp" "$discovered_tmp"; then
  echo "GATE: FAIL — theorem roster has an orphan or stale line" >&2
  exit 1
fi

{
  echo 'import Unity'
  for name in "${roster[@]}"; do
    echo "#print axioms Unity.$name"
  done
} > "$footprint_check"
footprint_output=$(lake env lean "$footprint_check" 2>&1) || {
  printf '%s\n' "$footprint_output" >&2
  echo "GATE: FAIL — footprint check did not elaborate" >&2
  exit 1
}
report_count=$(printf '%s\n' "$footprint_output" | grep -c "^'Unity\.")
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

declare -a exercised_controls=()
check_control() {
  local name="$1"
  local trace="negative-controls/$name.cex.txt"
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

check_control tie-orientation
check_control ascending-positions
check_control broken-erasure-pins

mapfile -t committed_controls < <(find negative-controls -type f -name '*.cex.txt' -print | LC_ALL=C sort)
mapfile -t exercised_sorted < <(printf '%s\n' "${exercised_controls[@]}" | LC_ALL=C sort)
if [[ "${committed_controls[*]}" != "${exercised_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed control trace is orphaned" >&2
  exit 1
fi

# The must-not-compile class: each control file must be REFUSED by the
# elaborator with its pinned diagnosis, and its witness twin must
# elaborate, so the refusal is attributable to the sort discipline and
# not to file rot.
declare -a exercised_refusals=()
check_must_not_compile() {
  local name="$1"
  local control="must-not-compile/$name.lean"
  local witness="must-not-compile/$name.witness.lean"
  local expected="must-not-compile/$name.expected.txt"
  local diagnostics
  for required in "$control" "$witness" "$expected"; do
    if [[ ! -f "$required" ]]; then
      echo "GATE: FAIL — must-not-compile roster is missing $required" >&2
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

check_must_not_compile cross-model-stage

mapfile -t committed_refusals < <(find must-not-compile -type f -name '*.lean' ! -name '*.witness.lean' -print | LC_ALL=C sort)
mapfile -t exercised_refusals_sorted < <(printf '%s\n' "${exercised_refusals[@]}" | LC_ALL=C sort)
if [[ "${committed_refusals[*]}" != "${exercised_refusals_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed must-not-compile control is orphaned" >&2
  exit 1
fi

echo "GATE: PASS (3 translation controls; 1 must-not-compile refusal; roster ${#roster[@]})"
