#!/usr/bin/env bash
# verify/ir/run.sh — the gate for the IR ground-truth model: every Lean
# theorem checks (no sorry, core only). Lean 4.33.0 via elan, matching
# the lean-toolchain pin.
set -uo pipefail
cd "$(dirname "$0")"
if ! command -v lake >/dev/null 2>&1; then
  echo "FAIL: lake not found. Install elan (e.g. 'scoop install elan')." >&2
  exit 2
fi
if grep -rnE '(:=|by|<;>|;|\|)[[:space:]]*(sorry|admit)\b|^[[:space:]]*(sorry|admit)[[:space:]]*$|^[[:space:]]*axiom[[:space:]]' IR IR.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources contain a sorry/admit tactic or an axiom decl (a warning, not a build error)"; exit 1
fi
if lake build; then
  echo "GATE: PASS (IR model proofs check)"
else
  echo "GATE: FAIL"; exit 1
fi
