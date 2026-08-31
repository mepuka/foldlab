# experiments/ — lane routing

Experimental artifacts on the way to gated status. Spec ledger and
decision record: [docs/SPECS.md](../docs/SPECS.md).

| Lane | Governing specs |
|---|---|
| `entity-store-extract/`, `entity-store-generate/`, `entity-store-model/` | [INGESTION-HARNESS](../.staging/operational-structure/INGESTION-HARNESS.md) map + [entity-store RULINGS](../docs/entity-store/RULINGS.md) |
| `lift-harness/` | [INGESTION-HARNESS](../.staging/operational-structure/INGESTION-HARNESS.md), [differential-testing spec](lift-harness/docs/differential-testing-spec.md), [dsl-proposal](../.staging/libfree/dsl-proposal.md) (cautious, D2–D10 un-grilled) |
| `parser-census/` | [dsl-proposal](../.staging/libfree/dsl-proposal.md) census design; [MATERIALIZER-LANE](../.staging/treesitter/MATERIALIZER-LANE.md); corpus pins in `corpus-manifest.json` |
| `workbench/` | [VISION.md](../.staging/product-sphere/VISION.md) views pillar |
| `effect-core-surface/` | [Effect Core packet](../.staging/effect-core-v1/README.md), [neutral protocol](../library/effect-protocol/README.md); source census, Effect TS profile adapter, and exact-file-set language-service evidence only |

Standing: the direction law (hoover ≠ execute ≠ materialize) holds in
every lane; tool admissions go through
[TOOLS.md](../docs/lab-core/TOOLS.md); block fast and early rather
than building what a ruling has not released.
