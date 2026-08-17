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
- `Algebra` declares reducers. `commutative` runs generated ACI cases before
  attaching the F4 witness that licenses partitioned folds.
- `Fold` derives each step from a per-event contribution and exposes
  `Folds.deploy`, the only deployment/resumption verb.
- `Anchor` constructs the `(floor, stateDigest, head)` checkpoint fact. The
  floor records the frontier; the successor discipline protects it.
- `Registers` is the five-action fenced commitment service. Its authoritative
  token is the KV revision-CAS order; holder strings are descriptive only.
- `internal/pump` owns positioned durable records, explicit ack ordering, the
  bounded successor buffer, and durable pull consumers. `internal/anchors`
  owns the anchor KV adapter and fatal lost-CAS detach.
- `internal/chaos` drives real NAK redelivery and reordered-arrival schedules.
  The `plait chaos` bin adds the hard-kill arm and prints its canonical measured
  scoreboard; partition reorder is explicitly deferred in v0.

## Run

```bash
bun run test
```

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
PLAIT_NATS_URL=nats://127.0.0.1:4222 bun run ./src/cli.ts chaos \
  ./my-fold.ts --pin-head --axis kill --axis duplicate --axis reorder --output json
```

The module must export the value returned by `Fold.declare` as `fold` or its
default export. `--fold <digest>` is refused until the catalog slice exists.

The register slice adds a separately bounded safety wall: 15 generated Veil
rows on local NATS v2.14.4, a file-backed `flb-fab-reg` bucket with R=1,
history 64, TTL 0, and no byte-size eviction; every row is verified against
the Veil module's generated transition relation at export time. All register
claims hold within a fixed backing-stream incarnation; administrative
lifecycle mutation is outside the credential guard (the incarnation pin at
open is a recorded deferral; the DEV-716 ACL suite is the other half of the
guard). `hold` is a Scope-bound heartbeat surface whose renewal loss
interrupts its holder fiber; heartbeats carry no theorem or liveness claim.
The hard-kill wall runs TS holder → Go steal → TS zombie refusal → Go winner
commit.
