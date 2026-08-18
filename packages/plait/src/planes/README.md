# planes — the state carriers, one seam per plane

One module per carrier, each owning what its law licenses: lanes and folds
(evidence, positions, the anchor floor), cells, registers, the catalog and its
payload seam, blobs, resolved references, read-plane sessions. The three CAS
disciplines stay separate — joins retry, registers reconcile by read-back,
anchors never retry.

Nothing here is generated; every declaration in this directory is hand-written,
so corpus concepts spelled twice are staged debt under the type-universe walk
(`AGENTS.md`, law 1). What holds these modules still is generated elsewhere:
`../../fixtures/fabric-conformance.ndjson` (27 vectors, from the
`verify/fabric` Lean model) and `../../fixtures/register-traces.ndjson` (15
rows, from `verify/fabric-veil`). Each file's first line is the command that
wrote it; regenerate through that executable, never by hand.

Wall, in two halves. `bun run test:walls` starts a local `nats-server` and
replays rows against the shipped services in `CellWall`, `FoldChaos`, and
`Register`; the cell mutants in `../../negative-controls/` are installable
layers, so applying one reds its rows and removing it greens them. `bun run
test:fast` carries `FabricWall` — 11 of the 27 vectors, no broker at all.

One level deeper: each module's `@module` header, then `../kernel/README.md`
for the language they speak, or the algebra behind the vectors in
[`verify/fabric/README.md`](../../../../verify/fabric/README.md).
