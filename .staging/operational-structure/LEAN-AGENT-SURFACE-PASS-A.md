# LEAN AGENT SURFACE — Pass A implementation plan

Status: **STAGED PASS A PLAN — pre-grade, awaiting grill**. Written
2026-08-31 from a read-only review of the current Lean store language,
Effect TypeScript backend, MCP host, meta outputs, model-scout plan, and
front-end query plans. This document changes no law, mints no vocabulary,
and authorizes no implementation.

Pass A freezes the question. It ends with an approved domain contract,
prior-art decision, declaration skeleton, obligation ledger, and explicit
handoffs. Pass B later freezes exact Lean declarations. Proof and runtime
implementation begin only after Pass B.

## 0. Result and decision boundary

Foldlab needs a project-reasoning surface that an agent can use to inspect
Lean models, understand the capabilities earned by their laws, prepare
specifications, check bounded candidates, and plan Effect TypeScript
projections. The existing `cas_*` MCP surface is the store's execution
surface. It is not the home of repository state, proof ledgers, human
decisions, or code-generation planning.

The recommended split is:

| Surface | Responsibility |
|---|---|
| `cas_*` | Store operations and programs: put, load, run, publish, list |
| `foldlab_*` | Project inspection, evidence, specification checks, projection planning, and later model scouting |

This split is a **recommended Pass A answer**, not a ruling. The operator
must accept or replace it during the intent grill.

### 0.1 Existing authority

This plan is subordinate to:

- [EFFECTS-BACKEND](../../library/cas/EFFECTS-BACKEND.md): CAS is an
  effects language; meaning lives in the reference handler; programs are
  content; hosts are code; MCP is generated from operation descriptions;
  word equality is the cross-host observation.
- [CODEGEN-LEVEL](CODEGEN-LEVEL.md): new generated surfaces should be
  closed descriptions interpreted into targets, with independent agreement
  gates; the common implementation is earned by measured demand.
- [META-OUTPUTS](META-OUTPUTS.md): project APIs arise from emitted metadata;
  proof briefs, reverse references, debts, laws, axioms, trust, and strata
  should be machine-readable.
- [PLAIN-LANGUAGE](PLAIN-LANGUAGE.md): deterministic prose is a projection
  of first-order semantics; authored intent must not masquerade as a
  generated fact.
- [model-scout IMPLEMENTATION-PLAN](../model-guided-development/IMPLEMENTATION-PLAN.md):
  candidate generation, checking, counterexamples, evidence modalities,
  replay, and budgets belong behind one deep operation.
- [QUERY-ENGINE](../frontend-trunk/QUERY-ENGINE.md): derived queries execute
  where the consumer is; the server serves words and content rather than
  growing a query-specific remote language.

### 0.2 What Pass A may produce

Pass A may produce planning documents, prior-art receipts, declaration
sketches, example and counterexample packets, and disposable elaboration
spikes whose only purpose is to test whether a proposed declaration can be
stated. It may revise this document as the operator answers the docket.

Pass A may not:

- add a production Lean declaration;
- add an MCP tool or resource;
- grow `MetaSchema`, `Cas.Schema.Ast`, or the TypeScript fragment;
- generate or modify Effect TypeScript surfaces;
- assert that a proposed correspondence holds;
- collapse Pass A into Pass B by treating a compilable sketch as a frozen
  public interface;
- promote this document into `docs/` or `formal/` without grilling.

## 1. Pass A completion criteria

Pass A is complete only when all of the following are true:

1. The operator has answered every Tier 1 design-intent question in §4.7.
2. Every public object and operation has one plain-English meaning and one
   named owner.
3. The observations available to Lean, TypeScript, MCP, and the human are
   separated rather than described as one result.
4. Equality, freshness, project identity, declaration identity, and report
   identity each have a proposed judgment and a counterexample to the
   strongest tempting alternative.
5. Positive examples, rejected examples, boundary cases, and overclaim
   falsifiers are approved.
6. The semantic level is chosen for candidate specifications, model cards,
   evidence receipts, and projection plans.
7. The prior-art ledger classifies each candidate as reuse, adaptation,
   pattern, or from-scratch work, with pins and trust costs where required.
8. The dependency-ordered declaration DAG contains definitions and theorem
   statements only; names remain provisional until Pass B.
9. The obligation ledger names assumptions, preservation and refinement
   duties, negative cases, evidence requirements, and trust boundaries.
10. The first usable scenario and its acceptance transcript are selected.
11. Handoffs to invariant representation and effectful-system modeling name
    their required inputs, outputs, and stop conditions.
12. A reviewer can explain how every proposed public claim could be
    falsified.

## 2. Current evidence baseline

The following are observations of the current working tree. They are not
fresh gate results.

1. `Cas.Backend.Mcp.McpTool` carries only a name, prose description,
   request schema code, and reply schema code. Six `cas_*` operations are
   emitted from that table.
2. The Effect host's actual request and reply carriers are hand-written.
   The host records an open agreement obligation between those carriers and
   the Lean schema codes.
3. The Effect host also owns operation annotations, service dependencies,
   handler bindings, and the conversion from MCP program instructions to
   the runtime program carrier.
