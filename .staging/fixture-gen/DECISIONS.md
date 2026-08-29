# Fixture-generation lane — decisions for the grill

Status: pre-grade, 2026-08-28. Everything below is open until the
operator rules. Items marked **divergence** are places this lane did not
do what its brief said; they are stated first because they are the ones
that need a ruling before anything else is worth arguing about.

---

## Divergences from the brief

### V1 — the code lives in `.staging/`, not `experiments/parser-census/gen/`

The brief permitted code under `experiments/parser-census/gen/` on
condition the estate's gates stayed green. It was not taken.

Reason: `experiments/` is artifact grade by AGENTS.md — *"Everything in
`formal/` and `experiments/` is artifact grade: functionally organized
and fully regenerable from declared sources"* — and G0's grammar, its
label vocabulary, and its atom assignments are un-ratified machinery.
C4's rule for un-ratified machinery is that it is rolled back, not
suspended; putting it in a graded tree makes rollback a deletion from
the estate rather than a discard. The whole lane therefore sits in
`.staging/fixture-gen/`, which is the grade it has actually earned.

Consequence, and the thing that needs a ruling: `.gitignore:1` is
`.staging/*`, so **the run state is not literally committed**. The
manifest is commit-ready — every input that determined the corpus is in
it — but until promotion, "committed run state" is a shape, not a fact.
This is **D1**.

Promotion, when ruled, is a directory move plus graduating the four mise
tasks into the root `mise.toml` as `gen:fixtures` / `check:fixtures`.
Nothing else changes: the generator already writes only through gates.

### V2 — the root `mise.toml` was not edited

Tasks ship in a directory-scoped `.staging/fixture-gen/mise.toml`,
mirroring `annex/coq/mise.toml`. A root task pointing into a gitignored
directory would break `mise run check` for any host that does not have
the lane. `mise run check:cas` and `mise run check:effects:research`
were run before and after and are green; nothing in `library/` or
`experiments/` was modified (`git status` clean apart from a
pre-existing untracked PDF).

Separate finding, reported not inherited: `mise run check:effects:ts` is
**RED at HEAD on this host**, at its `check-dist-consumer.ts` step —
`Cas.layerMemory is not a function` and `dist entry is missing the
Replay namespace`. That is the consumer smoke test still expecting a
surface the CAS public-surface ruling removed. It fails identically with
this lane deleted.

### V3 — noise is synthetic, not spliced from the pinned baseline projects

The brief asked for splicing into files sampled from the
`non-effect-baseline` strata of `experiments/parser-census/project-labels.json`.
All three projects that file labels `non-effect-baseline`
(`typescript-compiler`, `definitely-typed`, `wink-composer`) carry
`"localPath": null` — pinned, not materialized on this host. Fabricating
provenance was not an option (C6), so G0 ships a synthetic baseline
corpus flagged `noiseSynthetic: true`, with the three real sources
declared in the same table as `available: false` and their pins
recorded. Turning them on is a data edit once the pins are materialized.
See **D3**.

---

## D1 — Is `.staging/` the right home, given "committed run state"?

The operator's codex-operability requirement says run state is committed
data, never ambient. This lane's run state is *ambient-free* (no clock,
no entropy, no filesystem sampling) but *uncommitted* (gitignored).
Options: (a) promote the lane to `experiments/parser-census/gen/` now and
accept pre-grade material in a graded tree; (b) keep it pre-grade and
accept that the determinism gate is the only enforcement until
promotion; (c) carve a committed exception in `.gitignore` for
`.staging/fixture-gen/manifest-g0.json` alone. Recommendation: (b) until
the grammar is grilled, then (a). Contestable.

## D2 — `tagged-error-decl` is a rule the recognition lane does not have

The recognition proposal's §8 has nine rules and none of them recognizes
an R-ERR *declaration*. Its §3.7 classifies `yield* new X({…})` as
mapping to `fail`, and its v0 refuses it (`E-FAIL-NOT-DOCUMENTED`); the
class declaration itself is only "classified", never given a rule.

