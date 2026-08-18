#!/usr/bin/env bash
# EXEMPLAR ONLY — not a gate, wired into nothing, discovered by nothing.
#
# One declared term through the whole meta-language pipeline, and then the arms
# that stop a green run from meaning nothing:
#
#   0. pinned     — the Effect the wall decodes with IS the catalog pin, checked
#                   rather than claimed, because `effect.ts` reaches it by path.
#   1. emit       — the denotation's canonical bytes and the fluent TS surface.
#   2. project    — the sibling projections: the MCP tool entry and both registers.
#   3. wall       — preimage, parity, the §6.3 oracle, the runtime anchor, the
#                   served schema re-derived, and served-equals-derived by
#                   re-executing the emitters.
#   4. surface    — the emitted TS type-checks alone under the pinned tsgo, with
#                   tsc as referee, so every @ts-expect-error control FAILED to
#                   compile.
#   5. sources    — the exemplar's own files type-check under the estate's base
#                   config.
#   6. mutation   — one shared field is perturbed in ONE projection and the wall
#                   must go red on exactly that field.
#   7. mutation   — the emitted signature's rung is weakened one step and a
#                   must-not-compile control must stop failing (TS2578).
#   8. mutation   — the served `required` list is perturbed; check 5 must catch it.
#   9. mutation   — the served `items.type` is perturbed; check 5 must catch it.
#  10. evidence   — the block quoted in README.md IS this run's output, compared
#                   rather than pasted. `--write` updates it.
#
# Arms 8 and 9 exist because the round-1 wall never looked at the served schema:
# both mutations left every arm green (PR #101 review, Standards blocker).
#
# Usage: bash scratch/km-expressibility/run.sh [--write]
set -u
set -o pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
tsc="$root/node_modules/.bin/tsc"
tsgo="$root/node_modules/.bin/tsgo"
# `--ignoreConfig` on BOTH compilers: typescript@7 refuses files on the command
# line beside a tsconfig.json (TS5112). Round 1 passed the flag to tsgo only,
# which was invisible while `tsc` was still 5.9.3 and broke both compiler arms
# the moment main bumped it.
flags=(--ignoreConfig --strict --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck)

evidence="$here/.evidence"
write=0
[ "${1:-}" = "--write" ] && write=1

fail=0
rm -rf "$here/.mutant" "$here/.mutant-surface.ts" "$here/.rederived" "$evidence"
touch "$evidence"

# -- arm 0 --------------------------------------------------------------------

echo "== arm 0: the pinned Effect the wall decodes with =="
# `cd` first and require relative: `$root` is a Git Bash path on Windows, which
# node cannot resolve when it is interpolated into a require().
pinned="$(cd "$root" && node -p "require('./package.json').workspaces.catalog.effect" 2>/dev/null)"
resolved="$(cd "$root" && node -p "require('./packages/plait/node_modules/effect/package.json').version" 2>/dev/null)"
if [ -n "$pinned" ] && [ "$pinned" = "$resolved" ]; then
  echo "PASS  effect@$resolved is the catalog pin"
else
  echo "FAIL  effect resolves to '${resolved:-<missing>}', catalog pins '${pinned:-<unknown>}'"
  fail=1
fi

# -- arms 1-3, captured verbatim for the README -------------------------------

arm() {
  local label="$1"
  shift
  { echo; echo "== $label =="; } | tee -a "$evidence"
  if "$@" 2>&1 | tee -a "$evidence"; then return 0; fi
  return 1
}

arm "arm 1: emit" bun "$here/emit.ts" || { echo "FAIL  emit"; fail=1; }
arm "arm 2: project" bun "$here/project.ts" || { echo "FAIL  project"; fail=1; }
arm "arm 3: wall" bun "$here/wall.ts" || { echo "FAIL  wall"; fail=1; }

# -- arm 4 --------------------------------------------------------------------

echo
echo "== arm 4: the emitted surface, tsgo $("$tsgo" --version | tr -d '\r') then tsc $("$tsc" --version | tr -d '\r' | sed 's/Version //') as referee =="
if "$tsgo" "${flags[@]}" "$here/generated/joinAll.generated.ts" &&
  "$tsc" "${flags[@]}" "$here/generated/joinAll.generated.ts"; then
  echo "PASS  emitted surface type-checks; every must-not-compile control failed to compile"
else
  echo "FAIL  emitted surface did not type-check under both compilers"; fail=1
fi

# -- arm 5 --------------------------------------------------------------------

echo
echo "== arm 5: the exemplar's own sources under the estate's base config =="
if "$tsgo" -p "$here/tsconfig.json" --noEmit; then echo "PASS  term/emit/project/wall/effect type-check"
else echo "FAIL  exemplar sources did not type-check"; fail=1; fi

# -- arm 6 --------------------------------------------------------------------

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

