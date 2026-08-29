# entity-store-extract — Stage 1 extractor

Promoted from `.staging/e2/extract/` on 2026-08-25 (declared transformation; working
label pending ruling R-1). TOOLS.md admission rows remain DRAFTS in REPORT.md §1
awaiting the operator ruling (C4).

The extractor over the pinned Effect source. Start with REPORT.md; the generator
contract is INVENTORY-SCHEMA.md; EXT/ACC/FIX specs are in SPECS.md.

## Three instruments, one inventory

| leg | instrument | reads | run |
|---|---|---|---|
| `src/extract.ts` | `typescript@5.9.2` classic compiler API | `SchemaAST.ts`, `SchemaRepresentation.ts` | `bun run src/extract.ts` |
| `twin/` | lean4-tree-sitter @ `3a57f55e` | the same two; cannot parse `Schema.ts` or `SchemaTransformation.ts` | `mise run check:extract-twin` |
| `src/oxc-extract.ts` | `oxc-parser@0.147.0` | **all six** pinned rc.111 files, zero parse errors | `mise run check:extract-oxc` |

They share DATA and no walking code. `src/contract.ts` is that data — pins, the
declared name tables, the inventory record shapes, the cross-check predicate, the
canonical emit — and every leg reads it. That split is the only reason agreement
between them proves anything.

`src/oxc-patterns.ts` is the oxc leg's pattern table: every shape it recognizes,
as data, with the census enumeration and source line each one serves.

Regenerate: `bun run src/extract.ts` (inventory) · `mise run gen:oxc-surface`
(the six-file census, `oxc-surface.json`)

Gates: `bun test` (compiler-API leg, `bun:test`) · `mise run check:extract-oxc`
(oxc leg: tsgo, vitest, both suites, the six-step gate). Both need the pinned
source cache; set `E2_SRC_CACHE` if it is not under an ancestor directory.
