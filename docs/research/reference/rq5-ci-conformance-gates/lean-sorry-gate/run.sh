#!/usr/bin/env bash
# Own-authored reproduction: what a Lean "the proofs build" gate does and
# does not catch. Prints its own transcript; see TRANSCRIPT.md for the
# recorded run. Deliberately does NOT exit nonzero — this script is
# evidence, not a gate.
set -uo pipefail
cd "$(dirname "$0")"

echo "== toolchain"
lean --version
lake --version

echo
echo "== (1) lake build — a sorry is a WARNING"
lake build
echo "lake build exit code: $?"

echo
echo "== (2) source grep for the bare word sorry/admit"
grep -rnE "(^|[^A-Za-z0-9_'])(sorry|admit)($|[^A-Za-z0-9_'])" SorryLab SorryLab.lean \
  || echo "(grep found nothing)"

echo
echo "== (3) axiom footprint"
lake env lean axioms.lean
echo "lake env lean exit code: $?"
