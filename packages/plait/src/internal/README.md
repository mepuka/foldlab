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

Wall: `bun run test:walls` — the substrate suites that pin what the broker
actually does (ordered consumers, KV watch semantics, the object store,
transport defects, pump backpressure) — plus `bun run check:parity-control`,
whose planted field-drop mutant is refuted on
`../../negative-controls/SubstrateParity.field-drop.trace.txt`. What keeps
`cas.ts` honest is the pair of cell merge-discipline mutants beside it, each
the shipped loop with exactly one step replaced.

One level deeper: each module's `@module` header; `../../CONTEXT.md` for the
terms these adapters implement; `../planes/README.md` for the public seams
they serve.
