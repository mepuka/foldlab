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
    ControlMain.lean EmitMain.lean ConformanceCheck.lean \
    Unity/Definitions.lean Unity/Laws.lean Unity/Proofs.lean \
    Unity/Canon.lean Unity/Program.lean Unity/Shape.lean \
    Unity/Reflect.lean Unity/Emit.lean \
    Unity/Check.lean Unity/Dsl.lean citations.txt; do
  if [[ ! -f "$required" ]]; then
    echo "GATE: FAIL — package roster is missing $required" >&2
    exit 1
  fi
done

# Every module of the package is in the library's globs: a module that
# builds only because something else happens to import it is a module
# the gate does not really cover.
for module in Unity Unity.Canon Unity.Program Unity.Shape Unity.Reflect \
    Unity.Emit Unity.Check Unity.Dsl; do
  if ! grep -q "\"$module\"," lakefile.toml; then
    echo "GATE: FAIL — $module is not in the library globs" >&2
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
lean_sources+=(Unity.lean ControlMain.lean EmitMain.lean ConformanceCheck.lean)

# Kernel-bound source hygiene, at the kernel's own word list.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    "${lean_sources[@]}"; then
  echo "GATE: FAIL — forbidden kernel escape in Lean source" >&2
  exit 1
fi
echo "GATE: PASS (bridge source hygiene over ${#lean_sources[@]} files)"

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
  UProgramEncodingRoundTrips UProgramEdgesAreErasedUses
  UProgramAdmissibleSound UProgramVectorsAdmitted
  UProgramVectorsEdgeConsistent UGroundLiftErasesToPlanted
  UHoleyFillCorrespondence
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

# The corpus's prose is read out of the kernel's docstrings, never
# retyped: no docstring row may be spelled in this package's source.
if grep -n 'A lane partition: the venue-local shard' "${lean_sources[@]}"; then
  echo "GATE: FAIL — a kernel docstring was transcribed into the bridge" >&2
  exit 1
fi
if ! grep -q 'findDocString?' Unity/Reflect.lean; then
  echo "GATE: FAIL — the docstring rows stopped being read from the environment" >&2
  exit 1
fi
echo "GATE: PASS (docstrings read from the environment, not transcribed)"

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
  dsl_clock_fold dsl_absence_trigger dsl_unfenced_decide
  dsl_last_writer_join dsl_trusting_read dsl_cross_register_decide
  dsl_minted_declare dsl_latest_read dsl_forward_declare
  dsl_secret_emit dsl_absence_claim_trigger dsl_past_mutation
  dsl_off_writ_declare dsl_function_declare dsl_anchored_resolve
  dsl_holey_emit dsl_lawful_declare dsl_spells_every_generator
  dsl_spells_every_argument dsl_spells_every_predicate
  dsl_spells_every_kind
  kind_name_round_trip generator_name_round_trip arg_round_trip
  named_args_round_trip args_round_trip node_round_trip
  nodes_round_trip edge_round_trip edges_round_trip hole_round_trip
  holes_round_trip lineage_round_trip program_encoding_round_trips
  program_edges_are_erased_uses admissible_sound
  program_vectors_admitted program_vectors_edge_consistent
  ground_lift_erases_to_planted holey_fill_correspondence
)

roster_tmp=$(mktemp "./.roster.XXXXXX")
discovered_tmp=$(mktemp "./.discovered.XXXXXX")
footprint_check=$(mktemp "./.footprint.XXXXXX.lean")
probe_check=$(mktemp "./.footprint.XXXXXX.lean")
corpus_first=$(mktemp "./.corpus.XXXXXX.ndjson")
corpus_second=$(mktemp "./.corpus.XXXXXX.ndjson")
corpus_mutant=$(mktemp "./.corpus.XXXXXX.ndjson")
trap 'rm -f "$roster_tmp" "$discovered_tmp" "$footprint_check" "$probe_check" "$corpus_first" "$corpus_second" "$corpus_mutant"' EXIT

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

# The kernel conformance corpus, format 2. Every row is computed: by
# running the kernel model's own definitions, by reading the Lean
# environment at elaboration time, or by running this package's own
# canonicalizer. A moved rank, a reworded taught repair, a changed door
# verdict, a renamed field, a reworded docstring or a changed byte form
# moves these bytes. The emitter refuses its own document if a vector
# fails to decode back to its framing, if a line fails the both-ways
# law, if the header's counts disagree with the records rendered, if
# the record groups interleave, or if the planted set stops refusing
# seventeen, stops admitting exactly its two-name roster, stops writing
# the refused rows as a prefix, or if the model-internal group stops
# stating the one ruled fact it exists to state.
fixture="../../packages/plait/fixtures/kernel-conformance.ndjson"
if [[ ! -f "$fixture" ]]; then
  echo "GATE: FAIL — the committed kernel conformance corpus is missing" >&2
  exit 1
