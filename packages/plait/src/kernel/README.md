# kernel — the language: corpus, door, programs, and wire grammar

The one language the estate speaks. A Lean model emits a conformance corpus,
and this is where it lands in the runtime — beside the hand-written grammar it
is read through: the door seam, the program builder, the interchange record
shapes, and the envelope and subject vocabulary. No door ships here;
`KernelDoor.ts` is the type of one and `../../test/` holds the replay's target.

Machine-generated — only these three — from
`../../fixtures/kernel-conformance.ndjson`, which `verify/unity`'s emitter
writes out of the `verify/kernel` model: `KernelTables.generated.ts`,
`KernelSchemas.generated.ts`, and `KernelBuilder.generated.ts`. From
`packages/plait`, regenerate with `bun run generate:kernel-tables` (likewise
`-schemas`, `-builder`), plus `generate:kernel-prose` for the prose projection
under `docs/generated/`. Every other file here is hand-written, the generated
schemas' grammar included — staged debt under the walk in `AGENTS.md` law 1.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte;
`../../test/KernelConformance.test.ts` replays the model's verdicts against a
door whose refuse-everything mutant makes a pass evidence. Those four and
`check:builder-control` are reached by no caller, so run them by hand — and the
last is red today on a drifted compiler trace, not on anything you did.

One level deeper: the corpus file itself, then
[`verify/kernel/README.md`](../../../../verify/kernel/README.md).
