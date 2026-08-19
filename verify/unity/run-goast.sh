#!/usr/bin/env bash
# verify/unity/run-goast.sh — the Go projection's parity wall.
#
# The claim this gate makes is narrow and it is worth stating before
# the first arm runs. `go/kmconform/tables_generated.go` has TWO
# generators: `go/cmd/kmgen`, which reads the committed conformance
# corpus and writes Go with a `strings.Builder`, and `lake exe goemit`,
# which reads the Lean model the corpus is emitted from and prints a
# typed `GoAst` value through one deterministic fold. Neither reads the
# other. The committed file is `cmd/kmgen`'s output; the fresh emission
# is the Lean side's. Comparing them is comparing two independent
# derivations of one truth, and that is the only reason the comparison
# means anything — a generator diffed against its own last output has
# proved nothing.
#
# The flip is NOT this gate's business. Both generators stand; retiring
# `cmd/kmgen` is a later isolated act.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$#" -gt 0 ]]; then
  echo "usage: ./run-goast.sh" >&2
  exit 2
fi

if ! command -v lake >/dev/null 2>&1; then
  echo "GATE: FAIL — lake not found" >&2
  exit 2
fi

committed="../../go/kmconform/tables_generated.go"
producer="Unity/GoTables.lean"

# ---------------------------------------------------------------- roster

for required in Unity/GoAst.lean Unity/GoPrinter.lean "$producer" \
    GoEmitMain.lean "$committed"; do
  if [[ ! -f "$required" ]]; then
    echo "GATE: FAIL — the Go projection roster is missing $required" >&2
    exit 1
  fi
done

# Every module of the projection is in the library's globs and the
# emitter is a registered target: a module that builds only because
# something else imports it is a module this gate does not cover.
for module in Unity.GoAst Unity.GoPrinter Unity.GoTables; do
  if ! grep -q "\"$module\"," lakefile.toml; then
    echo "GATE: FAIL — $module is not in the library globs" >&2
    exit 1
  fi
done
if ! grep -q 'name = "goemit"' lakefile.toml; then
  echo "GATE: FAIL — the goemit target is not registered" >&2
  exit 1
fi

# The kernel's own word list, over the projection's sources. The bridge
# gate sweeps `Unity/` already; `GoEmitMain.lean` is this gate's to
# sweep, and repeating the sweep here keeps the projection's wall
# standing on its own.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    Unity/GoAst.lean Unity/GoPrinter.lean "$producer" GoEmitMain.lean; then
  echo "GATE: FAIL — forbidden kernel escape in the Go projection" >&2
  exit 1
fi

# The projection states no theorems: it is a producer and a printer,
# and a law that appeared here would silently orphan the bridge gate's
# theorem roster rather than be proved.
if grep -nE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+' \
    Unity/GoAst.lean Unity/GoPrinter.lean "$producer"; then
  echo "GATE: FAIL — the Go projection minted a theorem" >&2
  exit 1
fi
echo "GATE: PASS (Go projection roster, globs, hygiene, no laws)"

# The banner names the artifact by `go/kmconform`'s own constant. A
# bash read of that file, not a package dependency: the projection
# reaches the Go module for nothing.
declared_path=$(grep -oE 'const RealCorpusPath = "[^"]*"' \
  ../../go/kmconform/kmconform.go | sed -E 's/.*"(.*)"/\1/')
if ! grep -qF "\"$declared_path\"" "$producer"; then
  echo "GATE: FAIL — the banner's corpus path drifted from go/kmconform's RealCorpusPath ($declared_path)" >&2
  exit 1
fi
echo "GATE: PASS (banner path pinned to go/kmconform's own constant)"

# ---------------------------------------------------------------- build

if lake build goemit; then
  echo "GATE: PASS (lake build goemit)"
else
  echo "GATE: FAIL — lake build goemit" >&2
  exit 1
fi

