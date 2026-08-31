# Model scout — implementation and evaluation plan

Status: **STAGED PROPOSAL — pre-grade, not ratified**

Companion study: [`SOURCE-STUDY.md`](SOURCE-STUDY.md)

Source receipt: [`model-guided-development-sources.json`](../../.reference/provenance/receipts/model-guided-development-sources.json)

This is a conception-mode plan. The names and interfaces below are working
proposals. Before code is written, the vocabulary, artifact kinds, tool roles,
and public declarations require the normal Foldlab modeling and grilling pass.
No external solver is admitted by this plan.

## Completion criteria

The first implementation is done when all of the following are true:

1. A content-addressed work packet can describe a frozen snapshot, obligation
   graph, assumptions, candidate space, falsifiers, and budget.
2. A scout run can be replayed from an append-only event record.
3. Deterministic templates and at least one model adapter can propose atomic
   candidates as typed data.
4. At least two independent teachers can refute/select candidates: the existing
   executable/property lane and a Lean-native bounded lane.
5. The selector can union candidates, remove invalid clauses, and return a
   checker-accepted subset with reasons and receipts.
6. Every report distinguishes counterexample, sampled survivor, bounded
   survivor, checker acceptance, Lean theorem, unknown, and unsupported.
7. Budget exhaustion returns a complete partial report.
8. Accepted Lean proofs are replayed freshly in the pinned environment; cached
   success alone never closes an obligation.
9. A blinded 24-packet retrospective benchmark and at least three prospective
   slices have been run with the pre-registered metrics below.
10. The rollout decision records which components saved time, which did not,
    and whether the default scout meets the 20% median-cycle improvement bar.

Alloy, Dafny, temporal backends, and the app are later milestones. Their absence
does not block the backend-light first implementation.

## Architecture decision

Use an **event-sourced evidence kernel with an internal capability graph**.

The public module owns four concepts:

```text
request   the immutable work and budget
run       one resumable attempt against one snapshot
event     every proposal, check, refutation, selection, and cost observation
report    the deterministic fold of the complete event prefix
```

It does not expose a public plugin graph. Providers, prompts, solver flags,
batch sizes, and search policies remain behind versioned policy references.
This gives callers one deep operation while allowing the implementation to add
new candidate sources and checkers without changing every caller.

### Public surface

```ts
interface ModelScout {
  run(request: ScoutRequest, signal?: AbortSignal): ScoutRun
  resume(run: RunId, additionalBudget: Budget, signal?: AbortSignal): ScoutRun
  replay(run: RunId): AsyncIterable<ScoutEvent>
}

interface ScoutRun {
  id: RunId
  events: AsyncIterable<ScoutEvent>
  result: Promise<ScoutReport>
}

interface ScoutRequest {
  snapshot: ContentRef
  objectives: ObligationRef[]
  policy: PolicyRef
  budget: Budget
  seed?: string
}

interface Budget {
  wallMs: number
  tokens: number
  verifierCalls: number
  parallelism: number
  cost?: number
}
```

The application-facing schema is serializable first-order data. It contains no
closures, Effect contexts, provider clients, or backend-specific syntax.

### Internal ports

Do not promote these to public seams until at least two real implementations
need each one:

```ts
interface CandidateSource {
  propose(job: CandidateJob): Effect.Effect<CandidateBatch, CandidateError>
}

interface Teacher {
  check(job: CheckJob): Effect.Effect<CheckResult, CheckError>
}

interface Selector {
  select(job: SelectionJob): Effect.Effect<SelectionResult, SelectionError>
}

interface CounterexampleReducer {
  minimize(job: ReductionJob): Effect.Effect<Witness, ReductionError>
}

interface ProofHandoffBuilder {
  prepare(report: ScoutReport): Effect.Effect<ProofHandoff, HandoffError>
}
```

Adapters declare capabilities as data:

```ts
interface AdapterManifest {
  id: string
  versionDigest: string
  accepts: CarrierKind[]
  emits: FindingKind[]
  capabilities: Capability[]
  guarantees: EvidenceModality[]
  batching: { maxBatch: number; sharedPrefix: boolean }
  determinism: "deterministic" | "seeded" | "nondeterministic"
  costModel: CostModel
}
```

