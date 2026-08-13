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
