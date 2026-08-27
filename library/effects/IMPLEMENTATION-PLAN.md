# Effect-native CAS replay library — implementation plan

Status: Pass-A implementation plan; M0 domain contract ratified by grilling,
2026-08-26. Vocabulary is owned by
[docs/effect-replay/CONTEXT.md](../../docs/effect-replay/CONTEXT.md)
Claim posture: planning input only; no model, specification, source-bridge, or
implementation-conformance claim is admitted by this document

## 1. Decision summary

The proposed first slice is a TypeScript library implemented with public Effect
v4 operations. It provides content-addressable storage and replay as Effect
services, and it can derive replaying adapters for explicitly described Effect
services. Lean 4 owns a small semantic model and establishes laws for that
model. TypeScript is the runtime implementation; Lean is never part of the
runtime.

The initial target is deliberately narrower than arbitrary Effect program
replay:

> For every admitted reified sequential model program whose replay-relevant
> leaf operations are mediated by the replay handler: given a
> request-compatible, outcome-admissible flat history, substitution replay
> consumes that history exactly, returns the recorded typed outcomes, and
> never selects live delegation; given any other history, it returns a typed
> rejection at the first divergence, consumes no occurrence beyond it, and
> still never selects live delegation.

That sentence is the ratified model-contract target (M0, 2026-08-26), not a
current claim. The TypeScript side has a deliberately weaker first boundary:
ordinary orchestration is conforming under a documented discipline rather than
admitted by a source checker. G2 traceability must retain that quantifier
mismatch. Exact declaration names and types remain Pass-B work; the minted
vocabulary lives in the owning context document.

For this slice, matching separates two checks with distinct rejection
categories. Request-side compatibility compares what the running program emits
against the next history entry: operation identity, revision, canonical
request payload, and order. Outcome-side admissibility is a condition on the
history itself: each recorded outcome must decode against its operation's
declared success or typed-failure Schema, checked when the entry is consumed.
The running program emits no outcome to compare; outcomes are what history
supplies. No program identity is modeled. Two different TypeScript programs
that emit the same admitted request stream are indistinguishable to this
replay protocol.

The architectural split is:

```text
project-owned operation descriptions
             |
             v
pure replay reducer <---------- Lean semantic model
             |                    and model theorems
             v
Effect replay service and service adapters
             |
             v
CAS store adapter / host runtime
```

CAS stores immutable object graphs. Replay interprets service operations using
those graphs. CAS does not itself decide whether a service body runs.

## 2. Authority and research basis

Canonical repository documents remain authoritative. Copies under
`research/docs/` are convenience snapshots only.

| Input | Role in this plan | Status |
| --- | --- | --- |
| [`effect-operational-semantics-reference-sweep.md`](../../docs/research/effect-operational-semantics-reference-sweep.md) | Separates model, source, compilation, and hosted-execution layers; supplies the restricted-semantics method | Research input |
| [`effect-runtime-ground-truth-extraction-scope.md`](../../docs/research/effect-runtime-ground-truth-extraction-scope.md) | Pins runtime facts and recommends an abstract typed environment for Context rather than copying its overlay/cache representation | G0 research input |
| [`cas-effect-program-replay.md`](research/cas-effect-program-replay.md) | Separates program identity, execution history, handler identity, checkpoints, and replay witnesses | Conception-mode research input |
| [`CLAIM-GATES.md`](../../docs/effect-typescript-semantics/CLAIM-GATES.md) | Governs G0–G6 wording and evidence | Canonical gate vocabulary |
| [`DEVELOPMENT-INVARIANTS.md`](../../docs/DEVELOPMENT-INVARIANTS.md) | Requires project-owned semantic types, explicit state, typed failures, and separate adapters | Canonical development law |
| [`sources.lock.json`](../../.reference/provenance/sources.lock.json) | Owns the Effect source identity | Effect commit `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, package `effect@4.0.0-rc.111` |
| [`MACHINE-ALGEBRA.md`](../machine/MACHINE-ALGEBRA.md) | Supplies the house canonicalization, framing, typed-reference, store-obligation, and hash-hypothesis patterns | Pre-grade design input; M0 must choose instantiation or a deliberate fork |
| [`CONFORMANCE-WORKFLOW.md`](CONFORMANCE-WORKFLOW.md) | Dual-lane development workflow: statement schemas, manifests, mutation metric, cycle state, lane roles | Ratified workflow authority, 2026-08-26 |
| [LLVM Content Addressable Storage guide](https://llvm.org/docs/ContentAddressableStorage.html#cas-library-implementation-guide) | Supplies the `data + references`, object-store, identifier, loaded-object, and action-index pattern | Architecture pattern only; exact source pin and license receipt pending |

### Prior-art disposition ledger

This ledger guides design; it does not admit new evidence into the Source Lock.

| Source | Revision | License status | Useful guarantee or pattern | Mismatch with this project | Disposition |
| --- | --- | --- | --- | --- | --- |
| Effect v4 source | `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, `effect@4.0.0-rc.111` | MIT | Public Effect, Context, Layer, Schema, Exit, and Cause implementation surface | Subject implementation, not Foldlab semantics | Adapt through a pinned public interface |
| Foldlab Effect semantics surveys | 2026-08-24 snapshots | CC BY 4.0 | Layered claim discipline and exact runtime inventory | Earlier recommended slices are broader than CAS replay | Adapt the method and selected Context/service facts |
| Foldlab CAS replay report | 2026-08-26 snapshot | CC BY 4.0 | Replay modes, history discipline, occurrence identity, negative cases | No ratified contract or implementation | Adapt into the first domain contract |
| Foldlab machine algebra | 2026-08-25 draft | CC BY 4.0 | Parameterized kind, framed pre-image, O1–O20 obligations, Level 0/1/2 hash discipline | Pre-grade and not yet selected as a dependency | Reuse or deliberately fork at M0 |
| LLVM CAS guide | live page inspected 2026-08-26 | Pending provenance receipt | Immutable data/reference DAG, interchangeable stores, and separate action index | Compiler-oriented object handles; no Effect service or replay semantics; action index has no first-slice consumer | Pattern only; index deferred to recomputation |
| Blaze checkout | commit `76cf4cb0e7d68fc71f17eed539b411b194c9ca38` | Pending Source Lock/license review | Handler, state, resource, and concurrency proof architecture | Rocq/Iris language, not Effect TypeScript | Pattern only, deferred |
| *A Relational Separation Logic for Effect Handlers* | DOI `10.1145/3776676` | Paper use only; catalog admission pending | Relational reasoning about handlers and state | No Foldlab judgment or TS bridge | Pattern only, deferred |

Before a G3 or stronger claim uses an Effect runtime file, the relevant file
identity must be added to the Source Lock. Before LLVM terminology or contracts
become normative, the exact documentation source must receive a provenance
receipt.

