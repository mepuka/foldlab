# Wire to wire: the door chain, and the twin that was reverted

Status: coordination record, 2026-08-18, CORRECTED 22:30Z. Operator
order: the wire-to-wire chain lives in scratch and its rule lives in
the codegen skill.

**The chain below is the TARGET, not a description of any current
head.** The first version of this file stated it as accomplished fact,
which was wrong on two counts: PR #131's round 2 had regressed to the
coordinator's reverted hand-written twin (DEV-803 blocker, ancestry
proven by identical blob hash), and this file's confident chain
diagram is one plausible reason a seat restored those files. A brief
that reads as a description of the tree, while actually describing an
intent, is itself a drift surface. Every link below is marked with
whether it holds today.

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
      GENERATED schemas; model identities stay bigint end to end
      │  STATUS: NOT HELD at PR #131's head as of 22:30Z — the head
      │  re-spells the surface by hand (number, null, hand unions).
      │  Achieved once, at that PR's commit 4a08a51, and charged for
      │  round 3.
      │  walls: the 17-vector conformance replay points at the SHIPPING
      │  door (the reference twin removed in the same PR); a no-bypass
      │  mutant; taught refusals carry reason · law · repair ·
      │  applicability
      ▼
    the hosts — cli, FabricClient (live and test construction),
      CasDaemon route through the exact same function object; KernelDoor
      is the eighteenth public namespace
      │  STATUS: held at #131's head — this half of round 2 is earned.
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
3. **A reverted commit still teaches.** `git revert` leaves the
   original reachable, so a bad artifact remains one `git show` away
   and a downstream run can restore it in good faith. When reverting
   for a LAW violation, say so on the ticket that owns the work, not
   only in the revert message.
4. **Write briefs in the tense they have earned.** State per link
   whether it holds now; a target written as a description is a
   drift surface with a friendly face.

## The bug the twin actually carried

DEV-803's review executed a generated candidate
`{ _tag: "resolveDigest", target: 8n, anchor: undefined }` — the shape
`Schema.UndefinedOr` produces for an absent anchor. The hand-written
door tests `anchor !== null`, so `undefined !== null` refused a LAWFUL
sentence as `anchoredResolve`. The planted corpus spells absence as
`null`, so a full conformance replay passes while the door is wrong on
inputs the generated schema actually produces. That is the strongest
argument for law 1 available: the twin was not merely impure, it was
incorrect in a way its own vectors could not see.

## The open question the review should rule on

The reverted attempt carried one thing #131 does not: an Effect service
seam (`Admission`, a Layer over the door) so hosts take the door through
a service rather than importing a function. Estate law 5 (Effect
first-class, services via Layer) argues for it; law 1 argues it must
wrap the GENERATED door, never a hand-written one. Routed to DEV-803's
review as an input, not built as a competing commit.
