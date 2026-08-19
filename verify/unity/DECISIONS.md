# The Go projection — decisions the dispatch did not fix

Slice D of the projections toolkit (DEV-830): `GoAst`, its one printer, and
the parity wall against `cmd/kmgen`'s committed emission. Task-local
placeholders follow the numbering rule in `proto/DECISIONS.md`; repository
D-numbers are assigned at merge.

Every row below was measured against `go/kmconform/tables_generated.go` at
`e46ebec` (694 lines, 29,896 bytes, sha256 `5d19cc38…`) with the Go
toolchain's own `go/parser`, `go/printer`, `go/format` and `text/tabwriter`.

### G1. The target grammar is the census, and a kind outside it is unrepresentable

Decided: `Unity/GoAst.lean` carries exactly the thirty `go/ast` node types the
committed file spells and no others — no `MapType`, no `InterfaceType`, no
`FuncLit`, no `StarExpr`, no `ParenExpr`, no `Bad*`, no generics — and closes
every discriminator the same way: four `GenDecl` tokens, two `BasicLit` kinds,
six binary operators, one unary, two assignment tokens, and an array length
that is either absent or `go/ast.Ellipsis`, because the file writes `[]T` and
`[...]T` and never `[N]T`.

Alternatives: model `go/ast` whole (a general Go printer, which is a much
larger obligation and a much weaker claim); carry an escape hatch node for
"anything else" (which makes the grammar unfalsifiable). Why: a target grammar
that can spell what the target does not contain has stopped being a
measurement and become a guess, and the whole point of slice D is that the
census IS the inductive set. **Load-bearing? yes** — the closure is what makes
"the printer is total over the target" a statement about the target rather
than about Go.

### G2. The layout spec is `go/printer` RawFormat plus tabwriter at five numbers

Decided: the printer is two halves. `GoPrinter.lines` emits the node layout
with `\t` cell separators — `go/printer`'s `RawFormat` — and `GoPrinter.tabwrite`
is `text/tabwriter` at `go/printer`'s own parameters: minwidth 0, tabwidth 8,
padding 1, padchar `' '`, mode `DiscardEmptyColumns | TabIndent`. The column
algorithm is `tabwriter`'s: a column block is a maximal run of consecutive
lines carrying a padded cell in that column, every cell is padded to the
block's widest plus one, and leading empty cells are padded with tabs rather
than the pad character, which is what makes the emission's indentation a tab.

Alternatives: pick a layout and require the Go side to accept it (there is no
such freedom — the file is a `gofmt` fixed point and CI runs `gofmt -l`);
emit the node layout and skip the alignment.

Why not the second: the elastic pass decides **155 of 694 lines**. A printer
that skips it is wrong on 22% of the file and right everywhere a naive reading
would look, which is exactly the failure a byte wall exists to catch. The gate
proves this rather than asserting it: `goemit --raw` prints the node layout
alone and the arm requires it to differ from the emission on exactly 155
lines. **Load-bearing? yes.**

### G3. Two layout facts are declared, everything else is derived

Decided: `BraceLayout` (`inline` or `perLine`) rides on `CompositeLit` and
`StructType` and is the ONLY layout property the tree states. Everything else
`go/printer` decides is DERIVED by the printer from the tree:

  * the blank line between two declarations — present when the declaration
    token changed or the second carries a doc comment, absent otherwise, which
    is why the twelve brand constructors sit shoulder to shoulder while the
    twelve brand types, each carrying its `//foldlab:brand` directive, do not;
  * the type column of a `const` group — `go/printer`'s `keepTypeColumn`,
    reimplemented, so `MachineApplicable Applicability = iota` prints a type
    and the bare `Advisory` under it does not;
  * whether a function body collapses onto its signature line — `go/printer`'s
    `funcBody`, at the same 100-byte limit over the same `nodeSize` rule, so
    `NewToken` (103) stays open and `NewCapabilityDigest` (79) closes;
  * whether a `GenDecl` is parenthesized — exactly when it does not carry one
    spec;
  * whether a key-value element gets an alignment cell after its colon — when
    it stands in a one-element-per-line list of more than one element and fits
    on one line, which is what aligns `RefusalTable`'s five keys and leaves
    `DocTable`'s one-line rows unaligned.