The scheduler matches an obligation shape and budget to capabilities. A policy
may prefer cheap models, but no model identity appears in `ScoutRequest`.

## Representation decision

### Core carriers

Freeze these declarations before implementing behavior:

```text
ContentRef
RunId
PolicyRef
ObligationRef
ObligationFamily
ObligationGraph
Scope
EvidenceModality
CandidateInvariant
PremiseCandidate
Mutation
Witness
FindingStatus
FindingPacket
EvidenceReceipt
CostReceipt
ScoutEvent
ScoutReport
ProofHandoff
```

Recommended evidence modalities:

```ts
type EvidenceModality =
  | "heuristic"
  | "sampled-execution"
  | "bounded-refutation"
  | "bounded-survival"
  | "backend-inductive"
  | "checker-acceptance"
  | "lean-kernel"
  | "human-intent"
```

`FindingStatus` and `EvidenceModality` are separate. A finding may be refuted by
a bounded counterexample, accepted by a backend, or proved in Lean; the status
records the event, while modality records what kind of evidence supports it.

### Finding packet

```ts
interface FindingPacket {
  id: FindingId
  kind: FindingKind
  statement: PredicateAst | LemmaAst | WitnessAst | PlanAst
  scope: {
    carrier: ContentRef
    semantics: ContentRef
    assumptions: ObligationRef[]
    bounds?: BoundSpec
  }
  parents: FindingId[]
  normalizedKey: string
  status: FindingStatus
  evidence: EvidenceReceipt[]
  nextObligations: ObligationRef[]
  provenance: Provenance
  cost: CostReceipt
}
```

Normalization is structural over the owned typed AST. Pretty-printed proof
states are never used as evidence of equivalence. Alpha-renaming, irrelevant
hypothesis removal, or state merging requires a separately justified typed
normalizer.

### Portable model

The first portable carrier needs only enough structure for invariant selection:

```ts
interface ScoutModel {
  state: CarrierSchema
  action?: CarrierSchema
  init: PredicateAst
  step?: TransitionAst
  observations: Record<string, ProjectionAst>
}
```

Executable callbacks may be used by the local property adapter, but each one
must declare its relationship to a portable model or be labeled executable-only.
Closures are never serialized.

## Required laws and tests

These are obligations to freeze during formalization-strategy Pass B, not
claims made by this plan:

1. **Snapshot binding** — every event and receipt names the immutable input
   snapshot and policy digest.
2. **No evidence promotion** — folding events cannot turn a weaker modality
   into a stronger one without a receipt of that stronger modality.
3. **Report determinism** — the same valid event prefix folds to byte-identical
   canonical report data.
4. **Resume monotonicity** — resuming appends events; it never rewrites the
   previous run prefix or loses prior findings.
5. **Budget conservation** — every call/check consumes a declared unit and a
   run cannot exceed the hard budget silently.
6. **Partial completeness** — timeout/cancellation returns all committed events
   and unresolved obligations known at that point.
7. **Candidate provenance** — every selected clause traces to a bank entry,
   model response, static analysis, or human input.
8. **Counterexample binding** — a witness names the exact candidate, model,
   semantics, bounds, and checker that produced it.
9. **Cache-key determination** — snapshot, target, local context, tool pins,
   options, and normalized input determine a cache key.
10. **Fresh acceptance** — a cached result cannot mint a final Lean-proof event;
    the target environment must recheck it.
11. **Hard refusal** — proof holes, new axioms/assumptions, weakened statements,
    disabled termination, deleted negative tests, or changed implementation
    semantics cannot be treated as repairs.
12. **Adequacy separation** — mutation/coverage outcomes never merge with proof
    validity; both remain visible in the report.

Each law needs a falsification equation and a red test before implementation,
under the existing `implement` process.

## Default policy v0

```text
1. validate packet and freeze snapshot
2. classify obligation shapes
3. instantiate deterministic bank entries
4. search for base witnesses and run declared falsifiers
5. retrieve accessible project context
6. ask cheap model for four atomic candidate batches
7. normalize, deduplicate, and directly test target utility
8. union candidates and run Houdini/ICE selection
9. feed minimal counterexamples into up to four more candidate batches
10. if stalled, run up to three local repair attempts
11. permit one large-model planning call only for a high-value unresolved node
12. build proof handoff and freshly replay accepted Lean work
```

