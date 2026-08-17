#!/usr/bin/env bash
# verify/fabric/run.sh — the standalone fabric algebra gate.
set -euo pipefail
cd "$(dirname "$0")"

self_test=false
case "${1:-}" in
  "") ;;
  --self-test) self_test=true ;;
  *) echo "usage: ./run.sh [--self-test]" >&2; exit 2 ;;
esac
if [[ "$#" -gt 1 ]]; then
  echo "usage: ./run.sh [--self-test]" >&2
  exit 2
fi

if ! command -v lake >/dev/null 2>&1; then
  echo "GATE: FAIL — lake not found" >&2
  exit 2
fi

for required in lean-toolchain lakefile.toml lake-manifest.json Fabric.lean \
    Main.lean ControlMain.lean Fabric/Definitions.lean Fabric/Laws.lean \
    Fabric/Proofs.lean Fabric/Mutants.lean Fabric/ControlProofs.lean \
    Fabric/Canonical.lean Fabric/Corpus.lean Fabric/BridgeProofs.lean \
    kernel-extern-allowlist.txt; do
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

mapfile -t lean_sources < <(find Fabric -type f -name '*.lean' -print | LC_ALL=C sort)
lean_sources+=(Fabric.lean Main.lean ControlMain.lean)

# Kernel-bound source hygiene. The extern allowlist is intentionally empty;
# adding an approval requires a separately ratified per-site digest row.
if grep -vE '^[[:space:]]*(#|$)' kernel-extern-allowlist.txt | grep -q .; then
  echo "GATE: FAIL — extern approval appeared without gate support" >&2
  exit 1
fi
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden kernel escape in Lean source" >&2
  exit 1
fi
echo "GATE: PASS (kernel source hygiene)"

# Partition gate: objects and executable definitions never carry theorem
# declarations; law statements never carry proofs; proof files never mint
# definitions. The import chain makes the statements part of the built gate.
if grep -nE '^theorem ' Fabric/Definitions.lean Fabric/Laws.lean \
    Fabric/Mutants.lean Fabric/Canonical.lean Fabric/Corpus.lean; then
  echo "GATE: FAIL — theorem escaped the proof partition" >&2
  exit 1
fi
if grep -nE '^(def|abbrev|structure|inductive|instance) ' Fabric/Proofs.lean \
    Fabric/ControlProofs.lean Fabric/BridgeProofs.lean; then
  echo "GATE: FAIL — definition escaped into a proof partition" >&2
  exit 1
fi
if grep -nE ':= by' Fabric/Laws.lean; then
  echo "GATE: FAIL — a law statement contains a proof body" >&2
  exit 1
fi
expected_laws=(
  F1CellMergeACI F1SameVerifiedSetConverges F2TraceInvariant
  F3ResumeExact F2bSerialSuccessorPremise F2bGuardedExactlyOnce F4PartitionFold
  F9PolicyMeetSemilattice F9TreeAttenuation
)
mapfile -t actual_laws < <(
  grep -oE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?def[[:space:]]+F[0-9A-Za-z_]+' \
    Fabric/Laws.lean | sed -E 's/.*def[[:space:]]+//'
)
if [[ "${actual_laws[*]}" != "${expected_laws[*]}" ]] ||
    ! grep -q '^import Fabric.Laws' Fabric/Proofs.lean ||
    ! grep -q '^import Fabric.BridgeProofs' Fabric.lean; then
  echo "GATE: FAIL — law partition is incomplete or orphaned" >&2
  exit 1
fi
echo "GATE: PASS (definitions / statements / proofs partition)"

if lake build; then
  echo "GATE: PASS (lake build)"
else
  echo "GATE: FAIL — lake build" >&2
  exit 1
fi

