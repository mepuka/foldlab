---
id: 026
title: The scale gauntlet — the last magnitude claim earns its harness
type: wayfinder:build
status: open
assignee:
blocked-by: []
---

## Question

RG-A proved the sharing magnitude (~10^20 collapse,
frozen-verifier-checked). The remaining unproven magnitude claim is
deep-journal mechanics: long chains, anchored resume, parallel
replay speedup, compaction. The lawful combine now exists
(kv-combine-laws, merged): combineKV is the wall-anchored
parallel-replay license, so the headline measurement finally has a
lawful operation to measure.

Build in the RG-A tradition: a frozen spec, a verifier binary, and
deterministic corpora — the gauntlet measures, the verifier checks
that what was measured is lawful (every parallel replay recombines
to the frozen digest; every anchored resume equals the cold fold;
compaction preserves both folds). Measurements without the verifier
are anecdotes.

Dimensions: chain length (10^4..10^7), segment counts for parallel
replay (1..N cores), anchor densities for resume, compaction cut
points. Deliverables: the frozen gauntlet spec, the corpora
generators (deterministic seeds, method stated), the verifier, the
run records, and a VERIFICATION.md magnitude entry sized exactly to
what ran.

## Pre-registered predictions (2026-08-14)

1. Parallel replay speedup is near-linear in segments until memory
   bandwidth, NOT combine cost, dominates — combineKV is O(keys) per
   boundary and keys << events. If combine cost dominates instead,
   that is a finding about the carrier, not a tuning knob.
2. Anchored resume is O(events since anchor) with a constant factor
   indistinguishable from the cold fold's per-event cost — the cache
   lookup is the only difference. If resume is slower than that,
   something re-reads history and the harness must say what.
FALSIFIABILITY: the verifier must carry a control — a deliberately
wrong recombination (dropped segment) must be caught. A gauntlet
whose verifier cannot fail measures nothing.
