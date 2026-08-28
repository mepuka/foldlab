# Stage-1 extractor twin — the cross-instrument gate

The second Stage-1 instrument from the extractor brief: a
lean4-tree-sitter walk that re-derives [`../inventory.json`](../inventory.json)
from the same pinned bytes as the TypeScript-compiler-API extractor, so the
two instruments are each other's check (TOOLS.md admission row; stand-up
receipt `.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json`).

## The gate

```sh
mise run check:extract-twin
```

runs, in order: `bootstrap.sh` (clone the pinned lean4-tree-sitter under
`.staging/treesitter/clones/`, vendor its C seam — tree-sitter core v0.24.7 +
tree-sitter-typescript `75b3874e` — and digest-check every vendored C source
against the receipt), `lake build` of the twin, then the harness:

1. Pinned bytes: git blob SHA-1 of each `.staging/e2/src-cache` file equals
   its pin — computed and compared through the branded `GitBlobSha1` Effect
   Schema, never bare strings.
2. The TS extractor's output is byte-identical to the committed
   `inventory.json`.
3. The twin is deterministic across independent runs.
4. The twin's output is byte-identical to the committed inventory after
   normalizing exactly two fields: `extractor.instrument` and
   `extractor.instrumentVersion`. Each instrument fills those with its own
   declared identity — a twin copying them would impersonate the other
   instrument, so full byte-identity is the wrong gate by one stanza.
5. Both inventories decode through the typed `Inventory` schema and declare
   the instrument identities and source pins the harness expects.

Green ends with `CROSS-INSTRUMENT GATE GREEN`. The gate needs network on
first run (clone + vendoring) and the Lean v4.32.0 toolchain via elan; it is
deliberately NOT in the default `mise run check` chain.

## Known defect (held, not hidden)

The pinned grammar cannot parse `<in E>` variance annotations: parsing the
pinned `SchemaAST.ts` yields exactly two 1-byte ERROR nodes at the `Filter`
and `FilterGroup` declarations. Neither class extends `Base`, so neither is
in the 21-variant walk — and the twin refuses to emit if any ERROR/MISSING
node intersects a byte range it actually consumed (`assertErrorsDisjoint`).

## NOT CLAIMED

- No parsing-correctness or grammar-completeness claim attaches to either
  instrument; the byte-identity agreement is shape evidence about the
  inventory, nothing more.
- The twin performs no git-blob verification itself (no SHA-1 in its trusted
  base); the harness owns the pinned-byte pre-check on both instruments'
  behalf.
- Nothing here strengthens Stage 2; the generator contract is unchanged.
