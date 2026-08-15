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
if grep -rnE '(:=|by|<;>|;|\|)[[:space:]]*(sorry|admit)\b|^[[:space:]]*(sorry|admit)[[:space:]]*$|^[[:space:]]*axiom[[:space:]]' Moves Moves.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources contain a sorry/admit tactic or an axiom decl (a warning, not a build error)"; exit 1
fi
if lake build; then
  echo "GATE: build passed"
else
  echo "GATE: FAIL"; exit 1
fi

# A compiled evaluator can add theorem axioms without declaring an `axiom` in
# source, so the source grep alone is insufficient. Keep this list aligned with
# the headline laws and negative controls documented in README.md.
axiom_check=$(mktemp "./.axiom-check.XXXXXX.lean") || {
  echo "GATE: FAIL — could not create axiom-footprint check" >&2
  exit 1
}
trap 'rm -f "$axiom_check"' EXIT
cat >"$axiom_check" <<'LEAN'
import Moves

#print axioms Moves.fill_comm
#print axioms Moves.fill_conflict_refused
#print axioms Moves.conflict_surfaces
#print axioms Moves.step_preserves_wf
#print axioms Moves.no_loss
#print axioms Moves.clash_repair_confluence
#print axioms Moves.fence_deterministic
#print axioms Moves.min_fence_deterministic
#print axioms Moves.plurality_fence_deterministic
#print axioms Moves.decided_stable
#print axioms Moves.single_seat_stable
#print axioms Moves.no_fair_resolute_fence
#print axioms Moves.clobber_diverges
#print axioms Moves.lww_converges
#print axioms Moves.lww_loses
#print axioms Moves.filled_unstable
#print axioms Moves.fence_manipulable
LEAN

if ! axiom_output=$(lake env lean "$axiom_check" 2>&1); then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — axiom-footprint check did not elaborate" >&2
  exit 1
fi

report_count=$(printf '%s\n' "$axiom_output" | grep -c "^'Moves\.")
if [[ "$report_count" -ne 17 ]]; then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — expected 17 axiom reports, got $report_count" >&2
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

echo "GATE: PASS (move-calculus proofs and axiom footprint check)"