# Every public theorem is both rostered and footprint-checked; no exclusion
# file exists for this package.
roster=(
  cell_merge_comm cell_merge_assoc cell_merge_idem f1_cell_merge_aci
  f1_same_verified_set_converges f2_trace_invariant f2_permutation
  f2_duplication emitter_observation_cmp_lawful_eq
  emitter_observation_cmp_lawful_beq
  emitter_observation_comparator_lawful f3_resume_exact
  positioned_above positioned_unique ingest_preserves_lookup
  ingest_lookup_of_raw_support schedule_buffer_covers apply_successors_exact
  apply_successors_congr ingest_window_agrees guard_is_redundant
  f2b_guarded_exactly_once
  commutative_fold_append foldCommutative_eq_fold commutative_fold_permutation
  partition_folds_flatten f4_partition_fold policy_set_inter_comm
  policy_set_inter_assoc policy_set_inter_idem policy_le_refl policy_le_trans
  policy_meet_comm policy_meet_assoc policy_meet_idem policy_meet_le_left
  policy_meet_le_right policy_le_meet policy_meet_monotone
  f9_policy_meet_semilattice f9_tree_attenuation
  drop_idempotence_keeps_associativity drop_idempotence_keeps_commutativity
  drop_idempotence_killed drop_commutativity_keeps_associativity
  drop_commutativity_keeps_idempotence drop_commutativity_killed
  drop_successor_discipline_keeps_contiguous_trace
  reordered_vector_has_serial_successor_premise
  arrival_order_apply_skips_six_before_five successor_discipline_survives_reordering
  drop_successor_discipline_killed meet_clamp_survives_escalating_request
  drop_meet_clamping_keeps_already_attenuated drop_meet_clamping_killed
  emitter_f1_cell_merge_aci emitter_f2_duplication emitter_f2_permutation
  emitter_stale_schedule_premise emitter_f2b_stale_replay
  emitter_duplicate_schedule_premise emitter_f2b_duplication
  emitter_reordered_schedule_premise emitter_f2b_reordering
  emitter_f3_resume emitter_f4_partition emitter_intruder_refused
  finite_subset_bool_iff policyLeBool_iff emitter_f9_clamp emitter_f9_tree
  emitter_string_escaping
  emitter_duplicate_key_collapse
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
axiom_check=$(mktemp "./.axioms.XXXXXX.lean")
regen_dir=".regen"
mkdir -p "$regen_dir"
corpus_tmp="$regen_dir/fabric-conformance.ndjson"
corpus_witnesses_tmp=$(mktemp "./.corpus-witnesses.XXXXXX")
corpus_mutation_tmp=$(mktemp "$regen_dir/.corpus-mutation.XXXXXX.ndjson")
emission_mutation_tmp=$(mktemp "$regen_dir/.emission-mutation.XXXXXX.ndjson")
row_deletion_tmp=$(mktemp "$regen_dir/.row-deletion.XXXXXX.ndjson")
row_insertion_tmp=$(mktemp "$regen_dir/.row-insertion.XXXXXX.ndjson")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$axiom_check" "$corpus_witnesses_tmp" "$corpus_mutation_tmp" "$emission_mutation_tmp" "$row_deletion_tmp" "$row_insertion_tmp"' EXIT

printf '%s\n' "${roster[@]}" | LC_ALL=C sort > "$roster_tmp"
grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+[A-Za-z0-9_']+" \
  Fabric | sed -E "s/.*(theorem|lemma)[[:space:]]+//" | LC_ALL=C sort > "$discovered_tmp"
if ! diff -u "$roster_tmp" "$discovered_tmp"; then
  echo "GATE: FAIL — theorem roster has an orphan or stale line" >&2
  exit 1
fi

{
  echo 'import Fabric'
  for name in "${roster[@]}"; do
    echo "#print axioms Fabric.$name"
  done
} > "$axiom_check"
axiom_output=$(lake env lean "$axiom_check" 2>&1) || {
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — footprint check did not elaborate" >&2
  exit 1
}
report_count=$(printf '%s\n' "$axiom_output" | grep -c "^'Fabric\.")
if [[ "$report_count" -ne "${#roster[@]}" ]]; then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — expected ${#roster[@]} footprint reports, got $report_count" >&2
  exit 1
fi
unexpected_axioms=$(
  printf '%s\n' "$axiom_output" |
    tr '\n' ' ' |
    grep -oE '\[[^]]*\]' |
    tr ',' '\n' |
    sed -E 's/^\[?[[:space:]]*//; s/[[:space:]]*\]?$//' |
    grep -Ev '^(propext|Classical\.choice|Quot\.sound)$' || true
)
if [[ -n "$unexpected_axioms" ]]; then
  printf '%s\n' "$axiom_output" >&2
  printf 'GATE: FAIL — unexpected theorem footprint:\n%s\n' "$unexpected_axioms" >&2
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
    echo "GATE: FAIL — $name counterexample trace drifted" >&2
    exit 1
  fi
  exercised_controls+=("$trace")
  echo "GATE: PASS ($name refuted)"
}

check_control drop-idempotence
check_control drop-commutativity
check_control drop-successor-discipline
check_control drop-meet-clamping

mapfile -t committed_controls < <(find negative-controls -type f -name '*.cex.txt' -print | LC_ALL=C sort)
mapfile -t exercised_sorted < <(printf '%s\n' "${exercised_controls[@]}" | LC_ALL=C sort)
if [[ "${committed_controls[*]}" != "${exercised_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed negative-control trace is orphaned" >&2
  exit 1
fi

fixture="../../packages/plait/fixtures/fabric-conformance.ndjson"
lake exe emitter > "$corpus_tmp"
sed -nE 's/.*"kind":"([^"]+)".*"name":"([^"]+)".*"witness":"Fabric\.([^"]+)".*/\1 \2 \3/p' \
  "$corpus_tmp" > "$corpus_witnesses_tmp"
expected_vector_witnesses=(
  'F1 cell-merge-aci emitter_f1_cell_merge_aci'
  'F2 duplicated-deliveries emitter_f2_duplication'
  'F2 permuted-evidence-schedule emitter_f2_permutation'
  'F2b floor-violating-stale-replay emitter_f2b_stale_replay'
  'F2b duplicate-current-delivery emitter_f2b_duplication'
  'F2b bounded-reordered-delivery emitter_f2b_reordering'
  'F3 checkpoint-resume emitter_f3_resume'
  'F4 partition-interleaving emitter_f4_partition'
  'alphabet-refusal non-commuting-intruder emitter_intruder_refused'
  'F9 attenuation-request-clamped emitter_f9_clamp'
  'F9 delegation-tree-attenuation emitter_f9_tree'
)
if [[ "$(wc -l < "$corpus_witnesses_tmp" | tr -d ' ')" -ne 11 ]] ||
    ! diff -u <(printf '%s\n' "${expected_vector_witnesses[@]}" | LC_ALL=C sort) \
      <(LC_ALL=C sort "$corpus_witnesses_tmp"); then
  echo "GATE: FAIL — every emitted vector must name its exact theorem instance" >&2
  exit 1
fi
while read -r _kind _name witness; do
  if ! grep -qx "$witness" "$roster_tmp"; then
    echo "GATE: FAIL — vector witness Fabric.$witness is absent from the theorem roster" >&2
    exit 1
  fi
done < "$corpus_witnesses_tmp"

report_first_corpus_divergence() {
  local committed="$1"
  local model="$2"
  local index=0 row committed_count model_count
  local committed_line model_line committed_present model_present identity_line
  local report_committed_present report_model_present
  local kind name
  local -a committed_rows model_rows
  mapfile -t committed_rows < "$committed"
  mapfile -t model_rows < "$model"
  committed_count=${#committed_rows[@]}
  model_count=${#model_rows[@]}
  while [[ "$index" -lt "$committed_count" || "$index" -lt "$model_count" ]]; do
    committed_present=0
    model_present=0
    committed_line=''
    model_line=''
    if [[ "$index" -lt "$committed_count" ]]; then
      committed_present=1
      committed_line="${committed_rows[$index]}"
    fi
    if [[ "$index" -lt "$model_count" ]]; then
      model_present=1
      model_line="${model_rows[$index]}"
    fi
    if [[ "$committed_present" -eq 0 && "$model_present" -eq 0 ]]; then
      break
    fi
    if [[ "$committed_present" -ne "$model_present" || "$committed_line" != "$model_line" ]]; then
      report_committed_present=$committed_present
      report_model_present=$model_present
      if [[ "$committed_present" -eq 1 && "$model_present" -eq 1 &&
          $((index + 1)) -lt "$committed_count" &&
          "${committed_rows[$((index + 1))]}" == "$model_line" ]]; then
        # The model omitted the committed row; report the row that vanished,
        # not the row that shifted into its position.
        report_model_present=0
        identity_line="$committed_line"
      elif [[ "$committed_present" -eq 1 && "$model_present" -eq 1 &&
          $((index + 1)) -lt "$model_count" &&
          "${model_rows[$((index + 1))]}" == "$committed_line" ]]; then
        # The model inserted a row; the committed side has no matching row.
        report_committed_present=0
        identity_line="$model_line"
      elif [[ "$model_present" -eq 1 ]]; then
        identity_line="$model_line"
      else
        identity_line="$committed_line"
      fi
      row=$((index + 1))
      kind=$(printf '%s\n' "$identity_line" |
        sed -nE 's/.*"kind":"([^"]+)".*/\1/p')
      name=$(printf '%s\n' "$identity_line" |
        sed -nE 's/.*"name":"([^"]+)".*/\1/p')
      if [[ "$row" -eq 1 ]]; then
        kind=${kind:-header}
        name=${name:-provenance}
      else
        kind=${kind:-unknown}
        name=${name:-unknown}
      fi
      echo "FINDING: divergent corpus row=$row kind=$kind name=$name positional-bound=one-row-lookahead" >&2
      if [[ "$report_model_present" -eq 1 ]]; then
        echo "FINDING: model line: $model_line" >&2
      else
        echo "FINDING: model line: <missing>" >&2
      fi
      if [[ "$report_committed_present" -eq 1 ]]; then
        echo "FINDING: committed line: $committed_line" >&2
      else
        echo "FINDING: committed line: <missing>" >&2
      fi
      echo "FINDING: intended change — regenerate and commit corpus + manifest IN THE SAME COMMIT as the model change" >&2
      echo "FINDING: unintended change — report the finding and STOP; never edit the fixture to agree" >&2
      return 0
    fi
    index=$((index + 1))
  done
  echo "FINDING: corpus regeneration differs but no divergent row was decoded" >&2
}

check_corpus_regeneration() {
  local committed="$1"
  local model="$2"
  if cmp -s "$committed" "$model"; then
    return 0
  fi
  report_first_corpus_divergence "$committed" "$model"
  echo "GATE: FAIL — corpus is not a fresh regeneration; model emission kept at $model" >&2
  return 1
}

if ! check_corpus_regeneration "$fixture" "$corpus_tmp"; then
  exit 1
fi
expected_header='{"command":"cd verify/fabric && lake exe emitter > ../../packages/plait/fixtures/fabric-conformance.ndjson","counts":{"F1":1,"F2":2,"F2b":3,"F3":1,"F4":1,"F9":2,"alphabet-refusal":1},"format":1,"generator":"verify/fabric emitter","vectors":11}'
if [[ "$(head -n 1 "$corpus_tmp")" != "$expected_header" ]] ||
    [[ "$(wc -l < "$corpus_tmp" | tr -d ' ')" -ne 12 ]] ||
    [[ "$(grep -c '"kind":"F1"' "$corpus_tmp")" -ne 1 ]] ||
    [[ "$(grep -c '"kind":"F2"' "$corpus_tmp")" -ne 2 ]] ||
    [[ "$(grep -c '"kind":"F2b"' "$corpus_tmp")" -ne 3 ]] ||
    [[ "$(grep -c '"kind":"F3"' "$corpus_tmp")" -ne 1 ]] ||
    [[ "$(grep -c '"kind":"F4"' "$corpus_tmp")" -ne 1 ]] ||
    [[ "$(grep -c '"kind":"F9"' "$corpus_tmp")" -ne 2 ]] ||
    [[ "$(grep -c '"kind":"alphabet-refusal"' "$corpus_tmp")" -ne 1 ]]; then
  echo "GATE: FAIL — corpus count or canonical provenance pin moved" >&2
  exit 1
fi

if grep -oE '[0-9]+' "$corpus_tmp" | awk '$1 > 9007199254740991 { exit 1 }'; then
  :
else
  echo "GATE: FAIL — corpus escaped the non-negative safe-integer domain" >&2
  exit 1
fi

if [[ "$self_test" == true ]]; then
  if ! awk '
      BEGIN { mutated = 0 }
      !mutated && /"name":"duplicated-deliveries"/ {
        mutated = sub(/"matchesExact":true/, "\"matchesExact\":True")
      }
      { print }
      END { if (!mutated) exit 42 }
    ' "$fixture" > "$corpus_mutation_tmp"; then
    echo "GATE: FAIL — --self-test could not plant the one-byte corpus mutation" >&2
    exit 1
  fi
  if corpus_control=$(check_corpus_regeneration "$corpus_mutation_tmp" "$corpus_tmp" 2>&1); then
    echo "GATE: FAIL — --self-test accepted the planted corpus mutation" >&2
    exit 1
  fi
  if ! grep -q 'divergent corpus row=3 kind=F2 name=duplicated-deliveries' \
      <<< "$corpus_control"; then
    printf '%s\n' "$corpus_control" >&2
    echo "GATE: FAIL — corpus-mutation refusal omitted the divergent row" >&2
    exit 1
  fi
  printf '%s\n' "$corpus_control"
  echo "GATE: PASS (--self-test refused one-byte corpus mutation at row=3 kind=F2 name=duplicated-deliveries)"

  if ! awk '
      BEGIN { mutated = 0 }
      !mutated && /"name":"permuted-evidence-schedule"/ {
        mutated = sub(/"matchesSequential":true/, "\"matchesSequential\":True")
      }
      { print }
      END { if (!mutated) exit 42 }
    ' "$corpus_tmp" > "$emission_mutation_tmp"; then
    echo "GATE: FAIL — --self-test could not plant the model-emission mutation" >&2
    exit 1
  fi
  if emission_control=$(check_corpus_regeneration "$fixture" "$emission_mutation_tmp" 2>&1); then
    echo "GATE: FAIL — --self-test accepted a model change without regeneration" >&2
    exit 1
  fi
  if ! grep -q 'divergent corpus row=4 kind=F2 name=permuted-evidence-schedule' \
      <<< "$emission_control"; then
    printf '%s\n' "$emission_control" >&2
    echo "GATE: FAIL — emission-mutation refusal omitted the divergent row" >&2
    exit 1
  fi
  printf '%s\n' "$emission_control"
  echo "GATE: PASS (--self-test refused model emission without corpus regeneration at row=4 kind=F2 name=permuted-evidence-schedule)"

  if ! awk '
      /"name":"floor-violating-stale-replay"/ { removed += 1; next }
      { print }
      END { if (removed != 1) exit 42 }
    ' "$corpus_tmp" > "$row_deletion_tmp"; then
    echo "GATE: FAIL — --self-test could not plant the model-row deletion" >&2
    exit 1
  fi
  if deletion_control=$(check_corpus_regeneration "$fixture" "$row_deletion_tmp" 2>&1); then
    echo "GATE: FAIL — --self-test accepted a deleted model row" >&2
    exit 1
  fi
  if ! grep -q 'divergent corpus row=5 kind=F2b name=floor-violating-stale-replay' \
      <<< "$deletion_control" ||
      ! grep -q 'FINDING: model line: <missing>' <<< "$deletion_control"; then
    printf '%s\n' "$deletion_control" >&2
    echo "GATE: FAIL — model-row deletion refusal misattributed the vanished row" >&2
    exit 1
  fi
  printf '%s\n' "$deletion_control"
  echo "GATE: PASS (--self-test refused deleted model row=5 kind=F2b name=floor-violating-stale-replay)"

  if ! awk '
      !inserted && /"name":"floor-violating-stale-replay"/ {
        planted = $0
        inserted = sub(/"name":"floor-violating-stale-replay"/, "\"name\":\"inserted-control-row\"", planted)
        print planted
      }
      { print }
      END { if (inserted != 1) exit 42 }
    ' "$corpus_tmp" > "$row_insertion_tmp"; then
    echo "GATE: FAIL — --self-test could not plant the model-row insertion" >&2
    exit 1
  fi
  if insertion_control=$(check_corpus_regeneration "$fixture" "$row_insertion_tmp" 2>&1); then
    echo "GATE: FAIL — --self-test accepted an inserted model row" >&2
    exit 1
  fi
  if ! grep -q 'divergent corpus row=5 kind=F2b name=inserted-control-row' \
      <<< "$insertion_control" ||
      ! grep -q 'FINDING: committed line: <missing>' <<< "$insertion_control"; then
    printf '%s\n' "$insertion_control" >&2
    echo "GATE: FAIL — model-row insertion refusal misattributed the inserted row" >&2
    exit 1
  fi
  printf '%s\n' "$insertion_control"
  echo "GATE: PASS (--self-test refused inserted model row=5 kind=F2b name=inserted-control-row)"
fi

echo "GATE: PASS (4 law-dropping controls; 11 canonical model vectors; byte-identical regeneration)"
