# The expressive-power dossier: compositionality of proof

Author: expressive-power team (Opus), 2026-08-13, isolated worktree. Reweighted
after coordinator re-steer to make **compositionality of proof** the organizing
spine. This is a **design dossier — prose and type signatures only, no
machinery.** Every Effect API is confirmed against the pinned vendored source
`repos/effect/packages/effect/src/*` at `effect@4.0.0-rc.108`; citations are
`file:line`. Every capability carries a **status label** — SHIPPED (walled or
tested today), RATIFIED-UNBUILT (decision made, no build), ASPIRATIONAL — and a
**consumer**, because a capability whose only consumer is its own test is a
deletion candidate (the mint rollback, NEXT.md). Every *theorem* is labelled
with the **rung it actually reaches** (R0 fixtures … R5 mechanized proof); the
free-monoid and CALM framings below are **arguments toward R5, not R5 claims**.

Reading frame, in one paragraph. An event stream is a left fold twice over: a
**hash fold** whose result is the chain **head** (identity — what history
happened) and a **state fold** whose result is the meaning (what history did).
The two disagree on purpose — "the chain remembers what the fold forgives"
(`stream.ts:1-24`, CONTEXT.md). That one shape recurs at every altitude: a
value's parts, an identity's events, a schema's AST, codegen over that AST.
Three sorts organize everything — **evidence** (recomputable, federates,
monotone), **decisions** (disputable, single-homed behind the effector's CAS),
**absence** (typed refusal). And one policy governs the surface: **rights follow
proofs** (ADR-0010). The dossier's claim is that these are not four separate
ideas but one: *foldlab's abstractions carry their licensing law in a form that
composition preserves and building inherits.* That is the expressive power.

---

## 1. The thesis: compositionality of proof

Define the property precisely. An abstraction is **proof-carrying** when it
ships with the law that licenses it (ADR-0010). It is **compositionally**
proof-carrying when two further things hold:

- **Inheritance.** A construction *built on* it needs no re-proof — the law is
  transported to the derived object by the construction itself.
- **Closure.** Two of them *composed* yield a third that still carries the law,
  without re-proving it for the composite.

Most "verified" systems have the first in patches and lack the second: you prove
a lemma, then re-prove it (or hope) at every composition site. foldlab's fold
algebra has both, and — the load-bearing move — it makes "did the proof survive
this composition?" a **decidable, mechanical check on a value**, not a proof
obligation on a human.

### 1.1 The one theorem behind P1 and P2

The free-monoid fundamental theorem (universal property of `X*`). Let `X` be the
set of events, `X*` the free monoid on `X` (finite histories under
concatenation, identity the empty history), `M = (A, empty, combine)` a declared
algebra (a monoid), and `g : X → A` a declared step (the generator map). Then
there is a **unique** monoid homomorphism `ĝ : X* → M` extending `g`. That `ĝ`
*is* `defineFold(algebra, step).fold` (`fold.ts:60-88`): `ĝ(⟨⟩) = empty`,
`ĝ(h · ⟨e⟩) = ĝ(h) ⊕ g(e)`. Two corollaries fall out of the single word
**unique**:

- **Corollary A — invalidation-free caching (P1).** Because `ĝ` is uniquely
  determined by *which homomorphism* (the pair `(algebra, step)`) and *which
  history* (the element of `X*`), its value depends on nothing else. A memo keyed
  on `(fold digest, head)` is therefore total and immutable: there exists no
  hidden state it could go stale against, because the universal property says the
  value is a function of the key alone. Ordinary caches need invalidation exactly
  because their key *under*-determines the value; here the key determines it by
  theorem. In code the key is `${fold.digest}:${head}` and `emptyFoldCache()`
  carries no invalidation state (`foldCache.ts:45-51`); the fold digest is
  `sha256` over `{v:"foldlab.fold.v1", algebra, stepDigest}` (`fold.ts:42-57`).

- **Corollary B — parallel and incremental replay (P2).** Because `ĝ` is a
  *homomorphism*, `ĝ(u · v) = ĝ(u) ⊕ ĝ(v)` for all histories `u, v`. That is
  splittability at any point (the third-homomorphism split) and, with `⊕`
  associative, arbitrary regrouping (parallel). Incrementally,
  `ĝ(h · ⟨e⟩) = ĝ(h) ⊕ g(e)` is the O(1) `extend` (`fold.ts:66`).

P1 (coherence-free) and P2 (splittable) are the two faces of one universal
property: **uniqueness gives coherence-freedom, homomorphism gives
splittability.** And "the chain remembers what the fold forgives" is `ker(ĝ)` —
two histories that agree in state are congruent modulo the kernel yet remain
distinct in `X*` (distinct heads); the head is the free object, the state its
image (resonances C1: Green–Karvounarakis–Tannen, PODS 2007; the certificate's
four fields are the commuting-triangle witness).

**Rung.** The universal property is the *license* — an **argument toward R5**:
mathlib already carries `FreeMonoid.lift` and its uniqueness, so a short Lean
proof is plausible (resonances C1, unbuilt). The *evidence shipped today* is
**R1 per instance**: each declared fold generates its own identity /
associativity / split / banana-split / homomorphism-commutation suite
(`foldLaws.ts:54-188`, SHIPPED), single-implementation pinned until the Go twin
exists (ADR-0001; NEXT.md). foldlab does not credit itself with the mechanized
meta-theorem; it credits itself with the universal property as the design
argument and R1 walls as the checkable evidence.

### 1.2 The executable witness: digest propagation is proof composition

Here is the move that turns the thesis from philosophy into a running check. The
three composition primitives each either **yield a declared result — whose
digest is the literal composition of its sub-declarations, present exactly when
every sub-proof was present — or refuse identity with a typed issue naming the
first broken sub-part.** There is no third outcome, because *the digest's
preimage is the tree of sub-declarations*:

| primitive | composes | law inherited | witness of composition |
|---|---|---|---|
| `product(m₁…mₙ)` (`algebra.ts:245-284`) | algebras | product-of-monoids is a monoid | digest present iff *all* members declared; else `identityIssue` names the anonymous member (`algebraIssue`, `:239-242`) |
| `zip` (`fold.ts:79-83`) | folds | banana-split: `zip.fold = [a.fold, b.fold]` | `defineFold(product(...), productStep(...))` — inherits product's witness |
| `map` / `mapped` (`algebra.ts:310-346`) | fold ↦ derived view | homomorphism commutation | digest present iff source *and* `hom.target` declared **and** `source.declaration.digest === hom.source.declaration.digest` — a machine check that the composition is well-typed at the identity level (`:314-317`) |

So `fold.digest === undefined` is a **decidable, compositional witness that the
proof did not survive** (and `foldCache`/law-suite refuse, `foldCache.ts:34-48`,
`foldLaws.ts:63-74`); its presence is the witness that it did. This is SHIPPED
(`packages/core/src/{algebra,fold,foldCache}.ts`).

**Grill — is this proof composition or bookkeeping?** Honest answer, two layers.
(1) *By-construction inheritance*: the composite's law follows from the members'
laws by the universal properties (product-of-monoids, homomorphism composition)
— this is the argument, **not mechanized** (the meta-theorem "these combinators
preserve the laws" would be R5, unbuilt). (2) *Re-wallable instances*: the
composite is itself a `Fold`, so `makeFoldLawSuite` re-walls it at R1 on demand
(SHIPPED). What the digest tracks is that every sub-part *is declared* (carries a
canonical name and, where a suite was generated, passed it); it does not re-run
the suite for the composite — it does not need to, given the universal property,
and can if you ask. The precise shipped claim: **well-formed proof composition is
decidable by digest presence; the guarantee it stands on is a universal-property
argument (toward R5) plus optional R1 re-walling, not a mechanized meta-theorem.**

### 1.3 The spine's sharpest case: homomorphism = zero-replay derived view

Map commutation (`foldLaws.ts:172-184`): `mapped.fold(events) ===
hom.map(fold.fold(events))`. Consequence: **if the source state
`S = fold.fold(events)` is already cached at `(source digest, head)`, the derived
view is `hom.map(S)` — O(1) in time, touching zero events** — and the wall proves
`hom.map(S)` equals a full replay of the mapped fold. A builder who wants "is the
running max positive?" derives it from the cached max by `isPositiveFromMax.map`
(`algebra.ts:298-307`) without re-reading the history.

**Grill — does it deliver on the rc.108 surface, or only on paper?** Split
verdict, stated plainly:

- *The law is SHIPPED and walled.* Map commutation is a generated property case
  (`foldLaws.ts`), and `homomorphisms.isPositiveFromMax` is a real declared hom.
- *The zero-replay derivation is reachable today with shipped primitives, by
  hand*: `getFoldCache(cache, sourceFold, head)` → `{hit:true, value:S}`
  (`foldCache.ts:70-85`), then `hom.map(S)`.
- *But the ergonomic path does NOT deliver zero-replay.* `fold.map(hom).fold(events)`
  builds a new fold and **re-folds the events** (`fold.ts:84-85`,
  `mappedStep`) — a full replay of the mapped step. There is no named combinator
  `deriveMapped(cache, hom, head)` and no consumer that reads the cached source
  state and applies `hom.map` as the default.

So: the **guarantee is real and shipped; the ergonomics that cash it in are
RATIFIED-UNBUILT** — precisely the derived-view surface ticket 020 would supply.
This is the spine delivering by law and by primitive, but not yet by combinator.

### 1.4 Cross-sort composition: CALM places the coordination cost

The three-sort ontology is itself a compositional proof structure — a
**placement of coordination cost dictated by monotonicity**, not a taxonomy.
Evidence is monotone (append-only journals only grow; presence never retracts);
absence is anti-monotone (a "not present" is falsified by a later append). The
CALM theorem (Hellerstein & Alvaro, CACM 2020; proof Ameloot–Neven–Van den
Bussche, JACM 2013) says a computation has a coordination-free consistent
implementation **iff** it is monotone. Therefore:

- evidence → coordination-free → **lock-free ingress** admits with a plain check;
- absence → non-monotone → the effector's **CAS** is a price, not a choice.

And the placement *composes*: evidence built on evidence stays coordination-free;
a decision anywhere in a pipeline forces exactly one CAS at that point and no
more. This is what makes the sort transfer across levels (ticket 016 reuses it
for ontology learning: a counterexample is monotone evidence, an accepted
implication is an absence claim routed through CAS — language-ontology frontier).

**Rung.** The catalog/ingress split is **R2 + R3 SHIPPED**: TLC to closure at
the gate caps (12,707,989 states, four invariants, four negative controls) and an
Apalache inductive invariant at fixed domains with unbounded trace length
(VERIFICATION.md); the model *itself surfaced* "presence monotone ⇒ lock-free
ingress, absence anti-monotone ⇒ CAS" (NEXT.md). CALM is the **external ancestor
theorem** — the argument for why the placement is forced rather than chosen;
foldlab does not re-derive it. The Complete-CALM *placement corollary* (minimal
sync is a plain read iff `P` stable, a CAS iff `¬P` stable, with the four
sabotaged variants as only-if witnesses) is **resonances C3, aspirational**.

### 1.5 The interactive case: the concierge is proof-carrying fluency

A DSL-authoring surface where **every advertised move is guaranteed legal and
every path terminates at a decidable "done"** — with the guarantee inherited from
the grammar, not hand-maintained. The concierge (`fill` / `unfill` / `frontier`)
carries five laws, stated verbatim in `proto/wire/CONTRACT.md` and witnessed
black-box in `proto/go/protod/conformance_test.go`:

- **C1** — statelessness/determinism: "Repeating the same request against the
  same catalog returns byte-identical data" (`CONTRACT.md:70-71`;
  `conformance_test.go:503` "C1 fill and unfill are byte-pure").
- **C2** — reversibility: "unfill at the same path is the inverse of fill"
  (`CONTRACT.md:71-72`).
- **C3** — termination correspondence: "An empty frontier means zero holes and is
  exactly when `type.create` accepts the partial" (`CONTRACT.md:84-85`;
  `conformance_test.go:528` "C3 frontier empty means the decided partial
  creates").
- **C4** — no lie in the offer: "Every `legal[].example` is directly accepted at
  that path" (`CONTRACT.md:81-82`; `conformance_test.go:554` "C4 every advertised
  root fill is accepted").
- **C5** — half-built terms never leak into identity: `{"k":"hole"}` "has no
  digest, never enters `type.create`, the catalog, generated code, or the
  identity fixtures" (`CONTRACT.md:168-170`).

The compositional payoff: the frontier is a **derived artifact** — compile the
declared grammar to a tree automaton, `frontier(hole) = successor states`
(language-ontology frontier import). So C4's fluency is *inherited from the
grammar's closure law*; adding a node kind that preserves regularity extends the
concierge with no new dead-end proof. C3 + C4 together are the no-dead-end
guarantee: any advertised fill is legal (C4) and you always know when you are
done (C3). The MCP smoke test drives a whole authoring session from frontier data
alone — bare hole → list example → fill child → undo (C2) → finish → create →
publish → read (`proto/ts/test/mcp.test.ts:177-216`), an executable
demonstration that the advertised examples *compose* to a created type.
**Status: SHIPPED** (`proto/`, conformance + smoke). This is the cleanest example
in the repo of a proof-carrying *interactive* surface, and it is the theoretical
core of P7.

---

## 2. The power map

Reweighted so each entry answers: *what law does it carry, does building on it
re-prove anything, and does it compose?* Format: capability / law + where proved
/ why idiomatic Effect rc.108 can't / status / consumer.

### P1 — Invalidation-free caching keyed on (fold digest, head)
**Inherits:** Corollary A of §1.1. Building a cache needs no coherence proof —
the universal property supplies it. **Composes:** the key composes because the
fold digest composes (§1.2). **Why Effect can't:** Effect's `Cache` is a
capacity/TTL structure; nothing digests the reducer or the stream, so a hit can
never be *proof* of a replay. `Stream.runFold` (`Stream.ts:10482`) gives the
value but no identity for it. **Status: SHIPPED** (`foldCache.ts`).
**Consumer: none but its own test — the mint-rollback risk (see §4); named
consumer is ticket 020's metric engine.**

### P2 — Parallel/incremental replay from a proved split
**Inherits:** Corollary B of §1.1, walled per fold (`foldLaws.ts:137-154`).
**Composes:** yes — a zipped or mapped fold carries the same split license.
**Why Effect can't:** `Stream.runFold`/`mapAccum` (`Stream.ts:10482, 7247`) are
sequential and offer no way to certify a reducer associative, so they cannot be
safely split, parallelized, or resumed. **Status: SHIPPED** (`foldLaws.ts`).
**Consumer: its own suites today; named consumer ticket 020 + any windowed fold
(`range` is explicitly consumer-gated, ticket 014).**

### P3 — Provenance as a query over a fold
**Inherits:** span id = chain head (a fold), so a builder gets a **recomputable**
span id for free (ticket 020 span-identity law); record certificate and
trace span are one fold at two altitudes (ADR-0005); entity = quotient by
correlation key, both folds O(1), composition = fold of child anchors
(`entity.ts:29-135`, EC4). **Composes:** parent head commits transitively to
every child's exact history. **Why Effect can't:** `Tracer` *mints* opaque
`spanId`/`traceId` (`Tracer.ts:28-45`; `externalSpan` takes them as given,
`:113`) — an auditor cannot recompute an id from the work it names, and lineage
is a second system that disagrees undetectably. **Status: SHIPPED substrate
(`entity.ts`, `stream.ts`); RATIFIED-UNBUILT certificate (ticket 005).**
**Consumer: named — ticket 020 FoldlabTracer + OTLP/Langfuse bridge (006).**

### P4 — Cross-runtime equivalence as a recomputable fact
**Inherits:** one digest (`xformPipelineHead`) witnesses batch TS, Effect
`Stream`, native Go, and wasm as one transform. **Composes:** any new runtime is
admitted by one test against the same frozen pins (ADR-0001). **Why Effect
can't:** TypeScript-only; no idiomatic way to assert an Effect `Stream` and a Go
program compute the same thing; shared vectors scale quadratically and prove
nothing about a third runtime. Referee is an **independent oracle** (RFC 8785
Appendix B, `fixtures/jcs-rfc8785.json`). **Status: SHIPPED** (value / xform /
stream-bindings / wasm / JCS walls, R0/R1). **Consumer: the seam decision (Go
owns the runtime, TS authors) — real and load-bearing.**

### P5 — Deterministic replay + counterfactual from the journal
**Inherits:** `state-at-k = pure fold of first k facts` — a corollary of §1.1 and
the codata→data commitment (README). An incident becomes a permanent regression
fixture. **Why Effect can't:** an Effect program is codata; re-running
re-executes effects against a moved world. `TestClock`/`Layer` help but there is
no "replay this exact run" because the run was never a value. foldlab makes the
journal the source of truth (ADR-0005). **Status: RATIFIED-UNBUILT** (ticket 020
phase 2; needs the run journaled — ticket 008, ASPIRATIONAL). **Consumer: named —
`@effect/vitest` integration (ticket 020).** **Design worked out in
`docs/design/2026-08-13-effector-backed-workflow-replay.md`:** the rc.108
durable-execution seam is `effect/unstable/workflow` `WorkflowEngine.activityExecute`
returning `Workflow.Result = Complete | Suspended`, and replay = the effector
Register mapped onto that disjunction (`Done(fence,result) → Complete`, activity
not re-executed); the byte-exact-replay + exactly-once kernel is the G1
crash-storm gauntlet, PASSED, with the deterministic-in-the-digest precondition
stated there.

### P6 — Schema you can name, cache, diff by digest, and derive from
**Inherits:** identity commits *shape* only; every derived surface is a semantic
fold over one AST and **cannot drift because its input has committed identity**
(ADR-0006, ADR-0008, CONTEXT "Semantic fold"). **Composes:** the GF reversibility
law `parse∘linearize = id` walls all concrete syntaxes at once (ticket 015).
**Why Effect can't:** an Effect `Schema` is a live object with no stable identity
— you cannot name it, cache by it, diff two by digest, or derive a Go type from
it; the idiomatic `standardSchemaV1`/hand-written adapters drift silently (the TS
core is the *ported* surface ADR-0006 exists to remove, NEXT.md). Identity is
aligned with Effect's semantics but independent of its bytes, so a rename costs an
adapter, never a digest. **Status: interim SHIPPED (`bytes-sha256-v1`), semantic
fold RATIFIED-UNBUILT (ticket 004); the three derivation targets are SHIPPED**
(`proto/ts/src/codegen.ts`: `toEffectSchema(structure, resolve): Derived<Schema.Top>`,
`toJsonSchema`, `toGoSource`). **Consumer: `mcp.ts` derives tool `inputSchema`s
from `toJsonSchema` at startup — real.**

### P7 — Refusals that teach, mechanically — the concierge as proof-carrying fluency
**Inherits:** §1.5. Every refusal is *data* carrying law, `path`, `got`,
`expected`, a worked `example`, and `next` hints (W7/W8; `Refusal` struct,
`CONTRACT.md:124-137`); the same discipline runs through `foldCache`
(`IdentityUnavailable`, `:34-43`), `jcs` (`NonCanonicalValue`, `:16-27`), and the
stream lane (`Data.TaggedError`, `stream.ts:158-161`). The concierge's C4
mechanically guarantees fluency never dead-ends, and the guarantee is *inherited
from the grammar's closure law*, not hand-written. **Why Effect can't:** Effect
gives the substrate (`Data.TaggedError`, `Data.ts:761`) but a tagged error
carries a message, not an actionable worked example + legal-alternative set, and
nothing tests that it teaches. **Status: SHIPPED** (`proto/` conformance C1/C3/C4,
smoke; `foldCache`; `jcs`). **Consumer: the MCP agent session — typo → self-repair
→ verified read (`proto/ts/test/mcp.test.ts`). Real.**

### P8 — The lawful combinator: the wall factory (the meta-capability)
**Inherits:** ADR-0010 itself. `makeFoldLawSuite(fold, options)` emits the suite
that licenses a fold, or refuses `LawInputsUnavailable` when generators are
missing (`foldLaws.ts:54-188`). Correctness is inherited from the licensing law,
not tested per use. This is the *mechanism* of §1's inheritance-and-closure.
**Why Effect can't:** not a gap in Effect — a discipline any Effect library could
adopt and none does: a combinator may not enter the public surface without the
theorem that writes it, shipped as an executable suite bound to the object.
**Status: SHIPPED.** **Consumer: foldlab core is the first; the external consumer
is any library author (named, not yet external).** This is the most transferable
idea in the repo (§3 framing C).

---

## 3. The Effect-community deliverable

Framed, per the re-steer, **as a sharpening of ticket 020** (the register store +
Effect surface), not a product pitch — because 020 is *the real consumer that
retires the fold algebra's missing-consumer risk*, and the operator wants clean
abstractions with fluent proof-carrying build-out.

### Ranking (unchanged verdict, recast in the inheritance frame)

- **D. "Provenance for free" — RECOMMENDED.** The purest instance of the spine:
  the builder writes ordinary `Effect.withSpan` and **inherits a recomputable
  span id for free from the fold law** — re-proving nothing. It hooks the surface
  Effect devs use *right now* (`effect/unstable/ai`: `LanguageModel`, `Tool`,
  `Toolkit`, `McpServer` — `unstable/ai/`; `Tool.dynamic` at
  `unstable/ai/Tool.ts:1326`), and it is exactly ticket 020 phase 1.
- **C. "The lawful combinator" (ADR-0010) — the guarantee underneath D.** The
  spine's mechanism (§1.2, P8); SHIPPED; but its consumer is library authors, so
  it is the differentiator, not the headline.
- **A. "Verifiable Effect Streams" — the engine of D.** Most SHIPPED substrate
  (`runFold`, `foldCache`, `foldLaws`); abstract until pointed at telemetry.
- **B. "Schema with identity" — the right *second* deliverable.** Its keystone
  digest (ticket 004) is unbuilt; recommending it now overclaims (§4).

**Recommendation: sharpen ticket 020 into "your Effect runtime, made
recomputable" — the FoldlabTracer + verifiable-fold Layer.** Ship D on the A
engine, sold with the C guarantee. The one-line why: *nothing in Effect turns an
ephemeral effectful run into a citable, cacheable, replayable fact, and this does
it by inheritance — the developer writes the Effect they already write and the
fold law hands them recomputable identity, an invalidation-free cache, and
deterministic replay for free.*

### The Effect-idiomatic surface (signatures confirmed against rc.108)

The spine already exists in-repo (`foldBindings.ts`, confirmed against
`Stream.runFold`, `Stream.ts:10482`):

```ts
// SHIPPED — packages/core/src/foldBindings.ts
export const runFold:
  <Event, A extends FoldState>(fold: Fold<Event, A>) =>
  <E, R>(self: Stream.Stream<Event, E, R>) => Effect.Effect<A, E, R>
```

A **committed run** returns both folds and memoizes at `(fold.digest, head)`.
The head fold and the meaning fold are one pass — the "two folds" as a single
`Stream.runFold` over accumulator `{ head, state }`:

```ts
export interface Run<A extends FoldState> {
  readonly head: Head          // identity fold — recomputable by anyone
  readonly value: A            // meaning fold — memoized at (foldDigest, head)
  readonly foldDigest: string
}
// Composes Stream.runFold (:10482) with the chain-head fold (stream.ts extend),
// then putFoldCache (foldCache.ts:53). Refuses IdentityUnavailable for anonymous folds.
export const runCommitted:
  <Event extends StreamEvent, A extends FoldState>(fold: Fold<Event, A>) =>
  <E, R>(self: Stream.Stream<Event, E, R>) =>
    Effect.Effect<Run<A>, E | IdentityUnavailable, R>
```

The **FoldlabTracer** provides Effect's tracer service. Confirmed: `Tracer.Tracer`
is a `Context.Reference<Tracer>` (`Tracer.ts:631`), so the Layer is
`Layer.succeed(Tracer.Tracer, foldlabTracer)`; the tracer's `span(...)`
(`Tracer.ts:28-45`) returns a `Span` (`:371`) whose `spanId`/`traceId` foldlab
sets to the segment's **chain head** — and `Tracer.externalSpan({ spanId, traceId })`
(`:113`) is the exact injection point. Layer idioms confirmed in
`proto/ts/src/mcp.ts` (`Layer.succeed`, `Layer.provide`):

```ts
// Proposed. Needs only the narrow-writ client (publish facts, read journals).
export const FoldlabTracer: Layer.Layer<never, never, ProtoClient>
```

**Metrics as folds.** `Metric<Input, State>` (`Metric.ts:111`) with `Metric.counter`
(`:2091`), `Metric.gauge` (`:2177`), `Metric.summary` (`:2426`) maps onto declared
folds: a counter *is* `algebras.count`, a gauge summary *is*
`product(min, max, sum, count)` (`algebra.ts:237, 245`). Each metric inherits
digest identity and the invalidation-free cache (P1):

```ts
export const foldMetric:
  <A extends FoldState>(name: string, fold: Fold<StreamEvent, A>) =>
  Metric.Metric<StreamEvent, A>
```

**Replay-from-journal** (ticket 020 phase 2), the "I need this" climax:

```ts
export const replay:
  <Event extends StreamEvent, A extends FoldState>(fold: Fold<Event, A>) =>
  (journalHead: Head) => Effect.Effect<Run<A>, ReplayGap, ProtoClient>
export const branchAt:
  <Event extends StreamEvent>(journalHead: Head, k: number, alt: Event) =>
  Effect.Effect<Head, ReplayGap, ProtoClient>
```

Every refusal is `Data.TaggedError` (`Data.ts:761`) or the proto `Refusal` struct
— never a throw (W8, P7). **Honest dependency split:** `runCommitted`/`foldMetric`
are pure and buildable today (`foldCache` + `foldBindings`);
`FoldlabTracer`/`replay`/`branchAt` need the `ProtoClient` writ
(`proto/ts/src/client.ts`) and the journal, which are pre-graduation
(`proto/` has not moved into `packages/`, NEXT.md backlog 4).

### The smallest demo that proves it

Two runs, one assertion, no daemon — demonstrating inheritance directly:

1. `const f = defineFold(product(algebras.min, algebras.max, algebras.sum,
   algebras.count), productStep(...))` — a gauge summary; it *has* a `digest`
   because every member is declared (§1.2).
2. `pipe(stream, runCommitted(f))` over `Stream.make(...events)` → `Run`. Assert
   `head === headFrom(streamSeed(s), events)` recomputed independently
   (`stream.ts:115`) — **the span id is recomputable, not assigned** (inherited
   from the fold law, no proof written by the builder).
3. A second identical run is a cache *hit* at `${foldDigest}:${head}`
   (`foldCache.ts:70`) — **invalidation-free memo, by uniqueness.**
4. Mutate one event → fresh `head`, fresh key, fresh compute — **no coherence
   logic ran, yet the cache is correct.**

One `@effect/vitest` file over SHIPPED core plus the `runCommitted` wrapper; it is
the seed FoldlabTracer and `replay` grow from.

---

## 4. The honest edge

**The central risk: the fold algebra has no non-test consumer.** `foldCache`,
`makeFoldLawSuite`, `defineFold` are SHIPPED and tested, yet *nothing consumes
them but their own tests* (NEXT.md: `range` is consumer-gated; the metric engine
is ticket 020, RATIFIED-UNBUILT). This is the exact shape that deleted mint —
"nothing called `mint()` except its own test." **If ticket 020 does not land, the
entire §3 deliverable and P1/P2/P8 are deletion candidates.** The recommendation
is therefore also the risk's retirement: 020 is the first real consumer. State it
plainly — the expressive power is real but currently *speculative* in the precise
repository sense.

**Proof composes by construction, but the meta-theorem is unproved (§1.2).** The
shipped guarantee is: digest presence decides well-formed composition; members
are R1-walled; the composite is re-wallable. The *meta*-theorem that the
combinators preserve the laws is a universal-property argument, **not mechanized**
(would be R5; resonances C1). Do not sell "proof composition" as "machine-checked
composition."

**The zero-replay derived view is a law, not yet a combinator (§1.3).** Map
commutation is SHIPPED and walled and the derivation is reachable by hand, but the
ergonomic `fold.map(hom).fold(events)` path **replays**; the O(1)
cached-source-plus-`hom.map` path has no named combinator or consumer
(RATIFIED-UNBUILT, ticket 020's derived-view surface).

**Recomputability ≠ fidelity to intent.** foldlab's claim is that *what was built
is recomputable*, never that it *means what you meant* (VERIFICATION.md;
language-ontology frontier). The field's word is "grounded"; ours is
"recomputable" — strictly stronger *and strictly narrower*. Do not let
"verifiable" be heard as "correct." For the grammar foundry, grammar-constrained
decoding distorts the model's conditional distribution (GAD, NeurIPS 2024):
forced validity is syntactic, never semantic; and positive-example-only authoring
is unlearnable (Gold 1967), so the C1–C5 refusal round-trip is load-bearing, not
UX.

**Byte-coarse schema identity, today, with a recursion hole.** Shipped identity is
`bytes-sha256-v1` over submitted canonical bytes, so semantically identical
schemas with different byte forms differ in identity until ticket 004's SchemaAST
fold lands; and a catamorphism does not terminate on a cyclic AST, so the digest
is *underdefined on `Suspend` nodes* — safe today only because refs-must-resolve
forces a DAG (resonances B, Unison cycle rule owed). P6's "diff by digest" is only
as good as the interim scheme.

**Exploration bounds are minimum-cardinality, not small.** The ontology
explorer's canonical basis can be exponential and next-question is coNP-complete
(VERIFICATION.md). "Bounded" is not "cheap."

**Absence has no proof; equivocation is unaddressed.** Every "not present" is a
daemon assertion (resonances D); lineage-as-query is a *convenience* claim, not
yet a *verifiability* claim, until sorted-key Merkle non-inclusion lands. And
recomputation proves self-consistency, **not** that everyone saw the same history
— split-view equivocation is irreducibly social.

**Determinism has a deadline; the effectful surface is outside the deterministic
core.** P4 rests on RFC 8785 + JCS agreement, R1-differential-tested against an
oracle, not proved — and RFC 8785 is Informational (resonances D;
number-determinism dossier: a large fraction of doubles are underdetermined by
the normative spec). "Verifiable Effect Stream" means the *fold* is verifiable,
not arbitrary effects in the pipeline; Effect `Stream` is orchestration,
deliberately not digest-pinned.

**Safety only; transport pre-graduation.** No liveness claim anywhere
(VERIFICATION.md assumption 4). And the daemon-facing half of §3
(`FoldlabTracer`, `replay`, `branchAt`) depends on `proto/ts/src/{client,mcp}.ts`,
un-graduated into `packages/` (NEXT.md backlog 4); the pure half is buildable now.

---

## Appendix: rc.108 and law citations

**Effect APIs**, `repos/effect/packages/effect/src/`:
`Stream.runFold(self, initial: LazyArg<Z>, f)` — `Stream.ts:10482`;
`runFoldEffect` — `:10534`; `mapAccum` — `:7247`. `Data.TaggedError` —
`Data.ts:761`. `Tracer.Tracer: Context.Reference<Tracer>` — `Tracer.ts:631`;
`Tracer` iface `:28`; `Span` `:371`; `externalSpan` `:113`. `Metric<Input,State>`
— `Metric.ts:111`; `counter` `:2091`; `gauge` `:2177`; `summary` `:2426`. Schema:
`Schema.decodeUnknownResult` — `Schema.ts:1760`; `decodeResult` `:1795`;
`decodeEffect` `:1546`; `encodeEffect` `:2007`; codec idioms confirmed in-repo
(`schema.ts`, passes typecheck): `Schema.Struct`, `Schema.Int.check`,
`Schema.decodeTo`, `SchemaGetter.{decodeBase64,transformOrFail,transform}`,
`SchemaIssue.InvalidValue`. `effect/unstable/ai` present
(`{Tool,Toolkit,McpServer,McpProtocol,LanguageModel}.ts`); `Tool.dynamic` —
`unstable/ai/Tool.ts:1326`; `LanguageModel.generateObject` present. Layer idioms
confirmed in `proto/ts/src/mcp.ts` (`Layer.succeed`, `Layer.provide`,
`Toolkit.make`, `McpServer.{toolkit,layerStdio}`).

**foldlab laws.** Daemon **W1–W10** ratified in `proto/SPEC.md`. Concierge
**C1–C5** in `proto/wire/CONTRACT.md` (C1 `:70`, C2 `:71`, C3 `:84`, C4 `:81`, C5
`:168`), witnessed `proto/go/protod/conformance_test.go:503/528/554` (C1/C3/C4)
and `proto/ts/test/mcp.test.ts:177-216`. Fold laws generated by
`packages/core/src/foldLaws.ts:54-188`. Free-monoid framing: resonances C1
(Green–Karvounarakis–Tannen, PODS 2007; mathlib `FreeMonoid.lift`) — argument
toward R5. CALM: resonances headline 4 (Hellerstein & Alvaro, CACM 2020; proof
Ameloot–Neven–Van den Bussche, JACM 2013); placement corollary resonances C3,
aspirational. Catalog R2+R3 and effector R3+R4 rungs per VERIFICATION.md.