G0 needs a rule name to cite, so it uses `tagged-error-decl`, register
`R-ERR`, refusal `E-FAIL-NOT-DOCUMENTED`. This is a **proposal to that
lane, not a mint**: `.staging/libfree/dsl-proposal.md` was not edited
(the brief forbids it, and rule changes are ratification-gated by that
lane's own §9b.4). The question for the grill: does `tagged-error-decl`
belong in the manifest as Rule 10, and if so, what does it bind — the
class name, the tag, the field record, or all three?

This lane's dataset is the evidence for that decision: 144 labeled
positives across the full parameter sweep, with the byte spans a rule
would have to hit.

## D3 — Materializing the `non-effect-baseline` pins

Three pinned projects, no local checkouts. Until they are materialized,
the classifier's negative half is synthetic — which is exactly the
failure mode the census's own header warns about ("spine rules must fire
at ~zero here or the recognizer is hallucinating"). A synthetic control
cannot discharge that. Ruling wanted: materialize the pins for this
host, or accept synthetic negatives for G0 and defer the control-stratum
claim to G1.

## D4 — The synthetic corpus is 12 snippets; the real register is not

Twelve authored snippets cannot carry the diversity of `src/compiler/**`.
The classifier will overfit to them long before it overfits to anything
real. Related to D3; separable because even with the pins materialized
the sampling policy (how many files, sampled how, recorded where) is a
ruling — the labels file already mandates committing the sampled package
list for the DefinitelyTyped stratum.

## D5 — Class balance was engineered, and that is a choice

`M-RENAME` originally converted `TAGGED-ERROR-CANONICAL` rows into
`TAGGED-ERROR-SKEWED` ones (48 canonical fell to 30). The generator now
makes α-renaming carry the tag when the tag policy is `same`, so skew
comes only from the tag policy and the split is 48/96. The alternative
reading — that renaming a class while its tag stays put is *precisely*
the wild phenomenon worth over-sampling — is defensible and was
rejected on the grounds that the tag policies already produce that case
deliberately, and a label that drifts under mutation makes the sweep
unreadable. Reversible in one line.

## D6 — The five `rfl`-pinned target forms are cited but not sampled

`Cas/Backend/Target.lean`'s five forms are type expressions
(`Effect.Effect<A, E, R>`, `Layer.Layer<…>`, `Schema.Codec<…>`,
`Schema.Top`, `Option.Option<A>`), and G0 emits no type-position
fixtures. They are the natural source for a `T`-heavy production family
(variance annotations, elided trailing `never`s, the D1 defect stratum
the census names). Deferred, not forgotten.

## D7 — Instrument features are null, and the join key is a byte offset

`atoms-g0.jsonl` carries `tsNodeType`/`ckSyntaxKind`/`opRef` etc. as
null. The backfill contract proposed here is a join on
`(declIndex, byteSpan[0])`. That assumes the census lane's instruments
tokenize identically to this generator — they will not, exactly
(template literals, JSX, numeric separators, regex). Ruling wanted on
the reconciliation policy: nearest-containing-token, exact-offset-only,
or a generator-side switch to the instruments' own tokenization once one
is available.

## D8 — Atom `X` is 67% of all rows

22,924 of 34,467 token rows are `X`, and 9,567 more are `H`. The
informative atoms are 5% of the corpus. graphbrain's alpha stage has the
same shape and handles it with a plain random forest, but the operator
should rule on whether the training set is emitted as-is, subsampled on
`X`, or restricted to `inTarget` tokens with a separate host-context
window. All three are one flag; none should be chosen silently.

---

## Atom-assignment ambiguities

The operator asked for these to be named rather than silently chosen.
Each is a place where the design doc's closed v0 set does not determine
the answer, and each is a live question for the pattern-mining step.

### A1 — Structural keywords are `X`

`class`, `extends`, `export`, `declare`, `readonly`, `type`,
`interface`, `namespace`, `function`, `const`, `return` are labeled `X`.

The design doc defines `X` as "punctuation, trivia, imports handled by
resolution" — keywords are none of those. But `extends` is arguably the
single most discriminative token in the whole `TaggedDecl` form, and
burying it in `X` hands the classifier nothing. Two alternatives: extend
the atom set with a `K` (structural keyword) atom, or fold keywords into
`O` as part of the op-head spelling (`class … extends Data.TaggedError`
read as one head). **Chosen for G0: `X`, on the grounds that the closed
set is closed.** This is the ambiguity most likely to change a measured
result.

### A2 — Import tokens are all `X`, including the alias binder

`import { Data as D } from "effect"` labels every token `X`, per
"imports handled by resolution". But `D` is a *binder* — the whole point
of the wild register's aliased-import case is that resolution has to
bind it — and `B` exists. Labeling it `X` means the training set carries
no signal for the mechanism the recognition lane says is load-bearing
(dsl-proposal §4b.3: whitelisting is by `(module, export)`, never by
local spelling). **Chosen for G0: `X`.** Argue it.

### A3 — The tag literal in `name ≠ tag` rows is still `A`

The operator asked directly. G0's answer: **yes, still `A`**. The atom
type is a *syntactic role* — a value in op-argument position — and the
tag literal occupies that position whether or not it agrees with the
class name. Agreement is a property of the declaration, so it lives at
the declaration grain (`TAGGED-ERROR-CANONICAL` vs
`TAGGED-ERROR-SKEWED`), not at the token grain. If the operator wants
the skew visible per-token, the honest move is a second column, not a
different atom.

### A4 — `CasStoreShape` is `L`, not `T`

In `(store: CasStoreShape) =>`, the type annotation names a capability.
`T` covers "type-position tokens"; `L` covers "service tag, layer,
context member". Both fit. **Chosen: `L`**, because capability identity
is what a recognizer needs and type position is recoverable from the
instrument features. The store binder itself is `B` at its declaration
and `L` at each use in `store.put` — a name that is a binder where it is
bound and a capability where it is used. That split is deliberate and
also contestable.

### A5 — Comment tokens are `X`; template-literal bodies are `H`

`NEG-COMMENT-DECOY` rows put the exact `TaggedDecl` text inside a
comment (`X`) or inside a template literal (`H`, because it is a string
token, and strings in host code are host material). So the same 55 bytes
carry a different atom depending on the delimiter around them. That is
intentional — it is the whole point of the decoy — but it means a
token-only classifier sees a comment and a template literal as different
worlds while a text classifier sees nearly the same bytes. Worth
measuring.

### A6 — Object-literal keys inside a put payload are `A`

In `store.put({ kind: { version: 0, tag: 1 }, payload: hex("…"), refs:
[] })` the keys `kind`, `version`, `tag`, `payload`, `refs` are `A`
(argument), as are the literals. An alternative reading makes the keys
structural (`X`) and only the values `A`. **Chosen: keys are `A`**,
because the recognition lane's Rule 4 (`node-literal`) treats the key
set as *closed* — the key names are part of what is recognized, not
scaffolding around it.

### A7 — `hex` is `O`

`hex("…")` is a host helper, but §8 Rule 7 pins its bytes precisely so
that `hex(…)` may be read as a byte literal. Labeling it `O` (op head)
records that it is a recognized callee. Labeling it `H` would record
that it is host code. Both are true. **Chosen: `O`.**

### A8 — Field names in the payload record are `A`, their types are `T`

`readonly status: number` gives `status` → `A` and `number` → `T`.
`readonly` → `X` (A1). The field name sits inside the type argument, not
inside a call's argument list, so calling it `A` stretches "op-argument
position" — but the record IS the operand of `Data.TaggedError(...)<...>`
in every sense that matters to a recognizer. **Chosen: `A`.**

### A9 — Renamed identifiers keep their atoms

`M-RENAME` turns `HttpError` into `Qror`. The token is still `B`. This is
correct and is stated only because it is the property the mutation
exists to test: a classifier that has learned "`*Error` ⇒ binder of a
tagged error" must fail on these rows, and the ground truth must not
quietly move to let it pass.
