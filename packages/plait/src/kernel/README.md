# kernel — the language: corpus, door, programs, and wire grammar

The one language the estate speaks. A Lean model emits a conformance corpus and
this directory is that corpus's home in the runtime — its home, not yet its
whole projection, and the first standing law makes that gap the point. Emitted:
`KernelTables.generated.ts` (kinds, hole stages, taught refusals, sort brands),
`KernelBuilder.generated.ts`, `KernelSchemas.generated.ts` — whose two halves
differ, its header saying the record schemas re-export the hand-written grammar
in `KernelCorpusSchemas.ts` while the mini-AST schemas are the model's own
emitted vocabulary — and `KernelSdk.generated.ts`. Every other file is
hand-written and so staged debt under that law.

`KernelSdk.generated.ts` is the language as plain TypeScript: zero imports, the
closed inventories as literal arrays, the taught refusals as data, the whole
candidate grammar as tagged unions, and one plain constructor per generator.
Its values ARE the door's candidates — `test/KernelSdk.test.ts` presents all
nineteen emitted conformance vectors to `admit` as SDK values and compares the
verdicts — which is the property the hand-derived reference sketch under
`verify/kernel/projections/` does not have. That sketch stays where it is: this
is its successor, and retiring it is a review act, not a side effect.

`KernelDoor.ts` is the one admission door and it ships (DEV-763). Its candidate,
context, and intrinsic-act types are projections of the emitted schemas, and its
`admit` is hand-written judgment gated by the model's own admission vectors —
generated types, walled logic, no second door. The reference door that used to
live under `../../test/` is gone; the replay targets the shipping door.
`KernelIdentity.ts` is the one guarded seam reading a runtime content address as
a model identity label (ruling A1), and it judges nothing.

The emitted four come from `../../fixtures/kernel-conformance.ndjson`, which
`verify/unity`'s emitter writes out of the `verify/kernel` model. From
`packages/plait`: `bun run generate:kernel-tables` (likewise `-schemas`,
`-builder`, `-sdk`), and `generate:kernel-prose` for the prose under
`docs/generated/`. Never hand-edit a kind, a rank, a taught law, or a repair.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte,
and `../../test/KernelConformance.test.ts` replays the model's verdicts against
the shipping door, with a refuse-everything mutant that makes a pass evidence
and an absence control the emitted vectors cannot carry. Those four and
`check:builder-control` are unreached by `bun run gates` (DEV-799 finding); run
them by hand — and `check:builder-control` is RED here on a moved trace.

`check:kernel-sdk` carries two clauses the older walls do not: it renders twice
and requires the two renderings byte-equal, and it requires the committed header
to name the digest of the corpus this reading hashed. Its control,
`check:kernel-sdk-control`, executes a mutation arm — a moved docstring, a moved
taught repair, a moved candidate field name, each planted in the corpus bytes
and each required to reach the surface, with a fourth arm renaming a record this
surface does not project and requiring the bytes NOT to move. Both are wired
into `test:fast` rather than merely declared.

One level deeper: the corpus file, then
[`verify/kernel/README.md`](../../../../verify/kernel/README.md).
