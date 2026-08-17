#!/usr/bin/env bash
set -Eeuo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo=$(cd "$here/../.." && pwd)

if [[ -r /proc/version ]] && grep -qi microsoft /proc/version && [[ "${1:-}" != "--configured" ]]; then
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$here/setup-windows.ps1")" -RunGate
  exit $?
fi

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    if [[ "${1:-}" != "--configured" ]]; then
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$here/setup-windows.ps1" -RunGate
      exit $?
    fi
    platform_path="windows-msys2"
    ;;
  *) platform_path="non-windows (cvc5 patch skipped)" ;;
esac

cd "$here"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/fabric-veil.XXXXXX")
started=$SECONDS
finish() {
  status=$?
  elapsed=$((SECONDS - started))
  rm -rf -- "$scratch"
  trap - EXIT
  echo "fabric-veil environment: wall-clock-seconds=$elapsed exit-status=$status"
  exit "$status"
}
trap finish EXIT

echo "fabric-veil environment: platform=$(uname -a) path=$platform_path"
echo "fabric-veil environment: lean=$(lean --version | head -n 1)"
echo "fabric-veil environment: veil=300c305e945750ab3fb62de4a79c23161b24da39 lean-smt=5c143192 cvc5-ffi=ef0efbf mathlib=8f9d9cff"

lake update
grep -Fq 'weak.veil.smt.trust, false' lakefile.lean
grep -Fq 'set_option veil.smt.trust false' FabricVeil/Statements.lean

lake build FabricVeil 2>&1 | tee "$scratch/proofs.log"

while IFS= read -r theorem; do
  [[ -n "$theorem" ]] || continue
  grep -Fq "'$theorem' depends on axioms: [propext, Quot.sound]" "$scratch/proofs.log" || {
    echo "roster theorem missing or has a non-pinned footprint: $theorem" >&2
    exit 1
  }
done < theorem-roster.txt
if grep -Fq 'sorryAx' "$scratch/proofs.log"; then
  echo "sorryAx reached the claimed theorem footprint" >&2
  exit 1
fi
echo "footprint: PASS (roster is inside {propext, Classical.choice, Quot.sound})"

lake build FabricVeilControls 2>&1 | tee "$scratch/trusted.log"
footprint_accepts() { ! grep -Fq 'sorryAx' "$1"; }
if footprint_accepts "$scratch/trusted.log"; then
  echo "trusted-mode control was incorrectly accepted" >&2
  exit 1
fi
grep -Fq "trusted_mode_control' depends on axioms: [sorryAx]" "$scratch/trusted.log"
grep -Fq 'depends on axioms: [sorryAx]' negative-controls/trusted-mode-footprint.txt
echo "footprint control: REFUSED as required (trusted mode exposes sorryAx)"

for file in Definitions Statements Proofs; do
  test -f "FabricVeil/$file.lean"
done
grep -Fq 'import FabricVeil.Definitions' FabricVeil/Statements.lean
grep -Fq 'import FabricVeil.Statements' FabricVeil/Proofs.lean
grep -Fq 'import FabricVeil.Proofs' FabricVeil.lean
if grep -R -n -E '\b(sorry|admit)\b|^[[:space:]]*axiom[[:space:]]' FabricVeil --include='*.lean'; then
  echo "claimed source contains an admitted declaration" >&2
  exit 1
fi
echo "partition and source hygiene: PASS"

mkdir -p "$scratch/controls"
lake exe fabric_veil_export --write-corpus "$scratch/register-traces.ndjson"
lake exe fabric_veil_export --write-controls "$scratch/controls"
cmp "$scratch/register-traces.ndjson" "$repo/packages/plait/fixtures/register-traces.ndjson"
cmp "$scratch/controls/drop-commit-token-guard.cex.json" negative-controls/drop-commit-token-guard.cex.json
cmp "$scratch/controls/drop-steal-strict-increase.cex.json" negative-controls/drop-steal-strict-increase.cex.json
test "$(wc -l < "$scratch/register-traces.ndjson" | tr -d ' ')" = 13
test "$(grep -c '"id"' "$scratch/register-traces.ndjson")" = 12
grep -Fq 'no stale token ever lands' negative-controls/drop-commit-token-guard.cex.json
grep -Fq 'every steal strictly increases the token' negative-controls/drop-steal-strict-increase.cex.json
echo "negative controls and corpus: PASS (12 rows, zero generated-row skips)"

if grep -R -n 'repos/veil\|repos\\veil' FabricVeil FabricVeil.lean Main.lean lakefile.lean; then
  echo "buildable package imports reference-only repos/veil" >&2
  exit 1
fi

cvc5_binary=$(find .lake/packages/cvc5 -type f \( -name cvc5 -o -name cvc5.exe \) | head -n 1)
test -n "$cvc5_binary"
echo "fabric-veil environment: cvc5-binary=$cvc5_binary sha256=$(sha256sum "$cvc5_binary" | awk '{print $1}')"
echo "FABRIC VEIL GATE: PASS"
