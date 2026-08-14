# From toy to substrate: the meaning-scheduler primitives in production

2026-08-14, continuing the post-retirement study lane. Companion to the
E2 record
([2026-08-14-meaning-scheduler-e2.md](../research/2026-08-14-meaning-scheduler-e2.md)).
Status: design analysis with recommendations; every build item herein is
a PROPOSAL pending operator ratification, per the standing pattern.

## 1. The primitives E2 exercised, and their production twins

E2 ran three primitives. None is new to the estate — that is the point:

| E2 toy | Production twin | Status |
| --- | --- | --- |
| CAS journal of moves (canonical bytes, verify-on-read) | `go/journal` — the hash-chained CAS-append verify-on-read journal over JetStream | SHIPPED, conformance-tested |
| The fence (single decision seat, order-free rule) | `go/effector` — the fencing-token lease register, certified against its machine-checked theorem | SHIPPED, certified |
| The meaning fold (journal prefix → epistemic state) | The fold algebra (`packages/core`): declared algebra + declared step ⇒ the state digest has IDENTITY, and (fold digest, head) keys an immutable truth | SHIPPED as machinery |

What does NOT exist yet — the actual gap list a production implementation
owes:

1. **The move grammar as a cataloged type** (working name `flb.move.v0`):
   fill/dispute/decide as typed frames with refusal sorts, implemented
   twice (TS + Go) behind a wall per ADR-0001. E2's `step` function is
   the single-implementation prototype of exactly this.
2. **The epistemic state as a DECLARED fold**, not a hand-rolled class —
   so "what was understood at head H" is a cacheable, catalogable value
   keyed (fold digest, head), inheriting the invalidation-free cache.
3. **The protocol as a value**: the first cataloged object whose
   instances constrain moves (which holes exist, who may fill, what the
   fence rule is). This is the Q4 ruling's authored artifact and it has
   no twin yet anywhere in the estate.

## 2. What the CAS means

The E2 run clarified the CAS's meaning beyond "atomic append":

**The CAS is the purchase of order.** Everything upstream of it is
order-free: evidence federates, presence is monotone, commuting moves
form a semilattice. The CAS append is the single point where one
linearization is committed out of the many the schedule could have
chosen — it is where "time" (a derived notion, per the move primitive)
gets minted. Two tiers, already distinguished by the ownership model:

- **Head-CAS** (the journal): commits a fact's PLACE IN HISTORY. This is
  the minimal decision every fact needs, and the only one most facts
  need.
- **Fence-CAS** (the effector): commits CONTENT two parties could
  legitimately dispute. Strictly rarer; single-homed; token-fenced.

And the R2 model-gate insight generalizes cleanly: presence-monotone
claims never need the CAS (union-convergent, lock-free); the CAS exists
exactly for the anti-monotone — absence, exclusivity, "this and not
that." A CAS conflict is therefore not an error but **contention
surfacing as data**: in E2, the dispute pathway was ENTERED via a CAS
refusal. The lawless control (clobber) is precisely a journal that spends
no CAS on anti-monotone claims — and it diverges by schedule, which is
the whole argument in one control.

## 3. Capabilities unlocked via algebra

Per the standing rule (every proved law becomes a convenience function
with inherited correctness), each E2-held law licenses surface:

| Law (held in E2) | Capability licensed | Surface it becomes |
| --- | --- | --- |
| Schedule irrelevance of meaning | Parallel replay of journal shards; sharding by commutativity class with NO coordination between shards | The stream-processing story: moves are events, an entity = one subject's history (the collector's quotient), folds maintained O(1), compaction licensed by associativity |
| Every head legible | Epistemic time-travel: any head is a query point — "what was understood when?" | Observability: the lineage DAG IS the trace. A span id is already defined as a segment's chain head (CONTEXT.md), so meaning-level spans need no new identity scheme. The Effect LSP's fiber-tree view has a twin: the MEANING-TREE view, a projection over the journal — and per AGENT FIRST, OTel/dashboards are projections of it, never the source |
| Decisions surface themselves | Contention is data, so "where do agents disagree" is a fold, not instrumentation | Dispute dashboards, protocol-friction metrics, fence-load monitoring — all free queries |
| Presence monotone (inherited) | Lock-free ingress, offline creation, federation by union | Already shipped for catalogs; extends unchanged to move traffic |

The compounding effect: because observability here is a FOLD OVER THE
SAME JOURNAL the system runs on, observing never perturbs, never
samples, and never drifts from truth — the observed DAG is the committed
evidence, not a parallel telemetry stream that can lie.

