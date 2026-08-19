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

The emitted set comes from `../../fixtures/kernel-conformance.ndjson`, which
`verify/unity`'s emitter writes out of the `verify/kernel` model. Four of them
are also emitted there — `KernelTables.generated.ts`, its truth-plane half,
`KernelBuilder.generated.ts` and `KernelSchemas.generated.ts` — so regenerate
those with that emitter, which documents its targets beside them: `lake exe ts
--target=kernel-schemas` under `verify/unity`, and the digest register
re-emitted with it. From `packages/plait`, one renderer remains: `bun run
generate:kernel-sdk`, and `generate:kernel-prose` for the prose under
`docs/generated/`. Never hand-edit a kind, a rank, a taught law, or a repair.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte,
`check:kernel-surfaces` holds the four model-emitted surfaces to the digests
its gate registers,
and `../../test/KernelConformance.test.ts` replays the model's verdicts against
the shipping door, with a refuse-everything mutant that makes a pass evidence
and an absence control the emitted vectors cannot carry. The builder's two walls
were unreached by `bun run gates` (DEV-799 finding) and are now in the battery
(DEV-824): the surface rides `check:kernel-surfaces` in `test:fast` since it
flipped to the model emitter, and `check:builder-control` is in `test:types`.

`check:builder-control` compares four committed compiler traces verbatim, which
only means anything if one compiler printed them: it reads the `typescript` and
`@effect/tsgo` pins out of the repository manifest and refuses by name on any
other compiler rather than reporting a moved trace. That is what its long red
was — the traces were 5.9.2 recordings, and 5.x printed a union's members in
instantiation order while the pinned 7.0.2 prints them sorted. Re-record with
`bun run generate:builder-control` after a deliberate change.

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