fi
if ! lake exe emit > "$corpus_first"; then
  echo "GATE: FAIL — the emitter refused its own document" >&2
  exit 1
fi
if ! lake exe emit > "$corpus_second"; then
  echo "GATE: FAIL — the emitter refused its own document on the second run" >&2
  exit 1
fi
if ! cmp -s "$corpus_first" "$corpus_second"; then
  echo "GATE: FAIL — emission is not deterministic across two runs" >&2
  exit 1
fi
if ! diff -u "$fixture" "$corpus_first"; then
  echo "GATE: FAIL — the committed corpus is not a fresh regeneration" >&2
  echo "FINDING: intended model change — regenerate and commit the corpus IN THE SAME COMMIT as the change" >&2
  echo "FINDING: unintended change — report the finding and STOP; never edit the fixture to agree" >&2
  exit 1
fi

# The frozen interchange: the header at its canonical byte form (so the
# key order is pinned along with the values), the record counts, and
# printable ASCII on every line, which also refuses a carriage return.
expected_header='{"counts":{"admission":19,"canon":10,"doc":22,"encoding":12,"kind":12,"model-admission":2,"program":4,"refusal":16,"stage":5,"type":22},"format":2,"generator":"verify/unity emit","record":"header","source":"verify/kernel"}'
if [[ "$(head -n 1 "$fixture")" != "$expected_header" ]] ||
    [[ "$(wc -l < "$fixture" | tr -d ' ')" -ne 125 ]] ||
    [[ "$(grep -c '"record":"kind"' "$fixture")" -ne 12 ]] ||
    [[ "$(grep -c '"record":"stage"' "$fixture")" -ne 5 ]] ||
    [[ "$(grep -c '"record":"refusal"' "$fixture")" -ne 16 ]] ||
    [[ "$(grep -c '"record":"type"' "$fixture")" -ne 22 ]] ||
    [[ "$(grep -c '"record":"encoding"' "$fixture")" -ne 12 ]] ||
    [[ "$(grep -c '"record":"admission"' "$fixture")" -ne 19 ]] ||
    [[ "$(grep -c '"record":"model-admission"' "$fixture")" -ne 2 ]] ||
    [[ "$(grep -c '"scope":"model-internal"' "$fixture")" -ne 2 ]] ||
    [[ "$(grep -c '"record":"doc"' "$fixture")" -ne 22 ]] ||
    [[ "$(grep -c '"record":"canon"' "$fixture")" -ne 10 ]] ||
    [[ "$(grep -c '"record":"program"' "$fixture")" -ne 4 ]] ||
    [[ "$(grep -c '"verdict":"refused"' "$fixture")" -ne 17 ]] ||
    [[ "$(grep -c '"verdict":"admitted"' "$fixture")" -ne 4 ]]; then
  echo "GATE: FAIL — corpus header or record counts moved" >&2
  exit 1
fi
if LC_ALL=C grep -n '[^ -~]' "$fixture"; then
  echo "GATE: FAIL — corpus left printable ASCII (a carriage return counts)" >&2
  exit 1
fi

# Format 2 deliberately leaves the double-safe integer range: the
# freeze's one deviation from RFC 8785 is that numbers are unbounded
# non-negative integers, so the corpus carries a witness past two to the
# fifty-third and every consumer must read it exactly. Format 1's
# safe-integer ceiling is retired here on purpose; the numeral grammar
# — no minus, no fraction, no exponent, no leading zero — is enforced by
# the reader over every line in the conformance check below, which is a
# stronger statement than a shell regexp over quoted text could make.
if [[ "$(grep -c '"value":9007199254740993' "$fixture")" -ne 1 ]]; then
  echo "GATE: FAIL — the corpus lost its past-the-safe-range integer witness" >&2
  exit 1
fi
echo "GATE: PASS (125-record format-2 corpus regenerates byte-identically; header, counts, ASCII and the unbounded-integer witness pinned)"

# The conformance check: the both-ways law over every committed line,
# the header and group sequence, and every record whose truth lives in
# the Lean environment — the mini-AST of the sort system, the kind and
# stage tables, the refusal order, the docstrings, the admission names —
# rebuilt from `getConstInfo` and `findDocString?` and compared with the
# committed bytes.
conformance_arms=(
  "conformance: 125 lines survive read and rewrite byte-identically"
  "conformance: the header declares 10 groups and every count matches the records present"
  "conformance: 2 model-internal rows name real candidates and carry their scope marking"
  "conformance: the kind, stage, refusal and admission tables agree with the environment"
  "conformance: 22 mini-AST rows agree with the environment"
  "conformance: 22 docstring rows agree with the environment"
  "conformance: 10 canon vectors re-canonicalize to their own bytes"
  "conformance: 4 program vectors state their own graph, erase to admitted programs, and re-canonicalize to their own bytes"
)
if conformance_output=$(lake env lean ConformanceCheck.lean 2>&1); then
  printf '%s\n' "$conformance_output"
