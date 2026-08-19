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
# verify/unity — decisions the dispatch did not fix

Format per entry: what was decided / alternatives / why / **load-bearing?**
yes | no | maybe (grill the yeses first). Task-local placeholders follow the
numbering rule in `proto/DECISIONS.md`; repository D-numbers are assigned at
merge.

## The TypeScript target grammar and its byte wall

### U1. The printer lands here, and the dependency runs one way

Decided: `Unity/Ts.lean`, `Unity/TsKernel.lean` and `Unity/Sha.lean` live in
this package, and this package gains a third path require on
`verify/projections` so it can consume `ProjectionAst`. The reverse edge stays
forbidden and is now walled from both sides: the toolkit's own gate refuses a
second path dependency, and this gate refuses an `import Unity` anywhere in the
toolkit's sources.

Alternatives: put the printer in the toolkit (its topology arm forbids reaching
the corpus, and roughly a third of the target is corpus data); copy the corpus
into the toolkit (a second copy of the one thing that must not have one); read
the corpus back out of the committed fixture from inside the toolkit (the same
reach, spelled as a path).

Why: the operator's placement ruling. The corpus lives here; a printer that
needs it belongs beside it. **Load-bearing? yes** — it is the whole placement
question the ticket was gated on.

### U2. The emitter reads the corpus from the emission, not from a file

Decided: `Unity.TsKernel.emit` is handed `Unity.Emit.document` — the lines this
package's own emitter computes — and derives the provenance digest over those
bytes. It never opens the committed interchange.

Alternatives: read the committed fixture by path (what the runtime-side
renderer does); take the corpus as a command-line path argument.

Why: the gate already proves `document` byte-identical to the committed
fixture, so reading the emission is strictly stronger than reading the file —
a corpus that fails its own emit-time checks never reaches the projection at
all, and the entry point refuses before printing a byte. It also means the one
input a surface's provenance names is a digest of what the model computed,
never of what happened to be on disk. **Load-bearing? yes** — it is why the
emitted `Corpus:` line is a claim about the model rather than about a file.

### U3. The reviewed refusal roster is committed here as data

Decided: `refusal-meanings.ndjson` carries the draft marker, the forty-four
runtime refusal spellings in persisted order with their standing meanings, and
the sixteen model-emitted reasons with theirs. The emitter reads it through
`--meanings=`; it is canonical JSON, one record per line, and it was extracted
mechanically from the runtime package's own reviewed module rather than
retyped.

Alternatives: teach the model to carry meanings (they are prose under operator
review, and the corpus has no field for them, by design); read the runtime's
TypeScript module from Lean (parsing a target language to generate it is the
defect this ticket exists to remove); inline the sentences in Lean source (the
same twin, with no wall between the copies).

Why: the meanings are the one input that is neither derived nor computed, so
they enter as data through a named door. The duplication with the runtime
side is real and is WALLED rather than tolerated: the committed surfaces were
rendered from the runtime's copy, this emitter renders from ours, and the byte
wall compares the two renderings — so the copies cannot part company without
reddening the gate. The runtime copy survives the flip because the prose
renderer still reads it; retiring it belongs to that slice. **Load-bearing?
yes** — it is the one place a transcription error could have made both sides
agree on a falsehood, and the wall is what forecloses it.

### U4. SHA-256 is implemented in this package

Decided: `Unity/Sha.lean` implements FIPS 180-4 SHA-256 over bytes, total and
fuel-free, with no new lake dependency.

Alternatives: shell out to a host digest tool from the entry point (a gate that
depends on which coreutils the host ships); take the digest as an argument
(then the provenance is asserted, not derived); add a dependency (forbidden).

Why: a surface's provenance is a digest of its source, so the emitter has to be
able to take one. The oracle is outside the implementation: `coreutils sha256sum`
agrees with it on the standard vectors and on the committed corpus, and the
byte wall fails the moment the two stop agreeing. **Load-bearing? yes.**

### U5. Layout is data on the tree, never a width the printer recomputes