Alternatives: declare all of it (a tree that carries its own bytes proves
nothing); derive all of it (impossible — `go/printer` reads line breaking off
SOURCE POSITIONS, and a generated tree has none).

Why the line drawn here: the declared facts are the ones with no function of
the tree to compute them; every derived fact is one a mutation can move. The
difference is visible in the mutation arm — widening a corpus name repads two
elastic columns and could, at another width, flip a constructor off its
signature line, and the printer would follow `gofmt` without being told.
**Load-bearing? yes** — it is the boundary between a printer and a
transcription.

### G4. The em dash travels VERBATIM in the emission's own prose

Decided: the four U+2014 em dashes at lines 476, 523, 652 and 653 of the
committed file are carried as themselves. `verify/projections` ruling P5 —
`asciiDoc` transliterates U+2014 to `--` and REPORTS any code point it cannot
name — continues to govern CORPUS data, which is exactly why it is not
breached here: those four em dashes are not corpus data. They sit in prose
`cmd/kmgen` holds as its own Go string literals, and every corpus docstring
reaches this file already transliterated, through the environment reader P5
governs. The two rules do not meet.

What the emission's own quoter does with a code point outside its alphabet is
the P5 discipline restated for Go: `GoAst.goQuote` escapes the four bytes
`strconv.Quote` escapes over printable ASCII plus the line feed a docstring
carries, and REPORTS the code point of anything else rather than inventing a
`\u` spelling. The report is a row of `emissionFailures`, so the generator
refuses before printing.

Alternatives: transliterate the four em dashes and change the Go file (a byte
change no evidence asked for, breaking parity with `cmd/kmgen` for a rule that
was never about this text); widen P5's table (it would then silently permit a
docstring em dash to survive into the corpus, which is the thing P5 exists to
stop). Why: byte parity with the committed file is the ticket's claim, and the
conflict the artifact flagged dissolves once the two channels are named
separately. The TypeScript lane resolved the same conflict the same way.
**Load-bearing? yes** — 4 bytes on 4 lines, and the rule that keeps the other
channel closed.

### G5. The printer's intermediate carries one separator and no formfeed

Decided: `GoPrinter.lines` emits `\t` and `\n` and nothing else. `go/printer`
distinguishes a soft alignment cell (`\v`) from a hard indentation column
(`\t`), and emits `\f` where a column block must be broken; its own trimmer
folds `\v` into `\t` and `\f` into `\n` on the way out.

Measured, twice, over the committed file: (a) the `tabwriter` output of the
trimmed text is byte-identical WITH and WITHOUT `DiscardEmptyColumns`, because
the flag only discards a column whose cells are all empty AND all soft, and
after the fold no cell is soft; (b) the trimmed text — every formfeed already
a newline — re-tabwrites to the committed bytes, because every column block
this file wants broken is already broken by a line with too few cells. The
Lean `--raw` output is byte-identical to `go/printer`'s own `RawFormat`
output over the committed file, which is what makes (a) and (b) statements
about this printer and not only about `go`'s.

`tabwrite` still computes `discardable` the way `tabwriter` computes it, and
always finds it false, so the simplification is visible in the code rather
than hidden by it.

Alternatives: carry `\v`/`\t`/`\f` and reimplement the trimmer (a third pass
whose only observable effect on this file is nothing). Why: an unexercised
distinction in a printer is a place for a wrong answer to hide.
**Load-bearing? no** — it changes no byte, but it is a measured claim and a
future target with a genuinely discardable column would have to revisit it.

### G6. The generator refuses what its own consumer refuses