## 4. What a production scheduler looks like

E2 separated three roles that "scheduler" usually conflates:

1. **The live runtime needs no custom scheduler.** In production the
   world schedules: NATS delivery order, fiber interleaving, network
   timing. Schedule irrelevance is precisely the license to NOT control
   this. The journal commits whichever linearization reality chose.
2. **The driven scheduler graduates into the gauntlet.** The
   shared-queue + seeded-pick harness is deterministic simulation
   testing (the FoundationDB/TigerBeetle discipline) for meaning:
   CI runs the same program under N seeds and asserts the
   one-state-digest invariant and the no-silent-clobber invariant.
   E2's harness — including its two documented livelock traps — is the
   seed of this instrument.
3. **The replayer: the recorded schedule.** Drive fibers under the
   linearization the journal recorded, rather than a seeded one. This is
   mechanically what tickets 008/020's replay theorem needs: replay =
   re-interpretation under the committed schedule. The driven scheduler
   is the missing executable half of the already-proved theorem.

Production hardening the toy ignored (each a named residual, none
touched by E2's claims): crash between CAS accept and downstream
notify; retry idempotency across process death (the work-digest
idempotency key from the effect-bridge grill); backpressure when the
fence is contended; unbounded dispute sets.

## 5. Turning it into tools

Agent-first, derived from `contract.describe` like the concierge — no
hand-written tool list to drift:

- `move.submit(head, move)` → committed | refusal (CAS conflict, sort
  split per task-30 discipline)
- `state.at(head)` → the epistemic snapshot (claim 3 as a tool)
- `frontier(head)` → open holes + legal moves (the concierge's writ,
  generalized to many holders)
- `lineage.query(head)` → the emergent DAG as evidence
- `disputes.list(head)` / `fence.decide(dispute)` → the decision seat,
  authority-gated through the effector
- `gauntlet.run(program, seeds)` → the CI instrument, also exposed as a
  tool so an agent can adversarially probe its own protocol before
  publishing it

That last one is the quiet product thesis: an agent that can ASK whether
its protocol converges under all schedules, before shipping it, is doing
what no agent framework offers today.

## 6. Is Lean worth it here?

**Yes — for the calculus. No — for the interpreter.** Recommendation:

- **Model (`verify/moves/`, Lean, verify/ir pattern):** the move step as
  a small labeled transition system over epistemic states. Theorems, in
  order of value: (a) the diamond lemma — disjoint-subject fills
  commute (claim 1's kernel, upgraded from 12 schedules to ALL
  schedules); (b) no-silent-clobber — every maximal trace containing
  conflicting fills passes through disputed∨decided, and no two distinct
  filled terminal states are reachable (claim 2's kernel); (c) step
  preserves well-formedness (claim 3's kernel); (d) fence determinism —
  the decision is a function of the candidate SET, so arrival order
  cannot leak through the fence. All four are small: the state space is
  a finite map of tagged holes; this is a weekend-sized development in
  the estate's discipline (no sorry, negative controls, run.sh gate,
  ledger row).
- **Do not model:** the Effect fiber runtime. It is the interpreter, not
  the claim-bearer — E2 deliberately journals explicitly so that every
  claim rides on the journal, and the v4 source dig confirmed the
  runtime offers no other durable channel anyway. Modeling a vendor's
  scheduler would be proving someone else's code weeks before our first
  protocol value exists — the exact impatience the vision grill retired.
- **Later, TLC:** once the production shape exists, the crash/retry
  residuals of §4 are a verify/pipeline-shaped TLA+ question (liveness
  under failure), not a Lean one. Behind its own gate, when there is a
  consumer.

The consumer making the Lean increment legal now rather than
speculative: the workflow engine (008/020) on emergent choreography
needs a protocol-conformance theorem class, and (a)+(b) are its first
two members. The E2 claims go from "tested at 12 schedules" to "proved
for all schedules at model scale," which is exactly the confidence tier
the operator named as the point of the whole program.

## Proposed next increments (pending ratification, in order)

1. **`verify/moves/`** — the Lean move calculus, theorems (a)-(d), gate
   + ledger row. Small, consumer-named, upgrades E2's claims.
2. **The gauntlet graduation** — E2's harness rebuilt as a reusable
   instrument (recorded + seeded schedules) with its own negative
   controls; the executable half of replay.
3. **The protocol-value grill** — the first cataloged protocol shape
   (holes, seats, fence rule) grilled with the operator before any
   implementation; `flb.move.v0` rides behind it.

Nothing else. The five-layer target application absorbs these as its
next rungs; no new lanes open.