The effects library must not silently re-derive a second canonical-store
discipline. M0 decides whether its CAS node kinds instantiate the machine
algebra or copy only its obligation shapes while the machine remains pre-grade.
Either route adopts the machine's hash-hypothesis lattice:

- **Level 0:** no premise about the hash; canonicalization, pre-image framing,
  kind/version separation, deduplication by equal encoding, and collision
  behavior live here whenever possible;
- **Level 1:** address-to-content reflection requires an explicit named
  `hInj` premise; and
- **Level 2:** no theorem assumes collision resistance. Concrete collisions are
  characterized as implementation behavior instead.

## 3. Pending domain contract

Names in this section are minted in the Effect Replay context document; this
section is the design view and defers to it.

### Objects

- **Operation description:** stable operation identity and revision, request
  Schema, success Schema, typed-failure Schema, and leaf-replay admission.
- **CAS node:** versioned kind, canonical payload bytes, and ordered references
  to other nodes.
- **Content identifier:** digest of a project-owned, domain-separated pre-image
  with the provisional shape `versionByte ++ kindTag ++ frame(encode(canon
  node))`. Schema validates and interoperates at typed boundaries; its default
  JSON encoding is never the digest pre-image.
- **History entry:** one logical operation occurrence, retaining request,
  decision, outcome, and predecessor information.
- **Replay session:** mode, execution identity, history root, current
  flat-history cursor, ordered decision trace, and terminal abort state. A
  record-mode append failure aborts the session through the transport seam:
  orchestration cannot catch it, no later wrapped operation runs, and it
  surfaces as the session's typed store error — histories are truthful
  prefixes, never gapped subsequences, structurally.
- **Service adapter:** an implementation of an existing Effect service
  interface that delegates each described operation through the replay
  service.
- **Session outcome:** tagged result of a session: `Completed` with the
  terminal; `Rejected` with category, position, and — for the
  unconsumed-suffix case only — the program's terminal so far; or `Violated`
  with the ambient-service violation.
- **Replay witness:** immutable account of the mode, execution identity,
  consumed history, decision trace, and session outcome. It carries execution
  identity and never program identity.

### Operations

- store and load a canonical CAS node;
- begin a record or replay session;
- invoke a described leaf operation;
- append a record-mode occurrence;
- consume one replay-mode occurrence;
- finish a session only when its terminal conditions hold; and
- wrap an explicitly described Effect service implementation with the same
  caller-facing service interface.

### Initial observations

The primary observation is an ordered decision trace emitted by the pure
reducer. Its working decision cases must distinguish at least live delegation,
record-mode occurrence append, recorded substitution, history consumption,
typed rejection, and completion. Whether a live leaf adapter was requested is
a derived projection of that trace, not a separate Boolean oracle.

The remaining observations are:

- typed terminal result: success or admitted typed failure;
- ordered operation occurrences;
- consumed history prefix and final cursor;
- first mismatch and its stable rejection category; and
- CAS roots and referenced node identities.

Allocation, wall-clock cost, tracing, Effect's internal Context representation,
layer memoization, and runtime primitive steps are not initial observations.

### Mismatch taxonomy

Six ratified categories. Request-side, checked against the entry at the
cursor: operation mismatch, revision mismatch, request mismatch, and history
exhausted. Completion-side: unconsumed suffix. Outcome-side, checked at
consumption: outcome inadmissible. "Order mismatch" is deliberately not a
category — under exact positional matching it always manifests as a
request-side case at the current position. CAS storage failures are a distinct
typed error family, never mismatch categories; ambient-service violations are
a distinct session-outcome case.

### Initial equalities and distinctions

- CAS nodes are equal when their admitted canonical representations are equal;
- equal admitted canonical pre-images yield equal identifiers at Level 0;
- identifier equality reflects pre-image equality only under explicit Level-1
  `hInj`;
- histories are not equal merely because their final outcomes are equal;
- repeated identical requests remain distinct logical occurrences;
- handler/environment identity and execution identity remain separate;
- program identity is absent rather than inferred from request history;
- transparent orchestration and substituted leaf operations have different
  roles in one flat trace; and
- implementation observations are related to model observations only through
  a named normalization and comparison relation.

### Environment and scope

Initial scope:

- one fiber and a finite sequential history;
- finite, Schema-encoded requests, successes, and typed failures;
- explicit operation descriptions;
- transparent orchestration code whose leaf dependencies are wrapped;
- substitution at leaf operations only;
- exact positional matching and no implicit live fallback;
- an in-memory CAS adapter first;
- a small manually mirrored TypeScript reducer kept suitable for line-by-line
  audit; and
- public Effect imports only.

Conforming orchestration must not perform ambient host effects or consult
Effect-provided default services such as Clock or Random except through a
described leaf operation. `R = never` is not treated as evidence of purity.
The ratified policy is reject-first: time, randomness, and jittered scheduling
are rejected from conforming examples; replay-mode sessions install tripwire
Clock/Random defaults that surface ambient use as a `Violated` session outcome;
deterministic overrides are deferred until a fixture demands one. The raw-host
channel (`Date.now`) remains discipline plus permanent counterexample fixtures.
The tripwire mechanism is verified against the pinned source (2026-08-26):
`Clock.Clock` and `Random.Random` are `Context.Reference` keys overridable per
scope with `Effect.provideService`; `Effect.sleep` routes through the clock
service, and `Schedule.jittered` draws through the random reference.

Deferred:

- arbitrary JavaScript or arbitrary `Effect` value ingestion;
- a TypeScript source checker for orchestration admission;
- defects, interruption, full Cause combination, Scope, and finalizers;
- concurrency, races, scheduler observations, and causal-DAG replay;
- retry and exactly-once external behavior;
- ActionIndex and recomputation/cache mode;
- framed histories and opaque substitution of an outer orchestration service;
- checkpoints, history collection, migration, and remote replication;
- ambient `Date.now`, `Math.random`, network, filesystem, mutable globals, or
  other host operations outside a described service operation;
- transparent validation of destructive operations; and
- TypeScript compiler or JavaScript-engine relation claims.

### Positive, negative, boundary, and overclaim cases

Positive witness:

1. An orchestration service calls two described leaf services in sequence.
2. Record mode invokes both live adapters and stores typed outcomes.
3. Replay mode runs the orchestration again, substitutes both outcomes in the
   recorded order, consumes the complete history, and invokes neither live
   leaf adapter.

Required negative witness:

- the second replay request differs by operation revision or canonical request
  payload; replay returns the first typed mismatch and performs no live
  fallback.

Boundary cases:

- two byte-identical requests occur consecutively and remain two occurrences;
- two different TypeScript programs emit the same admitted request stream and
  are indistinguishable to the first-slice replay protocol;
