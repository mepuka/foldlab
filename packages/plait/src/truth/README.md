# truth — the vocabulary every sentence speaks

The primitives every other plane spells its sentences in: canonical bytes
(RFC 8785, seamed over `@foldlab/core/jcs` — there is exactly one
canonicalizer), the SHA-256 digest that *is* a value's identity, the tagged
refusal channel and its two sorts, and declared algebras whose commutative
brand is earned from generated cases rather than asserted. Nothing here
reaches a substrate, a subject, or a connection; a truth module that imports
one is a layering finding.

`RefusalKinds.generated.ts` is machine-generated and the only generated module
here. It carries the closed structural-refusal union, projected from
`../../fixtures/kernel-conformance.ndjson` plus the reviewed runtime roster in
`../../scripts/kernel-runtime-refusals.ts`; `Refusal.ts` imports its sibling
and mints no union of its own. The projection is emitted *into* this plane
rather than imported up from `../kernel/`, because truth is the deepest plane
and imports only itself — a generated artifact's ancestry is its generator,
not an edge in the module graph. Regenerate with
`bun run generate:kernel-tables`; the kernel table is the other half of that
one render, and it carries each spelling's ancestry, with a corpus miss named
as `DEV-804` staged debt.

"Exactly one canonicalizer" is enforced, not asserted. `bun run
check:one-canonicalizer` reads every module under `src/` and refuses a retired
twin's path, a retired twin's name, or the canonicalizer signature — a member
sort beside a JSON serializer — anywhere but `Canonical.ts`, and `bun run
check:one-canonicalizer-control` plants the committed twin
(`../../negative-controls/OneCanonicalizer.private-twin.mutant.ts`) at the
retired path, requires both arms to go red, and restores the tree. The twins
this plane carried until DEV-804 slice C — `CanonicalJson.ts` and
`SchemaCanonical.ts` — were justified only by a number-domain divergence the
operator closed on 2026-08-18 (DEV-807).

Walls: `bun run check:kernel-tables` regenerates both halves and byte-compares
them. `bun run check:refusal-vocabulary` reads the union out of this module's
source bytes, the model's refusal reasons out of the fixture's bytes, and the
staged-debt roster out of the reviewed pin at
`../../test/fixtures/refusal-staged-debt.pin.txt` — three artifacts, no two of
them views of one value — and `bun run check:refusal-control` plants a
hand-minted kind into the union source and must be refused for its committed
reason. `bun run check:refusal-payloads` pins every `law`, `expected`, and
`next` text under `src/` byte for byte. `bun run test:fast` runs the pure
suites beside each module, and `bun run check:public-effects` re-emits the
package's public declarations and refuses any public Effect whose error
channel is not a `Refusal`, with planted controls at
`../../negative-controls/PublicEffects.*`, each refuted on a committed
compiler trace.

One level deeper: every module here opens with an `@module` header stating its
own law; `../../CONTEXT.md` glosses the terms behind the seam; the refusal
table the model emits is described in `../kernel/README.md`.
