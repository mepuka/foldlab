#!/usr/bin/env bash
# verify/kernel/run.sh — the standalone kernel-algebra model gate.
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

for required in lean-toolchain lakefile.toml lake-manifest.json Kernel.lean \
    ControlMain.lean Kernel/Definitions.lean Kernel/Laws.lean \
    Kernel/Proofs.lean; do
  if [[ ! -f "$required" ]]; then
    echo "GATE: FAIL — package roster is missing $required" >&2
    exit 1
  fi
done

if ! grep -q 'leanprover/lean4:v4.33.0' lean-toolchain ||
    ! grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' lake-manifest.json; then
  echo "GATE: FAIL — toolchain or zero-dependency manifest pin moved" >&2
  exit 1
fi

mapfile -t lean_sources < <(find Kernel must-not-compile -type f -name '*.lean' -print | LC_ALL=C sort)
lean_sources+=(Kernel.lean ControlMain.lean)

# Kernel-bound source hygiene: no proof escapes, no trusted-code widening.
# The word list includes the two reserved words the toolchain measurement
# calls out, so they stay out of docstrings as well as code.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden kernel escape in Lean source" >&2
  exit 1
fi
echo "GATE: PASS (kernel source hygiene)"

# Partition gate: object files never carry theorem declarations; law
# statements never carry proofs; proof files never mint definitions.
if grep -nE '^theorem ' Kernel/Definitions.lean Kernel/Laws.lean; then
  echo "GATE: FAIL — theorem escaped the proof partition" >&2
  exit 1
fi
if grep -nE '^(def|abbrev|structure|inductive|instance) ' Kernel/Proofs.lean; then
  echo "GATE: FAIL — definition escaped into a proof partition" >&2
  exit 1
fi
if grep -nE ':= by' Kernel/Laws.lean; then
  echo "GATE: FAIL — a law statement contains a proof body" >&2
  exit 1
fi
expected_laws=(
  KSentenceEncodingInjective KAdmissionRefusesUnlawful KRefusalParity
  KAdmitMonotone KIntrinsicFaultRefusedEverywhere
  KRelativeRefusalRepairableByGrowth
  KProgramPinWellFounded KFillCommutative KFillMonoidAction
  KProvisionNewestWins KProvisionAppendUnion KRequiresExclude
  KProvisionPositionedCorrespondence
  KInterpInflationary CandidateF13BoundExecutionReplay
)
mapfile -t actual_laws < <(
  grep -oE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?def[[:space:]]+[A-Z][0-9A-Za-z_]*' \
    Kernel/Laws.lean | sed -E 's/.*def[[:space:]]+//'
)
if [[ "${actual_laws[*]}" != "${expected_laws[*]}" ]] ||
    ! grep -q '^import Kernel.Laws' Kernel/Proofs.lean ||
    ! grep -q '^import Kernel.Proofs' Kernel.lean; then
  echo "GATE: FAIL — law partition is incomplete or orphaned" >&2
  exit 1
fi
# CandidateF13BoundExecutionReplay is STATED, deliberately unproven: the
# composition obligation's F-number mints only at ratification. A proof
# appearing here without a ruling is a finding, not progress.
if grep -n 'CandidateF13' Kernel/Proofs.lean ControlMain.lean; then
  echo "GATE: FAIL — the stated-only replay law grew a consumer without a ruling" >&2
  exit 1
fi
echo "GATE: PASS (definitions / statements / proofs partition; F13 stated-only)"

