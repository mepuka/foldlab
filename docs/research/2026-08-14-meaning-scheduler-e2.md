# The meaning-scheduler experiment (E2): first study-lane record

2026-08-14, post-retirement study lane. Prototype code is scratch-local
(scratch/meaning-scheduler/, untracked by convention); this document is
the durable record: pre-registration first, then results, verbatim.

---

# E2: the meaning-scheduler — pre-registration

2026-08-14, from the post-retirement vision grill (rulings recorded in
memory and docs/research/2026-08-14-branch-retirement.md). Status:
throwaway prototype in scratch/. No daemon, no catalog integration, no
new packages. Its output is the Q-BRIDGE section of the study dossier.
Effect pinned at 4.0.0-rc.108; the vendored source at repos/effect is the
same version, so source citations govern our runtime.

## The reinterpretation under test

An Effect program is a static value; the runtime is an interpreter that
picks an order of steps. Nothing requires the steps to mean "things
happening in real time." E2 reinterprets the domain: the effects are
EPISTEMIC MOVES over content-addressed states of understanding, and
fibers are agents holding partial understandings.

Sequential precedent already in the estate: the concierge's
fill/unfill/frontier (laws C1-C5) is a calculus of meaning-moves over
well-formed states, one hole-filler at a time. E2 is its concurrent
generalization.

## The pre-registered primitive: the MOVE

