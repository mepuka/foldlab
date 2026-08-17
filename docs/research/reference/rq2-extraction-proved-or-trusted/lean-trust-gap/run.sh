#!/usr/bin/env bash
# Self-checking reproduction: exits nonzero if any claim in TRANSCRIPT.md is false.
# Requires `lean` on PATH (recorded against Lean 4.33.0).
set -uo pipefail
cd "$(dirname "$0")"

fail() { echo "GATE: FAIL — $1" >&2; exit 1; }

# Emitted C is a build artifact, not a committed one.
gen=$(mktemp -d "./.gen.XXXXXX") || { echo "GATE: FAIL — no scratch dir" >&2; exit 1; }
trap 'rm -rf "$gen"' EXIT

echo "== lean --version =="
lean --version || fail "no lean on PATH"

echo
echo "== 1. theorem holds, compiled code disagrees =="
run_out=$(lean --run TrustGap.lean 2>&1) || fail "TrustGap.lean did not run"
printf '%s\n' "$run_out"
grep -q "'honest_eq' does not depend on any axioms" <<<"$run_out" \
  || fail "expected honest_eq to have an empty axiom footprint"
grep -q "compiled honest 3 = 4" <<<"$run_out" \
  || fail "expected the compiled answer to be 4 while the theorem says 3"

echo
echo "== 2. the exported C symbol carries the swap =="
lean -c "$gen/TrustGap.c" TrustGap.lean >/dev/null 2>&1 || fail "could not emit C for TrustGap.lean"
sed -n '/LEAN_EXPORT lean_object\* foldlab_honest(lean_object\* /,/^}/p' "$gen/TrustGap.c"
grep -q "l_liar" "$gen/TrustGap.c" || fail "expected the emitted C to call l_liar"

echo
echo "== 3. an ordinary ByteArray function reaches hand-written runtime C =="
lean -c "$gen/ByteKernel.c" ByteKernel.lean >/dev/null 2>&1 || fail "could not emit C for ByteKernel.lean"
grep -o "lean_[a-z_0-9]*(" "$gen/ByteKernel.c" | sort | uniq -c | sort -rn
grep -q "lean_byte_array_uget" "$gen/ByteKernel.c" || fail "expected a call to lean_byte_array_uget"

echo
echo "== 4. csimp refuses the same swap without a proof =="
if lean CsimpGuard.lean >/dev/null 2>&1; then
  fail "csimp accepted an unproved replacement"
fi
lean CsimpGuard.lean 2>&1 | head -4

echo
echo "GATE: PASS"
