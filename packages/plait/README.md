# @foldlab/plait

Plait's canonical envelope spine, durable evidence lanes, fold runtime, and
fenced register over one file-backed, single-replica JetStream server.

## Modules

- `Canonical` translates the `@foldlab/core/jcs` seam into Plait's tagged
  structural refusal channel.
- `Digest` derives lowercase SHA-256 identity from canonical, uncompressed
  bytes only.
- `Refusal` owns the structural/absence tagged errors and the absence-only retry
  policy.
- `KernelDoor` is the one admission door. Its candidate, context, and
  intrinsic-act types are projections of the model-generated schemas, its
  `admit` is the model-vector-gated judgment over them, and CLI, `FabricClient`,
  and `CasDaemon` export that exact function rather than a wrapper.
- `Wire` constrained-decodes the closed Envelope v0 shape, enforces the inline
  body threshold, and verifies `Nats-Msg-Id` by re-derivation.
- `Subjects` constructs the three ruled `flb.fab.*` routing families without
  mixing routing with identity.
- `FabricClient` is the public Effect service. Its live layer publishes to and
  reads from the fact/node control stream or discovers a declared evidence
  partition stream; its fixture layer uses the same tag.
- `Lane` declares content-addressed partition routing and emits canonical
  events. Every `(lane, partition)` receives one exact stream whose dense
  sequence is the durable fold position.
- `Algebra` declares reducers. `commutative` derives digest-seeded distinct ACI cases before
  attaching the F4 witness that licenses partitioned folds.
- `Fold` derives each step from a per-event contribution and exposes
  `Folds.deploy`, the only deployment/resumption verb.
- `Anchor` constructs the `(floor, stateDigest, head)` checkpoint fact. The
  floor records the frontier; the successor discipline protects it.
- `Registers` is the five-action fenced commitment service. Its authoritative
  token is the KV revision-CAS order; holder strings are descriptive only.
- `Catalog` owns the `Catalog` service and the catalog-internal `Payloads`
  seam — the two content-addressed reads a resolved reference decodes through.
  `Resolved.resolve` is their one verify door for a resolved reference. The
  service has two adapters: `Catalog.layer` is the process-local map, still the
  default and unverified by design so a lying layer can be supplied under the
  door; `Catalog.layerDurable` is the fabric-backed store — digest-keyed
  entries in a file-backed, single-replica, non-evicting bucket — which
  re-derives identity over the bytes it fetched, because its control flips
  bytes on the substrate behind the API rather than needing the service's
  cooperation. Fold checkpoint state is a consumer of that durable store.
- `Blob` owns the public `Blobs` store — put, verified get, presence — with
  verification inside the service and absence as a `blob-absent` refusal. Its
  first backend rides the pin's portable `FileSystem`; the object-store backend
  waits on DEV-730.
- `Resolved` owns the `ResolvedOf` combinator: a reference whose decode
  resolves it and re-derives its digest. Encode is total and publishes nothing;
  `PublishingOf` is the explicit emit path. `ResolveCache` memoizes the verified
  seam and nothing else — successes never expire because the keyspace is
  immutable, failures are never recorded because absence is head-relative, and
  capacity is a memory budget the layer is given.
- `Cell` owns lattice cells: the join, the merge-then-`update(rev)` write loop
  over the ruled `flb-fab-cell` bucket, and nothing else.
- `ContextProgram` owns the selector/renderer/volatility declaration shapes.
  There is no assembly executor and no F7 claim.
- `Session` is the consumer half of the fold plane: a writ declares the views a
  reader may image, `subscribe` opens a read-plane session at a declared fold's
  anchor, and `read` takes one step — the image, the coordinate it was anchored
  at, and the session that step leaves behind. It reads; it writes no anchor, no
  state, and no stream. A fold the writ does not name refuses on this surface,
  and that refusal is the seam's own — no claim about the package's other read
  paths ships with it.
- `Engine` is the language-speaking service: candidate sentences judged by the
  one door, admitted sentences carried to their planes, configuration built by
  declaring, and closed program declarations executed node by node through
  that same door with the taught refusal stopping a run where it fires.