Decided: containers, calls and type aliases carry a `Layout`, the generator
sets it, and `Ts.flatWidth` is exported for a generator that has to reproduce a
renderer's width test. The printer itself consults no column budget.

Alternatives: give the printer a width and let it break greedily (it would
agree with the committed bytes by coincidence on this corpus and part company
the first time a name grew); hard-code each site inside the printer (the
printer stops being a function of its tree).

Why: the measured layout engine is a per-site table, not one algorithm — four
sites break with no width test at all, one omits the indent term every other
site includes, and one width test excludes the trailing comma the caller
appends. A printer that normalized any of that would move committed bytes.
**Load-bearing? yes.**

### U6. The grammar is sized to all four surfaces; only two are emitted

Decided: `TsType`, `TsExpr` and `TsStmt` carry the whole measured spine of the
four generated files, and the module docstring names which constructor carries
each measured kind. This slice emits two of the four.

Alternatives: carry only what the two emitted surfaces need (the next slice
reopens the grammar, and a grammar that grows per consumer is not a grammar);
carry a raw-text escape hatch (which is how a target grammar stops being one).

Why: the census is the target's vocabulary, and the vocabulary is one fact
about the target rather than one fact per emission. The cost is stated rather
than hidden: the constructors the other two surfaces need compile and print and
are not yet exercised by any committed wall, and the README says so.
**Load-bearing? no** — but the unexercised set is a bound, and an unstated
bound is a claim.

### U7. The em dash rides through verbatim on this target

Decided: the TypeScript printer applies no ASCII transliteration. The em dash
reaches the emitted bytes as itself, and a gate arm pins exactly two
occurrences per surface with no other code point outside ASCII.

Alternatives: apply the projection toolkit's `asciiDoc` fold, which is the rule
the prose target obeys.

Why: measured. The committed surfaces carry U+2014 verbatim, and applying the
prose fold here moves six lines across the four generated files — including
line 2 of every one of them. The transliteration is a rule of the interchange
and of the prose register, not of this target, and the two registers are
adjacent enough that the rule is walled rather than remembered.
**Load-bearing? yes.**

### U8. Law 10 needed no reconciliation on these two surfaces

Decided: nothing about the emitted headers was changed. Both covered surfaces
already carry a digest and a format and nothing else — no path, no command, no
ticket, no parenthetical — so the pre-approved resolution (parity measured over
the body, with the clean header landing at the flip) was not needed and was not
used. Parity is over the whole file, first byte to last.

The residual is real but is in the two surfaces this slice does not cover:
`KernelSchemas.generated.ts` and `KernelBuilder.generated.ts` both still carry
a `Corpus:` path, a `Command:` invocation and a `Source:` path in their module
headers, and their `*_PROVENANCE` records carry the same three as data. That is
a law-10 finding against those two files, filed rather than fixed here, and the
slice that emits them is where the clean header lands. **Load-bearing? yes** —
it is the difference between a resolution taken and a resolution not needed.

### U9. The flip retires the renderer, and the byte wall moves to this gate

Decided: with parity holding on both files, the runtime package's
`scripts/kernel-tables.ts`, `scripts/generate-kernel-tables.ts` and
`scripts/check-kernel-tables.ts` retire, along with their two package scripts
and their entry in the fast test chain. The byte wall for those two surfaces is
this package's gate. The reviewed roster module stays, because the prose
renderer still reads it.

Alternatives: keep both renderers and wall them against each other (two
generators for one surface is the defect, not the remedy); have the runtime
check shell out to `lake exe ts` (the battery would then need a Lean toolchain,
which the repository contract deliberately keeps out of it).

Why: this is the same discipline the interchange itself already lives under —
`kernel-conformance.ndjson` is proven a fresh regeneration by this gate and by
nothing in the battery — applied to the surfaces projected from it. The cost is
stated plainly: between a corpus change and a run of this gate, the battery no
longer notices a stale surface. That is a coverage change the coordinator is
being asked to sequence, which is why the flip is one isolated commit.
**Load-bearing? yes.**

