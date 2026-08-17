#!/usr/bin/env bash
# RQ-7 reference reproduction. Own-authored; not a foldlab gate.
#
# Demonstrates the per-run-certificate architecture using only Lean 4
# core (which bundles CaDiCaL and a Lean-verified LRAT checker):
#
#   1. inspect the verified checker's soundness theorem and the axiom a
#      certificate-backed proof adds;
#   2. emit a certificate for a hard goal, and measure it;
#   3. re-check the honest certificate  -> exit 0;
#   4. re-check three tampered variants -> exit nonzero, three distinct
#      refusals.
#
# Requires: elan/lake with Lean 4.33.0 on PATH. No network, no packages.
# Run from anywhere; paths are resolved relative to this script.

set -u
cd "$(dirname "$0")"
here="$(pwd)"

hr() { printf '\n===== %s =====\n' "$1"; }
ms() { date +%s%N; }

run() { # run <label> <file>; prints output and exit code
  local label="$1" file="$2" s e rc
  s=$(ms); lean "$here/$file" 2>&1; rc=$?; e=$(ms)
  printf '[%s] exit=%d wall=%dms\n' "$label" "$rc" "$(( (e-s)/1000000 ))"
  return 0
}

hr "toolchain"
lean --version
elan --version

hr "1. the verified checker, its soundness theorem, and the axiom delta"
run inspect Inspect.lean

hr "2. emit a certificate (external solver runs here)"
rm -f -- *.lrat
run emit Emit.lean
emitted=$(ls -1 Emit.lean-*.lrat 2>/dev/null | head -1)
if [ -z "${emitted}" ]; then
  echo "no certificate emitted; aborting" >&2
  exit 1
fi
mv "$emitted" good.lrat
printf 'certificate bytes: %s\n' "$(wc -c < good.lrat)"

hr "3. tamper the copies"
# one byte overwritten at offset 65000
cp good.lrat flip.lrat
printf '\000' | dd of=flip.lrat bs=1 seek=65000 count=1 conv=notrunc status=none
# truncated to half
head -c $(( $(wc -c < good.lrat) / 2 )) good.lrat > trunc.lrat
ls -l good.lrat flip.lrat trunc.lrat

hr "4a. honest certificate — expect exit 0"
run good CheckGood.lean

hr "4b. one byte flipped — expect nonzero"
run flipped CheckFlipped.lean

hr "4c. truncated — expect nonzero"
run truncated CheckTruncated.lean

hr "4d. genuine certificate, different (true) claim — expect nonzero"
run wrong-goal CheckWrongGoal.lean

hr "cleanup"
rm -f -- *.lrat
echo "certificates removed; committed tree is source only"