4. The manifest boot check compares two projections of the same Lean tool
   table. It is a useful packaging check, but it is not an independent
   carrier, adapter, or handler-semantics check.
5. The shared Lean environment walk already obtains declaration docstrings
   and source lines. The surface ledger emits only whether documentation is
   present and discards the text and line.
6. `surface`, `laws`, `obligations`, and `environment` are registered meta
   outputs whose `MetaSchema` terms are still pending.
7. Lean already computes a first-order program effect envelope: literal
   reads, ordered put shapes, answer dataflow, and a closed-dataflow
   decision. It also projects that envelope into deterministic prose.
8. The working-tree query model makes capabilities explicit: the append law
   buys incremental evaluation, commutativity buys permutation agreement,
   and idempotence buys replay tolerance.
9. The working-tree reachability model exposes a useful counterexample,
   termination measure, decidable search, and an open memoization debt.
10. The TypeScript emitter fragment remains deliberately small and retains
    an unrestricted `raw` declaration arm. `CODEGEN-LEVEL` records the raw
    fleet as measured debt and recommends fragment growth only under real
    demand.
11. The MCP HTTP host serves a hand-written federation of projections from
    several planes. Its own comments record incomplete installed-package
    availability.

Before Pass B, each observation must be refreshed against the chosen
snapshot and either retained with an anchor or removed.

## 3. Required Pass A products

### A1 — Domain contract

One approved table covering objects, operations, observations,
equivalences, environment, scope, assumptions, and deployment facts. Every
pending item names its downstream consequence.

### A2 — Example and falsifier packet

At least:

- three complete positive use cases;
- five rejected or unsupported cases;
- five boundary cases;
- one counterexample to every headline overclaim in §5.4.

### A3 — Prior-art ledger

One row per reused or considered local/external design, with source,
revision, license, toolchain, intended role, actual guarantee, semantic
mismatch, trust cost, reuse class, and adapter obligation.

### A4 — Semantic-level decision

An approved choice for each carrier: direct native Lean data, extrinsic raw
syntax plus a checked judgment, intrinsic checked data, or a projection of
an existing model. No carrier may be selected merely because it is easy to
serialize.

### A5 — Declaration DAG

A dependency-ordered list of provisional Lean definitions and theorem
signatures. It contains no proof bodies and no generated TypeScript.

### A6 — Obligation ledger

Every definition with observable meaning has a corresponding obligation,
witness, negative case, or trust statement. Agreement obligations name both
sides and the observation compared.

### A7 — Handoff packet

Separate handoffs to:

- invariant representation, for raw/checked carriers and smart boundaries;
- algebraic systems, for effectful checks, resumable workflows, budgets,
  events, and traces;
- Pass B, for exact namespaces, imports, declaration types, and signature
  elaboration.

## 4. Domain contract docket

All names in this section are working vocabulary. They do not enter an
owning `CONTEXT.md` until the vocabulary grill approves them.

### 4.1 Proposed public objects

| Working name | Intended meaning | Recommended owner |
|---|---|---|
| Project snapshot | Exact generating state against which a report is meaningful | Project Catalog |
| Declaration reference | Snapshot-bound identity of one Lean declaration | Project Catalog |
| Subject reference | Closed reference to a declaration, model, claim, obligation, program, projection, artifact, or workflow | Project Catalog |
| Declaration card | Focused facts and relations for one declaration | Project Catalog |
| Model card | A uniform explanation projected from a native domain model | Project Catalog |
| Evidence receipt | One result with modality, scope, bounds, pins, and witnesses | Evidence Checker |
| Specification draft | Agent-proposed objects, operations, observations, assumptions, invariants, failures, and falsifiers | Evidence Checker |
| Decision point | One unresolved human choice with evidence and downstream effects | Human workflow |
| Projection plan | Dry-run classification of Lean material into a target surface | Projection Planner |
| Residue reference | Addressed target material outside the modeled fragment | Projection Planner |
| Scout run | Replayable, budgeted event history and its report | Model Scout |

### 4.2 Proposed public operations

| Operation | Meaning | Mutates repository or store? |
|---|---|---|
| Inspect | Arrange snapshot-bound facts about one subject | No |
| Check | Apply named checks to a candidate and return evidence | No repository mutation; report placement pending |
| Plan projection | Determine what a projection would emit, refuse, or retain as residue | No |
| Scout | Search for candidate invariants and counterexamples under a budget | No production mutation; event/report placement pending |

The existing `cas_*` operations remain outside this table. They operate on
the store language, not the project-reflection plane.

### 4.3 Proposed observations

The interface may expose only observations with a named source:

- exact declaration name, kind, signature, module, and source anchor;
- authored docstring, explicitly labeled authored;
- direct dependency and reverse-reference relations;
- axiom dependencies;
- bound laws, open obligations, debts, and claim-gate records;
- executable decision results and their inputs;
- theorem statements and kernel evidence;
- Effect/TypeScript differential or byte-gate receipts;
- program envelope and deterministic prose;
- projection disposition, missing fragment capability, and residue;
- report freshness, bounds, tool pins, and unknowns;
- human decisions, explicitly labeled human intent.

