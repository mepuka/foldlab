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
