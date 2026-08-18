# Wire to wire: the shipped door chain

Status: LANDED 2026-08-18, coordinator-executed on the operator's
direct order. This brief names each link of the chain and the wall
that holds it, so any agent can verify the whole path from the Lean
model to a host's function call.

## The chain

    Lean model (verify/kernel/Kernel/Definitions.lean, Kernel.admit)
      │  gate: verify/kernel/run.sh — 80-theorem roster, 25 executed
      │  controls, axiom footprint pinned
      ▼
    emitted corpus (format 2; kinds, stages, refusals, encodings,
      admission vectors — machine-emitted, never hand-typed)
      │  wall: byte-identical regeneration (generate:* twins diff
      │  against committed artifacts)
      ▼
    generated tables/schemas (packages/plait/src/kernel/*.generated.ts)
      │  wall: check:kernel-* scripts in the battery
      ▼
    THE SHIPPED DOOR (packages/plait/src/kernel/Door.ts — makeKernelDoor)
      │  wall: KernelConformance replays the model's own admission
      │  vectors against THIS artifact (promoted 2026-08-18 from the
      │  test-only reference twin; the refuse-everything mutant
      │  proves the replay can fail)
      ▼
    THE ONE SEAM (packages/plait/src/kernel/Admission.ts — Effect
      service; layer = the shipped door over one admission context)
      │  walls: T7 public-surface walk (refusal-parity: the error
      │  channel is the one Refusal family; taught reason/law/repair/
      │  applicability ride next[0], looked up from the generated
      │  table); RefusalNext witness suite MINTS a live
      │  kernel-admission refusal through the seam
      ▼
    hosts (cli, FabricClient, CasDaemon — consumption is the
      one-type-universe epic's stage 4, DEV-763)

## What changed and what deliberately did not

Changed: the door logic moved from test/KernelDoor.reference.ts into
src (identical semantics — the conformance replay is the proof);
Admission service + layer are new public surface (emitted-signature
manifest regenerated, 68 → 78); StructuralRefusalKind gained
`kernel-admission`; the witness suite gained the live seam witness.
Not changed: the door's check order and verdicts (vector-gated); the
planted-candidate table and mutant stay test-side per their own
rationale; Kernel model↔runtime id bridge (model Nats vs runtime
digests) remains the epic's design territory — the seam speaks the
corpus candidate form as-is.

## The pattern, generalized

Never leave the conformance target as a test-only twin: the vectors
must gate the artifact that ships, and the seam every host calls must
be the same object the vectors checked. The codegen skill carries
this as a standing rule (.claude/skills/verified-codegen — "ship the
target, not the twin").