- `RunTrace` is the engine's execution log: one program run projected into ONE
  canonical fact and landed on a declared lane, keyed by the writ the run acted
  under. The live per-act story is the verdict stream and stays flux; this is
  the run as meaning — the arm it ended on, the node it stopped at, the door's
  own taught row where it was refused, and every walked step verbatim, with
  each unbounded integer written as its exact decimal because a JSON number
  rounds identities. The landing is a judged emit like any other, and both a
  refused sentence and a refused seam are handed back in the value rather than
  costing the caller the run's own answer. Replay reads the fact and re-asks no
  completion; there is no clock on a trace.
- `Environment` carries environments as directories: positioned provision
  facts, the greatest-position read that never arbitrates, and
  `fillFrom`, which hands the derived valuation to the program builder's one
  proven fill.
- `Mcp` serves the kernel language over MCP: eight tools read verbatim from
  the committed copy of the model's own tool-schema projection, handlers
  routed through the engine, door refusals answering with the taught row and
  seam refusals with the estate refusal's own fields.
- `Api` serves the PLANES over HTTP and carries no write. Seven declared reads —
  the roster itself, the connection snapshot, a lane's bounded tail, a
  register's observed state, a cell's observation set with its identity, a
  store's incarnation chain, and one live change stream — each answering the RFC
  8785 canonical bytes of the plane read it projects, with the value never
  re-shaped on the way out. Every collection is bounded and the admitted bound
  rides in the answer; the change stream is one Server-Sent Events frame per
  landed fact, written as the fact arrives. The write half is absent by
  construction: the layer requires the three read services and nothing else, so
  a write verb answers a taught refusal and the methods this face carries. It
  authenticates nobody, and `plait api` binds loopback by default for that
  reason.
- `Lane`'s read half, `LaneReads`, is the bounded ack-none tail a declared lane
  is read through, and its live continuation. It opens its own connection so a
  reader never holds the publisher's emit right, and it runs on ephemeral
  ordered consumers, so a read acknowledges nothing, checkpoints nothing, and
  creates nothing durable. The bound is per partition, because two partitions'
  positions come from two sequences and are not comparable.
- `surface/init` is first contact. The `plait init` verb mints the opening
  declaration set — the store, the server options, the holder, and the agent
  writ — as canonical values written at the names their own bytes earn, names
  those four from one root, and places a project-scoped agent-client
  registration pointing at the same program the party just ran. Saying the same
  sentences twice writes the same bytes, executed rather than asserted on both
  the pure and the real-substrate side. The writ it mints is DECLARED and not a
  guard: nothing refuses a tool call or a view for being outside it, and the
  printed report says so in one clause. The bootstrap gate starts the shipped
  substrate lifecycle command and requires the options and store digests that
  command prints to be the ones the bootstrap declared — the one cross-language
  oracle on this surface — then connects an agent client over the registration's
  own command and round-trips one admitted sentence. No authentication claim
  ships with it: the holder is attribution, never authority, and an identity
  story is future work.
- `internal/nats` owns the NATS connection, exact stream shape, ephemeral
  ordered consumers, and interruptible callback-to-Stream adaptation.
- `internal/cas` owns the class-(a) write path: the bounded
  merge-then-`update(rev)` loop, its reconcile-before-classify order, and the
  discipline seam a negative control swaps exactly one step of. `internal/cells`
  owns the cell bucket's shape check, key law, observation codec, and the
  carrier it binds into that loop; `internal/refusals` owns the schema-issue
  bridge that `Refusal.decodeRefusing` is the single public door to.
- `internal/pump` owns positioned durable records, explicit ack ordering, the
  bounded successor buffer, and durable pull consumers. `internal/anchors`
  owns the anchor KV adapter and fatal lost-CAS detach.
- `internal/lanereads` owns the read side of a lane: the span a bounded tail
  clips to, the ephemeral ordered consumers both faces run on, and the staging
  that turns a reader falling behind into a taught refusal rather than a dropped
  arrival. A partition with no stream reads as an empty tail, because the emit
  path is what declares a lane's streams and a read declares nothing.
- `internal/chaos` drives real NAK redelivery and reordered-arrival schedules.
  The `plait chaos` bin adds the hard-kill arm and prints its canonical measured
  scoreboard; partition reorder is explicitly deferred in v0.

