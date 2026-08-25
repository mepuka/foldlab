# GitHub-starred tooling reference for Foldlab

Status: research and architecture note  
Inventory owner: authenticated GitHub user `mepuka`  
Research snapshot: 2026-08-24

## Scope and method

This report screens all 161 repositories returned by the read-only command `gh api --paginate /user/starred?per_page=100` for the authenticated GitHub account. GitHub stars, repository metadata, default branches, documentation, and project status change over time; the count and dispositions below are an inventory snapshot, not a stable lockfile. Any project admitted to a Foldlab implementation or proof boundary should be pinned by repository, commit, version, configuration, and applicable external specification.

The screen is oriented by the Foldlab thesis:

> Complex human, agent, and system interactions should be represented by first-class, canonical descriptions. Static types, schemas, codecs, local protocols, runtime programs, user interfaces, and traces are projections or interpretations of those descriptions. Complexity is controlled through compositional transformations whose preserved observations, information loss, and trust boundaries are explicit.

The evaluation therefore asks whether a project contributes to one or more of these layers:

1. reified global or canonical descriptions;
2. participant projection, endpoint fidelity, or n-ary coordination;
3. executable denotational or operational semantics, especially Interaction Trees;
4. Effect v4, Effect Schema, or TypeScript analysis;
5. bidirectional, algebraic, or meaning-preserving transformations;
6. Lean formalization and source-to-model tooling;
7. digestion, provenance, normalization, and content addressing;
8. tracing and declared observations;
9. changing topology, asynchrony, actors, messaging, and streams; and
10. semantic graphs, ontologies, and constraints where they clarify canonical entities.

The evidence order was repository source and project-owned documentation first, then project-owned papers or specifications. Repository marketing language is treated as a claim made by the project, not as independent verification. A passing test suite is not a proof; a theorem about a formal model is not automatically a theorem about a production implementation; and a Coq, Lean, Rust, Haskell, or Python artifact does not directly establish a TypeScript or Effect claim.

### Disposition vocabulary

| Role | Meaning in this report |
| --- | --- |
| **Adopt** | Use now as a pinned subject, proof platform, or replaceable experimental component. Adoption does not license a semantic guarantee beyond the project's actual evidence. |
| **Borrow** | Reuse a definition pattern, interface boundary, law, fixture strategy, or architecture; avoid importing the whole project until the Foldlab contract is fixed. |
| **Watch** | Strong fit but immature, fast-moving, self-asserted, or insufficiently audited for the intended claim boundary. |
| **Context** | Conceptual or comparative prior art. It informs vocabulary and counterexamples but is not currently an implementation dependency. |

### Evaluation criteria

- **Semantic authority:** Is there one first-class description, or are independent representations merely kept in sync?
- **Projection discipline:** Are derived types, codecs, endpoints, participants, and runtimes explicitly related to the source description?
- **Observation contract:** Does the project state equality, refinement, traces, failures, ordering, or other observable behavior precisely?
- **Composition:** Are transformations and handlers law-governed and closed under useful composition?
- **Topology and time:** Are participant change, buffering, retry, interruption, stream productivity, and causal order explicit?
- **Evidence:** Are definitions, theorems, tests, conformance fixtures, and implementation correspondence kept distinct?
- **Practical fit:** Can the work integrate with Effect v4, TypeScript, Lean 4, and a small claim-gated repository?
- **Maturity and portability:** Is the API stable, is the language/runtime compatible, and can the component be pinned and reproduced?

## Executive shortlist

The shortlist contains 26 repositories. It is intentionally heterogeneous: some are semantic references, some are reusable libraries, and some are operational experiment substrates.