The interface may not expose an inferred explanation as if Lean stated it.

### 4.4 Units and identity

Recommended defaults for grilling:

- A project snapshot includes the commit, dirty-tree digest, Lean toolchain,
  imported-module set, declared inputs, and emitted-artifact digests.
- A declaration reference is qualified name plus snapshot plus signature
  fingerprint. A source line is a navigation hint.
- A report's identity is a function of request, snapshot, policy, budget,
  and the versions of every checker it invokes.
- An addressed report may be stored without being published, adopted, or
  promoted.
- Two reports with different evidence modalities are not interchangeable
  even when their prose summary is identical.

### 4.5 Equality and correspondence

The contract must select a distinct judgment for each comparison:

| Comparison | Candidate observation |
|---|---|
| Two project snapshots | Equality of their declared generating data |
| Two declaration references | Same snapshot, qualified name, and fingerprint |
| Lean schema code vs Effect carrier | Agreed schema projection under an approved comparison relation |
| Lean instruction lowering vs TS adapter | Equality of normalized internal instruction results on vectors |
| Lean program vs Effect execution | Store-word equality on admitted vectors |
| Lean theorem vs generated property | The property is a projection of the theorem statement; passing samples is separate evidence |
| Projection plan vs emitted files | Plan realization plus byte gates, after implementation |

Pass A must not use the unqualified words “equivalent,” “preserves,” or
“verified” for these rows.

### 4.6 Environment and scope

Recommended v1 scope:

- one Foldlab checkout;
- one explicit snapshot;
- the pinned Lean toolchain and compiled environment;
- existing generated metadata and schema planes;
- Effect TypeScript as the only projection target;
- local trusted agents operating under existing filesystem permissions;
- read-only inspection, checking, and dry-run projection planning;
- no arbitrary TypeScript execution;
- no automatic repository writes, publication, promotion, or commit.

### 4.7 Tier 1 design-intent questions

These answers block the declaration DAG from entering Pass B.

1. Is the Foldlab reasoning surface developer-only, or part of the
   distributable CAS product?
2. Are `cas_*` and `foldlab_*` separate interfaces and permission domains?
3. Is v1 read-only and dry-run, or may it admit reports and mutate files?
4. Does Lean own only formal and deterministic facts, while human purpose
   remains authored?
5. Which fields constitute project identity when the worktree is dirty?
6. Are addressed reports ordinary unpublished content, repository
   paperwork, or ephemeral runtime values?
7. Must every unresolved choice become a first-order decision point?
8. Which evidence modalities may appear in user-facing summaries?
9. Does v1 require standard MCP resources, or is a tool-shaped adapter over
   the same carriers acceptable?
10. Is the first acceptance scenario model explanation, proof briefing, or
    projection planning?
11. Is the long-term product a proof-assistant interface, a specification
    workbench, or a general project-reasoning system?

### 4.8 Expected-behavior questions

1. Must a stale generated ledger refuse inspection, or may it be returned
   with a warning?
2. May a request silently fall back from a named snapshot to the live tree?
3. What is the maximum inline response before pagination or an addressed
   resource is required?
4. How is a declaration with no docstring represented?
5. How is a declaration whose source range is unavailable represented?
6. Which theorem-to-TypeScript dispositions are public?
7. Does unmodeled target syntax always become addressed residue, or may a
   target refuse the whole projection?
8. Which program-envelope facts must be visible before execution?
9. Which structured repair fields belong to every refusal?
10. Which checks require budgets, cancellation, and resumable reports?
11. May any model-generated candidate close an obligation without a named
    checker or human ruling?
12. Which resources require source-read, environment-read, store-write, or
    repository-write capabilities?

### 4.9 Development-horizon questions

#### Short term

1. Must the existing six MCP operations close carrier, adapter, and handler
   agreement before any Foldlab operation lands?
2. Are Query, Reach, and program envelopes the approved first model cards?
3. Must all four awaiting meta shapes land before `inspect`?
4. Is a CLI/code-mode transcript sufficient for v1, with no UI?

#### Medium term

1. May agents submit raw specification and invariant candidates?
2. Does `check` cover only Lean elaboration at first, or also bounded
   execution, mutation checks, and cross-host vectors?
3. Does projection planning cover only Effect TypeScript?
4. When may Model Scout be exposed through MCP?
5. When do accepted decision points become addressed content?

#### Long term

1. Is Effect ingestion an expanding measured fragment with residue, or is
   total ingestion a required destination?
2. Which measured event admits branch-on-answer, bounded retry, and recursive
   control forms?
3. When may another target language justify a second interpreter?
4. May an approved projection-plan address eventually authorize mutation?
5. Which project/session data should become store content rather than
   repository paperwork?

## 5. Examples, negative cases, and overclaim falsifiers

### 5.1 Positive witnesses

**P1 — Query capability explanation.** An agent asks why one query supports
incremental evaluation and whether it tolerates reorder or replay. The reply
names the target aggregator, the exact laws available, the capabilities each
law earns, theorem references, and any TypeScript evidence separately.

