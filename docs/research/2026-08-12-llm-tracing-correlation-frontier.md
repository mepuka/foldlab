# LLM tracing and correlation: the frontier, and where the wedge is

Research memo, 2026-08-12. Convention note: this repo keeps committed
decisions in `docs/adr/`; `docs/research/` is introduced here as the natural
sibling — investigations that INFORM decisions but are not themselves
decisions. Primary sources only; every claim carries a URL or a file:line
into the pinned `node_modules/effect` (4.0.0-beta.107).

---

## TL;DR

**The lane is empty.** Nowhere in observability, agent-audit, or
AI-provenance work does trace identity ITSELF verify: every adjacent system
keeps identity (random/UUID ids per W3C Trace Context) and integrity
(hash chains, signatures, Merkle proofs against an external ledger) as
separate fields. Recomputable trace identity — the span id IS the chain
head over canonical event bytes, verified by recomputation, with a
derivation certificate binding schema + program + input — exists in no
system found (see §5). Meanwhile the demand side is loud: the OTel GenAI
conventions are entirely `Development`-status with open issues begging for
session/conversation identity (§1), and all nine surveyed LLM observability
tools implement "session" as a manually-threaded attribute stamped on
spans, because a W3C trace cannot span a conversation (§2). Correlation
today is ASSIGNED and TRUSTED; ours is RECOMPUTED and CHECKED.

**First artifact: the certified OTLP bridge + verifier wall**
(`src/otelBridge.ts` + a wall-style test). Emit OTel-compatible spans over
the pin's own `effect/unstable/observability/OtlpTracer`: span segments
between anchors become OTLP spans, `gen_ai.*` attributes via the pin's
`effect/unstable/ai/Telemetry`, `gen_ai.conversation.id` = the correlation
key, and `foldlab.cert.*` attributes carry the certificate (schema digest,
program digest, input anchor, span head). W3C-legal 16-byte trace ids and
8-byte span ids are DERIVED projections of the 32-byte heads; the full
heads ride as attributes. The test is the verifier: recompute every head
from the journal fixture and check every certificate on the captured OTLP
payload. Every backend in §2 accepts OTLP, so foldlab traces render today
in Langfuse/Phoenix/Honeycomb — with a verification column nobody else can
fill. Rationale in §6.

---

## 1. OpenTelemetry GenAI semantic conventions

### Status: everything is `Development`; nothing is stable

- `gen-ai-spans.md` opens with "**Status**: [Development]"; agent spans,
  events, and all metrics likewise carry Development badges.
  (https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md,
  .../gen-ai-agent-spans.md, .../gen-ai-events.md, .../gen-ai-metrics.md)
- The conventions were split OUT of the main semantic-conventions repo
  into a dedicated repo, `open-telemetry/semantic-conventions-genai`
  (created 2026-05-05 per the GitHub API; no tagged release exists yet as
  of 2026-08-12). The old page at
  https://opentelemetry.io/docs/specs/semconv/gen-ai/ now says "GenAI
  semantic conventions have moved to the OpenTelemetry GenAI semantic
  conventions repository… no longer maintained in this repository." The
  split gives the fast-moving GenAI work its own cadence, decoupled from
  main-repo releases (main repo: v1.42.0 2026-06-12, v1.43.0 2026-07-03,
  v1.44.0 2026-08-04 per its releases API).

### The span schema for LLM calls

Per `gen-ai-spans.md` (dedicated repo, main branch):

- Span name `{gen_ai.operation.name} {gen_ai.request.model}`; kind
  `CLIENT` (MAY be `INTERNAL` for in-process model calls).
- `gen_ai.operation.name` — **Required** (well-known: `chat`,
  `generate_content`, `text_completion`, `embeddings`, `execute_tool`, …).
- `gen_ai.provider.name` — **Required**. This REPLACED `gen_ai.system`
  (relevant to us: the Effect pin still types `gen_ai.system`, §4).
- `gen_ai.request.model` — Conditionally Required; `gen_ai.response.id`,
  `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` — Recommended.
- `gen_ai.conversation.id` — Conditionally Required "when available" —
  the spec's ONLY conversation-level correlation hook, and it is an
  attribute, not propagated context.