- a changed program consumes an old history until its first request divergence;
- history contains an extra entry after the program terminates;
- stored bytes decode but are non-canonical or use an unknown node kind; and
- the live operation succeeds but history persistence fails afterward.

Counterexample to the strongest tempting overclaim:

> A program calls `Date.now()` directly, consults a default Clock/Random
> service, or uses a jittered retry schedule between two replayed service
> calls. Its service history can match exactly while its whole-program result
> changes.

Therefore the first result is a service-protocol theorem, not a theorem about
arbitrary Effect programs.

### Assumptions, facts to prove, and deployment evidence

| Class | Initial contents |
| --- | --- |
| Assumptions | Project-owned deterministic canonical byte codec; explicit `hInj` only for Level-1 address reflection; described orchestration performs no ambient host effect and consults no default Clock/Random service except through described operations; live adapters obey their declared request/result Schemas |
| Lean facts to establish | Replay determinism; fail-closed mismatch; exact consumption; replay traces never select live delegation; occurrence distinctness; CAS graph well-formedness; interpreter composition laws |
| G2 traceability limitation | Lean quantifies over reified admitted programs; ordinary TypeScript orchestration is discipline-conforming until a source judgment exists |
| TypeScript facts to test | Schema decoding/encoding behavior; Effect service/layer wiring; replay construction without a live dependency; adapter delegation; decision-trace agreement on fixtures; store corruption/error handling; package public imports |
| Deployment facts to monitor later | Filesystem atomicity; process crash windows; remote availability; host runtime/compiler versions; digest implementation behavior; secret handling |

## 4. Effect surface decision

The existing runtime surveys cover more of Effect than this slice requires.
The plan uses them to select an abstraction rather than reproduce the runtime.

| Effect surface | First-slice use | Lean treatment | Deferred risk |
| --- | --- | --- | --- |
| `Effect` sequencing | Compose orchestration and adapter calls | Small reified `return`/`call`/`bind` program or an explicitly selected handler algebra | Arbitrary callbacks and runtime primitives |
| `Context.Service` | Public CAS, replay, and wrapped-service interfaces | Abstract finite environment of typed handlers | String-key collisions, References, runtime overlay/cache layout |
| `Layer` | Construct and substitute in-memory/live/replay adapters | Not modeled initially; layer wiring receives integration tests | Memoization, scope, dynamic layer replacement |
| `Schema` | Validate durable node, operation, request, outcome, error, and witness representations | Project-owned value relations and codec obligations; no digest-byte authority | Full SchemaAST and effectful transformations |
| `Exit` / `Cause` | Retain success versus admitted typed failure | Initial two-case outcome with a later embedding into richer causes | Defects, interruption, annotations, finalizer failures |
| `Ref` or `SynchronizedRef` | Possible implementation carrier for session state | Explicit immutable replay state and transition function | Concurrency and atomic multi-step updates |
| `Clock`, `Random`, `Schedule` | Rejected in conforming orchestration; replay-mode tripwire defaults surface ambient use | Absent from the first model | Default services and jitter bypass the visible `R` requirements |
| `Crypto` or platform digest | Concrete digest adapter | Abstract address function with Level-0 laws and explicit Level-1 `hInj` | Concrete algorithm, collisions, and host/FFI behavior |
| `Scope`, `Fiber`, `Scheduler` | Excluded | Absent | Resources, cancellation, nondeterminism |
| `unstable/eventlog`, `unstable/persistence`, `unstable/workflow` | Prior-art inspection only | No semantic authority | Version-sensitive dependency and mismatched workflow contract |

The runtime report's T3 recommendation is adopted narrowly: service lookup is
modeled as an abstract typed map. Context overlays, cache roots, and fiber cache
refresh are implementation facts relevant only if a later conformance claim
observes them.

## 5. Module architecture

Each module should expose one small interface and hide representation,
normalization, and adapter complexity behind it.

```text
Operation description ----+
                           |
CAS node/codec --------+   |
                       v   v
                  Replay reducer
                       |
          +------------+-------------+
          |                          |
      Replay service           model fixtures
          |
    wrapped service adapter
          |
       user program

CAS store <----- replay service
```

### Candidate TypeScript modules

Names remain provisional until the domain contract is ratified.

| Module | Interface responsibility | Hidden implementation |
| --- | --- | --- |
| Operation | Define a replayable operation and its Schemas/admission class | Type inference helpers, revision validation, canonical request encoding |
| CAS node | Validate, encode, and identify immutable `data + references` nodes | Canonical field order, domain separation, digest input construction |
| CAS store | Store and retrieve nodes by identifier | In-memory map first; filesystem/remote adapters later |
| Decision | Define the reducer's decision cases and normalized trace | Case constructors, trace encoding, and derived projections such as live invocation |
| Replay reducer | Pure transition from state and request to decision, result, and new state | Flat cursor, decision trace, mismatch, and exact-consumption rules |
| Replay service | Expose reducer-driven operations in Effect and own a session | `Ref`/state carrier, store calls, Schema errors |
| Service adapter | Kit constructor producing the live role tag plus record/replay constructions for one described service | Method interception, operation-to-method routing, runtime wrap brand |
| Witness | Finalize and encode replay evidence | Root assembly and observation normalization |

### Public interface constraints

- A pre-existing service can be wrapped only with explicit method/operation
  descriptions; TypeScript reflection is insufficient.
- One kit constructor per described service mints an internal live role tag
  and returns the record and replay constructions; a by-value overload builds
  on it. Wrapper bodies never resolve the public tag — a named defect with a
  must-fail fixture.
- Wrapped services carry a runtime string-keyed brand checked at construction;
  double wrapping is rejected with a typed error, never normalized. Type-level
  brands are ruled out by caller-facing type identity.
- The replay-mode adapter constructor must not require or receive the live
  service. Its Effect environment contains replay dependencies only. Record
  construction receives the live service separately. Capturing a live reference
  before replay construction is a named residual risk and a rejected design.
- The caller-facing service method types should not expose CAS internals.
- CAS storage failures and replay mismatches remain distinct typed errors.
- Replay rejections, violations, and record-mode append failures travel from
  wrapped methods to the session boundary through a named defect-class
  transport seam; caller-facing method types stay byte-identical across
  live, record, and replay modes.
- Digest pre-images come only from the project-owned framed canonical encoder;
  Schema's default JSON encoding is never hashed.
- Layer constructors accept dependencies; they do not create hidden global
  stores or host capabilities.

### Proposed repository shape

Use one mixed-language project until independent release lifecycles justify a
workspace split:

