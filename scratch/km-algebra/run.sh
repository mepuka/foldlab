#!/usr/bin/env bash
# EXEMPLAR ONLY — not a gate, wired into nothing.
#
# Three arms:
#   1. The exemplar type-checks under the pinned tsgo.
#   2. It type-checks under tsc as referee.
#   3. The MUTATION arm: weaken `join` from the bounded-semilattice rung to
#      the commutative-monoid rung and the count-cell control stops failing,
#      which tsc reports as an unused @ts-expect-error directive. Without
#      this arm a green run could mean the rung constraint is doing nothing.
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
src="$here/rung-brands.ts"
mut="$here/.mutant.ts"
tsc="$root/node_modules/.bin/tsc"
tsgo="$root/node_modules/.bin/tsgo"
flags=(--strict --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck)

fail=0

echo "== arm 1: tsgo $("$tsgo" --version | tr -d '\r') =="
if "$tsgo" --ignoreConfig "${flags[@]}" "$src"; then
  echo "PASS  exemplar type-checks; every must-not-compile control failed to compile"
else
  echo "FAIL  exemplar did not type-check"; fail=1
fi

echo
echo "== arm 2: tsc $("$tsc" --version | tr -d '\r') =="
if "$tsc" "${flags[@]}" "$src"; then
  echo "PASS  referee agrees"
else
  echo "FAIL  referee disagrees"; fail=1
fi

echo
echo "== arm 3: mutation — join weakened to the commutative-monoid rung =="
sed 's/cell: Cell<State, BoundedSemilattice>,/cell: Cell<State, CommutativeMonoid>,/' "$src" > "$mut"
out="$("$tsc" "${flags[@]}" "$mut" 2>&1)"
if printf '%s\n' "$out" | grep -q "TS2578"; then
  echo "PASS  mutation caught — the weakened rung leaves controls unused:"
  printf '%s\n' "$out" | sed 's#.*\.mutant\.ts#  .mutant.ts#'
else
  echo "FAIL  mutation NOT caught; the rung constraint is not load-bearing"
  printf '%s\n' "$out"
  fail=1
fi
rm -f "$mut"

echo
if [ "$fail" -eq 0 ]; then echo "ALL ARMS PASS"; else echo "FAILURES PRESENT"; fi
exit "$fail"
