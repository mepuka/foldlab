# Stage-1 tree-sitter lane (staging remnant)

The twin and its harness were PROMOTED 2026-08-28 to
`experiments/entity-store-extract/twin/` (gate: `mise run check:extract-twin`).
This directory keeps only:

- `clones/lean4-tree-sitter` — study/build clone @ `3a57f55e` (v0.2.4,
  toolchain v4.32.0), re-materialized on demand by the twin's
  `bootstrap.sh`; `ffi/vendor_grammars.sh` vendors tree-sitter core
  v0.24.7 and tree-sitter-typescript `75b3874e` (the C seam).
- `clones/tree-sitter-typescript` — grammar clone checked out at the same
  `75b3874e` for `typescript/src/node-types.json` (materializer-lane pin).
- `MATERIALIZER-LANE.md` — the (un-grilled) design note for the
  node-types.json → canonical-schema lane and its union/mu blocker.

Pins and digests: `.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json`.
