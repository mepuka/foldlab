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
