# OTLP backend selection for the destination demo

Research memo, 2026-08-12. Resolves `docs/map/tickets/006-otlp-backend-selection.md`.
Primary sources only; every claim carries a URL, checked today against current
docs. Evaluated: Langfuse, Arize Phoenix, Honeycomb (ticket minimum), plus two
newer candidates from the current landscape — SigNoz and Laminar. The deciding
criterion, per the ticket: `foldlab.cert.*` attributes (64-hex-char digests)
must be VISIBLE in the trace UI, not buried. Extra points for export fidelity,
because the destination sentence is "a stranger recomputes every span id …
from the exported bundle" — a one-way sink cannot host that demo.

---

## TL;DR

**Recommendation: Langfuse** (self-hosted, or Hobby cloud tier), with the
bridge dual-emitting certificate attributes — canonical `foldlab.cert.*` plus
Langfuse's documented `langfuse.observation.metadata.*` mapping so the
certificate fields surface as first-level, filterable, visibly-rendered
metadata. Langfuse is the only surveyed backend that satisfies all five
criteria at once: OTLP/HTTP ingest matching the pin's own HTTP-only
`OtlpTracer`, GenAI-semconv-compliant rendering, MIT self-host AND a free
cloud tier, **public per-trace share links** (a stranger views a trace with
zero accounts — unique among all five), and a full read-back API so the
exported bundle is recoverable for verification.

**Runner-up: Arize Phoenix** — renders and filters arbitrary custom
attributes natively (no renaming needed) and has the strongest span-export
DSL, but the OSS build still does not recognize `gen_ai.*` conventions
(open issue, Todo), and it has no anonymous per-trace sharing.

**Honeycomb** has the best raw attribute visibility in the industry (every
attribute is a queryable column) and first-class `gen_ai.*` support (Agent
Timeline, May 2026), but it is disqualified as primary: raw data export is
capped at 1000 rows via UI download and the Query Data API is
Enterprise-only and returns aggregates — a one-way sink for a free-tier
public demo. Worth a second screen in the demo; not the home.

---

## 1. Criteria (from ticket 006)

1. OTLP ingest mechanics: endpoint, auth, HTTP vs gRPC, protobuf vs JSON.
2. Custom span attribute visibility in the trace UI — the deciding criterion.
3. `gen_ai.*` (OTel GenAI semantic conventions) support.
4. Free-tier / self-host viability for a public demo a stranger can look at.
5. Export fidelity: can spans be gotten back OUT (extra points).

One constraint from our side narrows criterion 1: the pin's exporter
(`effect/unstable/observability/OtlpTracer`, effect@4.0.0-beta.107) speaks
OTLP over **HTTP** (see the 2026-08-12 correlation-frontier memo, §4). A
backend that is HTTP-only loses nothing; a backend that is gRPC-only would
be disqualified. None surveyed is gRPC-only.

---

## 2. Langfuse

1. **Ingest.** OTLP endpoint `/api/public/otel` (cloud:
   `https://cloud.langfuse.com/api/public/otel`, US/JP/HIPAA variants; same
   path self-hosted). Basic Auth, base64 of `pk-lf-…:sk-lf-…`. "OTLP over
   HTTP with both `HTTP/JSON` and `HTTP/protobuf`"; "gRPC is not supported
   yet." (https://langfuse.com/docs/opentelemetry/get-started) HTTP-only is
   a non-issue given the pin's HTTP exporter.
