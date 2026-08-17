# Plait — Effect-native affordances for the CAS surfaces: catalog, audit, routing

Status: **LANDED 2026-08-17** by the coordinator under the ruled design-first sequencing (designs commit before implementation passes). Grill items G-1..G-7 await the operator's ratification; the ticket map (T-A..T-K) cuts only after that ruling. Overlap note at landing: DEV-724 delivered PR #81 after this record's overlap snapshot — the T-K injection items route through the DEV-727 review round and post-merge tickets instead of mid-flight injection; A-9's Blob work targets the shipped Blobs tag. Originally drafted for landing as
`docs/design/2026-08-17-plait-effect-affordances.md`. Written by the
Fable Effect-architecture seat 2026-08-17. Survey–audit–design only: no
repository file changed with this record; Part B reports findings and
repairs nothing (findings before fixes — dispositions are the
operator's); every new surface in Part A is a design to grill, never a
license to build. Per the operator's sequencing rule, this record lands
on main first, and the implementation tickets in Part C cite it as
their authority. Exemplar discipline: every API named below was
confirmed against the vendored pin `repos/effect` (effect
`4.0.0-rc.108`, tag commit `bef7bf38a`) or the installed
`@nats-io/*@3.4.0` declarations — citations are to those sources, never
memory.

Reading base, verified this session: all of `packages/plait/src`
(Digest, Canonical, Wire, Refusal, Subjects, FabricClient, Register,
internal/registers, internal/nats, the barrel), the binding
architecture record (`docs/design/2026-08-17-plait-architecture.md`),
the ratified next-phase plan §C/§D/§E
(`docs/design/2026-08-17-plait-next-phase-plan.md`), VERIFICATION.md
rows 41/47/49/50 and the durability bounds at :349-354,
`packages/plait/DECISIONS.md` T0–T14, the seam rules 1–7
(`scratch/dispatch/32-plait-register-spec.md:30-85`), the F1/F2
statements (`verify/fabric/Fabric/Laws.lean:15-23`,
`Proofs.lean:39-73`), the I1/I2 invariants
(`verify/fabric-veil/FabricVeil/Statements.lean:90-101`), and API log
entries 0013/0018/0022/0023.

**Coordination state (read at 2026-08-17 ~19:20):** DEV-724 (Effect CC
seat: Cell.ts, Catalog.ts + **Blobs service**, Resolved.ts,
ContextProgram scaffolding) is `in_progress` with a run live since
19:16 after four spend-limit failures; **no `agent/effect-cc-pc/*`
branch exists on the remote**, so every overlap below is marked against
the ticket's scope text, not against code. Overlaps are flagged
`[DEV-724 OVERLAP]` inline and consolidated in Part C.

Two pin-check corrections to the tasking hypotheses, recorded first so
nothing downstream builds on them:

1. **`Effect.cachedFunction` does not exist at the pin.** The Effect
   module ships `cached`, `cachedWithTTL`, `cachedInvalidateWithTTL`
   (repos/effect/packages/effect/src/Effect.ts:7068-7188) — all
   single-effect memos, not keyed-function memos. The digest-keyed
   replica must ride `Cache.makeWith` (Cache.ts:190), whose per-exit
   `timeToLive: (exit, key) => Duration.Input` is exactly the shape an
   immutable-truth cache needs.
2. **Equal/Hash instances are largely unnecessary to write.** At the
   pin, `Equal.equals` deep-compares plain objects, arrays, typed
   arrays (content-wise), Maps and Sets (Equal.ts:120-132, the typed
   array branch at :260-275), and `Hash.hash` hashes structures
   (Hash.ts:448). Plait's decoded values are plain structs and branded
   primitive strings, so structural equality and HashMap keying work
   today with no instance code. What the catalog adds is the *law
   connection* (A-1) and the cheap identity-projection instances (A-2,
   A-3) — not hand-written `[Equal.symbol]` implementations.

---

## Part A — the CAS affordance catalog

Discipline (plan §C, restated): every entry is tied to the law that
licenses it — a proved law becomes a convenience surface with inherited
correctness — or is honestly marked **NEEDS-A-LAW** with the candidate
named, or **NEEDS-API-ONLY** (surface over existing law). Nothing
enters the public surface without its law and its generated law tests
(ADR-0010); every new export is automatically walled by the
public-effect gates (DECISIONS T7/T8; API log 0023).

Naming note binding the whole catalog: per API log 0018 and
architecture §1 ("a module owns its concept's type, constructors,
combinators, and service tag together"), **no new module is minted for
matchers or instances** — they land in the concept's own module
(`Refusal.ts`, `Wire.ts`, `Register.ts`, `Digest.ts`), and nothing may
shadow an `effect` barrel name (no `Match.ts`, no `Order.ts`).

### A-1. The Equal⟺digest coherence wall (the identity law, surfaced)

**License:** the canonical-bytes identity law — envelope identity is
SHA-256 over canonical uncompressed bytes (package AGENTS.md), JCS
byte-determinism walled at R0 (VERIFICATION.md:41, the four-row
Go-differential wall), plus the pin's structural equality semantics
(Equal.ts:120-132). Digest.ts's own docstring already names the intent:
"equality is the coherence check."

**The design.** Not an instance — a *wall test* that pins the
coincidence the whole catalog leans on:

```ts
// test/EqualCoherence.test.ts — property over the generated corpus
// plus fast-check envelope arbitraries:
//   Equal.equals(a.envelope, b.envelope)  <=>  a.digest === b.digest
```

- The ⇒ direction is JCS determinism: structurally equal values
  canonicalize to identical bytes (walled at R0), hence equal digests.
- The ⇐ direction holds modulo SHA-256 collision resistance — stated
  as trusted base on the test, the same sentence the ledger rows use.
- The gotcha the wall inherits and must state: the pin caches equality
  per object pair and requires objects not be mutated after first
  comparison (Equal.ts docs, "Objects must not be mutated after their
  first comparison"). Plait values are decode-produced and treated as
  immutable; the wall pins that this assumption is real by comparing
  only decode-fresh values.

**Why it earns its place:** once pinned, every downstream affordance —
HashMap keyed by decoded values, dedup by `Equal.equals`, the
`byDigest` equivalence of A-3 — inherits "structural equality IS
identity equality" as a walled fact instead of folklore.

**Consumers:** every module that ever puts a decoded value in a
HashMap/HashSet; the replica (A-8). **Status: ticket-ready now**
(composes with the merged surface only). NEEDS-API-ONLY — the law
exists; the wall is its executable statement.

### A-2. Order for fencing tokens — `Register.byToken`

**License:** I1 — "the token never decreases, and grant/steal strictly
increase it" (`verify/fabric-veil/FabricVeil/Statements.lean:90-92`,
invariants `token_monotone`, `grant_or_steal_strict`), claimed at R3 +
replay wall (VERIFICATION.md:49). The token-to-KV mapping is DECISIONS
T0 (the token is the key's revision-CAS order; observe reports the
landed lease token).

**Signatures, pin-checked** (Order.ts:177 `Order.Number`, :444
`mapInput`, :800/:835 `min`/`max`, :873 `clamp` all take an `Order`):

```ts
// Register.ts additions — data only, no service change
export const TokenOrder: Order.Order<number> = Order.Number
export const byToken: Order.Order<RegisterState> =
  Order.mapInput(Order.Number, (state: RegisterState) => state.token)
// inherited for free, correctness from I1:
//   Order.max(byToken)      — the later of two observed states
//   Order.isLessThan(TokenOrder)(mine, current) — "am I superseded?"
```

**Bounds, stated on the export (mandatory):** the order is meaningful
only *within one register key and one backing-stream incarnation* (seam
rules 4 and 7 — KV revisions are bucket-global monotone stream
sequences, total per key, never consecutive per key; a bucket
delete+recreate resets the order). Cross-key comparison of tokens is
banned by the same sentence that bans consecutive-revision assumptions.
The incarnation sentence rides the JSDoc exactly as it rides
`RegisterService` today (Register.ts:31-38).

**What it does NOT license:** no client-side arbitration ("pick the
max and act") — the register's own token comparison stays register-side
(seam rules 1–2); `byToken` is a *read-side* convenience for sorting
observed states, audit rows (A-10 is the named consumer), and test
assertions. **Status: ticket-ready now**; E12-adjacent (audit API).
NEEDS-API-ONLY.

### A-3. Equivalence instances — `byDigest`, and the schema-derived form

**License:** for `byDigest`, the same identity law as A-1 (digest
determines canonical bytes determines value, mod collision — one
O(64-char) string compare replaces a deep structural walk). For the
schema-derived form, the pin's own derivation:
`Schema.toEquivalence(schema)` (Schema.ts:14790) with
`overrideToEquivalence` (:14756) where a custom one is wanted.

**Signatures, pin-checked** (Equivalence.ts:220 `String`, :476
`mapInput`):

```ts
// Wire.ts addition
export const byDigest: Equivalence.Equivalence<DecodedEnvelope> =
  Equivalence.mapInput(Equivalence.String, (decoded) => decoded.digest)

// derived structural equivalence over the boundary type, when a
// consumer needs equality of *not-yet-digested* envelope values:
export const envelopeEquivalence = Schema.toEquivalence(Envelope)
```

**Where structural and identity equality genuinely differ** — the
charge's question, answered precisely: for *decoded envelopes* they
coincide (A-1's wall). They differ for **cells**: a cell's meaning is
its verified observation set (F1's convergence half — "the verified
observation set determines the cell,"
`verify/fabric/Fabric/Laws.lean:23`), while its wire form is one
canonical byte string. Two in-memory cell values built by different
merge orders are the *same lattice point* before either is
canonicalized; extensional set equivalence (order-insensitive) is the
lattice-point equality, byte equality is the wire equality, and
canonicalization is what collapses them. The affordance: a
`Cell.equivalence` (extensional, set-based — the pin's Map/Set
comparison is already order-independent, Equal.ts:275-285) beside
`Cell.digestOf` (wire), with the collapse (`equivalent ⟺ equal digest`)
walled by the F1 vector family. `[DEV-724 OVERLAP]` — Cell.ts is
DEV-724's module; this entry is a shape for its DECISIONS log, not a
parallel build. **Status:** `byDigest` + `envelopeEquivalence`
ticket-ready now; cell equivalence rides DEV-724. NEEDS-API-ONLY.

### A-4. PrimaryKey for digest-carrying values

**License:** the identity law again — a digest is *the* stable string
identifier of a value, which is exactly the `PrimaryKey` contract
(PrimaryKey.ts:62, `[symbol](): string`). Composition points at the
pin, verified: `unstable/persistence` (Persistable.ts, Persistence.ts),
`unstable/cluster` (Envelope.ts, MessageStorage.ts, ShardId.ts),
`unstable/rpc` (Rpc.ts), `HashRing.ts` all consume `PrimaryKey`.

**The honest shape:** `PrimaryKey` wants an *object carrying the
symbol method* — idiomatic on class values, unidiomatic bolted onto
plain interfaces. Today's spine ships plain structs, so the entry is a
design reservation, not a build: when DEV-724's `Resolved.ts` /
`Cell.ts` (or a later persistence consumer at E7+) mint class-shaped
values, they implement `[PrimaryKey.symbol]() { return this.digest }`
and inherit every pin machinery that keys by primary key.
`[DEV-724 OVERLAP]` (its classes are the natural carriers).
**Status:** rides DEV-724 or the first persistence consumer;
NEEDS-API-ONLY; build-behind-consumers says not before then.

### A-5. Schema affordances — the Digest brand, audited against the pin

**Audit verdict on the shipped brand (Digest.ts:9-12): it is the pin's
best form.** `Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/))`
matches the pin's filter idiom exactly (Schema.ts:6745 — `isPattern`
carries the JSON-Schema `pattern` constraint and the fast-check
arbitrary constraint automatically), `.pipe(Schema.brand(...))` is the
pin's nominal-brand form (Schema.ts:5229; note the pin's own gotcha —
brand adds no runtime check, which is why the pattern check rides
first), and `.annotate({ identifier })` is the pin's annotation door. A
template-literal schema was considered and is NOT recommended:
`Schema.TemplateLiteral` (Schema.ts:2786-2870) models *concatenation
shapes*, not fixed-length character-class repetition — a 64-hex-char
constraint is not expressible as a template literal at the pin, and the
regex filter is the pin's own tool for exactly this (`isUUID` at
:6933-7006 is the in-house precedent: a dashed-hex format done as a
pattern check). No change requested.

One small internal convenience beside it, licensed by the same
identity law: `digestOfCanonicalBytes` — hashing bytes already known
canonical (see finding B-5) — a speed repair inside the existing law,
not a new public name.

**Envelope and refusal pattern schemas already exist** (Wire.Envelope,
Wire.Certificate, Wire.BlobReference; Refusal.Refusal as a
`Schema.Union` of two `Schema.TaggedError` classes — the v4 idiom per
Schema.ts:14488). The missing affordance over them is A-6.

### A-6. Match-based pattern matchers over the discriminated unions

**License:** T10 — "the closed kind enumeration spans every register
structural law … the enumeration's own contract is 'every structural
kind the package can mint'" (packages/plait/DECISIONS.md) — plus the
enumerate-from-the-union test discipline (plan §C.3: the error
catalogue and the test share a derivation). Exhaustiveness checking is
the error-reduction mechanism: adding a sixteenth kind, a third refusal
sort, or a fifth envelope kind must *fail to compile* every consumer
that has not handled it. The pin's tools, verified: `Match.type`
(Match.ts:278), `tagsExhaustive` (:1086), `discriminatorsExhaustive`
(:871), `withReturnType` (:467), `exhaustive` (:1969).

**Signatures, pin-checked, living in their concept modules:**

```ts
// Refusal.ts — fold over the sort union (the _tag IS the sort carrier)
export const match: <Out>(cases: {
  readonly StructuralRefusal: (refusal: StructuralRefusal) => Out
  readonly AbsenceRefusal: (refusal: AbsenceRefusal) => Out
}) => (refusal: Refusal) => Out =
  (cases) => Match.type<Refusal>().pipe(Match.tagsExhaustive(cases))

// Refusal.ts — exhaustive fold over the closed structural-kind union;
// Match.discriminatorsExhaustive("kind") makes the fifteen-arm record
// a compile-time closure check (T10's contract as a type error):
export const matchKind: <Out>(cases: {
  readonly [K in StructuralRefusalKind]: (refusal: StructuralRefusal) => Out
}) => (refusal: StructuralRefusal) => Out

// Wire.ts — envelope kind fold (the four monotone observation kinds)
export const matchKind: <Out>(cases: {
  readonly [K in EnvelopeKind]: (envelope: Envelope) => Out
}) => (envelope: Envelope) => Out

// FabricClient.ts — publish acknowledgement fold; "duplicate" means
// suppressed by Nats-Msg-Id within the pinned two-minute window,
// stream-wide (DECISIONS T5) — the matcher's JSDoc carries that bound
export const matchPublished: <Out>(cases: {
  readonly fresh: (published: PublishedEnvelope) => Out
  readonly duplicate: (published: PublishedEnvelope) => Out
}) => (published: PublishedEnvelope) => Out

// Register.ts — the observable state space as a fold. The three-way
// split is the Veil model's own vocabulary (absent / held / landed);
// I2 (at_most_one_landed_commit, no_stale_token_lands) is what makes
// "landed" a terminal, unambiguous arm.
export const matchState: <Out>(cases: {
  readonly absent: () => Out                       // token 0, no holder
  readonly held: (state: { token: number; holder: string }) => Out
  readonly landed: (state: { token: number; holder: string; outcome: RegisterOutcome }) => Out
}) => (state: RegisterState) => Out
```

Implementation notes bound to the pin: `matchPublished` and
`matchState` discriminate on non-tagged shapes, so they are plain
conditional folds (the pin's `Match.when` with predicates would work
but adds nothing over a direct fold on two/three arms — Match earns its
keep where the union is wide and *closed*, i.e. `matchKind`). The
Refusal matchers get generated law tests: the enumerate-from-the-union
test already planned for the error catalogue doubles as the matcher's
closure suite.

**Consumers:** every refusal-handling developer (plan §C.7); the error
catalogue generator (same derivation); E9's action-round handling.
**Status: ticket-ready now.** NEEDS-API-ONLY, behind grill G-1 (a
public-surface addition wants the one-decision grill).

### A-7. The CAS combinator — `casJoinLoop`, one lawful write loop

**The pattern, named.** The merge-then-`update(rev)` loop appears (or
will appear) in: DEV-724's cell write loop (its ticket text: "re-read
and re-merge on a lost CAS race — convergent by F1"), the directory (a
grow-only cell — API log 0013, so the same loop), and — *in a
different, non-unifiable form* — the register's read-back
reconciliation (internal/registers.ts:279-307). Writing the loop once
is the universal-properties-to-DX move; writing it *twice on purpose*
(once for joins, once for registers) is the load-bearing design
decision, because the two loops are licensed by different laws:

**For lattice joins, idempotence discharges CAS ambiguity.** Seam rule
1 says an ambiguous failed CAS append must be reconciled by read-back
comparison, because the append may have landed before the failure
surfaced. The register does that comparison (`sameStored` against the
intended record) because its writes are once-only. A join write needs
*no comparison at all*: if the ambiguous write landed, re-reading and
re-merging is a no-op by idempotence (`Cell.merge cell cell = cell`,
F1's third conjunct, Laws.lean:21); if it did not land, the retry is
the write. Re-merge order and duplication cannot change the outcome
(commutativity + associativity, F1; permutation/duplication invariance
at trace level, F2, Proofs.lean:59-73). So the combinator inherits
convergence from F1 with no case analysis — the proof does the work
the register does by hand.

**Signature, designed against the pin** (Reducer.ts:54 — a lawful join
is exactly a `Reducer` whose combine is ACI with the empty cell as
`initialValue`; the ACI brand is earned by the generated law suite per
Algebra.ts's discipline, architecture §3):

```ts
// internal/cas.ts (internal first; promotion is a grill decision)
export interface Versioned<A> {
  readonly value: A
  readonly revision: number
}
export const casJoinLoop: <A>(options: {
  /** the ACI join; the brand is earned, never asserted */
  readonly join: Reducer.Reducer<A>
  /** read current state; null when the key is absent */
  readonly read: Effect.Effect<Versioned<A> | null, Refusal>
  /** create-if-absent; fails with the classified conflict */
  readonly create: (value: A) => Effect.Effect<number, Refusal>
  /** revision-CAS update; fails with the classified conflict */
  readonly update: (value: A, expectedRevision: number) => Effect.Effect<number, Refusal>
  /** this writer's contribution */
  readonly contribution: A
}) => Effect.Effect<Versioned<A>, Refusal>
// semantics: read → merged = join(current ?? initial, contribution)
//   → create/update(rev) → on conflict-classified failure: re-read,
//   re-merge, re-CAS. Transport-class failures surface as absence
//   refusals for the caller's retryAbsence policy — the loop retries
//   only *conflicts*, never transport, so the absence-only retry
//   discipline (Refusal.ts) is preserved.
```

**Stated semantics and non-claims (mandatory on the export):**
convergence-on-success is F1's; **termination is NOT claimed** — under
perpetual contention the loop may retry unboundedly (safety-only, no
liveness, house law); the conflict classification inside `create`/
`update` is operation-context + code 10071 (seam rule 2) and lives in
the adapter, never in the combinator; every claim is bounded to a fixed
backing-stream incarnation (seam rule 7 — the sentence rides the
JSDoc).

**Pre-registered refusal, so nobody unifies what must stay split:** the
register's reconcile-by-comparison loop is NOT a `casJoinLoop` instance
and must never become one. Its writes are not idempotent joins (an
outcome lands at most once — I2), so the ambiguity that idempotence
discharges for cells must be resolved by read-back comparison there,
and the token comparison stays register-side (seam rules 1–2). One
combinator for joins, one bespoke path for fences; the type that keeps
them apart is the `Reducer` parameter with its earned ACI brand.

`[DEV-724 OVERLAP — the direct one]`: DEV-724's Cell.ts write loop IS
this combinator's first consumer. Because its seat is mid-run with no
code pushed, the composition route is the coordinator's choice: (a)
inject this design into DEV-724's thread now so Cell.write is built ON
the combinator (preferred — the loop is written once from birth), or
(b) let DEV-724 land its inline loop and extract `casJoinLoop` as a
follow-up refactor with the F1 vector family as the regression wall.
Priced in Part C. **Status:** grill G-2, then either route.

### A-8. The local replica — digest-keyed cache + lattice mirror

Two services, two different licenses, one honesty rule (F8's
vocabulary: all local truth is head-relative — "at least this," never
"exactly this," never "not present anywhere"). One durability sentence
binds both, from A-11's facts: **the replica caches over an
already-durable substrate — it exists for latency and read
amplification, never for durability.** Losing every replica loses
nothing but time.

#### A-8a. `ResolveCache` — immutable truths, evict-for-space-only

**License:** content addressing. A digest names exactly one canonical
byte string (JCS uniqueness, walled R0) and the Resolved decode
re-derives the digest of what it fetched and refuses on mismatch
(architecture §3 — "re-derivation is unskippable … the schema *is* the
verify-on-read law"). Therefore a cached *successful* resolve can never
be stale — there is nothing an invalidation could learn. Eviction
exists only to bound memory. F8 (head-relative truth, ruled a corollary
under F7+F3, plan §A.4 table) is what the cache must NOT contradict: a
resolve *failure* is head-relative absence and must never be cached as
a fact.

**Design, pin-checked against Cache.ts:**

```ts
// Catalog.ts (the service belongs to the catalog module — [DEV-724 OVERLAP])
const makeResolveCache = (options: { readonly capacity: number }) =>
  Cache.makeWith(
    (digest: Digest) => catalog.resolve(digest),   // Effect<Value, Refusal, ...>
    {
      capacity: options.capacity,
      // immutable truths: successes never expire; failures are never
      // cached (zero TTL removes the entry immediately — Cache.ts:444-447)
      timeToLive: (exit) =>
        Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
    },
  )
```

What the pin gives for free, verified in source: keys compare by
Equal/Hash via `MutableHashMap` — a branded digest string is a
primitive, so keying is native (Cache.ts:213); **concurrent lookups of
one digest deduplicate onto one in-flight fiber** (Cache.ts:427-433 —
awaiters join the entry's fiber; interrupted lookups are removed rather
than poisoning the map, :436-441); capacity eviction is oldest-first
with a touch-on-get refresh, least-recently-used in effect (:427-431
re-insertion, :492-500 eviction). Services: the lookup captures the
Catalog context at construction (the default `requireServicesAt` mode),
so the cache is built inside the Catalog layer and the user-facing
`resolve` keeps a clean channel.

**What it does NOT claim (mandatory JSDoc):** no freshness (nothing
here is fresh or stale — the keyspace is immutable); no absence
reasoning (a failed resolve is an `AbsenceRefusal` that flows to the
caller's `retryAbsence` policy and is not recorded); no cross-process
coherence (it is one process's working set); no durability role
(A-11); capacity is deployment configuration, never identity-bearing
(the same sentence as the blob threshold, plan grill item 10).

`[DEV-724 OVERLAP]`: `Catalog.ts` and `resolve` are DEV-724's; this
cache is a *decorator* on its service — buildable the day its Catalog
merges, as `Catalog.cached({ capacity })` wrapping the live layer.
**Status:** design ready; rides DEV-724's merge; grill G-3 for the
public shape.

#### A-8b. `CellReplica` — the local join, convergent by construction

**License:** F1 (ACI + "the verified observation set determines the
cell") makes a locally maintained join of every state ever observed
(a) order-insensitive, (b) duplication-insensitive (F2), and (c) always
a *lower bound* of the authoritative cell in the lattice order — which
is precisely the monotone-read guarantee, and nothing more. Feeding it
by polling is licensed today; feeding it by watch is licensed only
after the ratified ninth probe suite lands (plan §D.1 + grill item 9 —
watch semantics at the pin are UNPROBED; the suite does not exist yet
as a ticket, verified on the board this session), and then
advisory-only: **no absence reasoning from a watch, ever.**

**Design, pin-checked** (SubscriptionRef.ts:111 `make`, :160 `changes`
— a Stream of values, :726 `update`):

```ts
// Cell.ts (its module — [DEV-724 OVERLAP]); shape for its DECISIONS log
export interface CellReplica<A> {
  /** current local join — a lattice lower bound of the remote cell */
  readonly current: Effect.Effect<A>
  /** monotone stream of local joins; coalescing is harmless by F1 */
  readonly changes: Stream.Stream<A>
  /** merge one observed remote state into the local join */
  readonly absorb: (observed: A) => Effect.Effect<void>
}
export const makeReplica = <A>(join: Reducer.Reducer<A>) =>
  Effect.map(SubscriptionRef.make(join.initialValue), (ref) => ({
    current: SubscriptionRef.get(ref),
    changes: SubscriptionRef.changes(ref),
    absorb: (observed: A) =>
      SubscriptionRef.update(ref, (local) => join.combine(local, observed)),
  }))
```

`SubscriptionRef` (not `SynchronizedRef`) is the right carrier because
the join is pure and total — the update needs no effect — and `changes`
gives the UI/agent stream for free (streams as the only read surface,
architecture §4). If DEV-724's join were ever effectful the carrier
question reopens; it should not be (a lattice join is data).

**Coalescing note, licensed:** a subscriber that misses intermediate
`changes` values loses nothing — by F1 the latest local join absorbs
every skipped state. This is the exact sentence that later licenses a
coalescing KV watch feed (plan grill item 9 says so: "F1 licenses
coalesced lattice watches"), so the replica's interface is
*watch-ready without claiming watch*.

**What it does NOT claim (mandatory JSDoc):** no freshness — `current`
is a lower bound, head-relative (F8's vocabulary); **no absence
reasoning** — "the replica does not contain X" is a statement about
this process's observation history, never about the fabric (G9's
grammar refuses the inference); no durability role (A-11); no
cross-replica agreement claim beyond F1's convergence (two replicas
that have absorbed the same observation set are equal — that IS
`f1_same_verified_set_converges`, and the F1/F2 vector families are the
wall material). **Status:** rides DEV-724 (Cell.ts owns it); the
polling pump is buildable with its merge; the watch feed waits on the
ninth-suite ticket (Part C mints it).

### A-9. The blob storage model — one service, swappable Layer backends

**The licensing law, stated once for the whole family:** content
addressing makes every backend's correctness *locally checkable* — the
reader re-derives the digest of what it fetched and refuses on
mismatch, so no backend is trusted about content, ever. Backend choice
is therefore availability and cost, **never meaning**: identity is of
canonical uncompressed value bytes, and store metadata carries no
identity role (part 1 §6.3's refused column, restated in plan §D.4).
The 256 KiB inline threshold (already shipped as
`Wire.INLINE_BODY_MAX_BYTES`, Wire.ts:37, with its
`inline-body-too-large` refusal) is deployment configuration with a
wall, never identity-bearing (plan grill item 10's bound): whether
bytes ride inline or as `{blob: Digest}` is invisible to identity.

**The service interface — capabilities, never vendors.** The interface
names what a backend can do (durable-put, verified-get), not who does
it (ratified capabilities-never-vendors posture, plan header). Shape,
designed against the shipped refusal vocabulary
(`malformed-blob-reference` and `digest-mismatch` are already in the
closed structural-kind union, Refusal.ts:23-39; blob absence is an
`AbsenceRefusal` — absence kinds are an open string field by design,
Refusal.ts:55-62):

```ts
// Blob.ts — the module the architecture map already reserves
export interface BlobsService {
  /**
   * durable-put: derives the digest client-side, writes, acknowledges
   * only after the backend's durable write completes. Idempotent by
   * content addressing: putting bytes already stored is a success
   * returning the same digest.
   */
  readonly put: (bytes: Uint8Array) => Effect.Effect<Digest, Refusal>
  /**
   * verified-get: fetches, RE-DERIVES the digest over the fetched
   * bytes, refuses `digest-mismatch` on any disagreement. There is no
   * unverified read path.
   */
  readonly get: (digest: Digest) => Effect.Effect<Uint8Array, Refusal>
  /** presence check; a `false` is head-relative, never global absence */
  readonly has: (digest: Digest) => Effect.Effect<boolean, Refusal>
}
```

**Ranged-get is named and refused, with its law debt registered.** A
partial read cannot verify-on-read — a byte range cannot re-derive the
whole-value digest, so serving it would open the exact unverified-read
hole the architecture forbids ("there is no decode path that trusts an
asserted digest," §3). The capability stays OFF the interface until its
law exists. **NEEDS-A-LAW, candidate named:** a chunk-manifest identity
law — large values carried as a manifest of chunk digests, the manifest
itself a cataloged value whose digest commits to the chunk list; a
ranged read then verifies the *chunks* it fetched against the manifest.
The ratified object-store probe (plan grill item 10 covers "partial
reads at the pins") is the evidence-gathering half; the law is a later
grill. Until then, `get` is whole-value only on every backend.

**Backend (a): `LocalFileSystemBlobs` — the day-0 story, zero new
dependencies.** Built on the pin's *core* portable FileSystem service —
at rc.108 `FileSystem` lives in the effect package itself
(repos/effect/packages/effect/src/FileSystem.ts:663,
`Context.Service("effect/platform/FileSystem")`; operations return
Effects failing with `PlatformError`). The platform layer is the
*application's* choice: `@effect/platform-bun`'s BunFileSystem or
`@effect/platform-node`'s NodeFileSystem
(repos/effect/packages/platform/node/src/NodeFileSystem.ts:21,
`export const layer: Layer.Layer<FileSystem>`), both already
catalog-pinned at rc.108 in the workspace root (package.json:14). So:

```ts
// Blob.ts
export class Blobs extends Context.Service<Blobs, BlobsService>()(
  "@foldlab/plait/Blobs",
) {
  /** directory store keyed by digest; requires the platform FileSystem */
  static readonly layerFileSystem: (options: {
    readonly root: string
  }) => Layer.Layer<Blobs, Refusal, FileSystem.FileSystem>
  // testLayer per house shape; FileSystem.layerNoop (FileSystem.ts:954)
  // and makeNoop (:825) are the pin's own test seams.
}
```

Mechanics, against the pin's operation set (FileSystem.ts:143 exists,
:157 makeDirectory, :197 makeTempFile, :246 readFile, :287 rename,
:365 writeFile): put = write to a temp name, then `rename` into place
at `<root>/<digest[0..2]>/<digest>` — the digest-named file appears
only complete (crash mid-put leaves temp garbage, never a half-blob
under a digest name); the two-character fan-out is layout, not
identity. get = `readFile` + re-derive + refuse. Durability honesty,
mirrored from A-11's spectrum: the local backend is **crash-durable at
the OS level, not power-durable** — `writeFile` does not fsync at the
pin; if a power-durable local store is ever needed, that is an fsync
option on the layer, priced then, and claimed never before measured.
`PlatformError` is mapped to Refusal at the seam: not-found →
`AbsenceRefusal` kind `blob-absent`; any integrity disagreement →
structural `digest-mismatch`; everything else per the B-7 disposition
(defects stay defects). This backend needs **no substrate probe** — the
verify-on-read law is checked by its own conformance suite (below).

**Backend (b): the NATS object store — interface slot, GATED.**
`@nats-io/obj@3.4.0` is already one of the pinned NATS dependencies
(packages/plait/package.json), and `OBJ flb-fab-blob` is reserved in
the subject grammar (plan §D.4) — but the object store's
chunking/metadata semantics at the pin are **unprobed** (DEV-704
scoped to streams/KV), and the probe-first mandate exists because
FINDING 1 was found by probe, not docs. The slot:
`Blobs.layerObjectStore(options)` with the same `BlobsService`
contract; **no build before the ratified probe dispatch** (plan grill
item 10: put/get integrity, chunk boundaries, partial-read behavior at
`@nats-io/obj@3.4.0` + server 2.14.4, timed after M2 for E12's
embedding consumer). A chunked read path that trusted store-side
digests would be a verify-on-read hole — the probe informs both the
backend and the chunk-manifest law above.

**Backend (c): S3-shaped remote — the seam is the design.** Nothing
S3-specific is designed here, deliberately: the whole point of the
service seam is that a third backend is *just another Layer* satisfying
`BlobsService`, written against capabilities (durable-put,
verified-get), never against a vendor's vocabulary — no bucket, region,
or credential shape appears in any Plait type. When a deployment wants
one, it writes `Layer.Layer<Blobs, Refusal, TheirHttpDeps>` in its own
package and inherits the conformance suite. Recorded so nobody
"prepares" vendor hooks in the interface.

**The backend-agnostic conformance suite (the wall).** One generated
law suite runs against *every* layer: put→get round-trips
byte-identically with the digest re-derived; get of an absent digest is
an absence refusal; a corrupted store (the control: flip one byte
behind the backend's back) is refused `digest-mismatch`, never served;
put is idempotent. A backend ships only with the suite green — that is
the "locally checkable" license made executable, and it is what makes
the three backends one family instead of three storage products.

`[DEV-724 OVERLAP — direct]`: DEV-724's ticket scope includes "the
Catalog and **Blobs** services as Context.Service classes with static
layers plus the in-memory test layer." A-9 designs the *backend
family* for the tag DEV-724 scaffolds; the interface above must reach
its seat (coordinator injection, same door as A-7) or its in-memory
service risks fixing a different contract. The architecture map keeps
`Blob.ts` its own module (payloads and threshold) beside `Catalog.ts`
(resolve seam); the tag's home follows the map. **Status:** interface +
local backend + conformance suite are one ticket behind DEV-724's tag
(grill G-5); the OBJ backend waits on the probe (already-ratified
item 10); ranged-get waits on its law (G-6).

### A-10. The fluent replay API over KV history

**Substrate, probed and shipped:** NATS KV retains per-key history —
the register bucket declares 64 revisions per key with no age or size
eviction (Register.ts:9-10, enforced by the shape check at
internal/registers.ts:234-260) — and the pinned client serves it as an
iterator: `bucket.history({ key }) → QueuedIterator<KvWatchEntry>`
(`@nats-io/kv/lib/types.d.ts:319-321`, an AsyncIterable — the same
`Stream.fromAsyncIterable` door as B-4), tombstones included, revisions
bucket-global (probed: plan §D.2 — "delete keeps tombstones, purge
rollup leaves only its marker"). The register replay wall already
audits this history row-by-row privately (DECISIONS T0: "every
generated row audits its history for at most one landing and no
zombie"); the affordance promotes that read into a served surface.

**`Registers.audit(work)` — certified history rows in fence-token
order.** Ratified shape (plan grill item 7, ruled yes as an
E12-adjacent ticket after M3): served, certified rows; **every row
stamped with the backing-stream incarnation; depth bounded by declared
retention.** Design:

```ts
// Register.ts — read-only; the service gains one method or a sibling
export interface AuditRow {
  readonly revision: number   // bucket-global stream sequence — presented
                              // as-is; per-key ordinals are never invented
                              // (seam rule 4)
  readonly token: number      // the fence-token meaning (T0 mapping)
  readonly holder: string | null
  readonly outcome: RegisterOutcome | null
  readonly operation: "create" | "update" | "delete-marker"
}
export interface RegisterAudit {
  readonly incarnation: string          // the backing stream's creation identity
  readonly retainedDepth: number        // 64 — by declaration (G21's sentence)
  readonly rows: ReadonlyArray<AuditRow> // ascending token order — I1 licenses
                                         // presenting this AS an order
}
readonly audit: (work: string) => Effect.Effect<RegisterAudit, Refusal>
```

**License:** F5's I1/I2 make the retained history the *witness* of the
fence order — audit is a read of what the theorems govern, so it
inherits correctness rather than claiming any (plan §D.2's sentence,
adopted verbatim). I1 licenses the ascending-token presentation; T0
licenses the token column (outcome rows report the landed lease token).

**The two bounds that ride every response, non-negotiable:**
(1) **history is PER INCARNATION** — an audit spanning a bucket
recreation is two histories, never one order; the `incarnation` stamp
is what makes the response honest, which is why **audit cannot ship
before the incarnation pin converts from recorded deferral (T6) to
machinery** — and that is already the ratified trigger (plan grill
item 8: the pin converts when `Registers.audit` ships, capture at
register-open, revalidated on the existing read-back path, walled by a
bucket-recreation control). This design adds no new decision; it names
the dependency edge: audit ⟸ incarnation pin, one ticket.
(2) **head-relative truth** — an audit answers "what was true at these
coordinates," never "what is current"; by the time the response is
read, a later token may exist. The response is a certificate about
retained history, not a freshness claim.

**The general `Replay` builder — from-anchor, through-revisions,
fold-forward.** The fluent surface over KV-backed history, designed as
one builder with per-carrier entry points so each arm cites its own
law (fluency at the pin is method-chaining into `.pipe`-able terminals
— the Schema `.check(...).pipe(...)` precedent, Digest.ts:9-11):

```ts
// Replay — entry points return an immutable builder; the terminal
// yields an Effect. Sketch of the register arm (buildable):
Replay.register(work)          // rows in token order        — I1
  .fromToken(t)                // suffix cut is well-defined  — I1 (total per key)
  .fold(reducer)               // fold-forward over rows      — Reducer.make
// : Effect.Effect<A, Refusal, Registers>

// carrier slots, each landing with its owner:
Replay.cell(key)               // order-free by construction  — F1/F2 [DEV-724]
Replay.lane(lane).fromAnchor(anchor).fold(algebra)
                               // anchored resumption         — F3 [E4's Fold/Anchor]
```

The register arm is concrete and near-term (it is `audit` plus a
fold). The cell arm is trivial by design — replaying observed states
in any order and multiplicity converges (F1/F2), so its builder adds
only ergonomics — and belongs to Cell.ts `[DEV-724 OVERLAP]`. The lane
arm is E4's territory (dispatch 31 owns Fold/Anchor; F3 —
`f3` anchored resumption — is its cited law) and is a *slot* here, not
a design: this record does not front-run E4's fold surface. Bounds on
every arm: per-incarnation, head-relative, and depth-by-declaration —
the three sentences above, inherited wholesale.

**Status:** `audit` + the register `Replay` arm are one post-M3 ticket
fused with the incarnation-pin conversion (both already ratified in
substance — plan grill items 7 and 8; what is new here is only the row
and builder *shape*, grill G-7); the cell arm rides DEV-724; the lane
arm rides E4.

### A-11. Persistence facts — what the substrate already guarantees

Stated as facts with their evidence, because the replica and cache
designs above must not re-claim (or accidentally disclaim) any of it:

1. **NATS KV and streams on this deployment are file-persisted by
   construction.** Every Plait stream/bucket is *declared* file-backed
   R=1, and the shape checks REFUSE anything else at acquisition: the
   commons stream requires `storage: "file"`, one replica, and the
   pinned duplicate window (internal/nats.ts:35-42, refusal
   `substrate-shape` at :57-79); the register bucket requires
   file/R=1/history=64/ttl=0/max_bytes=-1 (internal/registers.ts:
   230-260, refusal `register-substrate-shape`). A memory-storage
   server is not a degraded mode; it is refused.
2. **Process-crash recovery is proven, both sync modes.** The
   substrate gate witnesses Linux SIGKILL recovery in CI for both sync
   modes (VERIFICATION.md:50, `go/substrate/`); seam rule 6 bounds the
   claim: crash evidence is process-crash only.
3. **The declared durability spectrum:** `crash-durable` (default,
   background sync — acknowledged bytes may still be in kernel
   buffers; the pinned server's failsafe sync is ~2 minutes) versus
   `power-durable` (pinned `SyncAlways`, paying the measured
   synchronous-write price) — VERIFICATION.md:349-354. **Power-loss
   durability is explicitly never claimed** anywhere in the estate.
4. **Consequence for this catalog, one sentence:** the local replica
   (A-8) and every cache in this record sit *over* an already-durable
   substrate — they exist for latency and read amplification, never
   for durability; no recovery path may ever read a replica as a
   source of truth.

---

## Part B — the idiomatic audit, file by file against the pin

Numbered findings; each carries file:line, the pin-referenced idiom,
and the concrete recommendation. **No edits were made** — findings
before fixes; dispositions are the coordinator's. Positive findings are
recorded too, because "audited, matches the pin" is information.

**B-1. StoredRegister decode admits excess keys while its law says
"closed".**
`packages/plait/src/internal/registers.ts:139` —
`Schema.decodeUnknownResult(StoredRegister)(value)` passes no options;
at the pin `onExcessProperty` defaults to `"ignore"`, which *strips
unknown object keys silently* (SchemaAST.ts:445). The refusal minted
two lines down states the law "Register state is a closed
holder/outcome record" — but a record `{holder, outcome, foreign: 1}`
decodes cleanly, and the read-back reconciliation's `sameStored`
comparison (:165-166) would then equate an intended append with a
landed record carrying extra fields. Within the envelope only register
operations write the bucket, so this is a wall-tightness gap, not a
live bug. Pin idiom: Wire.ts:232-236 already passes
`{ onExcessProperty: "error", errors: "first", reportInput: true }`.
**Recommendation:** same options here, so the stated law and the
executed decode agree.

**B-2. `Register.hold` is the one public effectful function without
`Effect.fn`.**
`packages/plait/src/Register.ts:78-99` — `hold` builds with
`Effect.gen` directly; architecture §4 rules "`Effect.fn` names every
exported effectful function (spans for free)," and every other export
complies (Digest.ts:31, Canonical.ts:122, Wire.ts:226/252/269,
Subjects.ts:51/63/71, both internal `make*` services and their
methods). Pin form: Effect.ts:13563, LLMS.md:107-160.
**Recommendation:** wrap as `Effect.fn("Register.hold")(function* (...))`
— one-line change, restores span coverage for the surface most likely
to sit in a production trace (the lease heartbeat).

**B-3. The heartbeat loop hand-rolls what Schedule and SynchronizedRef
already carry.**
`packages/plait/src/Register.ts:89-96` — `while (true) { sleep; get;
renew; set }`. Two pin idioms apply: the recurring effect is
`Effect.repeat(renewOnce, Schedule.spaced(heartbeatEvery))`
(Schedule.ts:1198; reads as policy and composes jitter/backoff later),
and the read-renew-write triple is one atomic
`SynchronizedRef.updateEffect(token, (current) =>
Effect.map(registers.renew(work, current), (s) => s.token))`
(SynchronizedRef.ts:485) — today's get/renew/set is raced only by
fibers that don't exist yet (nothing else writes the ref), so this is
idiom and future-proofing, not a live race. Both compose with TestClock
(the package already imports `effect/testing` in RefusalNext.test.ts).
**Recommendation:** adopt both when `hold` is next touched; no behavior
change claimed.

**B-4. The subscribe pump's unbounded buffer forfeits backpressure the
pinned client already provides.**
`packages/plait/src/internal/nats.ts:188-199` — `Stream.callback` with
`Queue.offerUnsafe` and no options: the pin's default is an unbounded
buffer (Stream.ts:669-671), so a slow consumer accumulates every
delivered message in process memory while the NATS client keeps
pulling. Two pin-current repairs, in preference order: (a) keep
`Stream.callback` but pass `{ bufferSize, strategy: "suspend" }`
(Stream.ts:694-700) — smallest diff; or (b) drop the adapter:
`ConsumerMessages` is an AsyncIterable at the pinned client
(`@nats-io/jetstream/lib/types.d.ts:708` — `QueuedIterator<JsMsg>`,
`@nats-io/nats-core/lib/core.d.ts:626-627`), so
`Stream.fromAsyncIterable(messages, onError)` (Stream.ts:1277) under
the existing `acquireRelease`/`Stream.unwrap` (Stream.ts:1633) inherits
the client's own flow control and deletes the hand-rolled queue pump.
DECISIONS T4 chose the callback adapter so interruption closes an idle
pump — route (b) preserves that (the release's `messages.close()` ends
the iterator), but T4 must be superseded by a new entry if adopted, per
the decisions discipline. **Recommendation:** (a) now, (b) as the
recorded follow-up; either way the buffer bound stops being implicit.

**B-5. Every envelope decode canonicalizes twice; every publish, three
times plus a JSON re-parse.**
`packages/plait/src/Wire.ts:242-243` — `decodeEnvelope` computes
`canonicalBytes(decoded.success)` and then `digestOf(decoded.success)`,
and `digestOf` (Digest.ts:34) *re-runs* `canonicalBytes` on the same
value: two full canonicalizations per decode. `encodeEnvelope`
(Wire.ts:252-257) canonicalizes, then re-enters `decodeEnvelope`
(`decodeJson` re-parse + the two canonicalizations): the publish path
(nats.ts:169) pays all of it per message. The one-door discipline
(encode goes through the constrained decode — DECISIONS T2's spirit) is
deliberate and should stand; the *repair that needs no new law* is
hashing the bytes already in hand: an internal
`digestOfCanonicalBytes(bytes: Uint8Array): Digest` (SHA-256 over the
canonical bytes `decodeEnvelope` just produced) — identity is defined
as exactly that hash (package AGENTS.md), so the fast path is the
definition, not a shortcut. Refusal behavior is untouched.
**Recommendation:** internal helper + use at Wire.ts:243; measure
before touching the encode re-parse (the R0 wall's four rows regenerate
identically either way — that is the regression gate).

**B-6. Hand-rolled structural comparators re-derive what the pin's
Equal now provides — and drift when fields are added.**
`packages/plait/src/internal/registers.ts:159-166` (`sameOutcome`,
`sameStored`) and `packages/plait/src/internal/nats.ts:110-115` (the
sort-and-scan subject comparison). At the pin, `Equal.equals`
deep-compares plain records, arrays and typed arrays by content
(Equal.ts:120-132, :260-285) — `Equal.equals(stored, intended)` is the
whole of `sameStored`, and `Equal.equals(actual.toSorted(),
expected.toSorted())` the whole of the subject check. The failure mode
the hand-rolled form invites is silent: add a field to `StoredRegister`
and `sameStored` keeps comparing only the old two — the read-back
reconciliation would then claim "landed as intended" on records
differing in the new field. (B-1 interacts: with
`onExcessProperty:"error"` the decode fences foreign fields, and
`Equal.equals` fences forgotten comparisons — the two findings close
the same gap from both sides.) **Recommendation:** replace both with
`Equal.equals` when next touched; the register wall rows are the
regression gate.

**B-7. Every thrown cause wears the retryable absence sort — defects
included.**
`packages/plait/src/internal/registers.ts:179-186` (read), :210-219
(connect), :220-229 (bucket ensure), and the same shape throughout
`internal/nats.ts` — `Effect.tryPromise({ catch: (cause) =>
transportRefusal(op, cause) })` classifies *every* rejection, including
programming defects (a TypeError inside the client, a mis-shaped
argument), as `sort: "absence"` — the one retryable class
(Refusal.ts:94-95). A defect dressed as absence invites a retry loop on
a bug. The house discipline is already stated one-sided in DECISIONS T0
— "transport causes are preserved and never wear fencing laws" — and
this is its symmetric half: *defects never wear the absence sort.* Pin
idiom: reserve the error channel for expected failures and let defects
be defects (Effect.ts catch-family docs distinguish recoverable errors
from defects, :2609-2632). **Recommendation:** narrow the catch to the
pinned client's error types (`JetStreamApiError` and the
transport-error classes at `@nats-io/*@3.4.0`), and let anything else
die as a defect. This is a behavioral change to the error channel —
findings-before-fixes says it wants its own small disposition, and the
classification remains a client-side convention per T13 either way.

**B-8. Three internal shapes are duplicated verbatim across the two
adapters — a higher-order extraction wants to exist.**
Occurrences, enumerated: (1) `transportRefusal` —
internal/nats.ts:44-56 and internal/registers.ts:61-69 (same structure,
different `kind` strings); (2) `closeConnection` —
internal/nats.ts:118-122 and internal/registers.ts:188-192 (identical);
(3) the connect-acquire block — internal/nats.ts:154-163 and
internal/registers.ts:210-219 (identical shape, different default
connection name). DEV-724's Catalog/Blobs adapter and A-9's backends
would make four-plus copies. **Recommendation:**
`internal/transport.ts` with `acquireConnection(options, defaultName)`
and a `transportRefusalFor(kind)` factory — internal only, so no
lawful-surface question arises. The Subjects.ts constructor trio
(:51-76) shares a validate-token shape too, but at three small
occurrences explicit reads better; noted, not recommended.
`[DEV-724 OVERLAP]` — do the extraction *before or with* its adapter,
or its ticket copies the block again.

**B-9. `Wire.firstIssue` is an audited, justified deviation from the
pin's issue formatters — keep it, and say why.**
`packages/plait/src/Wire.ts:78-100` hand-walks the issue tree. The pin
ships formatter machinery doing the same walk
(SchemaIssue.ts:1026-1096, `makeFormatterStandardSchemaV1` →
`toDefaultIssues`, accumulating paths through Pointer nodes exactly as
`firstIssue` does) — but its output erases the one thing the refusal
classification needs: the leaf's `_tag` (the `UnexpectedKey`
discrimination at Wire.ts:129/158 separates the closed-struct law from
the shape law). The walker is small, the pin's tool genuinely does not
fit, and the deviation should be one comment line naming this finding
so the next auditor doesn't re-litigate it. **Recommendation:** comment
only.

**B-10. JSDoc examples are load-bearing surface at the pin; one of
ours cannot run.**
`packages/plait/src/Wire.ts:264-267` — `verifyEnvelopeDigest`'s example
references undefined `bytes`/`messageId`. The exemplar convention
(architecture §1 point 6, and the pin's own `ts import.meta.vitest`
doctested examples throughout) treats examples as runnable surface.
DEV-715 (quickstart samples doctest) is the named lane for making
example rot mechanical. **Recommendation:** fold the package's JSDoc
examples into DEV-715's harness scope; fix this one example's
self-containment when that lane lands.

**B-11. Positive: dual coverage is correct and complete.**
`Refusal.retryAbsence` (Refusal.ts:101-122) is the package's one true
combinator over Effects and it is `dual(2, ...)` in the pin's exact
form (Function.ts:102), with the four-overload signature the
public-effect gate pins (test/PublicEffects.signatures.txt). The
remaining exports are constructors/effects where data-first/data-last
duality does not apply. One subtlety worth a comment where it will be
seen: the `{ times, while }` / `{ schedule, while }` option forms keep
the error channel at `Refusal` because the pin's `Retry.Return`
conditional matches `times`/`schedule` *before* the `while`-refinement
narrowing arm (Effect.ts:3941-3947) — which is the honest type, since
exhausted retries surface the final `AbsenceRefusal`. A well-meaning
"cleanup" to `while`-only would silently change both semantics (retry
forever) and type (narrow to `StructuralRefusal`); the comment prevents
it.

**B-12. Positive: error-channel precision is exact at every public
seam, and the gate proves it stays so.**
No `any`/`unknown` widening exists anywhere on the public surface;
every carrier resolves to `StructuralRefusal`/`AbsenceRefusal` unions
per the committed manifest (test/PublicEffects.signatures.txt), and
DECISIONS T7/T8 make the check derivation-based. B-7 is about
*classification within* the channel, not about its type. Nothing to
change; recorded because Part A's additions inherit this gate
automatically.

**B-13. Positive, with one watch item: service and layer idiom match
the pin exactly.**
`FabricClient` and `Registers` are `Context.Service` classes with
static `layer`/`testLayer` (LLMS.md:107-160 is near-verbatim the same
shape); `Layer.effect` correctly absorbs the adapters' `Scope`
requirement (Layer.ts:1014-1021). Watch item for DEV-724: its
`Catalog.ts` / Blobs services should land in this exact shape so the
public-effect gate's service-shape walk covers them without new
machinery.

---

## Part C — routing: from this record to tickets

Per the operator's sequencing rule: **this record lands on main first;
the tickets below cite it as their spec authority.** Nothing ratified
is reopened; grill items G-1..G-7 are the only new decisions.

### C-1. The ticket map, per affordance

| # | Proposed ticket (cites this record) | Carries | Starts | Gate/grill it waits on |
| --- | --- | --- | --- | --- |
| T-A | **Effect affordances over the merged spine** | A-1 wall; A-2 `byToken`/`TokenOrder`; A-3 `byDigest` + `envelopeEquivalence`; A-6 matcher set + closure suites | day 0 after this record lands | grill G-1 |
| T-B | **Audit dispositions, mechanical half** | B-1, B-2, B-3, B-5, B-8 extraction, B-9 comment, B-11 comment | day 0, after the operator's per-finding dispositions | none (repairs of stated laws/idiom) |
| T-C | **Audit dispositions, behavioral half** | B-4 (buffer bound / iterator route + T4 supersession), B-7 (defect-vs-absence classification) | after their own small dispositions | operator ruling per finding |
| T-D | **Cell-adjacent affordances** | A-7 `casJoinLoop` (route per G-2), A-3 cell equivalence, A-8b polling replica, A-4 PrimaryKey carrier | with/after DEV-724's merge | DEV-724; G-2 |
| T-E | **`Catalog.cached` resolve cache** | A-8a decorator layer | after DEV-724's Catalog merges | DEV-724; G-3 |
| T-F | **Blob interface + LocalFileSystemBlobs + conformance suite** | A-9 interface, backend (a), the backend-agnostic wall | after DEV-724's Blobs tag merges (interface injected to its thread now) | DEV-724; G-5 |
| T-G | **Object-store probe dispatch** | the ratified probe (plan grill item 10) that gates A-9 backend (b) | after M2 per the ratified timing | already ratified — mint only |
| T-H | **OBJ blob backend** | A-9 backend (b) | after T-G's probe verdict | T-G |
| T-I | **Ninth probe suite: KV watch semantics** | the ratified watch probe (plan grill item 9) gating A-8b's watch feed | mint now; run when scheduled | already ratified — mint only |
| T-J | **Incarnation pin + `Registers.audit` + register `Replay` arm** | A-10 (with the T6→machinery conversion, plan grill item 8's own trigger) | post-M3 (plan grill item 7's timing) | G-7 for the row/builder shape |
| T-K | **DEV-724 thread injections** (coordination act, not a ticket) | A-7 loop design, A-9 `BlobsService` interface, A-8b replica shape, B-8 extraction note, B-13 watch item | immediately — the seat is live with nothing pushed | none |

Prose reading: three things are dispatchable the day this record lands
(T-A, T-B, T-K); two ride operator dispositions (T-C); four ride
DEV-724's merge (T-D, T-E, T-F, and the cell arm of A-10); two are
mint-only tickets for already-ratified probes (T-G, T-I); one is
post-M3 by ratified sequencing (T-J). No ticket waits on anything it
does not consume.

### C-2. The DEV-724 overlap report, consolidated

Its scope (ticket text read this session): Cell.ts + F1 cell wall,
Catalog.ts + **Blobs** service + in-memory test layer, Resolved.ts,
ContextProgram scaffolding. Seat live since 19:16; nothing pushed.

- **Direct overlaps requiring injection (T-K):** A-7 (its write loop
  IS the combinator's first consumer — inject before it writes the
  loop inline), A-9 (its Blobs in-memory service fixes the
  `BlobsService` contract — inject the interface so the tag and the
  backends agree), A-8b (replica shape for its Cell.ts DECISIONS),
  B-8 (the transport extraction its adapter would otherwise duplicate),
  B-13 (service-shape watch item).
- **Compose-after overlaps:** A-3 cell equivalence, A-4 PrimaryKey,
  A-8a (decorator on its Catalog), A-10 cell arm.
- **No overlap:** A-1, A-2, A-5, A-6, A-11, all of Part B except B-8's
  timing, T-G/T-I/T-J.

### C-3. The grill sheet (house style: one decision per item,
recommended option first, priced alternatives)

**G-1. Admit the matcher set (A-6) as public surface in the concept
modules, with closure law tests generated from the unions.**
Recommended: yes. Licensed by T10's closure contract; exhaustiveness
turns "forgot the new kind" from a runtime gap into a compile error;
the public-effect gate covers the exports automatically; zero new
modules (API log 0018 respected). Alternatives: consumers hand-switch
on `_tag`/`kind` (status quo — every consumer re-derives closure, the
drift the catalogue lane exists to kill); a standalone matcher module
(refused: barrel-name adjacency and architecture §1). Reversal: remove
exports; nothing else moves.

**G-2. `casJoinLoop` ships internal-first (`internal/cas.ts`),
consumed by Cell.write; publication as a lawful public combinator is a
separate later decision.**
Recommended: internal-first, injected into DEV-724 now (route (a)) so
the loop is written once from birth; the F1 vector family it already
owes is the wall. Alternatives: public now (cost: law-test suite +
API-log entry + grill for a surface nobody external consumes);
post-merge extraction (route (b): one refactor ticket + re-review of
the write path); never-extract (each cell-like module re-writes the
loop — the duplication class B-8 documents). Reversal: promotion by
move, the `unstable/` discipline.

**G-3. The resolve cache is a wrapping layer on Catalog
(`Catalog.cached({ capacity })`), not a change to the Catalog service
shape.**
Recommended: yes. Keeps DEV-724's service honest (resolve is resolve),
makes caching an explicit opt-in visible in the layer stack, and the
evict-for-space-only + never-cache-failure policy is enforced in one
place (the `timeToLive` exit function). Alternatives: cache inside the
live Catalog layer unconditionally (hides a memory bound in a
default); a standalone cache service tag (a second name for the same
truths — refused on one-concept-one-module grounds). Reversal: drop
the wrapper; the service is unchanged.

**G-4. Pre-register the refusal: the register's reconcile loop is
never unified with `casJoinLoop`.**
Recommended: yes, recorded now. The unifying temptation is real (both
are "CAS retry loops"), and it is wrong by law: idempotence is what
discharges CAS ambiguity for joins (F1), and the register's writes are
non-idempotent by design (I2 — an outcome lands at most once), so its
ambiguity must be resolved by read-back comparison (seam rule 1) with
the token comparison register-side (seam rule 2). A unified loop would
smuggle once-only semantics into a combinator licensed by idempotence.
Alternatives: unify behind a mode flag (the flag IS the smuggling);
leave unrecorded (the next auditor re-derives A-7, or worse, doesn't).
Reversal: free (nothing is built either way; this is a sentence in the
API log).

**G-5. Admit `Blob.ts` as the `BlobsService` interface (capabilities,
never vendors) with `layerFileSystem` as the first backend, requiring
the core `FileSystem` service from the environment — zero new plait
dependencies.**
Recommended: yes. The interface is A-9's (durable-put, verified-get,
has; ranged-get refused pending G-6); the local backend rides
`effect/FileSystem` (core at rc.108 — FileSystem.ts:663), with the
platform layer (`@effect/platform-bun`/`-node`, catalog-pinned at the
workspace root) supplied by the application, so packages/plait's
dependency list is untouched and the package AGENTS.md ceiling holds.
The backend-agnostic conformance suite is the wall; the day-0
local/dev story needs no substrate probe. Alternatives: wait for the
OBJ probe and ship the NATS backend first (couples the day-0 story to
an unprobed store and inverts the ratified plan-item-10 timing); put
the platform dependency in plait (widens the runtime dependency list
for a layer only some deployments use). Reversal: the interface stays;
a backend layer is removable.

**G-6. Pre-register the refusal: no ranged/partial blob reads until a
chunk-manifest identity law exists.**
Recommended: yes. A byte range cannot re-derive the whole-value
digest, so a ranged read is an unverified read — the exact hole
verify-on-read exists to close. NEEDS-A-LAW, candidate named: the
chunk-manifest law (large values as a cataloged manifest of chunk
digests; ranged reads verify fetched chunks against the manifest); the
ratified OBJ probe's partial-read findings (plan grill item 10) are
its evidence base. Alternatives: serve ranges unverified with a
warning (refused — the estate does not ship unverified read paths);
design the chunk law now (front-runs the probe that would inform it).
Reversal: free (nothing built).

**G-7. Adopt the A-10 shapes — the `AuditRow`/`RegisterAudit` row
schema and the `Replay` builder with per-carrier arms — as the spec
for the ratified audit ticket.**
Recommended: yes. The *decisions* (audit exists, post-M3,
incarnation-stamped, retention-bounded; the pin converts on audit's
shipping) are already ratified (plan grill items 7 and 8) — this item
rules only the surface shape: bucket-global revisions presented as-is
(seam rule 4), token column per T0, ascending-token order licensed by
I1, and the builder's fluent form with the cell/lane arms as slots
owned by DEV-724/E4. Alternatives: flat function per query
(`historyOf(work)` — no builder; cheaper, loses the shared bounds
sentence and the carrier symmetry); method on `RegisterService` vs a
sibling export (either is fine; the grill picks one so the
public-effect gate covers it deliberately). Reversal: read-only
surface — removable.

---

*Prepared by the Fable Effect-architecture seat, 2026-08-17. Pin:
effect 4.0.0-rc.108 at `repos/effect` (commit bef7bf38a); NATS clients
`@nats-io/*@3.4.0` (including `@nats-io/obj`, already a plait
dependency); platform layers catalog-pinned at the workspace root.
Sources: the files, records, rulings, and board state enumerated in
the reading base above; DEV-724 run status read via the Multica CLI
this session. No repository file changed.*
