# carriage — hosts and transport clients

Where the fabric is reached, not where anything is decided. `FabricClient` is
the public Effect service whose live layer owns a NATS connection in `Scope`
and whose fixture layer wears the same tag. `CasDaemon` is a service *shape*
and nothing more — no tag, no layer, not even a throwing stub — because a
placeholder service is how "not wired" becomes "wired wrong" three slices on.

Read at this ref, not from the plane order: carriage imports `truth`, `kernel`,
and `internal/nats`, and imports no plane. It is reached by the barrel and,
type-only, by `kernel/KernelProgram.ts` and `internal/nats.ts` — the kernel
edge runs *upward* through truth ← kernel ← planes ← carriage, which law 4
admits no carve-out for. The layering lint is pending, so the edge is recorded
here and carried on its own ticket rather than described as lawful.

Nothing here is generated, and both shapes are hand-written declarations of
corpus concepts — staged debt under the type-universe walk (`AGENTS.md` law 1).

Wall: `bun run test:fast` for the fixture layer's contract
(`../../test/FabricClient.test.ts`), `bun run test:walls` for the live
transport suites, `bun run check:public-effects` for the public signatures.

One level deeper: each module's `@module` header, then `../kernel/README.md`
for the grammar these clients carry and `../internal/README.md` for the
connection, consumer, and pump beneath them.
