# Wire to wire: the door chain, and the twin that was reverted

Status: coordination record, 2026-08-18. Operator order: the wire-to-wire
chain lives in scratch and its rule lives in the codegen skill. The
shipping implementation is PR #131 (DEV-763, Eng CX PC, in adversarial
review as DEV-803) — NOT the coordinator's reverted attempt below.

## The chain, link by link, with the wall that holds each

    Lean model — verify/kernel/Kernel/Definitions.lean (Kernel.admit)
      │  wall: verify/kernel/run.sh — 80-theorem roster, 25 executed
      │  controls, axiom footprint pinned, F13 fenced
      ▼
    the emitter — verify/unity/EmitMain.lean executes model definitions
      and reads the sort mini-AST and docstrings from the Lean
      environment; the one hand-committed datum is WHICH types the
      interchange carries
      │  wall: byte-identical regeneration
      ▼
    the corpus — format 2, nine record groups (kinds, stages, refusals,
      types, encodings, admission vectors, docs, canon, programs)
      │  wall: check:corpus + the group/count reconciliation
      ▼
    GENERATED SCHEMAS AND TABLES — packages/plait/src/kernel/
      KernelSchemas.generated.ts (KernelCandidateAct, KernelCandidate-
      Predicate, KernelCandidateAnchor, the intrinsic acts),
      KernelTables.generated.ts (kinds, stages, taught refusals with
      law · repair · applicability)
      │  wall: check:kernel-schemas / check:kernel-tables, regeneration
      ▼
    THE SHIPPED DOOR — KernelDoor.admit(context, candidate) over those
      GENERATED schemas; model identities stay bigint
      │  walls: the 17-vector conformance replay points at the SHIPPING
      │  door (the reference twin removed in the same PR); a no-bypass
      │  mutant; taught refusals carry reason · law · repair ·
      │  applicability
      ▼
    the hosts — cli, FabricClient (live and test construction),
      CasDaemon route through the exact same function object; KernelDoor
      is the eighteenth public namespace
      │  wall: T7 public-surface walk; KernelDoor.routes.test.ts

## The lesson this record exists to carry

On 2026-08-18 the coordinator, ordered to finish the cutover by hand,
promoted the test-side reference door into `src/kernel/Door.ts` and
wrapped it in an `Admission` Effect service — built on the HAND-WRITTEN
type spellings in `KernelDoor.ts` while `KernelSchemas.generated.ts`
already carried the model-generated candidate grammar. That is a law-1
twin: machine-validated (the vectors replayed) but not machine-
generated. It also pushed to main under a seat that had the same
ticket in flight, which is what made the better PR conflict.

Disposition: the coordinator's commit was REVERTED (battery green after
revert, 324/0); PR #131 stands as the shipping chain. Two rules follow.

1. **Before writing a type, grep the generated family for it.** The
   corpus family is the first place to look, not the last.
2. **Never do seat-assigned work coordinator-hand while the seat is in
   flight.** If the work must move faster, reassign or take the ticket
   explicitly — never race it.

## The open question the review should rule on

The reverted attempt carried one thing #131 does not: an Effect service
seam (`Admission`, a Layer over the door) so hosts take the door through
a service rather than importing a function. Estate law 5 (Effect
first-class, services via Layer) argues for it; law 1 argues it must
wrap the GENERATED door, never a hand-written one. Routed to DEV-803's
review as an input, not built as a competing commit.
