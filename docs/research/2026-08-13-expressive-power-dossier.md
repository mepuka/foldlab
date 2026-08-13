# The expressive-power dossier: what this model lets an Effect developer say

Author: expressive-power team (Opus), 2026-08-13, isolated worktree. This is a
**design dossier — prose and type signatures only, no machinery.** It maps the
genuinely novel expressive power foldlab unlocks, recommends the one thing that
would make an Effect (TypeScript) developer say "I need this," and states the
honest edge. Every Effect API is confirmed against the pinned vendored source
`repos/effect/packages/effect/src/*` at `effect@4.0.0-rc.108`; citations are
`file:line`. Every capability carries a **status label** — SHIPPED (walled or
tested today), RATIFIED-UNBUILT (decision made, no build), ASPIRATIONAL
(open) — and a **consumer**, because a capability whose only consumer is its
own test is a deletion candidate (the mint rollback, NEXT.md).

Reading frame, in one paragraph. An event stream is a left fold twice over: a
**hash fold** whose result is the chain **head** (identity — what history
happened) and a **state fold** whose result is the meaning (what history did).
The two disagree on purpose — "the chain remembers what the fold forgives"
(`stream.ts:1-24`, CONTEXT.md). That one shape recurs at every altitude: a
value's parts, an identity's events, a schema's AST, codegen over that AST.
Three sorts organize everything — **evidence** (recomputable from bytes,
federates, monotone), **decisions** (disputable, single-homed behind the
effector's CAS), **absence** (typed refusal, senders own retry). And one
policy governs the surface: **rights follow proofs** — a function enters the
public API only with the law that licenses it, shipping its generated law suite
(ADR-0010). The expressive power below is what falls out when those three
ideas are taken literally and made checkable.

---

## 1. The power map

Each entry: the precise capability, the law that licenses it and where that law
is proved or claimed, why idiomatic Effect rc.108 cannot express it today, its
status, and its consumer.

### P1 — Invalidation-free result caching keyed on (fold digest, head)

**Capability.** A memo where a *hit is a proof*, not a guess. The key is
`${fold.digest}:${head}` — the digest of the computation and the digest of the
entire history it ran over. A present entry is byte-identical to what a fresh
replay would produce, so the cache has **no invalidation logic and no
coherence protocol**: `emptyFoldCache()` carries no versioning, no TTL, no
dependency graph (`foldCache.ts:50-51`, "Uniqueness makes the empty memo
sufficient; no invalidation state exists").

**Licensing law.** Fold uniqueness — the free-monoid lift's uniqueness clause:
for a declared algebra and a declared step, `defineFold` induces *the one* fold,
and its identity is `sha256` over `{v:"foldlab.fold.v1", algebra, stepDigest}`
(`fold.ts:42-57`). If either the algebra or the step is anonymous there is no
digest, and the cache **refuses** with a typed `IdentityUnavailable`
(`foldCache.ts:34-48`). The uniqueness is claimed from the free-monoid theorem
(ticket 014, ADR-0010) and *wall-checkable per fold* by the generated suite
(P8); it is not yet a mechanized proof (would be R5 — resonances doc C1, a
short Lean proof over `FreeMonoid.lift`).

**Why Effect can't say this.** Effect has no notion of *result identity*. A
`useMemo`/`Cache`/`Ref` keyed cache in any idiomatic Effect app keys on inputs
you *hope* are the whole input, so correctness requires invalidation when
anything else changes — which is why cache-coherence bugs exist. Effect's own
`Cache` (`effect` core) is a capacity/TTL structure: it cannot state "this key
*is* the entire computation over the entire history," because nothing in the
type system digests either the reducer or the stream. foldlab can, because the
head commits to the exact event prefix and the fold digest commits to the
reducer.

**Status: SHIPPED** (`packages/core/src/foldCache.ts`, tested).
**Consumer: none but its own test today** — this is the mint-rollback risk made
concrete (see §3). Its *named* consumer is ticket 020's metrics engine
(RATIFIED-UNBUILT).

### P2 — Parallel and incremental replay licensed by a proved split law, not a hope

**Capability.** The right to fold a history in pieces and combine the pieces —
`fold(events[0:k]) ⊕ fold(events[k:])  ==  fold(events)` for every split k —
and therefore to replay in parallel, resume mid-stream, and compact a prefix to
its `(head, state)` pair without losing the final head (`stream.ts:274-310`,
the compaction two-fold law). This is the "declared right" of CONTEXT.md:
associativity licenses parallel replay and mid-stream compaction; the monoid
action licenses O(1) `extend`.

**Licensing law.** Monoid associativity + the **third-homomorphism split law**,
generated as a property suite per fold by `makeFoldLawSuite`
(`foldLaws.ts:137-154`: random split of a fixture history, fold the parts,
combine, assert canonical-byte equality to the whole). Gibbons' third-homo
theorem (resonances C9) is the ancestor. **Status of the law: SHIPPED as a wall
factory** — each declared fold *earns* the right by passing its own generated
suite (`foldLaws.ts`), single-implementation pinned fixtures until the Go twin
exists (ADR-0001 forbids a cross-language claim before a second implementation;
NEXT.md fold-algebra entry).

**Why Effect can't say this.** `Stream.runFold(self, initial, f)`
(`Stream.ts:10482`) is inherently sequential and gives you *no* way to certify
that `f` is associative — so you cannot safely parallelize it, split it, or
resume it from a checkpoint. Effect has `Stream.mapAccum` (`Stream.ts:7247`) and
grouping combinators, but "is this reducer safe to run out of order?" is a
question the library cannot even pose. foldlab poses it and answers it with a
generated proof obligation attached to the very object you fold with.

**Status: SHIPPED** (`foldLaws.ts`). **Consumer: the fold algebra's own law
tests today; named consumer is ticket 020 (metrics) and any parallel/windowed
fold** (`range(i,j)` is explicitly gated on a real consumer — ticket 014).

### P3 — Provenance as a query over a fold, not a bolt-on tracing system

**Capability.** Record-level lineage and trace-level spans are *the same fold
read at two altitudes*. A **span id is a chain head** — recomputable from the
events, never assigned (CONTEXT.md "Span"; ticket 020 span-identity law). An
**entity** is the quotient of event traffic by a correlation key, both folds
maintained O(1) per event over any backing layer (`entity.ts:29-107`).
Composition of entities is a fold of child anchors, so a parent head commits
transitively to every child's exact history (`entity.ts:109-135`, EC4). Lineage
is therefore a *query over the journal*, not a second system that can disagree
with the first (ADR-0005).

**Licensing law.** ADR-0005 (LLM/agent traffic goes through the journal;
provenance is one mechanism) + the two-fold laws of `stream.ts` (identity fold
`extend`, meaning fold `stateDigest`, verified across the compaction boundary).
The **certificate** that rides a record — `{schema digest, program digest,
input anchor, span head}` — is the commuting-triangle witness of the free-monoid
theorem (resonances C1: span head = free object, program digest = the unique
homomorphism, schema digest = carrier, input anchor = generator map).

**Why Effect can't say this.** Effect's `Tracer` assigns span ids: the tracer
*mints* an opaque `spanId`/`traceId` (`Tracer.ts:28-45`, `Tracer.externalSpan`
takes them as given). An auditor cannot recompute an OpenTelemetry span id from
the work it describes — the id is a name, not evidence. And provenance for an
LLM/agent app in Effect today is a *separate* concern (a logger, a tracer, an
eval store) whose disagreements with the actual run are undetectable. foldlab
makes the span id *be* the head of the segment's events, so the trace and the
lineage are one recomputable object.

**Status: SHIPPED substrate** (`entity.ts`, `stream.ts`), **RATIFIED-UNBUILT
certificate** (ticket 005, blocked on 004+008). **Consumer: named — ticket 020's
FoldlabTracer Layer and the OTLP/Langfuse bridge (ticket 006).**

### P4 — Cross-runtime and cross-language equivalence as a recomputable fact

**Capability.** One digest witnesses that a TypeScript batch pipeline, an Effect
`Stream` run, and a Go implementation (native *and* the same Go source compiled
to wasm) are **the same transform** — they take equal-head inputs to equal-head
outputs. `xformPipelineHead` is that digest; the wasm wall reproduces it
byte-identically from one Go source across three runtimes (NEXT.md value/wasm
walls; `xform.ts:1-15`).

**Licensing law.** Digest-equality walls over frozen fixtures generated once by
the Go side (ADR-0001; R0 in VERIFICATION.md). Equivalence is *by digest, never
by trusting a port* — a mismatch means a port drifted, not that the fixture
needs updating (AGENTS.md non-negotiable). The referee is an **independent
oracle** where one exists: RFC 8785 Appendix B's 26 rows for the JCS lane
(VERIFICATION.md R1 differential; `fixtures/jcs-rfc8785.json`).

**Why Effect can't say this.** Effect is TypeScript-only; there is no idiomatic
way to assert that an Effect `Stream` and a Go program compute the same thing.
The usual tools (shared test vectors, code review) scale quadratically in
implementation pairs and prove nothing about a third runtime (ADR-0001 rejected
alternative). A frozen digest admits any new runtime — wasm, TinyGo, a
NATS-remote node — by one test against the same pins.

**Status: SHIPPED** (value wall, transform wall, stream-bindings wall, wasm
wall, JCS differential — all passing per NEXT.md). **Consumer: the walls
themselves + the seam decision (Go daemon owns the runtime; TS is the authoring
adapter) — a real, load-bearing consumer.**

### P5 — Deterministic replay and counterfactual from the journal

**Capability.** Record a live run's journal; replay it as a *deterministic*
test; hand the continuation a different value to explore a counterfactual. An
incident becomes a permanent regression fixture (ticket 020 phase 2). Replay is
sound because `state-at-k` is the pure fold of the first k facts — the same law
that lets `compact` cross its boundary (`stream.ts:296-310`) and that `replay`
uses to reconstruct a fork's events from a content-addressed segment store
(`stream.ts:343-362`).

**Licensing law.** `state-at-k = pure fold of the first k facts` (ticket 020
replay law) — a corollary of the free-monoid uniqueness (P1) and the codata→data
commitment (README: "a live Effect program is codata; commitment through the
register turns it into data — one value, one history").

**Why Effect can't say this.** An Effect program is codata: more can always
happen, and re-running an effectful program re-executes its effects against a
world that has moved. Effect has `TestClock` and dependency injection via
`Layer`, but no general "replay this exact run deterministically" — because the
run was never captured *as a value*. foldlab captures it (the journal is the
source of truth, ADR-0005), and the fold law makes the replay provably the same
state.

**Status: RATIFIED-UNBUILT** (ticket 020 phase 2; requires the workflow
abstraction 008 to journal the run — ASPIRATIONAL). **Consumer: named —
`@effect/vitest` test integration (ticket 020).**

### P6 — A schema you can name, cache, diff by digest, and derive every surface from

**Capability.** Give a schema a stable identity (a digest), and then: cache
results keyed on it, diff two schemas by comparing digests, and *derive* every
downstream surface from the one declaration — a live Effect `Schema`, a JSON
Schema (draft 2020-12), a Go type, a GBNF grammar — each a **semantic fold** over
the same AST, none hand-written, none able to drift (ADR-0006; codegen's
`toEffectSchema`, `toJsonSchema`, `toGoSource`). Identity commits the *shapes*
of the Type and Encoded sides and nothing else; behavior, brands, and defaults
live on the tier the author chooses — a check (moves identity) or an annotation
(free) (ADR-0008, ticket 004).

**Licensing law.** Schema identity = `sha256` over RFC 8785 bytes of a
foldlab-owned canonical structure produced by an exhaustive fold of the pinned
SchemaAST (ticket 004 laws 1-8; RATIFIED, build pending). Derived surfaces
cannot drift *because their input has committed identity* (ADR-0006, CONTEXT
"Semantic fold"). The GF reversibility law `parse∘linearize = id` walls all
concrete syntaxes at once (language-ontology frontier, ticket 015).

**Why Effect can't say this.** An Effect `Schema` is a live object with **no
stable identity**: you cannot name it, cache by it, diff two of them by a
digest, or derive a Go type from it. The idiomatic move — `Schema.standardSchemaV1`,
hand-written codecs, hand-written adapters — produces ports that drift silently
(the surface census found the TS core is exactly the *ported* surface ADR-0006
exists to eliminate, NEXT.md). foldlab's identity is deliberately *aligned with
Effect's semantics but independent of its bytes*, so a v4 rc rename costs an
adapter, never a catalog entry or a digest (ADR-0006, ADR-0010 rename-fence).

**Status: interim SHIPPED (byte-coarse digest over submitted canonical bytes,
`bytes-sha256-v1`), the semantic SchemaAST fold RATIFIED-UNBUILT (ticket 004).
The three derivation targets are SHIPPED in `proto/ts/src/codegen.ts`**
(`toEffectSchema(structure, resolve): Derived<Schema.Top>`; `toJsonSchema`;
`toGoSource`). **Consumer: the MCP surface derives tool `inputSchema`s from
`toJsonSchema` at startup (`proto/ts/src/mcp.ts`) — a real consumer; ticket 004's
digest is on the critical path for 005/015/016.**

### P7 — Typed refusals that teach, mechanically tested

**Capability.** A "no" that repairs the caller. Every refusal is *data* carrying
the law that refused, the `path`, what was `got`, what was `expected`, a worked
`example`, and `next` hints — enough to self-repair without documentation
(W7/W8; `proto/ts/src/wire.ts` `Refusal` struct). The same discipline runs
through the whole stack: `foldCache` refuses `IdentityUnavailable` naming the
anonymous algebra or step (`foldCache.ts:34-43`); `jcs` refuses
`NonCanonicalValue` with a `path` and `reason` (`jcs.ts:16-27`); the stream lane
raises `MergeGap`/`MalformedPayload`/`SegmentGap` as `Data.TaggedError`
(`stream.ts:158-161, 190-192, 322-328`).

**Licensing law.** W8 (refusals are data — nothing throws across the seam) + W7
(replies teach) — witnessed black-box over NATS subjects, all nine refusal kinds
(VERIFICATION.md tracer conformance, R0/R1). AGENT-FIRST (NEXT.md principle 6):
the teaching content is *mechanically tested*, not aspirational UX. Theoretical
backing: the concierge is a *minimally adequate teacher* — a refusal carrying
(path, alternatives, example) is a counterexample plus an equivalence hint,
strictly stronger than Angluin's L* MAT contract (language-ontology frontier).

**Why Effect can't say this.** Effect *gives* the substrate — `Data.TaggedError`
(`Data.ts:761`) and `Cause` make typed errors idiomatic — but a tagged error in
a normal Effect app carries a message, not a *worked example and a legal
alternative set that a model can act on*, and nothing tests that it teaches.
foldlab's addition is the discipline on top: the refusal is part of the lawful
surface, and "does this refusal teach?" is a gate.

**Status: SHIPPED** (`proto/` conformance, `foldCache`, `jcs`, `stream`).
**Consumer: the MCP agent session — `proto/ts/test/smoke.test.ts` runs typo →
self-repair → verified read (README). Real consumer.**

### P8 — The lawful combinator: the wall factory as a reusable pattern

**Capability (meta).** A library where *every public function ships the
generated law suite that licenses it*. `makeFoldLawSuite(fold, options)` emits
monoid identity, monoid associativity, banana-split (`zip`) consistency,
third-homomorphism split, and homomorphism preservation + map commutation as a
`FoldLawSuite` of seeded property cases (`foldLaws.ts:54-188`) — or refuses with
`LawInputsUnavailable` when the algebra has no value generator or the step has no
event generator. Correctness is *inherited from the licensing law*, not tested
per use (ADR-0010).

**Licensing law.** ADR-0010 itself: a universal property's uniqueness clause
manufactures the function (`FreeMonoid.lift → defineFold`), or a proved
equation's two sides collapse into it (banana-split → `zip`; homomorphism
commutation → `map`). This is the repository's constitutional policy, and its
first embodiment is the fold algebra (ticket 014).

**Why Effect can't say this.** This is not a gap in Effect — it is a *discipline
any Effect library could adopt* and none does. Effect ships property helpers and
`@effect/vitest`, but the idea that a combinator may not enter the public surface
without the theorem that writes it, and that the theorem ships as an executable
suite bound to the object, is foldlab's. It is the single most transferable idea
here (§2 candidate C).

**Status: SHIPPED** (`foldLaws.ts`, ADR-0010). **Consumer: foldlab's own core is
the first consumer; the pattern's external consumer is any library author —
named but not yet external.**

---

## 2. The Effect-community deliverable

The question: what is the ONE thing that makes an Effect developer say "I need
this"? I rank the four candidate framings, then recommend one and give its
rc.108-idiomatic surface and smallest proving demo.

### The ranking

**D. "Provenance for free" — the journal as lineage substrate for LLM/agent
apps. RECOMMENDED.** This is the highest-leverage framing for the current Effect
moment, because rc.108 ships `effect/unstable/ai` (`LanguageModel`, `Tool`,
`Toolkit`, `McpServer`, `McpProtocol` — confirmed, `unstable/ai/` in the
vendored tree; `Tool.dynamic` at `unstable/ai/Tool.ts:1326`). Effect developers
are *right now* building agents and have no good answer to "prove what this agent
actually did." Ticket 020 already ratifies the delivery vehicle: a
**FoldlabTracer Layer** so that every `Effect.withSpan` the user already wrote
produces verifiable telemetry — zero new instrumentation. It hooks the surface
they already use; it needs no new mental model; the payoff (recomputable span
ids + replay-from-journal) is visceral.

**C. "The lawful combinator" (ADR-0010 as a reusable pattern). Strongest idea,
narrower audience.** This is the most intellectually special item in the repo
and it is SHIPPED (P8). But its consumer is *library authors*, not app
developers, so the "I need this" reaction is quieter. It belongs in the dossier
as the *differentiator underneath* the recommended deliverable, not as the
headline.

**A. "Verifiable Effect Streams" (every Stream run is a committed, recomputable
fact). Best concrete first demo, weaker standalone story.** Grounded in the most
SHIPPED substrate (`Stream.runFold` wrapper in `foldBindings.ts`, `foldCache`,
`foldLaws`). But "verifiable stream" as a product is abstract to a working
developer until it is *pointed at something they care about* — which is
telemetry and replay (D). So A is the **engine**, D is the **product**.

**B. "Schema with identity" (name, cache, diff by digest). Compelling but its
keystone is unbuilt.** The digest that makes it real is ticket 004
(RATIFIED-UNBUILT); today's identity is byte-coarse (P6). Recommending B now
would overclaim. It is the right *second* deliverable, once 004 lands.

**Recommendation: ship D, built on the A engine, sold with the C guarantee.**
Concretely: **the FoldlabTracer + verifiable-fold Layer** — "your existing
Effect runtime, made recomputable." You keep writing ordinary Effect
(`Effect.withSpan`, `Metric`, `Stream`); one injected `Layer` makes every span
id a recomputable chain head, every metric a declared fold with the
invalidation-free cache, and every run a journal fact you can replay
deterministically. One-line why: *nothing in Effect today turns an ephemeral
effectful run into a citable, cacheable, auditable, replayable fact — and this
does it with zero new instrumentation on code the developer already wrote.*

### The Effect-idiomatic surface shape (signatures confirmed against rc.108)

The spine already exists in-repo and is the anchor everything else composes onto
(`foldBindings.ts`, confirmed against `Stream.runFold` at `Stream.ts:10482`):

```ts
// SHIPPED — packages/core/src/foldBindings.ts
export const runFold:
  <Event, A extends FoldState>(fold: Fold<Event, A>) =>
  <E, R>(self: Stream.Stream<Event, E, R>) => Effect.Effect<A, E, R>
```

The new public surface (RATIFIED-UNBUILT, ticket 020). A **committed run**
returns both folds and memoizes at `(fold.digest, head)`. Because the head is
itself a left fold (`stream.ts` `extend`) and the meaning is a left fold
(`fold.fold`), the two run in one pass — the "two folds" idea expressed as a
single `Stream.runFold` whose accumulator is `{ head, state }`:

```ts
export interface Run<A extends FoldState> {
  readonly head: Head          // identity fold — recomputable by anyone
  readonly value: A            // meaning fold — memoized at (foldDigest, head)
  readonly foldDigest: string
}

// Composes Stream.runFold (Stream.ts:10482) with the chain-head fold, then
// putFoldCache (foldCache.ts:53). Refuses IdentityUnavailable for anonymous folds.
export const runCommitted:
  <Event extends StreamEvent, A extends FoldState>(fold: Fold<Event, A>) =>
  <E, R>(self: Stream.Stream<Event, E, R>) =>
    Effect.Effect<Run<A>, E | IdentityUnavailable, R>
```

The **FoldlabTracer** is a `Layer` that provides Effect's tracer service.
Confirmed: `Tracer.Tracer` is a `Context.Reference<Tracer>` (`Tracer.ts:631`),
so the Layer is `Layer.succeed(Tracer.Tracer, foldlabTracer)`; the tracer's
`span(...)` (`Tracer.ts:28-45`) returns a `Span` (`Tracer.ts:371`) whose
`spanId`/`traceId` foldlab sets to the segment's **chain head** rather than a
minted id, and `Tracer.externalSpan({ spanId, traceId })` (`Tracer.ts:113`) is
the exact injection point for a recomputed id. The Layer-construction idioms are
confirmed in `proto/ts/src/mcp.ts` (`Layer.succeed`, `Layer.provide`,
`Layer.Layer<never, unknown, Stdio.Stdio>`):

```ts
// Proposed. Requires only a client for the narrow writ (publish facts, read journals).
export const FoldlabTracer: Layer.Layer<never, never, ProtoClient>
```

**Metrics as folds.** Effect's `Metric<Input, State>` (`Metric.ts:111`) with
constructors `Metric.counter` (`Metric.ts:2091`), `Metric.gauge`
(`Metric.ts:2177`), `Metric.summary` (`Metric.ts:2426`) maps directly onto
declared folds: a counter *is* `algebras.count`, a gauge summary *is*
`product(min, max, sum, count)` (ticket 020; `algebra.ts:237, 245`). The Layer
gives each metric digest identity and the invalidation-free cache (P1):

```ts
// Proposed — a Metric whose State is a declared Fold, so its value is
// cacheable at (foldDigest, head) and its identity is fold.digest.
export const foldMetric:
  <A extends FoldState>(name: string, fold: Fold<StreamEvent, A>) =>
  Metric.Metric<StreamEvent, A>
```

**Replay-from-journal** (ticket 020 phase 2), the "I need this" climax:

```ts
// Proposed. Licensed by state-at-k = pure fold of the first k facts.
export const replay:
  <Event extends StreamEvent, A extends FoldState>(fold: Fold<Event, A>) =>
  (journalHead: Head) => Effect.Effect<Run<A>, ReplayGap, ProtoClient>

// Counterfactual: recorded prefix, a different continuation value.
export const branchAt:
  <Event extends StreamEvent>(journalHead: Head, k: number, alt: Event) =>
  Effect.Effect<Head, ReplayGap, ProtoClient>
```

Every refusal in this surface is `Data.TaggedError` (`Data.ts:761`) or the
proto `Refusal` struct — never a throw (W8, P7). Note the **honest dependency**:
`runCommitted`/`foldMetric` are pure and SHIPPED-adjacent (they need only
`foldCache` + `foldBindings`); `FoldlabTracer`/`replay`/`branchAt` require the
`ProtoClient` narrow writ (`proto/ts/src/client.ts`) and the journal, which are
pre-graduation (`proto/` has not moved into `packages/`, NEXT.md backlog 4).

### The smallest demo that proves it

Two runs, one assertion, no daemon:

1. Build `const f = defineFold(product(algebras.min, algebras.max, algebras.sum,
   algebras.count), productStep(...))` — a gauge summary (`algebra.ts`,
   `fold.ts`). It has a `digest` because every member is declared.
2. `pipe(stream, runCommitted(f))` over a `Stream.make(...events)` →
   `Run { head, value, foldDigest }`. Assert `head` equals
   `headFrom(streamSeed(s), events)` recomputed independently (`stream.ts:115`) —
   **the span id is recomputable, not assigned.**
3. Run a second identical pipeline; assert the second `runCommitted` is a cache
   *hit* at `${foldDigest}:${head}` (`foldCache.ts:70`) — **invalidation-free
   memo, proven by uniqueness.**
4. Mutate one event; assert a fresh `head`, a fresh key, a fresh compute — **no
   coherence logic ran, yet the cache is correct.**

This fits in one `@effect/vitest` file using only SHIPPED core
(`foldBindings`, `foldCache`, `fold`, `algebra`, `stream`) plus the proposed
`runCommitted` wrapper. It demonstrates P1 + P3 (recomputable span id) at once,
and it is the seed the FoldlabTracer Layer and `replay` grow from.

---

## 3. The honest edge

A power claim without its edge is marketing. These are the real limits, each
traced to where it is stated.

**The central risk: the fold algebra has no non-test consumer.** `foldCache`,
`makeFoldLawSuite`, and `defineFold` are SHIPPED and tested, but *nothing in the
repo consumes them except their own tests* (NEXT.md: `range` is "consumer-gated";
the metrics engine that consumes them is ticket 020, RATIFIED-UNBUILT). This is
exactly the shape that got the mint concept deleted — "it never had a consumer;
nothing called `mint()` except its own test" (NEXT.md rollback). **If ticket 020
does not land, the entire §2 deliverable and P1/P2/P8 are deletion candidates.**
The recommendation in §2 is therefore not just a product bet; it is the thing
that *retires this risk* by giving the algebra its first real consumer. State it
plainly to the operator: the expressive power is real but currently *speculative*
in the precise repository sense.

**Recomputability ≠ fidelity to intent.** foldlab's claim is that *what was
built is recomputable*, never that it *means what you meant* (VERIFICATION.md
stated limitations; language-ontology frontier). A schema digest proves two
parties refer to the same shape; it cannot prove the shape models the domain
correctly. For the grammar foundry (015) and ontology explorer (016) this is the
irreducible **semantic gap** — the field's word is "grounded," ours is
"recomputable," which is strictly stronger *and strictly narrower*. Do not let
"verifiable" be heard as "correct."

**Byte-coarse schema identity, today.** The SHIPPED identity is a digest over
submitted canonical bytes (`bytes-sha256-v1`), so two *semantically identical*
schemas with different byte forms have different identity until ticket 004's
SchemaAST fold lands (VERIFICATION.md schema-identity; NEXT.md). P6's "diff by
digest" is only as good as the interim scheme until then. And 004 itself has an
open recursion hole: a catamorphism does not terminate on a cyclic AST, so the
structural digest is *underdefined on `Suspend` nodes* — safe today only because
refs-must-resolve forces a DAG (resonances B, Unison cycle rule owed).

**Grammar-constrained decoding distorts the model.** For any NL→DSL surface
(015), masked/grammar-constrained decoding changes the LLM's conditional
distribution (Grammar-Aligned Decoding, NeurIPS 2024): forced validity is a
*syntactic* claim, never semantic (VERIFICATION.md stated limitations). And
positive-example-only grammar authoring is unlearnable in principle (Gold 1967),
so the teaching/refusal round-trip is load-bearing, not UX — an endpoint that
accepts description-in/DSL-out without it is unsound.

**Exploration bounds are minimum-cardinality, not small.** The ontology
explorer's canonical basis can be exponential and next-question computation is
coNP-complete (Babin & Kuznetsov; VERIFICATION.md). "Bounded" must never be
sold as "cheap"; the honest interface is a budget plus a partial-basis refusal.

**Absence has no proof behind it.** Every "not present" is a daemon assertion —
awkward beside a recompute-everything design (resonances D; VERIFICATION.md
catalog "absence is a typed refusal, never a lookup miss"). Lineage-as-query is
a *convenience* claim, not yet a *verifiability* claim, until sorted-key Merkle
non-inclusion proofs land. Relatedly, recomputation proves self-consistency but
**not** that everyone saw the same history — split-view equivocation is
irreducibly social and currently unaddressed (resonances D).

**Determinism has a deadline, and the effectful surface is outside the
deterministic core.** Cross-runtime equivalence (P4) rests on RFC 8785 + JCS
agreement, which is R1-differential-tested against an independent oracle, not
proved — and RFC 8785 is Informational, not Standards Track (resonances D;
number-determinism dossier: a large fraction of doubles are underdetermined by
the normative spec). The core's total determinism is "an asset with a deadline"
(surface census, NEXT.md). Effect `Stream`/effectful transforms are the
*orchestration* layer, deliberately not in the digest-pinned core — so
"verifiable Effect Stream" means the *fold* is verifiable, not that arbitrary
effects in the pipeline are.

**Safety only — no liveness.** Nothing in the repo claims progress under
contention: leases, retries, and liveness are untested formally (VERIFICATION.md
standing assumption 4). The register's four properties hold; "it will eventually
commit" is not among them.

**The transport half is pre-graduation.** The §2 deliverable's daemon-facing
pieces (`FoldlabTracer`, `replay`, `branchAt`) depend on `proto/ts/src/{client,
mcp}.ts`, which have *not* graduated into `packages/` (NEXT.md backlog 4). The
pure pieces (`runCommitted`, `foldMetric`) are buildable today; the journaled
pieces wait on graduation and on the workflow abstraction (008, ASPIRATIONAL).

---

## Appendix: rc.108 signature-confirmation ledger

Every Effect API this dossier leans on, with its citation in the pinned vendored
source `repos/effect/packages/effect/src/`:

- `Stream.runFold(self, initial: LazyArg<Z>, f: (acc, a) => Z): Effect<Z, E, R>`
  — `Stream.ts:10482`. `Stream.runFoldEffect` (effectful reducer) — `:10534`.
  `Stream.mapAccum` — `:7247`.
- `Data.TaggedError(tag)` — `Data.ts:761`.
- `Tracer.Tracer: Context.Reference<Tracer>` — `Tracer.ts:631`; `Tracer` iface
  `:28`; `Span` iface `:371`; `Tracer.externalSpan({spanId, traceId})` — `:113`.
- `Metric.Metric<Input, State>` — `Metric.ts:111`; `Metric.counter` `:2091`;
  `Metric.gauge` `:2177`; `Metric.summary` `:2426`.
- `Schema` codec surface — confirmed in-repo (`schema.ts`, passes typecheck):
  `Schema.Struct`, `Schema.Int.check(Schema.isBetween(...))`, `Schema.decodeTo`,
  `SchemaGetter.{decodeBase64, encodeBase64, transformOrFail, transform}`,
  `SchemaIssue.InvalidValue`, `Schema.decodeEffect` / `Schema.encodeEffect`.
  Decode-to-Result: `Schema.decodeUnknownResult` — `Schema.ts:1760`;
  `decodeResult` `:1795`; `decodeEffect` `:1546`; `encodeEffect` `:2007`.
- `effect/unstable/ai` subpath — present in the vendored tree
  (`unstable/ai/{Tool,Toolkit,McpServer,McpProtocol,LanguageModel}.ts`);
  `Tool.dynamic` — `unstable/ai/Tool.ts:1326`; `LanguageModel.generateObject`
  (structured output) present in `unstable/ai/LanguageModel.ts`.
- Layer idioms used by the proposed surface — confirmed in
  `proto/ts/src/mcp.ts`: `Layer.succeed`, `Layer.provide`,
  `Layer.Layer<never, unknown, Stdio.Stdio>`, `Toolkit.make`, `toolkit.toLayer`,
  `McpServer.{toolkit, layerStdio}`, `McpProtocol.v2025_06_18`.

Ratification note: `proto/SPEC.md` ratifies daemon laws **W1–W10** (verified).
The concierge laws **C1–C5** referenced in NEXT.md were *not* located in the
files read (SPEC.md carries W1–W10 plus three amendments and the `flb.type.v0`
productions); this dossier does not cite C1–C5 text it did not verify.
