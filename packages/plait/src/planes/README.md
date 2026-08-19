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

A lane carries two seams and they are deliberately two services. `Lanes` emits;
`LaneReads` takes a bounded, ack-none tail and its live continuation, and it
opens its own connection so that a reader never holds the publisher's emit
right. Its bound is per PARTITION, because a partition is the unit that has an
order: positions come from one dense stream each, two partitions' positions are
not comparable, and a lane-wide count would have to divide across sequences
nothing can compare. A read acknowledges nothing, checkpoints nothing, and
creates nothing durable, so it may stand beside a deployed fold without touching
the frontier that fold advances.

The read-side folds and instances live in the module whose concept they are
about, never in a module of their own: the register's three-state fold and its
token order, the cell's digest equivalence, the lane's emission-acknowledgement
fold. Each carries the bounds its law actually has — the token order is
meaningful within one key and one backing-stream incarnation and licenses no
arbitration, the cell equivalence is licensed by the canonical form the door
already imposes, and a lane's duplicate bit is one partition stream's dedup
window and nothing wider. `../../test/MatchClosure.test.ts` is their wall.

The canonical names these seams take are branded sorts, not bare strings: a cell
name, a work key, an outcome value, a lane handle, and the holder a value is
attributed to. Each sort that teaches a refusal has one minting site here —
`Cell.cellName`, `Register.workKey`, `Lane.laneHandle` — and the adapter under
that seam calls it rather than re-testing the grammar, so a name that reached the
substrate was admitted exactly once. `CellName` and `Holder` are declared one
plane deeper, where a kernel module spells them too, and re-exported here.
`check:sorts-control` in `test:types` is the wall: a bare string offered at one
of these seams must fail to typecheck.

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