Early stops:

- a minimal decisive counterexample exists;
- two successive batches add no new normalized candidate;
- the selected set closes the target;
- the remaining work is unsupported by the current adapters; or
- any hard budget is exhausted.

Concurrency is bounded. Independent checks may run in parallel, but the event
order records both dispatch and completion. CPU/RAM saturation is part of the
cost record, not hidden behind wall time.

## Outcome bank v0

Seed entries from existing Foldlab schema families:

```text
WF-PRESERVE
TRACE-EXCLUDES
EXACT-STEP
FAIL-CLOSED
DISTINCTNESS
HOMOMORPHISM
CODEC
REJECTION-CLAUSE
AGREEMENT
```

For each family, add:

- carrier/observable requirements;
- applicability questions;
- candidate constructors;
- positive, negative, and implication examples;
- expected mutations/falsifiers;
- local teacher support;
- proof-handoff shape;
- known counterexamples and failure classes; and
- cost/outcome history.

Seed counterexamples from historical Foldlab work, including admission failures,
canonicalization divergence, reachability gaps, duplicate-chunk/index wording,
side-carrying proof-format collisions, retry/replay mistakes, parser duplicate
keys, and unguarded/open-schema cases. The benchmark preparer sees the answers;
the scout and evaluator do not.

## Milestones

### M0 — Measurement and packet schema

No model or new solver.

Deliver:

- JSON/Effect Schema definitions for request, budget, event, finding, receipt,
  and report;
- canonical encoding and digest calculation;
- append-only local run store;
- deterministic report fold;
- metric vocabulary and benchmark manifest;
- 24 blinded historical packets; and
- baseline timings from the current development/proof process.

Gate:

- invalid modality promotion is rejected;
- report regeneration is byte-identical;
- cancellation yields a valid partial report;
- answers remain blinded during runs; and
- metrics include human time, not only machine time.

### M1 — Local scout and selector

No external solver.

Deliver:

- deterministic bank candidate source;
- schema-constrained cheap-model candidate source;
- structural normalizer and exact duplicate removal;
- local executable/property teacher using the already admitted `fast-check`;
- Lean-native bounded teacher over owned finite carriers, preferring
  `decide_cbv` and recording axiom reports;
- ICE examples and Houdini-style candidate elimination;
- counterexample shrinking/replay; and
- proof handoff containing declarations, obligations, and fixtures.

Gate:

- declared teacher mutants are killed;
- every model candidate has empty trust contribution;
- no-survivor, timeout, unsupported, and invalid-model cases are distinct;
- the same seed and deterministic adapters reproduce the same report; and
- baseline versus M1 is measured before adding another tool.

### M2 — Alloy relational adapter

Only proceed if M1 shows relational packets consume meaningful time.

Admission target:

```text
Alloy v6.2.0
commit 59ba2033993449d483d54acad0e11a7bbf20354f
Java 17 process boundary
```

Deliver:

- `ScoutModel` to Alloy projection for relation-heavy carriers;
- base-model witness query;
- assertion/counterexample query with explicit scopes;
- XML solution decoder and replayable witness form;
- timeouts and unsupported-feature refusals;
- field/fact/transition mutation operators;
- specification-coverage matrix; and
- exact JAR/version/options/input/output receipts.

Use a process adapter first. The user-linked Alloy 4.2 Java API mirror proves
the surface exists but is not the current compatibility contract. Do not expose
Alloy classes in the public TypeScript interface.

Gate:

- translation fixtures cover every supported AST form;
- a deliberately inconsistent model fails the base-witness check;
- bounded survivors always carry exact scopes;
- decoded witnesses replay against the rendered model; and
- adapter mutants cannot fabricate an unbounded or Lean-proof modality.

### M3 — Project retrieval and Lean repair loop

Deliver:

- accessibility filter over the pinned declaration graph;
- type/head-symbol and dependency-proximity retrieval;
- same-file and nearby-proof retrieval;
- optional learned/LLM reranking behind the same result schema;
- persistent Lean workers with bounded concurrency;
- structured diagnostics and earliest-failure localization;
- checked-prefix preservation and subgoal-local repair;
- conservative typed proof-state keys; and
- final cold replay and `#print axioms` capture.