```text
library/effects/
  IMPLEMENTATION-PLAN.md
  CONFORMANCE-WORKFLOW.md
  README.md
  package.json                 # added at implementation milestone M1
  bun.lock                     # exact versions, added with package.json
  tsconfig.json
  src/
    Operation.ts
    CasNode.ts
    CasStore.ts
    Decision.ts
    ReplayReducer.ts
    Replay.ts
    ServiceAdapter.ts
    Witness.ts
    index.ts
  test/
    CasNode.test.ts
    ReplayReducer.test.ts
    ReplayService.test.ts
    ServiceComposition.test.ts
    ModelFixtures.test.ts
  Effects.lean
  Effects/
    Value.lean
    Cas.lean
    Signature.lean
    Program.lean
    History.lean
    Replay.lean
    Interpreter.lean
    Laws.lean
    Fixtures.lean
  research/
```

M1 resolutions: the package is `@foldlab/effect-replay` (private), exports
flow through `src/index.ts`, the compiler is the admitted `typescript@5.9.2`
with `@effect/tsgo` deferred until its native port stabilizes (adoption is a
re-admission event per the tool register's version-drift rule), and the
Effect dependency is exact `effect@4.0.0-rc.111`, whose manifest names the
pinned provenance revision it targets. The test harness is vitest with
`@effect/vitest`, both exact-pinned — the `@effect/vitest` version equals
the pinned effect rc, from the same monorepo commit. Source and test trees
typecheck under separate configurations, both strict.

## 6. Lean semantic plan

### Chosen semantic level

Model a project-owned, sequential, first-order operation language and replay
machine. Do not model raw Effect objects, Context overlays, Layer construction,
JavaScript closures, or a JavaScript heap.

The minimum useful model has:

- a typed operation signature family;
- a free sequential program or another explicitly selected reified handler
  syntax;
- explicit handlers/environments;
- canonical CAS nodes and references;
- histories with distinct logical occurrences;
- record and replay modes;
- a total pure reducer returning decisions and new state;
- a derived transition relation with an agreement obligation; and
- an interpreter that threads replay state through program composition.

The TypeScript reducer is a manual mirror for the first slice. It must remain
small enough for line-by-line review, with complexity represented as explicit
decision data rather than hidden control flow. Lean-to-TypeScript generation is
a later extraction lane, not an M1–M6 dependency.

### Dependency-ordered declaration DAG

Exact names and types are pending Pass B.

```text
Value / canonical bytes
  |
  +--> node kinds / references / raw nodes
  |       |
  |       +--> node well-formedness / canonical encoding / abstract address
  |
  +--> operation signature
          |
          +--> request / typed outcome / operation policy
          |       |
          |       +--> invocation / history entry / occurrence identity
          |                    |
          |                    +--> history well-formedness / flat cursor
          |
          +--> sequential program / handler environment
                               |
                               +--> direct interpreter

mode / replay state / decision / mismatch
          |
          +--> reducer step / multi-step run / terminal witness
                               |
                               +--> replaying handler transformer
                                             |
                                             +--> program replay interpreter
                                                           |
                                                           +--> laws and fixtures
```

### Provisional theorem inventory

The names below are planning handles, not frozen declarations.

CAS and codec:

- canonical encoding is deterministic;
- decoding canonical bytes round-trips admitted nodes;
- normalization is idempotent;
- every stored reference of a well-formed graph resolves within the declared
  closure;
- storing the same admitted node yields the same abstract address at Level 0;
- pre-image kind/version separation and equal-encoding deduplication require no
  hash premise;
- address equality reflects admitted node equality only with explicit
  `hInj : Injective H`; and
- concrete collisions are characterized rather than excluded by a theorem.

Replay state:

- pending well-formedness obligation: every reducer step from an admitted
  state produces an admitted state/history pair;
- substitution replay is deterministic;
- the reducer's decision stream is deterministic for a fixed admitted input;
- a matching request consumes exactly one permitted occurrence;
- a mismatch consumes no later occurrence and produces a typed rejection;
- replay-mode traces never select the live-delegation decision;
- successful complete replay consumes exactly the declared history;
- record mode extends history by one occurrence while leaving its prefix
  unchanged;
- identical invocation content does not collapse distinct occurrences;
- an append-failed record session admits no further occurrences, and its
  history is a prefix of the record-mode trace; and
- terminal histories reject ordinary appended entries.

Composition:

- interpretation respects `return` and sequential `bind` across both outcome
  cases (success and typed failure);
- wrapping a handler commutes with sequential program interpretation under
  explicit state threading;
- extending the environment with an unrelated service leaves existing
  observations unchanged;
- transparent orchestration retains the declared ordered observations of
  wrapped leaf calls;
- double wrapping is rejected or normalized according to one ratified policy.

Framed child histories and opaque substitution of an outer orchestration
service are deferred to the M7 extension list and are not part of the M3–M5
theorem inventory.

The machine/direct agreement theorem for this slice should compare the reified
program interpreter with the reducer-driven interpreter, not with arbitrary
JavaScript execution.

### Representation questions for Pass B

1. Are operation signatures intrinsic indexed families or raw descriptions
   checked into an indexed representation?
2. Is occurrence identity structural `(execution, index)` data, a node address,
   or a separate nonce?
3. Which exact framing and scalar encodings instantiate the project-owned
   canonical digest pre-image?
4. Which parts of Schema encoding are modeled directly and which are external
   checked translations?
5. Do the effects CAS kinds instantiate the pre-grade machine algebra directly,
   or discharge a deliberately forked copy of its obligation shapes?
6. If the opaque extension is admitted at M7, does an opaque outer occurrence
   retain one child-root reference or an exact start/end interval?

## 7. Obligation ledger

IDs are provisional planning identifiers.

| ID | Obligation | Evidence target | Negative/falsification case | Trust boundary |
| --- | --- | --- | --- | --- |
| `CAS-001` | Project-owned canonical node encoding has one byte representation per admitted node | Lean model theorem plus Schema boundary fixtures | same node encodes differently by property order or Effect version | codec implementation |
| `CAS-002` | Graph admission rejects dangling or wrong-kind references | Lean theorem and TS negative tests | missing referenced node loads successfully | store adapter |
| `CAS-003` | Every address law is assigned to hash Level 0 or carries explicit Level-1 `hInj`; no theorem occupies Level 2 | theorem signatures and docs review | collision resistance appears as an axiom or unnamed premise | concrete digest |
| `RPL-001` | Replay is deterministic for fixed admitted state/request | Lean theorem | two permitted decisions from one state | none beyond model |
| `RPL-002` | Replay-mode decision traces never select live delegation, and replay construction has no live-service requirement | Lean theorem at M3; layer typecheck and controlled TS fake at M4 | live dependency appears in replay construction or live counter increments | service adapter/runtime |
| `RPL-003` | Matching consumes exactly the permitted occurrence | Lean theorem and fixtures | skip, duplicate, or reuse one occurrence | reducer mirror |
| `RPL-004` | Mismatch fails closed | Lean theorem and integration test | missing entry falls back to live adapter | adapter wiring |
| `RPL-005` | Completion rejects unconsumed suffix entries; the rejection carries the program's terminal so far | Lean theorem and fixture | same final value hides an extra history call | observation normalizer |
| `SES-001` | Record-mode append failure aborts the session through the transport seam; histories are truthful prefixes, never gapped subsequences | Lean record-mode theorem and fault-injection integration test | a caught store error lets later appends continue | transport seam and session state |
| `SES-002` | Every reducer step preserves session-state well-formedness | Lean WF-PRESERVE instance | a step drives the cursor outside the history or breaks the record-mode cursor pin | none beyond model |
| `CMP-001` | Sequential interpretation threads replay state compositionally across success and typed-failure outcomes | Lean bind/interpreter law over both cases | nested call resets or forks the cursor | session state carrier |
| `CMP-002` | Identical requests remain separate occurrences | Lean theorem and repeated-call fixture | CAS deduplication shortens history | CAS storage versus history seam |
| `CMP-003` | Deferred to M7: transparent and opaque policies have distinct, declared framed traces | two semantic rules and tests, when admitted | outer substitution silently leaves child cursor inconsistent | policy adapter |
| `CTX-001` | Wrapped service construction supplies the same caller-facing interface without recursive lookup | TypeScript typecheck and layer integration tests | wrapper resolves itself as its live dependency | Context/Layer wiring |
| `CTX-002` | Conforming orchestration cannot consult default Clock/Random behavior; replay-mode tripwires surface ambient use as a `Violated` outcome | conformance rule, tripwire defaults, and negative integration fixtures | jittered retry or default time/random changes the trace | Effect default services |
| `ADM-001` | G2 traceability distinguishes reified Lean-program quantification from discipline-conforming TypeScript orchestration | contract review and claim matrix | model theorem is presented as universal over ordinary TS programs | source-admission boundary |
| `BRG-001` | Model fixtures and TS reducer compare one declared normalized decision trace | generated manifest and differential suite | comparator drops live-delegation or mismatch decisions | manual reducer mirror |
| `BRG-002` | Pinned Effect integration agrees on the enumerated domain | reproducible G4 observations | runtime/version/config drift | compiler, bun/node, Effect runtime |
| `DUR-001` | No exactly-once claim crosses the live-action/history-append crash gap | contract review and fault test | external action succeeds, append fails | external system and persistence |
| `PRJ-001` | Value-descriptor identity is explicit and checked: kind tag and revision are declared, and reading verifies the expected root kind | TypeScript typecheck and fixtures | a root of another kind decodes silently | CAS store |
| `PRJ-002` | A value round-trips through its descriptor: get after put returns the declared domain canonicalization | TypeScript round-trip fixtures; Lean CODEC lift deferred until the declared encoding is modeled | a lossy or renormalizing read | declared canonical value encoding |
| `PRJ-003` | A payload failing the descriptor's schema is rejected with a typed projection error distinct from the CAS error family and the mismatch taxonomy | TypeScript fixtures | a decode failure surfaced as StoreFailure or swallowed | projection codec failure taxonomy |
| `PRJ-004` | Fixed-root hydration matches by-value construction: the layer builds the same caller-facing shape, construction errors stay on the layer, and method error unions never widen | TypeScript typecheck and integration fixtures | hydration widens a method error union or hides a construction failure | service kit and CAS store |
| `PRJ-005` | Hydrated record construction stays non-recursive and single-wrapped: layerAs targets the internal live role only, never resolves the public wrapper, and double wrapping stays rejected | must-fail TypeScript fixtures | the wrapper resolves its public tag or accepts a wrapped live role | service kit |
| `PRJ-006` | Equal roots imply no stronger value equality than the hash-hypothesis lattice permits | standing review rule | prose or API implying content equality from address equality | hash-hypothesis lattice |
| `RMT-001` | No remote-loaded node reaches the cache or the caller without passing standard admission; a wire-supplied digest is a routing hint, never an identity | Lean TRACE-EXCLUDES instance and TS fixtures | a node cached or returned before admission | remote client machine |
| `RMT-002` | Declared sizes and counts are checked against declared budgets before any hashing or decoding | Lean FAIL-CLOSED instance (no verification or admission decision past budget) and R2 TypeScript streaming-budget fixtures (declared oversize prevents body consumption; a byte counter stops underreported or chunked bodies) | an oversized declaration reaches hashing or decoding | exchange-alphabet budgets; key-count budget at R3 |
| `RMT-003` | An integrity failure is terminal for those bytes: no wire attempt ever repeats unchanged content | Lean TRACE-EXCLUDES instance | a retry decision with unchanged bytes after integrity rejection | remote client machine |
| `RMT-004` | An already-present exact-digest upload resolves as success with zero additional transfer commands | Lean EXACT-STEP instance | a duplicate upload emits a transfer command | find-missing negotiation |
| `RMT-005` | No admission or publication decision is taken on a presence answer alone, and absence is never negatively cached by default | Lean TRACE-EXCLUDES instance | presence alone admits, publishes, or writes a negative cache | presence semantics |
| `RMT-006` | A batch response accounts for every requested key per-key; an unaccounted or misaligned key fails the batch closed with no cross-key substitution | Lean FAIL-CLOSED instance | a misaligned batch partially succeeds or substitutes across keys | batch protocol |
| `RMT-007` | Children upload before parents and the root publishes last; server acceptance of a parent never implies closure | Lean TRACE-EXCLUDES instance | a root-publish command precedes a child's confirmed upload | upload ordering |
| `RMT-008` | At any declared interruption point, no partial node is admitted, no root is published, and resources are closed | Lean FAIL-CLOSED instance over scheduled interruptions | an interruption leaves a partial admit or a published root | fault schedule |
| `RMT-009` | Interrupted transfers resume only from a re-queried, server-reported committed offset, tolerating regression | Lean FAIL-CLOSED instance | a resume from a locally remembered offset | resume protocol |
| `RMT-010` | Retries are bounded by declared policy, rendered as decisions, and never repeat a non-idempotent wire attempt | Lean TRACE-EXCLUDES instance | an unbounded or non-idempotent retry | retry policy |
| `RMT-011` | Server-declared limits are discovered at layer acquisition and honored by splitting or rerouting | TypeScript typecheck and fixtures | a hardcoded limit exceeds a declared capability | capability probe |
| `RMT-012` | Verification and credential scope are independent of transport origin; credentials never cross redirect hosts | TypeScript fixtures | a credential follows a redirect or verification depends on origin | transport shell |
| `RMT-013` | Presence-style operations carry a namespace; no global existence query exists on the surface | standing review rule | a global does-this-digest-exist call | API review |
| `RMT-014` | Batch framing, capability documents, and presence indexes parse fail-closed with the same posture as node bytes | Lean FAIL-CLOSED instance and TS fixtures | malformed control state partially applied | control-state codecs |
| `RMT-015` | A successful remote load implements the logical admitted-node load | Lean AGREEMENT instance | a remote load succeeding with a node the logical load would not produce | AGREEMENT family |
| `RMT-016` | A local admitted-node hit is observationally equivalent to a successful remote load for immutable nodes | Lean AGREEMENT instance | a cache hit observably diverging from the remote answer | cache discipline |

## 8. Test and evidence strategy

The layers below are stages of the ratified dual-lane loop
([`CONFORMANCE-WORKFLOW.md`](CONFORMANCE-WORKFLOW.md)): layers 5–6 belong to
the conformance lane, layers 1–4 and 7 to the implementation lane, with the
versioned ratified manifest as the only coupling.

### Test layers

1. **Pure TypeScript tests:** reducer, node admission, canonicalization, cursor,
   mismatches, and witness construction.
2. **Schema laws:** construction, decode/encode, supported round trips, malformed
   nodes, and stable error categories.
3. **Effect integration tests:** service lookup, layer substitution, isolated
   sessions, typed failure propagation, and controlled live-adapter counters.
4. **Composition tests:** orchestration calling two wrapped leaf services,
   repeated identical calls, transparent nesting, and recovery after a
   substituted typed failure. Opaque subtree skipping begins with the M7
   extension.
5. **Lean examples and theorems:** positive witnesses, invalid examples, state
   invariants, reducer laws, and composition laws.
6. **Differential fixtures:** one versioned case manifest interpreted by the
   Lean model and manually mirrored TypeScript reducer, comparing ordered
   decision traces while retaining raw and normalized results separately.
7. **Pinned runtime observations:** public Effect imports only; results remain
   sampled G4 evidence unless a source translation is proved.

Use `effect/testing` FastCheck for domain properties beyond built-in Schema
assertions. Pin seeds and run counts for reproducibility. Tests involving state
use explicit `Ref`, `Deferred`, `Queue`, or test hooks; no wall-clock sleeps are
allowed in the initial suite.

### Fixture families

- empty history and terminal success;
- one success and one typed failure;
- orchestration recovery after a substituted typed failure;
- nested sequential calls;
- repeated identical invocations;
- wrong operation identity or revision;
- wrong request payload;
- invalid outcome Schema;
- missing entry and extra suffix entry;
- corrupt/dangling CAS reference;
- transparent orchestration with replayed leaves;
- forbidden or deterministically overridden Clock/Random/default-service use;
- store failure before append and after live completion;
- a session structurally aborted by an append failure, its truthful prefix
  retained; and
- attempted double wrap, and ambient host access inside supposedly conforming
  orchestration.

Framed-history fixtures for opaque outer substitution arrive with the M7
extension, not before.

Generated observations must be reproducible from declared sources through mise
tasks. Handwritten scenarios may be canonical inputs; derived snapshots may not
be silently hand-maintained.

## 9. Staged implementation

### M0 — ratify the contract

Status: completed 2026-08-26. The vocabulary and rulings landed in
`docs/effect-replay/CONTEXT.md`; the deliverables below stand as the record of
what was decided.

Deliverables:

- domain-modeling pass over the objects, operations, observations, and
  equalities in section 3;
- grilling pass over every positive, negative, boundary, and overclaim case;
- accepted vocabulary in the owning Context document;
- decision whether to instantiate the machine algebra or deliberately fork its
  pre-grade obligation shapes;
- adoption of the Level-0/Level-1/empty-Level-2 hash discipline;
- decisions for flat-history occurrence identity, leaf-substitution semantics,
  the request-compatibility versus outcome-admissibility split, project-owned
  digest framing, and first codec premises;
- explicit acceptance of the no-program-identity weakening and the Lean/TS
  quantifier mismatch;
- ambient Clock/Random/default-service admission policy;
- ratified placement of a mixed TypeScript/Lean package under `library/`,
  followed by the required `AGENTS.md` orientation update; and
- approved Pass-A declaration and obligation ledgers.

Exit:

- every public target has an informal meaning and falsification route;
- no pending representation question silently changes a theorem target; and
- the README may then describe the selected scope as more than proposed.

### M1 — bootstrap the TypeScript package and freeze foundational interfaces

Status: completed 2026-08-26. Three workflow-scaffolding items are deferred
into the milestones where their consumers land: the manifest printer and
generator plus the mutation tasks and quarantine grep arrive with the first
model slices (M2/M3), and the ledger transition-legality check arrives with
the first status flip.

Deliverables:

- package manifest, exact `effect`, TypeScript, and `@effect/tsgo` versions,
  lockfile, TypeScript configuration, public exports, test runner, and mise
  tasks;
- Source Lock expansion for Effect files used by service/layer integration —
  candidates enumerated by the 2026-08-26 service verification: `Context.ts`,
  `References.ts`, `Clock.ts`, `Random.ts`, `Schedule.ts`, `Effect.ts`,
  `Layer.ts`, `Schema.ts`, `Exit.ts`, `Cause.ts`, `internal/effect.ts`;
- Schema declarations for operation descriptions, CAS nodes, typed outcomes,
  replay modes, and mismatches;
- interface review for the CAS store, replay service, and live/record/replay
  adapter constructors;
- replay-mode construction whose environment has no live-service requirement;
- the conformance-workflow scaffolding per the ratified
  [`CONFORMANCE-WORKFLOW.md`](CONFORMANCE-WORKFLOW.md): the eight
  schema-bundle templates (statement, sentence, kit) in Lean, the canonical
  manifest printer and generator, the mutant quarantine layout with its gate
  grep, the conformance-ledger and briefing generators with the
  transition-legality check, and the mise task growth
  (`gen`/`check:effects:mutation`/`brief:effects`) — the two harness rows
  landed in `TOOLS.md` at ratification; and
- a mise task that refreshes the requested `research/docs/` snapshots from
  their canonical owners and checks byte equality without admitting the copies
  as authorities.

Exit:

- typecheck/Effect diagnostics and empty test suite pass;
- one Effect version is resolved;
- package payload is intentional;
- no implementation choice has become semantic authority by accident; and
- history and witness Schemas remain internal and explicitly subject to an M3
  re-freeze.

### M2 — CAS value vertical slice

Deliverables:

- raw and admitted CAS node representations;
- project-owned framed canonical encoder/decoder and abstract address
  interface; Schema supplies validation but not digest bytes;
- in-memory store adapter;
- Lean CAS carriers, well-formedness, canonicalization, and address premises;
- a mapping from the effects obligations to machine O1–O17, whether by direct
  instantiation or deliberate fork;
- positive/negative Schema and property tests; and
- corruption and dangling-reference errors.

Exit:

- `CAS-001` through `CAS-003` are established for the model or visibly
  pending with exact theorem statements;
- the TS adapters pass their declared tests; and
- no cryptographic or durability conclusion is inferred from the model.

### M3 — pure replay vertical slice

Deliverables:

- flat history, cursor, mode, decision-trace, mismatch, and witness
  representations;
- small manually mirrored TypeScript reducer plus a line-by-line correspondence
  review;
- Lean total reducer, derived transition relation, their agreement obligation,
  replay state/interpreter, and provisional theorem set;
- exact matching, no-fallback, repeated-occurrence, recovery-after-replayed-
  failure, and suffix fixtures;
- history and witness interface re-freeze after their selected representations
  pass review; and
- differential case manifest between Lean and TypeScript.

Exit:

- `RPL-001` through `RPL-005` hold for the Lean model with axiom report;
- TS property tests and differential fixtures pass;
- model results and implementation observations retain separate gate labels.

### M4 — Effect service and adapter vertical slice

Deliverables:

- replay service and session layer;
- distinct live, record, and replay construction roles, with no live dependency
  available to replay construction;
- helper for lifting one existing Effect service through operation
  descriptions;
- transparent orchestration and substituted leaf operations;
- integration fakes exposing live invocation counts;
- typed mapping of CAS, decode, live-service, and mismatch failures;
- replay-mode tripwire defaults for Clock and Random; and
- negative fixtures for Clock, Random, and jittered scheduling surfacing as
  `Violated` session outcomes.

Exit:

- `CTX-001`, `RPL-002`, and `RPL-004` pass at the TypeScript interface;
- replay construction neither requires nor receives the live adapter, and no
  captured live reference is permitted;
- the same caller program runs under live, record, and replay layers.

### M5 — compositional chaining

Deliverables:

- two independent described leaf services and one orchestration service;
- shared-session state threading across nested calls;
- Lean handler/environment extension and bind laws; and
- composition fixtures covering repeats, nested failure, recovery, and
  mismatches.

Exit:

- `CMP-001` and `CMP-002` hold for the selected model;
- a replayed orchestration consumes the expected nested history;
- outer opaque substitution stays on the M7 extension list and does not block
  the transparent core.

### E2–E3 — ergonomics lane (descriptor slices)

Ratified at the descriptor Pass A (2026-08-27) and sequenced after M5,
before M6, so the correspondence gate documents the improved surface.
Working design: leaf-first value descriptors over the declared canonical
encoding; typed roots that never bypass runtime kind validation; the
projection codec failure taxonomy outside the CAS error family; eager
fixed-root service hydration with `layerAs` targeting the kit's internal
live role. The implementing packet also carries the ratified
session-result widening and the replay tracer-timing rider.

E2 deliverables:

- `Cas.value` with typed `put`/`get` over the in-memory store;
- the declared canonical JSON encoding of the Schema's Encoded form —
  documented, versioned by descriptor kind tag and revision, and making
  no cross-claim with the Lean printer;
- the projection codec failure taxonomy; and
- the `PRJ-001` through `PRJ-003` fixtures.

E3 deliverables:

- `Cas.service` with eager `layer(root)` and `layerAs(tag, root)`;
- hydrated record construction demonstrated against a replayable kit; and
- the `PRJ-004` and `PRJ-005` must-fail fixtures.

Exit:

- `PRJ-001` through `PRJ-005` evidenced at the TypeScript interface;
- `PRJ-006` standing; and
- replay semantics, manifests, and the Lean model unchanged.

### R1–R6 — remote lane (ratified at the remote Pass A)

Sequenced after the ergonomics lane and before M6, so the
correspondence gate documents the full surface. Design authority:
[`research/remote-cas-conformance-design.md`](research/remote-cas-conformance-design.md)
over the prior-art compendium. Architecture, as ratified: a sans-io
remote client decision machine over the abstract exchange alphabet
(never HTTP); fault schedules as manifest fixture data executed by the
model, with schedule-vector rows landing additively under the
unchanged declared model version; the four evidence lanes with the
existing flip mechanics (instances, tsSide evidence list,
declared-evidence entries for the property and live lanes); one
declared mutant per falsification case in both directions.

- **R1** — the exchange alphabet and client machine in Lean, the
  schedule-vector emitter, and the `RMT-001`–`RMT-003` instances and
  mutants.
- **R2** — the single-operation TypeScript baseline: sans-io core,
  thin shell, deterministic fake-remote; `RMT-004` and the first
  AGREEMENT instance (`RMT-015`); RMT-002's shell half (a streaming
  byte counter so a declared oversize is never read or buffered).
  R2's architecture, per the R1 review corrections: the deep seam
  `CasStore → verified semantic adapter → RemoteCasTransport →
  HttpClient`, with the raw transport never a `CasStore`, canonical
  decoding and address verification enforced by the semantic adapter,
  and graph closure either a named backend capability (pin, lease, or
  transactional publication) or an explicitly weaker graph-publication
  capability; retries and redirects decided by the semantic core,
  never the HTTP shell (`HttpClient.retryTransient` and
  `followRedirects` are prohibited at this seam); typed remote errors
  replacing the catch-all store failure (not-found, unauthenticated,
  denied, rate-limited, capacity, protocol violation, oversize body,
  integrity rejection, indeterminate upload); explicit authority modes
  (remote-authoritative, local-authoritative, offline) with no silent
  fallback; and concurrency by client-assigned operation identifiers
  matching the machine — never ambient fiber identity.
