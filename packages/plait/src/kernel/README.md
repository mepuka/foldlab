# kernel — the language: corpus, door, programs, and wire grammar

The one language the estate speaks. A Lean model emits a conformance corpus and
this directory is that corpus's home in the runtime — its home, not yet its
whole projection, and the first standing law makes that gap the point. Emitted:
`KernelTables.generated.ts` (kinds, hole stages, taught refusals, sort brands),
`KernelBuilder.generated.ts`, and `KernelSchemas.generated.ts` — whose two
halves differ, its header saying the record schemas re-export the hand-written
grammar in `KernelCorpusSchemas.ts` while the mini-AST schemas are the model's
own emitted vocabulary. Every other file is hand-written and so staged debt
under that law.

`KernelDoor.ts` is the one admission door and it ships (DEV-763). Its candidate,
context, and intrinsic-act types are projections of the emitted schemas, and its
`admit` is hand-written judgment gated by the model's own admission vectors —
generated types, walled logic, no second door. The reference door that used to
live under `../../test/` is gone; the replay targets the shipping door.
`KernelIdentity.ts` is the one guarded seam reading a runtime content address as
a model identity label (ruling A1), and it judges nothing.

The emitted three come from `../../fixtures/kernel-conformance.ndjson`, which
`verify/unity`'s emitter writes out of the `verify/kernel` model. From
`packages/plait`: `bun run generate:kernel-tables` (likewise `-schemas`,
`-builder`), and `generate:kernel-prose` for the prose under `docs/generated/`.
Never hand-edit a kind, a rank, a taught law, or a repair.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte,
and `../../test/KernelConformance.test.ts` replays the model's verdicts against
the shipping door, with a refuse-everything mutant that makes a pass evidence
and an absence control the seventeen vectors cannot carry. Those four and
`check:builder-control` are unreached by `bun run gates` (DEV-799 finding); run
them by hand — and `check:builder-control` is RED here on a moved trace.

One level deeper: the corpus file, then
[`verify/kernel/README.md`](../../../../verify/kernel/README.md).
