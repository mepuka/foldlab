#!/usr/bin/env bash
# EXEMPLAR ONLY — not a gate, wired into nothing, discovered by nothing.
#
# One declared term through the whole meta-language pipeline, and then the two
# arms that stop a green run from meaning nothing:
#
#   1. emit      — the denotation's canonical bytes and the fluent TS surface.
#   2. project   — the sibling projections: the MCP tool entry and both registers.
#   3. wall      — preimage, parity, the §6.3 oracle, and the runtime anchor.
#   4. surface   — the emitted TS type-checks alone under the pinned tsgo, with
#                  tsc as referee, so every @ts-expect-error control FAILED to
#                  compile.
#   5. sources   — the exemplar's own four files type-check under the estate's
#                  base config.
#   6. mutation  — one shared field is perturbed in ONE projection and the wall
#                  must go red on exactly that field. Without this arm a green
#                  wall could mean the extractors compare nothing.
#   7. mutation  — the emitted signature's rung is weakened one step and a
#                  must-not-compile control must stop failing (TS2578). Without
#                  this arm the rung brand could be decorative.
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
tsc="$root/node_modules/.bin/tsc"
tsgo="$root/node_modules/.bin/tsgo"
flags=(--strict --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck)

fail=0
rm -rf "$here/.mutant" "$here/.mutant-surface.ts"

echo "== arm 1: emit =="
if bun "$here/emit.ts"; then echo "PASS  denotation and surface emitted"
else echo "FAIL  emit"; fail=1; fi

echo
echo "== arm 2: project =="
if bun "$here/project.ts"; then echo "PASS  sibling projections emitted"
else echo "FAIL  project"; fail=1; fi

echo
echo "== arm 3: wall =="
if ! bun "$here/wall.ts"; then echo "FAIL  wall"; fail=1; fi

echo
echo "== arm 4: the emitted surface, tsgo $("$tsgo" --version | tr -d '\r') then tsc as referee =="
if "$tsgo" --ignoreConfig "${flags[@]}" "$here/generated/joinAll.generated.ts" &&
  "$tsc" "${flags[@]}" "$here/generated/joinAll.generated.ts"; then
  echo "PASS  emitted surface type-checks; every must-not-compile control failed to compile"
else
  echo "FAIL  emitted surface did not type-check under both compilers"; fail=1
fi

echo
echo "== arm 5: the exemplar's own sources under the estate's base config =="
if "$tsgo" -p "$here/tsconfig.json" --noEmit; then echo "PASS  term/emit/project/wall type-check"
else echo "FAIL  exemplar sources did not type-check"; fail=1; fi

echo
echo "== arm 6: mutation — one donor mangled in the tool projection alone =="
mkdir -p "$here/.mutant"
cp "$here/generated/denotation.json" "$here/generated/joinAll.generated.ts" \
  "$here/generated/registers.md" "$here/.mutant/"
sed 's/f1_history_convergence; rung/f1_history_convergenc; rung/' \
  "$here/generated/tool.json" > "$here/.mutant/tool.json"
out="$(bun "$here/wall.ts" .mutant 2>&1)"
if [ $? -eq 0 ]; then
  echo "FAIL  mutation NOT caught; the parity extractors are not load-bearing"
  printf '%s\n' "$out"
  fail=1
elif printf '%s\n' "$out" | grep -q "FAIL  donors      DIFFERS in 1/3"; then
  echo "PASS  mutation caught on exactly the mutated field:"
  printf '%s\n' "$out" | grep -A 2 "donors      DIFFERS" | sed 's/^/  /'
else
  echo "FAIL  wall went red, but not on donors — the extractors are coupled"
  printf '%s\n' "$out"
  fail=1
fi

echo
echo "== arm 7: mutation — join weakened to the commutative-monoid rung =="
sed 's/cell: Cell<State, BoundedSemilattice>,/cell: Cell<State, CommutativeMonoid>,/' \
  "$here/generated/joinAll.generated.ts" > "$here/.mutant-surface.ts"
out="$("$tsc" "${flags[@]}" "$here/.mutant-surface.ts" 2>&1)"
if printf '%s\n' "$out" | grep -q "TS2578"; then
  echo "PASS  mutation caught — the weakened rung leaves a control unused:"
  printf '%s\n' "$out" | sed 's#.*\.mutant-surface\.ts#  .mutant-surface.ts#'
else
  echo "FAIL  mutation NOT caught; the rung brand is not load-bearing"
  printf '%s\n' "$out"
  fail=1
fi

rm -rf "$here/.mutant" "$here/.mutant-surface.ts"

echo
if [ "$fail" -eq 0 ]; then echo "ALL ARMS PASS"; else echo "FAILURES PRESENT"; fi
exit "$fail"
