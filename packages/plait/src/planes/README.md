# planes — the state carriers, one seam per plane

One module per carrier, each owning exactly what its law licenses: lanes and
folds (declared evidence, positions, the anchor floor), cells (join-merged
observation sets), registers (fenced commitments), the catalog and the payload
seam beneath it, blobs, resolved references, read-plane sessions (whose
`changes` face is the unfold of `read`), and environments (positioned
provision facts under the greatest-position read, feeding the one proven
program fill). The three
CAS disciplines stay separate on purpose — joins retry, registers reconcile by
read-back, anchors never retry at all — and `../../AGENTS.md` says which surface
may do what. Every public type here is hand-written under a unification ticket:
the largest block of staged debt under the first standing law.

Nothing here is machine-generated. What holds these modules still is generated:
`../../fixtures/fabric-conformance.ndjson` (27 vectors, from executing the
`verify/fabric` Lean model) and `../../fixtures/register-traces.ndjson` (15
rows, from `verify/fabric-veil`). Each carries its command on line 1.

Wall: both halves of the battery. `bun run test:walls` replays the broker-bound
rows against the shipped services — cells, chaos folds, registers — while the 11
pure-algebra vectors (F2, F2b, F3, F3-F2b, F4) and the dropped-successor trace
replay brokerless in `bun run test:fast`. Mutants in `../../negative-controls/`
are installable layers: *applying* one reds its rows. Bounds: `../../README.md`.

One level deeper, down the plane order: `../kernel/README.md`, the corpus these
seams speak; then the algebra behind the vectors, in
[`verify/fabric/README.md`](../../../../verify/fabric/README.md).
