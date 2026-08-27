# Effect-native CAS replay library — implementation plan

Status: Pass-A implementation plan, pending domain ratification, 2026-08-26
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

That sentence is a pending model-contract target, not a current claim. The
TypeScript side has a deliberately weaker first boundary: ordinary orchestration
is admitted by a documented discipline rather than by a source checker. G2
traceability must retain that quantifier mismatch. Its final quantifiers,
observations, and vocabulary require domain-modeling and grilling before any
declarations or public interface are promoted.

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

Names in this section are working role labels, not minted estate definitions.

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
- **Replay session:** replay mode, execution identity, history root, current
  flat-history cursor, ordered decision trace, and first mismatch if one occurs.
- **Service adapter:** an implementation of an existing Effect service
  interface that delegates each described operation through the replay
  service.
- **Replay witness:** immutable account of the mode, consumed history, decision
  trace, and terminal result or mismatch. It does not identify a program in the
  first slice.

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

Admitted orchestration must not perform ambient host effects or consult
Effect-provided default services such as Clock or Random except through a
described leaf operation. `R = never` is not treated as evidence of purity. The
first implementation either rejects time/random/jittered scheduling from the
admitted examples or provides explicitly selected deterministic overrides.

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
| G2 traceability limitation | Lean quantifies over reified admitted programs; ordinary TypeScript orchestration is admitted only by discipline until a source judgment exists |
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
| `Clock`, `Random`, `Schedule` | Forbidden in admitted orchestration unless mediated or deterministically overridden | Absent from the first model | Default services and jitter bypass the visible `R` requirements |
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
| Service adapter | Produce the original Effect service interface from a live implementation plus operation descriptions | Method interception and operation-to-method routing |
| Witness | Finalize and encode replay evidence | Root assembly and observation normalization |

### Public interface constraints

- A pre-existing service can be wrapped only with explicit method/operation
  descriptions; TypeScript reflection is insufficient.
- The live implementation and public wrapped service must occupy distinct
  construction roles, preventing accidental recursive lookup or double wrap.
- The replay-mode adapter constructor must not require or receive the live
  service. Its Effect environment contains replay dependencies only. Record
  construction receives the live service separately. Capturing a live reference
  before replay construction is a named residual risk and a rejected design.
- The caller-facing service method types should not expose CAS internals.
- CAS storage failures and replay mismatches remain distinct typed errors.
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

The npm package name, exports, compiler, `@effect/tsgo` setup, and exact Effect
dependency remain M1 decisions. All versions must be exact and the package
version must name the pinned Effect provenance revision it targets.

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
- identical invocation content does not collapse distinct occurrences; and
- terminal histories reject ordinary appended entries.

Composition:

- interpretation respects `return` and sequential `bind`;
- wrapping a handler commutes with sequential program interpretation under
  explicit state threading;
- extending the environment with an unrelated service leaves existing
  observations unchanged;
- transparent orchestration retains the declared ordered observations of
  wrapped leaf calls;
- double wrapping is rejected or normalized according to one ratified policy.

Framed child histories and opaque substitution of an outer orchestration
service are M5 obligations, not part of the M3 theorem inventory.

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
6. When M5 begins, does an opaque outer occurrence retain one child-root
   reference or an exact start/end interval?

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
| `RPL-005` | Completion rejects unconsumed suffix entries | Lean theorem and fixture | same final value hides an extra history call | observation normalizer |
| `CMP-001` | Sequential interpretation threads replay state compositionally | Lean bind/interpreter law | nested call resets or forks the cursor | session state carrier |
| `CMP-002` | Identical requests remain separate occurrences | Lean theorem and repeated-call fixture | CAS deduplication shortens history | CAS storage versus history seam |
| `CMP-003` | M5 transparent and opaque policies have distinct, declared framed traces | two semantic rules and tests | outer substitution silently leaves child cursor inconsistent | policy adapter |
| `CTX-001` | Wrapped service construction supplies the same caller-facing interface without recursive lookup | TypeScript typecheck and layer integration tests | wrapper resolves itself as its live dependency | Context/Layer wiring |
| `CTX-002` | Admitted orchestration cannot consult default Clock/Random behavior without mediation or deterministic override | admission rule and negative integration fixtures | jittered retry or default time/random changes the trace | Effect default services |
| `ADM-001` | G2 traceability distinguishes reified Lean-program quantification from discipline-admitted TypeScript orchestration | contract review and claim matrix | model theorem is presented as universal over ordinary TS programs | source-admission boundary |
| `BRG-001` | Model fixtures and TS reducer compare one declared normalized decision trace | generated manifest and differential suite | comparator drops live-delegation or mismatch decisions | manual reducer mirror |
| `BRG-002` | Pinned Effect integration agrees on the enumerated domain | reproducible G4 observations | runtime/version/config drift | compiler, bun/node, Effect runtime |
| `DUR-001` | No exactly-once claim crosses the live-action/history-append crash gap | contract review and fault test | external action succeeds, append fails | external system and persistence |

