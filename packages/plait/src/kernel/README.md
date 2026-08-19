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
`verify/unity`'s emitter writes out of the `verify/kernel` model. Every
generated module beside this file is emitted there — `KernelTables.generated.ts`
and its truth-plane half, `KernelBuilder.generated.ts`,
`KernelSchemas.generated.ts` and `KernelSdk.generated.ts` — so regenerate them
with that emitter, which documents its targets beside them: `lake exe ts
--target=kernel-sdk` under `verify/unity`, and the digest register re-emitted
with it. No renderer remains in `packages/plait`; `generate:kernel-prose` still
writes the prose under `docs/generated/`. Never hand-edit a kind, a rank, a
taught law, or a repair.

Wall: `check:kernel-surfaces` holds the five model-emitted surfaces to the
digests its gate registers,
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

The SDK's own two walls moved with it when it flipped. `check:kernel-sdk`
rendered twice and required the two renderings byte-equal; the emitter's gate
does that for every surface it emits. `check:kernel-sdk-control` planted a moved
docstring, a moved taught repair and a moved candidate field name into the
corpus bytes and required each to reach the surface, with a fourth arm renaming
a record the surface does not project and requiring the bytes NOT to move. The
emitter reads the model's own emission rather than a corpus file, so those
plants are made in its reviewed tables instead: the gate moves the surface by
editing the projection map and the projection notes, and refuses the emission
outright when a row's field list stops matching the model's — which is the
clause the third arm proved.

`Wire.ts` carries the read-side folds and instances over the wire grammar: a
kind fold whose arm record is the kind schema's own literals, the digest
equivalence over decoded envelopes, and the schema-derived structural one beside
it. Two walls hold them. `../../test/EqualCoherence.test.ts` pins the
coincidence every digest equivalence in this package leans on — structural
equality of envelopes IS digest equality — forward by canonicalization
determinism and backward on SHA-256 collision resistance, which it states as
trusted base rather than proving; it compares only decode-fresh values, and
demonstrates the pin's per-object-pair equality cache rather than citing it.
`../../test/MatchClosure.test.ts` holds the runtime half of the folds' closure,
building every arm record from the union artifacts so a suite cannot cover fewer
kinds than the union carries. The compile-time half is
`check:matcher-control`, in `test:types`: two arm-short folds that must fail to
typecheck, each against a committed trace, re-recorded with `bun run
generate:matcher-control` after a deliberate change.

Two of the estate's canonical NAME sorts are declared here rather than at their
concept, because a kernel module spells each of them: `Subjects.ts` carries
`CellName` beside the literal-token grammar it is checked against, since the
context program's cell selector reads one, and `Wire.ts` carries `Holder`, since
the envelope carries one. The plane modules whose concepts they name re-export
them, so a caller still reaches a sort where its concept lives and there is only
ever one declaration. `Subjects.TOKEN_PATTERN` is that grammar, stated once for
every token-shaped sort in the package. The wall is `check:sorts-control`, in
`test:types`: eight bare-string and cross-sort spellings that must fail to
typecheck against a committed trace, re-recorded with `bun run
generate:sorts-control` after a deliberate change to the family.

One level deeper: the corpus file, then
[`verify/kernel/README.md`](../../../../verify/kernel/README.md).