Decided: `goemit` runs `Unity.Emit.emitFailures` — the interchange emitter's
own document checks — BEFORE its Go-side checks, and prints nothing if either
speaks. The Go-side checks are `cmd/kmgen`'s: identifiers are CLAIMED in
order, so a second claim on one name is refused with both origins named
(`clock-read` and `clock_read` both render `ClockRead`), and any corpus value
the escape table cannot name is refused with its code point.

Alternatives: let the Go compiler catch the collision (it reports the symptom
at the wrong layer and leaves a half-written emission on disk); check only
what the Go spelling adds (a generator more tolerant than its own consumer
bakes the defect into compiled code). Why: this is the control the existing Go
gate already runs and the Lean side is not allowed to lose. The gate executes
it, with a mutation that makes two kinds mint one identifier.
**Load-bearing? yes.**

### G7. The generator's prose is transcribed, and the wall says so

Decided: the banner, the five section rules and every doc comment are authored
text with no derivation on either side — `cmd/kmgen` holds them as Go string
literals, `Unity/GoTables.lean` holds them as Lean string literals. Byte
parity over that 36.8% of the file is a TRANSCRIPTION CHECK. The load-bearing
half of the parity claim is the 63.2% that is corpus data, plus 100% of the
layout, neither of which either side transcribes.

Two smaller transcriptions ride along because `cmd/kmgen` makes them too, and
mirroring them exactly is what keeps the comparison honest: `writeApplicability`
and `writeValueLevelBrands` take no corpus argument, so `"machine-applicable"`,
`"advisory"` and the refusal identifier `ReasonCrossSortIdentifier` are
template text on both sides. That last one is a latent coupling in the Go
generator — renaming the `cross-sort-identifier` refusal in the model would
produce a generated file that does not compile — and it is reported as a
finding rather than repaired here, because repairing it would move bytes this
ticket is walling.

Alternatives: derive the prose from the committed file (that is copying the
answer, and it would make the wall self-referential); claim independent
derivation for the whole file (untrue). Why: a wall that hides which half it
is actually testing is a wall that lies. **Load-bearing? yes** — it is the
scope of the claim.

### G8. `GoAst` lands in `verify/unity`, beside the corpus data

Decided: `Unity/GoAst.lean`, `Unity/GoPrinter.lean` and `Unity/GoTables.lean`
live in `verify/unity`, which already owns the corpus data, rather than in
`verify/projections`, which owns the language-neutral AST. This is the
coordinator's application of the ruled A3 shape (DEV-772 sitting record,
2026-08-19) that put the TypeScript printer here for the same reason, not a
new ruling: 63.2% of the emission is corpus data, and the groups it needs —
refusal rows with law, repair and applicability, encoding vectors, admission
vectors, program vectors — are exactly the ones `verify/projections`
DECISIONS P3 declines to carry in the generic environment walk. Each package
keeps its one lawful reach: the projection reads the model, and
`verify/projections` stays kernel-by-path.

The Go module is reached ONCE, from the gate script, by two bash reads: the
committed emission it compares against, and `go/kmconform`'s own
`RealCorpusPath` constant that the banner names. Neither is a package
dependency, which is the same shape DEV-822 gave the gate script for the
manifest wall. Alternatives: put the AST in `verify/projections` and the
producer here (the AST would then have to be reachable from a package that
must not reach the corpus); give the projection a Go-module dependency (there
is none to give). **Load-bearing? yes** — it is what keeps the topology arm of
the bridge gate true.

### G9. Both generators stand; the flip is a later act

Decided: `cmd/kmgen` is NOT retired, its regeneration test is NOT retired, and
`go/kmconform/tables_generated.go` is NOT rewritten by anything in this
change. This PR proves parity and adds a wall; the flip — retiring `cmd/kmgen`
as the emitter and pointing the gate at the Lean emission — is a separate
isolated act, the way DEV-812's was.

Why: the two generators are what makes the comparison mean anything. The
moment one of them writes the file the other checks, the wall stops comparing
two derivations and starts comparing a generator with itself.
**Load-bearing? yes** — it is the difference between a parity wall and a
regeneration check.