## Run

```bash
bun run test
```

It is the concatenation of three groups, each runnable on its own while you
work: `test:fast` (the pure test files, the corpus diff, the kernel table and
schema diffs, the refusal-vocabulary and taught-payload diffs, the
public-effect manifest, the public-type waiver ledger in both report and
enforce mode, and the substrate-parity control), `test:walls` (every file that brings up a real `nats-server`), and
`test:types` (the twenty public-effect negative controls plus the
type-universe, refusal, and rung enforcement controls). The fast/wall
partition is derived from whether a test file imports the NATS harness, so a
file added later joins a group without being listed.

The package test runs unit and local-NATS walls, byte-diffs generated corpora,
replays every E4 `verify/fabric` row, and derives the refusal-channel manifest
from the public barrel. Committed controls drop the successor discipline,
attempt an unearned commutative brand, inject an incompatible step, and ack
before its anchor; the CLI control mutates declared contribution behavior
between arms. Every mutant is killed on its recorded trace.

The durable-fold evidence is bounded to local `nats-server v2.14.4`, one
non-clustered node, file storage, and `num_replicas: 1`. The hard-kill and real
NAK-redelivery walls produce byte-equal per-partition state digests for a
non-idempotent counter. The runtime is walled against the model that is proven;
the runtime itself is never called proven. One live pump per fold partition is
assumed. There is no exactly-once, liveness, federation, or clustering claim.

Run a declared fold against a pinned span:

```bash
PLAIT_NATS_URL=nats://127.0.0.1:4222 bun run ./src/surface/cli.ts chaos \
  ./my-fold.ts --pin-head --axis kill --axis duplicate --axis reorder --output json
```

The module must export the value returned by `Fold.declare` as `fold` or its
default export. `--fold <digest>` is refused until the catalog slice exists.

The register slice adds a separately bounded safety wall: 15 generated Veil
rows on local NATS v2.14.4, a file-backed `flb-fab-reg` bucket with R=1,
history 64, TTL 0, and no byte-size eviction; every row is verified against
the Veil module's generated transition relation at export time. All register
claims hold within one backing-stream incarnation, and the adapter now
enforces that rather than assuming it: the backing stream's creation time is
pinned at open and re-asserted ahead of every action, so a fence minted under
a destroyed bucket refuses `incarnation-mismatch` — ahead of any staleness
comparison — instead of landing on its reborn successor. The pin is a
precondition, not a two-phase commit: a rebirth between the assertion and the
CAS is a residual one-round-trip window, and the DEV-716 ACL suite is the
other half of the guard. `hold` is a Scope-bound heartbeat surface whose renewal loss
interrupts its holder fiber; heartbeats carry no theorem or liveness claim.
The hard-kill wall runs TS holder → Go steal → TS zombie refusal → Go winner
commit.

The context slice adds the cell wall, bounded the same way: the fabric model's
F1 and F2 vector families (one F1 row, two F2 rows, counts pinned by the
corpus header) replayed against a file-backed `flb-fab-cell` bucket with R=1,
history 1, TTL 0, and no byte-size eviction on one local `nats-server v2.14.4`.
Both merge schedules of the F1 row converge on the model's state; the F2 rows
reach it under duplication and permutation of their delivery schedule; a lost
CAS race, held deterministically by a frame-aligned tap, re-reads and re-merges
without dropping an observation; and a read-back that already carries the delta
reports the converged state rather than refusing it — at the retry boundary,
where a rival join lands a strict superstate on the last permitted attempt, and
under a transport-class failure on the first.

Two committed controls, each the shipped `makeCellServiceWith` with exactly one
merge-discipline step replaced and everything else — connection, bucket shape
check, key law, attempt loop, CAS mechanics, canonical encoding — shared by
construction: the join deleted (last-writer-wins, the merge §6.3 refuses by
name), refuted by the F1 row; and the read-back reconciliation swapped from
subsumption to byte-equality against the one intended record, refuted by both
reconciliation rows. All three traces are executed and byte-compared
(`negative-controls/cell-lww-mutant.trace.json`,
`negative-controls/cell-retry-boundary.trace.json`,
`negative-controls/cell-byte-equality-mutant.trace.json`); un-mutating either
control reds its own rows.

