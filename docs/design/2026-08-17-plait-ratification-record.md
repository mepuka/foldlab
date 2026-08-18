# Plait — ratification record and program charter

Ruled 2026-08-17. The operator reviewed the commission
([part 1](2026-08-17-plait-coordination-fabric.md),
[part 2](2026-08-17-plait-action-plane.md)), **pre-qualified the
recommended option on every grill item, and authorized formal
development**. This record makes the rulings durable and charters the
program's project management.

## Rulings

| Item | Ruling (= the recommended option, pre-qualified) |
| --- | --- |
| G1 charter/home | Commissioned lane adopted; code at `packages/plait` + `verify/fabric*`; own Multica project lane (operator extension: a dedicated project, not the `foldlab` project); slices 0–1 dispatch first |
| G2 name | **Plait** |
| G3 commons | v0 commons = one non-clustered JetStream node (R=1) inside the substrate gate; liveness SPOF named in the ledger row when one lands |
| G4 attribution | Connection-identity now; signature seam reserved; evidentiary claims gated on the estate attribution decision; demo headline attribution-free |
| G5 proof homes | Three packages: zero-dep `verify/fabric` (F1–F4, F2b, F9); Veil-pinned `verify/fabric-veil` (F5, `veil.smt.trust=false`); CSLib-pinned F6 deferred to its own ratification |
| G6 ledger timing | Fabric claims enter VERIFICATION.md only as slices land, bounds prose same-day |
| G7 dependencies | `effect@4.0.0-rc.108` (workspace catalog) + `@nats-io/{transport-node,nats-core,jetstream,kv,obj}@3.4.0` exact; nothing else |
| G8 action plane | Adopted as part 2: C6–C9, F7–F10, slices 2a/4a, promoted agentic demo scene |
| G9 triggers | Monotone-only algebra; the deadline-seat pattern is the sanctioned non-monotone door |
| G10 policies | Canonical values on a meet-semilattice; F9 attenuation; writ compiled to Effect Layers (DX, not security) |
| G11 model seam | Wrap pinned `effect/unstable/ai` behind `Models`/`Toolkits`; adapter absorbs pin churn |
| G12 context programs | Programs, frames, toolkits are cataloged values with digests and walls — never files of prose config |

## Execution directives (operator, 2026-08-17)

1. **Fable coordinates; loops are delegated.** Fable's tokens are
   reserved for conceptual and mathematical spine work (architecture,
   specs, law statements, grills, merges). Build loops run on the
   delegation surfaces below.
2. **Project management is formal, on Multica**, in a dedicated
   project lane: epics as parent issues, work as sub-issues (staged
   barrier groups where order binds), every dispatch an issue whose
   body is the whole scope, every run closing with a report on the
   dispatching thread.
3. **Delegation surfaces:** the board's registered seats — Eng CX
   (codex `gpt-5.6-sol`, reasoning `xhigh`, per the machine config) and
   Eng CC (Claude Code) implementers, Rev seats for adversarial review,
   Free Bench for bounded mechanical work — woken by assignment through
   the running Multica daemon; plus direct `codex exec` and Opus 5
   subagents for coordinator-side research and verification that does
   not merit a board issue.
4. **Architecture bar:** Effect v4's own codebase is the exemplar for
   module and API design; the architecture record
   ([2026-08-17-plait-architecture.md](2026-08-17-plait-architecture.md))
   binds the scaffold.
5. **DX/UX directives to exploit:** MCP as a first-class API for
   system introspection and configuration; codegen from cataloged
   declarations; deep domain modeling in Effect Schema including custom
   schema types with R-channel (service-requiring) decode.
6. **Model work is Fable-implemented until stability** (operator,
   2026-08-17, superseding directive 1's delegation for this class):
   Lean, proof, and other model-related work — model packages, theorem
   statements and proofs, gates and controls over models, model-emitted
   corpora — is implemented DIRECTLY by Fable agents, not codex seats,
   from this ruling until the operator declares stability re-achieved.
   Runtime, adapter, Go-twin, and non-model infrastructure work stays
   on the board's codex/CC seats. Mixed slices are split at dispatch:
   the model half to a Fable agent, the runtime half to a seat, the
   coordinator owning the join. Review discipline is unchanged
   (adversarial review still precedes every merge).

## Second ratification wave (same day)

The operator ratified the consolidated grill sheet
([2026-08-17-plait-grill-sheet.md](2026-08-17-plait-grill-sheet.md))
with all recommendations — items 1–21, covering part 3's adoption
(G13–G24), F11/F12 as separate candidate statements, the chaos-CLI
E4 ticket, the capabilities-not-vendors public posture, the
disclose-upstream-first precondition on the Effect id-collision
evidence, the CI postures (lean-gates non-required with revisit
trigger; toolchain sha and first verifier bundle at slice 1; bundles
every slice tag thereafter), the run.sh-amendments follow-up brief
route, the Resource naming/alias rule, and the API iteration log as a
standing surface.

## Program charter

- **Board:** workspace `Dev`, project `plait` (created this day).
  Epics E1–E11 as parent issues; the epic map mirrors the slice ladder
  of part 1 §10 as amended by part 2 §8.
- **Seat law is unchanged** (AGENTS.md): Eng builds one issue on
  `agent/<name>/<issue>`; Rev posts findings on the PR; the coordinator
  merges — the only place lanes meet. Findings before fixes; DECISIONS
  logs per task; generated vectors only; claims sized to evidence.
- **Wave 1** (dispatched this day): the spine
  ([dispatch 29](../../scratch/dispatch/29-plait-spine-spec.md)) and the
  fabric model ([dispatch 30](../../scratch/dispatch/30-plait-fabric-model-spec.md)).
- **Standing fences** carried from the design: attribution-gated
  evidentiary claims; safety-only (no liveness claims); no
  exactly-once claims; the substrate assumptions gate's *content* is the
  envelope (corrected 2026-08-17: the executable gate itself is archived
  at `archive/pre-estate-focus`, purged 2026-08-15; re-landing rides E5);
  VERIFICATION.md rows land with their slices, never before.

## The 2026-08-18 ruling: both design G-sheets ratified as stamped

- **The affordances sheet (G-1..G-7)** and **the agent-plane sheet
  (G25..G36)** are RATIFIED on the refereed verdicts (the grill review's
  amendment wording binding; the affordances record's per-item stamps
  are the ruling's carrier). The gated refactor tickets
  (DEV-737/738/739/741 under epic DEV-743) are released to their
  stages; T-J and the agent-plane mints ride this ceremony.
- **Execution disposition, the operator's words:** "defects are defects
  and are not part of the estate domain language." B-7/DEV-735 is ruled:
  transport catches narrow to the pinned client's error classes;
  refusals remain the only vocabulary the domain speaks; a defect dies
  as a defect and never wears the absence sort. The sentence enters
  DECISIONS with the landing ticket.
- **Addendum, same day: the template-algebra lane is REFUSED** ("we're
  not doing the template algebra"). GT-1..GT-7 are moot, never ruled.
  The investigation record stays as history with its status amended;
  its typed-hole algebra was already absorbed by the ratified kernel
  record as program-composition laws, and its prior-art hunts (the
  empty formal-template field; grite) stand as reference.