### U10. Mutation arms edit sources in place, and the restore rides the trap

Decided: the four printer mutations copy the file, `sed` it, rebuild, demand
the surface moved, then restore and demand it comes back byte-identically. A
mutation whose anchor stops matching fails loudly rather than passing
vacuously, and the restore is registered on the same EXIT handler the temporary
files use, so a run that dies mid-arm still leaves the tree as it found it.

Alternatives: mutate a copy of the package (a rebuild of a copy is not a
rebuild of the package); assert the rules by reading the source (a grep that
proves a constant is present proves nothing about what it spells).

Why: it is the house pattern, and it is the only shape that shows a rule is
load-bearing rather than merely present. **Load-bearing? no** — but a gate that
cannot fail proves nothing, and these are the arms that make it able to.

## The MCP tool-schema target and its reviewed convention manifest

### J1. The wire-convention table is a reviewed manifest beside the printer

Decided: `Unity/JsonSchemaManifest.lean` carries the naming map, the carrier
map, the trigger correspondence, the citation set and all forty-five prose
paragraphs as Lean data, on the runtime-refusal-roster pattern: a small datum a
person ratifies, read by a generator, never computed. Its header states what it
is, the ruling that homes it, and the model as its destination — once the
kernel carries constructor-level and field-level docstrings the prose is read
out of the environment and these rows shrink to the naming and carrier
decisions that stay genuinely conventional.

Alternatives: put the table inside the printer (a convention nobody can find is
a convention nobody reviews); wait for model docstrings (the ticket's own
recut measured that roughly 80% of the artifact has no model source, so the
wait is indefinite); hand-author the schema and wall it (the debt this slice
discharges).

Why: the operator ruled it on 2026-08-19, closing A3's deferred sub-row. What
makes the ruling work rather than merely file the debt is that the manifest is
RECONCILED, not trusted: the printer refuses a row whose model path the walked
environment cannot answer, and refuses a model field no row names.
**Load-bearing? yes** — it is the whole shape of the slice.

### J2. Every shape is derived; only names, fragments and prose are reviewed

Decided: the projection AST decides the tool set and its order, every property
and its order, which properties are required, every enum's members and their
order, and every carrier lookup. The manifest decides the wire spelling of each
property, the JSON fragment each model sort travels as, the trigger
correspondence, and the prose. The split is checked in both directions rather
than described: a manifest row is validated whether or not the walk reaches it,
and a row filed under a tool its own model constructor does not project is
refused as unreachable.

Alternatives: carry the property order in the manifest (then the artifact stops
being a projection and starts being a transcription); derive the names by rule
(measured: five rules and thirty-six rows, six of the wire names carrying
compound self-descriptive spellings with no model source at all).

Why: the emitted property order is EXACTLY the model's declaration order with
flattened fields expanded in place — including `kernel_trigger`'s eleven
properties, which fall out of `Act.trigger`'s two fields followed by the closed
trigger grammar's own constructor order. That was measured against the sketch
and matches it row for row, so the derivation is the sketch's implicit rule
made explicit rather than a new one. **Load-bearing? yes.**

### J3. The seven stale ceilings are dropped, and a ceiling is refused

Decided: `{"type":"integer","minimum":0}`, seven times. `minimum` stays because
`Nat` is non-negative and that is a model fact; the ceiling goes because
DEV-807 ruled estate integers exact and unbounded and the conformance corpus
carries a gated witness above the retired double-safe range. `IntegerDomain`
carries a `ceiling` field whose only lawful value is `none`, so a reviewer who
writes the ceiling back gets a refusal naming the ruled domain rather than a
schema that cannot spell a corpus-legal identity.

Alternatives: drop the field (then the ruling is enforced by absence, and an
absence is not a wall); keep the sketch's bound for parity (a projection that
cannot spell a corpus-legal value is refused by its own logic).

Why: this is the one correction that changes what the artifact ACCEPTS rather
than how it reads. **Load-bearing? yes** — the refusal arm is the only thing
that would notice the domain being re-narrowed.