## 8. Test and evidence strategy

### Test layers

1. **Pure TypeScript tests:** reducer, node admission, canonicalization, cursor,
   mismatches, and witness construction.
2. **Schema laws:** construction, decode/encode, supported round trips, malformed
   nodes, and stable error categories.
3. **Effect integration tests:** service lookup, layer substitution, isolated
   sessions, typed failure propagation, and controlled live-adapter counters.
4. **Composition tests:** orchestration calling two wrapped leaf services,
   repeated identical calls, transparent nesting, and recovery after a
   substituted typed failure. Opaque subtree skipping begins at M5.
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
- store failure before append and after live completion; and
- attempted double wrap or ambient host access in an admitted example.

M5 adds framed-history fixtures for opaque outer substitution and child-root or
interval semantics.

Generated observations must be reproducible from declared sources through mise
tasks. Handwritten scenarios may be canonical inputs; derived snapshots may not
be silently hand-maintained.

## 9. Staged implementation

### M0 — ratify the contract

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

Deliverables:

- package manifest, exact `effect`, TypeScript, and `@effect/tsgo` versions,
  lockfile, TypeScript configuration, public exports, test runner, and mise
  tasks;
- Source Lock expansion for Effect files used by service/layer integration;
- Schema declarations for operation descriptions, CAS nodes, typed outcomes,
  replay modes, and mismatches;
- interface review for the CAS store, replay service, and live/record/replay
  adapter constructors;
- replay-mode construction whose environment has no live-service requirement;
  and
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
- admission checks or deterministic overrides for default services; and
- negative/default-override fixtures for Clock, Random, and jittered scheduling.

Exit:

- `CTX-001`, `RPL-002`, and `RPL-004` pass at the TypeScript interface;
- replay construction neither requires nor receives the live adapter, and no
  captured live reference is permitted;
- the same caller program runs under live, record, and replay layers.

### M5 — compositional chaining

Deliverables:

- two independent described leaf services and one orchestration service;
- shared-session state threading across nested calls;
- optional framed-history extension for opaque substitution of an outer
  orchestration operation;
- Lean handler/environment extension and bind laws; and
- composition fixtures covering repeats, nested failure, recovery, mismatches,
  and—if admitted here—opaque subtree skipping.

Exit:

- `CMP-001` and `CMP-002` hold for the selected model;
- a replayed orchestration consumes the expected nested history;
- if outer opaque substitution is admitted, `CMP-003` holds and its child-
  history rule is explicit; otherwise it remains deferred without blocking the
  transparent core.

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

1. defect and interruption distinctions;
2. sequential Scope/finalizer behavior;
3. crash-aware journaling and filesystem CAS;
4. ActionIndex with an explicit recomputation/cache consumer;
5. checkpoints and retention;
6. nondeterministic choice; and
7. fibers, causal histories, races, and cancellation.

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
only discipline-admitted in the first release. No wording may silently replace
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
| Default Clock/Random services bypass visible requirements | Reject or deterministically override them in admitted orchestration |
| Replay history is mistaken for program identity | State the weakening in the contract, witness, fixtures, and G2 matrix |
| Crash after live effect but before append | Make the gap observable; prohibit exactly-once language |
| Unstable Effect workflow/eventlog APIs dictate the contract | Use only as version-sensitive prior art; own the public interface |
| Scope expands to arbitrary Effect programs | Enforce the admitted leaf-operation boundary and retain the ambient-effect counterexample |

## 12. Decisions required before M1

The next ratification session must decide:

1. whether effects CAS kinds instantiate the pre-grade machine algebra or
   deliberately fork its obligation shapes while retaining the same hash
   lattice;
2. exact names and owning context for CAS node, operation description, history
   occurrence, replay session, and replay witness;
3. exact project-owned canonical node representation, framing, scalar encoding,
   and digest-domain policy;
4. occurrence identity and how repeated identical invocations are represented
   in the initial flat history;
5. the first supported typed-failure representation;
6. the service-lifting interface and separate record/replay construction roles
   for an already-defined Effect service;
7. the Clock/Random/default-service admission and deterministic-override policy;
8. whether M5 admits opaque outer substitution and, if so, its framed-child
   rule;
9. the initial package name and public/private publication posture;
10. ratification of the mixed TypeScript/Lean placement under `library/` and the
    corresponding `AGENTS.md` orientation change; and
11. the provenance disposition for the local compilation-techniques PDF.

The initial reducer strategy is no longer open: it is a small manual TypeScript
mirror checked by normalized decision-trace fixtures. ActionIndex is also no
longer a first-slice decision; it begins only with a recomputation/cache
consumer.

No implementation milestone begins until these choices are reviewed against
the positive, negative, boundary, and overclaim cases above.
