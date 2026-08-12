# Goal-objective industry standards and proof plan

This document turns the fifteen principles in `goal-objective.md` into
testable interoperability and correctness claims. It deliberately separates
requirements that an external specification actually mandates from thresholds
this project should choose. Most cited specifications define protocol behavior,
formats, and correctness conditions; they do not prescribe availability,
latency, corpus size, or fuzzing volume.

## Evidence classes and metric policy

The labels below are used throughout:

- **Normative standard/specification** — a published document with explicit
  conformance language. This includes formal standards and project
  specifications, but their publication status is always stated.
- **De-facto API** — a versioned product or ecosystem interface useful for
  compatibility, but not an independent standards-body mandate.
- **Research basis** — an original paper or reference implementation that
  supplies an algorithm or correctness model, not a certification.
- **Project threshold** — a proposed acceptance gate for this repository. It is
  not represented as an industry-mandated number.

“100%” below always means all cases in the named, version-pinned corpus or
generated run, not a statistical claim about all possible executions. A
conformance report should always record the implementation digest, spec
version, corpus digest, seed range, pass/total counts, skipped cases, expected
failures, and first failure.

### Current canonicalization profile and evidence

The project currently exposes two intentionally different profiles in
[`canonical.ts`](../../packages/kernel/src/canonical.ts):
`canonicalizeJcs` implements full RFC 8785 behavior over its admitted parsed
I-JSON values, including serializing negative zero as `0`, while the legacy P0
`encode` rejects negative zero but is byte-identical to JCS on that narrower
domain. The recorded 2026-08-11 gate is 6/6 structured vectors from the
[upstream JCS corpus pinned at `19d51d7fe467`](https://github.com/cyberphone/json-canonicalization/tree/19d51d7fe467/testdata),
26/26 [RFC 8785 Appendix B](https://www.rfc-editor.org/rfc/rfc8785.html#appendix-B)
number vectors, and 3/3 malformed-Unicode rejections. These counts are project
evidence, not conformance numbers mandated by RFC 8785.

## Pinned interoperability baseline

| Technology | Status and exact role | Official validation surface |
| --- | --- | --- |
| JSON Canonicalization Scheme (JCS) | [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) is an **Informational RFC**, not an IETF Standards Track RFC. It defines deterministic JSON serialization over the I-JSON subset, including recursive UTF-16 code-unit property sorting, ECMAScript primitive serialization, UTF-8 output, and no added whitespace ([RFC 8785 §§3.1–3.2](https://www.rfc-editor.org/rfc/rfc8785.html#section-3)). | Run the RFC’s sample vectors plus the project’s frozen cross-language corpus; require exact canonical bytes and digest equality. |
| CloudEvents 1.0 | [CloudEvents 1.0.2](https://github.com/cloudevents/spec/tree/v1.0.2/cloudevents) is a CNCF project specification with RFC 2119 conformance language. Every conforming event carries the required `id`, `source`, `specversion`, and `type` attributes, and producers use `specversion: "1.0"` for this version ([core specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)). | Validate the core model and the [JSON event format](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/formats/json-format.md); test every required attribute, extension round-trip, malformed-event rejection, and the core interoperability floor that intermediaries forward events of 64 KiB or less. CloudEvents publishes [SDK requirements](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/SDK.md), but no single official cross-language CTK is identified by the specification repository. |
| CloudEvents NATS binding | The stable v1.0.2 tag contains [NATS binding 1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/nats-protocol-binding.md), which supports structured mode only, requires the NATS payload to be the UTF-8 JSON event format, and does not define transfer or settlement semantics. Current `main` labels the binding [`1.0.3-wip`](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/nats-protocol-binding.md), so implementations should pin the released tag. | Golden wire captures must prove structured JSON payload equivalence through publish/consume and redelivery. Broker durability and exactly-once commitment require separate tests because the binding expressly does not specify settlement. |
| AsyncAPI 3.0 | [AsyncAPI 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0) is an open, normative specification for machine-readable message-driven APIs. It models channels, operations with `send`/`receive` actions, messages, payload schemas, correlation IDs, and protocol bindings. | Validate documents with the official [spec JSON Schemas](https://github.com/asyncapi/spec-json-schemas) and parse them with the official [Parser-JS](https://github.com/asyncapi/parser-js); project conformance is zero parser/schema errors plus executable contract tests for every declared operation and message. |
| CNCF Serverless Workflow 1.0 | [Serverless Workflow 1.0.0](https://github.com/serverlessworkflow/specification/releases/tag/v1.0.0) is a vendor-neutral CNCF workflow DSL specification. Its ecosystem includes schemas and a Conformance Test Kit of Gherkin features; the project has since been renamed [Open Workflow Specification](https://github.com/open-workflow-specification/specification). | Validate workflow documents and every applicable official [CTK feature at the pinned `v1.0.0` tag](https://github.com/serverlessworkflow/specification/tree/v1.0.0/ctk); zero failed or skipped mandatory scenarios is the proposed project gate. |
| Amazon States Language | [Amazon States Language 1.0](https://states-language.net/spec.html) is an Amazon-authored, openly published vendor specification, not a multivendor standards-body standard. A machine has `States` and `StartAt` and uses Pass, Task, Choice, Wait, Succeed, Fail, Parallel, and Map state types under the published transition and terminal-state rules. | Run the Amazon-maintained [Statelint](https://github.com/awslabs/statelint) validator and differential fixtures against the published semantics. Treat this as a compatibility profile, not as the internal execution model. |
| Temporal | Temporal is a **de-facto workflow API and replay oracle**, not a standards-body specification. Its [WorkflowService protobuf](https://github.com/temporalio/api/blob/main/temporal/api/workflowservice/v1/service.proto) defines how SDKs interact with the server and says workers process event history and return generated commands; Temporal workflow code must remain deterministic under replay and external I/O belongs in Activities ([workflow definition](https://docs.temporal.io/workflow-definition)). | Pin protobuf and SDK versions, replay exported histories in the supported SDK, compare command histories, and run API compatibility tests for the subset implemented. Passing Temporal tests demonstrates compatibility with that version, not general workflow conformance. |
| W3C PROV | [PROV-DM](https://www.w3.org/TR/prov-dm/) and [PROV-CONSTRAINTS](https://www.w3.org/TR/prov-constraints/) are W3C Recommendations. PROV-DM models Entity, Activity, Agent, generation, use, derivation, association, attribution, and bundles for provenance exchange. | Export PROV-N or PROV-O, validate its constraints, and require every projected node and edge to resolve to a journal digest. |
| OpenTelemetry OTLP | [OTLP 1.11.0](https://opentelemetry.io/docs/specs/otlp/) is stable for traces, metrics, and logs and specifies Protobuf over gRPC and HTTP behavior, including partial success and retryable HTTP statuses. | Compile against the official [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto), run exporter/collector integration tests, require zero rejected spans in the conformance corpus, and verify normalized projection bytes. |
| OpenTelemetry GenAI conventions | GenAI semantic conventions now live in the dedicated [OpenTelemetry GenAI repository](https://github.com/open-telemetry/semantic-conventions-genai) and remain **Development**, not Stable. They standardize model and token-usage telemetry, but do not standardize monetary cost or prompt/output content digests; those must be namespaced project extensions. | Validate emitted names and types against the pinned semantic-convention model and report coverage by required/recommended attribute. Never advertise a development convention as a stable compatibility promise. |
| Transparency semantics | [RFC 6962](https://www.rfc-editor.org/rfc/rfc6962.html) is **Experimental** and was obsoleted by the also-**Experimental** [RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html). The reusable semantics are signed tree heads plus Merkle inclusion and consistency proofs; the certificate-specific APIs are not a workflow-journal contract. | Test inclusion for every exported entry, consistency between every retained checkpoint pair, signature verification, and single-byte tamper rejection. If Merkle transparency is not implemented, claim hash-chain verification rather than RFC 6962/9162 conformance. |
| MCP | The dated MCP `2025-11-25` revision is a [stable release](https://github.com/modelcontextprotocol/modelcontextprotocol/releases) and a normative open-project specification, not an ISO/IETF standard. Its TypeScript schema is the source of truth, JSON Schema 2020-12 is mandatory by default, and tools publish input and optional output schemas ([MCP overview](https://modelcontextprotocol.io/specification/2025-11-25/basic), [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)). | Run the official [MCP conformance suite](https://github.com/modelcontextprotocol/conformance) at `--spec-version 2025-11-25`. It supplies versioned core/backcompat suites and wire-schema checks; the proposed gate is zero expected failures and zero invalid implementation messages. |
| A2A | [A2A 1.0.0](https://github.com/a2aproject/A2A/releases/tag/v1.0.0) is a Linux Foundation-hosted normative open-project specification, not an IETF/W3C/OASIS/ISO standard. Its authoritative [`a2a.proto` at `v1.0.0`](https://github.com/a2aproject/A2A/blob/v1.0.0/specification/a2a.proto) describes agent discovery, messages, tasks, states, and artifacts across its bindings. | Run the official [A2A TCK](https://github.com/a2aproject/a2a-tck), which reports MUST/SHOULD/MAY results across gRPC, JSON-RPC, and HTTP+JSON; the proposed required profile is 100% MUST, with every SHOULD deviation documented. |
| MQTT | [MQTT 3.1.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html) and [MQTT 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html) are OASIS Standards with numbered conformance statements and Chapter 7 conformance targets. QoS 2 specifies exactly-once delivery at the MQTT protocol hop, but it does not make an application-side effect or a multi-hop workflow commit exactly once. | Build client/server conformance matrices against the numbered clauses and Chapter 7 targets. For CloudEvents, MQTT 3.1.1 uses structured JSON only while MQTT 5.0 can use structured or binary mode under the released [CloudEvents MQTT binding](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/mqtt-protocol-binding.md). |

## 1. Every execution is a verifiable artifact

**Standards basis.** JCS supplies a deterministic JSON byte representation, and
[FIPS 180-4](https://doi.org/10.6028/NIST.FIPS.180-4) specifies SHA-256 with a
256-bit output. JCS rejects duplicate names and non-finite numbers, preserves
Unicode code points without normalization, sorts property names recursively by
raw UTF-16 code units, and emits UTF-8 with no inter-token whitespace
([RFC 8785 §3](https://www.rfc-editor.org/rfc/rfc8785.html#section-3)).
[RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html) supplies append-only
Merkle inclusion/consistency semantics, while
[PROV-DM](https://www.w3.org/TR/prov-dm/) supplies a portable provenance model.

**Measurable conformance.**

- Normative: every canonical value is in the JCS/I-JSON domain and matches the
  RFC serialization rules; every advertised SHA-256 digest is recomputed.
- Project threshold: 100% of terminal executions export a receipt; an
  independent verifier reproduces every entry digest, chain head, activity
  result, and final-state bytes; 100% of single-byte fixture mutations are
  rejected.
- Project threshold for an optional Merkle view: every entry has a valid
  inclusion proof and every later checkpoint has a valid consistency proof
  from each retained earlier checkpoint.

**Validation.** Maintain frozen positive and negative JCS vectors, replay a
receipt in a process that has no broker/runtime access, compare final bytes
rather than object equality, and run tamper tests over entries, link digests,
activity results, and snapshot bytes. A Merkle implementation should use the
RFC 9162 algorithms while retaining RFC 6962 compatibility fixtures where
needed; it must not reuse Certificate Transparency HTTP APIs as workflow APIs.

**Recommended artifacts.** `Receipt.v1.schema.json`,
`CanonicalValue.v1.schema.json`, `ReceiptVerificationReport.v1.schema.json`,
`GET /v1/runs/{runId}/receipt`, and a standalone `verify-receipt` command.
`Receipt` should contain `runId`, `schemaVersion`, ordered entries,
`chainHead`, `finalStateDigest`, `engineBuildDigest`, and optional
`transparencyCheckpoint`.

## 2. Determinism is the API contract

**Standards and API basis.** Temporal requires replayed Workflow code to issue
the same command sequence for a given history and directs non-deterministic
external operations into Activities
([Temporal workflow definition](https://docs.temporal.io/workflow-definition)).
Its public WorkflowService explicitly exposes event histories to workers that
respond with newly generated commands
([Temporal API](https://github.com/temporalio/api/blob/main/temporal/api/workflowservice/v1/service.proto)).
This is a de-facto behavioral oracle; neither Temporal nor a standards body
defines the proposed compile-time Effect service discipline.

**Measurable conformance.**

- Project threshold: zero fixtures that reach direct wall-clock, random,
  network, filesystem, process, or mutable-global services from workflow code
  typecheck successfully.
- Project threshold: 100% of accepted workflows replay to the same ordered
  command digest and state bytes for every generated history.
- Compatibility metric: 100% of the supported Temporal history/API profile
  replays without command divergence at the pinned protobuf/SDK version.

**Validation.** Keep compile-pass and compile-fail fixture suites for the closed
allowed Effect service set. Run each history in a fresh process, on different
machines/time zones, and after worker replacement. Differentially replay the
declared Temporal-compatible subset against a pinned Temporal SDK and retain
every nondeterminism history.

**Recommended artifacts.** A type such as
`Workflow<Input, Error, Output, AllowedServices>`, a closed
`JournaledActivity` service, `DeterminismProfile.v1.schema.json`,
`ReplayReport { historyDigest, commandsDigest, stateDigest }`, and a
`temporal-compatibility.json` manifest naming supported protobuf RPCs, event
types, SDK version, exclusions, and fixture results.

## 3. Inference calls are provenance facts

**Standards basis.** PROV represents invocation inputs as entities `used` by an
activity and outputs as entities `wasGeneratedBy` that activity
([PROV-DM](https://www.w3.org/TR/prov-dm/)). OpenTelemetry’s development GenAI
conventions define model and input/output token telemetry
([official GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai)).
[FOCUS 1.4](https://focus.finops.org/focus-specification/v1-4/) defines a
provider-neutral cost-and-usage schema with decimal cost, currency, pricing
quantity, and billed/effective cost concepts. OTel GenAI does not define
monetary cost, prompt digest, parameter digest, or output digest, so those are
project extensions rather than OTel attributes.

**Measurable conformance.**

- Project threshold: 100% of attempted inference calls append exactly one
  terminal `InferenceFact`, including failures and cancellations.
- Project threshold: every referenced prompt, parameter, and output digest
  resolves to bytes whose canonical digest matches; completeness is 100%.
- Project threshold: provider token reconciliation and retroactive repricing
  differ from journal-derived values by zero tokens and zero units at the
  declared fixed-decimal precision.
- Observability metric: 100% of applicable stable/pinned GenAI fields are
  projected under their standard names; custom digest/cost fields use a
  project namespace.

**Validation.** Contract-test every provider adapter with captured signed
responses, verify missing/stream-aborted/error paths, recalculate usage from
provider settlement data, and rerun pricing with a new content-addressed rate
card without changing the original facts. Export the same call as a PROV
Activity with input/output Entities and as an OTel span/event, then verify all
three views cite the same journal sequence and digest.

**Recommended artifacts.** `InferenceFact.v1.schema.json` with
`provider`, `requestModel`, `responseModel`, `paramsDigest`,
`promptDigest`, optional `outputDigest`, token counts, response ID, terminal
status, `priceSheetDigest`, fixed-decimal cost, and currency;
`PriceSheet.v1.schema.json`; `RepricingReport.v1.schema.json`; and PROV/OTel
mapping tables checked into the conformance corpus.

## 4. Context is derived, never stored

**Standards basis.** PROV’s use, generation, and derivation relations can
describe which journal entities caused a context entity
([PROV-DM](https://www.w3.org/TR/prov-dm/)); JCS makes the derived result
digestable with stable bytes ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html)).
No cited industry specification mandates “context is never stored”; this is a
project architecture invariant.

**Measurable conformance.**

- Project threshold: identical `{head, assemblerDigest, policyDigest}` inputs
  produce byte-identical context in 100% of fixtures and generated runs.
- Project threshold: every output segment is attributable to at least one input
  fact digest; no prompt/context payload occurs in persistent journal fields
  except an explicitly ruled source fact.
- Project threshold: a counterfactual replay changes zero bytes in the source
  journal and returns a mechanically diffable outcome.

**Validation.** Add a persistence-schema denylist for derived context fields,
property-test the fold under fresh processes, and derive contexts from
independently decoded receipts. Run a matrix that pins the fact head while
varying exactly one of model contract, template, or policy and verify the
reported causal diff.

**Recommended artifacts.** `ContextDerivation.v1.schema.json`,
`ContextLineage.v1.schema.json`, and pure APIs
`deriveContext({head, assemblerDigest, policyDigest})` and
`counterfactualReplay({head, modelContractDigest, templateDigest, policyDigest})`.

## 5. Exactly-once commitment with fenced resource claims

**Research basis.** Linearizability requires each concurrent operation to
appear to take effect atomically between invocation and response
([Herlihy and Wing](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf)).
Chubby’s sequencers allow a protected service to reject work from a stale lock
holder ([Chubby paper](https://www.usenix.org/legacy/event/osdi06/tech/full_papers/burrows/burrows_html/)).
[Porcupine](https://github.com/anishathalye/porcupine) is an executable Go
linearizability checker against a sequential model. MQTT QoS 2’s “exactly once”
is scoped to MQTT delivery
([MQTT 5.0 §4.3.3](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901236));
it does not fence a GPU side effect or make a workflow commit linearizable.

**Measurable conformance.**

- Correctness condition: every accepted history is linearizable to the
  published sequential claim/commit model.
- Project threshold: zero commits with a fencing token below the resource’s
  current committed fence, zero more-than-one terminal outcomes per claim, and
  100% idempotent duplicate commits.
- Project threshold: at least 10,000 adversarial claim/expiry/crash histories
  per pull request, with every failing seed retained. The number is a project
  coverage target, not a standard.

**Validation.** Record invocation and response intervals, translate histories
to Porcupine operations, and test pause-after-lease-expiry, clock skew, delayed
responses, owner restart, duplicate delivery, and uncertain commit responses.
The storage operation must atomically compare the fence and create the outcome;
a wall-clock precheck is not a safety proof.

**Recommended artifacts.** `Claim.v1.schema.json` with `leaseId`, owner,
resource, strictly monotonic unsigned `fence`, and expiry; `CommitRequest` with
`claimDigest`, fence, and result digest; `ClaimHistory`; `LinearizabilityReport`;
and `claim`/`renew`/`commit` endpoints with explicit stale-fence errors.

## 6. Offline-first federated origins

**Research and protocol basis.** Lamport’s happened-before relation defines a
causal partial order without requiring a single global clock
([original paper](https://www.microsoft.com/en-us/research/publication/time-clocks-ordering-events-distributed-system/)).
CRDT research specifies convergence conditions for replicated data types
([Shapiro et al.](https://hal.inria.fr/inria-00555588/document)). CALM connects
monotonic logic with coordination-free consistency
([Hellerstein and Alvaro](https://arxiv.org/abs/1901.01930)); its conclusion
applies under its formal model, not as a blanket promise for arbitrary code.
Strong HTTP `If-Match` preconditions prevent lost updates
([RFC 9110 §13.1.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1)).

MQTT 3.1.1/5.0 are suitable interoperable pub/sub transports, and their OASIS
specifications define QoS and conformance targets
([3.1.1 Chapter 7](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718127),
[5.0 Chapter 7](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901295)).
Transport receipt is not causal merge or application commitment.

**Measurable conformance.**

- Project threshold: each origin appends and verifies locally during a complete
  partition; every permutation of the same monotone facts converges to
  byte-identical frontier and state digests.
- Project threshold: 100% of malformed links, origin sequence gaps, digest
  mismatches, and causal regressions are rejected.
- Project threshold: every non-monotone operation declares a
  consensus/fencing capability; zero operations classified monotone fail the
  published monotonicity property suite.
- Protocol metric: 100% of the selected MQTT 3.1.1/5.0 numbered conformance
  clauses and CloudEvents binding fixtures pass for each supported client.

**Validation.** Generate partitions, concurrent origin appends, duplicate and
reordered MQTT/NATS deliveries, and CAS races. Fold all delivery permutations
and compare canonical frontiers. Run the OASIS client/server conformance
profiles and both structured CloudEvents modes; for MQTT 5.0 also test the
binary mapping. Verify a relay cannot make a malformed origin chain valid.

**Recommended artifacts.** `OriginEntry.v1.schema.json`,
`Frontier.v1.schema.json` as `origin -> {seq, head}`,
`MergeRequest {expectedFrontier, entries}`, `MergeResult`, and
`CoordinationClass {mode: "none" | "fenced" | "consensus", proofSuite}`.
Publish NATS/MQTT subjects, content modes, message schemas, and reply/error
messages in an AsyncAPI 3.0 document.

## 7. Identity is content, then signature

**Standards basis.** RFC 6920 states that a hash-based name gives
name-to-content integrity but does not establish authority or authenticity
([RFC 6920 §10](https://www.rfc-editor.org/rfc/rfc6920.html#section-10)).
[RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html) specifies Ed25519 and
test vectors, while [RFC 9052](https://www.rfc-editor.org/rfc/rfc9052.html)
specifies COSE signing structures and detached payload processing. Both are
standards inputs; “auth arrives as one optional field” is the project’s schema
discipline.

**Measurable conformance.**

- Project threshold: adding/removing signature metadata changes neither the
  canonical unsigned-entry bytes nor its content digest.
- Project threshold: 100% of RFC 8032 vectors and project key-rotation fixtures
  pass; 100% of mutated entry/key/signature combinations fail verification.
- Project threshold: unsigned hash-chain verification remains fully usable,
  and signature verification succeeds after transport through an untrusted
  NATS/MQTT relay.

**Validation.** Run RFC vectors, cross-language signing fixtures,
domain-separation tests, key rotation/revocation histories, and substitution
attacks. Recompute content identity before consulting signer policy, and verify
that authorization decisions cannot alter chain validity.

**Recommended artifacts.** An optional
`auth: {alg: "Ed25519", keyId, signature}` envelope over a
domain-separated unsigned-entry digest, `OriginKeyFact.v1.schema.json`,
`SignatureVerificationReport`, and a COSE profile if binary or detached
interchange is required.

## 8. Capabilities are typed, content-addressed contracts

**Standards and protocol basis.** JSON Schema 2020-12 defines schema resources
and vocabularies ([core](https://json-schema.org/draft/2020-12/json-schema-core))
and instance validation
([validation](https://json-schema.org/draft/2020-12/json-schema-validation)).
AsyncAPI 3.0 describes asynchronous operations, channels, messages, schemas,
bindings, and correlation IDs
([specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)).
MCP 2025-11-25 tools expose JSON Schema input and optional output contracts,
with negotiated capabilities
([MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)).
A2A 1.0 Agent Cards and its authoritative protobuf describe agent capability
discovery and task/artifact interchange
([A2A specification](https://a2a-protocol.org/v1.0.0/specification/),
[protobuf](https://github.com/a2aproject/A2A/blob/v1.0.0/specification/a2a.proto)).

**Measurable conformance.**

- Project threshold: 100% of fetched contracts pass schema and digest
  verification before planning; zero incompatible plans reach execution.
- Project threshold: every composed output/input edge has a stored
  compatibility proof against a versioned, fixture-backed compatibility
  relation. JSON Schema does not itself define universal schema-evolution
  compatibility, so that relation is project policy.
- External profiles: AsyncAPI parser/schema errors = 0; MCP 2025-11-25 core and
  backcompat checks = 100% with zero expected failures; A2A MUST checks = 100%,
  with all SHOULD deviations documented.

**Validation.** Fetch by digest into an empty cache, validate the document,
verify referenced schemas recursively, and test substitution/mutable-URL
attacks. Run official AsyncAPI validation, MCP conformance wire-schema checks,
and the A2A TCK for every claimed binding. Differentially invoke the same
capability through native, MCP, and A2A adapters and compare canonical result
facts.

**Recommended artifacts.** `CapabilityContract.v1.schema.json` containing
name, semantic version, input/output/error schema digests, declared effects,
idempotency, endpoint/binding, and implementation digest;
`CompatibilityProof.v1.schema.json`; `GET /v1/contracts/{algorithm}/{digest}`;
an AsyncAPI 3.0 contract; an MCP `Tool` descriptor; and an A2A Agent Card whose
published skill points to the same content digest.

## 9. Human-in-the-loop is a durable deferred

**Standards and API basis.** BPMN 2.0.2 defines User Tasks, Receive Tasks, and
message/event waits and publishes machine-readable schemas
([OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/)). Serverless Workflow
1.0 supplies event/task DSL and CTK scenarios
([official specification](https://github.com/serverlessworkflow/specification/releases/tag/v1.0.0)).
Amazon States Language defines Wait states and terminal transition semantics
([ASL specification](https://states-language.net/spec.html)). CloudEvents
provides the interoperable resolution envelope, while Temporal demonstrates
durable workflow execution and replay as a de-facto API
([Temporal workflow execution](https://docs.temporal.io/workflow-execution)).
None of these sources proves this project’s zero-held-resource claim.

**Measurable conformance.**

- Project threshold: a suspended deferred consumes zero worker and accelerator
  slots; retained durable bytes are measured separately.
- Project threshold: resolution resumes exactly once after arbitrary worker
  replacement; 100% of duplicate resolution events are idempotent.
- Project threshold: a simulated 30-day wait resumes with byte-identical state,
  and the suite covers approval, rejection, expiry, cancellation, and conflicting
  resolutions. Thirty days is a project soak target, not a standard.

**Validation.** Model suspension as journal facts, kill all workers after the
request, advance only the simulated clock, then resolve from another node.
Validate resolution events against CloudEvents 1.0/JSON and the NATS or MQTT
binding. Run the applicable Serverless Workflow CTK and ASL/Statelint
compatibility fixtures for imported/exported waits.

**Recommended artifacts.** `DeferredRequested.v1.schema.json` with deferred,
workflow, sequence, kind, request digest, and optional expiry;
`DeferredResolved.v1.schema.json` with decision, actor, evidence digest, and
idempotency key; `POST /v1/deferred/{id}/resolve`; CloudEvents types such as
`io.playground.deferred.requested.v1` and `.resolved.v1`.

## 10. Budgets are fences

**Standards basis.** FOCUS 1.4 supplies interoperable billing/cost field
semantics ([FOCUS specification](https://focus.finops.org/focus-specification/v1-4/)).
OTel GenAI supplies development-stage token usage semantics
([GenAI conventions](https://github.com/open-telemetry/semantic-conventions-genai)).
HTTP 429 means “Too Many Requests” and may carry `Retry-After`
([RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)).
These sources do not define transactional budget reservation; the fence is a
project protocol. The IETF `RateLimit` header work remains an Internet-Draft
([datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/))
and must not be presented as a published RFC.

**Measurable conformance.**

- Project threshold: zero accepted claims whose reservation would exceed the
  fenced hard limit; balance conservation holds after every reserve, settle,
  release, retry, and crash.
- Project threshold: all currency uses integer minor units or declared
  fixed-decimal precision; reconciliation differs by zero minor units and zero
  provider-reported tokens.
- Project threshold: an over-budget workflow appends exactly one suspension
  fact before activity dispatch, so forbidden provider calls observed = 0.

**Validation.** Property-test concurrent reservations against a sequential
ledger; inject crashes before/after each journal/storage boundary; replay
duplicate settlements; reconcile exported records to FOCUS-shaped rows; and
verify 429/`Retry-After` adapters without conflating rate-window policy with
cost policy.

**Recommended artifacts.** `BudgetPolicy.v1.schema.json`,
`BudgetReservation.v1.schema.json`, `BudgetSettlement.v1.schema.json`,
`BudgetExceeded.v1.schema.json`, and fenced `reserve`, `settle`, and `release`
operations. Every price/rate policy is content-addressed and cited by the
resulting fact.

## 11. The whole cluster runs under deterministic simulation

**Research basis.** FoundationDB’s official testing documentation describes a
deterministic simulation that runs a cluster, injects failures, and reproduces
a failure from its seed
([testing](https://apple.github.io/foundationdb/testing.html),
[client testing](https://apple.github.io/foundationdb/client-testing.html));
the published system paper describes randomized timing and fault injection
([FoundationDB paper](https://www.foundationdb.org/files/fdb-paper.pdf)).
This establishes a high-value technique, not a normative seed count.

**Measurable conformance.**

- Project threshold: every failure reproduces 100% on the same build and seed;
  a minimized schedule retains the same first divergent digest.
- Project threshold: at least 1,000 seeds per distributed law per pull request
  and at least 1,000,000 schedules nightly, with explicit coverage counters for
  partition, crash, restart, duplication, redelivery, reordering, lost reply,
  and clock-skew fault classes.
- Project threshold: zero generated execution escapes simulated Clock, Random,
  transport, scheduler, or storage services.

**Validation.** Run the full worker/broker/store topology in one seeded logical
scheduler; persist scenario and build digests; shrink failures; replay them in
CI; and measure reached state-machine transitions and fault-class combinations,
not only line coverage.

**Recommended artifacts.** `SimulationConfig.v1.schema.json` with seed,
topology, schedule limit, workload digest, and fault profile;
`SimulationReport.v1.schema.json` with coverage counters and first divergence;
`simulate --seed <n>` and a permanent failing-seed corpus.

## 12. Differential oracles forever

**Research basis.** Differential testing executes common inputs against
comparable implementations and treats divergent results, crashes, or hangs as
candidate defects
([McKeeman, “Differential Testing for Software”](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf)).
The Csmith work demonstrated the approach at scale across C compilers
([original paper](https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf)).
These papers do not prescribe a universal corpus size.

**Measurable conformance.**

- Project threshold: reference, optimized, and distributed implementations
  agree on 100% of the permanent corpus and at least 10,000 randomized valid
  histories per pull request.
- Project threshold: agreement means canonical output bytes, state bytes,
  ordered fact digests, and error classification—not only semantic object
  equality.
- Project threshold: every field bug discovered in production becomes a
  permanent minimized fixture; zero fixture deletions without a recorded
  protocol-version ruling.

**Validation.** Define one sequential model per primitive, feed identical
operations to every implementation, normalize only explicitly nondeterministic
transport metadata, and shrink the first mismatch. Cross-check Temporal,
Serverless Workflow, or ASL only for the explicitly declared compatibility
subset; their different semantics are not automatically oracle failures.

**Recommended artifacts.** `OracleCase.v1.schema.json`,
`DifferentialReport.v1.schema.json`, a common `Oracle<I,O>` adapter contract,
and a registry mapping each primitive/version to its reference implementation
digest and supported external compatibility profiles.

## 13. New languages join by fixture

**Conformance precedents.** The official
[JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite)
is language agnostic, Protobuf maintains a cross-language
[conformance runner and protocol](https://github.com/protocolbuffers/protobuf/tree/main/conformance),
and [Test262](https://github.com/tc39/test262) is TC39’s ECMAScript
conformance suite. JCS and Ed25519 also publish algorithm examples/test vectors
([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html),
[RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html)).

**Measurable conformance.**

- Project threshold: a supported-language badge requires 100% of mandatory
  fixtures byte-for-byte, zero skips, and zero expected-failure baselines.
- Project threshold: positive vectors reproduce canonical bytes, digests,
  heads, states, and claim schedules exactly; 100% of negative vectors return
  the specified structured rejection.
- Project threshold: two independent language implementations reproduce every
  new fixture before it is frozen. This quorum is project policy.

**Validation.** Drive SDKs through a language-neutral stdin/stdout conformance
protocol, hash the runner and corpus, test clean-room decoding, and compare
every pair of implementations. Add official MCP 2025-11-25 core/backcompat
results, A2A MUST results per binding, AsyncAPI validation, and MQTT selected
conformance-clause results to an SDK’s report when it claims those profiles.

**Recommended artifacts.** A signed `conformance-manifest.json` containing
protocol/schema versions, fixture paths, SHA-256 digests, mandatory/optional
classification, and expected canonical outputs; `ConformanceRequest` and
`ConformanceResult` schemas; a machine-readable support badge that embeds the
report digest rather than a human assertion.

## 14. The journal is the trace

**Standards basis.** OTLP defines stable trace/metric/log export over gRPC and
HTTP ([OTLP 1.11.0](https://opentelemetry.io/docs/specs/otlp/)), and its
canonical protobuf messages are published in
[opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto).
[W3C Trace Context](https://www.w3.org/TR/trace-context/) standardizes
`traceparent` and `tracestate` propagation. PROV-DM supplies lineage
relationships, while the development OTel GenAI conventions supply model/token
telemetry. OTLP partial-success responses report rejected item counts and
clients must not retry rejected data as though the entire request failed
([OTLP response handling](https://opentelemetry.io/docs/specs/otlp/#partial-success)).

**Measurable conformance.**

- Project threshold: 100% of exported spans, cost rows, and provenance edges
  cite a source journal sequence and entry digest; orphan projections = 0 and
  telemetry-only execution facts = 0.
- Project threshold: normalized OTLP and PROV projections are byte-identical
  for a fixed `{head, projectorDigest}`; the first mismatch identifies one
  exact source sequence.
- Transport metric: invalid OTLP messages = 0, collector rejected spans = 0,
  and unhandled partial successes = 0 in conformance runs. Export latency,
  sampling, and retention are separately declared operational SLOs.

**Validation.** Regenerate telemetry from an offline receipt with all runtime
instrumentation disabled, export through an OTLP collector, normalize
transport-assigned fields, and compare golden protobuf/JSON. Delete the
telemetry store and rebuild it. Inject a bad projected attribute and verify the
bisector reports the originating journal position.

**Recommended artifacts.** Pure
`projectOTLP({head, projectorDigest}) -> ExportTraceServiceRequest` and
`projectPROV({head, projectorDigest})` functions;
`ProjectionManifest.v1.schema.json`; attributes
`journal.run_id`, `journal.seq`, `journal.entry_digest`, and
`journal.head`; and a registry separating standard OTel attributes from
namespaced digest/cost extensions.

## 15. Time is a recoverable dimension

**Standards and research basis.** RFC 9162 consistency proofs demonstrate that
one authenticated tree is an append-only extension of an earlier tree
([RFC 9162 §2.1.4](https://www.rfc-editor.org/rfc/rfc9162.html#section-2.1.4)).
RFC 6962 is retained only for legacy transparency semantics because it is
Experimental and obsoleted by RFC 9162
([RFC 6962 status](https://www.rfc-editor.org/rfc/rfc6962.html)).
Chandy–Lamport supplies a correctness model for distributed snapshots
([original paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/Determining-Global-States-of-a-Distributed-System.pdf)).
Neither source defines event-sourced snapshot cadence or recovery latency.

**Measurable conformance.**

- Project threshold: for every tested sequence `k`, `stateAt(k)` equals a
  genesis-to-`k` fold byte-for-byte.
- Project threshold: 100% of snapshots verify sequence, chain head, state
  digest, reducer digest, and state bytes before use; every corrupted or
  wrong-version snapshot is rejected and replay fallback succeeds.
- Project threshold: restoring the nearest snapshot and replaying the suffix
  yields the same bytes as full replay; prefix-consistency/inclusion proofs pass
  for every retained transparency checkpoint when that optional view exists.
- Operational SLOs such as snapshot cadence, maximum replay length, recovery
  time, and retention are workload/regulatory choices and must be published
  independently rather than attributed to these standards.

**Validation.** Property-test every prefix in the small exhaustive corpus and
sample prefixes in large generated runs; mutate each snapshot field; restore
under a different node/build that supports the reducer digest; and compare full
replay, snapshot-plus-suffix, and receipt-verifier results. For distributed
frontiers, reconstruct each origin prefix before merging.

**Recommended artifacts.** `Snapshot.v1.schema.json` with run ID, sequence,
chain head, state digest, reducer digest, and state bytes;
`SnapshotVerificationReport`; `stateAt(runId, seq)`,
`createSnapshot(runId, seq)`, `restoreSnapshot(snapshotDigest)`, and
`GET /v1/runs/{runId}/state?atSeq=k`.

## Proof-program rollup

The following gates are the shortest defensible definition of “achieved”:

| Proof family | Required evidence |
| --- | --- |
| Canonical identity | 100% JCS vectors and frozen fixtures; byte-identical cross-language outputs; all mutations rejected. |
| Replay and time travel | Every tested full and prefix replay matches exact bytes; all snapshots verify and equal replay. |
| Commit safety | Every generated history is linearizable; stale-fence accepts and duplicate terminal outcomes are both zero. |
| Federation | All permutations of monotone facts converge; malformed origins and causal regressions are rejected. |
| Cost/provenance | Every inference attempt has one terminal fact; referenced bytes resolve; token and fixed-decimal cost reconciliation is exact. |
| External protocols | AsyncAPI validation has zero errors; Serverless Workflow CTK has zero mandatory failures/skips; MCP 2025-11-25 has zero core/backcompat/wire-schema failures; A2A has 100% MUST results; selected MQTT 3.1.1/5.0 Chapter 7 clauses all pass. |
| Simulation/oracles | All failing seeds reproduce; permanent fixtures never regress; reference and optimized/distributed results agree byte-for-byte. |
| Observability | Every OTLP/PROV/cost projection is journal-derived, deterministic, and linked to an exact journal position; rejected spans and orphan records are zero. |

These are exact correctness and conformance gates. Availability, throughput,
p95/p99 latency, recovery time, convergence time, and retention must be added as
deployment SLOs with a named workload and measurement window; none of the cited
specifications supplies a universal number for them.
