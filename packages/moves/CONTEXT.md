# packages/moves — module vocabulary

Local terms hidden behind the seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**The kernel**:
`src/kernel.ts` — the move calculus as pure functions over immutable
state, parametric over the carriers exactly as the Lean model is
parametric over its typeclass context. `makeKernel` fixes a carrier the
way the model's `section variable` block does.

**Candidate set**:
A canonically sorted, deduplicated array of holder-attributed
`(value, holder)` pairs under the lexicographic value-then-holder
comparator — the array rendering of the model's extensional tree set.
Insertion order is forgotten by construction; that forgetting is what
the fence theorems stand on.

**The corpus**:
`fixtures/moves-conformance.ndjson` — 2000 traces and their verdicts,
emitted by the Lean model itself (`verify/moves/Main.lean`). A memoized
prefix of the oracle, not an independent artifact: regeneration is
byte-identical or the gate fails.

**Verdict**:
One corpus line: the trace plus everything the model says about it —
primitive partial run, repaired partial run, total run with receipts,
the same bag reversed, and the fence choices at disputed terminal
holes. The TS kernel must reproduce the whole line from the trace
alone.

**Receipt**:
The total runner's per-intent admitted/refused bit, aligned one-to-one
with the input list. The receipt list is the by-construction audit log;
refusal is observable, never an abort.

**Mutant**:
A deliberately unlawful semantics planted in `test/mutants.test.ts`,
each dropping exactly one proved law. The corpus must kill every
mutant; the lawful kernel must survive. A wall that cannot fail proves
nothing.
