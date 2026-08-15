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