**P2 — Program preflight.** An agent supplies or references a first-order
program. Before execution, it receives literal reads, ordered put shapes,
answer dependencies, dataflow-closure status, static bounds, deterministic
prose, and the exact snapshot.

**P3 — Proof brief.** An agent names one theorem. It receives the statement,
authored explanation, direct dependencies, reverse references, axiom ceiling,
source neighborhood, bound laws, open obligations, and retained
counterexamples without reading the entire module.

**P4 — Invalid invariant.** An agent submits a candidate invariant that fails
initialization or preservation. The checker returns a typed finding and a
replayable counterexample, not a prose-only rejection.

**P5 — Projection dry run.** An agent asks how a Lean declaration would reach
Effect TypeScript. The planner classifies it as executable code, generated
test, linked evidence, pending correspondence, unsupported form, or residue;
it writes nothing.

### 5.2 Forbidden examples

1. A theorem is labeled a TypeScript guarantee because its Lean proof
   compiles.
2. A sampled property test is labeled a Lean theorem.
3. The live checkout is used after a request names another snapshot.
4. A missing docstring is replaced by model-generated prose presented as
   authored fact.
5. An unsupported target form silently travels through `raw` without a
   residue marker.
6. An MCP operation claims read-only behavior while its handler admits or
   publishes content.
7. A checker budget expires and the report returns success.
8. A model proposal closes a human design decision.
9. A standard CAS host exposes repository source merely because it exposes
   store operations.
10. A generated report is promoted or committed as a side effect of
    inspection.

### 5.3 Boundary cases

1. Dirty tree with generated ledgers from an earlier source state.
2. Declaration rename with unchanged type.
3. Same declaration name and type with a changed body or docstring.
4. Declaration with no source range in compiled metadata.
5. Cyclic or oversized dependency slice.
6. Program with closed dataflow but a missing literal read at runtime.
7. Projection that is modeled except for one opaque host closure.
8. Evidence receipt whose checker version is no longer installed.
9. Two human decisions over the same question at different snapshots.
10. MCP client that cannot consume resources but can call tools.

### 5.4 Strongest tempting overclaims

**CX1 — “The declaration card is the model.”** False: the card is a
projection of a native model at one snapshot and may omit internal structure.

**CX2 — “The manifest proves the handler.”** False: a same-source manifest
gate does not establish carrier, adapter, or handler semantics.

**CX3 — “A Lean theorem transfers through code generation.”** False without
an explicit source/target relation and its evidence.

**CX4 — “A program envelope predicts the exact run.”** False: it is a static
summary and may intentionally over-approximate.

**CX5 — “A bounded survivor is an invariant.”** False: survival within a
bound is evidence with that bound, never universal preservation.

**CX6 — “One model-card structure should replace native Lean models.”**
False: the common card is a reporting projection, not the semantic carrier.

## 6. Semantic level and representation investigations

### 6.1 Native models, common projection

Do not define one universal `AlgebraicModel`. Query folds, reachability,
effectful programs, schema admission, and proof obligations have materially
different carriers and laws. Preserve native models and project them into a
common first-order model card.

Every model card should state:

1. objects and generators;
2. composition or transition;
3. laws and their premises;
4. capabilities earned by each law;
5. executable decisions;
6. public observations;
7. examples and counterexamples;
8. correspondence to implementations;
9. limits, costs, and open debts.

### 6.2 Raw candidate, checked candidate

Agent-authored specifications and invariants need an **extrinsic** raw
carrier: malformed and incomplete candidates must remain representable so
the checker can return exact diagnostics. Admission produces a checked
carrier only after all required fields and references pass.

Pass A must decide whether the checked form uses:

- a subtype carrying a well-formedness proof;
- a structure with proof fields;
- a smart constructor returning a plain checked structure whose invariant
  remains private;
- an indexed family where the index materially changes available
  operations.

The default recommendation is raw data plus a smart admission function.
Indices are justified only if they remove an actual invalid continuation or
operation from the checked interface.

### 6.3 Rich protocol vs small meta universe

Use `Cas.Schema.Ast` or a purpose-built described carrier for rich protocol
documents that need unions and nested request forms. Keep `MetaSchema` as the
small closed language describing emitted ledger documents. The mere presence
of a schema interpreter does not justify merging the two universes.

### 6.4 Facts vs relations

Keep declaration facts and cross-declaration relations distinct:

- declaration rows carry local facts;
- relation rows carry `mentions`, `binds-law`, `discharges`, `projects`,
  `checked-by`, `supported-by`, `refuted-by`, and `supersedes` edges;
- an inspection bundle joins the two for one request.

This avoids one giant declaration record and permits indexes to grow without
moving every local row.

### 6.5 Evidence as a sum, not a rank

Evidence modalities are not one ordered success scale. At minimum retain:

- human intent;
- heuristic proposal;
- sampled execution;
- bounded refutation;
- bounded survival;
- checker acceptance;
- Lean kernel theorem;
- cross-host differential evidence;
- deployment observation;
- unknown and unsupported.

Any partial order between modalities requires a separate ruling. Pass A must
not assume that a later or more expensive modality silently promotes an
earlier claim.