Start with 12 ranked optional premises plus direct dependencies. Measure recall,
rank, prompt size, proof success, verifier calls, and time. Include a
novel-premise holdout so the retriever cannot win by memorizing familiar uses.

Gate:

- inaccessible declarations never enter prompts;
- the exact target environment is part of every cache key;
- pretty-printed equality alone never merges states;
- a stale cache cannot pass final acceptance; and
- local repair cannot change the frozen public declaration.

### M4 — Optional Dafny algorithm adapter

Only proceed on loop/array/algorithm packets that do not fit the Lean-native or
Alloy lanes economically.

Admission target:

```text
Dafny v4.11.0
tag commit fcb2042d6d043a2634f0854338c08feeaaaf4ae2
CLI process boundary
```

Deliver:

- frozen-contract to supported Dafny model projection;
- annotation generation, verifier feedback, repair, and minimization;
- positive and negative test oracles;
- exact verifier logs and resource settings;
- optional `--target:js` executable reference;
- differential fixtures against the TypeScript implementation; and
- explicit open correspondence obligations back to the Foldlab carrier.

Gate:

- changes to implementation bodies, assumptions, decreases policy, assertions,
  or negative tests are hard failures;
- generated JavaScript is labeled executable reference only;
- Dafny acceptance never becomes a Foldlab Lean theorem; and
- the adapter is retained only if the paired pilot saves net cycle time.

### M5 — Temporal/protocol adapter

Do not add a protocol DSL to the default stack preemptively. If transition/trace
packets remain the dominant gap, evaluate Quint plus Apalache first, with TLC as
an alternate finite-state/liveness backend. Keep Veil as an isolated research
spike until its platform and dependency posture fit the Windows-primary estate.

Gate semantics must remain explicit:

- simulation/sample;
- bounded symbolic survivor;
- finite exhaustive result;
- backend inductiveness; and
- Foldlab Lean theorem.

These are never collapsed into one pass state.

### M6 — App and agent API

Add the app only after the event/report schema survives M0–M3.

Provide one deep operation:

```text
scout(snapshot, objectives, policy, budget) -> run
```

App views:

1. proof frontier;
2. replayable counterexamples;
3. coverage/mutation matrix;
4. selected invariants and elimination reasons;
5. unresolved high-value obligations;
6. costs, cache behavior, pins, and evidence modality; and
7. final proof handoff/fresh-check receipt.

Agent access should use the same request/report schema through code mode or one
MCP operation. Do not expose one tool per model, prompt, checker, or mutation.

## Work breakdown

| ID | Vertical slice | Depends on | Acceptance |
|---|---|---|---|
| MGS-001 | Freeze request/event/report declarations and examples | ratification | signature snapshot; schema round-trips; invalid evidence rejected |
| MGS-002 | Canonical event store and report fold | MGS-001 | byte-identical replay; cancellation partial report |
| MGS-003 | Seed outcome bank from existing Foldlab families | MGS-001 | each entry has carrier guard, falsifier, teacher, and provenance |
| MGS-004 | Build blinded 24-packet benchmark and baseline runner | MGS-001 | answer-key separation; fixed budgets; human+machine metrics |
| MGS-005 | Deterministic template candidate source | MGS-003 | seeded candidates and applicability refusals |
| MGS-006 | Schema-constrained cheap-model candidate source | MGS-002, MGS-003 | malformed output refusal; prompt/input/model receipts |
| MGS-007 | Local executable and Lean bounded teachers | MGS-002 | concrete witnesses; explicit sampled/bounded modalities |
| MGS-008 | ICE/Houdini selector and counterexample reducer | MGS-005, MGS-007 | selected subset closes fixtures; blamed clauses removed |
| MGS-009 | M1 paired benchmark and decision | MGS-004, MGS-006, MGS-008 | pre-registered report; no architecture promotion by anecdote |
| MGS-010 | Alloy 6 adapter and coverage mutations | MGS-009, tool admission | scope-bound witnesses, XML replay, mutation matrix |
| MGS-011 | Accessible-premise retrieval and local Lean repair | MGS-009 | novel-premise holdout; checked-prefix preservation; cold replay |
| MGS-012 | Optional Dafny adapter and JS differential reference | MGS-009, tool admission | negative-test adequacy; separate correspondence debt |
| MGS-013 | App/API projection | MGS-010 or MGS-011 | frontier, evidence, counterexample, coverage, and cost views |