- **R3** — batching and closure: `RMT-005`–`RMT-008`, `RMT-014`.
- **R4** — policy: `RMT-009`–`RMT-012`, `RMT-016`.
- **R5** — the property/state-machine lane, entering as declared
  evidence.
- **R6** — the live lane and one real backend layer under scoped
  acquisition; the section-4 `Scope` row amendment lands here.

Exit:

- every `RMT` row green or standing;
- no HTTP, TLS, wall-clock, or server internals in the Lean model; and
- no recorded transcript ever serves as a schedule.

### M6 — correspondence and public library gate

Deliverables:

- versioned fixture generator and observation normalizer;
- reproducible G4 differential suite against the pinned Effect build;
- claim matrix linking each public statement to its highest gate;
- package documentation and examples that state exclusions; and
- public-package dry run with exact files and dependency metadata.

Exit:

- the published claim is limited to proved model laws plus observed agreement
  on the stated implementation domain;
- G3 remains pending unless an admitted source fragment and translation theorem
  exist;
- no compiler or hosted-execution conclusion is implied.

### M7 and later — controlled extensions

Add one semantic dimension per milestone:

1. framed histories and opaque substitution of an outer orchestration
   operation;
2. defect and interruption distinctions;
3. sequential Scope/finalizer behavior;
4. crash-aware journaling and filesystem CAS (write-ahead intent entries
   narrow, never close, the crash gap);
