# Plait — runtime primitives and shared algebra layers

**Seat:** API and capability design (Design CC PC). **Ticket:** DEV-792.
**Date:** 2026-08-18. **Status: PRE-GRILL.** Every statement below is
`proposed` or `lead` unless it carries a citation to a ratified record,
a landed gate, or the pinned vendored Effect source. This record ships
no code and asks for no merge beyond itself.

**Reading order.** §1 states the test. §2 states the one reading that
makes the rest mechanical. §3 prices the four primitives. §4 is the
structural proposal (shared algebra layers). §5 is the type discipline
that ties §3 and §4 to the rung ladder. §6 is the gap audit. §7 is the
adoption ladder. §8 flags what is genuinely new. §9 states what this
record does not claim.

**Claim tiers**, as the estate defines them
(`docs/design/2026-08-17-plait-coordination-fabric.md:21-31`, not
AGENTS.md): `ratified` (cites a grill record or standing ruling),
`proven` (cites a Lean theorem behind a green gate), `measured` (cites
a ran-it result recorded in a durable estate document — **this record
has none**), `shipped` (cites code on main, read in place this
session), `proposed` (this record's own design), `lead` (an external
claim not verified against a primary source this session).

**Glossary for outsiders.** A *lane* is a partitioned append-only
stream of events. A *fold* is a declared algebra plus a declared
per-event contribution; deploying it runs a *pump* per partition that
consumes the lane and checkpoints an *anchor* (a durable position plus
folded state). A *cell* is a monotone shared value merged by a
join-semilattice. A *register* is a fenced lease. A *digest* is the
SHA-256 of a value's RFC 8785 canonical bytes and is that value's only
identity. A *refusal* is a typed error carrying reason · law · repair.
A *rung* is a named bundle of algebraic laws an algebra has earned. A
*plane* is one of the five source layers (truth / kernel / planes /
carriage / surface) that may import only itself and deeper layers.

---

## 1. The ruling, and the one test this record applies

The operator ruled on 2026-08-18 (foundation-of-the-estate priority)
that the current code does not use Effect's primitives widely enough —
streams, pubsub, caching, batching — and that core algebras should be
modeled as **shared layers providing incremental base-algebra
operations as shared services**. The reason given is not ergonomic:
*Effect's compositional power is unity with the algebraic
inspirations*.

That framing sets the test this record applies to every line of it.

> **The reduction test.** A proposed capability is admissible only if
> it REDUCES to a construct or law already proved (C1–C9 in the
> coordination-fabric record, F1–F10 in the action-plane record, the
> G-rulings, the KM register), or is explicitly FLAGGED as genuinely
> new, stated as a candidate with its consumer named, and left for the
> coordinator to rule. This seat never mints a law.

A second fence rides every proposal, and it is the one worth stating in
full because it is the fence a performance argument always tries to
walk through:

> **The pedigree guard.** No law, gate, bound, or pin is weakened for
> convenience. A primitive that makes something faster by making a
> guarantee weaker is refused; a primitive that is admissible *because
> a law already licenses it* is a convenience the estate had already
> earned and had not yet collected.

The whole record is an application of the second sentence. Nothing
below asks for a new guarantee. Every proposal names a law that was
already proved and collects the runtime convenience that law licenses.

**Why this is the right shape and not merely tidy.** The estate already
has a table where each proved law names the API shape it forces
(coordination-fabric record, lines 860–864: *"F4 partition merge |
`partitions > 1` type-checks only for `Algebra.commutative`-branded
algebras"*, and four siblings). That table is the "DX rides the laws"
rule in its shipped form, and it reaches only *declaration* surfaces.
This record extends the same table one column to the right, to the
*runtime* surfaces — which combinator, which cache, which fan-out
strategy a given law licenses. The extension is mechanical, and §5 is
where it becomes a type.

---

## 2. The reading that makes the mapping mechanical

The mapping asked for in the ticket — "lanes + consumers ↔ Stream (the
coalgebra side as first-class streams)" — is not an analogy that has to
be argued into place. It is an identity, and stating it once makes the
other three mappings fall out.

A fold is the **algebra** side of the estate: events arrive and are
consumed into state, `step : (State, Event) → State`. C4 names it and
`planes/Fold.ts` builds it, deriving the step from the algebra so no
incompatible step can be smuggled beside a lawful algebra — the F4
bridge, `step(s, e) = algebra.combine(s, contribution(e))`.

A consumer is the **coalgebra** side: state is unfolded into
observations, `S → F(S)`. It is the formal dual, and it is what a
reader of a deployed fold actually does — hold a position, produce an
observation, become the next position.

Effect v4's `Stream` is a `Pull`-based coalgebra, and the pin says so
in its own signature. From the vendored source at the pin
(`repos/effect/packages/effect/src/Stream.ts`):

```ts
export const unfold = <S, A, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<readonly [A, S] | undefined, E, R>
): Stream<A, E, R>
```

`S → Effect<[A, S] | undefined>` **is** the coalgebra signature, with
`undefined` as the terminal case and the `Effect` as the ambient the
observation is produced under. So "the coalgebra side as first-class
streams" is one combinator away, not one subsystem away.

**And the seam it needs already landed.** DEV-765 (PR #116, live on
`agent/eng-cc-pc/DEV-765`) ships `planes/Session.ts` with exactly this
signature:

```ts
readonly read: <Event, State, const Partitions extends number>(
  session: Session,
  fold: DeclaredFold<Event, State, Partitions>,
) => Effect.Effect<Step<State>, Refusal>
// where Step<State> = { readonly view: View<State>; readonly session: Session }
```

`Step` is the pair. `read` is `f`. `Session` is `S`. Its own doc calls
it *"the coalgebra half stated as a signature — state to observation
and next state"*. So the stream form of a Plait consumer is:

```ts
// PROPOSED. Not code that lands from this ticket.
const views = (fold, session) =>
  Stream.unfold(session, (s) =>
    Effect.map(Session.read(s, fold), (step) => [step.view, step.session] as const))
```

That is the entire construction: no queue, no buffer, no lifecycle, no
new physics. It is a derived convenience over a seam whose refusals,
writ re-judgement, and anchor policy were all decided by DEV-765 and
are inherited unchanged — including the property DEV-765 was careful
about, that *admission is never cached on a session* and the writ is
re-judged every step, which survives because `unfold` calls `read` on
every pull.

**The estate had already named this row, and its fence rides with it.**
The storage-stack record's access-pattern inventory lists pattern 7 as
*"Watch a frontier — (coalgebra) — consumer step: state → observation ×
state"*, and adds the constraint this record inherits rather than
argues with: *"Row 7 is the one pattern whose meta-language home is the
coalgebraic half, which the egress law (AE-4) names and nothing yet
rules; until it lands, watch surfaces ship as chatter with the
recovery-by-read law and make no parity claim."* So the stream form
above is admissible as **chatter** — a convenience with no parity claim
against the meta-language — and stays that way until AE-4 is ruled.
This record does not ask for the ruling and does not act as if it had
happened.

**Note on the pin, against memory.** `Stream.unfoldEffect` does not
exist in `4.0.0-rc.108` — v4's `unfold` is already effectful, and the
v3 split is gone. `Stream.unwrapScoped` does not exist either; v4's
`unwrap` absorbs the scope in its own return type
(`Stream<A, E | E2, R2 | Exclude<R, Scope.Scope>>`). Both were verified
by reading the vendored source, and both are the kind of API a record
written from memory would have cited wrongly.

---

## 3. The four mappings, priced

Each subsection states: the estate construct, the primitive, **the law
that licenses the substitution**, the pin's real signature, the fence,
and what it does not claim.

### 3.1 Lanes and consumers ↔ `Stream`

**Construct:** C4 (the fold algebra and its declared rights), F2b (the
successor discipline), C6 (context assembly reads a journal span).

