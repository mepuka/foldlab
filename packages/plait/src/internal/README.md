# internal — private adapters

Private adapters serve any layer and reach back only to their own public seam.
This is the machinery no consumer may name: the NATS connection, the exact
stream shape, ordered and durable consumers, the positioned pump with its
bounded successor buffer and explicit ack order, the KV adapters, the one
lattice write path (`cas.ts`'s `casJoinLoop`, shared by every class-(a)
writer), the schema-issue bridge, and the chaos schedules. NATS types stay
here; a `SchemaIssue`-typed signature that escapes diverges the public
type-level walk.

Nothing in this directory is machine-generated.

Wall: two of them, and which one runs a suite is derived rather than chosen —
`../../scripts/run-test-group.ts` puts a file in the wall group exactly when it
imports `./NatsHarness.js`. `bun run test:walls` brings up a `nats-server` and
pins what the broker really does (ordered consumers, KV watch semantics, the
object store), with `bun run check:parity-control` refuting a planted field-drop
mutant on `../../negative-controls/SubstrateParity.field-drop.trace.txt`. The
brokerless suites ride `bun run test:fast` instead, pinning adapter behaviour
against constructed client values: transport defects and pump backpressure.

One level deeper: each module's `@module` header; `../../CONTEXT.md` for the
terms these adapters implement; `../planes/README.md` for the public seams they
serve, which is also the way down to the kernel corpus.
