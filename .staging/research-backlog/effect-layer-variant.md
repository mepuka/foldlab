# Tracked variant — the Effect layer quirk behind the WAL hang

Status: OPEN, operator-flagged 2026-08-30 ("looks like a bug to me —
a variant to be tracked"). Pinned Effect: `effect@4.0.0-rc.112`
(provenance row `effect-runtime`).

The suspicion under diagnosis: the three-way merge composed the
daemon's serving layers with cas-word's word-log/receipt layers
through one auto-merged `store.ts`, and the union hangs the
cross-plane WAL test (green on each parent branch alone). The
suspected mechanism is a Layer memoization/identity quirk — a layer
built twice where the graph must share one instance (two WAL
writers, two semaphores, or two connections on one file), or an
interruption/timeout that fails to propagate through the merged
composition.

Owed when the diagnosis lands:

1. The confirmed mechanism, file:line, written HERE.
2. A MINIMAL variant repro isolated from the estate — two layers,
   one shared service, the smallest program that exhibits the
   behavior — suitable both as a tracked variant in the estate's
   corpus and as an upstream report against the pinned Effect
   revision if the behavior is genuinely a defect rather than
   documented semantics.
3. The ruling question if any: whether the estate's layer
   composition law needs a stated discipline (memoization
   boundaries declared at the seam) — consolidation, not a mint.
