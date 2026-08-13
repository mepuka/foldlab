---
id: 020
title: The Effect surface — lawful observability Layers, then test magic
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Operator-ratified direction (2026-08-13), Layers-first: foldlab's
concerns surface in whatever Effect runtime users already run, via
injected Layers — zero new instrumentation for the user.

Phase 1 — observability (grill, then build):
- FoldlabTracer Layer: every Effect.withSpan the user already wrote
  produces verifiable telemetry — span id = the segment's chain head
  (recomputable, never assigned), certificates ride spans (ticket 005
  shape feeds from here), facts journaled through the narrow writ.
- Logger and Metric Layers on the same discipline (metrics as
  declared folds — the fold algebra IS the metrics engine; a counter
  is `count`, a gauge summary is `product(min, max, sum, count)`,
  each with digest identity and the invalidation-free cache).
- Grill: sampling/batching without breaking chain identity (chunking
  is transport); what rides locally when the daemon is unreachable
  (refusals-as-data; never drop silently); the span↔entity/anchor
  mapping (spans as segments between anchors, trace id = root
  anchor — the census's entity semantics, finally consumed).

Phase 2 — test magic, each API named with its licensing law
(ADR-0010):
- Replay-from-journal: record a live run's journal, replay as a
  deterministic test — licensed by state-at-k = pure fold of the
  first k facts; an incident becomes a permanent regression fixture.
- Counterfactual replay: feed a recorded prefix, hand the
  continuation a different value (the §8 theory as a dev tool).
- @effect/vitest integration: fold-algebra law suites + Schema-derived
  arbitraries as one test-layer import.

Sequencing: phase 1 design grilling may start any time (it informs
the certificate shape rather than waiting on it); builds go to codex
per the standing tiers.

## Phase 1 resolution (2026-08-13, operator-grilled and ratified)

Re-sequenced: the first build slice is **JournalMessageStorage** — the
smallest real consumer, positioned as visual/tactile proof rather than
the long-term bet. The MCP surface follows it; the observability
Layers (this ticket's original phase 1) queue behind that; test magic
unchanged as the later phase.

Ratified shape:

1. SEAM: Effect's `MessageStorage` interface (the seam under
   `ClusterWorkflowEngine` + `SingleRunner`, both used stock and
   unchanged). The pinned finding that licenses the slice: their own
   single-process layer still requires a SQL client — the wedge is
   the SQL dependency, not single-node.
2. SUBSTRATE: through the narrow writ to protod (read/publish/request
   only) — durable messaging inherits the proven journal, the
   certified envelope, and tamper evidence; "the writ suffices for
   durable execution" is part of the claim.
3. DONE GATE (two parts): (a) Effect's stock workflow examples run
   unchanged on the swapped Layer; (b) an authored DIFFERENTIAL
   conformance suite — the assumed MessageStorage contract written
   down (save/ack survive restart, ordering, dedup, read-back
   exactness), run against BOTH our Layer and their SQL storage, with
   negative controls that must fail (a storage that drops or reorders
   is caught). No TCK exists at the pin; this suite is the upstream
   artifact.
4. DEMO: in the browser. A small HTTP surface feeding an Effect Atom
   front end that shows the effector register and workflow state
   live; the choreography is kill -9 mid-activity → restart → resume
   exactly once (fencing made visible), then flip one stored byte →
   verify-on-read refuses with a named position (tamper evidence made
   visible).
5. Claims enter VERIFICATION.md bounded to the envelope, at merge.