### 6.6 Resources and effects

Pure work remains outside `Prog`. Building and querying a frozen catalog is
pure after the environment snapshot exists. Loading a Lean environment,
running a checker, invoking a host, admitting a report, and reading repository
files are distinct effects and require distinct capability statements.

## 7. Provisional public Lean declaration DAG

The names below are declaration sketches, not frozen public names. Pass B may
rename or restructure them after the contract is approved.

### Layer 0 — scalar identities and closed vocabularies

```text
SnapshotId
DeclarationFingerprint
ReportId
PolicyRef
WorkflowRef
EvidenceModality
FindingStatus
ProjectionDisposition
Capability
```

`ProjectionDisposition` should distinguish at least executable projection,
generated test, evidence-only reference, pending correspondence, unsupported,
and residue.

### Layer 1 — references

```text
ProjectSnapshot
DeclRef
ModelRef
ClaimRef
ObligationRef
EvidenceRef
ArtifactRef
SubjectRef
```

`SubjectRef` is a closed sum over the reference kinds the public interface
actually consumes. It is not an open string namespace.

### Layer 2 — local facts and relations

```text
SourceAnchor
DeclarationFact
RelationKind
RelationRow
LawFact
ObligationFact
EvidenceReceipt
Counterexample
```

The snapshot must be available from every fact or from an enclosing document
whose identity is included in the fact's reference.

### Layer 3 — model and specification projections

```text
ModelObject
ModelOperation
ModelLaw
ModelCapability
ModelObservable
ModelLimit
ModelCard

RawSpecDraft
CheckedSpec
SpecIssue
DecisionPoint
```

The common `ModelCard` contains references and described facts; it does not
contain a universe-polymorphic executable model.

### Layer 4 — project catalog

```text
ProjectCatalog
InspectSection
InspectRequest
InspectionBundle
InspectRefusal

buildCatalog : ProjectSnapshot → EnvironmentFacts → Except CatalogRefusal ProjectCatalog
inspect : ProjectCatalog → InspectRequest → Except InspectRefusal InspectionBundle
```

The I/O that loads `EnvironmentFacts` sits outside these operations.

### Layer 5 — checking

```text
CheckKind
CheckBudget
CheckRequest
CheckEvent
CheckReport
CheckRefusal

check : CheckerSet → CheckRequest → CheckRun
```

`CheckRun` needs cancellation and a complete partial report. Its precise
effectful carrier belongs to the algebraic-systems handoff.

### Layer 6 — projection planning

```text
TargetRef
TargetCapability
ProjectionRequest
ProjectedItem
ResidueRef
ProjectionPlan
ProjectionRefusal

planProjection : ProjectCatalog → TargetDescription → ProjectionRequest
  → Except ProjectionRefusal ProjectionPlan
```

Planning is pure over a frozen catalog and target description. Realizing the
plan is a later, separate operation.

### Layer 7 — model scouting

Reuse the model-scout carriers after their own M0–M3 design survives:

```text
ScoutRequest
ScoutEvent
ScoutReport
ScoutRun
```

No checker, model provider, prompt, selector, or reducer enters the external
interface.

### Layer 8 — operation descriptions

```text
OperationPurpose
OperationEffects
OperationBounds
OperationEvidence
OperationDescription
```

An operation description should carry request, success, and failure schema
codes; required services; reads, admissions, publications, and external
effects; preconditions; refusal clauses; idempotence and destructive status;
capabilities; resource limits; law and evidence references; and authored
purpose.

### Provisional theorem and judgment families

Pass A must determine exact statements for these families before Pass B:

1. snapshot identity determines the catalog inputs;
2. catalog construction refuses undeclared or stale inputs;
3. inspection returns only facts belonging to the requested snapshot;
4. declaration-reference fingerprints detect the chosen change classes;
5. every emitted relation names existing endpoints;
6. raw specification admission returns a checked specification or complete
   typed issues;
7. evidence rendering preserves modality, bounds, and unknown status;
8. projection planning classifies every requested item exactly once;
9. a fully modeled projection contains no unmarked residue;
10. operation descriptions and target projections agree under named
    carrier, adapter, and handler observations.

No theorem family may use “sound” until it names the exact judgment it means.

## 8. First model-card mappings

### 8.1 Query

The card should project:

- object: store word;
- generator: one binding's contribution;
- target: aggregator carrier;
- composition: `merge` and `empty`;
- floor laws: associativity and identities;
- optional laws: commutativity and idempotence;
- capabilities: incremental append, reorder agreement, adjacent replay, and
  general redelivery tolerance, each with its premises;
- execution: fold over mapped bindings;
- target obligation: generated TypeScript fold agrees on reference vectors;
- non-capability: order independence is absent without commutativity.

### 8.2 Reach

The card should project:

- object: resident graph resolved by first binding;
- edge relation and first-occurrence index;
- invariant: admitted references resolve strictly earlier;
- capability: admission order is topological;
- decision: bounded reachability search;
- termination measure: strictly decreasing first-occurrence index;
- counterexample: occurrence-based edges can cycle under shadowing;
- open debt: memoized search and its agreement theorem.

