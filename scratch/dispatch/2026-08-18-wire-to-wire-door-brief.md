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
    THE ONE SEAM — Admission, an Effect service over that generated door
      │  wall: T7 public-surface walk; complete taught-refusal parity
      ▼
    the mapping — kernel/Candidates.ts says what each host operation means
      in the generated candidate language, and holds the ONE runtime-digest
      to model-identity map (kernelIdentity), documented as the trusted
      base's rather than a theorem
      │  wall: the constructors are the only spelling of a candidate outside
      │  the generated family; carriage and surface call them and never
      │  convert
      ▼
    the hosts — cli, FabricClient (live and test construction), CasDaemon
      route through the exact same Admission.admit function object, AND every
      operation with an outside is judged through it before the transport,
      store, or harness is reached; no host imports or constructs Door
      │  walls: host reference identity; a testLayer that takes a transport
      │  rather than a service; refuse-everything service replacement driven
      │  through publish / the four daemon operations / the chaos run, each
      │  counting calls into the byte-moving half and requiring zero;
      │  KernelDoor.routes.test.ts and the ChaosCli six-field control

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

## Resolution in PR #131

PR #131 consumes `KernelCandidateAct`, `KernelAct`, and the door context
directly from `KernelSchemas.generated.ts`, preserving their bigint carrier.
It ships one door over that language, wraps it in the `Admission` Effect
service, and makes every host carry the exact service accessor.

### What round 2 of this record got wrong

An earlier version of this section claimed the seam "speaks the corpus
candidate form as-is" and that "no digest-to-model identity conversion" was
introduced. The first claim was true of the types and false of the traffic:
the hosts exported the accessor and kept publishing, storing, and running
without calling it, so the no-bypass control stayed green over an empty seam
(DEV-803 round-2 verdict). The second claim was true only because nothing was
routed — a runtime whose identities are content addresses cannot judge a
single real operation without a map, so forbidding the map forbade the
feature.

Round 3 routes the real operations and states the map instead of denying it:
`Candidates.kernelIdentity` is the one seam, `BigInt("0x" + hex)`, injective
on lowercase digests, believed because base-16 reads the same bytes and not
because anything was proved. What each mapping declines to carry — an
envelope's kindless `pins`, most obviously — is stated at the constructor
rather than left to be inferred from what is missing.
