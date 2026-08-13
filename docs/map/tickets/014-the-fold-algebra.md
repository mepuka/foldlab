---
id: 014
title: The fold algebra — free functions from universal properties
type: wayfinder:build
status: open
assignee:
blocked-by: []
---

## Question

Turn the free-monoid theorem into developer-facing machinery whose
correctness is inherited from universal properties rather than tested
per use (dossier: docs/research/2026-08-13-literature-resonances.md,
findings C1, C8, C9, C10). The lens, stated once: a universal
property's uniqueness clause writes a library function; a proved
equation collapses an API.

Build, in packages/core, in this order:

1. `defineFold(monoid, step)` — user supplies (empty, combine, step);
   the library derives the fold, O(1) extension, parallel replay
   (associativity is the license), and AUTO-GENERATES the law suite:
   associativity/identity property tests plus the third-homomorphism
   split wall (random splits of a fixture history: fold parts, combine,
   digest-equal to whole). A fold that passes earns declared rights:
   parallel replay, mid-stream compaction.
2. Fold identity and the sound cache: fold digest = digest of (step
   program digest, monoid spec bytes); results keyed by (fold digest,
   head) are immutable truths — a cache with no invalidation logic,
   correct by uniqueness. Early cutoff layered: downstream keyed on
   state digest.
3. `zip` — product monoid, one traversal, the banana-split law; the
   Fusion claim as API, wall-checkable.
4. `map(h)` — derived views via monoid homomorphisms, no replay;
   law auto-test: map-then-fold ≡ fold-then-map on fixtures.
5. (Gated on a real consumer) `range(i, j)` — monoid-annotated tree
   for O(log n) authenticated windowed folds, per the SADS/Trillian
   import; bounded experiment first per dossier C10.

Every function ships WITH its generated law tests — the wall factory
is the deliverable as much as the functions. Codex-built against this
ticket once the API shape is grilled; the API grilling (names, Effect
service shape, where Monoid lives) is the open question here.
