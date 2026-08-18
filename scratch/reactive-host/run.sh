#!/usr/bin/env bash
# EXEMPLAR ONLY — not a gate, wired into nothing.
#
# Seven arms:
#   1. The slice type-checks under the pinned tsgo.
#   2. It type-checks under tsc as referee.
#   3. The three walls run green (walls.ts).
#   4. The headless render check runs green (render-check.ts).
#   5. MUTATION: delete the successor guard and wall 2 must go RED.
#   6. MUTATION: put a wall clock in the Model and wall 3 must go RED.
#   7. `bun run gates` is untouched, asserted mechanically rather than claimed.
#
# Arms 5 and 6 are the teeth. Without them a green run could mean the walls
# assert nothing.
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
tsc="$root/node_modules/.bin/tsc"
tsgo="$root/node_modules/.bin/tsgo"
sources=("$here/slice.ts" "$here/walls.ts" "$here/render-check.ts")
flags=(
  --ignoreConfig --strict --noEmit --target es2022 --module esnext
  --moduleResolution bundler --skipLibCheck --exactOptionalPropertyTypes
  --noUncheckedIndexedAccess --types bun
)
tscflags=(
  --strict --noEmit --target es2022 --module esnext --moduleResolution bundler
  --skipLibCheck --exactOptionalPropertyTypes --noUncheckedIndexedAccess
  --types bun
)

fail=0

if [ ! -d "$here/node_modules" ]; then
  echo "== bootstrap: bun install (scratch-local, root lockfile untouched) =="
  (cd "$here" && bun install) || { echo "FAIL  install"; exit 1; }
  echo
fi

echo "== arm 1: tsgo $("$tsgo" --version | tr -d '\r') =="
if "$tsgo" "${flags[@]}" "${sources[@]}"; then
  echo "PASS  the slice type-checks against the pinned effect@4.0.0-rc.108"
else
  echo "FAIL  the slice did not type-check"; fail=1
fi

echo
echo "== arm 2: tsc $("$tsc" --version | tr -d '\r') =="
if "$tsc" "${tscflags[@]}" "${sources[@]}"; then
  echo "PASS  referee agrees"
else
  echo "FAIL  referee disagrees"; fail=1
fi

echo
echo "== arm 3: the three walls =="
if (cd "$here" && bun walls.ts); then
  echo "PASS  replay, chatter, and no-clock walls hold"
else
  echo "FAIL  a wall did not hold"; fail=1
fi

echo
echo "== arm 4: headless render check =="
if (cd "$here" && bun render-check.ts); then
  echo "PASS  the view projects to an unstyled value and foldkit renders it"
else
  echo "FAIL  the render check did not hold"; fail=1
fi

# --- the mutation arms ------------------------------------------------------

mutate() {
  # $1 = sed program applied to slice.ts, $2 = mutant tag
  sed "$1" "$here/slice.ts" > "$here/.mutant-$2-slice.ts"
  sed "s#\"./slice.js\"#\"./.mutant-$2-slice.js\"#" "$here/walls.ts" > "$here/.mutant-$2-walls.ts"
}

cleanup() { rm -f "$here"/.mutant-*.ts; }
trap cleanup EXIT

echo
echo "== arm 5: mutation — successor discipline replaced by arrival-order replay =="
# The same negative control plait's own fabric wall uses: apply each arrival
# where it lands instead of only at floor + 1. Wall 2 recovers out of order on
# purpose, so an arrival-order fold must leave the anchor's digest.
mutate 's#const drained = drain(fold, { ...model, head, buffer })#const drained = { ...model, head, buffer, floor: arrival.position, state: fold.step(model.state, arrival.event) }#' guard
out="$( (cd "$here" && bun .mutant-guard-walls.ts) 2>&1 )"
if printf '%s\n' "$out" | grep -q "FAIL  wall 2"; then
  echo "PASS  mutation caught — arrival-order replay leaves the anchor digest:"
  printf '%s\n' "$out" | grep "FAIL  wall 2" | sed 's#^#  #'
else
  echo "FAIL  mutation NOT caught; the successor guard is not load-bearing"
  printf '%s\n' "$out"
  fail=1
fi

echo
echo "== arm 6: mutation — a wall clock put in the Model =="
mutate 's#  readonly absorbed: number#  readonly absorbed: number\n  readonly observedAt?: number#; s#  absorbed: 0,#  absorbed: 0,\n  observedAt: Date.now(),#' clock
out="$( (cd "$here" && bun .mutant-clock-walls.ts) 2>&1 )"
if printf '%s\n' "$out" | grep -q "FAIL  wall 3"; then
  echo "PASS  mutation caught — the no-clock wall goes red:"
  printf '%s\n' "$out" | grep "FAIL  wall 3" | sed 's#^#  #'
else
  echo "FAIL  mutation NOT caught; the no-clock wall proves nothing"
  printf '%s\n' "$out"
  fail=1
fi

cleanup

# --- the untouched assertion ------------------------------------------------

echo
echo "== arm 7: bun run gates is untouched =="
gated=(
  package.json bun.lock bunfig.toml tsconfig.json tsconfig.base.json
  scripts packages proto go verify fixtures .github
)
untouched=1
if git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git -C "$root" diff --quiet HEAD -- "${gated[@]}"; then
    echo "FAIL  a path the gates battery reads has moved:"
    git -C "$root" diff --name-only HEAD -- "${gated[@]}" | sed 's#^#  #'
    untouched=0; fail=1
  fi
  if git -C "$root" status --porcelain -- "${gated[@]}" | grep -q .; then
    echo "FAIL  an untracked file sits inside a gated path:"
    git -C "$root" status --porcelain -- "${gated[@]}" | sed 's#^#  #'
    untouched=0; fail=1
  fi
else
  echo "SKIP  not a git work tree"
  untouched=0
fi

# The one way a scratch/ addition can turn the battery red without touching a
# gated path: scripts/gates.ts walks the whole tree for *.test.ts and names
# every hit to the root test stage. scratch/ is not in its exclusion set.
if find "$here" -name '*.test.ts' -not -path '*/node_modules/*' | grep -q .; then
  echo "FAIL  a *.test.ts here would join the root test stage of bun run gates:"
  find "$here" -name '*.test.ts' -not -path '*/node_modules/*' | sed 's#^#  #'
  fail=1
elif [ "$untouched" -eq 1 ]; then
  echo "PASS  no gated path moved, and no *.test.ts here can join the battery"
fi

echo
if [ "$fail" -eq 0 ]; then echo "ALL ARMS PASS"; else echo "FAILURES PRESENT"; fi
exit "$fail"
