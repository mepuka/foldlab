# The ops projection — every harness need derived in the plane layout

Date: 2026-08-19. Status: **PROJECTION, DERIVED-AND-CITED.** Written by
a build seat in a worktree at `3524ec103a5e`. It changes no code, no
gate, no corpus row, no ledger row, and no ticket; its only write is
this file.

**The commission.** The architecture consult — read whole for this
record at `scratch/research/2026-08-18-algebra-engine-architecture.md`,
and promoted into `docs/design/2026-08-18-storage-stack-and-expressibility.md`
— carried a harness table that was a skeleton: a list of derivations to
publish, drawn when the runtime had almost none of them. Stage 3 of the
plane-layout epic landed, and most of those rows now have modules to
point at. This record is that table re-derived against the tree as it
actually stands: for each harness need, the generator composition that
says it, the plane it lives on, the carrier that holds it, the refusal
surface that guards it, and the module in the moved tree that does the
work. A row that does not close is a **FINDING**, recorded with its
unlock, never papered over.

**Two tables, merged, and which is which.** The consult carried the
harness material twice: a derivation table (its §7) giving each row its
derivation, carrier, and refusal surface, and a cost-ladder table (its
§10.3) naming the harness *needs* and pricing each. This record takes
the ten needs the ladder names as its spine (§3–§4) and answers each in
the derivation table's columns; the seven rows the derivation table
carries that the ladder does not name are answered in §5, so the
projection is total across both.

**Served equals derived, applied to a document.** The estate's third
standing law says a rendered surface is generated from declared sources
and never hand-authored beside them. A projection is held to the same
standard even when its target is prose: every module path, theorem
name, gate name, refusal spelling, and count below was read first-hand
in this worktree before it was written down. Where the consult's table
and the tree disagree, **the tree wins and the disagreement is
recorded** (§7). A projection that cites a path which does not exist is
exactly the failure the discipline exists to refuse.

**Law 10 and this file.** Law 10 forbids tracking artifacts — repo-local
ids, ticket keys, paths, and commands — on any surface rendered
*outward*. A design record is tracking-land, not an official document,
so path and gate citations are lawful here and are used throughout,
matching every sibling record in this directory. Nothing in this file is
a projection source. If a sentence below is ever promoted to a rendered
surface, it loses its citations on the way.

**The honesty convention.** Every row opens with a **Ground** block:
what exists in the tree today, read first-hand. Everything outside a
Ground block is derivation or proposal, and is marked as such. No
claim below is sized larger than the run that produced it, and §9 says
what I could not verify at all.

---

## 0. Orientation for a reader from outside

Twelve words carry this record. Each is glossed once, here, and used
plainly thereafter.

- **Digest** — the hash of a value's one canonical byte form. It *is*
  the value's name; two spellings of one value have one name.
- **Act** (or **generator**) — one lawful sentence of the kernel
  language. There are eight verbs and no ninth: `declare`, `resolve`,
  `emit`, `join`, `fold`, `decide`, `trigger`, `spawn`.
- **The door** (`admit`) — the one place judgment happens. A candidate
  act goes in; either an admitted act comes out, or a taught refusal
  does: the reason, the law it defends, the legal next move, and
  whether that move is machine-applicable.
- **Lane** — an append-only, positioned stream of attributed facts.
  The journal. Nothing is ever edited in place on a lane.
- **Cell** — a set of observations merged by union. Order-free,
  duplicate-free: re-delivery changes nothing.
- **Fold** — the one read of changing state: a declared reduction over
  a lane, pinned to an **anchor** (a checkpoint naming a position in
  one partition). A folded answer is never wrong later; it is only
  earlier.
- **Register** — the fence. The one place an exclusive choice is made,
  guarded by a monotonically rising token.
- **Writ** — the scope a holder acts and reads under. It names what
  may be referred to and what may be imaged.
- **Rung** — the algebraic strength a declared reduction has earned
  (associative, commutative, idempotent, and so on). A rung is a
  *right*: it licenses which carrier a fold may read from.
- **Plane** — a layer of the tree. The order is `truth ← kernel ←
  planes ← carriage ← surface`, and a layer imports only itself and
  deeper.
- **Refusal** — a typed no carrying reason, law, and repair. Refusals
  are data on the meaning path, never thrown errors.
- **Projection** — a surface generated from the one corpus: the
  TypeScript types, the tool schemas, the prose page. A hand-written
  twin of a projection is a defect, not a style choice.

---

## 1. Ground — the tree the rows are derived against

Read first-hand in this worktree. The runtime lives at
`packages/plait/src/`, laid out in the five planes plus a flat private
adapter directory:

| Plane | Modules present today |
| --- | --- |
| `truth/` | `Algebra.ts`, `Canonical.ts`, `Digest.ts`, `Refusal.ts`, `RefusalKinds.generated.ts` |
| `kernel/` | `KernelDoor.ts`, `KernelIdentity.ts`, `KernelProgram.ts`, `KernelCorpusSchemas.ts`, `ContextProgram.ts`, `CasDaemon.ts`, `Subjects.ts`, `Wire.ts`, and four generated modules: `KernelTables.generated.ts`, `KernelBuilder.generated.ts`, `KernelSchemas.generated.ts`, `KernelSdk.generated.ts` |
| `planes/` | `Address.ts`, `Anchor.ts`, `Blob.ts`, `Catalog.ts`, `Cell.ts`, `Environment.ts`, `Fold.ts`, `Lane.ts`, `Register.ts`, `Resolved.ts`, `Session.ts` |
| `carriage/` | `Engine.ts`, `FabricClient.ts`, `CasDaemon.ts` |
| `surface/` | `cli.ts`, `mcp.ts`, and `../index.ts`, the curated barrel |
| `internal/` | 27 private adapters, flat, each tagged with the seam it serves — including `lanes.ts`, `cells.ts`, `registers.ts`, `anchors.ts`, `folds.ts`, `pump.ts`, `cas.ts`, `carriers.ts`, `incarnations.ts`, `presence.ts`, `heartbeat.ts`, `statuspump.ts`, `writs.ts`, `permissions.ts`, `serveroptions.ts` |

