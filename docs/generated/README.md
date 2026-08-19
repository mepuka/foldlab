# docs/generated — rendered surfaces, and how to reproduce them

Everything in this directory is machine-rendered from a source elsewhere in the
tree. Nothing here is edited by hand; an edit is overwritten by the next
regeneration and caught by that artifact's byte-identical check before it
reaches a review.

This README is the maintainer's page. The artifacts beside it are the
language's, and under root law 10 they carry no tracking artifacts at all — no
ticket ids, no dev parentheticals, no script invocations, and no filesystem
paths. A rendered surface that must say where it came from says the digest of
its source, because a plait item refers only to digests: a path names wherever
a reader happens to be standing, which is the ambient reference the algebra
refuses. That is why the regeneration commands live here rather than in the
pages themselves, and why this file is the only place in this directory where a
command or a path appears.

## `kernel-language.generated.md`

The kernel language as prose: the closed vocabularies with their ranks, every
taught refusal with the law it defends and the repair it teaches, each refusal
kind's standing meaning, the runtime structural refusal kinds, the type
vocabulary, the encoding vectors, the door's verdicts, and the canonical-form
appendix.

- **Source.** The kernel-conformance interchange emitted from the Lean kernel
  model, at `packages/plait/fixtures/kernel-conformance.ndjson`. The page names
  that source by its digest — SHA-256 over its canonical bytes — so to check
  that a corpus is the page's source, hash it and compare with the digest in
  the page's opening line.
- **Regenerate.** From `packages/plait`:

  ```
  bun run generate:kernel-prose
  ```

- **The wall.** `bun run check:kernel-prose` re-renders and byte-compares, and
  runs in `bun run test` inside `packages/plait`, which the root `bun run
  gates` battery reaches. `bun run check:refusal-vocabulary` additionally holds
  each kind's standing meaning across this page and the generated modules, and
  refuses any tracking artifact rendered into either.

The meanings on that page are RATIFIED. The operator's taste pass ruled on the
corpus and its voice on 2026-08-19, so each sentence renders as standing text
and the wall now refuses a meaning that reappears behind a draft marker — both
retired forms by name, and anything else opening the same way. Amending a
sentence is an ordinary reviewed diff from here on, caught by the byte walls
like any other change. The sentences are reviewed house data in
`packages/plait/scripts/kernel-runtime-refusals.ts`, which is a tracking-native
source and is where ticket citations for this material belong.
