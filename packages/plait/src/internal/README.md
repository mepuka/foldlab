# internal — private adapters

Private adapters serve any layer and reach back only to their own public seam.
This is the machinery no consumer may name: the NATS connection, the exact
stream shape, ordered and durable consumers, the positioned pump with its
bounded successor buffer and explicit ack order, the KV adapters, the one
lattice write path (`cas.ts`'s `casJoinLoop`, shared by every class-(a)
writer), the schema-issue bridge, and the chaos schedules. NATS types stay
here; a `SchemaIssue`-typed signature that escapes diverges the public
type-level walk. Nothing in this directory is generated, and nothing here
restates a corpus concept — `digests.ts` and `refusals.ts` delegate to `truth`
rather than spelling a second Digest or a second refusal.

Wall, in two halves. `bun run test:walls` starts a real `nats-server` for the
suites that pin what the broker actually does — ordered consumers, KV watch
semantics, the object store, substrate parity, anchor CAS. `bun run test:fast`
carries the rest, which need no broker: `TransportDefects` asserts which
adapter mints which refusal from pinned client errors, and
`CommonsPumpBackpressure` drives the queued iterator in-process. Beside them,
`bun run check:parity-control` refutes a planted field-drop mutant on
`../../negative-controls/SubstrateParity.field-drop.trace.txt`.

One level deeper: each module's `@module` header, then `../kernel/README.md`
for the grammar these adapters carry and `../planes/README.md` for the public
seams they serve.