Each implementation slice uses the proof-driven `implement` process: a separate
breaker writes the algebraic contract, falsification equations, and failing test
battery before the implementer changes production code.

## Evaluation design

### Retrospective bank

Twenty-four blinded packets:

- 8 known specification defects;
- 8 invariant/proof failures;
- 8 successful low-defect slices;
- 8 relational, 8 algorithmic, and 8 transition/trace dominant shapes where
  practical, cross-classified with the three outcome groups.

The answer key records the historical defect, minimal counterexample, accepted
repair, final proof names, and time where available. The scout sees only the
snapshot and approved packet.

### Variants

```text
B0 current breaker + proof workflow
B1 B0 + bank candidates + direct target checks
B2 B1 + portfolio union/Houdini
B3 B2 + accessible project retrieval
B4 B3 + local repair/decomposition
B5 B4 + persistent workers/batching/caching
```

Run B5 separately enough to distinguish systems throughput from better search.
Hold model, hardware, snapshot, and wall-clock budget fixed within an ablation.

### Measures

Primary:

- total human-plus-machine time to a ratified, freshly checked artifact.

Secondary:

- time to first decisive counterexample;
- time to first adequate invariant/contract;
- historical defects rediscovered before implementation;
- mutations killed and uncovered clauses/fields/transitions;
- candidates proposed, deduplicated, refuted, selected, and proved;
- model calls, tokens, monetary cost, verifier calls, CPU/GPU time;
- median and p90 elapsed time;
- cache hit rate and stale-cache failures;
- proof/specification churn after implementation; and
- post-implementation escaped defects.

### Rollout decision

Default adoption requires:

1. at least 20% lower median primary measure on the held-out bank;
2. no reduction in mutation/negative-test adequacy;
3. no increase in escaped-defect rate;
4. zero evidence-modality promotion errors; and
5. complete scope/pin/cost receipts for every retained finding.

Keep winning components independently. For example, retrieval or local repair
may earn default status even if Alloy does not. Disable the scout for a work
shape after its modeling overhead exceeds the time it saves on three consecutive
prospective slices.

## Risks and controls

| Risk | Control |
|---|---|
| False reassurance from bounded survival | no `verified` boolean; bounds and modality required structurally |
| Vacuous or weak specification | base witnesses, negative tests, declared falsifiers, and mutation coverage |
| Semantic drift between portable model and Foldlab carrier | explicit projection/refinement obligation; no automatic claim transfer |
| Candidate explosion | atomic schema, early normalization, direct utility checks, Houdini, plateau stops |
| Expensive semantic dedup | structural normalization first; measure solver-backed dedup separately |
| Model edits the statement to make proof easy | frozen declarations and hard refusal on statement/assumption change |
| Cache accepts stale proof | full environment in key and mandatory fresh final check |
| Shallow API leaks every tool | one public scout operation; internal manifests and policies |
| Bank overfits known defects | blind answers, successful controls, prospective slices, novel family holdout |
| Tool sprawl | add a backend only after the previous measured slice identifies a gap |

## Ratification and production stops

Before MGS-001 implementation:

1. Ratify or replace the provisional public names and artifact kinds.
2. Freeze the declaration signatures through formalization-strategy Pass B.
3. Grill the evidence modalities, especially `backend-inductive` and
   `checker-acceptance`.
4. Decide the first 24 packet sources and protect the answer key.
5. Index the staged plan in `SPECS.md` if it is promoted.

Before Alloy, Dafny, or any other external checker enters gated work:

1. Add its exact version, role, and trust statement to `TOOLS.md`.
2. Pin its executable/JAR and dependencies, not only its source tag.
3. Define supported model forms and loud refusals.
4. Add translation, witness-decoding, timeout, and `unknown` tests.
5. Record the highest claim modality the adapter can emit.

No commit, canonical promotion, tool installation, or implementation is part of
this staged plan.
