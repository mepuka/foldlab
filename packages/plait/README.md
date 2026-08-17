# @foldlab/plait

The first Plait slice: a narrow public spine for canonical envelope identity
and verified delivery over one file-backed, single-replica JetStream server.

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
  reads from the ruled JetStream stream; its fixture layer uses the same tag.
- `Registers` is the five-action fenced commitment service. Its authoritative
  token is the KV revision-CAS order; holder strings are descriptive only.
- `internal/nats` owns the NATS connection, exact stream shape, ephemeral
  ordered consumers, and interruptible callback-to-Stream adaptation.

## Run

```bash
bun run test
```

The package test runs the unit and local-NATS suite, regenerates and byte-diffs
the four-row corpus, and derives a compile-time refusal-channel check from the
public barrel. Three planted controls prove it refuses a public `{ok}` union, a
new Effect export with a non-Refusal error, and a Context service Layer with a
non-Refusal error.

The recorded claim is deliberately bounded: four generated envelopes and one
local `nats-server v2.14.4`, file storage, `num_replicas: 1`. There is no claim
of crash recovery, durable-consumer resumption, federation, clustering,
exactly-once behavior, attribution, or liveness.

The register slice adds a separately bounded safety wall: 12 generated Veil
rows on local NATS v2.14.4, a file-backed `flb-fab-reg` bucket with R=1,
history 64, TTL 0, and no byte-size eviction. `hold` is a Scope-bound heartbeat
surface whose renewal loss interrupts its holder fiber; heartbeats carry no
theorem or liveness claim. The hard-kill wall runs TS holder → Go steal → TS
zombie refusal → Go winner commit.