| Project | Role | Kind | Decision for Foldlab |
| --- | --- | --- | --- |
| [`Effect-TS/effect`](https://github.com/Effect-TS/effect) | Adopt | subject implementation | Keep as the version-pinned implementation subject. Its v4 README currently labels v4 a release candidate, so source slices and package versions must remain pinned. Treat `Effect<A, E, R>`, Schema ASTs, streams, fibers, and tracing as separate admitted surfaces, not one global claim. |
| [`leanprover/lean4`](https://github.com/leanprover/lean4) | Adopt | proof platform | Retain Lean 4 as the kernel-checked specification and proof environment. Follow the official distinction between elaboration, kernel checking, and compilation in the [Lean reference](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/). |
| [`DeepSpec/InteractionTrees`](https://github.com/DeepSpec/InteractionTrees) | Borrow | conceptual reference and Rocq library | Use its event-signature, handler, interpretation, trace, and weak-equivalence architecture as the primary semantic pattern. Do not import its theorems into Lean by analogy; its README also records UIP, functional extensionality, excluded middle, and choice dependencies for parts of the library. |
| [`Verified-zkEVM/PolyFun`](https://github.com/Verified-zkEVM/PolyFun) | Watch | reusable Lean library | The closest starred Lean substrate: polynomial functors, lenses, free/cofree structure, Interaction Trees, simulations, handlers, and multi-party interaction. Prototype against a pinned commit, but audit theorem statements, axioms, performance, and compatibility before making it foundational. |
| [`Lysxia/profunctor-monad`](https://github.com/Lysxia/profunctor-monad) | Borrow | conceptual Coq/Haskell-oriented artifact | Use monadic profunctors as a vocabulary for effectful bidirectional programs and codecs. This is prior art for algebra design, not a ready TypeScript or Lean dependency. |
| [`mac-monet/effect-domain`](https://github.com/mac-monet/effect-domain) | Watch | reusable Effect library | It states the closest implementation-level version of the Foldlab thesis: the domain model is primary and transports are projections. Its [projection design note](https://github.com/mac-monet/effect-domain/blob/main/docs/projections.md) derives in-process APIs, wire handling, typed clients, and response schemas from one domain value. It is pre-release and provides no formal preservation theorem; use it as an executable design study. |
| [`typeonce-dev/effect-machine`](https://github.com/typeonce-dev/effect-machine) | Watch | reusable Effect library | Study its Schema-first state, event, persistence, testing, Atom, and cluster boundaries. The package explicitly keeps its core model local and assigns identity, placement, transport, routing, and delivery to an integration boundary. Its README calls the software early-release and ties releases to exact Effect versions. |
| [`unisonweb/unison`](https://github.com/unisonweb/unison) | Borrow | language and content-addressed system | Use as the principal operational precedent for content-addressed ASTs, semantic dependency identity, renaming, incremental compilation, and semantic version control. Its content hashes identify Unison definitions under Unison's own representation and dependency model; they do not solve canonical semantic identity for Foldlab automatically. |
| [`tree-sitter/tree-sitter`](https://github.com/tree-sitter/tree-sitter) | Adopt | reusable parser infrastructure | Use for robust, incremental concrete-syntax ingestion and error-tolerant source location. A concrete syntax tree is not a TypeScript type derivation or operational semantics. |
| [`predictable-machines/lean4-tree-sitter`](https://github.com/predictable-machines/lean4-tree-sitter) | Watch | reusable Lean/FFI bridge | Its source maps, typed grammar schemas, extraction engine, and stated mapping proofs are directly relevant to traceable source ingestion. The current README lists Java, Python, and Kotlin, not TypeScript; the FFI parser and grammar correctness remain distinct trust boundaries. |
| [`predictable-machines/lean4-json-schema`](https://github.com/predictable-machines/lean4-json-schema) | Watch | reusable Lean library | Borrow inductive schema, total validator, derivation, and soundness/completeness patterns. Its own warning says JSON Schema coverage and proof coverage are incomplete and APIs may change. It cannot establish Effect Schema or Draft 2020-12 conformance without an explicit bridge. |
| [`Effect-TS/tsgo`](https://github.com/Effect-TS/tsgo) | Adopt | operational type tooling | Use pinned diagnostics and structured output as source-slice acceptance and regression evidence. Its wrapper adds Effect diagnostics and fixes to TypeScript-Go; a clean diagnostic run does not prove runtime semantics or compilation preservation. |
| [`verse-lab/veil`](https://github.com/verse-lab/veil) | Watch | Lean transition-system framework | Borrow its specify/implement/test/prove workflow, concrete and symbolic model checking, counterexample-guided invariant discovery, and interactive Lean fallback for distributed protocols. The README identifies Veil 2.0 as pre-release and focuses currently on safety, with liveness future-facing. |
| [`hxrts/telltale`](https://github.com/hxrts/telltale) | Watch | Lean/Rust MPST system | It directly targets one global protocol projected to local session types, typed effects, runtime machines, replay, and cross-target traces, including asynchronous buffering and reconfiguration. Its unusually broad verification claims are project-authored; require an independent statement, axiom, build, and artifact-correspondence audit before relying on them. |
| [`LTeuse/Effectful-Choreography`](https://github.com/LTeuse/Effectful-Choreography) | Borrow | Lean formalization | Close conceptual prior art for combining choreographies and algebraic effects. The repository describes Lean definitions of choreography/process machines and endpoint-projection soundness and completeness. Audit pins and theorem assumptions before reuse; borrow the separation between choreography, process network, and projection proof. |
| [`PierreSenellart/provsql`](https://github.com/PierreSenellart/provsql) | Borrow | operational database plus formal companion | Use semiring provenance and provenance circuits as the leading algebraic reference for digestion and trace attribution. The project documents a separate `provenance-lean` companion; the PostgreSQL extension, its rewrite implementation, and the Lean theory still require an explicit correspondence boundary. |
| [`automerge/automerge`](https://github.com/automerge/automerge) | Borrow | reusable CRDT library | Use its change graph, compact format, and sync protocol to experiment with concurrent descriptor editing. CRDT convergence is not semantic coherence: merged canonical descriptions must still satisfy domain well-formedness, projection coherence, and conflict policy. |
| [`nats-io/nats.js`](https://github.com/nats-io/nats.js) | Adopt | replaceable transport infrastructure | Use as the initial JavaScript transport for asynchronous experiments. Its separation of runtime-agnostic core modules from Deno, Node/Bun, and WebSocket transports is useful, but delivery, ordering, JetStream, host scheduling, and Effect interruption need project-owned observations. |
| [`synadia-ai/synadia-agent-sdk-docs`](https://github.com/synadia-ai/synadia-agent-sdk-docs) | Borrow | wire specification | Treat the core protocol as a concrete agent-stream case study: discovery, request/reply streaming, queries, heartbeats, errors, and versioning. It is a transport protocol, not a global type or proof of multi-party coherence. |
| [`mepuka/effect-nats-jetstream`](https://github.com/mepuka/effect-nats-jetstream) | Watch | Effect implementation and conformance harness | Its pinned specification, requirement catalog, reply DFA, total boundaries, Effect `TestClock`, and claimed Lean companion align closely with Foldlab's evidence ladder. Audit the external Lean repository and the TypeScript-to-Lean correspondence before raising claims above reproducible conformance tests. |
| [`Cotal-AI/Cotal`](https://github.com/Cotal-AI/Cotal) | Watch | operational agent-topology system | Use as a topology and delivery experiment: configurable peer, supervisor, graph, multicast, unicast, anycast, presence, and durable NATS-backed communication. The topology is operational configuration rather than a proven global choreography; this contrast makes it valuable test data. |
| [`google/langextract`](https://github.com/google/langextract) | Borrow | reusable digestion library | Its source-span grounding and explicit handling of unlocated extractions are useful for the first digestion boundary. Grounding proves that text was located, not that the extracted semantic claim is true or meaning-preserving. |
| [`linkml/linkml`](https://github.com/linkml/linkml) | Borrow | schema/ontology projection tooling | Study a YAML-authored linked-data model projected to JSON and RDF representations. The metamodel and generators are good projection prior art, but generated artifacts need per-target conformance and round-trip laws. |
| [`Arize-ai/phoenix`](https://github.com/Arize-ai/phoenix) | Borrow | operational observability | Use its OpenTelemetry-based LLM traces, datasets, experiments, and replay for empirical execution inspection. Phoenix traces are recorded runtime telemetry; they are not the semantic trace relation used in refinement proofs. |
| [`bluesky-social/atproto`](https://github.com/bluesky-social/atproto) | Context | protocol and content-addressed data system | Use its versioned Lexicons, generated SDKs, repository/Merkle structures, identities, and firehose as a realistic case study in schema projection, content identity, federation, and evolving asynchronous streams. |
| [`livestorejs/livestore`](https://github.com/livestorejs/livestore) | Watch | event-sourced sync infrastructure | Its persisted events, materializers, reactive SQLite view, offline-first sync, and custom conflict resolution make a useful projection-versus-state experiment. The repository does not supply a formal event semantics or convergence theorem for Foldlab's descriptors. |

## Thematic profiles

### 1. Executable semantics and algebraic transformation

The strongest semantic line runs from the Interaction Trees paper and [`DeepSpec/InteractionTrees`](https://github.com/DeepSpec/InteractionTrees), through a Lean-native candidate in [`Verified-zkEVM/PolyFun`](https://github.com/Verified-zkEVM/PolyFun), to Effect programs as an implementation target. The reusable idea is not a direct identification of Effect with an ITree. It is the factorization:

```text
description
  = return
  | silent step
  | visible indexed operation with a continuation

handler       : operation signature -> target computation
interpret     : description -> target computation
observation   : interpreted behavior -> trace/result view
equivalence   : relation parameterized by the chosen observation
```

This lets Foldlab ask where typed failure, service lookup, interruption, scheduling, and stream emission belong: return values, visible operations, terminal causes, or interpreter policy. Those choices must be proved or tested against a pinned Effect slice rather than inferred from a type parameter.

[`Lysxia/profunctor-monad`](https://github.com/Lysxia/profunctor-monad) supplies the complementary bidirectional perspective: some parsers, generators, lenses, and codecs admit both monadic sequencing and profunctorial input/output variation. The useful research question is which Foldlab transformations are equivalences, partial round trips, refinements, or sound abstractions. A single generic `transform` label would hide these distinct proof obligations.

[`cajal-technologies/talos`](https://github.com/cajal-technologies/talos) is additional Lean prior art for definitions that execute and support reasoning, with a weakest-precondition layer over a Wasm interpreter. It is a useful architecture study, not a shortcut from Effect/TypeScript to Wasm correctness. [`lambdaclass/concrete`](https://github.com/lambdaclass/concrete) is adjacent language-design context because it exposes capability, allocation, failure, ownership, and evidence classes, but its ambitious systems-language surface is not a close implementation dependency.

### 2. Global descriptions, choreography, and endpoint projection

[`STScript-2020/cc21-artifact`](https://github.com/STScript-2020/cc21-artifact) is high-quality contextual prior art: a routed multiparty session-type theory and a toolchain that generates TypeScript APIs for WebSocket applications. Its value is the explicit global-to-local generation boundary and reproducible artifact. Its generated TypeScript API is not an Effect v4 semantic model, and the artifact does not address arbitrary human decisions or topology changes.

[`LTeuse/Effectful-Choreography`](https://github.com/LTeuse/Effectful-Choreography) is closer to the desired formal shape: choreography syntax and semantics, process networks, endpoint projection, and stated soundness/completeness theorems live in Lean. [`hxrts/telltale`](https://github.com/hxrts/telltale) goes further in scope, claiming asynchronous buffered MPST, typed effect interfaces, evidence, replay, Lean/Rust correspondence, and dynamic reconfiguration. [`hxrts/jacquard`](https://github.com/hxrts/jacquard) adds deterministic adaptive-routing simulation. These projects should be watched together, but Telltale and Jacquard are small and fast-moving; broad claims must be independently reproduced and inspected at exact theorem and artifact boundaries.

The design implication is that a Foldlab global entity should not merely be a serialized session type. It should be a typed, versioned descriptor whose projections are indexed by participant, capability, topology epoch, and observation policy. A participant-local program is a derived artifact. A topology change should itself be a typed event that either preserves an existing projection invariant or produces a new epoch with explicit migration obligations.

### 3. Effect as description, Schema as projection carrier

The pinned [`Effect-TS/effect`](https://github.com/Effect-TS/effect) source remains the implementation under study. The repository currently advertises typed errors, dependencies, structured concurrency, scheduling, tracing, and schema validation while labeling v4 a release candidate. Foldlab should continue to separate its public type surface, runtime representation, hosted execution, and compiled artifact.

Two starred libraries are unusually close to the desired userland abstraction:

- [`mac-monet/effect-domain`](https://github.com/mac-monet/effect-domain) defines one Schema-backed executable domain and derives direct calls, dynamic dispatch, wire envelopes, clients, selections, and response schemas. Its own phrase “the domain model is primary; transports are projections” is the clearest implementation hypothesis to test.
- [`typeonce-dev/effect-machine`](https://github.com/typeonce-dev/effect-machine) defines topology, state, events, persistence boundaries, runtime execution, testing, and cluster integration from Effect Schema. Its explicit separation between a local machine model and distributed placement/delivery prevents transport semantics from silently entering the core.

Other starred Effect repositories are supporting context rather than semantic authorities. [`Effect-TS/effect-smol`](https://github.com/Effect-TS/effect-smol) is archived and points to the canonical Effect repository. [`tim-smart/effect-atom`](https://github.com/tim-smart/effect-atom) and [`crosshatch/liminal`](https://github.com/crosshatch/liminal) are useful reactive-state and actor projection studies. [`tim-smart/openapi-gen`](https://github.com/tim-smart/openapi-gen), [`kitlangton/effect-solutions`](https://github.com/kitlangton/effect-solutions), and [`PaulJPhilp/EffectPatterns`](https://github.com/PaulJPhilp/EffectPatterns) are operational code-generation or practice references, not formal specifications. [`Effect-TS/tsgo`](https://github.com/Effect-TS/tsgo) is valuable as a diagnostic gate, with the same limitation: type-aware linting does not bridge erased TypeScript to JavaScript execution.

### 4. Content identity, provenance, and concurrent change

[`unisonweb/unison`](https://github.com/unisonweb/unison) demonstrates a language and codebase built around hashes of AST definitions and dependency-sensitive identity. The important lesson is to address a normalized semantic representation rather than filenames or display names. The equally important limitation is that every content address is relative to a canonicalizer, encoding, dependency closure, and hash algorithm. Foldlab should therefore model an address as evidence with parameters, not as bare identity:

```text
Address := hashAlgorithm × canonicalizerVersion × schemaVersion × digest
```

and require laws such as normalization preservation and idempotence before treating equal digests as equal canonical forms.

[`PierreSenellart/provsql`](https://github.com/PierreSenellart/provsql) is the strongest starred provenance reference. Its m-semiring approach treats provenance composition algebraically and exposes provenance circuits behind query results; its README also points to a Lean formalization. This suggests a Foldlab provenance object should record more than a span or log line: sources, transformations, alternatives, rejection, uncertainty, and composition should form an explicit algebra.

[`automerge/automerge`](https://github.com/automerge/automerge) supplies mature CRDT and sync mechanics for concurrent edits. It can preserve all changes and converge replicas, but it cannot decide whether the merged descriptor has a coherent meaning. Foldlab needs a second phase: validate the converged structure, identify semantic conflicts, and either refine to a well-formed canonical entity or retain a typed unresolved conflict.

[`cloudflare/artifact-fs`](https://github.com/cloudflare/artifact-fs) is adjacent operational infrastructure for lazy hydration of large Git repositories; it is not a semantic content-addressing theory. [`Dicklesworthstone/franken_lean`](https://github.com/Dicklesworthstone/franken_lean) describes a Merkle DAG, declaration provenance, semantic diff, and evidence matrices, but its README explicitly says it is written in the present tense as a target-state specification. Treat it as a provocative requirements document, not a delivered or independently verified Lean replacement.

### 5. Digestion and source-grounded elaboration

Digestion should be a typed, provenance-preserving elaboration pipeline rather than an unqualified LLM extraction. The starred tools cover distinct stages:

- [`tree-sitter/tree-sitter`](https://github.com/tree-sitter/tree-sitter) and [`tree-sitter/tree-sitter-typescript`](https://github.com/tree-sitter/tree-sitter-typescript) provide incremental, error-tolerant concrete syntax. They preserve source locations but do not reproduce TypeScript elaboration or type checking.
- [`predictable-machines/lean4-tree-sitter`](https://github.com/predictable-machines/lean4-tree-sitter) explores typed extraction and composable source maps in Lean, but its documented language set currently excludes TypeScript.
- [`run-llama/liteparse`](https://github.com/run-llama/liteparse) performs local document parsing with spatial text, bounding boxes, screenshots, selective OCR, and multiple language bindings. It is useful for physical-document evidence and deterministic fixtures.
- [`google/langextract`](https://github.com/google/langextract) attaches extracted items to exact character spans and marks unlocatable items. This is a strong proposal boundary: an agent suggests structure, a verifier checks its source attachment, and semantic admission remains a separate judgment.
- [`landing-ai/ade-python`](https://github.com/landing-ai/ade-python) exposes grounded document structure and typed extraction by JSON Schema/Pydantic, but it is a cloud API client. Privacy, model version, cost, and reproducibility make it a comparative backend rather than a formal dependency.
- [`BeaconBay/ck`](https://github.com/BeaconBay/ck) and [`lightonai/next-plaid`](https://github.com/lightonai/next-plaid) are local semantic-code-search candidates. Embedding similarity should be used for discovery only; accepted source mappings must be syntax- or symbol-grounded and reviewable.

The pipeline should retain at least `SourceSpan`, `ExtractorVersion`, `Candidate`, `Confidence`, `Evidence`, `AdmissionDecision`, and `LossRecord`. An extracted canonical entity must not overwrite its source or erase rejected interpretations.

### 6. Messaging, actors, topology, and streams

The NATS cluster is the best near-term experiment substrate. [`nats-io/nats.js`](https://github.com/nats-io/nats.js) separates core, JetStream, key-value, object-store, service, and runtime transport modules. [`synadia-ai/synadia-agent-sdk-docs`](https://github.com/synadia-ai/synadia-agent-sdk-docs) supplies a concrete agent wire protocol; [`synadia-ai/synadia-agents`](https://github.com/synadia-ai/synadia-agents) supplies TypeScript/Python caller and host SDKs plus interop tests; [`mepuka/effect-nats-jetstream`](https://github.com/mepuka/effect-nats-jetstream) supplies an Effect-native implementation with a requirement ledger and explicit reply-state machine. Together they support reproducible tests of buffering, timeouts, streaming replies, interruption, heartbeats, discovery, and protocol evolution.

[`Cotal-AI/Cotal`](https://github.com/Cotal-AI/Cotal) is the most direct operational topology study in the stars. It makes peer, supervisor, hierarchy, mesh, multicast, unicast, anycast, and presence configurable over NATS. That flexibility is exactly why a global semantic layer is needed: transport reachability and a configuration graph do not alone determine legal conversations, obligation transfer, or fidelity after membership change.

Actor systems supply contrasting placement and persistence models:

- [`rivet-dev/actors`](https://github.com/rivet-dev/actors) offers long-running actors with persisted state, queues, workflows, scheduling, and WebSockets.
- [`denoland/celld`](https://github.com/denoland/celld) describes self-hosted Durable Objects whose SQLite state and ownership are coordinated through object storage.
- [`cloudflare/agents`](https://github.com/cloudflare/agents) builds agent lifecycle, storage, scheduling, WebSockets, sub-agents, MCP, workflows, and human approval on Durable Objects.
- [`crosshatch/liminal`](https://github.com/crosshatch/liminal) combines Effect Schema, actors, event reduction, compatibility checks, and tracing on Cloudflare.

These are operational interpreters, not global-type systems. They are suitable backends only after Foldlab defines identity, delivery assumptions, reentrancy, migration, idempotency, and observation.

State and stream systems contribute separate ideas. [`electric-sql/electric`](https://github.com/electric-sql/electric) is a Postgres read-path sync engine based on partial-replication “shapes”; [`livestorejs/livestore`](https://github.com/livestorejs/livestore) uses persisted events and materializers over reactive SQLite; [`get-convex/convex-backend`](https://github.com/get-convex/convex-backend) combines reactive data and TypeScript server functions. [`s2-streamstore/tailsurf`](https://github.com/s2-streamstore/tailsurf) provides durable, tail-able operational transcripts. None should be mistaken for the coalgebraic or trace semantics of an infinite Foldlab stream.

[`bluesky-social/atproto`](https://github.com/bluesky-social/atproto) and [`bluesky-social/jetstream-legacy`](https://github.com/bluesky-social/jetstream-legacy) provide a realistic federated case: versioned Lexicons, typed SDK generation, identities, content-addressed repositories, firehose consumption, JSON projection, time cursors, replay, filtering, and idempotency advice. They are especially useful for testing how a convenient stream projection may discard information from a canonical protocol.

### 7. Semantic traces versus telemetry

[`Arize-ai/phoenix`](https://github.com/Arize-ai/phoenix) is the most capable starred observability candidate. It records OpenTelemetry-based LLM traces and connects them with datasets, experiments, evaluation, prompt versions, and replay. Foldlab should use this operationally while maintaining a separate proof-level trace relation.

The distinction is essential:

```text
semantic trace  = observations admitted by a formal semantics
runtime trace   = events emitted by a named interpreter and host
telemetry trace = sampled/exported records produced by instrumentation
audit record    = provenance and approval facts retained for governance
```

Bridges among these are conformance claims. Sampling, missing spans, clock skew, redaction, exporter failure, and instrumentation changes prevent telemetry equality from serving as semantic equality without additional evidence. [`specstoryai/getspecstory`](https://github.com/specstoryai/getspecstory), [`gastownhall/beads`](https://github.com/gastownhall/beads), and `tailsurf` are adjacent history and agent-memory tools, useful for durable operator context but not semantic or causal completeness.

### 8. Ontologies, constraints, and canonical entities

[`linkml/linkml`](https://github.com/linkml/linkml) is the most directly useful schema-projection system: one YAML model can generate or convert other representations, including JSON and RDF. [`rdfjs/N3.js`](https://github.com/rdfjs/N3.js) supplies asynchronous streaming RDF parsing/writing and an RDF/JS representation; [`eyereasoner/eye-js`](https://github.com/eyereasoner/eye-js) exposes N3 reasoning in browser/Node through WebAssembly; [`zazuko/rdf-validate-shacl`](https://github.com/zazuko/rdf-validate-shacl) supplies SHACL validation. [`hyperquest-hq/hyperbase`](https://github.com/hyperquest-hq/hyperbase) is useful conceptual context for ordered recursive semantic hyperedges, which can represent n-ary relations more directly than binary edges.

These technologies should remain projections or imported theories, not the sole canonical core. RDF's open-world identity, SHACL's validation model, TypeScript structural typing, Effect Schema decoding, and Lean inductive judgments differ. A Foldlab entity should declare which projection is authoritative for which observation.

The manufacturing stars are valuable domain stress tests rather than core dependencies. [`hsu-aut/IndustrialStandard-ODP-PackML`](https://github.com/hsu-aut/IndustrialStandard-ODP-PackML) reifies a standardized machine state topology as an ontology pattern. [`digitaltwinconsortium/ManufacturingOntologies`](https://github.com/digitaltwinconsortium/ManufacturingOntologies) relates manufacturing ontologies to W3C Web of Things descriptions. [`libremfg/json-schema`](https://github.com/libremfg/json-schema) expresses ISA-95/ISA-88 data models as JSON Schema for synchronous and asynchronous APIs. They show why canonical entities, projections, and versioned standards must be distinguished: ontology, wire schema, state machine, live device, and trace are related but non-identical artifacts.

## Integration map for Foldlab

| Foldlab layer | Candidate inputs from the stars | Project-owned obligation |
| --- | --- | --- |
| **Source evidence** | Tree-sitter, LiteParse, LangExtract, ADE | Preserve bytes/spans and extraction versions; separate candidate extraction from semantic admission. |
| **Canonical descriptor IR** | Effect Domain, Effect Machine, LinkML, Hyperbase, Lexicons | Define kinds, formation, identity, versioning, normalization, unresolved conflict, and observation. No candidate currently supplies the required whole IR. |
| **Executable meaning** | InteractionTrees, PolyFun, Effect | Define indexed operations, recursion/productivity, handlers, terminal outcomes, and weak observation equivalence. |
| **Global interaction** | Effectful Choreography, STScript, Telltale | Define participant roles, projection, coherence, buffering, delegation, topology epochs, and global/local fidelity. |
| **Static projection** | Effect Schema, tsgo, LinkML generators | State accepted source subsets and prove or test that generated static surfaces correspond to descriptor meaning. |
| **Codec/wire projection** | Effect Domain, JSON Schema, NATS agent protocol, ATProto | Specify canonicalization, error representation, round-trip/refinement laws, version negotiation, and unknown-field policy. |
| **Operational interpreter** | NATS.js, Cotal, actor runtimes, LiveStore/Electric | Pin host/runtime and define queues, delivery, scheduling, retry, failure, persistence, and migration observations. |
| **Concurrent editing** | Automerge | Separate structural convergence from semantic conflict resolution and descriptor well-formedness. |
| **Provenance and addressing** | ProvSQL, Unison | Define provenance algebra, normalization version, digest assumptions, dependency closure, and address migration. |
| **Runtime evidence** | Phoenix, tailsurf, SpecStory, Beads | Define semantic-to-runtime trace mapping, telemetry completeness class, causal identifiers, redaction, and operator approval records. |
| **Formal validation** | Lean 4, Veil, lean4-json-schema, lean4-tree-sitter | Keep model theorem, source conformance, translation preservation, and hosted execution as separate gates. |

A plausible architecture is:

```text
heterogeneous sources
    │  grounded digestion + loss/provenance records
    ▼
canonical, versioned global descriptor
    ├── normalize/content-address ──► provenance graph
    ├── project participant ────────► local protocol / human obligations
    ├── project static ─────────────► TS types / Lean carriers
    ├── project codec ──────────────► Effect Schema / JSON / RDF
    └── fold with handlers ─────────► Effect/ITree computation
                                         │
                                         ▼
                              actor/message/stream interpreter
                                         │
                              runtime trace + telemetry
                                         │
                              conformance/refinement check
```

The descriptor is not assumed to be one universal syntax forever. It may be an extensible family indexed by kind. What must remain common is the transformation contract: source and target meanings, preserved observation, admitted loss, assumptions, and evidence.

## Gaps and risks

1. **No starred project supplies the complete abstraction.** The closest pieces are complementary: Interaction Trees for effects, choreography/MPST for global interaction, Effect/Schema for userland descriptions, Unison for content identity, ProvSQL for provenance, and NATS/actors for execution.
2. **No verified full Effect/TypeScript bridge was found.** Lean, Coq, Rust, or Haskell theorems do not establish semantics for erased TypeScript, Effect internals, emitted JavaScript, or a named host.
3. **Dynamic topology remains under-specified.** Joining, leaving, delegation, partition, reconnection, migration, and authority transfer can invalidate local projections. A static well-formed global type is insufficient without epoch and re-projection semantics.
4. **Asynchrony changes equivalence.** Buffer order, duplicate delivery, retry, cancellation, fairness, and backpressure determine observable traces. End-state equality loses these distinctions.
5. **Streams require coinductive discipline.** Finite `Trace` lists cannot express divergence, productivity, fairness, or infinite interaction. Operational stream libraries do not provide those proofs by existing.
6. **Digestion is inherently lossy.** Layout parsing, OCR, extraction, summarization, ontology alignment, and embeddings can omit or invent structure. Each step needs a sound-abstraction or human-admission contract rather than an equality claim.
7. **Content addressing depends on canonicalization.** Hash equality is only meaningful relative to a canonicalizer, version, encoding, dependency closure, and collision assumption. Semantic equivalence may be undecidable or intentionally coarser than representation equality.
8. **CRDT convergence is not semantic validity.** A converged document can violate a protocol, refinement, capability, or ontology constraint.
9. **Telemetry is incomplete evidence.** Instrumentation records executions but normally neither enumerates all permitted behavior nor proves a run faithfully implemented the descriptor.
10. **Ontology semantics do not collapse into application typing.** RDF/OWL, SHACL, JSON Schema, Effect Schema, TypeScript, and Lean have different logics and failure modes. Cross-projection coherence must be stated explicitly.
11. **Broad project-authored proof claims require audit.** Telltale, PolyFun, lean4-tree-sitter, ProvSQL's formal companion, Concrete, and Franken Lean vary sharply in maturity and claim style. Rebuilds, axiom reports, theorem inspection, and implementation-correspondence review are prerequisites to reuse.
12. **Human participants are not deterministic services.** Refusal, ambiguity, revision, delayed response, delegation, and consent withdrawal need first-class outcomes and cannot be modeled as malformed machine behavior.

## Staged recommendations

### Stage 0 — freeze the research ledger

- Pin Effect v4, TypeScript/tsgo, Lean, Node/Bun, Tree-sitter TypeScript, and candidate conformance specifications.
- Record a per-project role: normative source, model inspiration, implementation dependency, test oracle, or contextual prior art.
- Add a claim matrix that prevents repository README claims from being repeated as Foldlab guarantees.

### Stage 1 — define a minimal canonical descriptor

- Start with pure entities, named participants, finite operations, typed outcomes, and explicit observations.
- Define well-formedness, alpha/structural equality, normalization, refinement orientation, and provenance.
- Derive one Effect Schema projection and one Lean carrier; do not add distributed execution yet.
- Use Effect Domain and LinkML as comparative executable sketches, not authorities.

### Stage 2 — prove transformations and identity

- Specify projection, normalization, codec, and composition as distinct transformations.
- Prove normalization preservation/idempotence and conditional codec round trips on a small supported subset.
- Introduce versioned content addresses only after canonicalization laws are fixed.
- Prototype semiring-style provenance and retain loss records for digestion.

### Stage 3 — add executable effects

- Define an Interaction-Tree-like computation over indexed operations in Lean, first by a minimal local implementation and then by evaluating whether PolyFun reduces maintenance.
- Define handlers into a small Effect subset and an executable Lean interpreter.
- Keep typed failure, defect, interruption, service request, and stream emission distinct until correspondence evidence justifies an encoding.

### Stage 4 — add fixed-topology global interaction

- Model one finite n-ary choreography and participant projection.
- Borrow proof shapes from Effectful Choreography and STScript; audit Telltale as a higher-ambition comparison.
- Prove projected local well-formedness and a trace-level soundness/completeness or simulation theorem under explicit queue assumptions.

### Stage 5 — add asynchronous and changing topology

- Use NATS.js plus the pinned Synadia protocol/effect-nats implementation as the first differential harness.
- Introduce topology epochs, join/leave/delegate events, channel ownership, buffer state, and migration.
- Compare Cotal's configurable topology and one actor backend, but keep them replaceable interpreters.
- Extend observations to infinite traces or productive stream prefixes before liveness claims.

### Stage 6 — add digestion and operational evidence

- Start with deterministic Tree-sitter/LiteParse source evidence, then admit LangExtract candidates through span checks and operator approval.
- Export runtime telemetry to Phoenix, but retain a project-owned semantic trace and a declared mapping.
- Experiment with Automerge only after semantic conflict and revalidation states are defined.
- Add RDF/LinkML projections when canonical entities need external semantic interoperability; do not make an RDF store the core by default.

## Appendix: full star-screen accounting

### Counts

| Disposition | Repositories | Accounting rule |
| --- | ---: | --- |
| Deep-profiled | 47 | Directly addresses a core thesis layer and was evaluated against project-owned README/docs/source in this sweep. |
| Adjacent | 81 | Potential implementation aid, domain case study, agent infrastructure, or contextual design reference, but not central enough for a full profile. |
| Excluded from this report's tooling recommendations | 33 | General-purpose UI, media, networking, ML runtime, unrelated application, duplicate scraper, archived bot, or insufficiently described repository without a material thesis connection. |
| **Total screened** | **161** | Complete `/user/starred` inventory returned on 2026-08-24. |

### Deep-profiled repositories (47)

| Theme | Repositories |
| --- | --- |
| Executable semantics and transformation | `DeepSpec/InteractionTrees`, `Verified-zkEVM/PolyFun`, `Lysxia/profunctor-monad` |
| Global interaction and topology | `STScript-2020/cc21-artifact`, `hxrts/telltale`, `hxrts/jacquard`, `LTeuse/Effectful-Choreography`, `Cotal-AI/Cotal` |
| Effect and type tooling | `Effect-TS/effect`, `Effect-TS/tsgo`, `typeonce-dev/effect-machine`, `mac-monet/effect-domain` |
| Lean and source models | `leanprover/lean4`, `predictable-machines/lean4-json-schema`, `predictable-machines/lean4-tree-sitter`, `tree-sitter/tree-sitter`, `tree-sitter/tree-sitter-typescript`, `verse-lab/veil`, `cajal-technologies/talos` |
| Identity, provenance, and concurrent state | `unisonweb/unison`, `PierreSenellart/provsql`, `automerge/automerge`, `electric-sql/electric`, `livestorejs/livestore` |
| Async messaging and actors | `nats-io/nats.js`, `synadia-ai/synadia-agents`, `synadia-ai/synadia-agent-sdk-docs`, `mepuka/effect-nats-jetstream`, `rivet-dev/actors`, `denoland/celld`, `cloudflare/agents` |
| Digestion, search, and traces | `Arize-ai/phoenix`, `run-llama/liteparse`, `google/langextract`, `landing-ai/ade-python`, `BeaconBay/ck`, `lightonai/next-plaid` |
| Semantic data and protocol case studies | `linkml/linkml`, `hyperquest-hq/hyperbase`, `rdfjs/N3.js`, `eyereasoner/eye-js`, `zazuko/rdf-validate-shacl`, `bluesky-social/atproto`, `bluesky-social/jetstream-legacy`, `hsu-aut/IndustrialStandard-ODP-PackML`, `digitaltwinconsortium/ManufacturingOntologies`, `libremfg/json-schema` |

### Adjacent repositories (81)

These passed the relevance screen but were not promoted to a full profile. They are retained so the screen is auditable and can be revisited as the charter changes.

```text
lambdaclass/concrete
leanprover/elan
eth-sri/type-constrained-code-generation
cameronfreer/lean4-skills
s2-streamstore/tailsurf
nats-io/natscli
google-deepmind/alphaproof-nexus-results
facebookresearch/autoform-bot
leanprover/Pantograph
leanprover-community/aesop
Dicklesworthstone/franken_lean
leanprover-community/lean4-metaprogramming-book
neul-labs/grite
mepuka/foldlab
beep-effect/beep-effect
1jehuang/jcode
PrimeIntellect-ai/prime-agent
UsefulSoftwareCo/executor
multica-ai/multica
earendil-works/pi
Dicklesworthstone/mcp_agent_mail_rust
mattpocock/skills
intercom/2x-skills
electric-sql/pglite
kitlangton/skills
LingDong-/dither-lang
Effectful-Tech/clanka
alchemy-run/alchemy
cloudflare/artifact-fs
OpenEnergyPlatform/ontology
agentskills/agentskills
Matdata-eu/Yasgui
muratcankoylan/Agent-Skills-for-Context-Engineering
alchemy-run/alchemy-async
stanfordnlp/dspy
hamelsmu/evals-skills
EveryInc/compound-engineering-plugin
browser-use/browser-use
browser-use/browser-harness
microsoft/Agents
get-convex/convex-backend
tursodatabase/turso
Effect-TS/effect-smol
alibaba/zvec
mepuka/bsky-cli
e2b-dev/e2b-cookbook
firecracker-microvm/firecracker
e2b-dev/surf
cloudflare/sandbox-sdk
anomalyco/opencode
bluesky-social/bsky-docs
kitlangton/effect-solutions
tim-smart/lalph
winkjs/composer
specstoryai/getspecstory
vercel-labs/agent-browser
piskvorky/gensim
ringgaard/sling
gastownhall/beads
AI-Planning/pddl
kitlangton/effect-stack
laverdet/isolated-vm
tim-smart/openapi-gen
n8n-io/n8n
PaulJPhilp/EffectPatterns
lambdamusic/Ontospy
obra/superpowers
FreeOpcUa/opcua-asyncio
crosshatch/liminal
ComposioHQ/composio
elastic/Machinebeat
node-opcua/node-opcua
KRR-Oxford/BERTMap
RinkeHoekstra/lkif-core
node-opcua/node-opcua-isa95
libremfg/PackML-MQTT-Simulator
pulumi/pulumi
openai/codex
tim-smart/effect-atom
united-manufacturing-hub/united-manufacturing-hub
pipeshub-ai/pipeshub-ai
```

### Excluded repositories (33)

Exclusion means “not materially useful to this research report at this snapshot,” not a quality judgment. The criteria were: unrelated domain; generic application/runtime with no distinctive semantic contribution; visual/media utility; duplicate scraper; general networking/hosting; archived replacement; or inadequate project description for a defensible connection.

```text
nyu-acsys/sprout
yyubin/sprout
libffi/libffi
zed-industries/zed
warp-tech/warpgate
caddyserver/caddy
tailscale/caddy-tailscale
anthropics/claude-for-legal
maxxxzdn/mosaic
abey79/vsketch
ToolJet/ToolJet
hapijs/hapi
microsoft/onnxruntime
mepuka/better-twitter-scraper
mepuka/skygest
the-convocation/twitter-scraper
yctimlin/mcp_excalidraw
OfficeDev/microsoft-365-agents-toolkit
lukilabs/beautiful-mermaid
letta-ai/lettabot
ghostty-org/ghostty
jdx/mise
dmmulroy/cloudflare-skill
Skygest/PaperSkygest
ricky0123/vad
steipete/agent-scripts
winkjs/wink-embeddings-sg-100d
observablehq/plot
LingDong-/fishdraw
CapSoftware/Cap
parcel-bundler/watcher
unionlabs/union
PlasmoHQ/plasmo
```

## Bottom line

The starred inventory supports a clear path, but not a single turnkey stack. The most coherent synthesis is:

- **Effect/Schema** as the concrete userland description and interpreter subject;
- **Lean 4** as the claim-gated formal environment;
- **Interaction Trees/PolyFun** as the executable effect-semantics line;
- **choreography and multiparty session work** as the global-to-local fidelity line;
- **Unison, ProvSQL, and Automerge** as distinct references for identity, provenance, and concurrent change;
- **Tree-sitter, LiteParse, and LangExtract** as a provenance-retaining digestion front end;
- **NATS, the Synadia protocol, Cotal, and actor systems** as replaceable asynchronous interpreters; and
- **Phoenix** as operational evidence, never a substitute for semantic traces.

The first implementation decision should therefore be a small canonical descriptor and transformation contract, not a choice of broker, database, ontology, or agent framework. Those systems become folds and projections once Foldlab has stated what meaning they must preserve.