emission_first=$(mktemp "./.goemit.XXXXXX") && mv "$emission_first" "$emission_first.go" && emission_first="$emission_first.go"
emission_second=$(mktemp "./.goemit.XXXXXX") && mv "$emission_second" "$emission_second.go" && emission_second="$emission_second.go"
emission_mutant=$(mktemp "./.goemit.XXXXXX") && mv "$emission_mutant" "$emission_mutant.go" && emission_mutant="$emission_mutant.go"
emission_raw=$(mktemp "./.goemit.XXXXXX") && mv "$emission_raw" "$emission_raw.txt" && emission_raw="$emission_raw.txt"
producer_backup=$(mktemp "./.goemit.XXXXXX")
mutant_source=$(mktemp "./.goemit.XXXXXX")
probe_output=$(mktemp "./.goemit.XXXXXX")

cp "$producer" "$producer_backup"
restore_producer() {
  if [[ -f "$producer_backup" ]]; then
    cp "$producer_backup" "$producer"
    lake build goemit >/dev/null 2>&1 || true
  fi
}
trap 'restore_producer; rm -f "$emission_first" "$emission_second" "$emission_mutant" "$emission_raw" "$producer_backup" "$mutant_source" "$probe_output"' EXIT

# ------------------------------------------------- arm 1: two-run identity

if ! lake exe goemit > "$emission_first"; then
  echo "GATE: FAIL — the generator refused its own emission" >&2
  exit 1
fi
if ! lake exe goemit > "$emission_second"; then
  echo "GATE: FAIL — the generator refused its own emission on the second run" >&2
  exit 1
fi
if ! cmp -s "$emission_first" "$emission_second"; then
  echo "GATE: FAIL — the Go emission is not deterministic across two runs" >&2
  exit 1
fi
echo "GATE: PASS (two Lean emissions over one model are byte-identical)"

# ------------------------------------------ arm 2: committed versus fresh

if ! diff -u "$committed" "$emission_first"; then
  echo "GATE: FAIL — the committed Go tables are not what the Lean projection emits" >&2
  echo "FINDING: intended model change — regenerate BOTH generators' output and commit it IN THE SAME COMMIT as the change" >&2
  echo "FINDING: unintended change — report the finding and STOP; the committed bytes are cmd/kmgen's record and are never edited to agree" >&2
  exit 1
fi
echo "GATE: PASS (committed cmd/kmgen emission == fresh Lean emission, byte for byte)"

# ------------------------------------------- arm 3: the layout is measured

# The elastic pass is not decoration. `--raw` prints the node layout
# alone — the printer's RawFormat half — and the two must differ on the
# measured 155 lines. A printer that emitted the node layout and
# skipped the alignment would be right everywhere a naive reading looks
# and wrong on 22% of the file, and this arm is what tells them apart.
if ! lake exe goemit --raw > "$emission_raw"; then
  echo "GATE: FAIL — the generator could not print its node layout" >&2
  exit 1
fi
repadded=$(diff "$emission_raw" "$emission_first" | grep -c '^<' || true)
if [[ "$repadded" -ne 155 ]]; then
  echo "GATE: FAIL — the elastic pass moved $repadded lines, not the measured 155" >&2
  exit 1
fi
aligned=$(grep -cE '[^ ]  +[^ ]' "$emission_first" || true)
if [[ "$aligned" -ne 125 ]]; then
  echo "GATE: FAIL — the emission carries $aligned elastically aligned lines, not the measured 125" >&2
  exit 1
fi
if [[ "$(wc -l < "$emission_first" | tr -d ' ')" -ne 704 ]] ||
    [[ "$(grep -cE '[ 	]+$' "$emission_first" || true)" -ne 0 ]] ||
    [[ "$(LC_ALL=C grep -c $'\r' "$emission_first" || true)" -ne 0 ]] ||
    [[ "$(grep -cE '[^	]	' "$emission_first" || true)" -ne 0 ]] ||
    [[ "$(grep -cE '^// Code generated .* DO NOT EDIT\.$' "$emission_first" || true)" -ne 1 ]] ||
    [[ "$(grep -c '^//foldlab:brand ' "$emission_first" || true)" -ne 12 ]]; then
  echo "GATE: FAIL — the emission's measured layout facts moved" >&2
  exit 1