The language itself is closed and generated. Read out of
`kernel/KernelSdk.generated.ts` this session: eight generators
(`declare`, `resolve`, `emit`, `join`, `fold`, `decide`, `trigger`,
`spawn`); twelve declaration kinds, ranked, with `index` at rank 6 and
`resource` at rank 7; five hole stages in rising rank order — `opened`,
`filled`, `disputed`, `decided`, `sealed`; five monotone trigger
productions; and sixteen taught refusal reasons, each with its law, its
repair, and its applicability.

Six fixture files sit at `packages/plait/fixtures/`; four hold rows
this record cites. `kernel-conformance.ndjson` carries the door's
vectors. `fabric-conformance.ndjson` carries 27 vectors generated by
executing the `verify/fabric` model, with its own per-kind counts on
line 1 as provenance — 28 lines, one header and 27 rows.
`register-traces.ndjson` carries 15 fenced-register trace rows behind
its own provenance header — 16 lines, the same one-header shape. `tools.schema.json` carries the eight
served tools, a byte-identical committed copy of the model's own
emission.

---

## 2. How to read a row

Each row answers the four columns the consult's table named — **derivation
· plane · carrier · refusal surface** — and adds the two the tree can
now supply: the **module** that does the work, and the **cost tier** the
row sits at on the logic-priced ladder. Tiers are ordering claims, never
measurements; nothing in this record was benchmarked.

Three statuses, and the difference between them is load-bearing:

- **DERIVED — SHIPPED.** The derivation lands on modules that exist and
  run today, behind a named wall.
- **DERIVED — DECLARATION OWED.** The derivation closes and every
  carrier it needs already ships; what is missing is a *declared value*
  nobody has written yet. No new machinery is implied. This status is
  not a hedge: it means the row costs a declaration, not a design.
- **FINDING.** The derivation does not close in the algebra as it
  stands. Two rows carry this, and each is recorded with its unlock in
  §6.

---

## 3. The table

| Harness need | Generator composition | Plane | Carrier | Refusal surface | Status |
| --- | --- | --- | --- | --- | --- |
| Logging | `emit` | positioned (lanes) | `planes/Lane` over a per-partition stream | attribution is a branded sort, not a refusal — see §4.1 | DERIVED — SHIPPED |
| Memory | `declare` · `resolve` + `emit` · `fold` at an anchor | truth (content) + positioned | `planes/Catalog` · `planes/Blob` · `planes/Lane` | `forward-reference` (taught, door-relative); `cataloged-value-absent`; `unverified-read` | DERIVED — SHIPPED, durability partial |
| Search / index | `declare` an `index` + `fold` maintained by a consumer | positioned → derived state | `planes/Fold` (`Folds.deploy`) + `planes/Anchor` | rung⇒carrier violations, as **compile errors** | DERIVED — DECLARATION OWED |
| Dependencies / config | `declare` provision facts; greatest-position read | directory | `planes/Environment` (process-local) | `ambiguous-binding` at a tie | DERIVED — SHIPPED, process-local |
| Locks / coordination | `decide` under a fencing token | fence | `planes/Register` over revision-CAS | `unfenced-decide` (taught); `stale-register-token`; `incarnation-mismatch` | DERIVED — SHIPPED |
| Cache | digest-keyed memo over the one verified read | truth (content) | `ResolveCache` in `planes/Resolved` | none — a memo inherits `resolve`'s own refusals | DERIVED — SHIPPED |
| Replication / durability | `emit`/`join` placement facts; ≥k as a declared reduction | placement (a fact plane) | `planes/Lane` + `planes/Cell` + `planes/Fold` | `absence-claim` (taught) | DERIVED — DECLARATION OWED |
| Compaction | horizon as a min-fold over anchor floors; the drop as a fenced `decide` | positioned + fence | `planes/Anchor` + `planes/Register` | `past-mutation` (taught) | **FINDING — see §6.2** |
| Verification | `admit` on every write path | kernel | `kernel/KernelDoor` + `carriage/Engine` | the whole refusal plane — sixteen taught rows plus the structural union | DERIVED — SHIPPED |
| Escalation | hole stage rising to `sealed`; `decide` at the fence | kernel (stage ladder) + fence | `kernel/KernelTables.generated` ranks + `planes/Register` | `unfenced-decide`; `off-writ-referent` | DERIVED — DECLARATION OWED |

The reaction row — the runtime half of `trigger` — is not in this table
because it does not derive. It is **FINDING OPS-1**, §6.1.

---

## 4. Row by row

### 4.1 Logging