# -- arm 7 --------------------------------------------------------------------

echo
echo "== arm 7: mutation — join weakened to the commutative-monoid rung =="
sed 's/cell: Cell<State, BoundedSemilattice>,/cell: Cell<State, CommutativeMonoid>,/' \
  "$here/generated/joinAll.generated.ts" > "$here/.mutant-surface.ts"
out="$("$tsc" "${flags[@]}" "$here/.mutant-surface.ts" 2>&1)"
if printf '%s\n' "$out" | grep -q "TS2578"; then
  echo "PASS  mutation caught — the weakened rung leaves a control unused:"
  printf '%s\n' "$out" | sed 's#.*\.mutant-surface\.ts#  .mutant-surface.ts#'
elif printf '%s\n' "$out" | grep -qE "error TS5[0-9]{3}"; then
  # An arm that cannot run must say so rather than blame the thing it was
  # pointed at. Round 1 reported "the rung brand is not load-bearing" whenever
  # the compiler refused the INVOCATION — a control naming the wrong cause.
  echo "FAIL  arm inconclusive: the compiler refused the invocation, so the control"
  echo "      never ran. This is a harness fault, not a verdict on the rung brand:"
  printf '%s\n' "$out" | sed 's/^/    /'
  fail=1
else
  echo "FAIL  mutation NOT caught; the rung brand is not load-bearing"
  printf '%s\n' "$out"
  fail=1
fi

# -- arms 8 and 9: the served schema ------------------------------------------

served_mutation() {
  local label="$1" expression="$2" expect="$3"
  echo
  echo "== $label =="
  rm -rf "$here/.mutant"
  mkdir -p "$here/.mutant"
  cp "$here/generated/denotation.json" "$here/generated/joinAll.generated.ts" \
    "$here/generated/registers.md" "$here/.mutant/"
  sed "$expression" "$here/generated/tool.json" > "$here/.mutant/tool.json"
  if ! cmp -s "$here/generated/tool.json" "$here/.mutant/tool.json"; then
    local out
    out="$(bun "$here/wall.ts" .mutant 2>&1)"
    if printf '%s\n' "$out" | grep -q "FAIL  the served callable schema is not what the declared signature derives"; then
      echo "PASS  caught by check 5 — $expect"
    else
      echo "FAIL  the served schema mutation was NOT caught by check 5"
      printf '%s\n' "$out" | tail -20
      fail=1
    fi
  else
    echo "FAIL  the mutation did not change tool.json; the arm proves nothing"
    fail=1
  fi
}

served_mutation \
  "arm 8: mutation — the served \`required\` list perturbed" \
  's/"cell_digest",$/"cell_digest_DROPPED",/' \
  "a required name that the declaration does not derive"

served_mutation \
  "arm 9: mutation — the served \`items.type\` perturbed" \
  's/"type": "string"$/"type": "number"/' \
  "an element type that the declaration does not derive"

# -- arm 10: the README's evidence --------------------------------------------

echo
echo "== arm 10: the evidence block quoted in README.md =="
readme="$here/README.md"
begin="<!-- EVIDENCE:BEGIN -->"
end="<!-- EVIDENCE:END -->"
if ! grep -qF "$begin" "$readme" || ! grep -qF "$end" "$readme"; then
  echo "FAIL  README.md carries no evidence markers"
  fail=1
elif [ "$write" -eq 1 ]; then
  awk -v b="$begin" -v e="$end" -v f="$evidence" '
    $0 == b { print; print "";  print "```text"; while ((getline line < f) > 0) print line; print "```"; print ""; skip = 1; next }
    $0 == e { skip = 0 }
    !skip { print }
  ' "$readme" > "$readme.new" && mv "$readme.new" "$readme"
  echo "PASS  README.md evidence block rewritten from this run"
else
  awk -v b="$begin" -v e="$end" '$0 == b { on = 1; next } $0 == e { on = 0 } on' "$readme" \
    | sed '/^$/d; /^```/d' > "$here/.readme-block"
  sed '/^$/d' "$evidence" > "$here/.evidence-block"
  if cmp -s "$here/.readme-block" "$here/.evidence-block"; then
    echo "PASS  README.md quotes this run verbatim ($(wc -l < "$here/.evidence-block" | tr -d ' ') lines)"
  else
    echo "FAIL  README.md's quoted evidence is NOT this run's output"
    diff "$here/.readme-block" "$here/.evidence-block" | head -20 | sed 's/^/    /'
    fail=1
  fi
  rm -f "$here/.readme-block" "$here/.evidence-block"
fi

rm -rf "$here/.mutant" "$here/.mutant-surface.ts" "$here/.rederived" "$evidence"

echo
if [ "$fail" -eq 0 ]; then echo "ALL ARMS PASS"; else echo "FAILURES PRESENT"; fi
exit "$fail"