fi
echo "GATE: PASS (elastic pass decides 155 lines and aligns 125; 704 lines, no trailing space, no CR, no interior tab, banner at Go's convention, 12 brand directives)"

# -------------------------------------------------- arm 4: the mutation

# One corpus-derived name, widened by one character at the producer's
# one spelling site. The calibrated arm: the emission must move, the
# committed compare must red, and BOTH elastic columns must repad — the
# const block and the one-line constructor column. The second half is
# the part that catches a printer with no tabwriter.
run_mutation() {
  local label="$1"
  local expression="$2"
  sed "$expression" "$producer_backup" > "$mutant_source"
  if cmp -s "$producer_backup" "$mutant_source"; then
    echo "GATE: FAIL — mutation $label did not change the producer" >&2
    exit 1
  fi
  cp "$mutant_source" "$producer"
  if ! lake build goemit >/dev/null 2>&1; then
    echo "GATE: FAIL — mutation $label did not elaborate" >&2
    exit 1
  fi
}

run_mutation widened-kind-name 's/:= Emit\.kindName kind$/:= Emit.kindName kind ++ "s"/'
if ! lake exe goemit > "$emission_mutant"; then
  echo "GATE: FAIL — the widened-name mutant was refused rather than emitted" >&2
  exit 1
fi
if cmp -s "$emission_mutant" "$emission_first"; then
  echo "GATE: FAIL — a widened corpus name did not move the emission" >&2
  exit 1
fi
if cmp -s "$emission_mutant" "$committed"; then
  echo "GATE: FAIL — the widened-name mutant still equals the committed file" >&2
  exit 1
fi
if ! grep -qE '^	KindSchemas     DeclKind = 0$' "$emission_mutant"; then
  echo "GATE: FAIL — the const block did not repad under the widened name" >&2
  exit 1
fi
if ! grep -qE '^func NewSchemasDigest\(id uint64\) SchemasDigest         \{ return SchemasDigest\(id\) \}$' "$emission_mutant"; then
  echo "GATE: FAIL — the one-line constructor column did not repad under the widened name" >&2
  exit 1
fi
moved=$(diff "$emission_first" "$emission_mutant" | grep -c '^<' || true)
echo "GATE: PASS (widened corpus name moves $moved lines and repads both elastic columns; the committed compare reds)"

# --------------------------------------------------- arm 5: the refusal

# The control the Go gate already runs and the Lean side must not lose:
# a corpus its own consumer refuses must make the GENERATOR refuse. Two
# kinds made to mint one Go identifier is exactly `cmd/kmgen`'s
# `checkIdentifiers` case, and a generator more tolerant than its
# consumer would bake the collision into compiled code.
run_mutation colliding-kind-names \
  's/:= Emit\.kindName kind$/:= if Emit.kindName kind == "policy" then "program" else Emit.kindName kind/'
if lake exe goemit > "$emission_mutant" 2> "$probe_output"; then
  echo "GATE: FAIL — the generator emitted a corpus whose names collide as Go identifiers" >&2
  exit 1
fi
if ! grep -qF 'the identifier KindProgram would be minted from both' "$probe_output"; then
  cat "$probe_output" >&2
  echo "GATE: FAIL — the collision was refused for the wrong reason" >&2
  exit 1
fi
echo "GATE: PASS (colliding corpus names REFUSED, naming the identifier: $(grep -oF 'the identifier KindProgram' "$probe_output" | head -n 1))"

# ------------------------------------------------ arm 6: the restoration

restore_producer
if ! cmp -s "$producer" "$producer_backup"; then
  echo "GATE: FAIL — the producer was not restored" >&2
  exit 1
fi
if ! lake exe goemit > "$emission_second"; then
  echo "GATE: FAIL — the restored generator refused its own emission" >&2
  exit 1
fi
if ! cmp -s "$emission_second" "$committed"; then
  echo "GATE: FAIL — parity did not return after the mutation arms" >&2
  exit 1
fi
echo "GATE: PASS (producer restored; parity returns)"

echo "GATE: PASS (Go projection: 30-node census, one printer, 704-line emission byte-identical to cmd/kmgen's committed output; 2 mutation arms, 1 refusal arm)"