A typed, journaled transition between content-addressed epistemic states
("at head H these entities were understood this way; this move yields
H'"). Moves compose in two dimensions:

- HORIZONTAL (concurrency of holders): moves by different agents merge
  freely where they commute (semilattice join; presence is monotone) and
  must single-home behind a fence where they do not.
- VERTICAL (abstraction): folds/homomorphisms relate levels, so a move
  at the protocol level constrains legal moves at the record level.

Time is derived: one linearization of moves, committed by the journal.

## The mapping under test (fiber ↔ agent)

| Runtime construct | Meaning reading | Status |
| --- | --- | --- |
| Fiber | An agent holding partial understanding | under test |
| Fork | Explicit agent creation: delegation of a sub-question, child inherits a slice of the parent's understanding | under test |
| Join | Absorption: parent merges what the child concluded | under test |
| Interruption | Refutation propagating (the inference frame's only G-mover) | under test |
| Scheduler | The world's nondeterminism: which agent moves next | under test |
| Fiber-held state (v3 FiberRef; v4 equivalent TBD by source dig) | The agent's held ontology/version-space | pending source facts |
| Context/services | The agent's capability writ: which moves it may make | pending source facts |
| Root fiber | The session: closed world within a run, open at its boundary across runs (federation) | under test |
| Journal | The only place the realized DAG exists; heads = epistemic snapshots | under test |

## Experiment shape

Tiny hand-made ontology: 3-4 customer-order-ish types. Three fibers play
three agents with partial understandings. Each move EXPLICITLY appends a
fact to a CAS journal (journaling is the move's semantics, not a runtime
hook — no runtime surgery in E2). The same program runs under several
distinct schedules (mechanism per the scheduler source dig).

## The three claims (each refutable)

1. **Schedule irrelevance of meaning.** Where moves commute, the final
   committed understanding is identical across all interleavings — same
   STATE DIGEST (the meaning fold), byte for byte. The chain heads MAY
   differ across schedules, and should: the chain commits to the
   linearization, and "time is demoted to a derived notion" predicts
   exactly this split. (Amended 2026-08-14 before first run: the
   original text said "same head", conflating the two folds the
   estate's own glossary separates — the chain remembers what the fold
   forgives.)
   REFUTED IF: any two schedules of commuting-only moves produce
   different final state digests.
2. **Decisions surface themselves.** Where two agents' moves genuinely
   conflict (incompatible fills of one hole), no interleaving silently
   wins: every schedule forces the conflict to a fence (an explicit
   decision fact in the journal).
   REFUTED IF: any schedule lets one meaning clobber another with no
   decision point in the journal.
3. **Every head is legible.** Any intermediate journal head can be
   folded into "what was understood at this point" — a well-formed
   epistemic snapshot, holes included.
   REFUTED IF: some reachable head has no coherent snapshot (a state
   that is neither a well-formed partial understanding nor a refusal).

A refutation is recorded in the dossier with the same prominence as a
confirmation. If all three hold on the toy, the dossier's final section
must answer: what does this change about the target application?

## Out of scope for E2

Runtime instrumentation (E1: supervisor capture — only if E2 shows
implicit capture is needed); OWL/ontology ingestion; the daemon; NATS;
federation; performance; any new public surface. No new theory: only
correspondences between structures that already exist on both sides,
cited or tested or marked conjecture.

---

# E2 results — first run record, 2026-08-14

Pre-registration: [PREREGISTRATION.md](PREREGISTRATION.md) (claim 1
amended before first run: state digest, not chain head). Harness:
[experiment.ts](experiment.ts) + [journal.ts](journal.ts), driven by
[run.ts](run.ts). Effect 4.0.0-rc.108 via the repo's pinned install;
canonical bytes via the estate's own `@foldlab/core` RFC 8785 encoder.

## Verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| 1 — schedule irrelevance of meaning | **HELD** | 12 schedules → 6 distinct move orderings → 6 distinct chain heads → **1 state digest**. The chain remembered the linearization; the fold forgave it. |
| 2 — decisions surface themselves | **HELD** | Conflicting fills of one hole: every interleaving produced an explicit dispute plus a fence decision; who fills and who disputes swaps with the schedule, but no schedule silently won. |
| 3 — every head is legible | **HELD** | Verify-on-read refolds every prefix of every run; every recorded state digest matches; every snapshot is a well-formed partial understanding. |
| Bonus | observed | Even the conflict scenario converged in state, because candidates are an order-free set and the fence rule is a function of the set — evidence + deterministic decision = convergence. |

Negative controls (the teeth): a clobbering journal (last writer wins)
fails the claim-2 check and loses state convergence across schedules; a
tampered state digest is refused by verify-on-read. Both fire.

## What the source digs settled (fiber ↔ agent mapping, corrected)

Full agent reports are in the session transcript; key facts with the
citations that matter:

1. **v4 removed FiberRef entirely** (migration/fiberref.md; no
   fork/join hooks on `Context.Reference`, Context.ts:335-340). A child
   fiber gets the parent's immutable Context BY SNAPSHOT at fork
   (internal/effect.ts:5228); a join returns ONLY the Exit; child
   context is wiped at completion (internal/effect.ts:626). There is no
   built-in cross-fiber meaning-merge channel. **Consequence: the
   pre-registered bridge hypothesis — "the journal is the bridge" — is
   not just a design choice; in v4 it is the only durable channel.**
   The rival hypothesis (FiberRef join as semilattice merge) is REFUTED
   for our pinned runtime.
2. **Fiber-held state = capability writ, not held meaning.** What a
   fiber carries is its Context: services + references = what it MAY do
   and under what defaults. Held meaning lives in the shared journal.
   Mapping corrected accordingly: Context = writ; journal = memory.
3. **Root fiber = empty context + global defaults** (runFork =
   runForkWith(Context.empty()), internal/effect.ts:5419). No ambient
   world, no global root. Supports the "root = session, not world"
   reading.
4. **Agent creation is explicit and scoped** — every fiber is forked by
   a parent (forkChild/forkDetach/forkIn, one primitive at
   internal/effect.ts:5219), inheriting writ by snapshot; provide the
   forked EFFECT (not the fork) to give a child its own environment.
   Structured concurrency = no orphan agents.
5. **Scheduling is externally drivable**: one shared-queue Scheduler +
   `runFork(program, { scheduler })` + a driver loop = schedule as a
   seed (the technique Effect's own Semaphore/Latch tests use,
   test/Semaphore.test.ts:335-455). Two traps found the hard way, now
   documented in experiment.ts: an unconditional `shouldYield` livelocks
   (the splice defers the current op and the op counter resets per
   resumption), and threshold 2 still starves because op 1 of each
   resumption is consumed popping the yield continuation — threshold 3
   yields exactly one real op per slice.

## What this changes about the target application (pre-registered exit question)

Provisional, for operator ratification: the one-screen demo's step 3
("author a three-node DAG") is replaced by its inversion — publish a
PROTOCOL (a cataloged value), let agents improvise within it, and let
the lineage query recover the DAG as evidence, checked against the
protocol. E2 demonstrates the core loop of that inversion at toy scale:
emergent order, journaled; meaning convergent; conflicts fenced; every
head auditable. The next rung is not more theory — it is the same loop
with (a) real cataloged types instead of a hand-made state, (b) the
daemon's journal instead of an in-memory class, (c) a protocol value
instead of hard-coded intents.

---

# Addendum: E2 part 2 — the consumer, and the stability law it discovered

Same day. Code: scratch/meaning-scheduler/consumer.ts. Question asked by
the operator: how does a SEPARATE program — not Effect, never having met
the agents — use modeled agent state? Answer built: a plain-TS consumer
whose only input is journal entries and whose entire logic is a
predicate over epistemic states ("fulfill when the order's id and
currency are settled"), watching for the predicate's rising edge over
the fold.

**The refutation that became a law.** The naive predicate — trigger when
holes look "filled" — fired on THREE different meaning-points across the
12 schedules. Cause: "filled" is not a stable property; a fill can later
be disputed, so transient prefixes legitimately differ per
linearization, and a hook on an unstable predicate inherits the
schedule's clock. This is the CALM principle (consistency as logical
monotonicity) surfacing in the toy unprompted: monotone hooks are
coordination-free; non-monotone hooks must wait for the fence.

**The stability law (new, for the protocol grill):** a consumer may hook
meaning only on properties that cannot un-happen. Which properties those
are is PROTOCOL knowledge, not consumer guesswork: a fence decision is
stable forever; a fill is stable iff the protocol grants the hole a
single seat (no second seat exists to contest it); everything else is
transient. The protocol value therefore owes each hole a declared
stability tier — this joins holes/seats/fence-rule as the fourth thing a
protocol declares.

**Result with the corrected predicate:** one meaning-point across all 12
schedules (and one clock position, since the fence is the last mover) —
the consumer inherited schedule independence without knowing schedules
exist. The naive predicate is retained in consumer.ts as the negative
control; run order: `bun run consumer.ts`.

**Consequences recorded for the build:** (1) verify/moves gains a fifth
theorem obligation — stability: decided states are invariant under all
subsequent moves, and single-seat filled states likewise; (2) the
`frontier`/watch tools must expose the stability tier of every reported
state so consumers cannot accidentally hook transients; (3) "agent
state" is now precisely: a HEAD (position in shared meaning) plus a WRIT
(context: capabilities and type digests) — knowledge lives in the
journal, rehydration is a fold, and an agent crash loses nothing.