### 8.3 Program envelope

The card should project:

- first-order program address or inline table;
- literal reads;
- ordered put shapes;
- answer dataflow;
- dataflow-closure decision;
- static counts and bounds;
- deterministic prose;
- theorem links for the envelope/run relation;
- explicit nonclaim: the envelope is not the exact future run.

### 8.4 MCP operation

The card should project:

- operation identity and human purpose;
- request, success, and failure codes;
- required services and capabilities;
- reads, admissions, publications, and external effects;
- idempotence and destructive status;
- refusal vocabulary;
- carrier, adapter, handler, and protocol evidence;
- gaps that still rely on review.

## 9. Correctness investigation paths

### I1 — Carrier agreement

Determine the precise comparison between a Lean canonical schema code and an
Effect request/reply carrier. The existing TypeScript function named
`fromAst` travels from Effect's AST into the persisted schema representation;
it is not automatically the missing Lean-code-to-live-Effect-schema door.

Deliver:

- two candidate comparison relations;
- one intended richer-carrier example, such as hex bytes represented by a
  string code;
- one drift counterexample each relation catches or misses;
- recommended agreement gate.

### I2 — Adapter agreement

Inventory every hand-written conversion between MCP documents and runtime
operations. Start with program instructions. Determine whether to generate
the conversion, emit Lean-computed adapter vectors, or state a refinement
relation.

Deliver one negative vector that swaps or corrupts a constructor while still
passing carrier decoding.

### I3 — Handler agreement

Determine how a generated operation identity binds to exactly one handler,
service requirement set, effect summary, and annotation set. A valid but
incorrect operation name inside another handler must become a red check.

### I4 — Environment coverage

Compare the modules imported by the shared environment walk with the modules
declared by Lake and the strata ledger. Determine a gate that makes an
unwalked new module visible without introducing a new aggregator merely for
the walk.

### I5 — Dependency extraction

Separate constants used by a declaration's type from constants used by its
body. Decide which relation powers proof briefs, impact analysis, and reverse
references. Measure response sizes on representative theorem families.

### I6 — Fingerprints

Compare signature-only, declaration-value, source-span, and compiled-object
fingerprints. Select the smallest identity that catches the changes agents
must not confuse while remaining reproducible under the pinned toolchain.

### I7 — Evidence joins

Specify the join keys between surface, laws, obligations, debts, axioms,
trust, strata, conformance vectors, and human decisions. Refuse name-only
joins that can cross snapshots.

### I8 — Federated resource manifest

Design a manifest that references artifacts owned by the MCP, metadata,
schema, conformance, and generated-code planes. It should carry logical
identity, schema, digest, availability, media type, and capability requirement
without pretending all artifacts belong to the meta plane.

### I9 — MCP resource feasibility

Inspect the pinned Effect MCP implementation for resources, templates,
pagination, cancellation, and progress. If it lacks a required facility,
retain the same first-order carrier and use a temporary tool adapter.

### I10 — Residue

Replace the conceptual role of `Ts.Decl.raw` with an explicit residue model:
source bytes, address/digest, origin, reason, target position, and round-trip
obligation. Determine which projections may proceed with residue and which
must refuse.

### I11 — Structured refusals

Define the smallest common finding shape that carries phase, clause, path,
expected and actual forms, related subject, evidence, deterministic repair
options, and retryability without flattening each domain's native error.

### I12 — Security and capabilities

Classify project-source read, environment read, external checker execution,
store write, root publication, repository write, and commit as distinct
capabilities. The Foldlab development surface must not inherit permissions
merely because the CAS store host has them.

## 10. Prior-art investigation ledger

Pass A starts with local evidence and searches outward only for unresolved
semantics. Each row below is a task, not a current reuse claim.

| Candidate | Intended role | Initial class | Question to resolve |
|---|---|---|---|
| `Cas.Lang.Prog`, `PProg`, `Envelope` | Programs, first-order content, preflight | Reuse | Which facts project without weakening their existing laws? |
| `Cas.Word.Query` | Law-to-capability model card | Reuse | Can the capability projection be stated generically without a universal model? |
| `Cas.Word.Reach` | Decision, measure, counterexample, debt | Reuse | Which search result and cost facts belong in the public card? |
| `Cas.Schema.Ast` | Rich protocol descriptions | Adapt | Does it need any growth for project-reasoning requests? |
| `MetaSchema` | Closed metadata-document shapes | Reuse | Which four awaiting ledgers are ready to freeze? |
| `Cas.Backend.Mcp.McpTool` | Seed operation description | Adapt | Which fields belong in the semantic description versus the target adapter? |
| `Cas.Backend.Target.OperationSig` | Effect type surface | Adapt | Can it be derived from the richer operation description without joining unlike planes? |
| Model Scout request/event/report | Bounded checking workflow | Reuse after M0–M3 | Which carriers are stable enough for a common MCP projection? |
| Lean environment reflection | Declaration catalog | Adapt | Which facts are stable at the pinned toolchain and which need source reads? |
| Mathlib algebraic hierarchy | Ordinary law vocabulary | Reuse or pattern | Does the zero-dependency CAS tower justify restating each selected structure? |
| Effect MCP resources | Transport projection | Adapt | What does the pinned implementation actually support? |
| External proof-retrieval systems | Proof-brief arrangement | Pattern | Which retrieval relations have local, exact-project counterparts? |