else
  printf '%s\n' "$conformance_output" >&2
  echo "GATE: FAIL — the committed corpus disagrees with the Lean environment" >&2
  exit 1
fi
for arm in "${conformance_arms[@]}"; do
  if ! grep -qF "$arm" <<< "$conformance_output"; then
    echo "GATE: FAIL — the conformance check did not report: $arm" >&2
    exit 1
  fi
done
echo "GATE: PASS (${#conformance_arms[@]} conformance arms reported; corpus agrees with the environment)"

# Falsification: a checker that cannot fail proves nothing. Each probe
# mutates a copy of the committed corpus at one byte range and demands
# the checker refuse it FOR ITS OWN NAMED REASON — an arm that started
# passing vacuously would show up as a probe refused for the wrong
# reason rather than as silence.
declare -a exercised_probes=()
check_falsification() {
  local name="$1"
  local expression="$2"
  local reason="$3"
  local probe_output
  sed "$expression" "$fixture" > "$corpus_mutant"
  if cmp -s "$fixture" "$corpus_mutant"; then
    echo "GATE: FAIL — falsification probe $name did not change the corpus" >&2
    exit 1
  fi
  {
    echo 'import Unity.Check'
    printf '#kernelConformance "%s"\n' "$corpus_mutant"
  } > "$probe_check"
  if probe_output=$(lake env lean "$probe_check" 2>&1); then
    printf '%s\n' "$probe_output" >&2
    echo "GATE: FAIL — falsification probe $name was accepted by the checker" >&2
    exit 1
  fi
  if ! grep -qF "$reason" <<< "$probe_output"; then
    printf '%s\n' "$probe_output" >&2
    echo "GATE: FAIL — falsification probe $name failed for the wrong reason" >&2
    exit 1
  fi
  exercised_probes+=("$name")
  echo "GATE: PASS ($name refused: $reason)"
}

check_falsification non-canonical-member-order \
  's/{"name":"schema","rank":0,"record":"kind"}/{"rank":0,"name":"schema","record":"kind"}/' \
  'does not survive read and write'
check_falsification rounded-canon-bytes \
  's/"bytes":"9007199254740993"/"bytes":"9007199254740992"/' \
  "canon vector big-integer carries bytes that are not its value's canonical form"
check_falsification stale-docstring \
  's/A lane partition: the venue-local shard/A lane partition: the venue-wide shard/' \
  'docstring row disagrees with the environment'
check_falsification undercounted-header \
  's/"stage":5,/"stage":4,/' \
  'the header declares 4 stage records; the corpus carries 5'

# The program group's own three arms, each aimed at a different way a
# declaration can be wrong while still looking well formed. The first
# drops one edge while leaving the argument that implies it, so the
# redundant edge list stops agreeing with the graph its own arguments
# describe -- which is the whole reason the edge list is checked
# rather than trusted. The second moves a byte inside a `bytes` field
# only, leaving the declaration untouched, so the record's self-test
# is the only thing that can catch it. The third repoints a
# consumption at a node that does not exist AND repairs the edge and
# the bytes to match, so the graph is self-consistent and the bytes
# are canonical: the only arm left standing is the kernel's own
# admission verdict on the erasure, which is what makes this group a
# claim about the model rather than about JSON.
check_falsification dropped-program-edge \
  's/{"from":3,"to":2},//' \
  'carries edges that are not the consumptions its arguments imply'
check_falsification stale-program-bytes \
  's/\\"lineage\\":\[9\]/\\"lineage\\":[8]/' \
  "carries bytes that are not its declaration's canonical form"
check_falsification unresolvable-consumption \
  's/\\"to\\":1}/\\"to\\":9}/; s/{\\"arg\\":\\"local\\",\\"name\\":1}}/{\\"arg\\":\\"local\\",\\"name\\":9}}/; s/"to":1}/"to":9}/; s/{"arg":"local","name":1}}/{"arg":"local","name":9}}/' \
  'erases to a program node admission refuses'

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
check_must_not_compile wrong-shape

mapfile -t committed_refusals < <(find must-not-compile -type f -name '*.lean' ! -name '*.witness.lean' -print | LC_ALL=C sort)
mapfile -t exercised_refusals_sorted < <(printf '%s\n' "${exercised_refusals[@]}" | LC_ALL=C sort)
if [[ "${committed_refusals[*]}" != "${exercised_refusals_sorted[*]}" ]]; then
  echo "GATE: FAIL — a committed must-not-compile control is orphaned" >&2
  exit 1
fi

echo "GATE: PASS (3 translation controls; ${#exercised_probes[@]} corpus falsification probes; 2 must-not-compile refusals; roster ${#roster[@]}; 125-record format-2 kernel conformance corpus)"
