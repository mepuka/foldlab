---
id: 006
title: OTLP backend selection
type: wayfinder:research
status: closed
assignee: coordinator
blocked-by: []
resolved: 2026-08-12
---

## Question

Which OTLP backend should the destination demo export into? Evaluate
(primary sources: current docs of Langfuse, Arize Phoenix, Honeycomb,
plus any strong newer candidate): OTLP ingest mechanics (endpoint,
auth, protobuf/HTTP); how custom span attributes (`foldlab.cert.*`,
32-byte heads as hex) render in the UI — the certificate column must
be VISIBLE, not buried; `gen_ai.*` semantic-convention support;
free-tier / self-host viability for a public demo; and export
fidelity (can a stranger get the spans back out to verify, or is the
backend a one-way sink — a backend that can re-export the bundle is
worth extra points). Deliverable: a docs/research memo with a
recommendation.

## Resolution (2026-08-12)

**Langfuse** (runner-up: Arize Phoenix). Full evidence:
[docs/research/2026-08-12-otlp-backend-selection.md](../../research/2026-08-12-otlp-backend-selection.md).
The only backend of five (Langfuse, Phoenix, Honeycomb, SigNoz,
Laminar) clearing all criteria at once: OTLP/HTTP ingest matching the
pin's OtlpTracer; certificate visibility via a documented dual-emit
(raw `foldlab.cert.*` buried under metadata — bridge also emits
`langfuse.observation.metadata.*` twins that render first-level, while
canonical names stay in the bundle); `gen_ai.*` rendered; MIT
self-hostable + free tier + **public per-trace share links** (a
stranger opens a trace with zero accounts); Observations API v2 gives
a supported read-back, so "recompute from the exported bundle" has a
real export, not a scrape. Phoenix beats Langfuse on raw attribute
visibility and export DSL but lacks `gen_ai.*` recognition (open
issue) and anonymous sharing. Honeycomb disqualified as primary: a
one-way sink at demo tiers; kept as optional second screen off the
same bridge. Carried forward: the certified-bridge fixture should
freeze BOTH the OTLP request bytes AND the Langfuse read-back, proving
the cert hex survives the round trip (goes to the bridge wall when it
graduates from fog).
