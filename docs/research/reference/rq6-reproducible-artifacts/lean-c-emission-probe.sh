#!/usr/bin/env bash
# lean-c-emission-probe.sh — own-authored, no third-party code.
#
# Purpose (foldlab RQ-6): the REF-6 chain is Lean -> C -> wasm. Before asking
# whether the wasm step is reproducible, establish whether the FIRST step is:
# does `lean -c` emit byte-identical C for the same source, and does the
# directory the source sits in leak into that C?
#
# The answer on Lean 4.33.0 (see the report) is: the emitted C is stable and
# carries no absolute path, but the *module name* is derived from the source
# path relative to the package root, and that module name is baked into the
# emitted C both as a string literal and as the `initialize_<module>` symbol.
# Drive emission through `lake` (or pass `-R`) so the module name is
# package-relative; a bare `lean -c /abs/path/File.lean` makes the containing
# directory's NAME part of the artifact.
#
# Usage:  bash lean-c-emission-probe.sh [workdir]
# Exit:   0 if both facts held, 1 otherwise.

set -u
WORK="${1:-./_lean-c-probe}"
A="$WORK/dir-a"; B="$WORK/dir-b-much-longer-name"
rm -rf "$WORK"; mkdir -p "$A" "$B"

cat > "$A/Kern.lean" <<'LEAN'
def head! (xs : List UInt32) : UInt32 :=
  match xs with
  | []     => panic! "empty"
  | x :: _ => x

@[export spike_head]
def spikeHead (xs : List UInt32) : UInt32 := head! xs
LEAN
cp "$A/Kern.lean" "$B/Kern.lean"

digest() { sha256sum "$1" | cut -d' ' -f1; }
lean --version

# Case 1: relative invocation from inside each directory. The module name is
# just `Kern` in both, so the path is irrelevant.
(cd "$A" && lean -c rel1.c Kern.lean && lean -c rel2.c Kern.lean)
(cd "$B" && lean -c rel1.c Kern.lean)
r1=$(digest "$A/rel1.c"); r2=$(digest "$A/rel2.c"); r3=$(digest "$B/rel1.c")

echo
echo "1. same dir, emitted twice (relative invocation): $r1"
echo "                                                 : $r2"
echo "2. different dir, relative invocation            : $r3"

rc=0
[ "$r1" = "$r2" ] || { echo "UNEXPECTED: repeated emission differed"; rc=1; }
[ "$r1" = "$r3" ] || { echo "UNEXPECTED: relative invocation still path-sensitive"; rc=1; }

# Case 2: absolute invocation with no explicit root. Lean derives the module
# name from the path, so the containing directory's name enters the C.
if command -v cygpath >/dev/null 2>&1; then
  WA=$(cygpath -m "$(cd "$A"; pwd)"); WB=$(cygpath -m "$(cd "$B"; pwd)")
else
  WA=$(cd "$A"; pwd); WB=$(cd "$B"; pwd)
fi
lean -c "$WA/abs.c" "$WA/Kern.lean"
lean -c "$WB/abs.c" "$WB/Kern.lean"
a1=$(digest "$A/abs.c"); a2=$(digest "$B/abs.c")
echo "3. different dir, ABSOLUTE invocation, no -R     : $a1"
echo "                                                 : $a2"
if [ "$a1" = "$a2" ]; then
  echo "NOTE: module name did not absorb the directory name on this Lean version"
else
  echo "CONFIRMED: the directory name is baked into the emitted C:"
  diff "$A/abs.c" "$B/abs.c" | grep -E '^[<>].*Module:|^[<>].*initialize_' | head -4
fi
exit $rc
