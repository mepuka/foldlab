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
- `Catalog` owns the `Catalog` and `Blobs` services — the two content-addressed
  stores a resolved reference decodes through.
- `Resolved` owns the `ResolvedOf` combinator: a reference whose decode
  resolves it and re-derives its digest. Encode is total and publishes nothing;
  `PublishingOf` is the explicit emit path.
- `Cell` owns lattice cells: the join, the merge-then-`update(rev)` write loop
  over the ruled `flb-fab-cell` bucket, and nothing else.
- `ContextProgram` owns the selector/renderer/volatility declaration shapes.
  There is no assembly executor and no F7 claim.
- `internal/nats` owns the NATS connection, exact stream shape, ephemeral
  ordered consumers, and interruptible callback-to-Stream adaptation.
- `internal/cells` owns the cell bucket's shape check, CAS reconciliation, and
  re-merge loop; `internal/refusals` owns the schema-issue bridge that
  `Refusal.decodeRefusing` is the single public door to.

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
comparator (the claim is set equality, which is comparator-independent);
watch semantics of any kind — no watch surface ships, because the KV watch
probe suite is not on the substrate gate. All cell claims hold within a fixed
backing-stream incarnation. Neither `Catalog` nor `Blobs` ships a durable
layer: the catalog layer is process-local, and the payload layer answers
absence until the object-store probe lands.