5. ActionIndex with an explicit recomputation/cache consumer;
6. checkpoints and retention;
7. nondeterministic choice; and
8. fibers, causal histories, races, and cancellation.

Each extension re-enters Pass A and receives its own observation profile,
counterexamples, theorem delta, fixtures, and claim gate. Concurrency does not
reuse a sequential list history without adding event identity, causality, and
conflict semantics.

## 10. Claim and correspondence plan

| Gate | Planned statement class | Required work |
| --- | --- | --- |
| G0 | Exact Effect and external source bytes selected | Extend Source Lock with used runtime/service files and receipts |
| G1 | Named laws hold for the Lean CAS/replay definitions | Kernel-checked theorems, pinned toolchain, imports, axiom report |
| G2 | The Lean model implements the ratified CAS/replay contract | Traceability, reviewed quantifiers, examples, counterexamples, observables |
| G3 | An admitted source fragment translates to the model | Accepted-source judgment, translation, and theorem over the named source/model relation |
| G4 | Pinned Effect/TypeScript implementation agrees on a stated domain | Reproducible differential fixtures and normalized observations |
| G5 | Compilation-relation claim for emitted JavaScript | Pinned compiler/configuration and source/target relation |
| G6 | Hosted-execution relation for a named engine and host | Host contracts, versions, runtime evidence or proof |

