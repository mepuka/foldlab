# carriage — hosts and transport clients

Where the fabric is reached, not where anything is decided. `FabricClient` is
the public Effect service whose live layer owns a NATS connection in `Scope`
and whose fixture layer wears the same tag, so a test and a deployment differ
by a layer and nothing else. `CasDaemon` is a service *shape* and deliberately
nothing more — no tag, no layer, not even a throwing stub — because a
placeholder service is how "not wired" becomes "wired wrong" three slices later.

Plane layering seats carriage above planes. The tree is narrower and wider than
that at once: carriage imports `kernel`, `truth`, and `internal`
(`FabricClient.ts:12`) and no plane module at all, while two modules beneath it
import back up — `../kernel/KernelProgram.ts` takes `CasDaemon`'s shape and
`../internal/nats.ts` takes `FabricClient`'s. Both are type-only; the layering
law carves out no exception, so both are open findings under its pending lint.

Nothing in this directory is machine-generated.

Wall: `bun run test:fast` for the fixture layer's contract
(`../../test/FabricClient.test.ts`) and `bun run test:walls` for the live
transport suites against a local `nats-server`. `bun run check:public-effects`
holds the service's public signatures and its refusal channel still.

One level deeper, down the plane order: `../planes/README.md`, the seams these
clients carry; each module's `@module` header states its own fences.
