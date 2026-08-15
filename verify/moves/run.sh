#!/usr/bin/env bash
# verify/moves/run.sh — the gate for the move-calculus model: every Lean
# theorem checks (no sorry, core only). Lean 4.33.0 via elan, matching
# the lean-toolchain pin.
set -uo pipefail
cd "$(dirname "$0")"
if ! command -v lake >/dev/null 2>&1; then
  echo "FAIL: lake not found. Install elan (e.g. 'scoop install elan')." >&2
  exit 2
fi

# ---- Frozen-spec pin: Spec.lean changes require a Rev re-pin ----
expected_spec_sha256="36c3203e3e6edbcc15f7561ab91d1e2d0b03cf40bf6e23a8f9c58e47be2b5b43"
actual_spec_sha256=$(sha256sum Moves/Spec.lean | cut -d ' ' -f 1)
if [[ "$actual_spec_sha256" != "$expected_spec_sha256" ]]; then
  echo "GATE: FAIL — Spec.lean is frozen; changes require a Rev re-pin" >&2
  exit 1
fi

# ---- Word-boundary greps: `exact sorry`, mid-line `admit`, and
# `private axiom` all match. The bare words may not appear anywhere in
# the sources, comments included, so evasion by phrasing is impossible.
if grep -rnE "(^|[^A-Za-z0-9_'])(sorry|admit)($|[^A-Za-z0-9_'])" Moves Moves.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources mention sorry/admit" >&2
  exit 1
fi
if grep -rnE "(^|[^A-Za-z0-9_'])axiom($|[^A-Za-z0-9_'])" Moves Moves.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources mention an axiom declaration" >&2
  exit 1
fi

if lake build; then
  echo "GATE: build passed"
else
  echo "GATE: FAIL"; exit 1
fi

# ---- Axiom footprint over the rostered results. A compiled evaluator can
# add theorem axioms without declaring `axiom` in source, so the source
# grep alone is insufficient. Keep this roster aligned with README.md.
roster=(
  fill_comm fill_conflict_refused stepK_agrees stepK_refused
  repairK_agrees repairK_refused conflict_surfaces step_preserves_wf
  runRepairK_preserves_wf no_loss clash_repair_confluence
  fence_deterministic min_fence_deterministic plurality_fence_deterministic
  decided_stable single_seat_stable no_fair_resolute_fence
  clobber_diverges lww_converges lww_loses filled_unstable
  fence_manipulable runRepairK_perm runRepairK_fill_pair
  spec_no_loss_strong spec_meaning_confluent spec_evidence_confluent
  spec_fence_schedule_free spec_refusal_iff spec_alignment
  spec_repairK_iff_admitted spec_runRepairK_preserves_wf
  spec_decided_stable_total spec_mutant_legacy_killed_by_L1
  spec_mutant_legacy_killed_by_L2 spec_mutant_refuseAll_killed
  spec_witness_three_fill spec_witness_confirm_recorded spec_discharged
)

axiom_check=$(mktemp "./.axiom-check.XXXXXX.lean") || {
  echo "GATE: FAIL — could not create axiom-footprint check" >&2
  exit 1
}
trap 'rm -f "$axiom_check"' EXIT
{
  echo "import Moves"
  for name in "${roster[@]}"; do
    echo "#print axioms Moves.$name"
  done
} > "$axiom_check"

if ! axiom_output=$(lake env lean "$axiom_check" 2>&1); then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — axiom-footprint check did not elaborate" >&2
  exit 1
fi

report_count=$(printf '%s\n' "$axiom_output" | grep -c "^'Moves\.")
if [[ "$report_count" -ne "${#roster[@]}" ]]; then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — expected ${#roster[@]} axiom reports, got $report_count" >&2
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
  printf 'GATE: FAIL — unexpected theorem axioms:\n%s\n' "$unexpected_axioms" >&2
  exit 1
fi

# ---- Orphan rule: every public theorem in the sources is rostered above
# or listed with a reason in gate-exclusions.txt. A theorem the gate has
# never heard of is a hole, not a freebie.
declare -A covered
for name in "${roster[@]}"; do covered["$name"]=1; done
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  covered["${line%% *}"]=1
done < gate-exclusions.txt

orphans=""
while IFS= read -r name; do
  if [[ -z "${covered[$name]:-}" ]]; then
    orphans+="$name"$'\n'
  fi
done < <(grep -rhoE "^theorem [A-Za-z0-9_']+" Moves Moves.lean | awk '{print $2}' | sort -u)
if [[ -n "$orphans" ]]; then
  printf 'GATE: FAIL — public theorems neither rostered nor excluded:\n%s' "$orphans" >&2
  exit 1
fi

echo "GATE: PASS (move-calculus proofs, axiom footprint, spec pin, orphan rule)"