mapfile -t actual_private < <(
  grep -rhoE '^[[:space:]]*(private|protected)[[:space:]]+(theorem|lemma)[[:space:]]+[A-Za-z0-9_]+' Kernel/ \
    | sed -E 's/.*(theorem|lemma)[[:space:]]+//' | sort
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

# Every public theorem is both rostered and footprint-checked; no
# exclusion file exists for this package.
roster=(
  rank_to_kind_rank rank_to_stage_rank act_decode_encode
  sentence_encoding_injective
  ref_member_iff ref_member_eq_false_of_not_mem ref_member_monotone
  door_le_repairing
  taught_reason taught_teaches
  arg_sweep_none arg_refusal_none_monotone arg_sweep_none_monotone
  inside_universe_true_monotone sweep_blocks sweep_refuses
  admit_monotone intrinsic_arg_refusal intrinsic_fault_no_admission
  intrinsic_fault_refused_everywhere digest_mem_arg_refs
  required_catalog_contains_arg_ref payload_intrinsic_free
  arg_sweep_none_of_supported repairing_arg_sweep_none
  inside_universe_true_of_supported repairing_inside_universe
  translate_predicate_some_of_no_refusal
  intrinsically_clean_admitted_by_growth
  relative_refusal_repairable_by_growth
  admission_refuses_unlawful admit_refusals_taught refusal_parity
  closure_clock_read_refused closure_absence_trigger_refused
  closure_unfenced_decide_refused closure_last_writer_refused
  closure_unverified_read_refused closure_cross_register_token_refused
  closure_minted_identifier_refused closure_ambient_query_refused
  closure_forward_reference_refused closure_secret_carrier_refused
  closure_absence_claim_refused closure_past_mutation_refused
  closure_off_writ_referent_refused closure_function_value_refused
  anchored_resolve_refused unfilled_hole_refused door_admits_lawful
  node_rank_lt_length admitted_uses_have_admitted_nodes
  node_pin_rank_lt program_pin_well_founded program_pin_irrefl
  fill_arg_union fill_arg_disjoint_comm fill_arg_empty
  fill_node_union fill_node_disjoint_comm fill_node_empty
  fill_monoid_action fill_commutative
  world_le_refl_of_idem evidence_absorb interp_inflationary
  ground_max_assoc ground_max_idem ground_interp_inflationary
  provision_newest_wins provision_append_union provision_disjoint_comm
  provision_override_idem requires_arg_fill requires_list_fill
  requires_of_fill greatest_at_cons greatest_at_le_length
  provision_positioned_correspondence
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
footprint_check=$(mktemp "./.footprint.XXXXXX.lean")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$footprint_check"' EXIT

printf '%s\n' "${roster[@]}" | LC_ALL=C sort > "$roster_tmp"
grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+[A-Za-z0-9_']+" \
  Kernel | sed -E "s/.*(theorem|lemma)[[:space:]]+//" | LC_ALL=C sort > "$discovered_tmp"
if ! diff -u "$roster_tmp" "$discovered_tmp"; then
  echo "GATE: FAIL — theorem roster has an orphan or stale line" >&2
  exit 1
fi

{
  echo 'import Kernel'
  for name in "${roster[@]}"; do
    echo "#print axioms Kernel.$name"
  done
} > "$footprint_check"
footprint_output=$(lake env lean "$footprint_check" 2>&1) || {
  printf '%s\n' "$footprint_output" >&2
  echo "GATE: FAIL — footprint check did not elaborate" >&2
  exit 1
}
report_count=$(printf '%s\n' "$footprint_output" | grep -c "^'Kernel\.")
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

check_control closure-clock-read
check_control closure-absence-trigger
check_control closure-unfenced-decide
check_control closure-last-writer-wins
check_control closure-unverified-read
check_control closure-cross-sort-token
check_control closure-minted-identifier
check_control closure-ambient-query
check_control closure-forward-reference
check_control closure-secret-carrier
check_control closure-absence-claim
check_control closure-past-mutation
check_control closure-off-writ-referent
check_control closure-function-value
check_control anchored-resolve
check_control unfilled-hole
check_control door-admits-lawful
check_control drop-admit-monotonicity
check_control drop-intrinsic-refusal
check_control drop-relative-repair-growth
check_control drop-provision-disjointness

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

check_must_not_compile cross-register-token
check_must_not_compile cross-partition-position
check_must_not_compile cross-kind-digest
check_must_not_compile anchored-resolve

mapfile -t committed_refusals < <(find must-not-compile -type f -name '*.lean' ! -name '*.witness.lean' -print | LC_ALL=C sort)
mapfile -t exercised_refusals_sorted < <(printf '%s\n' "${exercised_refusals[@]}" | LC_ALL=C sort)
if [[ "${committed_refusals[*]}" != "${exercised_refusals_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed must-not-compile control is orphaned" >&2
  exit 1
fi

echo "GATE: PASS (21 executable controls; 4 must-not-compile refusals; roster ${#roster[@]})"
