# Prior-art reuse

## Search order

1. Inspect the target project's exact toolchain, manifest, imports, and local API.
2. Search locally with `rg`, editor/LSP declaration information, and project indexes.
3. Search current Mathlib/Std documentation or approved semantic search for recall.
4. Follow high-signal citations into pinned read-only evidence.
5. Compile a minimal import/use spike only in the authorized target or disposable worktree.

## Ledger

```text
source | revision | license | toolchain | declaration/path
intended role | proved guarantee | assumptions/TCB | semantic mismatch
dependency cost | reuse class | adapter obligation
```

Direct reuse needs semantic match, compatible license/pin, and acceptable dependency/trust cost.
Adaptation needs an explicit conversion or refinement theorem. Unclear/restricted licenses permit
citation and independently phrased patterns, not copied implementation. A README or green build is
not a semantic-preservation theorem.

For proof search, exact-project premise retrieval matters: LeanDojo traces accessible premises and
uses them for retrieval rather than treating a generic text match as available evidence
([LeanDojo paper](https://arxiv.org/abs/2306.15626)).