Every external row added during execution must include a resolved provenance
pin or an explicit pending mark before it supports a staged assertion.

## 11. Obligation ledger

| ID | Obligation | Discharge evidence | Falsifier / stop condition |
|---|---|---|---|
| LAS-A01 | Authority split approved | Operator ruling | Repository facts appear in distributable `cas_*` by accident |
| LAS-A02 | Project snapshot fully enumerates generating data | Contract table + negative stale case | Same snapshot ID yields different catalog bytes |
| LAS-A03 | Declaration identity catches approved change classes | Fingerprint study | Changed declaration is returned under an indistinguishable ref |
| LAS-A04 | Catalog covers the selected Lean library | Lake/strata comparison | New module is absent with no red gate |
| LAS-A05 | Inspection never crosses snapshots | Judgment + negative fixture | Relation endpoint belongs to another snapshot |
| LAS-A06 | Authored and derived prose remain distinct | Output schema + fixtures | Generated prose is labeled authored |
| LAS-A07 | Evidence modality and bounds survive every projection | Round-trip fixtures | Bounded survivor renders as theorem or pass |
| LAS-A08 | Model card does not replace native semantics | Mapping review | A native theorem must be restated over a weaker universal carrier |
| LAS-A09 | Raw specification retains invalid states and diagnostics | Positive/negative admission cases | Invalid candidate cannot be represented precisely |
| LAS-A10 | Human decisions are first-order and snapshot-bound | Decision-point examples | Agent consensus silently closes a choice |
| LAS-A11 | Projection classifies every requested item once | Classification judgment | Item disappears or receives two incompatible dispositions |
| LAS-A12 | Residue is visible and addressed | Residue witness + round trip | Opaque bytes travel as unmarked raw text |
| LAS-A13 | Carrier agreement is independently checked | Selected relation + drift fixture | Hand carrier changes while manifest gate stays green |
| LAS-A14 | Adapter agreement is independently checked | Generated adapter or vectors | Constructor conversion changes while schema checks stay green |
| LAS-A15 | Handler identity and effects are independently checked | Generated binding + negative fixture | Valid wrong tool name labels another handler |
| LAS-A16 | Program preflight states only envelope facts | Model card + CX4 | Exact execution is inferred from the envelope |
| LAS-A17 | Query law is respected | Consumer-side discovery design | MCP server grows a remote query evaluator returning values |
| LAS-A18 | Large results remain bounded | Pagination/address policy | Inspection requires one unbounded response |
| LAS-A19 | Budget exhaustion is honest | Partial-report case | Exhaustion returns success or loses events |
| LAS-A20 | Capabilities are least-authority | Capability matrix | Read-only client obtains repository or store mutation |
| LAS-A21 | Each correspondence names its observation | Claim ledger | “Equivalent” appears without relation and target |
| LAS-A22 | Pass A remains separate from Pass B | Review record | Production names or proof bodies land before contract approval |

## 12. Pass A work packages

### PA-0 — Freeze the evidence snapshot

**Input:** current checkout, ratified law, recent staged plans.

**Work:** record commit, dirty-tree digest, toolchain, relevant module set,
and exact file revisions used by the Pass A review. Refresh §2.

**Output:** evidence header and changed/stale list.

**Acceptance:** every current-state statement has a snapshot anchor.

### PA-1 — Intent grill

**Input:** §4.7–§4.9.

**Work:** ask one decision at a time; record answer, reason, rejected option,
and downstream consequence. Update the domain contract, not a separate
transcript.

**Output:** approved and pending contract rows.

**Acceptance:** no Tier 1 question remains unanswered.

### PA-2 — Examples and falsifiers

**Input:** approved intent.

**Work:** turn §5 into concrete request/result documents. Add the strongest
counterexample for each proposed equality or capability.

**Output:** example packet with expected observations.

**Acceptance:** each public operation has a positive witness and a named
failure route.

### PA-3 — Representation design

**Input:** contract and example packet.

**Work:** design at least two materially different carrier arrangements for
snapshot, evidence, specification, model card, and projection plan. Compare
them on invalid-state representation, serialization, proof burden,
projection cost, and interface depth.

**Output:** semantic-level decision and rejected alternatives.

**Acceptance:** every carrier choice states why the other arrangement was
rejected.

### PA-4 — Local declaration and metadata study

**Input:** frozen snapshot.

**Work:** execute I4–I7 over the actual compiled environment and emitted
ledgers. Measure representative proof slices and relation indexes without
landing production code.

**Output:** catalog fact inventory, coverage result, fingerprint comparison,
and join design.

**Acceptance:** the declaration DAG uses only facts the selected environment
can reproduce.

### PA-5 — Operation agreement study

**Input:** existing six MCP operations.

**Work:** execute I1–I3. Produce intentional drift cases for carrier,
adapter, and handler identity.

