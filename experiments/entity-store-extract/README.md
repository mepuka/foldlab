# entity-store-extract — Stage 1 extractor

Promoted from `.staging/e2/extract/` on 2026-08-25 (declared transformation; working
label pending ruling R-1). TOOLS.md admission rows remain DRAFTS in REPORT.md §1
awaiting the operator ruling (C4).

The extractor over the pinned Effect source. Start with REPORT.md; the generator
contract is INVENTORY-SCHEMA.md; EXT/ACC/FIX specs are in SPECS.md.

Input: the two pinned Effect files, vendored at `vendor/effect-src/` — see
`vendor/README.md`. Stage 1 therefore runs from a clean checkout; it did not before.
Pass a directory as the first argument to read from somewhere else (the twin harness
passes `.staging/e2/src-cache`); either way the git-blob pin is verified before a byte
is parsed.

Regenerate: `mise run gen:inventory` (or `bun run src/extract.ts`) ·
Gates: `mise run check:extract` (or `bun test`)
