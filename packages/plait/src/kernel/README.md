# kernel — the language: corpus, door, programs, and wire grammar

The one language the estate speaks. A Lean model emits a conformance corpus;
this directory is that corpus's home in the runtime — the closed tables (kinds,
hole stages, taught refusals, sort brands), the interchange schemas, the
program builder, the admission-door seam, and the wire grammar. No door ships
yet: `KernelDoor.ts` is the seam's type, and the reference door under
`../../test/` is what the conformance replay targets.

Machine-generated: `KernelTables.generated.ts`, `KernelSchemas.generated.ts`,
and `KernelBuilder.generated.ts`, all three from
`../../fixtures/kernel-conformance.ndjson` — emitted by `verify/unity`'s
emitter out of the `verify/kernel` model. Each names its own command in its own
header; from `packages/plait`, regenerate with `bun run generate:kernel-tables`
(likewise `-schemas`, `-builder`), and `generate:kernel-prose` renders the
prose projection under `docs/generated/`. Never hand-edit a kind, a rank, a
taught law, or a repair: a hand-typed table is drift with a green gate.

Wall: the matching `check:kernel-*` scripts regenerate and diff byte-for-byte,
and `../../test/KernelConformance.test.ts` replays the model's verdicts against
a door whose refuse-everything mutant is what makes a pass evidence. Those four
checks and `check:builder-control` are not yet reached by `bun run gates`
(DEV-799 finding); run them by hand until they are.

One level deeper: the corpus file itself, then `verify/kernel/README.md`.