**Ground.** `planes/Lane.ts` declares an evidence lane as
content-addressed data: a branded `LaneHandle`, an event schema digest,
a partition count, and a closed `PartitionKey` grammar. Its emit options
carry `holder: Holder` as a *required, branded* field.
`internal/lanes.ts` is the adapter that creates one stream per declared
`(lane, partition)` pair, so a stream's sequence number **is** the
fabric position by construction. `carriage/Engine.ts` routes `emit` to
lanes only after the sentence has been through the door.

**Derivation.** The journal *is* the log. There is no second telemetry
plane, because a level is a kind and a kind is already vocabulary: the
wire grammar's four monotone observation kinds are `emit`, `attest`,
`checkpoint`, `sealed` (`kernel/Wire.ts`). Anything semantic must be
emitted as a fact or it does not exist; host-internal debug exhaust is
carrier plane and no fold may read it.

**Refusal surface — the tree disagrees with the table, and the tree is
stronger.** The consult's table names *unattributed emit* as this row's
refusal. No such refusal kind exists in the tree, and none should:
attribution is a **branded sort demanded at the type level**, so an
unattributed emit is not refused at runtime, it *cannot be spelled*.
`negative-controls/Sorts.bare-string.mutant.ts` is where that claim is
spent — seven sorts, each offered as a bare string at a real public call
site beside its lawful twin, the whole family required to fail to
typecheck against a committed compiler trace by `check:sorts-control`.
An unrepresentable shape is a better fence than a refused one.

**Tier.** Judgment at T0, the append at T2. The licensing law is
idempotent join: retries are free, so at-least-once delivery costs
correctness nothing.

### 4.2 Memory

**Ground.** Three modules, and the split between them is deliberate.
`planes/Catalog.ts` carries `Catalog` (the content-addressed value
store) and `Payloads` (a catalog-internal, get-only, deliberately
*unverified* seam). `planes/Resolved.ts` is the one verify-on-read door
above both: decode re-derives the digest of whatever was fetched and
refuses on mismatch, and the module states plainly that its two legs
re-derive over different material — the payload leg over bytes, the
catalog leg over a value's canonical bytes. `planes/Blob.ts` is the
public byte store with a filesystem backend (`Blobs.layerFileSystem`)
whose verification is inside the service. Long-term recall is
`planes/Lane` plus a fold read at an anchor.

**Derivation.** Working memory is a session's position plus its anchored
reads (`planes/Session.ts`); long-term memory is `resolve` on a digest
that never invalidates. That is the row's whole content: because a
digest names one value forever, the classical cache-invalidation problem
does not arise on this plane at all. Distillation — folding a long lane
into a shorter summary — is an ordinary declared reduction; nothing
about it is new machinery.

**Bounds, stated in the modules themselves.** Neither `Catalog.layer`
nor `Payloads.layer` ships a durable backend today: the catalog layer is
process-local and the payload layer answers every lookup with absence,
because a layer that trusted store-side digests would be a
verify-on-read hole. **The durable catalog layer is in flight in another
seat as this is written**; this row is derived against the tree as it
stands now, and nothing here claims durability that has not landed.

**Refusal surface.** `forward-reference` is the taught row — *pins name
already-admitted digests (`c7_pin_well_founded`)* — and it is
door-relative: the engine's context is a replica and a lower bound, so
the repair is to declare the referent first and retry. `unverified-read`
is the machine-applicable row for a store that lied.
`cataloged-value-absent` is the retryable absence, minted at
`planes/Resolved.ts` and passed through untouched by `planes/Address.ts`.

**Tier.** T2 to resolve a name, then T1 forever.

### 4.3 Search / index

**Ground.** `index` is one of the twelve declaration kinds in the closed
universe, at rank 6 (`kernel/KernelTables.generated.ts`). The
maintenance machinery ships whole: `planes/Fold.ts` declares a reduction
whose step factors through its algebra by construction, `Folds.deploy`
runs it, `planes/Anchor.ts` carries the checkpoint fact, and
`internal/pump.ts` applies arrivals only at the contiguous frontier.
What does **not** ship is any declared index and any index carrier.

**Derivation.** A search index is a declared reduction maintained by a
standing consumer, and an index snapshot is an ordinary dot with
placement facts. Incrementality is not an optimization anyone chooses:
it is licensed by associativity, which is a rung the algebra earns from
its own suite.

**Refusal surface — the tree is stronger than the table again.** The
consult names *rung⇒carrier violations*. In the tree those are **compile
errors**, not runtime refusals. `truth/Algebra.ts` holds the rung ladder
as earned, phantom brands, and `planes/Fold.ts` computes a lane's
quotient in a tuple so the conditional does not distribute — a lane
whose partition count is only known as a union reads the multiset
presentation, because a union of bounds is satisfied by its weakest arm.
`check:rung-control` runs four planted spellings, each required to fail
to typecheck against a committed trace *and* to fail with a non-empty
diagnostic, so a missing project cannot read as a refusal. Beside them
runs a *mutation* arm that plants the same spellings against a weakened
rung and requires them to **compile** — which is what stops a rotted
file from reading as a working constraint.
`unearned-commutative-algebra` is the
runtime spelling for the one case a type cannot reach: an algebra
presented at a partitioned fold that never earned its brand.

**Status.** DERIVED — DECLARATION OWED. Every carrier this row needs is
running; what is owed is an `index` declaration and the consumer that
deploys it.

### 4.4 Dependencies and configuration