### J4. The digest pattern is the running system's, not the model's

Decided: `^sha256:[0-9a-f]{64}$` on all fourteen digest fragments. The sketch's
own paragraph said why it could not: the model uses short identity labels and
the running system carries sixty-four lowercase hex characters. The width is a
wire fact with no model source, so it lives in the manifest beside the
corrected integer fragments.

Alternatives: carry the model's `+` pattern forward (a served artifact that
validates a two-character digest is a served artifact that lies).

Why: the emitted schema is for clients, and a client checks what the pattern
says. **Load-bearing? yes.**

### J5. One key order, one layout, one alphabet

Decided: a property schema is `type`, `enum`, `pattern`, `minimum`,
`description` — the discriminator, the constraints from most closed to least,
then the sentence. An object always expands, two spaces per level; an array of
scalars is one line, an array of objects expands. Every string is folded
through the interchange's ASCII table and then escaped, so the escape rule
closes over exactly three cases and the closure is a fact about the alphabet
rather than a bet on the corpus.

Alternatives: reproduce the sketch (it wrote six different per-property key
orders and twelve of thirty-six property objects on one line — there is nothing
to reproduce); sort keys (nothing in the artifact is in sorted order and
sorting would move every node); carry the em dash verbatim as the TypeScript
target does (U7).

Why the alphabet differs from U7: that decision was MEASURED against committed
bytes that carry U+2014 and had no freedom. This target has no committed
successor to match, and an MCP schema is read by arbitrary client stacks, so it
takes the interchange's rule — which also means a docstring reaching a code
point the table cannot name reddens the emission instead of arriving mangled.
The gate plants U+00A0 and observes the refusal. **Load-bearing? yes** — the
escape path is unexercised by the corpus and is proven by a planted control.

### J6. The four unledgered citations are named, not laundered

Decided: the reviewed prose cites nine laws; five resolve in `citations.txt`
and four do not. Each carries a `CitationStatus` row, the gate reconciles both
ways, and the four are printed by name every run under an UNLEDGERED banner.
A row that claims the ledger carries it reds; an UNLEDGERED row the ledger
later grows also reds, so the posture cannot rot in either direction.

Alternatives: edit the reviewed prose to cite only ledgered laws (editing
reviewed prose to suit a wall is the wrong repair); emit the citations
unmarked (laundering); block the slice on the model's citation growth (work
this lane does not own).

Why: the gate should be honest about a gap without pretending to close it. The
repair is the model's, and the banner is what keeps it visible until then.
**Load-bearing? yes** — it is the difference between a known gap and a silence.

### J7. The successor is emitted here; the sketch is not retired here

Decided: the artifact is `artifacts/tools.schema.json`, committed beside the
gate that proves it a fresh regeneration. The hand-derived sketch stays where
it is, unread by anything but this gate's divergence census.

Alternatives: overwrite the sketch in place (its tree is read-only to the
projection toolkit's own topology wall, which holds `verify/kernel` unchanged);
delete it in this slice (the house pattern is that a flip is one isolated act,
and the divergence census wants both files present to measure).

Why: the divergences are ruled, not resolved by fiat, and a reviewer should be
able to read both. The served copy's home and the sketch's retirement are the
next act. **Load-bearing? no** — but it keeps the retirement reviewable.

### J8. Parity is parity of intent, and every divergence is named out loud

Decided: the gate does not diff the emission against the sketch. It pins the
counts on both sides — seven ceilings there and none here, fourteen short
digest patterns there and fourteen wide ones here, nine em dashes there, twelve
one-line objects there — and prints six `DIVERGENCE` lines, each marked ruled
or pre-filed.

Alternatives: a byte diff with an allow-list (an allow-list that grows is a
parity claim that means nothing); no comparison at all (the ticket's evidence
of done is the divergences filed with their measurements).

Why: the sketch was hand-derived and four of its rows were already known
defects before this slice started. Diffing against it would measure the sketch,
not the printer. **Load-bearing? yes** — it is what makes "the sketch retires
at parity of intent" a checkable sentence.