- `gen_ai.input.messages` / `gen_ai.output.messages` — **Opt-In**
  (structured message content; "likely to contain sensitive information
  including user/PII data").

### Agent and tool spans

Per `gen-ai-agent-spans.md`: five span types — `create_agent` (CLIENT),
`invoke_agent` (CLIENT for hosted agents, INTERNAL for in-process
frameworks), `invoke_workflow` (INTERNAL, multi-agent coordination),
`plan` (INTERNAL), plus the `execute_tool` operation. Attributes:
`gen_ai.agent.id` ("for hosted agents… the provider-assigned stable
identifier"), `gen_ai.agent.name`, `gen_ai.conversation.id`. Multi-agent
correlation is span HIERARCHY plus the conversation-id attribute — "the
tool or task spans produced from the plan are typically sibling operations
under the same `invoke_agent` span"; there is no link-based correlation
mechanism for sub-agents.

### Events and metrics

- Events (`gen-ai-events.md`): `gen_ai.client.inference.operation.details`
  (full request/response details as a log event, "could be used to store
  input and output details independently from traces") and
  `gen_ai.evaluation.result`. Both Development.
- Metrics (`gen-ai-metrics.md`): all histograms, all Development —
  `gen_ai.client.token.usage`, `gen_ai.client.operation.duration`,
  `gen_ai.client.operation.time_to_first_chunk`, server-side duration/
  time-per-token, and agent-level `gen_ai.invoke_agent.duration`,
  `gen_ai.invoke_agent.inference_calls`, `gen_ai.invoke_agent.tool_calls`,
  `gen_ai.execute_tool.duration`.

### Governance and cadence

The "Semantic Conventions and Instrumentation: GenAI" SIG owns this work,
meeting weekly (general topics Tuesdays 9:00 PT; **agent-related topics
have their own weekly Monday 9:00 PT meeting** — a signal of where the
churn is), Slack `#otel-genai-instrumentation`.
(https://github.com/open-telemetry/community/blob/main/README.md)

### The controversies

1. **Content capture has zigzagged across signal types.** Prompt/completion
   content moved from span events to log-based per-message events in
   PR #980 ("Introduce per-message structured GenAI events instead of
   prompt/completion span events", merged 2024-10-04,
   https://github.com/open-telemetry/semantic-conventions/pull/980), then
   BACK to opt-in span attributes in PR #2179 ("Using attributes for chat
   history on gen_ai spans and events", merged 2025-08-19,
   https://github.com/open-telemetry/semantic-conventions/pull/2179). The
   official OTel blog now describes content capture as "structured span
   attributes rather than separate event types," off by default
   (https://opentelemetry.io/blog/2026/genai-observability/). Anyone who
   instrumented against the 2024 event shape got broken; the churn is why
   the conventions remain Development.
2. **Sessions/conversations are an acknowledged hole.** Open issues in the
   dedicated repo: #51 "Add session.id attribute to GenAI semantic
   conventions", #303 "Add Gen AI user and session Semantic Conventions",
   #356 "Add gen_ai.conversation_root attribute to invoke_agent and
   invoke_workflow spans to enable session/conversation views in
   observability UIs", #332 "Add gen_ai.agent.turn attribute"
   (https://github.com/open-telemetry/semantic-conventions-genai/issues/51,
   /303, /356, /332). The spec knows a trace is smaller than a
   conversation and is groping for the identity layer above it — which is
   exactly the layer where foldlab's root anchor lives.

---

## 2. The LLM observability landscape: how each tool does correlation

Full survey against official docs/repos only. The correlation mechanics
column is the point.

| Tool | Identity objects | What ties call → conversation → session | OTel posture | Open/closed |
|---|---|---|---|---|
| **OpenLLMetry / Traceloop** | W3C trace/span ids; `traceloop.span.kind` workflow/task/agent spans | Manual `set_association_properties()` → `traceloop.association.properties.*` span attrs (any string key: user_id, chat_id, …); no first-class session (https://www.traceloop.com/docs/openllmetry/tracing/association) | Native OTel SDK; emits `gen_ai.*` ("our semantic conventions are now part of OpenTelemetry", https://github.com/traceloop/openllmetry) | Apache-2.0; SaaS backend commercial |
| **Langfuse** | 32-hex trace / 16-hex observation ids (W3C-shaped, SEEDABLE — deterministic ids from a seed string for external correlation); sessions; user_id (https://langfuse.com/docs/observability/data-model) | Manual `propagate_attributes(session_id=…)` context; sessionId attribute groups traces (https://langfuse.com/docs/observability/features/sessions) | OTel-native v4 SDK + OTLP ingest `/api/public/otel`; maps `langfuse.session.id`/`session.id`, `user.id` (https://langfuse.com/docs/opentelemetry/get-started) | MIT except `ee/` (https://github.com/langfuse/langfuse) |
| **LangSmith** | Run UUIDs; `trace_id` = root run UUID; `dotted_order` time+UUID chain (https://docs.langchain.com/langsmith/run-data-format) | Thread = `session_id`/`thread_id` METADATA key; docs: "you must set the thread metadata … on **all runs**, including child runs" (https://docs.langchain.com/langsmith/threads) | Bridge: OTLP ingest at `api.smith.langchain.com/otel`; accepts gen_ai.*, OpenInference, traceloop.* (https://docs.langchain.com/langsmith/trace-with-opentelemetry) | Platform closed; SDK MIT |
| **Braintrust** | `span_id`, `root_span_id`, `span_parents[]` — a DAG, multi-parent spans (https://www.braintrust.dev/docs/guides/traces/extend) | No session object; a conversation is ONE long-lived trace resumed turn-by-turn via `currentSpan().export()` slugs passed as `parent:` | Bridge: OTLP at `api.braintrust.dev/otel/v1/traces`; gen_ai.* + `braintrust.*`; W3C traceparent helpers (https://www.braintrust.dev/docs/integrations/opentelemetry) | Platform proprietary; SDK Apache-2.0 |
| **W&B Weave** | Calls (`id`, `trace_id`, `parent_id`), versioned ops, `thread_id` (UUIDv7) + `turn_id` (https://weave-docs.wandb.ai/guides/tracking/threads/) | `weave.thread(thread_id?)` context manager stamps thread/turn on calls; auto-UUID if omitted | Own call model + OTLP ingest `traces.wandb.ai/otel/v1/traces` (gen_ai, OpenInference) (https://weave-docs.wandb.ai/guides/tracking/otel/) | Apache-2.0 (https://github.com/wandb/weave) |
| **Arize Phoenix** | W3C ids + OpenInference `session.id`, `user.id`, `openinference.span.kind` (https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md) | `using_session(session_id=…)` puts the id in OTel Context; instrumentors stamp `session.id` span attribute; traces sharing it form a Session (https://arize.com/docs/phoenix/tracing/how-to-tracing/setup-tracing/setup-sessions) | Native OTel (OTLP ingest; `arize-phoenix-otel` wrapper); OpenInference rather than gen_ai.* | Elastic License 2.0 (source-available) |
| **Honeycomb** | Plain W3C OTel ids; no LLM/session objects | Whatever custom span attributes you add; grouping at query time (https://docs.honeycomb.io/get-started/start-building/llm/) | Native OTLP ingest; no documented gen_ai.*-specific handling | Closed SaaS |
| **Datadog LLM Obs** | ddtrace spans with LLM span kinds (llm/workflow/agent/tool/task/embedding/retrieval), `ml_app`, `session_id` (https://docs.datadoghq.com/llm_observability/terms/) | `session_id` parameter per span via decorators/`LLMObs.annotate()` — manual; `ml_app` global (https://docs.datadoghq.com/llm_observability/instrumentation/sdk/) | Bridge: agentless OTLP intake (`dd-otlp-source=llmobs`); maps **`gen_ai.conversation.id` → `session_id`** (https://docs.datadoghq.com/llm_observability/instrumentation/otel_instrumentation/) | Platform closed; ddtrace SDK open |
| **Pydantic Logfire** | Pure W3C OTel ids ("opinionated wrapper around OpenTelemetry", https://github.com/pydantic/logfire) | Standard OTel parent/child only; NO session/conversation concept documented — custom attributes + queries (https://pydantic.dev/docs/logfire/observe/llm-panels/) | Native OTel; gen_ai.* rendered; OTLP in/out | SDK MIT; platform closed |

**The cross-cutting fact:** in all nine tools, "session/conversation" is an
attribute stamped onto spans — never a propagated trace, never derived from
content, always developer-supplied and manually threaded (LangSmith says so
outright; Langfuse/Phoenix/Weave soften it with context managers that still
take a developer-supplied id). Braintrust is the structural outlier
(conversation = one resumable trace, DAG-shaped), which proves the same
point from the other side: to make a trace span a conversation they had to
abandon the tree. Every id in every tool is assigned (random or UUID) and
trusted; none is recomputable from content. And every tool accepts OTLP —
an OTLP-emitting bridge reaches ALL of them.

---

## 3. Context propagation at the frontier, and where correlation breaks

### The specs

- **W3C Trace Context** (Level 1 is the Recommendation; Level 2 is a
  Candidate Recommendation Draft, 2024-03-28,
  https://www.w3.org/TR/trace-context-2/): `trace-id` is **16 bytes** (32
  lowercase hex chars, all-zero forbidden); `parent-id` (span id) is
  **8 bytes** (16 hex). Level 2 adds randomness: implementers "SHOULD use
  a trace-id generation method which randomly (or pseudo-randomly)
  generates at least the right-most 7 bytes", and a new `random-trace-id`
  flag which, when set, means "at least the right-most 7 bytes of the
  trace-id MUST be selected randomly … with uniform distribution."
  Consequence for foldlab: a 32-byte chain head does not fit; see §6.
- **W3C Baggage** (Candidate Recommendation snapshot 2024-05-30,
  https://www.w3.org/TR/baggage/): key-value propagation; platforms MUST
  propagate all list-members up to 64 entries / 8192 bytes total; the spec
  itself warns values cross trust boundaries in the clear. A 64-hex-char
  head in baggage costs ~80 bytes — comfortably within limits.

### Where correlation breaks today (documented pain, primary sources)

1. **Message queues.** The OTel messaging conventions gave UP on
   parent/child through queues: "These conventions use spans links as the
   default mechanism to correlate producers and consumer(s) because: It is
   the only consistent trace structure that can be guaranteed" —
   parent/child is permitted "exclusively for single messages scenarios."
   Batch receive is worse: "a span can only have a single parent," so a
   batch-processing span must LINK to each message's creation context.
   (https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
2. **Async/streaming.** Merged async generators lose the active span as
   the event loop swaps contexts
   (https://github.com/open-telemetry/opentelemetry-python/discussions/3792);
   the OTel Collector itself loses context through its persistent queue
   (https://github.com/open-telemetry/opentelemetry-collector/issues/11740).
3. **Multi-agent / MCP.** Trace context is lost at the MCP transport
   boundary when an agent calls tools on remote MCP servers
   (https://github.com/microsoft/agent-framework/issues/3778).
4. **Conversations outlive traces.** The clearest systemic evidence: every
   vendor in §2 bolted a session attribute on top of traces, and the OTel
   GenAI repo has open issues (#51, #303, #356) asking for standard
   session/user identity because `gen_ai.conversation.id` alone doesn't
   cover it. Humans-in-the-loop, retries, and batch jobs all sever the
   context chain the same way: W3C context is ambient and process-bound,
   so anything that parks work (a queue, a human, a cron) drops it.

The pattern: wherever the AMBIENT context (implicit, runtime-carried)
breaks, the industry patches with either links (queues) or attributes
(sessions). foldlab's position is that correlation should be a property of
the DATA (correlation key → entity, anchor → span segment), so it survives
every gap that kills ambient context — the journal doesn't care that a
human slept between events.

---

## 4. Effect's observability story at the pin (effect@4.0.0-beta.107)

Everything below verified against `node_modules/effect/dist` in this repo.

### Tracer (`effect/Tracer`)

- `Tracer` is a service with one method: `span(options) => Span` — a
  custom tracing backend is just `Tracer.make({ span(options) {...} })`
  (`node_modules/effect/dist/Tracer.d.ts:26-38`, `make` at `:439`).
- `Span` carries `spanId: string`, `traceId: string` — PLAIN STRINGS, no
  length or format validation in the core (`Tracer.d.ts:358-374`). This is
  the crucial degree of freedom: an in-process foldlab tracer can mint
  spans whose ids ARE 64-hex chain heads and Effect will carry them.
- `ExternalSpan` + `externalSpan(...)` adopt foreign trace/span ids as
  parents (`Tracer.d.ts:189-195`, `:479-484`); `ParentSpan` is the context
  service for the current parent (`:161`); `DisablePropagation`,
  `CurrentTraceLevel`, `MinimumTraceLevel` control propagation/sampling
  (`:514`, `:533`, `:558`).
- The default `NativeSpan`: `traceId = parent?.traceId ?? randomHexString(32)`,
  `spanId = randomHexString(16)` (`Tracer.js:292-293`) — W3C-sized, but
  generated with `Math.random` (`Tracer.js:314-324`), i.e. not even
  cryptographically random. Assigned-and-trusted identity, in the pin.

### OTLP export (`effect/unstable/observability`)

- The pin ships a complete self-contained OTLP stack — no external OTel
  SDK needed: `Otlp`, `OtlpExporter`, `OtlpLogger`, `OtlpMetrics`,
  `OtlpResource`, `OtlpSerialization`, `OtlpTracer`, `PrometheusMetrics`
  (`node_modules/effect/dist/unstable/observability/index.d.ts:7-35`).
- `OtlpTracer.make/layer/layerFromConfig` export ended sampled spans to an
  OTLP HTTP endpoint, honoring `OTEL_EXPORTER_OTLP_*` env config
  (`OtlpTracer.d.ts:22-68`; env handling `OtlpTracer.js:120-135`).
- Caveat: `OtlpTracer` constructs its OWN spans with its own
  `generateId(32)`/`generateId(16)` (`OtlpTracer.js:158-176`, also
  `Math.random`) — id generation is NOT injectable there. So digest-derived
  ids require a custom `Tracer` (wrapping the OTLP exporter machinery), or
  ids stay OTel-native and the heads ride as attributes (§6 takes this
  fork seriously).

### W3C propagation (`effect/unstable/http/HttpTraceContext`)

- `toHeaders` emits `traceparent` (`00-{traceId}-{spanId}-{flags}`) and B3
  by string interpolation of whatever ids the span carries
  (`HttpTraceContext.js:25-31`) — a 64-hex trace id would produce a
  traceparent every W3C parser downstream rejects.
- `fromHeaders`/`w3c` DECODE enforces the spec sizes:
  `/^[0-9a-f]{32}$/` for trace id, `/^[0-9a-f]{16}$/` for span id
  (`HttpTraceContext.js:100-101`, `:112-138`). So heads cannot round-trip
  as W3C ids even between two foldlab processes using this module.

### GenAI telemetry (`effect/unstable/ai/Telemetry`)

- Types the OTel GenAI attributes: `GenAITelemetryAttributes` covering
  `gen_ai.*`, `gen_ai.operation.*`, `gen_ai.token.*`, `gen_ai.usage.*`
  (`inputTokens` → `gen_ai.usage.input_tokens`), `gen_ai.request.*`,
  `gen_ai.response.*` (`Telemetry.d.ts:30`); `WellKnownOperationName =
  "chat" | "embeddings" | "text_completion"` (`:168`); `WellKnownSystem`
  (anthropic, openai, …) (`:180`).
- `addGenAIAnnotations(span, options)` writes them onto a live span
  (`:409`); `SpanTransformer`/`CurrentSpanTransformer` is a service hook
  that sees every provider request/response and can stamp custom
  attributes (`:522`, `:545`) — the natural injection point for
  certificate attributes on LLM spans.
- **Drift alert:** the pin types `gen_ai.system` (`BaseAttributes.system`,
  `Telemetry.d.ts:45-51`), but the current semconv REPLACED it with
  `gen_ai.provider.name` (§1), and the operation-name enum lacks
  `execute_tool`/`invoke_agent`. Exactly the beta-rename/spec-churn risk
  NEXT.md already confines to the adapter layer — telemetry attributes are
  another derived adapter, never hand-copied.
- `unstable/ai/IdGenerator`: tool-call/response ids are an injectable
  service (`IdGenerator.d.ts:16-55`) — deterministic, digest-derived tool
  call ids are a supported extension point, not a fork.

### `@effect/opentelemetry` at the beta

Exists, pinned to our exact version: npm dist-tag `beta` =
`4.0.0-beta.107`, peer-depending on `effect ^4.0.0-beta.107` and the
official `@opentelemetry/sdk-*` >= 2.0 packages
(https://www.npmjs.com/package/@effect/opentelemetry, registry metadata
for 4.0.0-beta.107). Effect's own packaged guidance: use the lightweight
`unstable/observability` Otlp modules in new projects; use
`@effect/opentelemetry` NodeSdk when integrating with an existing OTel
setup (`node_modules/effect/CLAUDE.md`, "Observability" section). For the
first artifact the in-repo Otlp modules suffice — zero new dependencies.

---

## 5. The wedge: who else does verifiable correlation? (nobody)

Systematic search across observability, transparency-log, agent-audit,
and AI-provenance lanes:

- **Content-derived trace identity: not found anywhere.** The standard
  points the opposite way — W3C Trace Context Level 2 says ids SHOULD be
  random (https://www.w3.org/TR/trace-context-2/). The nearest existing
  things are conveniences: Langfuse's seed-derived deterministic trace ids
  (for correlating with ticket numbers — no chain, no verification;
  https://langfuse.com/docs/observability/features/trace-ids-and-distributed-tracing)
  and deterministic span-id generators for test replay.
- **Transparency ledgers verify storage, not identity.** Trillian
  (https://github.com/google/trillian), Sigstore Rekor
  (https://github.com/sigstore/rekor), Azure Confidential Ledger
  (https://learn.microsoft.com/en-us/azure/confidential-ledger/overview),
  immudb (https://github.com/codenotary/immudb) all prove an entry, once
  written, wasn't altered — inclusion/consistency proofs against an
  external log; ids are storage coordinates. None is integrated with
  tracing. AWS QLDB — the managed verifiable journal — was RETIRED
  (end of support 2025-07-31), with AWS's suggested migration losing
  cryptographic verifiability
  (https://docs.aws.amazon.com/qldb/latest/developerguide/what-is.overview.html);
  evidence that ledger-as-a-service struggled as a product, while
  EMBEDDED verifiability (ours: offline recomputation, no ledger service)
  is a different shape.
- **Agent audit trails (2024-2026) chain records under conventional ids.**
  IETF `draft-sharif-agent-audit-trail-00` (2026-03): hash-chained agent
  audit records (`prev_hash` = SHA-256 of previous record's RFC 8785
  canonical JSON) but `record_id`/`session_id` are UUIDv4 and there is no
  OTel/trace-id relation
  (https://datatracker.ietf.org/doc/draft-sharif-agent-audit-trail/).
  "Right to History" (Merkle audit logs for agent actions,
  https://arxiv.org/abs/2602.20214) and "Proof of Execution"
  (tamper-evident, deterministically reconstructible trajectories,
  https://arxiv.org/abs/2607.05397) are closest in INTENT; neither derives
  identity from content nor carries schema/program digests. The closest
  MECHANISM match is VCT, "A Verifiable Transcript System for LLM
  Conversations" (https://arxiv.org/abs/2606.23003): branch-level hash
  chains → session Merkle roots, recomputable — but scoped to transcript
  fork-detection between user and server, not trace/span identity or
  observability pipelines.
- **AI provenance binds assets and decisions, not traces.** C2PA covers
  model OUTPUTS (`digitalSourceType = trainedAlgorithmicMedia`,
  https://spec.c2pa.org/specifications/specifications/2.4/ai-ml/ai_ml.html);
  SLSA (https://slsa.dev) stays build-time. The most interesting standards
  vehicle: in-toto attestation issue #554 (2026-05) proposes an
  `agent-decision/v0.1` predicate for runtime agent authorization
  decisions — tool calls with SHA-256 `args_hash`, optional
  `trace_parent`, explicitly motivated by EU AI Act Article 12
  (https://github.com/in-toto/attestation/issues/554). Signed statements
  with argument hashes; no chained identity. A plausible interop target
  for foldlab certificates, not a competitor.
- **The phrase space is unclaimed.** No OTEP or spec issue on signing or
  integrity-protecting telemetry exists
  (https://github.com/open-telemetry/opentelemetry-specification/blob/main/oteps/README.md);
  OTLP integrity is TLS-only (https://opentelemetry.io/docs/specs/otlp/).
  Recent academic work states the gap: OTel span linkage is "purely
  referential" — storage-level actors can modify or reorder spans
  undetectably (https://arxiv.org/pdf/2603.14332).
- **Demand-side clock:** EU AI Act Article 12 requires high-risk AI
  systems to automatically record events over the system lifetime
  (https://artificialintelligenceact.eu/article/12/), with obligations
  biting 2026-08-02. The article mandates logging, not cryptographic
  verifiability — the tamper-evident reading is interpretation, which is
  the gap the audit-trail startups above are selling into with hash
  chains bolted onto assigned ids.

**Verdict:** every adjacent lane separates identity from integrity and
verifies against an external authority (ledger, signature, log server).
foldlab's composite — trace identity that IS a recomputable digest, with a
derivation certificate binding schema digest + program digest + input
anchor + span head, auditable offline by recomputation — exists nowhere
found. The lane is empty; the adjacent lanes (in-toto #554, IETF agent
audit draft, OTel GenAI session issues) are where a foldlab-shaped
proposal would land with maximum leverage.

---

## 6. What to build first

### Can a 32-byte head be a W3C trace id? No — and that's fine

- The formats are fixed-width: trace-id 16 bytes, span-id 8 bytes
  (https://www.w3.org/TR/trace-context-2/). The pin enforces this on
  decode (`HttpTraceContext.js:100-101`) and would emit an invalid
  `traceparent` on encode if given 64 hex chars (`:30`). A 32-byte head
  cannot ride in the id fields.
- **Derived-id discipline:** `traceId16 = rootAnchorHead[0..16)`,
  `spanId8 = spanHead[0..8)`. SHA-256 output bytes are uniformly
  distributed, so derived ids satisfy Level 2's entropy INTENT (sampling/
  sharding work); leave the `random-trace-id` flag UNSET, since the bytes
  are selected by derivation, not randomly, and the flag's MUST is about
  the generation method. The derived ids are PROJECTIONS — recomputable
  themselves, but never trusted: verification always recomputes the full
  32-byte head. (In foldlab language: the 16-byte id is transport; nothing
  fingerprints a transport form.) Truncation collisions and adversarial
  grinding against 8-byte span ids are therefore rendering concerns, not
  integrity concerns — integrity lives in the full head.
- **The full heads ride as attributes and baggage.**
  Span attributes: `foldlab.cert.schema_digest`,
  `foldlab.cert.program_digest`, `foldlab.cert.input_anchor`,
  `foldlab.cert.span_head`, plus `foldlab.trace.root_anchor`. Cross-process:
  one baggage entry (~80 bytes of 8192 allowed,
  https://www.w3.org/TR/baggage/) carries the current anchor so a remote
  hop can parent correctly even when ambient context died (§3's queues/
  humans/retries) — the journal remains the source of truth either way
  (ADR-0005).

### The OTel bridge, concretely

One module, using only what the pin already ships:

1. **Span mapping.** Spans = journal segments between anchors (NEXT.md
   backlog 4); each segment becomes an OTLP span: name from the operation,
   `gen_ai.*` attributes via `Telemetry.addGenAIAnnotations` /
   `CurrentSpanTransformer` for LLM calls, `gen_ai.conversation.id` = the
   correlation key (the attribute Datadog already maps to session, §2, and
   the only conversation hook the spec has, §1), certificate fields as
   `foldlab.cert.*`.
2. **Identity.** A foldlab `Tracer` via `Tracer.make` whose spans carry
   derived 16/8-byte ids (parenting via `Tracer.externalSpan` for adopted
   contexts), exporting through the pin's OTLP machinery
   (`unstable/observability`). Fallback fork if wrapping the exporter
   fights the beta: keep `OtlpTracer` ids and carry ALL identity in
   attributes — verification never depended on the id fields anyway.
3. **The verifier IS the wall test.** Capture the OTLP JSON payload
   (`OtlpTracer` serializes to a documented shape, `OtlpTracer.d.ts:75-140`)
   as a fixture; the test recomputes every span head and certificate field
   from the journal fixture and asserts byte-identity — the same frozen-
   fixture discipline as `stream-wall.json` (ADR-0001), extended to
   telemetry. On mismatch, a port drifted or someone tampered; both are
   the product working.
4. **Demo target:** Langfuse's OTLP endpoint first (MIT-licensed,
   self-hostable, renders `session.id`), then Phoenix and Honeycomb — §2
   shows all nine accept OTLP, so one bridge reaches the whole landscape.
   The pitch renders itself: foldlab traces in THEIR UI, plus a
   `foldlab verify` recomputation no other tool's traces can pass.

### Why this artifact and not the others considered

- *A custom trace UI*: worthless now; every backend already renders OTLP,
  and the wedge is verification, not rendering.
- *An OTel semconv proposal (conversation_root as digest)*: premature
  until the bridge exists; the open issues (#51/#303/#356) are the landing
  strip LATER, with running code.
- *mintEffect / NATS lanes first*: they deepen the fence but don't touch
  the flagship use case; the bridge is the shortest path from standing
  walls (collector, spans-between-anchors, certificates as minted schema)
  to the strategic story — verifiable correlation visible inside the tools
  people already use.

---

## What this changes in NEXT.md (proposed edits, not applied)

1. **Promote and sharpen backlog item 4.** "Entity census over real agent
   streams" becomes two items: (a) spans = segments between anchors with
   span id = chain head (unchanged, internal identity), and (b) NEW: the
   **certified OTLP bridge + verifier wall** (`src/otelBridge.ts`,
   `test/otel.wall.test.ts`) — derived 16/8-byte W3C ids as projections of
   heads (projection law: derived ids are transport, never inputs to
   verification), `gen_ai.*` + `gen_ai.conversation.id` + `foldlab.cert.*`
   attributes, OTLP fixture frozen and recomputed like `stream-wall.json`.
   Demo: Langfuse OTLP ingest.
2. **Certificate becomes a minted schema now.** Ratified decision 4
   already names it; the bridge is its first consumer, so
   `Certificate = {schemaDigest, programDigest, inputAnchor, spanHead}`
   should be minted through the fence before the bridge lands (the bridge
   then carries only handles, per the composition discipline).
3. **Extend ratified decision 5 (derived adapters) to telemetry
   attributes.** The pin's `unstable/ai/Telemetry` still types
   `gen_ai.system`; the spec now requires `gen_ai.provider.name` and the
   conventions are Development-status in a NEW repo
   (open-telemetry/semantic-conventions-genai) with no release yet — the
   gen_ai attribute surface must be a derived adapter with the spec
   version pinned in the adapter's meta, never hand-copied strings.
4. **Add a standing "outside clocks" note.** EU AI Act Article 12 logging
   obligations bite 2026-08-02 (demand for tamper-evident agent logs);
   in-toto attestation #554 (`agent-decision` predicate) is the interop
   target for exporting certificates as attestations; OTel GenAI issues
   #51/#303/#356 are where a "conversation root as recomputable anchor"
   proposal lands once the bridge runs.
5. **Name the wedge in the brief.** "Verifiable correlation" /
   "recomputable trace identity" is an unclaimed phrase space (§5) — the
   strategic-story paragraph should commit to it: the industry's
   correlation is assigned and trusted; foldlab's is recomputed and
   checked, and the same journal fold serves both the OTel rendering and
   the audit (ADR-0005's "one mechanism", now with outside evidence that
   nobody else has it).