**Ground.** `planes/Environment.ts` ships the provision algebra at its
minimal surface: `ProvisionFact` (a hole, a label, a position),
`greatestAt` (per hole, the value at the greatest position),
`provisionFold` (the order-carrying fold), and `fillFrom`, which hands
the greatest-position valuation to the program builder's own proven
`fill`. The collapse — that the order-carrying fold IS the positioned
greatest-read — is `provision_positioned_correspondence`, proved in
`verify/kernel/Kernel/Proofs.lean`; the module carries the
correspondence into the runtime as executable data plus a suite over
generated cases, and re-proves nothing.

**Derivation.** A dependency-injection container is a directory: names
bound to values, newest binding wins. That is the whole reading, and it
is the row that proves the method works — take a harness subsystem, find
its algebra, prove the correspondence, and the carrier falls out.

**Configuration is declared sentences, and the tree now practises it
twice.** `carriage/Engine.ts` has no registration surface beside the
language: a lane, cell, or register becomes usable by *declaring* it,
and the bindings map is a directory replica built by speaking.
`internal/serveroptions.ts` is the second: the substrate's server
options carried as declared data with per-row provenance, rather than as
a switch statement — and the module is explicit that the values are
*transcribed, not ruled*, because a value moved there would be a ruling
taken by a transcription.

**Refusal surface.** `ambiguous-binding`: two facts at one position for
one hole with different values have no arbitration in a read, and the
module says why — arbitration is the fenced register's, never a read's.

**Bounds.** Environments are process-local; multi-writer authoritative
rebinding is deliberately absent and waits on the fenced directory.

### 4.5 Locks and coordination

**Ground.** `planes/Register.ts` ships five actions — `grant`, `renew`,
`commit`, `expireSteal`, `observe` — over a file-backed KV bucket with
revision-derived tokens. Holder identity is descriptive; only the token
is authority. `hold` runs work under a scope-bound heartbeat, and a
renewal that loses its fence interrupts the holder fiber.
`internal/incarnations.ts` is the round-key pattern built on top: the
fence key is the digest of the *round* — the store directory together
with the incarnation being succeeded — so at most one incarnation lands
per round, which is at most one current incarnation per store
directory. A landed outcome never changes, which is right for one round
and wrong for a lifetime; keying by round is what makes succession
sayable.

**Derivation.** Exclusive choice is the one non-free act in the algebra,
and it is quarantined at exactly one generator. Everything monotone
skips coordination entirely — that is the demotion theorem, not a
policy.

**Refusal surface.** `unfenced-decide` is the taught row — *only a
fenced token commits (`at_most_one_landed_commit`)*, that invariant
living in the register package at `verify/fabric-veil/`. Beside it:
`stale-register-token`, `concurrent-register-update`,
`outcome-already-landed`, and `incarnation-mismatch`, the last of which
is why a fence over a destroyed and reborn bucket refuses instead of
landing.

**Tier.** T4 — the one mandatory wait, priced by contention.

### 4.6 Cache

**Ground.** `ResolveCache` lives in `planes/Resolved.ts`, beside
`resolve`, and the module states why it lives there rather than in a
module of its own: a memo whose entire correctness is inherited from
`resolve` belongs beside `resolve`. `planes/Address.ts` ships no cache
at all — a caller who wants the memo provides it, and changes nothing
that module can observe.

**Derivation.** Content addressing licenses memoization forever. A
digest-keyed entry has no expiry, because the key names the value and
the value cannot change. Invalidation is not solved here; it is
*absent*, and the only mutable plane — names — reports change as a new
greatest position, which is a pushed fact rather than a guess.

**Refusal surface — none, and that is the point.** A memo over one
verified seam inherits `resolve`'s refusals whole and mints none of its
own. The single mechanism that keeps the memo honest is the one under
it: re-derivation on read, with `unverified-read` as the
machine-applicable repair when bytes and digest disagree.

**Tier.** T1 on a hit.

### 4.7 Replication and durability

**Ground.** Placement is not a module in the tree. What ships is
everything placement facts would need: `planes/Lane` to carry them,
`planes/Cell` to merge them by union under the join the fabric model's
F1 family is stated over, `planes/Fold` plus `truth/Algebra` to count
them at a rung, and `planes/Blob` with a filesystem backend as one
carrier among the several a placement fact could name. `Blob.ts` states
the licensing law in its own header: content addressing makes every
backend's correctness *locally checkable*, so no backend is ever trusted
about content and backend choice is availability and cost, never
meaning.

**Derivation.** "Where the bytes sleep" is a separate monotone fact
plane keyed by the digest. Placement observations join like evidence;
reads treat placement as an anchored hint; ≥k-replication is a *measured
fold* over those facts, not a promise the storage layer makes. One
equality, many carriers: the algebra never sees placement, it sees
digests.

**Refusal surface.** `absence-claim` is the taught row — *a local view is
a lattice lower bound (`cell_absorb_inflationary`)* — with the repair
"claim at-least from a replica, never not-present-anywhere". That is
precisely the discipline a replication count needs: a replica may say
"at least three carriers hold this", and may never say "no carrier
does".

**Status.** DERIVED — DECLARATION OWED. Nothing new is required; a
placement lane and its declared reduction are unwritten.

**Bound.** The two-plane placement reading is a *pinned* row on the
kernel-model sheet, carried by the storage record. I did not find an
operator ratification line for it in this tree — see §9.

### 4.8 Compaction

