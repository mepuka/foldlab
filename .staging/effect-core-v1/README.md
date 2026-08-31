# Effect Core v1 — staged packet

Status: **PRE-GRADE / PROPOSED**, 2026-08-31

This directory is the working packet for a closed-alphabet, fully reified
Effect Core whose meaning is modeled in Lean and whose selected TypeScript
target is generated and checked independently. It organizes the work; it does
not claim that the core, its denotation, or the generated target has already
been completed or promoted.

## Start here

Read the nearest [`AGENTS.md`](AGENTS.md), then use only the document that owns
the current question:

| Need | Owner |
| --- | --- |
| scope, frozen premises, slices, literature roles | [`PLAN.md`](PLAN.md) |
| existing Lean and Effect declarations; reuse/bridge decisions | [`EXISTING-TYPES.md`](EXISTING-TYPES.md) |
| proposed syntax, handler algebra, machine, denotation, target relation | [`ALGEBRA.md`](ALGEBRA.md) |
| exact contract clauses and adversarial batteries | [`CONTRACT-PACKET.md`](CONTRACT-PACKET.md) |
| denotational classification dimensions and transfer laws | [`CLASSIFICATION.md`](CLASSIFICATION.md) |
| declaration and theorem dependency graph | [`PROOF-DAG.md`](PROOF-DAG.md) |
| mechanically exhaustive vendored Effect public-surface plan | [`REIFICATION-CHECKLIST.md`](REIFICATION-CHECKLIST.md) |
| applicability of the staged Lean exhibits | [`EXHIBITS-REVIEW.md`](EXHIBITS-REVIEW.md) |
| every active counterexample and negative-control boundary | [`COUNTEREXAMPLES.md`](COUNTEREXAMPLES.md) |
| per-type proof closure and cutover refusal | [`TYPE-CLOSURE.md`](TYPE-CLOSURE.md) |
| AGENTS layout, generated facts, drift gates, resume protocol | [`ORGANIZATION.md`](ORGANIZATION.md) |
| exact local commands and observations | [`WORKSHOP-RESULTS.md`](WORKSHOP-RESULTS.md) |

The independent reports are evidence inputs, not packet authority:

- [`effect-core coordination and incoming-lane record`](../agent-reports/2026-08-31-effect-core-coordination.md)
- [`effect-core-local-anchors`](../agent-reports/2026-08-31-effect-core-local-anchors.md)
- [`effect-core-classification-anchors`](../agent-reports/2026-08-31-effect-core-classification-anchors.md)
- [`effect-core-provenance`](../agent-reports/2026-08-31-effect-core-provenance.md)

## Operator-set representation decisions

The packet is being reconciled to these constraints:

1. A graph block's sequential body is the existing `PProg`; no second
   straight-line program carrier is introduced.
2. Scoped child bodies are `BlockId` data. Existing `Handler`, `Handler.sum`,
   `Handler.through`, `interpret_bind`, and `interpret_through` are the handler
   basis; there is no `HHandler` type.
3. Full-core meaning is relational over typed decisions, including scheduler
   selections and external answers. Scheduler policy/state lives in the initial
   configuration; fixing that configuration and one complete compatible
   decision tape yields deterministic replay. The deterministic CAS graph
   exhibit does not imply global uniqueness.
4. There is no public `Behavior` program carrier. Finite approximations are
   observations of runs, and coherence is a theorem.
5. The compositional coherence face is `interpretRef`/big step. Existing
   `run_has_no_composition_law` forbids a fixed-fuel bind law.
6. EffHOL's modality specializes to existing `wlp`; existing `wp` adds
   totality.
7. Fuel exhaustion and unanswered external/scheduler choices are live
   frontiers, not `Refusal`, typed error, or cause.
8. Existing `Refusal`, `Refusal.Clause`, `RefusalMap`, `Sig`, `Prog`, `Handler`,
   `PProg`, `wp`, `wlp`, and CAS word/observation declarations remain the
   canonical owners of their current meanings.
9. Every required type must have a mechanically closed proof graph before full
   cutover. There is no “substantially complete” override.

## Current executable evidence

The following checks have been rerun locally in this working tree:

| Check | Result | Claim boundary |
| --- | --- | --- |
| `lake env lean ../../.staging/effect-core-v1/workshop/EffectCoreProbe.lean` from `library/cas` | exit 0; five theorem receipts; `propext`/`Quot.sound` ceiling where reported | workshop definitions only, local G1 ceiling |
| `lake env lean ../../.staging/effect-core-v1/workshop/exhibits.lean` | exit 0; 17 theorem receipts; no `sorryAx` or `Classical.choice` | deterministic CAS/block specialization, not full-core semantics |
| `lake env lean ../../.staging/effect-core-v1/breaker-exhibits.lean` | exit 0; 40 theorem receipts; `propext`/`Quot.sound` ceiling | adversarial results against the scratch exhibits, including the inadequate catch target and conditional `wlp` composition |
| `lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/LocalAnchors.lean` | exit 0; seven theorem receipts; explicit `Classical.choice` only in the row-normalization pair | four packet/DAG contradictions and their narrowed forms |
| `lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/FixedFuel.lean` | exit 0; exact inherited boundary receipts: `[propext, Quot.sound]` and `[propext]` | supports `EC1-CE002`; introduces no declaration |
| `lake env lean ../../.staging/agent-reports/2026-08-31-effect-core-classification-anchors.lean` | exit 0; 11 receipts | concrete counterexamples and existing-classifier anchors only |
| `bun .staging/effect-core-v1/workshop/effect-surface-probe.ts --summary` | exit 0; 392 exports-resolved code entries, 4,613 canonical stable coordinates, zero reported duplicate/missing-pair/type errors | pinned package census instrument, not semantic closure |
| `bun .staging/effect-core-v1/workshop/tsgo/run-probes.ts` | exit 0; exact pins and direct declaration resolution verified; ignored bridge absent; exact one-file coverage; positive clean; three mutants rejected by their exact diagnostics | Effect TS7 source-hygiene evidence only |
| `effect-tsgo diagnostics` over `library/effects/tsconfig.json` | exit 0; 43/43 files detected and supported as Effect v4; zero errors, warnings, or messages | current library-wide language-service baseline, not generated-code denotational evidence |

The breaker and local-anchor sources are accepted only as pre-grade, local
kernel evidence. Their exact counterexamples and the restrictions they force
are indexed in [`COUNTEREXAMPLES.md`](COUNTEREXAMPLES.md); they do not promote
the replacement model or close a proof-DAG row.

## Findings already forced into the design

- The old runtime-bank walk is not a complete public-package census; recursive
  exports-map enumeration found public MultipartParser entries absent from it.
- Dataflow sequence must reindex the right operand; neither union nor append is
  correct, and closure is not componentwise homomorphic.
- Operation occurrence, world change, and temporal order are separate
  dimensions.
- `PProg.envelope` does not synthesize exact errors or write addresses.
- CAS observational equality deliberately excludes the partial word on a
  refusing branch.
- A full reification grade is decided from finite authored alphabet/profile
  metadata and discharged by theorems; it is not inferred from an
  undecidable semantic predicate over all runs.
- Four proof-DAG statements require amendment: duplicate-free row
  normalization, fail-fast diagnostic completeness, classifier invariance,
  and total injection from arbitrary raw `PProg`.

The exact witnesses and evidence states are centralized in
[`COUNTEREXAMPLES.md`](COUNTEREXAMPLES.md); replacement statements belong in
[`PROOF-DAG.md`](PROOF-DAG.md), not in this status page.

## Current limits

- No Effect Core declaration is promoted into `formal/` or `library/`.
- The proposed general machine, relational denotation, classifier product, and
  generated TypeScript simulation remain unproved.
- The full recursive public surface has not been emitted into canonical
  profile rows; the workshop census is a measured starting point.
- The generated packet, annotation, obligation, counterexample, and type-closure
  manifests described by [`ORGANIZATION.md`](ORGANIZATION.md) do not exist yet.
- EffHOL and Effect TS7 source-repository pins remain pending in the estate's
  provenance machinery; the local package versions and PDF digest do not
  silently promote those rows.
- No type is approved for full cutover by this packet.

## Next implementation slice

After packet review and operator grilling, the first bounded slice is
organizational and first-order:

1. freeze the existing-type annotation schema and declaration snapshot;
2. preserve every active counterexample ID and amended theorem statement;
3. generate recursive public-surface row skeletons from the pinned package;
4. generate per-type closure skeletons with every edge explicit and open;
5. implement the raw/checker boundary and planted negative controls; and
6. keep denotation, concurrency, cause topology, and target simulation as later
   slices whose prerequisite rows are mechanically visible.

Until that slice is released, this directory remains a reviewed design and
workshop packet, not a cutover branch.
