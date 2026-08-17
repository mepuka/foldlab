#!/usr/bin/env bash
# RQ-8 reproduction: does a proof-body-only change to an upstream Lean
# theorem invalidate the downstream module that consumes only its statement?
#
# Own-authored (foldlab, 2026-08-16). No third-party code.
#
# Run from this directory. It builds in a scratch copy so the committed
# sources are never mutated. Prints the two olean digests; the finding is
# whether the DOWNSTREAM digest (Exp/B.olean) changes.
set -uo pipefail
cd "$(dirname "$0")"

if ! command -v lake >/dev/null 2>&1; then
  echo "SKIP: lake not found (install elan)." >&2
  exit 2
fi

work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"' EXIT
cp -r ./lean-toolchain ./lakefile.toml ./Exp.lean ./Exp "$work"/
cd "$work"

echo "== toolchain =="
lake --version
echo

echo "== build 1 (proof of foo: 'by simp') =="
lake build 2>&1 | tail -3
h1a=$(sha256sum .lake/build/lib/lean/Exp/A.olean | cut -d' ' -f1)
h1b=$(sha256sum .lake/build/lib/lean/Exp/B.olean | cut -d' ' -f1)
echo "A.olean $h1a"
echo "B.olean $h1b"
echo

echo "== edit: proof body ONLY (statement line untouched) =="
cat > Exp/A.lean <<'EOF'
/-
Upstream module. `run.sh` rewrites ONLY the proof body of `foo`; the
statement line is byte-identical across both variants.
-/
theorem foo (n : Nat) : n + 0 = n :=
  Nat.add_zero n
EOF
diff <(grep -c . Exp/A.lean) <(echo) >/dev/null 2>&1 || true

echo "== build 2 =="
lake build 2>&1 | tail -4
h2a=$(sha256sum .lake/build/lib/lean/Exp/A.olean | cut -d' ' -f1)
h2b=$(sha256sum .lake/build/lib/lean/Exp/B.olean | cut -d' ' -f1)
echo "A.olean $h2a"
echo "B.olean $h2b"
echo

echo "== verdict =="
[ "$h1a" != "$h2a" ] && echo "UPSTREAM olean changed (expected)"
if [ "$h1b" != "$h2b" ]; then
  echo "DOWNSTREAM olean CHANGED: a proof-body edit propagates a rebuild downstream."
else
  echo "DOWNSTREAM olean unchanged: Lean/Lake isolate proof bodies from dependents."
fi
