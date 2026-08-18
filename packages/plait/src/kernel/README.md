# kernel — the language: corpus, door, programs, and wire grammar

The one language the estate speaks. A Lean model emits a conformance corpus and
this directory is that corpus's home in the runtime — its home, not yet its
whole projection, and the first standing law makes that gap the point. Emitted:
`KernelTables.generated.ts` (kinds, hole stages, taught refusals, sort brands)
and `KernelBuilder.generated.ts`. Every other file is hand-written and so staged
debt under that law — `KernelSchemas.generated.ts` included, its own header
saying the record schemas re-export the file's hand-written grammar. No door
ships yet; the reference door under `../../test/` is what the replay targets.

The emitted three come from `../../fixtures/kernel-conformance.ndjson`, which
`verify/unity`'s emitter writes out of the `verify/kernel` model. From
`packages/plait`: `bun run generate:kernel-tables` (likewise `-schemas`,
`-builder`), and `generate:kernel-prose` for the prose under `docs/generated/`.
Never hand-edit a kind, a rank, a taught law, or a repair.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte,
and `../../test/KernelConformance.test.ts` replays the model's verdicts against
a door whose refuse-everything mutant makes a pass evidence. Those four and
`check:builder-control` are unreached by `bun run gates` (DEV-799 finding); run
them by hand — and `check:builder-control` is RED here on a moved trace.

One level deeper: the corpus file, then
[`verify/kernel/README.md`](../../../../verify/kernel/README.md).