**Ground.** The corollary
`compact_below_floor_preserves_resumption` is proved in
`verify/fabric/Fabric/Proofs.lean` and is already cited *by name* on a
served surface: the taught refusal `past-mutation` carries the law
string "journals are append-only; anchored resumption survives
compaction (`compact_below_floor_preserves_resumption`)" in both
`kernel/KernelTables.generated.ts` and `kernel/KernelSdk.generated.ts`.
`planes/Anchor.ts` carries the `floor` the horizon is a fold over, and
declares its own retained-revision depth with the honest sentence "no
age or byte-size eviction policy applies". `internal/carriers.ts`
already refuses one retention hazard outright: `expiringAuthorityCarrier`
refuses a carrier configured to expire its own facts, on the argument
that per-message expiry lets the server delete a fact a decision cited,
which un-decides that decision after the fact — and the repair is a
different carrier, never a different retention number.

**Derivation.** Compaction is a *view change, not a data change*: a
distillation fold emits a summary with a lineage pin, and the read root
is rebound at a fence. Nothing is deleted by the act itself.

**Why this row is a FINDING anyway.** The half above derives and is
partly shipped. The half the consult listed as an honest bound —
*retention*, what carriers drop and when — does not close, and it is
where the real pressure arrives. See §6.2.

### 4.9 Verification

**Ground.** `kernel/KernelDoor.ts` is the one admission door and it
ships: candidate, context, and act types are projections of the model's
emitted schemas, and every refusal is the generated table row for its
reason. `carriage/Engine.ts` makes judgment *precede carriage* on every
write path — declare to the catalog, emit to lanes, join to cells,
decide to registers, resolve through the one verify-on-read seam — and
routes through that exact imported `admit`, never a wrapper.
`kernel/KernelIdentity.ts` is the one guarded seam reading a runtime
content address as a model identity label, and it judges nothing.

**Derivation.** Runtime verification is not a subsystem beside the
system. It is the door, always on, and its cost splits the way the
checks do: intrinsic checks need no world knowledge and price at T0;
door-relative checks cost one directory read and price at T2.

**Refusal surface — the whole refusal plane, and it is closed at both
ends.** Sixteen taught reasons ride the kernel table with law, repair,
and applicability; the structural union is generated into
`truth/RefusalKinds.generated.ts` and carries each kind's standing
meaning as a doc comment. The walls are named and executed:
`check:kernel-door` sweeps for a second door with an executed control;
`check:refusal-vocabulary` reads the union out of three artifacts no two
of which are views of one value; `check:matcher-control` requires an
arm-short fold to fail to typecheck against a committed trace, so
growing the vocabulary is a compile error for every caller rather than a
convention; `check:public-effects` refuses any public Effect whose error
channel is not a `Refusal`.

**Honest bound, carried from the ledger.** The program-run composition
the carriage walks is proved **model-side only** — the `run_composition`
family in `verify/kernel/` — and no correspondence gate ties it to the
carriage. None is claimed here either. Conformance is not verification.

### 4.10 Escalation

**Ground.** The escalation ladder is already vocabulary, and it is
generated. `kernel/KernelTables.generated.ts` carries five hole stages
in rising rank order — `opened` (0), `filled` (1), `disputed` (2),
`decided` (3), `sealed` (4) — with the rank table beside them. `sealed`
is also one of the four monotone envelope kinds in `kernel/Wire.ts`.
The fence the top of the ladder needs is `planes/Register`, shipped.

**Derivation.** Escalation is a hole's stage rising, and the ladder is
monotone by rank: a hole that reached `disputed` never un-disputes, and
`sealed` is terminal. The rungs below `decided` are free — they are
lattice joins, so agreement accretes without coordination — and only the
step into `decided` costs a fence. That is why the estate can afford to
let disagreement be recorded rather than resolved: recording is
monotone, and only closing is expensive.

The tier the consult's ladder added and no classical chart has — the
human plane, where a grill or a ratification happens — is the honest
placement for the top of this ladder. The design exists to keep that
rung rare.

**Refusal surface.** `unfenced-decide` guards the step into `decided`.
`off-writ-referent` guards the other half — *a declaration's identifiers
lie inside the universe its writ pins* — so an escalation cannot reach
past the authority it was granted.

**Status.** DERIVED — DECLARATION OWED. The stages, ranks, fence, and
refusals all ship; what is owed is a declared escalation policy that
names which stage transitions demand which authority. Nothing about that
is new machinery — it is a `policy` declaration, which is rank 2 of the
closed kind universe.

---

## 5. The remaining rows of the derivation table

Seven rows sit in the consult's derivation table and not in its ladder
of needs. They derive the same way and are recorded here so the
projection is total across both tables.

| Row | Derivation | Module in the tree | Status |
| --- | --- | --- | --- |
| Persistence / filesystem | iterated `resolve` from an explicit root + placement facts + verify-on-read | `planes/Address.ts` (paths as iterated resolve, root always explicit) over `planes/Resolved.ts` | DERIVED — SHIPPED |
| Git-like versioning | native: content-addressed DAG + fenced rebinding of names | `truth/Digest.ts` + `planes/Register.ts`; the model's sealed-at verdict is deliberately **not** in `Address.ts` | DERIVED — partial, and the module says which half is absent |
| Code execution | `spawn` under a writ; the sandbox spec is a root plus a token | the generator ships; `carriage/Engine.ts` lands nothing for it by ruling | FINDING-adjacent — see §6.1 |
| Sandboxing | writ narrowing — authority meets downward | `internal/writs.ts` declares; `internal/permissions.ts` projects to broker grants | DERIVED — DECLARATION, NOT GUARD (below) |
| Web/MCP ingestion | external reads enter as attributed claims, untrusted until verified | `surface/mcp.ts` routes every call through the engine's door | DERIVED — SHIPPED |
| Skills / tools | a tool is a declared, digested thing with a schema; the surface is the model's own emission | `surface/mcp.ts` serving `fixtures/tools.schema.json` verbatim | DERIVED — SHIPPED |
| Planning / loops | a plan is a program declaration with holes; planning is provision; completion is a read | `kernel/KernelProgram.ts` + `Engine.run` + `planes/Environment.ts` | plans DERIVED; **loops are FINDING OPS-1** |