M0–M5 target G1/G2 for the model and ordinary implementation tests. M6 targets
carefully worded G4 evidence. G3 is not assumed to occur before G4 because a
differential test suite can exist without a proved source translation; the
gate labels remain independent and no later observation promotes an earlier
bridge automatically.

The G2 traceability matrix must state that the Lean theorem ranges over the
reified admitted program carrier, while ordinary TypeScript orchestration is
only discipline-conforming in the first release. No wording may silently replace
the former quantifier with "all Effect programs" or "all programs using the
service."

## 11. Stop conditions and risks

Stop and return to the contract if:

- an arbitrary closure or `Effect` object is treated as serializable program
  identity;
- an operation lacks request, success, and typed-failure representations;
- a replay mismatch falls through to a live adapter;
- replay-mode construction requires, receives, or captures a live adapter;
- ActionIndex is introduced before recomputation/cache mode supplies a real
  consumer;
- orchestration consults a default Clock/Random service or jittered schedule
  without mediation or an explicitly selected deterministic override;
- Schema's default JSON encoding is used as a digest pre-image;
- a witness or compatibility check implies a program identity that the slice
  does not carry;
- Context or Layer internals enter Lean declarations without a declared
  observation requiring them;
- defects, interruption, or finalizer failure are collapsed into typed failure;
- persistence wording implies exactly-once behavior across the live/append
  crash gap;
