# planes — the state carriers, one seam per plane

One module per carrier, each owning exactly what its law licenses: lanes and
folds (declared evidence, positions, the anchor floor), cells (join-merged
observation sets), registers (fenced commitments), the catalog and the payload
seam beneath it, blobs, resolved references, and read-plane sessions. The three
CAS disciplines stay separate on purpose — joins retry, registers reconcile by
read-back, anchors never retry at all — and `../../AGENTS.md` states which
surface may do what.

Nothing here is machine-generated. What holds these modules still is generated:
`../../fixtures/fabric-conformance.ndjson` (27 vectors, authored by executing
the `verify/fabric` Lean model) and `../../fixtures/register-traces.ndjson`
(15 rows, from `verify/fabric-veil`). Each file's first line is the command
that wrote it; regenerate through that executable, never by hand.

Wall: `bun run test:walls`, which brings up a local `nats-server` and replays
those rows against the shipped services. Its committed mutant traces are in
`../../negative-controls/` — the deleted join, the byte-equality
reconciliation, the dropped successor discipline, ack-before-anchor — and
un-mutating any one of them reds its own rows. Bounds are stated in
`../../README.md`; claims live in the repository's `VERIFICATION.md`.

One level deeper: each module's `@module` header; then
`verify/fabric/README.md` for the algebra those vectors come from.