Two of these need their bound stated rather than glossed.

**Sandboxing is a declaration, not a guard, and the module says so
first.** `internal/writs.ts` is explicit: nothing in it enforces
anything. Enforcement at the substrate is the substrate's — the broker
ACLs that `internal/permissions.ts` derives are what actually refuses a
publish, and they are provisioned by whoever owns the credentials. A
writ that disagreed with those grants would be a *wrong declaration* and
would change no runtime behaviour. That posture is deliberate and is the
one to prefer, because the alternative changes what the estate may do by
editing a table. The read-plane writ in `planes/Session.ts` takes the
identical stance: the holder it names is attribution, never authority.
The consult's *writ escalation* refusal has no spelling in the tree; the
attenuation law is proved model-side (the F9 family, with the
`attenuation-request-clamped` and `delegation-tree-attenuation` vectors
in the fabric corpus) and has no runtime consumer.

**The tools row is the strongest served-equals-derived evidence in the
tree.** The eight tools are not written in `surface/mcp.ts`. They are
read from a committed copy of the model's own emission and served
verbatim — names, descriptions, and input schemas reach the wire as the
artifact's own values — with `check:kernel-tools` byte-comparing the two
homes and an executed mutation control beside it. The one hand-carried
piece is the wire-name-to-candidate-slot mapping, which wears an
explicit waiver in the module header naming the emitter growth that
retires it. The consult's *schema mismatch* refusal is, in the tree, the
structural refusal at the one parse boundary (`non-canonical-value`,
`malformed-value`) — the seam vocabulary, kept deliberately distinct on
the wire from the door's taught rows.

---

## 6. The two findings

### 6.1 FINDING OPS-1 — reaction: the trigger's runtime half does not exist

**The finding.** `trigger` is one of the eight generators and it admits.
Nothing fires. The model interprets a trigger as world-identity — an
admitted trigger changes no state — and the runtime carries that
interpretation faithfully: `carriage/Engine.ts` states in its header
that an admitted trigger or spawn *lands nothing*, entering no landing a
later node could consume, and `surface/mcp.ts` states that
`kernel_trigger` answers with the verdict alone. So a caller may say a
trigger, have it judged lawful, and observe no consequence. The
consult's "loops = triggers on evidence-appears" row therefore does not
close: the loop has a mouth and no muscle.

This is not a defect in either the model or the runtime. It is a missing
piece, and the pieces around it have all landed.

**The unlock, stated as the two things that are missing.** A hint fold,
and a standing consumer.

1. **The hint fold.** Fold the five monotone fact families the trigger
   grammar reads into the *enabled set*. The grammar is closed at
   exactly five productions and each one names its family:
   `evidenceAppears` (evidence on a lane), `cellReaches` (a cell's
   state), `holeReaches` (a hole's stage), `outcomeLanded` (a
   register's landing), `headAdvancedPast` (a lane head's position).
   Every production reads its component *upward*, which is why
   stability under growth is a property of the grammar's shape rather
   than of a check. The model half is proved:
   `f10_hints_of_support` and `enabled_declarations_monotone` are both
   in `verify/fabric/Fabric/Proofs.lean`.
2. **The standing consumer.** Re-enter the enabled declarations as
   candidates through `Engine.run`. That is the whole reaction loop:
   triggers are standing reads whose results re-enter as candidates,
   and the re-entry point now exists.

**Why the unlock is available now and was not before.** Five things
landed that this finding depends on, each verified in the tree this
session:

- `carriage/Engine.ts` — the re-entry point. `Engine.run` executes a
  closed program declaration one node at a time through the one door,
  stopping at the first taught refusal.
- `Session.changes` in `planes/Session.ts` — the stream face, an unfold
  of `read` where every element is an anchored image.
- The corpus run group and the composed walk — the execution half is
  walled model-side (the `run_composition` family in `verify/kernel/`),
  with the ledger stating plainly that no correspondence gate ties it
  to the carriage.
- `internal/statuspump.ts` — the standing fact-consumer precedent, and
  a well-argued one: one consumer per connection, attached where the
  connection is established, with the module recording what a second
  consumer would actually do (double the facts, not steal them) as a
  measured fact rather than an assumption.
- The daemon spec — the host the unfolds would live in.

**Its waiting wall.** The two F10 vectors already in the fabric
conformance corpus: `trigger-stability-under-growth` (all five
productions firing under growth) and `hints-across-arrival-orders`.
They were generated by executing the model and they are sitting in
`fixtures/fabric-conformance.ndjson` today with no runtime consumer.

**The fence holds by construction, and this is the part worth being
precise about.** Two properties make an unbuilt reaction runtime safe to
build later rather than dangerous to leave open:

