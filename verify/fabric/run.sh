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

for required_tool in lake sha256sum; do
  if ! command -v "$required_tool" >/dev/null 2>&1; then
    echo "GATE: FAIL — $required_tool not found" >&2
    exit 2
  fi
done

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
if grep -nE '^(def|abbrev|structure|inductive) ' Fabric/Proofs.lean \
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
  f2_duplication emitter_observation_comparator_lawful
  f3_resume_exact f2b_guarded_exactly_once
  commutative_fold_append commutative_fold_permutation
  partition_folds_flatten f4_partition_fold policy_set_inter_comm
  policy_set_inter_assoc policy_set_inter_idem policy_le_refl policy_le_trans
  policy_meet_comm policy_meet_assoc policy_meet_idem policy_meet_le_left
  policy_meet_le_right policy_le_meet policy_meet_monotone
  f9_policy_meet_semilattice f9_tree_attenuation
  drop_idempotence_keeps_associativity drop_idempotence_keeps_commutativity
  drop_idempotence_killed drop_commutativity_keeps_associativity
  drop_commutativity_keeps_idempotence drop_commutativity_killed
  floor_replay_vector_has_serial_successor_premise
  bare_floor_guard_skips_six_before_five floor_guard_survives_replay
  drop_floor_guard_killed meet_clamp_survives_escalating_request
  drop_meet_clamping_killed
  emitter_f1_cell_merge_aci emitter_f2_duplication emitter_f2_permutation
  emitter_f2b_stale_replay emitter_f2b_duplication emitter_f2b_reordering
  emitter_f3_resume emitter_f4_partition emitter_intruder_refused
  emitter_f9_clamp emitter_f9_tree emitter_string_escaping
  emitter_duplicate_key_collapse
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
axiom_check=$(mktemp "./.axioms.XXXXXX.lean")
corpus_tmp=$(mktemp "./.corpus.XXXXXX.ndjson")
corpus_witnesses_tmp=$(mktemp "./.corpus-witnesses.XXXXXX")
corpus_mutation_tmp=$(mktemp "./.corpus-mutation.XXXXXX.ndjson")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$axiom_check" "$corpus_tmp" "$corpus_witnesses_tmp" "$corpus_mutation_tmp"' EXIT

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
check_control drop-floor-guard
check_control drop-meet-clamping

mapfile -t committed_controls < <(find negative-controls -type f -name '*.cex.txt' -print | LC_ALL=C sort)
mapfile -t exercised_sorted < <(printf '%s\n' "${exercised_controls[@]}" | LC_ALL=C sort)
if [[ "${committed_controls[*]}" != "${exercised_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed negative-control trace is orphaned" >&2
  exit 1
fi

fixture="../../packages/plait/fixtures/fabric-conformance.ndjson"
lake exe emitter > "$corpus_tmp"
sed -nE 's/.*"kind":"([^"]+)".*"witness":"Fabric\.([^"]+)".*/\1 \2/p' \
  "$corpus_tmp" > "$corpus_witnesses_tmp"
expected_vector_witnesses=(
  'F1 emitter_f1_cell_merge_aci'
  'F2 emitter_f2_duplication'
  'F2 emitter_f2_permutation'
  'F2b emitter_f2b_stale_replay'
  'F2b emitter_f2b_duplication'
  'F2b emitter_f2b_reordering'
  'F3 emitter_f3_resume'
  'F4 emitter_f4_partition'
  'alphabet-refusal emitter_intruder_refused'
  'F9 emitter_f9_clamp'
  'F9 emitter_f9_tree'
)
if [[ "$(wc -l < "$corpus_witnesses_tmp" | tr -d ' ')" -ne 11 ]] ||
    ! diff -u <(printf '%s\n' "${expected_vector_witnesses[@]}" | LC_ALL=C sort) \
      <(LC_ALL=C sort "$corpus_witnesses_tmp"); then
  echo "GATE: FAIL — every emitted vector must name its exact theorem instance" >&2
  exit 1
fi
while read -r _kind witness; do
  if ! grep -qx "$witness" "$roster_tmp"; then
    echo "GATE: FAIL — vector witness Fabric.$witness is absent from the theorem roster" >&2
    exit 1
  fi
done < "$corpus_witnesses_tmp"

line_digest() {
  local present="$1"
  local line="$2"
  if [[ "$present" -eq 0 ]]; then
    printf '<missing>'
  else
    printf '%s' "$line" | sha256sum | awk '{print $1}'
  fi
}

report_first_corpus_divergence() {
  local expected="$1"
  local got="$2"
  local index=0
  local expected_line got_line expected_present got_present kind
  local expected_digest got_digest
  exec 3<"$expected"
  exec 4<"$got"
  while true; do
    expected_line=''
    got_line=''
    if IFS= read -r expected_line <&3 || [[ -n "$expected_line" ]]; then
      expected_present=1
    else
      expected_present=0
    fi
    if IFS= read -r got_line <&4 || [[ -n "$got_line" ]]; then
      got_present=1
    else
      got_present=0
    fi
    if [[ "$expected_present" -eq 0 && "$got_present" -eq 0 ]]; then
      break
    fi
    if [[ "$expected_present" -ne "$got_present" || "$expected_line" != "$got_line" ]]; then
      if [[ "$index" -eq 0 ]]; then
        kind='header'
      else
        kind=$(printf '%s\n%s\n' "$expected_line" "$got_line" |
          sed -nE 's/.*"kind":"([^"]+)".*/\1/p' | head -n 1)
        kind=${kind:-unknown}
      fi
      expected_digest=$(line_digest "$expected_present" "$expected_line")
      got_digest=$(line_digest "$got_present" "$got_line")
      echo "FINDING: corpus regeneration diverged at row index=$index kind=$kind expected_digest=$expected_digest got_digest=$got_digest" >&2
      return 0
    fi
    index=$((index + 1))
  done
  echo "FINDING: corpus regeneration differs but no divergent row was decoded" >&2
}

check_corpus_regeneration() {
  local expected="$1"
  local got="$2"
  if cmp -s "$expected" "$got"; then
    return 0
  fi
  report_first_corpus_divergence "$expected" "$got"
  echo "GATE: FAIL — corpus is not a fresh regeneration; run: lake exe emitter > $fixture" >&2
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
        mutated = sub(/"matchesExact":true/, "\"matchesExact\":false")
      }
      { print }
      END { if (!mutated) exit 42 }
    ' "$fixture" > "$corpus_mutation_tmp"; then
    echo "GATE: FAIL — --self-test could not plant the corpus mutation" >&2
    exit 1
  fi
  if self_test_output=$(check_corpus_regeneration "$corpus_mutation_tmp" "$corpus_tmp" 2>&1); then
    echo "GATE: FAIL — --self-test accepted the planted corpus mutation" >&2
    exit 1
  fi
  if ! grep -Eq 'FINDING:.*index=2 kind=F2 expected_digest=[0-9a-f]{64} got_digest=[0-9a-f]{64}' \
      <<< "$self_test_output"; then
    printf '%s\n' "$self_test_output" >&2
    echo "GATE: FAIL — --self-test refusal omitted the divergent row evidence" >&2
    exit 1
  fi
  echo "GATE: PASS (--self-test planted and refused corpus row index=2 kind=F2)"
fi

echo "GATE: PASS (4 law-dropping controls; 11 canonical model vectors; byte-identical regeneration)"
