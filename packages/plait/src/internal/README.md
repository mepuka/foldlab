# internal — private adapters

Private adapters serve any layer and reach back only to their own public seam.
This is the machinery no consumer may name: the NATS connection, the exact
stream shape, ordered and durable consumers, the positioned pump with its
bounded successor buffer and explicit ack order, the KV adapters, the one
lattice write path (`cas.ts`'s `casJoinLoop`, shared by every class-(a)
writer), the schema-issue bridge, and the chaos schedules. NATS types stay here;
a `SchemaIssue`-typed signature that escapes diverges the public type walk.

Nothing here is machine-generated, and nothing restates a corpus concept:
`digests.ts` and `refusals.ts` delegate to `truth`, so no first-law debt is due.

Two transcriptions live here and both are DATA with provenance, wearing the
same staged-debt waiver: `substrate.ts` carries the field roster and the connect
options, and `statusvocabulary.ts` carries the connection status vocabulary and
the machine it induces. Neither is a switch statement and neither is a
hand-written union — a table can be byte-compared against the pinned client's
own declaration, and `bun run check:status-vocabulary` does exactly that, with
`check:status-vocabulary-control` planting the five mutations that must redden
it. `statuspump.ts` is the one consumer of one connection's status source,
attached where connections are established, and it branches on no event name;
`sessionfacts.ts` carries the facts it mints and `sessionlanes.ts` the one emit
that lands them.

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