- **Acting on silence stays refused at the door.** The lawful trigger
  grammar has five productions and none of them can express absence.
  The candidate grammar deliberately widens to carry the four shapes it
  must refuse — `onAbsence`, `negation`, `deadline`, `absentEverywhere`
  — precisely so the door can *teach* them rather than the projection
  preventing them in silence. The taught row is `absence-trigger`: *the
  trigger grammar is closed at five monotone productions
  (`f10_stability`)*, with the repair "route acting-on-silence through
  the deadline seat: a fenced decide fed by tick facts". The estate
  already practises that repair — `internal/presence.ts` reports silence
  as a number and decides nothing, and its four planted controls are
  traced under `negative-controls/Presence.*`.
- **The enabled set is monotone**, so at-least-once firing is safe. A
  reaction host may fire a trigger twice and the second firing is
  absorbed, which means the missing runtime never needs exactly-once
  delivery — the vocabulary the estate refuses.

**Bound.** Nothing above claims liveness. The model's F10 family claims
stability and hint-support determinism only; eventual evaluation of
enabled triggers carries no claim, in the model or here.

### 6.2 FINDING OPS-2 — retention: what carriers drop, and when

**The finding.** The compaction *act* derives (§4.8). What does not
derive is retention: which carrier drops which bytes at what moment.
The consult listed it as an honest bound and it still is one. The tree
carries retention only as scattered, honest constants —
`ANCHOR_HISTORY` and `REGISTER_HISTORY` both 64, each declared beside
the sentence that there is no age or byte-size eviction policy — and one
refusal, `expiringAuthorityCarrier`, which refuses a carrier configured
to expire its own facts. There is no `Retention` module, no horizon
read, and no drop act.

**The unlock, in three parts, each already licensed.**

1. **The proof is in hand and the ledger already says where it goes.**
   `compact_below_floor_preserves_resumption` is proved in
   `verify/fabric/Fabric/Proofs.lean`, and the verification ledger's
   fabric row carries an explicit instruction: the corollary is stated
   boundary-inclusive (`upTo ≤ floor`), so the ruled
   strictly-below-the-horizon refusal boundary is licensed with margin,
   and **`Retention.horizon` plus the compaction-past-horizon refusal
   cite `compact_below_floor_preserves_resumption` by name when the
   retention slice lands.** That is not a suggestion this record is
   making; it is a standing instruction in the ledger, read there
   first-hand. The corollary is *already* cited by name on a served
   surface — the `past-mutation` taught row — so the citation pattern
   is established, not novel.
2. **The horizon is a fold, and its rung is already available.** The
   horizon is the minimum floor across the anchor facts of every
   declared consumer reading the lane. Minimum is commutative,
   associative, and idempotent — a bounded-semilattice reduction — so it
   sits at the deepest quotient and may read the set plane, with
   redelivery and reordering free. `planes/Anchor.ts` carries the
   `floor`; `truth/Algebra.ts` carries the rung machinery that would
   earn the brand from a suite; `planes/Fold.ts` carries the declared
   reduction. Nothing about the horizon needs inventing. It is a
   declaration.
3. **The drop act is fenceable, and the fence machinery ships.**
   Dropping the sole carrier of a live digest is exactly a fenced
   `decide`: it is the one act that cannot be made idempotent, because
   the second attempt has different truth in front of it. The round-key
   register pattern in `internal/incarnations.ts` is the shape — key the
   fence by the digest of the round rather than by the resource, so
   succession stays sayable — and `planes/Register.ts` is the
   machinery. "Sole carrier" itself is a *measured fold over placement
   facts*, which is the replication row (§4.7) read from the other
   side: the same fold that answers "at least k carriers hold this"
   answers "exactly one does".

**Where the pressure will first arrive.** The durable catalog is in
flight in another seat as this is written. It is the first store in the
estate with real retention pressure — today's catalog layer is
process-local and today's payload layer answers every lookup with
absence, so nothing yet accumulates bytes it must eventually shed.

**What genuinely stays outside the algebra, and what its lawful home
is.** The *economics* — when to compact, how much to keep, what a
retained byte is worth — is not derivable and this record does not
pretend otherwise. But even the economics has a lawful home: a declared
retention-policy value, `policy` being rank 2 of the closed declaration
universe. Configuration is declared sentences, and the tree already
practises exactly this shape twice (§4.4): the engine's bindings are
built by declaring, and `internal/serveroptions.ts` carries the
substrate's options as declared data with per-row provenance and an
explicit refusal to let a transcription take a ruling. A retention
policy declared the same way is a value that diffs, resolves, and
refuses — not an operator's memory.

**Bound.** The horizon fold and the fenced drop are *derivations*, not
code, and no correspondence between them and the corollary is claimed
here. The ledger's instruction is what binds the citation when the slice
lands.

---

## 7. Where the consult's table and the tree disagree

The tree wins in every row below. Recorded rather than absorbed.