**Law that licenses it:** none is needed for the *consumer* direction
beyond §2 — the stream form is a pure re-presentation of an existing
`Effect` step, and `Stream.unfold` adds no buffering, no concurrency,
and no reordering. This is the cheapest mapping in the record and the
one with the largest DX return, which is exactly what a mechanical dual
should look like.

**Law that licenses the *producer* direction:** F2b. The pump's job is
to apply each event once — never twice, never skipped — over an
at-least-once redelivery schedule, by buffering out-of-order arrivals
and applying only at the contiguous frontier. That is a fold over a
stream with carried state, and the pin's name for it is
`Stream.mapAccumEffect`:

```ts
export const mapAccumEffect: {
  <S, A, B, E2, R2>(
    initial: LazyArg<S>,
    f: (s: S, a: A) => Effect.Effect<readonly [state: S, values: ReadonlyArray<B>], E2, R2>,
    options?: { readonly onHalt?: ((state: S) => ReadonlyArray<B>) | undefined }
  ): ...
}
```

The `ReadonlyArray<B>` return is not incidental: it is precisely "this
arrival contributed nothing (buffered), or drained a contiguous run of
k events". F2b's shape and `mapAccumEffect`'s shape are the same
shape, and §4 proposes writing it once.

**The fence — and this one is a RESIDUE of an already-ruled finding,
not a new discovery.** The affordances record filed it as **B-4**
("The subscribe pump's unbounded buffer forfeits backpressure — OPEN,
and now one of two answers in one package"), observing that
`internal/nats.ts` used `Stream.callback` with `Queue.offerUnsafe` and
no options while *"the fold's pump answers the same question
differently and better: a server-side bound"*. B-4 ruled two repairs in
preference order — (a) `Stream.callback` with
`{ bufferSize, strategy: "suspend" }`, (b) `Stream.fromAsyncIterable`
under the existing `acquireRelease`/`Stream.unwrap` — and recommended
*"(a) now, (b) as the recorded follow-up; ticket 3"*.

**What has happened since, and why it inverts B-4's reading.** Repair
(b) landed — on `nats.ts` only. `commonsPump` (`internal/nats.ts:213-228`)
is now built on `Stream.fromAsyncIterable` under an `acquireRelease`,
owns no queue, and discards nothing; and its header states the
soundness argument in the package's own prose: *"a synchronous callback
can only `Queue.offerUnsafe`, which discards instead of suspending, so
every bound it admits punches holes in the middle of an ordered read
(DECISIONS DEV-736 T0/T1)"*.

So the package still ships two backpressure answers, as B-4 said — but
the sides have swapped. The adapter B-4 was willing to leave in place
under a server-side bound is now the *only* one without the pull-based
repair, and it is on the durable fold path, the one place where a
dropped message breaks F2b's contiguous-successor invariant:

```ts
// packages/plait/src/internal/pump.ts:157-173
const rawMessages = (consumer, checkpointEvery) =>
  Stream.callback<JsMsg, Refusal>((queue) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => consumer.consume({
          max_messages: Math.min(checkpointEvery, PUMP_BUFFER_BOUND),
          callback: (message) => { Queue.offerUnsafe(queue, message) },
        }),
        ...
```

This is not a new finding and this record does not claim it as one. It
is **B-4's residue**: the ruled follow-up (repair (b)) was applied to
one adapter and not to its sibling, and the sibling it skipped is the
one whose invariant is F2b. The contribution here is only the
observation that B-4's "two answers" now point the other way, so a
reader who checks the record and stops will conclude the fold pump is
the *better* answer, which it no longer is.

Filed, not fixed — a finding against a shipped surface is reported with
its evidence and stopped on, per the working precept.

**What it does not claim.** Nothing here claims liveness, throughput,
or that the pump is currently losing messages in any deployment. The
`max_ack_pending` shape check at 256 and the server-side
`max_messages` bound are both still in place and are exactly what B-4
credited them for. The claim is narrower and entirely about pedigree:
one path now carries a soundness argument its sibling does not, the
package's own prose is the oracle, and that gap should be closed or
explicitly ruled acceptable with its reason recorded.

### 3.2 Watch fan-out ↔ `PubSub`

**Construct:** C1 (the evidence lattice). **Law:** F1 (fabric cell
merge is a join-semilattice — associative, commutative, idempotent) and
F2 (the terminal state of an evidence trace is invariant under
permutation AND duplication of the trace).

**First, the pedigree fact that decides how this section must be
written.** The string `PubSub` appears **nowhere** in `docs/`,
`scratch/`, or `packages/` — it has never been priced, grilled, or
ruled in this estate. Unlike `Cache` (ratified as G-3) and `Stream`
(priced twice in the affordances record), this primitive enters cold.
Under the affordances catalog's own admission discipline, that means it
takes the full G-treatment — recommended option first, alternatives
priced, reversal cost stated — and it is listed in §8 as a grill item
rather than treated here as adoptable. Everything below is the
*candidate*, not a proposal to build.

**Why F2 is the licence and not a nicety.** A `PubSub` delivers to each
subscriber independently. Two subscribers of the same publications may
therefore observe them in different orders, and a subscriber that
reconnects may observe some twice. For an arbitrary payload that is a
correctness hazard and a fan-out would need a sequencing protocol. For
an ACI payload it is *free*: F2 says every subscriber reaching the same
set reaches the same state, whatever the permutation and whatever the
duplication. **The fan-out is coordination-free because the payload's
algebra is, and for no other reason.**

That sentence is also the fence, read backwards.

**The fence.** The pin's `PubSub` constructors are
`PubSub.bounded` / `sliding` / `dropping` / `unbounded`, and the
strategy is not decoration:

```ts
export const sliding  = <A>(capacity: number | { capacity: number; replay?: number }): Effect.Effect<PubSub<A>>
export const dropping = <A>(capacity: number | { capacity: number; replay?: number }): Effect.Effect<PubSub<A>>
export const bounded  = <A>(capacity: number | { capacity: number; replay?: number }): Effect.Effect<PubSub<A>>
```

`sliding` and `dropping` **lose publications** under pressure. A
lossy fan-out over a monotone lattice loses nothing that matters — the
next publication carries the join and the subscriber catches up, which
is what "monotone" buys. A lossy fan-out over a positional or counting
payload silently corrupts it. So the strategy is not a tuning knob; it
is a claim about the payload's rung, and §5 makes it a type.

This is the same trap entry 0026 of the API log pre-registered against
for CAS disciplines — three write paths that *look* alike and are
licensed by three different laws. Fan-out strategies are the same
species of trap, and this record names it before a combinator exists to
fall into.

**Today.** `planes/Cell.ts:226-237` already does this correctly for a
local replica, using `SubscriptionRef` (PubSub-backed at the pin) with
`.changes` — and the affordances record already wrote the licence for
its coalescing behaviour at A-8b: *"a subscriber that misses
intermediate `changes` values loses nothing — by F1 the latest local
join absorbs every skipped state. This is the exact sentence that later
licenses a coalescing KV watch feed, so the replica's interface is
watch-ready without claiming watch."* That sentence is the ancestor of
this whole subsection, and its hard fence rides with it: feeding by
watch is licensed only after DEV-731's probe suite, *"and then
advisory-only: **no absence reasoning from a watch, ever.**"*

So the exemplar exists and its law is written. But `CellService`
(`planes/Cell.ts:86-92`)
exposes only `read` and `merge` — no change feed — and the module's own
note (`planes/Cell.ts:185-189`) names the intended replacement as
*polling `Cells.read`*. `RegisterService` (`planes/Register.ts:44-54`)
is the same: `observe` is a point read, and `hold` (`:83-108`) works
around the absence with a `Schedule.spaced` heartbeat. Every consumer
that wants to watch therefore hand-rolls a poll — `surface/cli.ts:341-358`
is one, a `while (true)` over `handle.anchor(partition)` every 5ms.

The absence is deliberate and documented (the KV watch probe licenses
only a future advisory feed). This record does not ask to override
that. It asks that **when** the feed lands, it lands as a `PubSub`
behind the service exposed as `changes: Stream<CellState>`, with its
strategy chosen by the payload's rung — and that until then the
polling debt is visible rather than distributed silently into every
consumer.

**Derived DX, once a feed exists.** `Stream.share` and
`Stream.broadcast` at the pin already carry `replay` and
`idleTimeToLive`, so a second subscriber to one upstream costs nothing
and no watch-multiplexing module needs to be minted:

```ts
export const share: {
  (options:
    | { capacity: "unbounded"; replay?: number; idleTimeToLive?: Duration.Input }
    | { capacity: number; strategy?: "sliding" | "dropping" | "suspend"; replay?: number; idleTimeToLive?: Duration.Input }
  ): <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Stream<A, E>, never, Scope.Scope | R>
  ...
}
```

Note `strategy` reappears here, with `"suspend"` as the lossless
option. Same rung question, same answer.

### 3.3 Digest-keyed memoization ↔ `Cache` — **the forever-valid law**

This is the mapping the ticket asked to have *named*, and it is the one
whose payoff is largest, because naming it converts a
micro-optimization into a capability with consequences.

**Construct:** C3 (content-addressed identity and what "semantic
coherence" means) — SHA-256 over RFC 8785 canonical bytes, always
re-derived, never asserted.

**The candidate law, stated.**

> **Memo permanence (proposed; candidate corollary of C3).** Let `k` be
> a digest and `f` a function that returns only values it has
> re-derived against `k` before returning them. Then any memo of `f`
> keyed by `k` is *forever valid*: a stored entry can never become
> wrong, because the keyspace is immutable and the entry passed the
> door that owns correctness. Such a memo therefore has **no
> invalidation protocol, no coherence protocol, and no freshness
> parameter** — not because they are omitted, but because there is
> nothing they could compute.
>
> **The eviction clause, which is the whole precision of it.** An entry
> may still be *removed*, by capacity. Removal costs a re-fetch and
> never a wrong answer. So the law is about **validity, not
> retention**: "never invalidates" and "never evicts" are different
> sentences and only the first is claimed.
>
> **The anti-clause.** Any key that names *whatever is current* —
> anchored, head-relative, `(directory, petname, anchor)`-shaped — is
> outside this law entirely and gets no memo from it. Head-relative
> reads are volatile by C6's volatility classes and are a different
> question.

**Its pedigree, honestly stated — and it is stronger than this seat
first credited.** This law is not new, and it is not merely module
prose. It has three prior homes, in ascending order of authority:

1. **The storage-stack record already states it twice**, as `proposed`.
   §8.2's first cost-ladder inversion: *"**Cache invalidation is
   deleted.** A digest-keyed entry is valid forever (referential
   transparency of content addressing). Names are the only mutable
   plane…"*. And §8.5's license table — the "optimization becomes
   proof" table — carries the row **`memoize forever ← content
   addressing`** outright.
2. **The affordances record priced it at A-8a** with the licence
   argument in full: *"a cached successful resolve can never be stale —
   there is nothing an invalidation could learn. Eviction exists only
   to bound memory"*, plus the F8 fence (*"a resolve failure is
   head-relative absence and must never be cached as a fact"*) and the
   mandatory JSDoc negatives.
3. **It is RATIFIED as G-3** — refereed 2026-08-18 as ADOPT-AMENDED,
   realized by DEV-739, and shipped at `planes/Resolved.ts:198-239`.

So the correct tier for the law's substance is **ratified for the
resolve path**, not `proposed`, and this record was wrong to imply it
was collecting an unstated argument. What this section actually
contributes is narrower and worth stating plainly, because the
difference is the difference between a discovery and a tidy-up:

- **The eviction clause and the anti-clause, stated as part of the law
  rather than as call-site caveats.** "Never invalidates" and "never
  evicts" are different sentences; G-3's referee fenced *keys are
  digests only*, but the validity/retention split is not itself written
  as a clause anyone can cite.
- **The generalization off the resolve path.** G-3 licensed *one* memo.
  §6's H8 and H9 are two more sites keyed by something immutable, and
  neither has a memo — because the law was ratified as a decision about
  `ResolveCache`, not as a rule about digest keys. Lifting it is the
  proposal.

That is the whole delta, and it is a `proposed` delta over a `ratified`
core.

**Why lifting it is worth a record.** Because the consequences are not
local, and they stay invisible while the law reads as a property of one
cache rather than of a keyspace:

1. **A digest memo may be shared across processes** without a coherence
   protocol. Two processes holding different subsets of the same
   immutable truths disagree about nothing. `Resolved.ts:226-228`
   already notes this for itself; the law generalizes it.
2. **A digest memo may be persisted.** The pin ships
   `RequestResolver.persisted({ storeId, timeToLive?, staleWhileRevalidate? })`
   requiring a `Persistence` service. A durable digest memo over the
   estate's own NATS KV is a *lead* (§8), and it is only conceivable
   because the law says a stored entry cannot go wrong.
3. **A digest memo may be warmed, pre-seeded, or handed between
   deployments.** All three are ordinary for a forever-valid keyspace
   and are protocol design for any other.
4. **Capacity is deployment configuration, never identity.** Two
   processes at different capacities resolve the same digests to the
   same values — so capacity may be cataloged as a tunable under G12
   without ever touching a digest.

**The pin, exactly.** From `repos/effect/packages/effect/src/Cache.ts`:

```ts
export const makeWith = <Key, A, E = never, R = never, ServiceMode extends "lookup" | "construction" = never>(
  lookup: (key: Key) => Effect.Effect<A, E, R>,
  options: {
    readonly capacity: number
    readonly timeToLive?: ((exit: Exit.Exit<A, E>, key: Key) => Duration.Input) | undefined
    readonly requireServicesAt?: ServiceMode | undefined
  }
): Effect.Effect<Cache<Key, A, E, ...>, never, ...>
```

Two facts to read off it, both load-bearing. **`capacity` is
mandatory** — the pin offers no unbounded cache, which is why the law
had to separate validity from retention rather than claim permanence
outright, and which vindicates `ResolveCacheOptions`'s refusal to
invent a default (*"a capacity is a memory budget somebody measured,
and a number this package invented would be a claim about a deployment
it has never seen"*, `planes/Resolved.ts:146-154`). And **`timeToLive`
receives the `Exit`**, which is how the shipped layer serves successes
forever and never serves failures:

```ts
// packages/plait/src/planes/Resolved.ts:187
timeToLive: (exit) => Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
```

That one line is the law in executable form, and it should be read as
the reference implementation every future digest memo copies.

**Where the law licenses memos that do not exist yet.** §6 lists them;
the two largest are `truth/SchemaCanonical.ts:341`, where
`canonicalWriter` builds a fresh `Map<SchemaAST.AST, Writer>` and
re-walks the whole schema tree **on every call** — including once per
record inside `roundTripsCanonically` (`:388`) — and
`internal/anchors.ts:129-152`, where every checkpoint canonicalizes the
state twice and re-writes a digest-keyed entry the store already holds.
Both are keyed by something immutable. Both are inside the law.

**What it does not claim.** Not freshness (the word is meaningless on
an immutable keyspace). Not absence reasoning (a failed resolve is
head-relative absence, is not recorded, and flows to the caller's
`Refusal.retryAbsence` policy). Not durability (the memo caches over
whatever durability the substrate has; losing every entry loses time).
Not that any current memo is a measured win — **no benchmark is
claimed anywhere in this record**, and §7's tickets each owe one.

### 3.4 Resolve traffic ↔ `RequestResolver` batching

**Construct:** C3 again. **Law that licenses it:** a digest names
exactly one value, so K point reads of K digests and one K-way read of
the same digests return the same K values. Batching is a claim that
independent reads may be reordered and coalesced — and *independence*
is precisely what content addressing hands you, because no read's
answer can depend on another read having happened.

**Its classification, which the estate has already ruled.** The
storage-stack record puts batching in the placement plane, not the
meaning plane: *"batching is a placement-plane choice — ten thousand
small messages in one segment with digest → segment+offset placement
facts, log-structured, **invisible to every fold**."* That ruling is
the strongest thing that can be said for this proposal and also its
tightest constraint. Under AE-8's admission test — *every public API
names its denotation, or the residue is classified* — batched resolve
**denotes nothing new**: it is the same term, `resolve(d)`, with a
different carrier. So it classifies as **carriage**, which per the test
means it rides *"options in the environmental band, fenced out of the
fluent surface"*.

Concretely, and this is the design consequence: **no public Plait
surface gains a `getMany`, a `resolveAll`, or a batch verb.** The
service *interfaces* gain `getMany` because a resolver must sit on
something (§7's A-5), but the fluent surface callers write does not
change at all — `resolve(digest)` keeps its exact signature and simply
coalesces underneath. A version of this proposal that exposed batching
to callers would have smuggled carriage into meaning and should be
refused.

**The same cold-entry fact as PubSub.** `RequestResolver` appears
**nowhere** in `docs/`, `scratch/`, or `packages/`, and neither does
any `Effect.batch` / request-batching discussion. It has never been
priced or grilled here. Like §3.2, it is a §8 grill item, not an
adoptable proposal — with the mitigating fact that its classification
(carriage) and its licence (C3) are both already ruled, so the grill
question is narrow.

**The site.** `planes/Resolved.ts:134-144` is a two-hop point lookup:

```ts
export const resolve = Effect.fn("Resolved.resolve")(function* (digest: Digest) {
  const catalog = yield* Catalog
  const cataloged = yield* catalog.get(digest)          // hop 1
  if (Option.isSome(cataloged)) return yield* verified(digest, cataloged.value)
  const payloads = yield* Payloads
  const payload = yield* payloads.get(digest)           // hop 2
  ...
})
```

and `resolveGetter` (`:292-294`) invokes it once per reference with no
batching seam. Decoding a struct carrying K `ResolvedOf` fields issues
K independent sequential round trips — and the module's own header says
recursion is *"the normal case"* (`:19-21`). `CatalogService`
(`planes/Catalog.ts:51-54`) and `PayloadService` (`:67-69`) expose only
single-digest `get`, so there is nothing for a resolver to sit on: the
batching gap is a *missing method on a service interface* before it is
anything else.

**The pin, exactly — and a correction against memory.**
`RequestResolver.makeBatched` **does not exist** in `4.0.0-rc.108`. The
batched constructor is `make`, and it takes the whole batch at once:

```ts
export const make = <A extends Request.Any>(
  runAll: (entries: NonEmptyArray<Request.Entry<A>>, key: unknown) => Effect.Effect<void, Request.Error<A>>
): RequestResolver<A>

export const makeGrouped = <A extends Request.Any, K>(options: {
  readonly key: (entry: Request.Entry<A>) => K
  readonly resolver: (entries: NonEmptyArray<Request.Entry<A>>, key: K) => Effect.Effect<void, Request.Error<A>>
}): RequestResolver<A>

export const batchN: { <A extends Request.Any>(self: RequestResolver<A>, n: number): RequestResolver<A> }
```

`NonEmptyArray<Request.Entry<A>>` — not v3's `Array<Array<Entry>>`.
Invocation is `Effect.request(self, resolver)`, dual, returning
`Effect<Request.Success<A>, Request.Error<A> | EX, Request.Services<A> | RX>`.

**The composition that makes this cheap rather than a rewrite.** The
pin composes §3.3 and §3.4 into one object:

```ts
export const asCache: {
  <A extends Request.Any, ServiceMode extends "lookup" | "construction" = never>(options: {
    readonly capacity: number
    readonly timeToLive?: ((exit: Request.Result<A>, request: A) => Duration.Input) | undefined
    readonly requireServicesAt?: ServiceMode | undefined
  }): (self: RequestResolver<A>) => Effect.Effect<Cache.Cache<A, Request.Success<A>, ...>, never, ...>
}
```

`{ capacity, timeToLive: (exit) => ... }` is **the same options shape
`ResolveCache` already constructs**, with the same `Exit`-keyed TTL
fence. So the shipped `ResolveCache` is not replaced by batching; it is
*re-expressed* as a batched resolver viewed as a cache, preserving its
capacity contract, its infinity/zero TTL fence, its dedup-of-concurrent-
lookups property, and its published `ResolveCacheService` surface
unchanged. That is the difference between an adoption ticket and a
rewrite, and it is why §7 stages this one early.

**The fence: batching must not batch the door.** Verification is
per-value and stays per-value. `verified(digest, value)`
(`planes/Resolved.ts:97-106`) re-derives the digest of whatever was
fetched before returning it, and a batched *store* read followed by
per-digest re-derivation preserves the one door exactly. What is
batched is the unverified fetch; what is never batched is the judgment.
This matters because `Catalog.get` and `Payloads.get` are deliberately
unverified so a lying layer can be supplied under them and refused at
one door (DECISIONS T18) — a batching change that moved verification to
the batch boundary would weaken that, and is refused.

**Coordination with DEV-766 (PR #115, live), stated precisely so the
two do not collide.** `planes/Address.ts` ships `at(root, ...names)` as
an iterated resolve: each hop resolves the current digest, decodes a
directory, reads one binding, and hands the bound digest to the next
hop. **That chain is dependent, so no batching applies within one
path** — hop *n+1*'s key is hop *n*'s answer, and any proposal to
"batch the walk" is refused by the shape of the walk. What *is*
independent, and therefore batchable: sibling `ResolvedOf` fields in
one decoded structure, concurrent `at` calls from different roots, and
the fan-out inside `Address.list`.

And the coordination is free, because DEV-766 declared it so:
`Address.ts` states it *"ships no service, no store, no layer, and no
cache — a caller who wants the resolve memo provides `ResolveCache` and
changes nothing this module can observe."* Batching lands **below** it,
in `Catalog`/`Payloads`/`Resolved`, and `Address` inherits it without a
line changing. This record consumes PR #115 rather than touching it.

---

## 4. The shared algebra Layer

This is the structural half of the ticket, and the audit found the case
already made in the tree's own words.

**The finding.** Six modules declare an algebra-shaped thing; **none is
reachable from the environment**, and the incremental-step loop that
consumes one is written out **five times**:

| # | Site | What it re-implements |
| --- | --- | --- |
| 1 | `internal/successors.ts:64-92` | `ingestSuccessor` — the incremental step plus contiguous drain (the original) |
| 2 | `internal/successors.ts:95-118` | `replaySuccessors` — the drive loop over #1 |
| 3 | `internal/successors.ts:126-157` | `arrivalOrderReplay` — a deliberate negative control that also re-implements `Anchor.advance` (`:145-149`) |
| 4 | `internal/pump.ts:260-324` | the live pump's buffering/ack/scoreboard bookkeeping around `ingestSuccessor` (`:286`) |
| 5 | `internal/chaos.ts:136-164` | `measureSchedule` — the reference fold *and* the machine loop, duplicating #2 |

Beside that, there are **two parallel algebra interfaces for the same
job**: `DeclaredAlgebra<State>` wrapping `Reducer.Reducer<State>`
(`truth/Algebra.ts:13-22`), and `CasJoin<A>` with
`combine`/`initialValue`/`identical` (`internal/cas.ts:65-88`), bridged
one way by `joinOf` (`:81-88`) and never unified. `cellJoin`
(`internal/cells.ts:157-161`) is hand-built as a `CasJoin` and so
**never earns the commutative brand despite being provably ACI** — the
exact loss the brand exists to prevent.

`internal/cas.ts:10-42` already argues the extraction case in its own
header (*"audit B-8… eight adapters at one shape is a seam with no
module at it"*). This record agrees and extends the argument one level:
the seam with no module at it is the *algebra service*, not only the
CAS loop.

**Why five copies is a correctness cost and not a tidiness cost.** F2b
is the law that the drive loop implements — *buffer by position, apply
only at the contiguous frontier, apply each event exactly once*. One
implementation carries one proof obligation and one place for the
negative controls to bite. Five carry five, and #3 and #5 have already
drifted far enough to re-implement `Anchor.advance` beside the anchor
module rather than through it. The proof does not get five times
harder; it gets five times *easier to bypass*, which is worse, because
a bypassed proof still reads as a proof.

**The proposal (`proposed`).**

1. **The algebra becomes a service.** Each DECLARED algebra's
   operations — `combine`, `initialValue`, `step`, `identical` — are
   provided once through `Context.Service` + `Layer`, in the estate's
   existing house style (nine tags already use it; the pattern is
   `class X extends Context.Service<X, XService>()("tag")` with a
   hand-written `static readonly layer`, since the pin auto-generates
   no `.layer` and its options bag carries only `make`). `CasJoin`
   collapses into it through `joinOf` so there is one algebra
   vocabulary, and `cellJoin` earns its brand by construction instead
   of forgoing it. The layering rule is the storage record's, not a new
   one: **layer by plane, not by NATS construct** (§7.3), which is why
   the algebra service belongs in `truth/` beside the ladder and not
   beside any adapter.
2. **One replay driver.** The five loops become one
   `Stream.mapAccumEffect`-based driver parameterised by the algebra
   service, which `pump`, `chaos`, `replaySuccessors` and
   `arrivalOrderReplay` all consume. The negative control (#3) stays a
   negative control — it parameterises the same driver with the *wrong*
   discipline, which makes it a sharper control than a hand-written
   twin, because a twin can accidentally agree.
3. **Incremental operations are inherited, not restated.** This is the
   universal-properties-to-DX rule applied to runtime: a law proved
   once at the algebra surfaces as a convenience at every consumer with
   its correctness inherited. A new carrier gets the drive loop for
   free instead of restating it, which is the property the estate wants
   and the property five copies destroy.

**The fence — what must NOT be unified.** API log entry 0026 ruled that
the three CAS disciplines (join retry, register reconcile, anchor
detach) stay three, because their resemblance is a trap and each is
licensed by a different law. **This proposal does not touch that
ruling.** What is unified here is the *algebra* (the combine and its
laws) and the *successor drive loop* (F2b), not the write discipline
that surrounds a CAS. A reviewer should read this section against 0026
and hold it to that line; a version of this proposal that grew a "CAS
strategy" parameter has violated 0026 and should be refused on sight.

**Supporting findings in the same family** (details in §6):
`AnchorStore` (`internal/anchors.ts:35-51`) is a complete four-method
service interface with no tag and no Layer, constructed inline at
`internal/folds.ts:52` from a raw `NatsConnection` — which is why
checkpoint logic cannot be tested without live NATS.
`acquireConnection` (`internal/transport.ts:170-185`) is called by six
adapters independently, so a process running Lanes + Cells + Registers
+ Folds opens four NATS connections to the same server. And
`internal/folds.ts:70-91,109-112` hands one **shared mutable
scoreboard** to N concurrently-running pump fibers, which perform
unsynchronised read-modify-writes on it (`internal/pump.ts:271-307`,
`:232-235`).

---

## 5. Rung ⇒ combinator — the type discipline

The ticket asks for "KM-17 rung brands as the service interfaces' type
discipline". This section is that, and it is where §3 and §4 stop being
four separate observations and become one rule.

**The rule is not this record's.** The storage-stack record states it
already, under the heading *"optimization becomes proof"*, as the §8.5
license table:

> `shard / parallelize ← commutativity` · `retry, at-least-once ←
> idempotence` · `incremental / delta views ← associativity (monoid
> fold)` · `memoize forever ← content addressing` · `speculate ←
> monotonicity of the join plane` · `skip coordination ← CALM`

Read that table beside §3 and the four mappings of this record are its
first four rows, one per primitive. What this section adds is one step:
**materializing the table in the type system**, so a violated row is a
compile error rather than a review catch. The storage record itself
names that as the goal — *"KM-17's rung brands make the rule
enforceable in the TypeScript surface, so the carrier a fold may read
becomes a type error rather than a code review"* — and says it of
carriers. This section says it of combinators, which is the same
sentence one level down.

**What already landed.** DEV-764 (PR #118, live on
`agent/effect-cc-pc/DEV-764`) ships the rung ladder in
`truth/Algebra.ts` as phantom law-set brands — `Total`, `Associative`,
`Identity`, `Commutative`, `Idempotent`, `Bounded`, `Inverse` — bundled
into `Monoid`, `CommutativeMonoid`, `BoundedSemilattice`, `Group`,
`AbelianGroup`, with the crucial design choice that *a brand carries
laws rather than a rung name because the ladder is a poset, not a
chain*. It derives the carrier rule as types:

```ts
export type DeepestQuotient<Laws extends LawSet> = Laws extends BoundedSemilattice ? "set"
  : Laws extends CommutativeMonoid ? "multiset"
  : "positioned"
export type LawsFor<Q extends Quotient> = Q extends "set" ? BoundedSemilattice
  : Q extends "multiset" ? CommutativeMonoid
  : LawSet
```

and gates it at the fold door, so `partitions > 1` does not type-check
without a commutative-monoid algebra (`planes/Fold.ts`, `LaneQuotient`
+ `DeclareOptions<..., Laws extends LawsFor<LaneQuotient<Partitions>>>`).
That is KM-17 / rung⇒carrier, shipped as a compile error.

**The extension this record proposes.** *The same law atoms decide
which runtime combinators are sound.* A combinator's soundness
side-condition **is** a law atom — that is the whole observation, and
it is why the extension is mechanical rather than new physics:

| Quotient | Laws (DEV-764) | Licensed at runtime | Refused at that rung |
| --- | --- | --- | --- |
| `positioned` | `Monoid` | `Stream.mapEffect` at concurrency 1; ordered pull; `PubSub.bounded`; `Stream.share({strategy:"suspend"})` | any `unordered`; `sliding`/`dropping`; `Stream.changes`; partition merge |
| `multiset` | `+ Commutative` | `Stream.mapEffect({ concurrency: n, unordered: true })`; `Stream.broadcast`; per-partition folds merged (F4) | `Stream.changes`; lossy fan-out |
| `set` | `+ Idempotent, Bounded` | `Stream.changes` / `changesWith` (dedup); `sliding`/`dropping` PubSub; `replay`; at-least-once redelivery absorbed (F2) | — (the top of the ladder for reads) |

Read the pin's signatures against that table and the correspondence is
exact, not analogical:

```ts
export const mapEffect: {
  <A, A2, E2, R2>(f: (a: A, i: number) => Effect.Effect<A2, E2, R2>,
    options?: { readonly concurrency?: number | "unbounded"; readonly unordered?: boolean }
  ): ...
}
export const changes = <A, E, R>(self: Stream<A, E, R>): Stream<A, E, R>  // drops equal-to-previous
```

`unordered: true` says *the consumer does not care about arrival
order*, which is commutativity and nothing else. `Stream.changes`
collapses repeats, which is sound exactly when repeating is a no-op —
idempotence and nothing else. Neither is a new law; each is an existing
law atom wearing a combinator's name. The multiset row is F4 verbatim
(*for commutative-class algebras, merge of per-partition folds =
sequential fold*); the set row is F2 verbatim (*terminal state
invariant under permutation and duplication*).

**Why this belongs in types and not in a review checklist.** The estate
already ruled that carrier misuse should be a compile error, not a
review catch (estate-api-development law 4). `unordered: true` on a
positional payload is carrier misuse with a shorter name. Since the
brands are already phantom and already ride `DeclaredFold`, a shared
stream service can take the fold's `Laws` parameter and expose only the
combinators that rung licenses — the same trick `LawsFor<LaneQuotient<P>>`
already plays at the declaration door, one level down.

**The fence.** A brand claims that a declared reducer's equations held
over the cases a suite drew — `truth/Algebra.ts` says so in its own
header — and claims nothing about liveness, throughput, or a running
deployment. Extending brands to combinators inherits that bound exactly
and widens it by nothing. In particular, **no rung licenses dropping a
message on the durable fold path**: F2b is a statement about applying
each event once, and idempotence at the *algebra* does not license loss
at the *transport*, because a dropped message is not a duplicate — it
is an absent one. §3.1's finding survives this section untouched, and a
reader tempted to discharge it by pointing at the `set` row has made
exactly the error this paragraph exists to block.

---

## 6. Gap audit

Walked at the plane-aligned layout post-PR #113. Forty source files
read. **Baseline, stated first because it reframes everything below:
this package is already Effect-v4-native almost everywhere** — `Stream`,
`Cache`, `SubscriptionRef`, `SynchronizedRef`, `Schedule`, `Scope`,
`Layer`, `Context.Service`, `Schema.TaggedError` and `Effect.fn` spans
are all in live use, nine services exist behind tags with test layers,
and there is no `any`, no `@ts-ignore`, no `console.log`, no
`process.exit`, and no `setTimeout` in `src`. The gaps are
**concentrated, not diffuse**.

Nine `Context.Service` tags exist (`Catalog`, `Payloads`, `Blobs`,
`Cells`, `Lanes`, `Folds`, `Registers`, `ResolveCache`,
`FabricClient`), all in `planes/` and `carriage/`. **Zero services and
zero Layers exist in all of `truth/`, all of `kernel/`, all of
`internal/`, and `surface/`** — which is the audit's structural headline
and the reason §4 is the structural proposal.

Severity is this seat's judgment, not a ruling. Line numbers were read
at HEAD; the four starred rows were re-verified by hand against the
files.

### High

| # | Site | What it does | Target | Why |
| --- | --- | --- | --- | --- |
| H1 ★ | `internal/pump.ts:157-173` | durable fold pump uses `Stream.callback` + `Queue.offerUnsafe`, which discards under pressure | `Stream.fromAsyncIterable` via the existing `commonsPump` shape (`internal/nats.ts:213-228`) | the package's own prose (`internal/nats.ts:193-212`) calls this adapter unsound for ordered reads; F2b lives on this path |
| H2 | `surface/cli.ts` (whole file) | hand-rolled argv `switch` with cursor mutation (`:92-188`), 9 `async` fns, 7 `Effect.runPromise`, 20 `throw`, `Bun.spawn`/`Bun.sleep` poll loops, `process.env`/`argv`/`stdout`/`exitCode`, one bare `new Error` (`:333`), top-level `await` (`:600`) | `effect/unstable/cli` (`Command`, `Flag`, `Argument`, `HelpDoc`), `FileSystem`, `Path`, `Config`, `Console` | estate law 3 names `@effect/cli` for command-line surfaces; the pin already vendors it, so no dependency is added (G7 respected) |
| H3 | `planes/Resolved.ts:134-144`, `:292-294` + `planes/Catalog.ts:51-54`, `:67-69` | K references decode as K sequential two-hop fetches; no `getMany` exists for a resolver to sit on | `RequestResolver.make` + `asCache`; `getMany` on both service interfaces | §3.4; the module's own header calls recursive references "the normal case" |
| H4 | `truth/Algebra.ts` + `internal/cas.ts` + `internal/successors.ts` + `internal/pump.ts` + `internal/chaos.ts` | two algebra interfaces, five copies of the drive loop, no tag anywhere in the chain | algebra as `Context.Service`; one `Stream.mapAccumEffect` driver | §4 |
| H5 ★ | `internal/anchors.ts:35-51`, `:177` | `AnchorStore` is a full four-method service with no tag and no Layer, built inline at `internal/folds.ts:52` from a raw `NatsConnection` | `Context.Service` + `.layer`/`.testLayer` | checkpoint logic cannot be tested without live NATS; the one place a NATS type crosses a module boundary as a positional argument |
| H6 | `internal/transport.ts:170-185` | `acquireConnection` called independently by six adapters | one connection service + `Layer`, or `Pool` | a process running four adapters opens four NATS connections to one server |
| H7 ★ | `internal/folds.ts:70-91`, `:109-112` | hand-rolled `Array<Fiber>` fan-out; one shared mutable scoreboard written by N fibers (`internal/pump.ts:271-307`, `:232-235`) | `FiberSet` or `Effect.forEach({concurrency})`; `Ref`/`SynchronizedRef` or `Metric` | a setup failure at partition 3 leaks fibers 0–2; the counters are unsynchronised read-modify-writes |
| H8 ★ | `truth/SchemaCanonical.ts:341`, `:388` | `canonicalWriter` builds a fresh `Map<SchemaAST.AST, Writer>` and re-walks the schema tree per call — and `roundTripsCanonically` calls it once **per record** | `Cache`/`WeakMap` keyed on the AST, behind a Layer | §3.3; largest wasted-work site found |
| H9 | `internal/anchors.ts:129-152`, `:253` | every checkpoint canonicalizes state **twice** and re-writes a digest-keyed entry the store already holds | `Cache` of `Digest → ensured`; `digestOfCanonicalBytes` (`internal/digests.ts:26`) | §3.3 |
| H10 | `internal/folds.ts:79-91` | per-partition setup is a sequential `for` of two network round trips each; at the declared max of 1024 partitions (`planes/Lane.ts:150`) that is 1024 serialised setups before the first message | `Effect.forEach({ concurrency })` | `internal/lanes.ts:130-134` already does the equivalent correctly — the fix pattern is in-tree |

### Medium

`internal/chaos.ts:227-240` — three sequential `for` loops each doing a
blocking network `next()` (→ `Stream.repeatEffect` + `take`);
`:250-254`, `:297-306` — `Effect.forEach`/`Effect.all` with no
`concurrency`, so sequential by default. `internal/successors.ts:79-89`
— `while (true)` drain with three mutable locals (→ `Effect.iterate`).
`internal/lanes.ts:147,155-158` — `const ensured = new Set<string>()`
with a check-then-act race across the `ensureLaneStreams` await point;
two concurrent emits on one lane both run the full fan-out (→ `Cache`,
whose concurrent-lookup dedup `planes/Resolved.ts:265-270` already
documents). `planes/Catalog.ts:71-81` — the in-memory catalog is an
unbounded `new Map`, no capacity, no eviction. `planes/Cell.ts:115-131`
— `canonicalize` re-derives bytes per observation per merge attempt, up
to `CELL_MERGE_ATTEMPTS = 8`. `internal/registers.ts:295-468` — five
near-identical read→decode→guard→CAS→reconcile closures, no batch
`observe`, and a second full read on every failed CAS (`:270-293`,
`:316`). `internal/cells.ts:184-209` — `MergeDiscipline` selected by
positional argument rather than by the environment, which is exactly
what a `Layer` lifts while keeping the production default.
`internal/cas.ts:152-221` — `casJoinLoop` takes an 8-field options bag
including three effects: a service, inlined. Three independent
`class …Error extends Error` + `refuse` helpers with ~50 throw sites
between them (`truth/CanonicalJson.ts:55-67`,
`truth/SchemaCanonical.ts:37-48`, `kernel/KernelProgram.ts:91-102`)
where `Data.TaggedError` gives one — notable because `truth/Refusal.ts`
next door does it correctly with `Schema.TaggedError`.
`internal/lanes.ts:95-120` / `internal/pump.ts:122-144` /
`internal/nats.ts:88-107` — three copies of the same nested
async/try/catch JetStream ensure-or-create. `truth/Digest.ts:6`,
`internal/digests.ts:6`, `kernel/KernelProgram.ts:56` — `node:crypto`
`createHash` imported at module scope in three files, where the pin
ships `Crypto.ts`. `internal/pump.ts:42-49` — `ack: () => void`, a bare
side-effecting thunk on a data record.

### Low

`carriage/FabricClient.ts:42-44` — `subscribe` returns
`Effect<Stream<…>, …, Scope>` rather than a `Stream`, so every caller
must `yield*` then pipe; v4's `unwrap` absorbs the scope and would let
the seam type be `Stream` directly. `planes/Resolved.ts:272-276` —
`ResolveCache` has `.layer` but no `.testLayer`, alone among nine tags.
`planes/Resolved.ts:113` — `new TextDecoder()` allocated per call in
the resolve hot path. `planes/Catalog.ts:145-148` — `Payloads.layer` is
a hard-coded always-absent stub, so `resolve`'s second hop is dead code
in every shipped configuration. `truth/Algebra.ts:60` — a module-level
`Symbol()` witness that will not survive two copies of the package in
one process. Two upward imports break the plane law as written:
`truth/Refusal.ts:9` and `kernel/Wire.ts:11` both import into
`internal/`, and `surface/cli.ts:37-38` reaches past every public seam
straight into `internal/chaos.ts` and `internal/lanes.ts`. Four
unrelated brand mechanisms coexist (`Schema.brand`; the `unique symbol`
+ `defineProperty` witness; generated string-literal intersections in
`kernel/KernelTables.generated.ts:253-317`; an ad-hoc handle brand at
`kernel/KernelProgram.ts:195`), none using the pin's `Brand.ts` or
`Newtype.ts`. And `carriage/CasDaemon.ts:75-86` types its error channel
as `KernelRefusalRow` — a **second refusal vocabulary** beside
`truth/Refusal.ts`'s `StructuralRefusal | AbsenceRefusal`, with no
bridge between them.

**Not gaps** (recorded so a later sweep does not "fix" them):
`truth/CanonicalJson.ts:198,293,323` `for(;;)` byte-parser loops —
`Stream` would be wrong. `internal/lanes.ts:130-134` — correct
unbounded concurrency. `planes/Cell.ts:226-237` — `SubscriptionRef`
replica, the fan-out exemplar. `planes/Register.ts:83-108` — `hold`,
exemplary `SynchronizedRef` + `Schedule` + `raceFirst`.
`kernel/Subjects.ts` — exemplary `Schema.brand` discipline.
`carriage/CasDaemon.ts:14-18` — deliberately tag-free, documented.

---

## 7. The adoption ladder

Severable and stage-gated. Each stage is independently valuable and
independently abandonable; no stage depends on a later one. Stages 1
and 2 do not touch any file the three live PRs touch. **Every ticket
here is `proposed`; none is dispatched by this record.**

**Coordination with what is in flight.** DEV-765 (PR #116,
`planes/Session.ts`, `internal/sessions.ts`), DEV-764 (PR #118,
`truth/Algebra.ts`, `planes/Fold.ts`), DEV-766 (PR #115,
`planes/Address.ts`) are live on this surface. This record **consumes
their PRs when they land and duplicates none of them**: §2's stream
form is one combinator over DEV-765's `read`, §5 is a use of DEV-764's
brands with no change to the ladder, and §3.4 lands strictly below
DEV-766 in a module it declared it does not observe.

| Stage | Ticket (proposed) | Scope | Gate it owes | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | **A-1 — the pump adapter asymmetry** | file the H1 finding; lift `commonsPump`'s pull adapter to a shared internal module; make the durable pump use it — i.e. finish B-4's repair (b) on the sibling it skipped | the existing backpressure wall extended to the fold pump, plus a negative control that the callback adapter fails | none — but a *finding first*, per the working precept: report and stop before repairing. B-4 is already ruled, so this is its follow-up, not a new grill |
| 1 | **A-2 — the digest memo law, applied** | `Cache` behind a Layer for `canonicalWriter` (H8) and anchor state-ensure (H9) | a `measured` before/after on the corpus round-trip; no claim without it | none |
| 1 | **A-3 — `AnchorStore` becomes a service** | tag + `.layer`/`.testLayer`; connection as a Layer dependency (H5) | checkpoint tests that run without live NATS — the point of the ticket | none |
| 2 | **A-4 — one connection, one policy** | connection service or `Pool` (H6); `transportRefusalFor`'s eight module-level closures become a policy service | the spine wall, unchanged, plus a test that N adapters open one connection | A-3 |
| 2 | **A-5 — batched resolve** | `getMany` on `CatalogService`/`PayloadService`; `RequestResolver.make` over `Digest`; `ResolveCache` re-expressed via `asCache` preserving its published surface, capacity contract and `Exit`-keyed TTL. **No public batch verb** — carriage stays fenced out of the fluent surface | round-trip count on a K-reference decode (`measured`); the public-effects signature wall unchanged for `ResolveCache.resolve` | **the §8 item-0 grill on `RequestResolver`**; and **must land after PR #115 merges** so `Address` inherits it untouched |
| 3 | **A-6 — the shared algebra service** | algebra ops behind a tag; `CasJoin` collapsed via `joinOf`; `cellJoin` earns its brand | the rung negative controls DEV-764 ships, re-pointed at the service | **PR #118 merged** |
| 3 | **A-7 — one replay driver** | five loops → one `Stream.mapAccumEffect` driver; `arrivalOrderReplay` stays a negative control by parameterisation | F2b's existing model gate, plus the committed control traces | A-6 |
| 3 | **A-8 — `Session.views` as a Stream** | the §2 combinator; `Cells.changes`/`Registers.changes` when the watch feed lands | signature wall entry; rung-gated combinator surface per §5 | **PR #116 merged**; ships as *chatter* with no parity claim until AE-4 is ruled; the watch half additionally gated on the **§8 item-0 `PubSub` grill**, DEV-731's probe suite, and advisory-only with no absence reasoning |
| 4 | **A-9 — the CLI on `effect/unstable/cli`** | H2, whole file | help text and command tree derived, not hand-written — a projection under estate law 1 | none technically; sequenced last as the largest single diff |
| 4 | **A-10 — rung⇒combinator in types** | §5's table as a type-level surface over the shared stream service | one negative control per refused row (`unordered` on positional; `changes` on multiset) | A-6, A-8, PR #118 |

**Deliberately excluded from the ladder**, so the exclusion is on the
record rather than an omission: unifying the three CAS disciplines
(refused by API log entry 0026); replacing the deliberate absences
(`Payloads.layer`'s stub, `CasDaemon`'s tag-freedom, the Cell watch
feed) — each is documented and owned elsewhere; and anything that
touches `fixtures/` or a digest.

---

## 8. Flagged as genuinely new — candidates for the grill

Per §1, these do not reduce cleanly to a proved construct. Each is
stated as a candidate with its consumer named, and none is a proposal
this seat will act on.

0. **`PubSub` and `RequestResolver` enter the estate cold.** Neither
   string appears anywhere in `docs/`, `scratch/`, or `packages/` —
   unlike `Cache` (ratified G-3) and `Stream` (priced twice in the
   affordances record), these two have never been grilled here.
   *Consumer:* the watch feed (§3.2) and batched resolve (§3.4)
   respectively. *What they owe:* the affordances catalog's full
   admission discipline — recommended option first, alternatives
   priced, reversal cost stated, and each *"tied to the law that
   licenses it… or honestly marked NEEDS-A-LAW with the candidate
   named"*. This record supplies the licences (F1/F2 for fan-out, C3
   for batching) and the fences (rung-chosen strategy; batching is
   carriage, fenced out of the fluent surface), but **supplies no
   ruling** and asks that §7's A-5 and A-8 not start before the
   grill closes. Naming bound, from the same catalog: no new module
   may shadow an `effect` barrel name — so neither of these mints a
   `PubSub.ts` or a `Cache.ts` in this package, the way 0017/0018
   already refused a `Schedule` module.
1. **Memo permanence as a named law** (§3.3). *Candidate:* the
   forever-valid statement with its **eviction clause** and its
   **anti-clause** — the two parts that are not already written down —
   lifted from a property of `ResolveCache` to a rule about digest
   keys. *Consumer:* every digest-keyed memo — `ResolveCache` today
   (ratified), H8/H9 tomorrow, any future one. *The ruling asked for:*
   whether the generalization is a **corollary of C3** (this seat's
   reading, and the precedent exists — F8 was ruled a corollary, not a
   theorem), a widening of **G-3** whose scope was one memo, or merits
   an F-number beside F11/F12. This seat states the candidate and does
   not choose. *Note against over-claiming:* the storage record's §8.5
   already carries `memoize forever ← content addressing` as a license
   row, so a ruling may reasonably be "already covered, write it down
   as a clause" rather than a new statement.
2. **Rung⇒combinator as a type rather than a table** (§5). *Candidate:*
   materializing the storage record's §8.5 license table in the type
   system, so "a combinator's soundness side-condition is a law atom"
   is enforced rather than documented. *Consumer:* the shared stream
   service, the fan-out strategy choice, `Stream.changes`. *Grill
   question:* is this a *theorem* about the ladder needing its own
   statement and gate, or a mechanical corollary of KM-17 needing only
   the negative controls of A-10? This seat's reading is corollary —
   §8.5 already asserts the rows and KM-17 already earns the brands, so
   nothing new is being claimed, only enforced. The table's
   `positioned` row is the one worth attacking, since it is the row
   that forbids rather than permits. *Dependency:* KM-17 itself is
   `proposed`, not ratified — the sheet's own status line says *"All
   items PROPOSED"* — so A-10 cannot precede its ruling.
3. **A durable digest memo over the estate's own KV** (*lead*, not a
   proposal). The pin's `RequestResolver.persisted` requires a
   `Persistence` service; the estate has NATS KV; memo permanence says
   a persisted entry cannot go wrong. *Consumer:* cross-process and
   cross-restart resolve traffic. *Why it is only a lead:* it adds a
   substrate dependency for a benefit nobody has measured, and G7's
   dependency ceiling plus the "claims sized to evidence" precept both
   say measure first.
4. **The second refusal vocabulary** (`KernelRefusalRow` vs
   `StructuralRefusal | AbsenceRefusal`, `carriage/CasDaemon.ts:75-86`).
   Not a primitive question at all, but it surfaced in the sweep and it
   is a one-door question (estate law 2), so it is filed here rather
   than dropped. *Consumer:* anything that bridges kernel refusals to
   fabric refusals. *This seat proposes nothing;* it reports that two
   vocabularies exist with no bridge.

---

## 9. What this record does NOT claim

- **No measurement.** Not one number here is `measured`. Every
  performance statement is structural — "K sequential round trips
  where one batch would do", "a fresh AST walk per record" — and each
  adoption ticket owes its own before/after. A reviewer should treat
  any speed claim as absent, because it is.
- **No liveness, no throughput, no deployment claim.** Consistent with
  every Plait record and with DEV-764's own brand fence.
- **No new guarantee anywhere.** Every mapping in §3 collects a
  convenience an already-proved law licenses. Where something did not
  reduce, §8 flags it rather than smuggling it.
- **No claim that the pump is losing messages.** §3.1 claims an
  asymmetry of *pedigree* between two adapters, with the package's own
  prose as the oracle — not an observed failure.
- **No claim of primacy.** Three of the four mappings were already
  stated somewhere: `Cache` is ratified at G-3, `Stream` is priced at
  A-8b and B-4, and the license table this record materializes is the
  storage record's §8.5. Where this record found the argument already
  written, it says so and cites it. The genuinely uncited surfaces are
  `PubSub` and `RequestResolver`, and §8 item 0 says exactly that.
- **No parity claim for any stream surface.** Access pattern 7 is
  chatter until AE-4 is ruled, and §2 inherits that fence rather than
  arguing with it.
- **No ruling on the deliberate absences.** The Cell watch feed,
  `Payloads.layer`'s stub, and `CasDaemon`'s tag-freedom are documented
  decisions owned elsewhere; this record notes their downstream cost
  and overrides none of them.
- **No overlap with the three live PRs.** §7 states the dependency
  edges; nothing here re-designs `Session`, the rung ladder, or
  `Address`.
- **Line numbers are read at HEAD** (merge `62c78d4`, post-PR #113).
  Four rows in §6 were re-verified by hand; the rest come from a full
  40-file sweep and will drift as the live PRs merge.
- **This record ships no code**, and nothing in §7 is dispatched by it.

---

## Sources

Ratified: `docs/design/2026-08-17-plait-coordination-fabric.md` (C1–C5,
F1–F6, the confidence-tier table at 21–31, and the law⇒API table at
860–864); `docs/design/2026-08-17-plait-action-plane.md` (C6–C9,
F7–F10); `docs/design/2026-08-17-plait-ratification-record.md` (G1–G12
and the 2026-08-18 wave); `docs/design/2026-08-17-plait-effect-affordances.md`
(**G-sheet ratified 2026-08-18** — A-8a/G-3 the resolve cache, A-8b the
replica's coalescing licence, B-4 the backpressure finding and its two
ruled repairs, and the catalog's admission discipline);
`scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md` (ratified
2026-08-18: the five planes, the import law, stage-3 T-rungs and
T-coalgebra); `AGENTS.md` (seat law, the Effect v4 pin, working
precepts — **not** the claim tiers, which are part 1's).

Pre-grill / proposed: `docs/design/2026-08-18-storage-stack-and-expressibility.md`
(§4.3 rung⇒carrier, §7.1 AE-8 and §7.4 the admission test, §7.3 layer
by plane, §8.2 the cost ladder and its three inversions, §8.5 the
license table, access pattern 7 and its AE-4 fence);
`docs/design/2026-08-18-km-algebraic-register.md` (KM-13, KM-17,
KM-20–23 — the sheet's own status line reads *"All items PROPOSED"*);
`.claude/skills/estate-api-development/` (the five laws and the
admission test).

API log: entry 0026 (the three CAS disciplines are never unified — the
pre-registered refusal this record's §4 is held against); 0017/0018
(no module may shadow an `effect` barrel name); 0025 (G7's ceiling is
external dependencies only).

In flight: PR #116 (DEV-765, `planes/Session.ts`); PR #118 (DEV-764,
`truth/Algebra.ts`, `planes/Fold.ts`); PR #115 (DEV-766,
`planes/Address.ts`).

Pin: `repos/effect/packages/effect/src/{Stream,PubSub,Cache,RequestResolver,Request,Layer,Context}.ts`
at `4.0.0-rc.108`, verified against `repos/effect/packages/effect/package.json`.
Every signature quoted in this record was copied from that source, and
three APIs a memory-written record would have cited do not exist in the
pin: `Stream.unfoldEffect`, `Stream.unwrapScoped`,
`RequestResolver.makeBatched`.
