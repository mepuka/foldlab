# vendor/effect-src — the pinned Effect sources, in the tree

Stage 1 reads two files and refuses to read anything else. Until now those two files
lived only in `.staging/e2/src-cache/`, which `.gitignore:1` excludes, so the extractor
ran on one host and could not enter `mise run check`. These are that host's bytes,
copied in and verified.

## What is here

| File | Upstream path | git blob SHA-1 |
|---|---|---|
| `effect-src/SchemaAST.ts` | `packages/effect/src/SchemaAST.ts` | `e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40` |
| `effect-src/SchemaRepresentation.ts` | `packages/effect/src/SchemaRepresentation.ts` | `6282ab9cbf5c7a50b79580065881b5a6c5799aae` |

Source: `Effect-TS/effect` at commit `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`,
package `effect@4.0.0-rc.111`, licence MIT. The full record — root tree, per-artifact
digests, and the other four files of the cache — is
`.reference/provenance/sources.lock.json`. Nothing new is pinned here: these two rows
already existed in the lock and in `src/extract.ts` `PIN`.

## Why the digest check is still load-bearing

Vendoring moves the bytes; it does not move the trust. `src/extract.ts` recomputes the
git blob SHA-1 of every file it opens and throws `pin-mismatch` on disagreement (EXT-1,
asserted by the tamper test in `test/extract.test.ts`). That check now also guards the
vendored copy against an edit, a bad merge, or a line-ending rewrite —
`vendor/.gitattributes` marks these files `-text` so no checkout can rewrite them
silently on a CRLF host.

## Re-verifying

```
git hash-object vendor/effect-src/SchemaAST.ts vendor/effect-src/SchemaRepresentation.ts
```

must print the two digests above. To re-fetch from upstream instead of trusting the
copy: clone `Effect-TS/effect`, check out `0dd7825e`, and take
`packages/effect/src/{SchemaAST,SchemaRepresentation}.ts`; the digests must match, or
the pin has moved and `PIN`, `sources.lock.json`, and this table move with it.

## Scope

`vendor/effect-src/` holds exactly the two files Stage 1 pins. It is not a mirror of
`.staging/e2/src-cache/`, which also carries `Schema.ts`, `SchemaParser.ts`,
`SchemaTransformation.ts`, and `JsonSchema.ts` — none of which the extractor opens.
Those remain host-local; the D1 variance question is measured against them and is not
Stage 1's input.