| # | The table said | The tree says | Reading |
| --- | --- | --- | --- |
| D-1 | Logging's refusal is *unattributed emit* | No such refusal kind exists. Attribution is a branded sort demanded at the type level, walled by `check:sorts-control` over seven sorts | The tree is **stronger**: unrepresentable beats refused |
| D-2 | Search's refusal is *rung⇒carrier violations* | Those are compile errors, walled by `check:rung-control` with four traces and a mutation arm; only the unearned-brand case refuses at runtime | The tree is **stronger** for the same reason |
| D-3 | Compaction's refusal is *seal without writ* | No such spelling exists. The nearest shipped fences are `off-writ-referent` (taught) and `expiringAuthorityCarrier` (structural) | The table named a refusal that was never minted |
| D-4 | Sandboxing's refusal is *writ escalation* | No such spelling. Writs declare and do not guard; enforcement is the broker's ACLs derived from `internal/permissions.ts` | The table over-claimed enforcement the estate deliberately does not do |
| D-5 | Ingestion's refusal is *unverified promotion*; tools' is *schema mismatch* | Neither is a minted kind. Both land as structural refusals at the one parse boundary — `non-canonical-value`, `malformed-value` — deliberately kept distinct on the wire from the door's taught rows | Naming drift, not a gap |
| D-6 | The refusal is spelled `unverifiedRead` | The wire spelling is `unverified-read`, in the model's own order | Spelling; the table's camel form appears nowhere |
| D-7 | Persistence/versioning carriers are named as vendor products (JetStream, KV, Object Store, R2) | The tree names *planes and modules*; the vendor is an interface slot. `Blob.ts`: capabilities, never vendors, and the object-store backend has no build | The table read one deployment as the layering |
| D-8 | "Planning/loops" is one row | The tree splits it cleanly: plans derive and execute; loops do not fire at all | One row was hiding a finding — now OPS-1 |
| D-9 | The engine's carrier column implies one broker throughout | `planes/Environment.ts` is process-local by ruling, and neither service in `planes/Catalog.ts` — the catalog nor the payload seam — ships a durable layer | The table described the intended carrier, not the shipped one |

---

## 8. What this projection does not do

It does not add a row to the verification ledger, because it verifies
nothing new. It does not mint vocabulary: every term it uses is either
glossed in §0 or read out of a generated table. It does not rule on the
two findings — each is recorded with its unlock so the ruling has
material, and neither unlock is started here. And it is not a build
plan: a status of DECLARATION OWED says a row costs a declaration, not
that anyone has been asked to write one.

---

## 9. What I could not verify

Stated plainly, because a projection that hides its gaps is the thing it
exists to refuse.

1. **The placement plane's ratification.** The two-plane placement
   reading is a **pinned** row on the kernel-model sheet, and the
   storage record carries it as pinned while itself standing as
   pre-grill. I searched this tree and found no separate operator
   ratification line for it. §4.7 and §6.2 lean on placement as a
   *reading*, and neither claims it as ratified.
2. **No estate battery was run, and here is what was run instead.**
   This change touches no code — the diff is one new file under
   `docs/design/` — and this worktree has no installed dependencies, so
   no package or root battery was executed. Nothing in this record is
   sized to a run I did not make. What I did run, bare, in this
   worktree:
   - a mechanical existence check over every filesystem path this
     document cites, resolved against the worktree root, the package
     root, and the plane root §1 establishes — `checked=45 missing=0`,
     `PATH CHECK: PASS`, exit 0;
   - a mechanical existence check over every gate name, exported
     symbol, theorem name, and corpus vector name this document cites,
     each required at the file the document names it in —
     `checked=41 fail=0`, `SYMBOL CHECK: PASS`, exit 0;
   - a self-test of the first checker, because a checker that cannot
     fail checks nothing: two bogus paths planted into a copy of this
     document drove it to `checked=47 missing=2`, `PATH CHECK: FAIL`,
     exit 1, reddening on both planted spellings by name.

   Those three scripts are session scratch, not tree artifacts. They
   check citation existence and nothing else: a path that exists but
   says something other than what this record claims it says would pass
   all three, which is what item 3 is about.
3. **Theorem names verified by presence, not by reading proofs.** I
   confirmed `compact_below_floor_preserves_resumption`,
   `f10_stability`, `f10_hints_of_support`,
   `enabled_declarations_monotone`, and `c7_pin_well_founded` in
   `verify/fabric/Fabric/Proofs.lean`; `f11_topk_of_support`,
   `f11_query_deterministic`, `f1_cell_merge_aci`, and
   `f1_cell_extensional` in the same file;
   `provision_positioned_correspondence`, `run_composition`, and
   `admit_monotone` in `verify/kernel/Kernel/Proofs.lean`; and
   `at_most_one_landed_commit` in `verify/fabric-veil/`. I did not read
   the proofs, and I did not run a Lean gate.
4. **The durable catalog in flight.** I read its ticket row in a design
   record and the current process-local state in the tree. I did not
   read the in-flight branch, and nothing here describes it as landed.
5. **Tier assignments are ordering claims.** No measurement of any kind
   appears in this record.

---

## 10. Honest bounds

1. **This is a projection, not a proof.** Every derivation is a reading
   of shipped modules against a proved model. No runtime theorem is
   claimed, and the model-to-carriage correspondence for the program
   run remains explicitly unclaimed in the ledger.
2. **Seventeen rows are derived here — ten in §3 and seven in §5 — and
   two of them do not close.** Both findings are recorded with their
   unlocks rather than softened. Neither is repaired: the red stays red
   as evidence until a disposition is ruled.
3. **DECLARATION OWED is a real status, not a soft pass.** Three rows
   in §3 carry it — search, replication, escalation — and each names
   what is unwritten.
4. **The refusal surfaces are as the tree spells them.** Where the
   consult named a refusal that was never minted, §7 says so rather
   than inventing one.
5. **Durability, federation, and liveness are claimed nowhere.** The
   catalog and payload layers say so in their own headers; presence
   reports silence as a number and decides nothing; the F10 family
   claims stability, never eventual firing.
