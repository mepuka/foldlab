# Plait — Effect-native affordances for the CAS surfaces: catalog, audit, routing

Status: **REVISED 2026-08-18 — the adaptation pass; supersedes the
2026-08-17 overlap snapshot throughout.** Amended in place by the Fable
Effect-architecture seat under the operator's recommissioning charge:
re-ground every entry against the code on main at `6234483a1` (the tree
that now carries BOTH merged implementation waves), fold in the
agent-plane and kernel-algebra records where they bind this surface,
re-verify every Effect pin citation at `4.0.0-rc.108`, and rewrite
Part C as the initial refactor set against the current API. The
refereed verdicts on G-1..G-7
(`docs/research/2026-08-18-plait-design-grill-review.md`) are applied
in place and marked; the operator's formal ruling on the 19 rides this
adapted record, so each G-item's state is stamped at the sheet.
Passages that documented the pre-merge world are kept where they
explain why decisions were made and marked **[SUPERSEDED]** where they
would now mislead.

Original landing status, kept as history: LANDED 2026-08-17 by the
coordinator under the ruled design-first sequencing. At that landing,
DEV-724 was mid-run with nothing pushed and the fold branch was
unmerged; every `[DEV-724 OVERLAP]` flag below described a live-seat
injection route. **That route is closed**: PR #81 (E6 runtime,
`2b28d9efb`) and PR #83 (durable fold, `6bae7007b`) are merged, M2
(`52c5f8eab`) and M3 (`8d16f8111`) landed behind them, and every
overlap flag has become a post-merge extraction contract instead. The
overlap flags are retired throughout this revision; where one carried
a design obligation, the obligation now lives in the entry's amended
text and in Part C's tickets.

## Changelog — the adaptation pass (2026-08-18)

1. Revision banner and this changelog added; the 2026-08-17 landing
   status kept as history; `[DEV-724 OVERLAP]` flags retired.
2. A third pin-check correction added: at `4.0.0-rc.108` the pin's
   nominal-identity idiom is **string-literal TypeIds**, not v3's
   unique symbols (details in Part A3 §1).
3. Every A-item re-grounded against main `6234483a1`: A-7 rewritten as
   the refereed G-2 post-merge extraction contract from
   `internal/cells.ts`; A-8a rewritten onto the verified resolve seam
   per refereed G-3; A-8b's license upgraded to the now-proven M3
   theorems, cited by name; A-9 rewritten to open with the
   two-services split per refereed G-5; A-10 carries the refereed G-7
   amendments (three buckets, depth-vs-horizon, the lane arm as a
   facade over shipped `replaySuccessors`).
