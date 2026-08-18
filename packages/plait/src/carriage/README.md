# carriage — hosts and transport clients

Where the fabric is reached, not where anything is decided. `FabricClient` is
the public Effect service whose live layer owns a NATS connection in `Scope`
and whose fixture layer wears the same tag, so a test and a deployment differ
by a layer and nothing else. `CasDaemon` is a service *shape* and deliberately
nothing more — no tag, no layer, not even a throwing stub — because a
placeholder service is how "not wired" becomes "wired wrong" three slices
later. Carriage may import planes, kernel, and truth; nothing but surface
imports carriage.

Nothing in this directory is machine-generated.

Wall: `bun run test:fast` for the fixture layer's contract
(`../../test/FabricClient.test.ts`) and `bun run test:walls` for the live
transport suites against a local `nats-server`. `bun run check:public-effects`
holds the service's public signatures and its refusal channel still.

One level deeper: each module's `@module` header states the fences its shape
is under; then `../internal/README.md` — every connection, consumer, and
message pump these clients stand on is private adapter code, and no NATS type
crosses out of it.
