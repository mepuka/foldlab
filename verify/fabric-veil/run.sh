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

# Fast-fail HINTS only — none of these carry evidentiary weight (a trusted
# run can be log- and source-silent; the DEV-711 round-1 plant proved it).
# The mechanical enforcement of trust=false is the in-build axiom census
# below: `#gen_theorems` lands every discharged VC as a theorem and
# FabricVeil/Proofs.lean reads each proof term's footprint out of the
# kernel, failing the build on anything outside {propext, Classical.choice,
# Quot.sound} — sorryAx (trusted mode) included.
grep -Fq 'weak.veil.smt.trust, false' lakefile.lean
grep -Fq 'set_option veil.smt.trust false' FabricVeil/Statements.lean
if grep -R -n -F 'veil.smt.trust true' FabricVeil FabricVeil.lean Main.lean; then
  echo "claimed sources contain a trusted-mode override" >&2
  exit 1
fi

lake build FabricVeil 2>&1 | tee "$scratch/proofs.log"

if grep -F 'Trusting SMT solver' "$scratch/proofs.log"; then
  echo "trusted-mode discharge signature found in the claimed build" >&2
  exit 1
fi

# The census: every rostered claim-carrying VC theorem passed the kernel
# axiom-footprint check inside the build that just ran, and the roster file
# agrees with the build's own generated roster line for line.
while IFS= read -r theorem; do
  [[ -n "$theorem" ]] || continue
  grep -Fq "roster-footprint PASS $theorem axioms=" "$scratch/proofs.log" || {
    echo "roster theorem missing from the census: $theorem" >&2
    exit 1
  }
done < theorem-roster.txt
test "$(grep -c 'roster-footprint PASS' "$scratch/proofs.log")" = "$(grep -c . theorem-roster.txt)"
if grep -Fq 'sorryAx' "$scratch/proofs.log"; then
  echo "sorryAx appeared in the claimed build" >&2
  exit 1
fi
echo "footprint: PASS ($(grep -c . theorem-roster.txt) rostered VC theorems inside {propext, Classical.choice, Quot.sound})"

# The corpus-model bridge ran inside the same build: every exported row and
# both mutant refutations executed against the module's GENERATED transition
# relation (FabricVeil/Bridge.lean; a disagreement is a failed build).
test "$(grep -c 'corpus-model agreement:' "$scratch/proofs.log")" = 15
grep -Fq 'mutant-refutation: drop-commit-token-guard' "$scratch/proofs.log"
grep -Fq 'mutant-refutation: drop-steal-strict-increase' "$scratch/proofs.log"
echo "bridge: PASS (15 rows and 2 mutant refutations against the generated relation)"

# The trusted-mode control: the review's plant, discharged for real under a
# gen_spec-time override; the same census must REFUSE it on sorryAx, and the
# committed trace lines must appear verbatim in the fresh log.
lake build FabricVeilControls 2>&1 | tee "$scratch/trusted.log"
if grep -Fq 'trusted-mode control was incorrectly accepted' "$scratch/trusted.log"; then
  echo "trusted-mode control was incorrectly accepted" >&2
  exit 1
fi
while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  grep -Fq "$line" "$scratch/trusted.log" || {
    echo "trusted-mode control trace line missing from the fresh log: $line" >&2
    exit 1
  }
done < <(grep -F 'control-footprint REFUSED' negative-controls/trusted-mode-footprint.txt)
test "$(grep -c 'control-footprint REFUSED' "$scratch/trusted.log")" = 2
echo "footprint control: REFUSED as required (trusted mode exposes sorryAx to the census)"

for file in Definitions Statements Proofs Corpus Bridge; do
  test -f "FabricVeil/$file.lean"
done
grep -Fq 'import FabricVeil.Definitions' FabricVeil/Statements.lean
grep -Fq 'import FabricVeil.Statements' FabricVeil/Proofs.lean
grep -Fq 'import FabricVeil.Statements' FabricVeil/Bridge.lean
grep -Fq 'import FabricVeil.Corpus' FabricVeil/Bridge.lean
grep -Fq 'import FabricVeil.Proofs' FabricVeil.lean
grep -Fq 'import FabricVeil.Bridge' FabricVeil.lean
# The exporter deliberately links only the corpus closure (the full-closure
# link is what deterministically killed the ubuntu CI step).
grep -Fq 'import FabricVeil.Corpus' Main.lean
if grep -F 'import FabricVeil.Statements' Main.lean; then
  echo "the exporter must not link the proof closure" >&2
  exit 1
fi
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
test "$(wc -l < "$scratch/register-traces.ndjson" | tr -d ' ')" = 16
test "$(grep -c '"id"' "$scratch/register-traces.ndjson")" = 15
# The mutant exhibits are execution-produced: generation itself refuses a
# non-violating mutant, and the committed JSON must carry the executed
# verdicts and witnesses.
grep -Fq 'no stale token ever lands' negative-controls/drop-commit-token-guard.cex.json
grep -Fq '"mutant_verdict":"accepted"' negative-controls/drop-commit-token-guard.cex.json
grep -Fq '"violation_witness"' negative-controls/drop-commit-token-guard.cex.json
grep -Fq 'every steal strictly increases the token' negative-controls/drop-steal-strict-increase.cex.json
grep -Fq '"mutant_verdict":"accepted"' negative-controls/drop-steal-strict-increase.cex.json
grep -Fq '"violation_witness"' negative-controls/drop-steal-strict-increase.cex.json
echo "negative controls and corpus: PASS (15 rows, zero generated-row skips, executed mutants)"

if grep -R -n 'repos/veil\|repos\\veil' FabricVeil FabricVeil.lean Main.lean lakefile.lean; then
  echo "buildable package imports reference-only repos/veil" >&2
  exit 1
fi

cvc5_binary=$(find .lake/packages/cvc5 -type f \( -name cvc5 -o -name cvc5.exe \) | head -n 1)
test -n "$cvc5_binary"
echo "fabric-veil environment: cvc5-binary=$cvc5_binary sha256=$(sha256sum "$cvc5_binary" | awk '{print $1}')"
echo "FABRIC VEIL GATE: PASS"