Beneath that wall, two ordinary suites: the extracted loop's mechanics over an
in-memory substrate (`test/Cas.test.ts` — the pre-CAS guard, the
reconcile-before-classify order, the bound as a parameter), and the local
replica's own (`test/CellReplica.test.ts` — absorbing never shrinks the local
join, and the derived order is observation-set inclusion, the shapes
`cell_absorb_inflationary` and `cell_le_iff_subset` describe). Both are tests of
contract prose and claim nothing about the model; the live wall above is what
holds the write path's behaviour still.

What the reconciliation rows do NOT claim: they classify a bounded RESULT under
an adversarial but finite monotone schedule. They do not make subsumption safer
than byte-equality, and they are not convergence safety, fairness, or progress
— convergence safety is the exact-digest comparison against the model verdict.
The shipped predicate tests `delta ≤ readBack`, not `current ⊔ delta ≤
readBack`, so preservation of the read state rests on every writer being
inflationary, not on the check.

What the cell wall does NOT claim: the model-level F1 (already claimed by the
fabric row); anything about assembly, context values, or F7; agreement between
the TypeScript canonical-bytes comparator's ORDER and the Lean carrier's own
comparator (the claim is set equality, which is comparator-independent). The
ninth substrate suite now pins KV watch replay/coalescing, tombstones,
resume-from-revision, and one same-server reconnect schedule, but no watch
surface ships yet; any future feed is advisory, `isUpdate` is not an
initial/live boundary, and silence never proves absence. The tenth substrate
suite now pins the object store's put/get integrity, chunk boundaries, delete
semantics, and metadata stability, but no blob surface ships on it: the pinned
client has no ranged read, its whole-object digest is checked only when the
last chunk arrives, and object metadata is written by the client rather than
derived by the server — so a reader that trusts metadata has verified nothing.
All cell claims hold within a fixed backing-stream incarnation; the cell store
is argued exempt from the register's incarnation pin — no cell revision crosses
a call boundary, so there is no fence a reborn bucket could honor — and the
argument is recorded in `DECISIONS.md`, Task DEV-779. `Payloads` ships no
durable layer: the internal payload seam answers absence — the probed object
store remains advisory evidence, never a backing store.

What the durable catalog layer claims, and what it does not. Claimed, and
executed: a value admitted through `Catalog.layerDurable` reads back at the
digest of its canonical bytes; it is still readable by a later reader after the
server that admitted it is gone, over a file store that server no longer owns;
admitting the same value twice lands one entry and refuses nothing; a byte
flipped in the bucket behind the API is refused `digest-mismatch` and never
served; a memory-backed or revision-retaining bucket is refused
`catalog-substrate-shape` at acquisition rather than treated as a degraded
mode; and a create that landed but reported wrong-last-sequence anyway is
admitted through the read-back-and-compare reconcile, with the variant that
believes the report executed beside it and killed. NOT claimed:
power-durability, which nothing in this estate claims — the durability is the
substrate's declared crash-durability, and process-crash recovery over that
substrate is the substrate's own claim with the fold's two chaos gates as its
runtime evidence. Also not claimed: federation, venue authority, or any durable
snapshot of a catalog as one value. The process-local layer remains the
default; moving a deployment onto the durable one is a deployment act.

What the blob conformance suite claims: that a `BlobsService` layer round-trips
its bytes under the digest it derived, observes absence as `blob-absent`,
refuses `digest-mismatch` on a store corrupted behind its back, is idempotent
by content addressing, answers presence head-relative, and holds two distinct
payloads at once — the last law is what a store addressed by a truncation of
the digest rather than the whole of it fails, and every other law lets such a
store through. It runs against the filesystem backend over the OS filesystem.
The planted control per law is memory-backed, deliberately: a control has to
drop one law and keep the rest, which is written directly rather than by
deforming a real backend. It does NOT claim power-durability — the pin's `writeFile` does not fsync, so the
backend is crash-durable only — and it exercises no platform layer: the
application chooses `BunFileSystem` or `NodeFileSystem`, and that choice is the
application's to verify.
