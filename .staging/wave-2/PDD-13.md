# PDD-13 — Recursion materialized: PDD-3's slices 4-5

CATEGORIES specification-design, abstraction-modules,
           inductive-data, mutation-frames
BRANCH     agent/opus-cc-mac/pdd-13
STATUS     QUEUED behind PDD-3's landing (its breaker is out).
           Dispatch on the standing approval when PDD-3 merges.

The build-off from PDD-3's survivor: the TS side materializes
recursive schemas.

- Slice 4 (Lane A slice 4, plan :146-153): `Document.references`
  assembled from store words in CanonicalSchema.ts / Materialize.ts;
  every address-named reference resolves in the store at the schema
  kind or the existing WrongKindReference door fires. The faithful
  `Schema.suspend(() => ...)` lowering plus the arrow the TS
  fragment needs (PDD-3's finding: the fragment grows ONLY with
  this real consumer — this is the consumer).
- Slice 5: the recursive byte-gate fixture — the anonymous
  linked-list admitted through both doors, verdicts corpus rows,
  emitgate/verdicts regenerate. The NAMED fixture stays blocked on
  SM-21's annotation bag and is claim-scoped out, not attempted.
- Inherited obligations from PDD-3's packet close-out: the two
  door-divergence rulings (empty-name refusal naming) are OWED to
  the operator before or at this ticket's merge — the packet lists
  them as blockers-at-close, not silent edges.

Fences: `Cas/Backend/Mcp.lean` untouched; backend-materialize
workflow for every regeneration; PDD-3's Guarded.lean read-only.
Packet first at library/cas/contracts/PDD-13.contract.md.