4. New Part A2 — the kernel binding: the affordance→generator carrier
   map (this record becomes the kernel's runtime-carrier record) and
   the agent-plane consumer map (G36 class stamps; the named
   consumers: admission tooling, the task view, the G26 commit door).
5. New Part A3 — the surface disciplines: the Symbol decision
   (operator directive, adapted to the pin's actual form) and the
   canonical-strings-become-concrete-types sweep (the ratified K-3
   sort discipline pushed into the TypeScript surface).
6. Part B re-audited file-by-file at main: every finding stamped
   OPEN / GROWN / FIXED-BY with today's line numbers; the R-5 sweep
   items mapped onto B-findings; B-13's watch item satisfied.
7. New Part B2 — the friction hunt over `packages/plait/src` in the
   deep-module vocabulary, one card per candidate with a strength
   badge; every Strong candidate lands in Part C or says why not.
8. Part C rewritten as **the initial refactor set**: nine
   dependency-ordered tickets, each self-contained, walled, sized, and
   G36-stamped; the G-1..G-7 sheet gains a status line per item.
9. No CONTEXT.md glossary additions: this pass mints ticket vocabulary
   only (the transport spine, the sorts sweep), and that vocabulary
   lives in Parts B2/C, not in package concepts.

Reading base, verified this pass: all of `packages/plait/src` (17
public modules, 10 internal adapters, ~5.5k lines, read whole),
`packages/plait/DECISIONS.md` (both task blocks, T-number collisions
included), `packages/plait/test/` (FabricWall, CellWall, the signature
manifest), `verify/fabric/Fabric/*.lean` + `run.sh` (roster
arithmetic), VERIFICATION.md:47 (the fabric row),
`docs/design/2026-08-18-plait-kernel-algebra.md` (ratified),
`docs/design/2026-08-18-plait-agent-plane.md` (§4, §5.5, §6, §15,
§16), `docs/research/2026-08-18-plait-design-grill-review.md` (whole),
and the vendored pin `repos/effect` at `4.0.0-rc.108` — every file:line
cited below was re-verified in place this pass; a citation that moved
was moved here, never carried on faith.

Three pin-check corrections, recorded first so nothing downstream
builds on the folklore versions:

1. **`Effect.cachedFunction` does not exist at the pin.** The Effect
   module ships `cached`, `cachedWithTTL`, `cachedInvalidateWithTTL`
   (repos/effect/packages/effect/src/Effect.ts:7068-7188) — all
   single-effect memos, not keyed-function memos. The digest-keyed
   replica must ride `Cache.makeWith` (Cache.ts:190), whose per-exit
   `timeToLive: (exit, key) => Duration.Input` is exactly the shape an
   immutable-truth cache needs.
2. **Equal/Hash instances are largely unnecessary to write.** At the
   pin, `Equal.equals` (Equal.ts:172-174) deep-compares plain objects,
   arrays, typed arrays content-wise, and Maps and Sets
   order-independently (the module docs at :118-152; the typed-array
   branch at :258-286), and `Hash.hash` (Hash.ts:103) hashes
   structures (`Hash.structure`, Hash.ts:448). Plait's decoded values
   are plain structs and branded primitive strings, so structural
   equality and HashMap keying work today with no instance code. What
   the catalog adds is the *law connection* (A-1) and the cheap
   identity-projection instances (A-2, A-3) — not hand-written
   `[Equal.symbol]` implementations.
3. **The pin's nominal-identity idiom is string-literal TypeIds, not
   unique symbols.** `const TypeId = "~effect/Cache"` with
   `readonly [TypeId]: typeof TypeId` (Cache.ts:27,112; the same form
   in Ref.ts:21, Layer.ts:34, Queue.ts:27, Schedule.ts:28,
   SubscriptionRef.ts:23, Context.ts:41), and the interface protocols
   are string keys too: `PrimaryKey.symbol =
   "~effect/interfaces/PrimaryKey"` (PrimaryKey.ts:27),
   `Equal.symbol` (Equal.ts:55), `Hash.symbol` (Hash.ts:31).
   `unique symbol` survives only in type-machinery corners (HKT,
   Types, Unify). Part A3 §1 grounds the Symbol decision on this
   fact.

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
(`Refusal.ts`, `Wire.ts`, `Register.ts`, `Digest.ts`, `Lane.ts`,
`Cell.ts`), and nothing may shadow an `effect` barrel name (no
`Match.ts`, no `Order.ts`).

### A-1. The Equal⟺digest coherence wall (the identity law, surfaced)

**License:** the canonical-bytes identity law — envelope identity is
SHA-256 over canonical uncompressed bytes (package AGENTS.md), JCS
byte-determinism walled at R0 (VERIFICATION.md:41, the four-row
Go-differential wall), plus the pin's structural equality semantics
(Equal.ts:118-152). Digest.ts's own docstring already names the
intent: "equality is the coherence check."

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
  per object pair in a WeakMap and requires objects not be mutated
  after first comparison (Equal.ts:139-141 — "Objects must not be
  mutated after their first comparison"). Plait values are
  decode-produced and treated as immutable; the wall pins that this
  assumption is real by comparing only decode-fresh values.

**Why it earns its place:** once pinned, every downstream affordance —
HashMap keyed by decoded values, dedup by `Equal.equals`, the
`byDigest` equivalence of A-3 — inherits "structural equality IS
identity equality" as a walled fact instead of folklore.

**Consumers, now real on main:** the replica (A-8), the B-6 repair
(replacing hand-rolled comparators with `Equal.equals` leans on
exactly this wall), and every module that puts a decoded value in a
HashMap/HashSet. **Status: ticket-ready** (Part C ticket 8 carries it
beside the matcher set). NEEDS-API-ONLY — the law exists; the wall is
its executable statement.

### A-2. Order for fencing tokens — `Register.byToken`

**License:** I1 — "the token never decreases, and grant/steal strictly
increase it" (`verify/fabric-veil/FabricVeil/Statements.lean:91-97`,
invariants `token_monotone`, `grant_or_steal_strict`), claimed at R3 +
replay wall (VERIFICATION.md rows). The token-to-KV mapping is
DECISIONS T0 (the token is the key's revision-CAS order; observe
reports the landed lease token — shipped at
`internal/registers.ts:178-187`, `stateOf`).

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
only *within one register key and one backing-stream incarnation*
(seam rules 4 and 7 — KV revisions are bucket-global monotone stream
sequences, total per key, never consecutive per key; a bucket
delete+recreate resets the order). Cross-key comparison of tokens is
banned by the same sentence that bans consecutive-revision
assumptions. The incarnation sentence rides the JSDoc exactly as it
rides `RegisterService` today (Register.ts:31-38). Part A3 §2's sort
sweep later makes the cross-key ban a type fact (`Token@r` in the
kernel's sort vocabulary); until then the JSDoc sentence is the fence.

**What it does NOT license:** no client-side arbitration ("pick the
max and act") — the register's own token comparison stays
register-side (seam rules 1–2); `byToken` is a *read-side* convenience
for sorting observed states, audit rows (A-10 is the named consumer),
and the task view's attempts rendering (agent plane §6.2). **Status:
ticket-ready** (Part C ticket 8). NEEDS-API-ONLY.

### A-3. Equivalence instances — `byDigest`, and the schema-derived form

**License:** for `byDigest`, the same identity law as A-1 (digest
determines canonical bytes determines value, mod collision — one
O(64-char) string compare replaces a deep structural walk). For the
schema-derived form, the pin's own derivation:
`Schema.toEquivalence(schema)` (Schema.ts:14790) with
`overrideToEquivalence` (:14767) where a custom one is wanted.

**Signatures, pin-checked** (Equivalence.ts:220 `String`, :476
`mapInput`):

```ts
// Wire.ts addition — DecodedEnvelope is shipped (Wire.ts:55-59)
export const byDigest: Equivalence.Equivalence<DecodedEnvelope> =
  Equivalence.mapInput(Equivalence.String, (decoded) => decoded.digest)

// derived structural equivalence over the boundary type, when a
// consumer needs equality of *not-yet-digested* envelope values:
export const envelopeEquivalence = Schema.toEquivalence(Envelope)
```

**Where structural and identity equality genuinely differ — re-grounded
on the shipped carrier.** The original entry reasoned about a
hypothetical Cell.ts; the shipped one (merged PR #81) answers the
question more sharply. A cell's meaning is its verified observation
set (F1's convergence half, `f1_cell_extensional`), and the shipped
carrier **collapses the set/bytes gap at the `CellState` seam by
construction**: `Cell.canonicalize` (Cell.ts:108-124) erases arrival
order and multiplicity by sorting on canonical bytes, and
`Cell.stateOf` (:145-150) derives the digest from the canonical form —
so two `CellState`s are the same lattice point iff they are the same
bytes iff they carry the same digest. DECISIONS T15 states the bound:
canonical order is *declared*, the claim is set equality, and
agreement with the Lean carrier's comparator order is NOT claimed. The
affordance therefore simplifies to one instance:

```ts
// Cell.ts addition — CellState is shipped (Cell.ts:62-65)
export const byDigest: Equivalence.Equivalence<CellState> =
  Equivalence.mapInput(Equivalence.String, (state) => state.digest)
```

Extensional equivalence of *raw* (non-canonical) observation arrays is
deliberately not exported: `canonicalize` is the door, and comparing
un-canonicalized arrays would rebuild the door as a predicate.
**Status:** `Wire.byDigest` + `envelopeEquivalence` + `Cell.byDigest`
are ticket-ready (Part C ticket 8). NEEDS-API-ONLY.

### A-4. PrimaryKey for digest-carrying values

**License:** the identity law again — a digest is *the* stable string
identifier of a value, which is exactly the `PrimaryKey` contract: the
protocol key is the string constant `PrimaryKey.symbol =
"~effect/interfaces/PrimaryKey"` (PrimaryKey.ts:27) and the contract
is `[PrimaryKey.symbol](): string` (the interface at
PrimaryKey.ts:62-64). Composition points at the pin were verified for
the original record (`unstable/persistence`, `unstable/cluster`,
`unstable/rpc`, `HashRing.ts` all consume `PrimaryKey`) and are
carried at that tier.

**The honest shape, re-verified against main:** `PrimaryKey` wants an
*object carrying the method* — idiomatic on class values, unidiomatic
bolted onto plain interfaces. The merged tree ships **no class-shaped
value carriers at all**: `CellState`, `DecodedEnvelope`,
`DeclaredAlgebra`, `DeclaredLane`, `DeclaredFold`, `DeclaredProgram`
are plain structs, and the only classes in the package are the two
`Schema.TaggedError` refusal classes. So the entry remains a design
reservation with its trigger updated: when a class-shaped
digest-carrying value first appears — the durable Catalog's stored
handle (Part C ticket 9) or a persistence consumer at E7+ are the
natural firsts — it implements
`[PrimaryKey.symbol]() { return this.digest }` and inherits every pin
machinery that keys by primary key. **Status:** reservation;
build-behind-consumers says not before then. NEEDS-API-ONLY.

### A-5. Schema affordances — the Digest brand, audited against the pin

**Audit verdict on the shipped brand (Digest.ts:9-12): it is the pin's
best form — unchanged by the merges.**
`Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/))` matches the
pin's filter idiom exactly (Schema.ts:6745 — `isPattern` carries the
JSON-Schema `pattern` constraint and the fast-check arbitrary
constraint automatically), `.pipe(Schema.brand(...))` is the pin's
nominal-brand form (Schema.ts:5229; note the pin's own gotcha — brand
adds no runtime check, which is why the pattern check rides first),
and `.annotate({ identifier })` is the pin's annotation door. A
template-literal schema was considered for the digest and is NOT
recommended: `Schema.TemplateLiteral` (Schema.ts:2902, namespace
:2790-2870) models *concatenation shapes*, not fixed-length
character-class repetition — a 64-hex-char constraint is not
expressible as a template literal at the pin, and the regex filter is
the pin's own tool for exactly this (`isUUID` at :6933-7006 is the
in-house precedent). No change requested. The verdict is now
scoped precisely, because Part A3 §2 reaches the opposite conclusion
for **subjects**: subject grammars ARE concatenation shapes, and the
pin's template-literal machinery genuinely fits them — the two
verdicts differ because the shapes differ, not because the tool
changed.

One small internal convenience beside it, licensed by the same
identity law: `digestOfCanonicalBytes` — hashing bytes already known
canonical (see finding B-5) — a speed repair inside the existing law,
not a new public name.

**Envelope and refusal pattern schemas ship on main** (Wire.Envelope
at Wire.ts:40-49; Refusal.Refusal as a `Schema.Union` of two
`Schema.TaggedError` classes, Refusal.ts:66-89 — the v4 idiom). The
missing affordance over them is A-6.

### A-6. Match-based pattern matchers over the discriminated unions

**License:** T10 — "the closed kind enumeration spans every register
structural law … the enumeration's own contract is 'every structural
kind the package can mint'" (packages/plait/DECISIONS.md) — plus the
enumerate-from-the-union test discipline (plan §C.3). Exhaustiveness
checking is the error-reduction mechanism: adding a thirty-fifth kind,
a third refusal sort, or a fifth envelope kind must *fail to compile*
every consumer that has not handled it. The pin's tools, re-verified:
`Match.type` (Match.ts:278), `tagsExhaustive` (:1086),
`discriminatorsExhaustive` (:871), `withReturnType` (:467),
`exhaustive` (:1969).

**Re-grounded on the merged union.** The structural-kind union settled
at **34 kinds** with the two merges (Refusal.ts:25-60; main's 15 +
the fold wave's 15 + the cell wave's 4). The refereed G-1 amendments
apply and their timing gate is now SATISFIED (both PRs merged):

1. The matcher half ships now — the union has settled.
2. **The closure suites derive from the union artifact** — the
   literals arrays the schemas already expose
   (`StructuralRefusalKind.literals`, `EnvelopeKind.literals`; the
   same accessor the shipped `ContextProgram.volatilityRank` already
   uses at ContextProgram.ts:43) — never hand-enumerated.
   Enumerations that are listed, drift.
3. `FabricClient.matchPublished` keeps its two-arm shape; the fold's
   `Lane.EmittedEvent` (Lane.ts:67-72 — same `duplicate` bit,
   different carrier) gets its **own** two-arm matcher in `Lane.ts` —
   same pattern, deliberately not shared, because the two
   acknowledgement types answer different subscriptions.
4. The dedup-window JSDoc is now **dual-scoped**: a
   `PublishedEnvelope.duplicate` means suppressed by Nats-Msg-Id
   within the pinned two-minute window of the **commons stream**
   (internal/nats.ts:31,38); an `EmittedEvent.duplicate` means
   suppressed within the two-minute window of that **(lane,
   partition) stream** (internal/lanes.ts:28,64 — one stream per
   partition under the DEV712-POS-1 ruling). DECISIONS T5's scope
   sentence moves in lockstep (its supersession entry rides Part C
   ticket 3).

**Signatures, pin-checked, living in their concept modules:**

```ts
// Refusal.ts — fold over the sort union (the _tag IS the sort carrier)
export const match: <Out>(cases: {
  readonly StructuralRefusal: (refusal: StructuralRefusal) => Out
  readonly AbsenceRefusal: (refusal: AbsenceRefusal) => Out
}) => (refusal: Refusal) => Out =
  (cases) => Match.type<Refusal>().pipe(Match.tagsExhaustive(cases))

// Refusal.ts — exhaustive fold over the closed 34-kind union;
// the arm record type derives from StructuralRefusalKind, so T10's
// contract is a compile-time closure check:
export const matchKind: <Out>(cases: {
  readonly [K in StructuralRefusalKind]: (refusal: StructuralRefusal) => Out
}) => (refusal: StructuralRefusal) => Out

// Wire.ts — envelope kind fold (the four monotone observation kinds)
export const matchKind: <Out>(cases: {
  readonly [K in EnvelopeKind]: (envelope: Envelope) => Out
}) => (envelope: Envelope) => Out

// FabricClient.ts — publish acknowledgement fold (commons stream);
// Lane.ts — the sibling matchEmitted over EmittedEvent (partition
// stream). Both JSDocs carry their own window scope (above).
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

Implementation notes bound to the pin: `matchPublished`,
`matchEmitted`, and `matchState` discriminate on non-tagged shapes, so
they are plain conditional folds (Match earns its keep where the union
is wide and *closed*, i.e. `matchKind`). The Refusal matchers get
generated law tests derived from the literals artifacts (amendment 2
above).

**Consumers, now named by the agent-plane record:** admission tooling
branches on sorts through `Refusal.match` (agent plane §5.5); the task
view renders register state through `Register.matchState` (§6.2); the
error-catalogue generator shares the union derivation. **Status:
ticket-ready now** (Part C ticket 8). NEEDS-API-ONLY, behind grill
G-1 (refereed ADOPT-AMENDED; status at the sheet).

### A-7. The CAS combinator — `casJoinLoop`, the extraction contract

**[SUPERSEDED as a birth-time design; rewritten as the refereed G-2
post-merge extraction contract.]** The original entry designed the
loop ahead of any implementation and offered two routes; route (a)
("inject into DEV-724 so the loop is written once from birth") died on
the timeline — PR #81 wrote the loop inline before this record landed,
and wrote it better in ways the referee ruled should stand. The
combinator is now specified **by extraction from the shipped loop**,
`internal/cells.ts:285-323`, preserving five shipped decisions:

1. **The attempt bound stays.** The shipped loop is bounded
   (`CELL_MERGE_ATTEMPTS = 8`, Cell.ts:50) and refuses
   `cell-update-contended` as an **absence refusal** on exhaustion
   (cells.ts:315-322). The referee's sentence is adopted verbatim in
   kind: the attempt bound is flow control with no correctness stake —
   convergence-on-success is F1's regardless; what is not claimed
   shifts from "termination" to "completion", and
   exhaustion-as-absence is typed backpressure a caller composes with
   `retryAbsence`, where the unbounded sketch hid contention inside an
   invisible hang. The bound becomes a parameter with default 8.
2. **The `MergeDiscipline` seam survives extraction** (cells.ts:
   179-209): `next` (the state a delta writes) and `reconciled`
   (whether a read-back carries the delta), with the two committed
   negative-control disciplines (`byteEqualityReconciliation`,
   `lastWriterWinsMerge`) swapping exactly one behaviour and sharing
   everything else. An extraction that collapses this seam deletes the
   shares-everything-else property both committed cell mutants prove.
3. **Reconcile-before-classify** (cells.ts:306-311): the ambiguous
   failed CAS is resolved by read-back FIRST (seam rule 1); only a
   read-back that does not carry the delta consults the CAS
   classification (operation context + code 10071, seam rule 2,
   `isCasRefusal` cells.ts:58-61); anything else surfaces as a
   transport absence, cause preserved.
4. **The `subsumes` short-circuit** (cells.ts:164-169, used at :294):
   a delta already carried costs one read and no CAS traffic — the
   idempotence dividend, kept.
5. **No `Versioned<A>` on the public seam.** The original sketch
   surfaced revisions; the shipped `CellState` does not, and the
   revision plumbing stays inside the loop (`KvEntry.revision` at the
   adapter). The original `Versioned` sketch is superseded.

**The extracted signature, parameterised on the earned brand:**

```ts
// internal/cas.ts — behavior-preserving extraction; internal-first
// (promotion to a public combinator is a separate later decision).
export interface CasJoinOptions<A> {
  /** the lawful join; the ACI brand is earned, never asserted
      (Algebra.ts:141-159 `declare`, :183-236 `commutative`) */
  readonly join: Reducer.Reducer<A>              // Reducer.ts:54
  /** the two steps a negative control may replace (cells.ts:179-209) */
  readonly discipline: MergeDiscipline<A>
  /** flow control, no correctness stake; default 8 */
  readonly attempts?: number
  readonly read: Effect.Effect<{ value: A; revision: number } | null, Refusal>
  readonly create: (value: A) => Effect.Effect<number, Refusal>
  readonly update: (value: A, expectedRevision: number) => Effect.Effect<number, Refusal>
  readonly contribution: A
}
export const casJoinLoop: <A>(options: CasJoinOptions<A>) => Effect.Effect<A, Refusal>
```

The `Reducer` parameter is the type that keeps the disciplines apart —
and it is now real: `Algebra.ts` ships `DeclaredAlgebra<State>`
carrying a `Reducer.Reducer<State>` and the earned `CommutativeAlgebra`
brand behind a digest-seeded generated law suite (32 distinct triples
minimum, Algebra.ts:52, :183-236), with `hasCommutativeWitness`
(:239-242) as the runtime half. The combinator takes the reducer;
partitioned deployment demands the brand (`Fold.declare`'s gate,
Fold.ts:132-133) — the layering the original entry could only promise.

**Stated semantics and non-claims (mandatory on the export):**
convergence-on-success is F1's (`f1_cell_merge_aci`,
`f1_history_convergence`); completion is NOT claimed — exhaustion is a
typed absence; the conflict classification lives in the adapter's
`create`/`update`, never in the combinator; every claim is bounded to
a fixed backing-stream incarnation (seam rule 7 — the sentence rides
the JSDoc, exactly as it rides cells.ts:35-39 today).

**The three-way refusal (refereed G-4, adopted).** The original
two-way sentence was too narrow; the merged tree runs THREE CAS
disciplines, three laws, never unified: **joins** retry through
`casJoinLoop` because idempotence discharges ambiguity (F1);
**registers** reconcile by read-back comparison against the one
intended record because outcomes land at most once (I2, seam rules
1–2; the shipped `reconcileUpdate`, internal/registers.ts:289-317);
**anchors** never retry — a lost anchor CAS is a *fatal detach* under
the single-live-pump discipline (`lost-anchor-cas`,
internal/anchors.ts:85-96; single-shot at :246-248 and :270-272;
dispatch 31 decision 6), and routing it through either loop would
smuggle its exclusivity assumption into a combinator licensed by a
different law.

**The regression wall, named:** the 588-line `CellWall.test.ts`, the
three committed byte-compared traces, and DECISIONS T16's two rows run
unchanged — an extraction that deletes either T16 row is refused.
**Status:** Part C ticket 4; grill G-2 (refereed ADOPT-AMENDED).

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
byte string (JCS uniqueness, walled R0) and the resolve seam
re-derives the digest of what it fetched and refuses on mismatch —
shipped: `Resolved.resolve` (Resolved.ts:117-127) is the single
resolution seam, `verified` (:82-89) is the re-derivation, and
`digest-mismatch` / `cataloged-value-absent` are its two refusals.
Therefore a cached *successful* resolve can never be stale — there is
nothing an invalidation could learn. Eviction exists only to bound
memory. F8 is what the cache must NOT contradict: a resolve *failure*
is head-relative absence and must never be cached as a fact.

**The refereed G-3 amendments, applied — they move the seam.** The
original design decorated `Catalog.resolve`; the shipped Catalog has
no such method, and its `get` is **deliberately unverified**
(Catalog.ts:29-33; DECISIONS T18: verify-on-read lives at
`Resolved.resolve` so the tampered-store control can exist — a service
that policed itself would make the control unwritable). A cache on
`Catalog.get` would therefore cache unverified bytes. The wrapper
sits on the **verified resolve path only**:

```ts
// The cache decorates Resolved.resolve — the one seam that verifies.
// Shape against the pin (Cache.ts:190 makeWith):
const makeResolveCache = (options: { readonly capacity: number }) =>
  Cache.makeWith(
    (digest: Digest) => resolve(digest),   // Resolved.ts:117 — verified
    {
      capacity: options.capacity,
      // immutable truths: successes never expire; failures are never
      // cached (zero TTL removes the entry — Cache.ts:445-448)
      timeToLive: (exit) =>
        Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
    },
  )
```

Two fences ride the surface, verbatim from the referee: **keys are
digests only** — nothing cacheable takes an anchor, and a surface
keyed by `(directory, petname, anchor)` never enters this cache
(0014/G20's refused "ambient latest"); and **the in-memory catalog
layer's boundlessness is the store's question, not the cache's** — the
process-local `Map` (Catalog.ts:44-54) is the *store*, its durability
story is R-4's (Part C ticket 9), and this cache neither fixes nor
hides it.

What the pin gives for free, re-verified in source: keys compare by
Equal/Hash via `MutableHashMap` — a branded digest string is a
primitive, so keying is native (Cache.ts:210-213); **concurrent
lookups of one digest deduplicate onto one in-flight fiber**
(Cache.ts:424-431 — awaiters join the entry's fiber; interrupted
lookups are removed rather than poisoning the map, :436-441); capacity
eviction is oldest-first with touch-on-get re-insertion,
least-recently-used in effect (:427-431, `checkCapacity` :490-500).
Services: the lookup captures its context at construction (the
default `requireServicesAt` mode), so the cache is built inside a
layer that holds `Catalog | Blobs` and the user-facing surface keeps a
clean channel.

**What it does NOT claim (mandatory JSDoc):** no freshness (nothing
here is fresh or stale — the keyspace is immutable); no absence
reasoning (a failed resolve flows to the caller's `retryAbsence`
policy and is not recorded); no cross-process coherence; no durability
role (A-11); capacity is deployment configuration, never
identity-bearing. **Naming note:** the ticket-map name
`Catalog.cached` no longer fits the amended seam — the surface lands
beside the seam it memoizes, in `Resolved.ts`, under API log 0018's
concept-module rule; the ticket picks the name. **Status:** Part C
ticket 6; grill G-3 (refereed ADOPT-AMENDED).

#### A-8b. `CellReplica` — the local join, convergent by construction

**License — now PROVEN, cited by name.** The M3 wave landed the
join-semilattice package: `join_semilattice_of_aci` proved once over
ACI hypotheses and instantiated at the cell carrier
(`f1_cell_join_semilattice`), with **`cell_absorb_inflationary`** —
absorbing an observation never shrinks the local join — and
**`cell_le_iff_subset`** — the derived order IS observation-set
inclusion — rostered by name (VERIFICATION.md:47; 206 rostered
theorems + 1 pinned private helper `applySuccessors_of_completeBuffer`
= 207 declared, the arithmetic verified at head this pass). So "my
local view is a lattice lower bound of the truth" is a theorem, not a
hope, and the original entry's "(a)/(b)/(c)" derivation collapses to
two citations. Feeding the replica by polling is licensed today;
feeding it by watch is licensed only after the ninth probe suite lands
(DEV-731 mints it; Cell.ts:17-21 states the gate on main itself), and
then advisory-only: **no absence reasoning from a watch, ever.**

**Design, re-grounded on the shipped carrier** (SubscriptionRef pins
re-verified: make :111, changes :160, update :726, updateEffect :758):

```ts
// Cell.ts — the concept module owns it; carrier = the shipped
// Observation sets (Cell.ts:53-59) under the shipped join (:137-142)
export interface CellReplica {
  /** current local join — a lattice lower bound (cell_absorb_inflationary) */
  readonly current: Effect.Effect<CellState>
  /** monotone stream of local joins; coalescing is harmless by F1 */
  readonly changes: Stream.Stream<CellState>
  /** merge observed remote state into the local join */
  readonly absorb: (observed: ReadonlyArray<Observation>) => Effect.Effect<void, StructuralRefusal>
}
```

One amendment to the original sketch, forced by the shipped types: the
join is **not pure at the type level** — `Cell.join` refuses
non-wire-grammar values (it runs `canonicalize`, Cell.ts:137-142) — so
`absorb` rides `SubscriptionRef.updateEffect` (:758), not `update`,
and carries the structural channel honestly. On decode-verified
observations the refusal cannot fire (holder and value are
`Schema.Json` by the Observation schema), but the type does not lie
about the composition. The original "the update needs no effect"
sentence is superseded.

**Coalescing note, licensed:** a subscriber that misses intermediate
`changes` values loses nothing — by F1 the latest local join absorbs
every skipped state. This is the exact sentence that later licenses a
coalescing KV watch feed, so the replica's interface is *watch-ready
without claiming watch*.

**What it does NOT claim (mandatory JSDoc):** no freshness — `current`
is a lower bound, head-relative; **no absence reasoning** — "the
replica does not contain X" is a statement about this process's
observation history, never about the fabric; no durability role
(A-11); no cross-replica agreement beyond F1's convergence (two
replicas that absorbed the same observation set hold byte-identical
state — `f1_cell_extensional` + the declared canonical order, T15).
**Status:** rides Part C ticket 4's module (the replica is the
extracted loop's read-side sibling; its own suite is the wall); the
watch feed waits on DEV-731.

### A-9. The blob storage model — the split, then the family

**The refereed G-5 finding first, because everything else hangs on
it: main ships two different objects under one name.** `Catalog.ts`
carries a `BlobService` (singular, Catalog.ts:40-42) — get-only,
returning `Option`, **deliberately unverified**, and always-absent in
the live layer (:106-109) — which is the *catalog-internal payload
seam* `Resolved.resolve` reads through (T18's argument lives exactly
there: verification stays at the resolve seam so the tampered-store
control can exist). This record's A-9 designs a *public application
blob store* — put/verified-get/has, "there is no unverified read
path." These are different concepts, and leaving them one name is the
one-concept-one-module violation this catalog polices elsewhere. The
split, per the refereed amendments:

1. **The catalog-internal seam is renamed at adoption** — internal,
   catalog-owned, unverified by design, `Resolved.resolve` its one
   verify door (T18 preserved verbatim). It keeps `Option` — it is
   package-internal plumbing, not an agent-facing surface.
2. **The public `BlobsService` lands in `Blob.ts`** — the module the
   architecture map reserves — **with verification inside the
   service**: the tamper control for a real store flips bytes on disk
   beneath the API, so verified-get is testable without any unverified
   public path, and T18's self-policing argument dissolves at this
   seam.
3. **Public absence is an `AbsenceRefusal`, kind `blob-absent`, never
   `Option`** — `Option.none` is invisible to `retryAbsence`
   (Refusal.ts:122-143) and carries no head-relative vocabulary.
4. **The probe gate binds the NATS object-store backend ONLY.** The
   shipped Catalog JSDoc's sentence "grill item 9/10 … requires a
   probe suite … before any object-store surface ships"
   (Catalog.ts:13-15) and this record's "the day-0 story needs no
   substrate probe" are both true, of different backends: the
   filesystem backend's substrate is the OS filesystem and its wall is
   the backend-agnostic conformance suite; the OBJ backend waits on
   DEV-730. The two sentences appear together wherever either appears.

**The licensing law, stated once for the whole family:** content
addressing makes every backend's correctness *locally checkable* — the
reader re-derives the digest of what it fetched and refuses on
mismatch, so no backend is trusted about content, ever. Backend choice
is availability and cost, **never meaning**: identity is of canonical
uncompressed value bytes, and store metadata carries no identity role.
The 256 KiB inline threshold (`Wire.INLINE_BODY_MAX_BYTES`,
Wire.ts:37, with its `inline-body-too-large` refusal :198-211) is
deployment configuration with a wall, never identity-bearing.

**The service interface — capabilities, never vendors:**

```ts
// Blob.ts — the public application store; verification inside
export interface BlobsService {
  /** durable-put: derives the digest client-side, writes, acknowledges
   *  only after the backend's durable write completes. Idempotent by
   *  content addressing. */
  readonly put: (bytes: Uint8Array) => Effect.Effect<Digest, Refusal>
  /** verified-get: fetches, RE-DERIVES the digest over the fetched
   *  bytes, refuses `digest-mismatch` on disagreement. There is no
   *  unverified public read path. */
  readonly get: (digest: Digest) => Effect.Effect<Uint8Array, Refusal>
  /** presence check; a `false` is head-relative, never global absence */
  readonly has: (digest: Digest) => Effect.Effect<boolean, Refusal>
}
```

**Ranged-get is named and refused, with its law debt registered
(G-6, refereed ADOPT unamended).** A partial read cannot
verify-on-read — a byte range cannot re-derive the whole-value digest.
The capability stays OFF the interface until its law exists.
**NEEDS-A-LAW, candidate named:** the chunk-manifest identity law —
large values carried as a manifest of chunk digests, the manifest
itself a cataloged value; a ranged read then verifies the *chunks* it
fetched. DEV-730's partial-read findings are the evidence base. Until
then, `get` is whole-value only on every backend.

**Backend (a): `LocalFileSystemBlobs` — the day-0 story, zero new
dependencies.** Built on the pin's core portable FileSystem service —
at rc.108 `FileSystem` lives in the effect package itself
(FileSystem.ts:663, `Context.Service("effect/platform/FileSystem")`).
The platform layer is the *application's* choice:
`@effect/platform-bun`'s BunFileSystem or `@effect/platform-node`'s
NodeFileSystem
(repos/effect/packages/platform/node/src/NodeFileSystem.ts:21,
`export const layer: Layer.Layer<FileSystem>`), with
`@effect/platform-bun@4.0.0-rc.108` already catalog-pinned at the
workspace root (package.json:14). Mechanics, against the pin's
operation set (FileSystem.ts:143 exists, :157 makeDirectory, :197
makeTempFile, :246 readFile, :287 rename, :365 writeFile): put =
write to a temp name, then `rename` into place at
`<root>/<digest[0..2]>/<digest>` — the digest-named file appears only
complete; the two-character fan-out is layout, not identity. get =
`readFile` + re-derive + refuse. Durability honesty, mirrored from
A-11: crash-durable at the OS level, not power-durable — `writeFile`
does not fsync at the pin; an fsync option is priced when a consumer
needs it, claimed never before measured. `PlatformError` maps to
Refusal at the seam: not-found → `AbsenceRefusal` kind `blob-absent`;
integrity disagreement → structural `digest-mismatch`; everything else
per the B-7 disposition (defects stay defects). Test seams:
`FileSystem.layerNoop` (FileSystem.ts:954) and `makeNoop` (:825) are
the pin's own.

**Backend (b): the NATS object store — interface slot, GATED on
DEV-730.** `@nats-io/obj@3.4.0` is pinned; `OBJ flb-fab-blob` is
reserved in the subject grammar; the object store's chunking/metadata
semantics at the pin are unprobed, and the probe-first mandate exists
because FINDING 1 was found by probe, not docs. No build before
DEV-730's verdict.

**Backend (c): S3-shaped remote — the seam is the design.** Nothing
S3-specific is designed, deliberately: a third backend is *just
another Layer* satisfying `BlobsService`, written against
capabilities, never against a vendor's vocabulary. Recorded so nobody
"prepares" vendor hooks in the interface.

**The backend-agnostic conformance suite (the wall).** One generated
suite runs against *every* layer: put→get round-trips byte-identically
with the digest re-derived; get of an absent digest is a `blob-absent`
absence; a corrupted store (the control: flip one byte behind the
backend's back) is refused `digest-mismatch`, never served; put is
idempotent. A backend ships only with the suite green.

**Status:** Part C ticket 5 (the split + interface + backend (a) +
suite); the OBJ backend waits on DEV-730; ranged-get waits on its law
(G-6). Grill G-5 (refereed ADOPT-AMENDED).

### A-10. The fluent replay API over KV history

**Substrate, re-grounded — the incarnation debt now covers THREE
buckets.** NATS KV retains per-key history where declared: the
register bucket declares 64 revisions (`flb-fab-reg`, Register.ts:10,
enforced internal/registers.ts:244-270), the anchor bucket declares 64
"for anchor auditing" (`flb-fab-anchor`, Anchor.ts:21, enforced
internal/anchors.ts:199-218), and the cell bucket declares 1 — a cell
is a lattice value, not a log (`flb-fab-cell`, Cell.ts:43). None of
the three stamps an incarnation; all three sit under DECISIONS T6's
recorded deferral. The pinned client serves history as an iterator
(`bucket.history({ key }) → QueuedIterator<KvWatchEntry>`,
`@nats-io/kv` at 3.4.0), tombstones included, revisions bucket-global.

**`Registers.audit(work)` — certified history rows in fence-token
order.** The shape stands as designed, with the refereed G-7
amendments applied:

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
  readonly retainedDepth: number        // 64 — the DECLARED KV history depth,
                                        // a substrate declaration; NOT the G21
                                        // compaction horizon, which is derived,
                                        // never chosen (the sentence rides
                                        // this JSDoc — refereed G-7 am. 1)
  readonly rows: ReadonlyArray<AuditRow> // ascending token order — I1 licenses
                                         // presenting this AS an order
}
readonly audit: (work: string) => Effect.Effect<RegisterAudit, Refusal>
```

**License:** F5's I1/I2 make the retained history the *witness* of the
fence order — audit is a read of what the theorems govern, so it
inherits correctness rather than claiming any. I1 licenses the
ascending-token presentation; T0 licenses the token column.

**The two bounds that ride every response, non-negotiable:**
(1) **history is PER INCARNATION** — an audit spanning a bucket
recreation is two histories, never one order; audit cannot ship before
the incarnation pin converts from recorded deferral (T6) to machinery,
and **the conversion now covers all three buckets** (`flb-fab-reg`,
`flb-fab-anchor`, `flb-fab-cell`; the anchor bucket's audit surface
inherits the same stamp — refereed G-7 am. 2).
(2) **head-relative truth** — an audit answers "what was true at these
coordinates," never "what is current."

**The general `Replay` builder — re-grounded.** The register arm is
concrete (it is `audit` plus a fold). The cell arm is trivial by
design (F1/F2 make replay order-free) and belongs to `Cell.ts`. The
lane arm's implementation **already ships**: `replaySuccessors`
(internal/successors.ts:90-113) is the runtime successor-discipline
replay the fold wall itself runs, so `Replay.lane(...)` is chartered
as a **facade over the shipped `replaySuccessors`** — one walk, not a
second one — owned by the fold module (refereed G-7 am. 3).

```ts
Replay.register(work)          // rows in token order        — I1
  .fromToken(t)                // suffix cut is well-defined  — I1 (total per key)
  .fold(reducer)               // fold-forward over rows      — Reducer.make
// : Effect.Effect<A, Refusal, Registers>
Replay.cell(key)               // order-free by construction  — F1/F2 (Cell.ts owns)
Replay.lane(lane).fromAnchor(anchor).fold(algebra)
                               // facade over replaySuccessors — F3 (fold module owns)
```

Bounds on every arm: per-incarnation, head-relative, and
depth-by-declaration — inherited wholesale. **Status:** audit + the
register `Replay` arm + the three-bucket incarnation conversion are
one ticket (T-J), whose ratified post-M3 gate is now OPEN (M3 merged
`8d16f8111`); it mints with the operator's ruling ceremony, not in
this wave's set — Part C's map places it. Grill G-7 (refereed
ADOPT-AMENDED).

### A-11. Persistence facts — what the substrate already guarantees

Stated as facts with their evidence, re-verified at main, because the
replica and cache designs above must not re-claim (or accidentally
disclaim) any of it:

1. **Every Plait stream and bucket is declared file-backed R=1, and
   the shape checks REFUSE anything else at acquisition.** The commons
   stream (internal/nats.ts:34-41, refusal `substrate-shape`
   :56-78); the per-(lane, partition) evidence streams with
   deny-delete/deny-purge (internal/lanes.ts:74-87, refusal
   `lane-substrate-shape`); the register bucket
   (internal/registers.ts:244-270, `register-substrate-shape`); the
   anchor bucket (internal/anchors.ts:199-218,
   `anchor-substrate-shape`); the cell bucket
   (internal/cells.ts:244-270, `cell-substrate-shape`); the fold's
   durable pull consumers (internal/pump.ts:105-111,
   `consumer-substrate-shape`). A memory-storage server is not a
   degraded mode; it is refused.
2. **Process-crash recovery is proven, both sync modes**
   (VERIFICATION.md:50, `go/substrate/`); seam rule 6 bounds the
   claim: crash evidence is process-crash only. The fold adds its own
   two chaos gates over the same substrate (kill mid-fold, NAK
   redelivery — `internal/chaos.ts`, `FoldChaos.test.ts`).
3. **The declared durability spectrum:** `crash-durable` (default,
   background sync) versus `power-durable` (pinned `SyncAlways`,
   priced) — VERIFICATION.md:349-354. **Power-loss durability is
   explicitly never claimed** anywhere in the estate.
4. **The estate now runs a second durable content-addressed store,
   and R-4 rules the unification direction.** The fold checkpoints
   state as `state.<digest>` KV entries with verify-on-read at load
   (`ensureState`/`loadState`, internal/anchors.ts:134-180 — create
   is idempotent-by-comparison at the digest key, load re-derives and
   refuses) — file-backed, crash-proven. The catalog's store is a
   process-local `Map` (Catalog.ts:44-54). The ruled direction: **the
   Catalog gains a durable KV-backed layer built on the anchors
   pattern, and the fold's `ensureState`/`loadState` then becomes a
   Catalog consumer — never the reverse** (moving the fold onto the
   process-local catalog would delete the crash-durability its chaos
   gates prove). Part C ticket 9.
5. **Consequence for this catalog, one sentence:** the local replica
   (A-8) and every cache in this record sit *over* an already-durable
   substrate — they exist for latency and read amplification, never
   for durability; no recovery path may ever read a replica as a
   source of truth.

---

## Part A2 — the kernel binding

The kernel-algebra record is RATIFIED (K-1..K-10, 2026-08-18): the
agent-facing API is a closed eight-generator algebra, and this
catalog's affordances are **the generators' runtime carriers**. This
section makes the binding explicit in both directions, so the
affordances record reads as the kernel's runtime-carrier record and a
reviewer can walk generator → carrier → law without leaving the page.

### A2.1 The carrier map — affordance to generator

| Generator (kernel §4.2) | Runtime carrier on main / in this catalog | The law both cite |
| --- | --- | --- |
| `declare` | the one catalog door: `Catalog.put` via `Resolved.publish` (Resolved.ts:134-141 — publication is an explicit act, never an encode side effect); declaration constructors `Lane.declare`, `Fold.declare`, `Algebra.declare`, `ContextProgram.declare` (each derives identity by `digestOf`) | content addressing; C7's admission order (`c7_pin_well_founded`) |
| `resolve` | `Resolved.resolve` + `ResolvedOf`/`PublishingOf` (Resolved.ts:117-127, :162-205 — decode re-derives, refusal on mismatch, R-channel carries the services); **A-8a `ResolveCache`** is its memo (anchor-free by the kernel's own ruling — a digest names one value forever, which is exactly what licenses no-TTL success caching) | verify-on-read; JCS uniqueness (R0) |
| `emit` | `Lane.emit` over declared partitioned lanes (Lane.ts:249-256, internal/lanes.ts:160-192 — digest as message id, duplicate-safe); `FabricClient.publish` on the commons stream; **A-6's `matchPublished`/`matchEmitted`** fold the acknowledgements | `f2_trace_invariant`, `f1_history_convergence` |
| `join` | the merge-write loop in `internal/cells.ts:285-323`, extracted as **A-7 `casJoinLoop`**; `Cell.join`/`canonicalize`/`stateOf`; **A-8b `CellReplica`** is the read-side lower bound | F1 ACI + `join_semilattice_of_aci`, `cell_absorb_inflationary`, `cell_le_iff_subset` |
| `fold` | `Fold.declare` (the F4 bridge: step = combine ∘ contribution, Fold.ts:154-158) + `Folds.deploy` (the positioned pump, internal/pump.ts) + `replaySuccessors` (internal/successors.ts:90-113); **A-10's `Replay`** is its fluent read surface; anchors are its checkpoint facts (Anchor.ts) | `f3_resume_exact`, `f2b_guarded_exactly_once`, `f4_partition_fold`, F11 |
| `decide` | `Registers` five-action surface (Register.ts:39-49, internal/registers.ts — fenced CAS, at-most-one landed); **A-2 `byToken`** and **A-6 `matchState`** are its read conveniences; **A-10 `audit`** is its witness read; the G26 commit door (coming, agent plane §4.3) constrained-decodes outcomes at this generator's one seam | F5's I1/I2 (`token_monotone`, `at_most_one_landed_commit`, `no_stale_token_lands`) |
| `trigger` | no runtime carrier on main yet — the F10 five-production grammar is proven model-side (T32); when the trigger slice lands, its hint plumbing rides `emit` and its landed-claim dedup rides `decide` (F5's I2), so this catalog owes it no new affordance | `f10_stability`, `f10_hints_of_support`, `enabled_declarations_monotone` |
| `spawn` | no runtime carrier on main yet — F9's meet-attenuation is proven model-side; writs compile to Layers (agent plane §7.1), so the carrier will be Layer composition, not a new affordance class | `f9_policy_meet_semilattice`, `f9_tree_attenuation` |

Two reading notes. First, the two generators without runtime carriers
are stated as such — this record does not front-run their slices, and
the table's honesty is that six of eight generators already have their
carriers on main. Second, the kernel's immutable/head-relative sort
split (kernel §4.1) is visible in this catalog as the A-8a/A-10
split: `resolve`-class reads are anchor-free and cache-forever
(A-8a); every state read is served at coordinates and head-relative
(A-10's bounds) — the same split, carried by different affordances.

### A2.2 The agent-plane consumers — who calls these affordances

The agent-plane record (part 4; G25–G36 refereed) names the consumers
that will call this catalog's surfaces. Recorded here so every
affordance knows its caller and every ticket in Part C can cite one:

- **Admission tooling** (`Admission.ts`, agent plane §5.5) branches on
  refusal sorts through **`Refusal.match`** (A-6) — retries absences,
  surfaces structural refusals with their taught next steps, and never
  re-derives the union.
- **The task view** (`Actions.task`, agent plane §6.2) renders
  register state through **`Register.matchState`** (A-6) and consumes
  **`Registers.audit` + the `Replay` register arm** (A-10) for its
  per-round history half — phased: the walk at its adopting slice, the
  history half when T-J lands, the view's shape fixed now so the
  phasing is invisible to consumers (refereed G29).
- **The G26 commit door** (agent plane §4.3) is a coming consumer of
  the package's one parse boundary: `Registers.commit` for an action
  outcome constrained-decodes the outcome against the capability's
  declared output schema — `decodeRefusing` (Refusal.ts:168-178) at
  one more seam, refusing structurally with the capability digest
  cited. G23's sentence rides the door verbatim: the door refuses the
  *landing*, never the side effect. The refereed estate-of-safety
  candidate — *a landed outcome always decodes against the schema its
  certificate names* — lands at this seam.
- **Tick facts** (agent plane §11.2, refereed G32) are ordinary
  monotone evidence: racing schedulers emit byte-identical bodies and
  F2 absorbs the duplicates — the `(schedule digest, firing)` identity
  needs `emit` and nothing else from this catalog.
- **G36 class stamps.** The taxonomy (every structure is a lattice
  join / a checkpointed fold / a register decision, over immutable
  values) is refereed as design law; this catalog's surfaces stamp
  cleanly: A-7/A-8b are class-(a) machinery; A-10 and the fold
  carriers are class-(b); A-2/A-6 `matchState`/G26 ride class-(c);
  A-8a and the blob family are value-plane (class-less: immutable
  truths); A-11's facts are the substrate under all three. Part C's
  tickets carry a G36 line each where they declare structure.

---

## Part A3 — the surface disciplines

Two cross-cutting disciplines the operator directed into this pass,
each grounded on the pin and scoped to a decision — an idiom is
adopted where it earns its place and refused where it does not, so
neither becomes a fashion.

### A3.1 The Symbol decision — nominal identity, in the pin's actual form

**The directive, and its adaptation, recorded explicitly:** the
operator's directive named the unique-symbol TypeId idiom
(`const TypeId: unique symbol` + `readonly [TypeId]: TypeId`). At
rc.108 the pin's nominal-identity form is **string-literal TypeIds
throughout** — pin-check correction 3 above carries the citations —
so the directive's *intent* (deliberate nominal identity discipline)
is realized in the pin's actual form, and we do not import a v3 idiom
into a v4 codebase. Where Symbol-shaped identity earns its place:

1. **Service identity: already pin-idiomatic, no change.** Every
   Plait service is a `Context.Service` class keyed by a string
   (`"@foldlab/plait/Cells"` etc.), which is exactly the pin's own
   service-identity form (Context.Service, Context.ts:201; the pin's
   `ServiceTypeId` is itself the string `"~effect/Context/Service"`,
   Context.ts:41). B-13's audit already holds this shape green.
2. **Value identity: brands, not TypeIds.** Plait's nominal values
   are branded schemas (`Digest`, the subject family, and Part A3
   §2's sweep) — `Schema.brand` is the pin's nominal form for values
   (Schema.ts:5229) and carries validation, which a bare TypeId field
   does not. A structural interface gains a string-TypeId field only
   when it must be discriminated *at runtime* from a same-shaped
   stranger, and no such collision exists on main today. Adopted
   rule: **brands for values, service keys for services, TypeId
   fields only on demonstrated collision** — each use cites this
   section.
3. **The earned-brand form stays the house hybrid, deliberately.**
   `Algebra.ts` marks `CommutativeAlgebra` with a *phantom*
   `unique symbol` at the type level (declared, never constructed —
   Algebra.ts:19-24) and a separate runtime witness
   (`Symbol("@foldlab/plait/Algebra/commutative")`, :55, installed
   non-enumerably at :228-235, checked by `hasCommutativeWitness`
   :239-242). This is not the pin's TypeId pattern and is not trying
   to be: the phantom makes the brand unforgeable outside the module,
   the runtime witness makes it checkable at the deployment door
   (Fold.ts:132-133), and the pair is the earned-brand discipline
   (brands are earned by generated law suites, never asserted). Kept,
   documented, cited as the precedent for future earned brands.
4. **`PrimaryKey` rides A-4's reservation** — the protocol key is a
   string at the pin (PrimaryKey.ts:27); the first class-shaped
   carrier implements it; nothing before then.
5. **Equal/Hash instances stay refused** for plain structs — A-1's
   verdict: structural equality is native at the pin, and an instance
   would be code with no law behind it. The one future exception is
   already scoped: a class carrier that implements `PrimaryKey` MAY
   pair `[Equal.symbol]`/`[Hash.symbol]` as digest projections if a
   HashMap consumer materializes — same license as A-3's `byDigest`,
   decided then.

### A3.2 Canonical strings become concrete types — the sorts sweep

**The directive:** no bare `string` survives for any canonical value —
the ratified K-3 sort discipline (branded identifier sorts, never
comparable across kinds) pushed into the TypeScript surface. The
estate already proved the pattern twice: `Digest` (Digest.ts:9-12) and
the subject family (`EvidenceSubject`/`FactSubject`/`NodeSubject`,
Subjects.ts:6-27 — brand over `isPattern`, smart constructors
refusing invalid tokens). The sweep extends it to every canonical
string crossing a public seam, with one decision per family:

| Family (current type, seam) | Verdict | Form |
| --- | --- | --- |
| cell names (`cell: string`, Cell.ts:80-84; validated at cells.ts:90-100) | **brand** | `CellName` — brand over the shipped token pattern (`/^[^.*>\s]+$/u`); the adapter's `validCell` becomes the schema's check, minted once |
| register work keys (`work: string`, Register.ts:40-48; validated at registers.ts:124-134) | **brand** | `WorkKey` — same token grammar today; the kernel's direction (the register key IS a work digest, C7) makes this brand a future alias of `Digest` — the brand lands now, the tightening is the E9 slice's |
| holder strings (`holder: string`, Register.ts / Lane.EmitOptions / Wire Envelope.holder) | **brand** | `Holder` — descriptive, unauthenticated (the attribution fence rides the JSDoc: a holder is a claim, not an identity, until G4 lands); brand carries the non-empty check only |
| register outcome values (`outcome: string`, Register.ts:42-46) | **brand** | `OutcomeValue` — today an opaque non-empty string; the G26 commit door will constrain it against declared schemas, and the brand is the seam that check lands on |
| lane handles (`handle: string`, Lane.ts:39-45; validated via `evidenceSubject(handle, 0)` at Lane.ts:152-158) | **brand** | `LaneHandle` — the token grammar, minted at `Lane.declare`'s door |
| stream names (`FabricClientOptions.stream`, FabricClient.ts:12-14; `laneStreamName` internal) | **brand** | `StreamName` on the public option; the internal `FLB_FAB_EV_<digest>_<part>` composer stays internal |
| bucket names (`CELL_BUCKET` etc.) | **keep** | already literal consts consumed internally; no seam crossing |
| refusal kinds / envelope kinds / volatility classes | **keep** | already closed literal unions (`Schema.Literals`) — the sweep's target state |
| `Segment.name`, `Selector` cell arm (ContextProgram.ts:72, :96) | **brand** | `SegmentName` (non-empty) and the `CellName` brand reused in the selector — one sort, both seams |
| connection names (`connectionName?: string`) | **keep bare** | deployment configuration, outside meaning (G30's band); a brand here would dignify ops labels into sorts |
| operation names in refusal `path`s (internal) | **keep bare** | diagnostic strings inside refusal payloads, not identities; the refusal schema is their law |

**The subject family and the template-literal question, decided
against the pin.** A-5 refused `Schema.TemplateLiteral` for the digest
because fixed-length character-class repetition is not a concatenation
shape. Subjects ARE concatenation shapes, and the pin genuinely fits
them: `Schema.TemplateLiteral` (Schema.ts:2902) accepts schema parts
whose **checks are applied while matching each segment** (the
constraint interface `TemplateLiteral.SchemaPart`, :2802; the
checks-per-segment sentence in the constructor docs, :2886), and
`Schema.TemplateLiteralParser` (:2981) decomposes a matched subject
back into its typed parts — so
`TemplateLiteral(["flb.fab.ev.", Token, ".", Part])` with a
pattern-checked `Token` expresses the evidence-subject grammar
exactly, and the parser would give `(lane, partition)` back for free.
**Verdict: the brands are mandatory; the template-literal form is a
priced option, adopted only when a consumer needs decomposition** —
the shipped brand + smart-constructor form already carries validation
and nominal identity, and rebuilding it buys nothing until someone
needs to *parse* a subject rather than construct one. The sweep does
not require it; the option is recorded with its citations so the
next reviewer doesn't re-derive the verdict.

**The wall:** the signature manifest
(`test/PublicEffects.signatures.txt`, regenerated by
`generate:public-effects`) catches every surface change, and the
sweep's acceptance is that **a bare-string call site fails to
compile** — the same must-not-compile discipline K-3 mandates for
cross-sort comparison, arriving with the brands. Part C ticket 7.

---

## Part B — the idiomatic audit, re-verified at main `6234483a1`

Numbered findings; each carries file:line at TODAY's tree, the
pin-referenced idiom, and the concrete recommendation, now with a
status stamp: **OPEN** (stands as found), **GROWN** (the merges
widened it), **FIXED-BY** (a merged commit closed it), **HOLDS**
(positive finding still true). The grill review's R-5 sweep items map
onto B-4/B-7/B-1 and are noted in place. Dispositions remain the
operator's; nothing here is an edit.

**B-1. StoredRegister decode admits excess keys while its law says
"closed". — OPEN, now the SOLE outlier.**
`packages/plait/src/internal/registers.ts:149` —
`Schema.decodeUnknownResult(StoredRegister)(value)` passes no options;
at the pin `onExcessProperty` defaults to `"ignore"`, which strips
unknown object keys silently (SchemaAST.ts:445). The refusal minted
beside it states "Register state is a closed holder/outcome record."
Both merged waves did this right — the cell decode
(internal/cells.ts:120-123), the anchor decode
(internal/anchors.ts:110-113), the pump's event decode
(internal/pump.ts:192-194), the lane declaration decodes
(Lane.ts:159-162, :214-217) all pass
`{ onExcessProperty: "error", errors: "first" }` — so the register is
now the package's one outlier (R-5c confirmed this).
**Recommendation:** same options here; ticket 1.

**B-2. `Register.hold` is the one public effectful function without
`Effect.fn`. — OPEN.**
`packages/plait/src/Register.ts:78-99` — `hold` builds with
`Effect.gen` directly; architecture §4 rules "`Effect.fn` names every
exported effectful function (spans for free)," and every other export
complies (Digest.ts:31, Canonical.ts:122, Wire.ts:226/252/269,
Subjects.ts:51/63/71, every merged service and method — the two waves
adopted `Effect.fn` wall-to-wall, including `Effect.fn.Return` typing).
Pin form: Effect.ts:13563. **Recommendation:** wrap as
`Effect.fn("Register.hold")(function* (...))`; ticket 1.

**B-3. The heartbeat loop hand-rolls what Schedule and SynchronizedRef
already carry. — OPEN.**
`packages/plait/src/Register.ts:89-96` — `while (true) { sleep; get;
renew; set }` over a `SynchronizedRef`. Two pin idioms apply: the
recurring effect is `Effect.repeat(renewOnce,
Schedule.spaced(heartbeatEvery))` (Effect.ts:7561; Schedule.ts:1198 —
reads as policy and composes jitter/backoff later), and the
read-renew-write triple is one atomic
`SynchronizedRef.updateEffect(token, (current) =>
Effect.map(registers.renew(work, current), (s) => s.token))`
(SynchronizedRef.ts:485) — today's get/renew/set is raced only by
fibers that don't exist yet, so this is idiom and future-proofing, not
a live race. **Recommendation:** adopt both; no behavior change
claimed; ticket 1.

**B-4. The subscribe pump's unbounded buffer forfeits backpressure —
OPEN, and now one of two answers in one package (R-5a).**
`packages/plait/src/internal/nats.ts:194-206` — `Stream.callback` with
`Queue.offerUnsafe` and no options: the pin's default is an unbounded
buffer (Stream.ts:668, the callback docs; the options land at
:696-699), so a slow consumer accumulates every delivered message in
process memory. The fold's pump answers the same question differently
and better: a server-side bound — `consume({ max_messages:
min(checkpointEvery, PUMP_BUFFER_BOUND) })` under a durable consumer
whose `max_ack_pending` is shape-checked at 256
(internal/pump.ts:157-173, :105-111) — so one package now ships two
backpressure answers. Two pin-current repairs for the commons pump, in
preference order: (a) keep `Stream.callback` but pass `{ bufferSize,
strategy: "suspend" }` (Stream.ts:696-699) — smallest diff; or (b)
drop the adapter: `ConsumerMessages` is an AsyncIterable at the pinned
client, so `Stream.fromAsyncIterable` (Stream.ts:1277) under the
existing `acquireRelease`/`Stream.unwrap` (:1633) inherits the
client's own flow control. DECISIONS T4 chose the callback adapter so
interruption closes an idle pump — route (b) preserves that (the
release's `messages.close()` ends the iterator), but T4 must be
superseded by a new entry if adopted; T5's dedup-scope sentence
supersedes in the same act (A-6 amendment 4). **Recommendation:** (a)
now, (b) as the recorded follow-up; ticket 3.

**B-5. Every envelope decode canonicalizes twice; every publish, three
times plus a JSON re-parse. — OPEN.**
`packages/plait/src/Wire.ts:242-243` — `decodeEnvelope` computes
`canonicalBytes(decoded.success)` and then `digestOf(decoded.success)`,
and `digestOf` (Digest.ts:31-36) re-runs `canonicalBytes` on the same
value. `encodeEnvelope` (Wire.ts:252-257) canonicalizes, then
re-enters `decodeEnvelope`; the publish paths pay it per message
(internal/nats.ts:166-179, internal/lanes.ts:181-185). The one-door
discipline (encode goes through the constrained decode) is deliberate
and stands; the repair that needs no new law is hashing the bytes
already in hand: an internal `digestOfCanonicalBytes(bytes):
Digest` — identity is defined as exactly that hash. Refusal behavior
untouched. **Recommendation:** internal helper + use at Wire.ts:243;
the R0 wall's four regenerated rows are the regression gate; ticket 1.

**B-6. Hand-rolled structural comparators re-derive what the pin's
Equal provides — OPEN, register-scoped.**
`packages/plait/src/internal/registers.ts:169-176` (`sameOutcome`,
`sameStored`) and the sort-and-scan subject comparison
(internal/nats.ts:109-114). At the pin, `Equal.equals`
(Equal.ts:172-174) deep-compares plain records and arrays —
`Equal.equals(stored, intended)` is the whole of `sameStored`. The
failure mode is silent drift: add a field to `StoredRegister` and
`sameStored` keeps comparing the old two, so read-back reconciliation
would claim "landed as intended" on records differing in the new
field. (B-1 interacts: `onExcessProperty:"error"` fences foreign
fields, `Equal.equals` fences forgotten comparisons — two sides of one
gap.) Scope note: the cell adapter compares by canonical BYTES
(`sameBytes`/`subsumes`, cells.ts:148-169) — that is not this
finding's pattern but the lattice's own honest post-condition (T16),
and it stays. **Recommendation:** `Equal.equals` in the register
adapter; the register wall rows are the regression gate; ticket 1.

**B-7. Every thrown cause wears the retryable absence sort — defects
included. — OPEN and GROWN.**
The pattern — `Effect.tryPromise({ catch: (cause) =>
transportRefusal(op, cause) })` classifying *every* rejection,
including programming defects, as the one retryable sort — now ships
in **all eight adapter files** (the definition sites in B-8's list),
across every connect, bucket-ensure, status, read, and write path. A
defect dressed as absence invites a retry loop on a bug. The house
discipline is stated one-sided in DECISIONS T0 ("transport causes are
preserved and never wear fencing laws"); this is its symmetric half:
*defects never wear the absence sort.* Pin idiom: reserve the error
channel for expected failures and let defects be defects (the
catch-family docs, Effect.ts:2609-2632, draw exactly this line).
**Recommendation:** narrow the catch to the pinned client's error
types (`JetStreamApiError` and the transport-error classes at
`@nats-io/*@3.4.0`) on the extracted transport spine, and let
anything else die as a defect. Behavioral change to the error
channel — its own small disposition; ticket 2, riding ticket 1's
spine.

**B-8. The transport shape is duplicated across the adapters — GROWN:
eight sites, and by the seam rule that many adapters IS the seam.**
Verified counts at main: **eight** local `transportRefusal`
definitions (internal/nats.ts:43, registers.ts:71, cells.ts:63,
anchors.ts:56, lanes.ts:33, pump.ts:58, folds.ts:23, chaos.ts:55 —
same structure, six absence kinds), **six** `closeConnection` copies
(nats :117, registers :198, cells :136, lanes :138, folds :36, chaos
:87), **six** connect-acquire blocks (nats :153-162, registers
:220-229, cells :220-229, lanes :147-156, folds :54-63, chaos
:290-300), **three** `isCasRefusal` copies (registers :56, cells :58,
anchors :51), **three** `KvFailure` carriers (registers :164, cells
:143, anchors :47). The original recommendation stands and the
deep-module rule now states it exactly: one adapter is a hypothetical
seam, two is a real one — eight is a spine. **Recommendation:**
`internal/transport.ts` with `acquireConnection(options, defaultName)`,
`closeConnection`, `transportRefusalFor(kind)`, `isCasRefusal`,
`KvFailure` — internal only, so no lawful-surface question arises.
The Subjects.ts constructor trio note stands unchanged (three small
occurrences, explicit reads better). Ticket 1.

**B-9. `Wire.firstIssue` is an audited, justified deviation from the
pin's issue formatters — keep it, and say why. — OPEN (comment not yet
placed).**
`packages/plait/src/Wire.ts:78-100` hand-walks the issue tree. The pin
ships formatter machinery doing the same walk (SchemaIssue.ts:1026
`makeFormatterStandardSchemaV1` → :1055 `toDefaultIssues`) — but its
output erases the leaf's `_tag` (the `UnexpectedKey` discrimination at
Wire.ts:129/158 separates the closed-struct law from the shape law).
The deviation gains a second justified neighbor on main:
`internal/refusals.ts:43-63` walks issues too, for a different law
(recovering the ridden refusal annotation — its module doc says why it
is internal). The two walkers serve two laws and stay separate (Part
B2's FH-8 records the considered-and-refused merge).
**Recommendation:** one comment line on `firstIssue` naming this
finding; ticket 1.

**B-10. JSDoc examples are load-bearing surface at the pin; one of
ours cannot run. — OPEN, deferred to its named lane.**
`packages/plait/src/Wire.ts:262-267` — `verifyEnvelopeDigest`'s
example references undefined `bytes`/`messageId`. DEV-715 (quickstart
samples doctest) is the named lane for making example rot mechanical.
**Recommendation:** unchanged — fold into DEV-715's harness scope; not
in this wave's tickets.

**B-11. Positive: dual coverage is correct and complete. — HOLDS.**
`Refusal.retryAbsence` (Refusal.ts:122-143) remains the package's one
true combinator over Effects, `dual(2, ...)` in the pin's exact form
(Function.ts:102), four-overload signature pinned by the manifest. The
subtlety comment stands as recommended (the `{ times, while }` /
`{ schedule, while }` forms keep the error channel at `Refusal`
because the pin's `Retry.Return` conditional matches
`times`/`schedule` before the `while`-refinement narrowing arm,
Effect.ts:3941-3947 — the honest type, since exhausted retries surface
the final `AbsenceRefusal`); ticket 1 places it.

**B-12. Positive: error-channel precision is exact at every public
seam, and the gate proves it stays so. — HOLDS.**
No `any`/`unknown` widening on the public surface; every carrier
resolves to the refusal unions per the committed manifest
(test/PublicEffects.signatures.txt), and DECISIONS T7/T8 keep the
check derivation-based — the merged waves regenerated the manifest
rather than weakening it. Part A's additions inherit this gate
automatically.

**B-13. Positive: service and layer idiom match the pin exactly — and
the watch item is SATISFIED.**
`FabricClient`, `Registers`, and now `Lanes`, `Folds`, `Cells`,
`Catalog`, `Blobs` are `Context.Service` classes with static
`layer`/`testLayer`; `Layer.effect` (Layer.ts:1014) absorbs the
adapters' `Scope` requirement. The original watch item — that
DEV-724's Catalog/Blobs land in this exact shape — was satisfied by
the merge (Catalog.ts:70-82, :98-114; FIXED-BY `1848b1546`, PR #81).

**The R-3 round-2 items, audited for completeness:** (a) the three
`next: []` transport refusals are FIXED — zero `next: []` remain in
src (every refusal teaches); (b) `FabricClientOptions.stream`'s
half-orphaning is FIXED by documentation and decision — the option's
JSDoc says "names only the fact/node commons stream … subscriptions
discover their subject's owner" (FabricClient.ts:12) and DECISIONS
carries the subscribe-discovers entry; (c) the T4/T5 supersessions are
OPEN and ride ticket 3. R-1 (the corpus wall's growth coupling) is
FIXED-BY `5f82ebaae` (PR #83 round 2): `FabricWall.test.ts` now
derives per-family coverage from the manifest header and reports
unfamiliar families instead of failing on them.

---

## Part B2 — the friction hunt

The deep-module pass over `packages/plait/src`, run under the directed
method (friction hunt → candidate cards → badges), in the mandated
vocabulary: a **module** is anything with an interface and an
implementation; **depth** is behaviour per unit of interface; a
**seam** is where an interface lives; an **adapter** satisfies an
interface at a seam; depth buys callers **leverage** and maintainers
**locality**; the interface is the test surface; one adapter is a
hypothetical seam, two is a real one. Badges: **Strong** (lands in
Part C, or says why not), **Worth exploring**, **Speculative**
(stays here, un-ticketed). Recently-merged code weighed highest — the
E6 and fold surfaces are the recent code.

**FH-1 · The transport spine. Strong → ticket 1.**
Files: all eight `internal/` adapters (counts in B-8). Friction: the
connection-lifecycle-and-refusal shape is one implementation living
behind eight copies of itself — by the seam rule, eight adapters is a
very real seam with no module at it. Deletion test: delete any copy
and its content reappears verbatim next door. Solution: one internal
module (`internal/transport.ts`) owning acquire/close/refuse/classify.
Leverage: a ninth adapter (the durable Catalog layer, ticket 9)
inherits the lifecycle for free. Locality: B-7's classification
narrowing becomes one edit instead of eight; the taught-repair wording
lives once. Testable through the interface: the spine's refusal
classification gets its own suite; the adapters' walls stop re-testing
it eight times.

**FH-2 · The cell merge loop wants to be `casJoinLoop`. Strong →
ticket 4.**
Files: internal/cells.ts:285-323 (the loop), Cell.ts, Algebra.ts (the
Reducer it should take). Friction: the lawful class-(a) write path —
the kernel's `join` generator — is an implementation trapped inside
one adapter's `merge` method; its interface (read/create/update/
discipline/bound) is implicit in the closure. Honesty sentence,
verbatim in kind from the review: **the second join consumers
(directory bind, admission facts, memory cells) are chartered by the
ratified G36/kernel rulings, not yet shipped — so this extraction's
license is the kernel ratification, and one adapter today would
otherwise make this a hypothetical seam.** Solution: the A-7
extraction contract. Leverage: every future class-(a) carrier writes
zero loop code. Locality: the bounded-attempts/reconcile-
before-classify semantics live once, under CellWall.

**FH-3 · Two services share one name in Catalog.ts. Strong →
ticket 5.**
Files: Catalog.ts:40-42 (`BlobService`), Resolved.ts (its consumer).
Friction: a shallow public face over a catalog-internal seam — the
public name promises a blob store; the implementation is a get-only
Option-speaking always-absent stub whose *design role* (T18: the
unverified leg under `Resolved.resolve`) is invisible at the
interface. Solution: A-9's split — rename the internal seam, mint the
deep public `Blobs` in Blob.ts (verify-on-read hidden *inside* the
interface). Leverage: application code gets put/verified-get/has with
inherited verification. Locality: T18's control stays writable at the
internal seam.

**FH-4 · A durable content-addressed store hides inside the anchor
adapter. Strong → ticket 9.**
Files: internal/anchors.ts:134-180 (`ensureState`/`loadState`).
Friction: the estate's only durable verified CAS store is an
implementation detail of checkpointing — no interface, no reuse path;
meanwhile the Catalog's live layer is a process-local Map. Deletion
test: build the durable Catalog without touching anchors.ts and this
code gets written twice. Solution: R-4's ruled direction — the Catalog
gains the durable KV-backed layer built on this pattern; anchors
consume the Catalog, never the reverse. Leverage: one verified durable
store under catalog, blobs-internal seam, and fold state. Locality:
the crash-durability walls (the two chaos gates) police one
implementation.

**FH-5 · Idiom depth in the register module. Strong → ticket 1.**
Files: Register.ts:78-99, internal/registers.ts:149,:169-176.
Friction: B-1/B-2/B-3/B-6 are four small shallow spots — hand-rolled
loops and comparators whose implementations restate what the pin's
interfaces already carry. Solution: the mechanical sweep. Leverage:
spans, atomic renew, drift-proof comparison — all inherited from the
pin rather than maintained.

**FH-6 · Two backpressure answers in one package. Strong → ticket 3.**
Files: internal/nats.ts:194-206 vs internal/pump.ts:157-173. Friction:
the same question (how much undelivered work may sit in memory)
answered "unbounded" at one seam and "256, server-enforced" at
another; a caller cannot learn either answer from the interfaces.
Solution: B-4's disposition. Locality: the answer becomes visible
configuration at one seam.

**FH-7 · Bare-string sorts across public seams. Strong → ticket 7.**
Files: the Part A3 §2 inventory. Friction: the interfaces under-state
their invariants — `cell: string` accepts what `validCell` will refuse
at runtime; the type system knows nothing the adapters know. Solution:
the sorts sweep — validation moves to the brand's check, minted once
at the seam. Leverage: a bare-string call site fails to compile; the
adapters' validators become schema checks.

**FH-8 · Two issue-walkers. REFUSED — recorded so nobody unifies
them.**
Files: Wire.ts:78-100, internal/refusals.ts:43-63. Superficially
duplicate tree-walks; actually two laws — leaf classification for the
wire's refusal taxonomy versus annotation recovery for the parse
bridge. B-9's verdict extends: merging them couples two laws into one
walker and saves ~20 lines. The deletion test fails in reverse —
inlining either loses nothing but the false symmetry. Un-ticketed by
design; B-9's comment line cites this card.

**FH-9 · The Subjects constructor trio. Speculative, un-ticketed.**
Subjects.ts:51-76 share a validate-token shape at three small
occurrences; B-8's original note stands — explicit reads better at
this size. Revisit only if the subject family grows (the A3 §2
template-literal option would subsume the question).

---

## Part C — the initial refactor set

**[SUPERSEDED: the original T-A..T-K map described a pre-merge world —
injection routes into a live seat, tickets gated on unmerged
branches. It is replaced whole by the set below; the original table
remains in git history.]**

Per the operator's sequencing rule: this amended record lands on main
first, and the tickets below cite it as their spec authority. The
tickets are CUT on the multica board (project
`74c8c5a8-8521-4fee-ac04-dca012707ba0`) as **unassigned, status todo**
— assignment dispatches runs, and dispatch is the coordinator's act,
gated on the operator's ruling over the three sheets (the 19 → K →
GT order; the K-sheet is ruled, the 19 ride this record). Each ticket
is self-contained: it cites this record's sections, names its walls,
sizes in seat-sessions, states its G36 class where it declares
structure, and carries its deep-module frame (the seam, what deepens,
what the module hides).

### C-1. The nine tickets, dependency-ordered

| # | Ticket (cut 2026-08-18, unassigned todo) | Carries | Depends on | Priority |
| --- | --- | --- | --- | --- |
| 1 · **DEV-734** | **Transport spine extraction + mechanical dispositions** | B-8 (eight sites → `internal/transport.ts`), B-1, B-2, B-3, B-5, B-6, B-9 comment, B-11 comment | — | high |
| 2 · **DEV-735** | **Defect classification (B-7 disposition)** | narrow the spine's catch to the pinned client's error classes; defects die as defects | 1 | medium |
| 3 · **DEV-736** | **Backpressure unification (B-4) + T4/T5 supersessions** | bounded commons pump (route a; route b recorded); DECISIONS entries; the dual-scope dedup sentence | 1 | medium |
| 4 · **DEV-737** | **`casJoinLoop` extraction per the G-2 contract** | A-7 whole: `internal/cas.ts`, Reducer-parameterised, MergeDiscipline preserved, bounded, CellWall+T16 verbatim; A-8b's replica rides the module | 1 | high |
| 5 · **DEV-738** | **The Blob split per G-5** | A-9 whole: internal seam renamed; `Blob.ts` `BlobsService` + `layerFileSystem` + conformance suite; G-6 refusal recorded | 1 | high |
| 6 · **DEV-739** | **The resolve cache per G-3** | A-8a: verified-path decorator, digests-only, `Cache.makeWith`; name bound by API log 0018 | 5 | medium |
| 7 · **DEV-740** | **The sorts sweep + the Symbol decision** | Part A3 whole: brands per the family table; the must-not-compile wall; the TypeId/PrimaryKey/Equal statements | 4, 5 | medium |
| 8 · **DEV-741** | **The matcher set + equivalence instances + the coherence wall** | A-6 (all matchers, suites derived from the union artifacts), A-1 (the wall), A-2 (`byToken`), A-3 (`byDigest` ×2 + `envelopeEquivalence`) | 7 | medium |
| 9 · **DEV-742** | **The durable Catalog layer per R-4** | A-11 fact 4 realized: KV-backed verified store on the anchors pattern; anchors become a Catalog consumer, never the reverse | 1, 5, 7 | high |

Every in-text "ticket N" in Parts A/B/B2 resolves through this table:
1=DEV-734, 2=DEV-735, 3=DEV-736, 4=DEV-737, 5=DEV-738, 6=DEV-739,
7=DEV-740, 8=DEV-741, 9=DEV-742. All nine sit on the board unassigned
at status todo; their descriptions are self-contained and cite this
record at `c585c24c8`.

Prose reading of the order: the spine first (everything touches the
adapters, and eight copies of the transport shape would conflict with
every later ticket); the two behavioral dispositions ride it; the two
deep extractions (join loop, blob split) next, independent of each
other; the cache decorates the split's settled seams; the sweep brands
the settled surfaces once; the matcher/instance wave lands on branded
types so nothing is typed twice; the durable layer last — it is the
deepest change, it consumes the spine, the split, and the brands, and
every earlier ticket makes its diff smaller.

Not in this wave, with their gates: **DEV-730** (object-store probe —
already minted; gates A-9 backend (b)); **DEV-731** (ninth probe
suite, KV watch semantics — already minted; gates A-8b's watch feed);
**T-J** (three-bucket incarnation conversion + `Registers.audit` +
`Replay` register arm — A-10; its ratified post-M3 gate is open, and
it mints with the operator's ruling ceremony because its G-7 shape
ruling rides the sheet); **B-10** (rides DEV-715's doctest lane); the
shuttle epic S1 (agent plane; its own sequencing rule: after the
merge queue clears and the transport extraction lands — ticket 1 is
its named precondition).

### C-2. The G-sheet, with status lines

House style preserved: one decision per item; the refereed verdict and
its realization are stamped so the operator's ruling pass reads state
at a glance.

**G-1. Admit the matcher set (A-6) as public surface in the concept
modules, with closure law tests generated from the unions.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (timing after both
merges — now satisfied; suites derived from the union artifacts;
Lane's own matcher; dual-scope dedup JSDoc). Realized by DEV-741 on the
operator's ruling.*

**G-2. `casJoinLoop` ships internal-first, consumed by the cell write
path; publication as a lawful public combinator is a separate later
decision.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (route (a) dead;
post-merge behavior-preserving extraction from `internal/cells.ts`,
Reducer-parameterised, MergeDiscipline + bounded attempts +
reconcile-before-classify preserved; CellWall + T16 rows verbatim).
Realized by DEV-737 on the operator's ruling.*

**G-3. The resolve cache is a wrapping layer on the verified resolve
path, not a change to any service shape.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (verified path only;
keys are digests only; the store's boundlessness is R-4's question).
Realized by DEV-739 on the operator's ruling; the surface name moves
beside `Resolved.resolve` per the amendment (A-8a naming note).*

**G-4. Pre-register the refusal: the CAS disciplines are never
unified.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (the sentence is now
three-way: joins retry by idempotence (F1); registers reconcile by
read-back because outcomes land once (I2); anchors never retry — a
lost anchor CAS is a fatal detach (dispatch 31 decision 6)). Recorded
in A-7; no build either way; the API-log sentence lands with
DEV-737's DECISIONS entry.*

**G-5. Admit `Blob.ts` as the `BlobsService` interface (capabilities,
never vendors) with `layerFileSystem` as the first backend — zero new
plait dependencies.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (the two-services split;
absence is `AbsenceRefusal`, never `Option`; the probe gate binds the
OBJ backend only). Realized by DEV-738 on the operator's ruling;
DEV-730 gates backend (b).*

**G-6. Pre-register the refusal: no ranged/partial blob reads until a
chunk-manifest identity law exists.**
*Status: refereed 2026-08-18 — ADOPT (unamended). Recorded in A-9;
DEV-730's partial-read findings are the law's evidence base; nothing
built.*

**G-7. Adopt the A-10 shapes — `AuditRow`/`RegisterAudit` and the
`Replay` builder — as the spec for the ratified audit ticket.**
*Status: refereed 2026-08-18 — ADOPT-AMENDED (retainedDepth is the
declared KV depth, never the G21 horizon — the sentence rides the
JSDoc; the incarnation conversion covers all three buckets; the lane
arm is a facade over shipped `replaySuccessors`). Mints as T-J with
the ruling ceremony; not in this wave's set.*

---

*Prepared by the Fable Effect-architecture seat: original 2026-08-17;
the adaptation pass 2026-08-18 under the operator's recommissioning
charge and the coordinator's checkpoint rulings (the five checkpoint-1
adjustments applied in place: the roster arithmetic sentence, the
DEV-730/DEV-731 citations, the Symbol adaptation sentence, the ticket
mechanics, the FH-2 honesty sentence and the 0018 naming bound). Pin:
effect 4.0.0-rc.108 at `repos/effect` (vendored in-tree; every
citation re-verified in place this pass); NATS clients
`@nats-io/*@3.4.0`; platform layers catalog-pinned at the workspace
root (package.json:13-14). Main at `6234483a1`; merged waves PR #81
`2b28d9efb`, PR #83 `6bae7007b`, M2 `52c5f8eab`, M3 `8d16f8111`;
refereed verdicts at `af7a68d39`. No repository file other than this
record changed by the amendment; the nine tickets cut on the board:
DEV-734..DEV-742, unassigned, todo (the C-1 table maps them); DEV-730
and DEV-731 pre-existed as the probe mints.*
