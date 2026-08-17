#!/usr/bin/env bash
# RQ-8 reproduction: when only a PROOF BODY inside verify/moves changes,
# what moves downstream?
#
#   (a) which modules Lake rebuilds,
#   (b) whether the generated C changes,
#   (c) whether the emitted conformance corpus changes.
#
# The distinction matters for REF-6's byte-identical regeneration gate and
# for REF-9's update cycle: proof churn that perturbs the deployed artifact
# would make the regeneration gate fire on every proof edit.
#
# Own-authored (foldlab, 2026-08-16). No third-party code. The repository
# working tree is never mutated: everything happens in a scratch copy.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/../../../../../verify/moves"

if ! command -v lake >/dev/null 2>&1; then
  echo "SKIP: lake not found (install elan)." >&2
  exit 2
fi
if [ ! -f "$src/Moves/Model.lean" ]; then
  echo "SKIP: verify/moves not found at $src" >&2
  exit 2
fi

work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"' EXIT
cp -r "$src"/. "$work"/
rm -rf "$work/.lake"
cd "$work"

echo "== toolchain =="; lake --version; echo

echo "== cold build (timed) =="
time lake build 2>&1 | tail -2
echo

hash_artifacts () {
  find .lake/build/ir -name '*.c' | sort | xargs sha256sum
}

hash_artifacts > "$work/.c-before.txt"
lake exe oracle emit 2000 > "$work/.corpus-before.ndjson" 2>/dev/null
echo "corpus digest before: $(sha256sum "$work/.corpus-before.ndjson" | cut -d' ' -f1)"
echo

echo "== patch: insert a vacuous 'have' into the proof of no_loss =="
echo "   (statement line byte-identical; only the tactic block changes)"
python - "$work/Moves/Model.lean" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = ("    ∀ h v actor, (.fill h v actor : Mv) ∈ intents → "
       "TerminalCarries terminal h v := by\n  cases hrun with")
new = ("    ∀ h v actor, (.fill h v actor : Mv) ∈ intents → "
       "TerminalCarries terminal h v := by\n"
       "  have _rq8probe : True := trivial\n  cases hrun with")
assert s.count(old) == 1, f"anchor not found exactly once ({s.count(old)})"
open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print("patched")
PY
echo

echo "== rebuild (timed) =="
time lake build 2>&1 | tail -6
echo

hash_artifacts > "$work/.c-after.txt"
lake exe oracle emit 2000 > "$work/.corpus-after.ndjson" 2>/dev/null
echo "corpus digest after:  $(sha256sum "$work/.corpus-after.ndjson" | cut -d' ' -f1)"
echo

echo "== verdict =="
if diff -q "$work/.c-before.txt" "$work/.c-after.txt" >/dev/null; then
  echo "GENERATED C: byte-identical across the proof edit"
else
  echo "GENERATED C: CHANGED"; diff "$work/.c-before.txt" "$work/.c-after.txt"
fi
if cmp -s "$work/.corpus-before.ndjson" "$work/.corpus-after.ndjson"; then
  echo "CORPUS: byte-identical across the proof edit"
else
  echo "CORPUS: CHANGED"
fi