2. **Custom attributes.** The mapping is explicit
   (https://langfuse.com/integrations/native/opentelemetry): unmapped OTel
   attributes land nested under `metadata.attributes` (catch-all) — visible
   in the observation's metadata pane but NOT filterable, since "Langfuse
   only supports filtering on top-level keys within the `metadata` of an
   event." Attributes prefixed `langfuse.observation.metadata.*` (or
   `langfuse.trace.metadata.*`) become **first-level `metadata` keys —
   filterable** and rendered prominently. The community has hit the buried
   default (https://github.com/langfuse/langfuse/issues/5583,
   https://github.com/orgs/langfuse/discussions/9677); the prefix mapping is
   the documented cure. Consequence for the bridge: **dual-emit** — keep
   canonical `foldlab.cert.*` for the bundle, add
   `langfuse.observation.metadata.foldlab_cert_*` twins for rendering.
   Verdict on the deciding criterion: PASS with the documented mapping;
   FAIL if we emitted only the neutral names.
3. **gen_ai.** "Langfuse aims to be compliant with the OpenTelemetry GenAI
   semantic conventions" — maps `gen_ai.request.model`, `gen_ai.usage.*`
   (token counts drive cost calculation), prompt/completion rendering.
   (https://langfuse.com/docs/opentelemetry/get-started)
4. **Free/self-host, stranger access.** Cloud Hobby tier: 50k units/month,
   2 users, 30 days access, no card (https://langfuse.com/pricing).
   Self-host free — MIT license except `ee/`
   (https://github.com/langfuse/langfuse). The clincher: **traces and
   sessions can be made public and shared via link** — viewers need no
   login and no project membership
   (https://langfuse.com/docs/observability/features/url,
   https://langfuse.com/changelog/2023-09-14-public-link-sharing). No other
   surveyed backend has anonymous per-trace URLs.
5. **Export.** Public GET APIs — Observations API v2 ("retrieve observation
   data (spans, generations, events)"), Scores v3, Metrics v2 — Basic Auth,
   available on cloud and self-host v4+, plus UI batch exports and
   scheduled blob-storage exports (https://langfuse.com/docs/api). Custom
   attributes ride back out inside `metadata.attributes` per the mapping
   above. Caveat to pin in ticket 007: the round-trip returns Langfuse's
   data model (JSON), not OTLP protobuf — the ingestion fixture must freeze
   what the verifier actually reads.

## 3. Arize Phoenix

1. **Ingest.** Self-host: OTLP/gRPC on `:4317` (`PHOENIX_GRPC_PORT`),
   OTLP/HTTP at `:6006/v1/traces` (`PHOENIX_PORT`); protocols
   `http/protobuf` and `grpc`
   (https://arize.com/docs/phoenix/self-hosting/configuration,
   https://pypi.org/project/arize-phoenix-otel/). Cloud:
   `https://app.phoenix.arize.com/v1/traces` with `PHOENIX_API_KEY` /
   `authorization: Bearer <key>`
   (https://arize.com/docs/phoenix/self-hosting/features/authentication).
2. **Custom attributes.** Arbitrary span attributes are first-class: the
   span-details view shows the full attributes payload, and the query/
   filter DSL addresses them directly — "Span attributes can be selected by
   simply listing them inside `.select()`"; filters support "attribute and
   annotation access, substring search, `is None`, and the full operator
   set"
   (https://arize.com/docs/phoenix/tracing/how-to-tracing/importing-and-exporting-traces/extract-data-from-spans).
   `foldlab.cert.*` would be visible and searchable AS-IS, no renaming.
   Verdict: PASS, cleanest of the five.
3. **gen_ai.** FAIL today in OSS Phoenix. Native convention is
   OpenInference (`llm.input_messages`, `openinference.span.kind`);
   the tracker issue "OpenTelemetry Gen AI Semantic Conventions Support"
   (https://github.com/Arize-ai/phoenix/issues/10622, opened 2025-12-13) is
   still open, status Todo, no linked PRs as of today: "Phoenix … does not
   recognize the official OpenTelemetry Gen AI Semantic Conventions," and
   gen_ai-instrumented spans "produce empty dataset examples." The
   commercial Arize AX platform DID ship gen_ai→OpenInference mapping
   (https://arize.com/blog/arize-ax-opentelemetry-genai-semantic-conventions/)
   — a sign it will trickle down, but not there now. Our `gen_ai.*` spans
   would render as generic spans with visible attributes, losing the
   LLM-shaped UI (messages, token/cost panels).
4. **Free/self-host.** "Phoenix is free to self-host with no feature
   limitations … No license fees, no usage limits, no feature gates"
   (https://arize.com/docs/phoenix/self-hosting); Elastic License 2.0
   (source-available). A public read-only demo means running an instance
   with auth off or shared viewer creds — workable, but no per-trace
   public links.
5. **Export.** Strongest of the five: `get_spans_dataframe()` pulls whole
   projects; the `SpanQuery` DSL (`.where()`, `.select()`, `.explode()`)
   extracts arbitrary attributes; `arize-phoenix-client` wraps the REST API
   (https://arize.com/docs/phoenix/tracing/how-to-tracing/importing-and-exporting-traces/extract-data-from-spans,
   https://pypi.org/project/arize-phoenix-client/).

## 4. Honeycomb

1. **Ingest.** `api.honeycomb.io:443` (gRPC) / `https://api.honeycomb.io`
   + `/v1/traces` (HTTP); EU variants; auth header
   `x-honeycomb-team: <api-key>`. "OTLP over gRPC, HTTP/protobuf, and
   HTTP/JSON." (https://docs.honeycomb.io/send-data/opentelemetry/)
2. **Custom attributes.** Best-in-class: Honeycomb's whole model is that
   every event field is a queryable column — the Events view renders "each
   column … a field from your dataset," and any attribute (including
   high-cardinality 64-hex digests) can be grouped/filtered in the query
   builder (https://docs.honeycomb.io/working-with-your-data/raw-data/,
   https://docs.honeycomb.io/get-started/start-building/llm/). Verdict:
   PASS, no renaming, no nesting.
3. **gen_ai.** First-class as of 2026: Honeycomb integrated the OTel GenAI
   semconv (v1.40.0) and its Agent Timeline consumes `gen_ai.*` directly —
   `gen_ai.conversation.id` "used to group all traces," `gen_ai.agent.name`
   groups lanes, `gen_ai.operation.name`, `gen_ai.tool.*`, `gen_ai.usage.*`
   (https://docs.honeycomb.io/send-data/use-cases/agents,
   https://www.honeycomb.io/blog/honeycomb-launches-agent-observability-full-visibility-agentic-workflows,
   https://www.honeycomb.io/blog/agent-timeline-generally-available).
   Notable: the attribute Honeycomb keys conversations on is exactly the
   one our bridge fills with the correlation key.
4. **Free/self-host.** Free tier 20M events/month, "free forever"
   (https://www.honeycomb.io/pricing). Closed SaaS, no self-host; a
   stranger must be added to the team to look — no anonymous viewing.
5. **Export.** FAIL: UI download of raw events capped at "a maximum of
   1000 rows" (CSV/JSON)
   (https://docs.honeycomb.io/working-with-your-data/raw-data/); the Query
   Data API is Enterprise-only and returns **aggregates**, not raw spans
   (https://api-docs.honeycomb.io/api/query-data,
   https://changelog.honeycomb.io/query-data-api-(enterprise)-197131). At
   demo-relevant tiers, a one-way sink.

## 5. SigNoz (newer candidate 1)

OTel-native generalist, MIT except `ee/`
(https://github.com/SigNoz/signoz/blob/main/LICENSE, discussion
https://github.com/SigNoz/signoz/discussions/4231). Ingest: cloud
`https://ingest.<region>.signoz.cloud:443` (one port, both OTLP/gRPC and
OTLP/HTTP; header `signoz-ingestion-key`); self-host `:4317` gRPC /
`:4318` HTTP, no key by default
(https://signoz.io/docs/ingestion/signoz-cloud/overview/,
https://signoz.io/docs/ingestion/cloud-vs-self-hosted/). Trace Explorer
filters spans by arbitrary attribute conditions and span details show
`gen_ai.*` attributes (https://signoz.io/blog/observability-for-the-ai-era/,
https://signoz.io/docs/openrouter-observability/). Screens out: the
agent-native/LLM views have shipped cloud-first through 2026, and there is
no clean documented raw-span export API (query APIs are dashboard-shaped;
self-host raw access means querying ClickHouse directly). Fine
infrastructure, wrong shape for a verifiable-bundle demo.

## 6. Laminar (newer candidate 2)

Open-source (Apache-2.0, https://api.github.com/repos/lmnr-ai/lmnr —
"observability platform purpose-built for AI agents. YC S24"), docker
compose self-host with UI at `:5667`
(https://github.com/lmnr-ai/lmnr). OTLP ingest: cloud
`https://api.lmnr.ai:8443` (gRPC) or `https://api.lmnr.ai/v1/traces`
(HTTP), authorization-header API key; accepts OpenLLMetry/OpenInference
instrumentation (https://ai-sdk.dev/providers/observability/laminar,
https://www.traceloop.com/docs/openllmetry/integrations/laminar). Screens
out: no documented public span-export API found, and how arbitrary
non-LLM custom attributes render in its trace view is undocumented — both
unknowns sit exactly on this ticket's deciding criteria. Watchable, not
pickable today.

---

## 7. Comparison

| Criterion | Langfuse | Phoenix | Honeycomb | SigNoz | Laminar |
|---|---|---|---|---|---|
| OTLP ingest | HTTP only (JSON+protobuf), Basic Auth | gRPC 4317 + HTTP 6006/v1/traces | gRPC + HTTP (protobuf+JSON) | gRPC + HTTP | gRPC 8443 + HTTP |
| `foldlab.cert.*` visible | Buried by default; **first-level + filterable via `langfuse.observation.metadata.*` dual-emit** | **Visible + searchable as-is** (attributes DSL) | **Every attribute a queryable column** | Filterable in Trace Explorer | Undocumented |
| `gen_ai.*` rendering | Yes (model, tokens→cost) | **No (open issue #10622)**; OpenInference only | Yes, first-class (Agent Timeline, semconv v1.40) | Partial, cloud-first | Via OpenLLMetry ingest |
| Stranger-viewable demo | **Public per-trace/session links, no login**; MIT self-host; 50k-unit free cloud | Free unlimited self-host (ELv2); no public links | 20M ev/mo free; team login required; no self-host | MIT-core self-host | Apache-2.0 self-host |
| Spans back OUT | **Yes: Observations API v2 + scheduled exports** | **Yes: SpanQuery DSL / dataframe / REST client** | No (1000-row UI cap; Query API = Enterprise, aggregates) | No clean API (ClickHouse direct) | Not documented |

---

## RECOMMENDATION

**Primary: Langfuse.** It is the only backend that clears every bar at
once. Ingest matches the pin exactly (the effect OtlpTracer speaks OTLP
over HTTP; Langfuse's missing gRPC costs nothing —
https://langfuse.com/docs/opentelemetry/get-started). The deciding
criterion is met with eyes open: raw `foldlab.cert.*` would be buried under
`metadata.attributes`, so the bridge dual-emits the certificate under the
documented `langfuse.observation.metadata.*` mapping, making
schema-digest/program-digest/input-anchor/span-head first-level, filterable,
prominently-rendered fields while the canonical `foldlab.cert.*` names stay
in the bundle for the verifier
(https://langfuse.com/integrations/native/opentelemetry). `gen_ai.*`
renders as LLM spans with token/cost treatment. And the demo criteria are
where it runs away: MIT self-host or a free cloud tier, **public share
links so a stranger opens a trace URL with zero accounts** — plus a full
read-back API (Observations v2), so the "stranger recomputes everything
from the exported bundle" acceptance test has a supported export path
rather than a scrape (https://langfuse.com/docs/api,
https://langfuse.com/docs/observability/features/url).

**Runner-up: Arize Phoenix.** Beats Langfuse on the raw deciding criterion
(custom attributes visible and searchable with no renaming) and ties or
beats it on export (the SpanQuery DSL is the best extraction surface
surveyed), with unlimited free self-hosting. It loses the top slot on two
counts: OSS Phoenix still does not recognize `gen_ai.*`
(https://github.com/Arize-ai/phoenix/issues/10622 — our LLM spans render
generic, muting the "foldlab inside the tools people already use" story),
and it has no anonymous per-trace sharing. If issue #10622 lands, revisit —
the gap narrows to share links.

**Honeycomb** stays in the demo script as an optional second screen: one
bridge, same OTLP stream, and the certificate columns + Agent Timeline
render beautifully there (`gen_ai.conversation.id` is literally its
grouping key). But raw spans cannot be gotten back out at any tier a public
demo would use, and that one-way-ness contradicts the destination sentence,
so it cannot be the home.

Follow-on for ticket 007 (pin the ingestion fixture): freeze what the
verifier reads — the OTLP request bytes the bridge sends AND the Langfuse
Observations-API response for the same trace — and assert the
`foldlab.cert.*` hex values survive the round-trip byte-identically.
