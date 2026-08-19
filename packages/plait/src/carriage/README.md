# carriage — hosts and transport clients

Where the fabric is reached, not where anything is decided. `FabricClient` is
the public Effect service whose live layer owns a NATS connection in `Scope`
and whose fixture layer wears the same tag. `CasDaemon` is a service *shape*
and nothing more — no tag, no layer, not even a throwing stub — because a
placeholder service is how "not wired" becomes "wired wrong" three slices on.

`Engine` is the language-speaking service: a caller speaks a candidate
sentence, the imported kernel door judges it, and only an admitted sentence
reaches a carrier — declare to the catalog, emit to lanes, join to cells,
decide to registers, resolve through the one verify-on-read seam. Its door
context is a seeded replica grown by its own admitted declares (a lower
bound, never an oracle), its bindings are built by declaring — configuration
is declared sentences — and `run` executes a closed program declaration one
node at a time through that same door, stopping at the first taught refusal.
The engine decides nothing, schedules nothing, and stores nothing
authoritative; the package `AGENTS.md` carries its laws, and
`../../test/Engine.test.ts` is its wall.

Plane layering seats carriage above planes. The tree is narrower and wider than
that at once: carriage imports `kernel`, `truth`, and `internal`
(`FabricClient.ts:12`) and no plane module at all, while two modules beneath it
import back up — `../kernel/KernelProgram.ts` takes `CasDaemon`'s shape and
`../internal/nats.ts` takes `FabricClient`'s. Both are type-only; the layering
law carves out no exception, so both are open findings under its pending lint.

Nothing here is machine-generated, and both service shapes are hand-written
declarations of corpus concepts — staged debt under the first standing law.

Wall: `bun run test:fast` for the fixture layer's contract
(`../../test/FabricClient.test.ts`) and `bun run test:walls` for the live
transport suites against a local `nats-server`. `bun run check:public-effects`
holds the service's public signatures and its refusal channel still.

One level deeper, down the plane order: `../planes/README.md`, the seams these
clients carry; each module's `@module` header states its own fences.
