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
