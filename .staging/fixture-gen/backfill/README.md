# Lane B — instrument backfill over G0 (DONE 2026-08-28)

Fills the null instrument columns of `atoms-g0.jsonl` at the ruled
instrument-canonical grain (tree-sitter leaves). Run in this order; every
step is idempotent and deterministic:

```sh
# 1. fixture dump + field vocabulary (prep; rerun after any G regen)
#    (inlined in session 2026-08-28; fold into a task at G1)
# 2. compiler-API leg: typescript@5.9.2 syntax-only
bun backfill-ck.ts && bun backfill-ck.ts --check
# 3. tree-sitter leg: the admitted twin seam, new driver, no C changes
(cd ../ts-leg && lake build && ./.lake/build/bin/ts_leg fixtures fields.txt leaf-rows.jsonl)
# 4. merge to the deliverable
bun merge-backfill.ts && bun merge-backfill.ts --check
```

Deliverable: `../atoms-g0-backfilled.jsonl` (34,254 rows) +
`../backfill-manifest.json` (input digests, join histograms).

Results, G0 run:

- 265/265 fixtures parse with ZERO tree-sitter ERROR/MISSING nodes.
- Generator-label projection: 99.86% of rows labeled (31,039 exact,
  2,251 contained, 917 merged-same-label); 47 finding rows, all ONE
  phenomenon — a regex literal in a noise snippet that FixGen's
  tokenizer splits into mixed-label operator pieces while both
  instruments read one token. The instruments are right.
- Compiler-API coverage: 100% (31,862 exact, 2,392 contained — string
  fragments, template pieces, regex internals under one ck token).
- tsFieldName fill: 30% of leaves (recovered by probing the grammar's
  complete 40-name field vocabulary through childByFieldName; the
  binding has no fieldNameForChild and the C seam was not touched).

The five-feature alpha baseline (tsNodeType, tsFieldName, tsParentType,
ckParentKind, nextTsType) is now fully populated for G0.

G1 notes fed back to the generator (tokenizer defects the instruments
exposed): multi-char operators (`===` `=>` `||` `<=` `>>` `??` `!==`
`>=`) are split into single chars; regex literals are tokenized as
operator soup. Both should follow instrument tokenization.