**Output:** three independent agreement judgments and their proposed gates.

**Acceptance:** each intentional drift has exactly one expected red route.

### PA-6 — Projection and residue study

**Input:** current TypeScript fragment and raw-arm inventory.

**Work:** execute I10 using Query emission and one existing generated program
as cases. Separate modeled syntax, target-specific syntax, and opaque host
content.

**Output:** projection dispositions, target-capability vocabulary, residue
carrier, and refusal rules.

**Acceptance:** no example needs an unmarked raw escape.

### PA-7 — Transport and capability study

**Input:** pinned Effect MCP host, serving plan, packaging facts.

**Work:** execute I8, I9, I11, and I12. Keep transport limits separate from
semantic carriers.

**Output:** federated resource manifest design, MCP mapping, refusal shape,
and capability matrix.

**Acceptance:** a transport fallback changes no underlying request or report
meaning.

### PA-8 — Prior-art decision

**Input:** unresolved representation or theorem questions from PA-3–PA-7.

**Work:** search locally first, then pinned primary sources. Complete the
ledger in §10 with revisions, licenses, guarantees, mismatches, and adapter
obligations.

**Output:** reuse/adapt/pattern/from-scratch decision.

**Acceptance:** no borrowed abstraction enters the declaration DAG on name
similarity alone.

### PA-9 — Declaration DAG and obligation closeout

**Input:** all approved studies.

**Work:** revise §7 into dependency order; give every public target an
informal meaning, inputs, output, failure route, and obligation IDs. Remove
unused seams.

**Output:** Pass B candidate declarations and closed obligation graph.

**Acceptance:** a reviewer can implement Pass B without choosing semantics.

### PA-10 — Pass A grill and handoff

**Input:** complete Pass A packet.

**Work:** pressure-test the contract, examples, carrier choices, declarations,
and overclaim falsifiers. Record approval or return exact items to an earlier
package.

**Output:** approved Pass A record or explicit rejection.

**Acceptance:** approval states that Pass B may elaborate declarations but
may not alter their meaning silently.

## 13. Recommended development order after Pass A

This order is provisional until PA-1 ratifies the scope.

1. **Pass B declaration freeze.** Elaborate exact snapshot, reference,
   evidence, model-card, specification, decision-point, projection-plan, and
   operation-description declarations. Freeze imports and theorem statements.
2. **Existing MCP correctness.** Close carrier, adapter, and handler agreement
   for the six existing `cas_*` operations before adding new operations.
3. **Metadata foundation.** Finish the four awaiting meta shapes, enrich
   declaration rows, add reverse relations, gate module coverage, and stamp
   snapshot freshness.
4. **Project Catalog.** Implement immutable resources and `foldlab_inspect`.
   Demonstrate Query, Reach, program envelope, and one theorem proof brief.
5. **Projection Planner.** Implement dry-run classification, missing-fragment
   reporting, target capabilities, and addressed residue. Use derived query
   code as the first substantial consumer.
6. **Evidence Checker.** Admit raw specification drafts; implement typed
   issues, bounded checks, counterexamples, budgets, cancellation, and partial
   reports.
7. **Human workflow.** Make unresolved choices explicit decision points;
   keep ratification and promotion outside automatic agent control.
8. **Model Scout.** Expose one deep `scout` operation only after its own
   request/event/report milestones pass.
9. **Controlled fragment growth.** Admit branch, bounded retry, recursion,
   additional Effect forms, and other targets only under measured demand.
10. **Permissioned production.** Consider mutation only when an approved plan
    and its evidence receipts can be addressed and explicitly authorized.

## 14. Pass B handoff requirements

The Pass B handoff must contain:

- approved vocabulary with owners and avoid-lists;
- frozen domain contract;
- exact positive, negative, boundary, and overclaim cases;
- prior-art ledger and pins;
- chosen semantic level for every carrier;
- dependency-ordered declaration names, namespaces, imports, and types;
- theorem and judgment statements without proof bodies;
- axiom ceiling and allowed options;
- obligation DAG with witnesses and counterexamples;
- trust and capability boundaries;
- approved edit regions for representation work;
- semantic diff from this Pass A plan;
- explicit items returned to Pass A rather than hidden as proof holes.

Pass B is refused if any declaration still requires its implementer to decide
what a field means, which equality is intended, how failure is observed, or
what evidence would falsify its claim.

## 15. Non-goals

This Pass A plan does not design:

- a general theorem prover protocol;
- an MCP tool per theorem, tactic, checker, emitter, or model provider;
- a universal algebraic model replacing native Lean definitions;
- a total TypeScript or Effect AST;
- arbitrary source execution;
- proof-generating trust from an LLM;
- remote query evaluation in the CAS server;
- automatic repository mutation, publication, promotion, or commit;
- multi-language code generation before Effect TypeScript establishes the
  second-interpreter demand;
- a UI before the resource and operation carriers are accepted.

The first useful result is narrower: an agent can ask what a model or
declaration means, receive exact snapshot-bound facts and open obligations,
and prepare a checkable specification or projection plan without inventing
authority or changing the project.