- a TypeScript test result is described as a Lean or translation theorem;
- concurrency begins before causal and cancellation observations are frozen;
  or
- a generated or external tool output enters gated work without a registered
  role and trust statement.

Primary risks:

| Risk | Mitigation |
| --- | --- |
| Service wrapping appears generic but cannot encode method semantics | Require explicit operation descriptions and stable rejections |
| Wrapper recursively resolves the service it is constructing | Separate live/public construction roles and test the layer graph |
| Replay wrapper can still reach live behavior | Give replay construction no live dependency and reject captured references |
| CAS reuse collapses repeated calls | Keep invocation content and occurrence history as separate nodes |
| Model/TS reducer drift | Shared versioned fixtures, differential tests, and independent review |
| Hash or codec is treated as mathematical authority | Use the Level-0/Level-1/empty-Level-2 lattice and keep concrete adapters outside model claims |
| Schema JSON bytes drift across Effect versions | Hash only the project-owned framed canonical encoding |
| Default Clock/Random services bypass visible requirements | Reject them in conforming orchestration; tripwire defaults in replay mode |
| Replay history is mistaken for program identity | State the weakening in the contract, witness, fixtures, and G2 matrix |
| Crash after live effect but before append | Make the gap observable; prohibit exactly-once language |
| Unstable Effect workflow/eventlog APIs dictate the contract | Use only as version-sensitive prior art; own the public interface |
| Scope expands to arbitrary Effect programs | Enforce the described leaf-operation boundary and retain the ambient-effect counterexample |

## 12. Decisions ratified before M1 (2026-08-26)

The M0 grilling session resolved every open decision:

1. **Machine relationship:** deliberate fork of the machine's obligation
   shapes; no Lake or code dependency on `library/machine`; the hash lattice
   is adopted; the M2 mapping table is the standing correspondence audit;
   convergence to instantiation is expected only after the machine algebra is
   itself ratified.
2. **Names and context:** the Effect Replay context is minted at
   `docs/effect-replay/CONTEXT.md`, fully independent of the Entity Store
   context, with four lexical rules (compound-named admission judgments,
   "conforming" for discipline, no "verdict", "canonical" glossed).
3. **Canonical representation:** pre-image
   `versionByte ++ kindTag ++ frame(encode(canon node))`; one-byte kind plane;
   references inside the framed body as full-length addresses in declared
   order; no digest truncation; SHA-256 platform crypto as the first adapter;
   any pre-image-affecting change bumps the scheme version byte. Byte-level
   framing and scalar encodings are Pass-B work.
4. **Occurrence identity:** structural `(executionId, index)`;
   request-content-keyed reuse answering an occurrence is a named defect.
5. **Typed failures:** Schema-tagged data values in a channel-preserving
   success/failure envelope; nothing host-shaped is recorded.
6. **Service lifting:** one kit constructor per described service minting an
   internal live role tag; record requires the live role and replay service,
   replay requires the replay service only; runtime string-keyed brand checked
   at construction; double wrap rejects.
7. **Ambient policy:** reject-first; replay-mode tripwire Clock/Random
   defaults surfacing as `Violated` (mechanism verified against the pinned
   source, 2026-08-26); deterministic overrides deferred until a fixture
   demands one.
8. **Opaque substitution:** deferred to the M7 extension list; M5 is
   transparent chaining only.
9. **Package:** private until the M6 gate; name candidate
   `@foldlab/effect-replay`, final at M1.
10. **Placement:** mixed TypeScript/Lean tenant ratified under `library/`;
    the `AGENTS.md` orientation row is updated accordingly.
11. **Compilation-techniques PDF:** the local copy stays gitignored;
    paper-lock admission is queued for the papers-lock landing session; no
    estate citation until admitted.

The reducer strategy was closed before the session: a small manual TypeScript
mirror checked by normalized decision-trace fixtures. ActionIndex begins only
with a recomputation/cache consumer.

Every positive, negative, boundary, and overclaim case in section 3 was
grilled in the ratification session; the session-boundary transport, mismatch
taxonomy, session poisoning, tripwire policy, and construction-role rulings
recorded above and in the context document came out of those cases. M1 may
begin.
