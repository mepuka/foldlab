# DEV-711 — JetStream `Created` incarnation-pin audit

**Status:** FINDING — `StreamInfo.Created` is neither a unique stream-
incarnation identifier nor stable restore-safe identity metadata in the pinned
standalone server. It can be retained across a rollback that admits a second
outcome, and it can drift after restart without a semantic reincarnation.

**Question.** The DEV-711 coordinator ruling in Multica comment
`547eaa18-6c6a-40c0-a8e9-a5f480ee2b2d` ratifies the fixed-incarnation option
and directs the runtime to record "a backing-stream creation time" at open and
refuse on mismatch (or explicitly defer that guard). Is JetStream's public
`StreamInfo.Created` sound for that pin on the exact DEV-711 substrate?

**Answer.** No, not as a safety boundary. It is useful diagnostic metadata
inside an operational premise that already forbids destructive lifecycle
mutation, but it does not enforce or uniquely name that premise. In
nats-server v2.14.4 standalone mode:

1. snapshot restore deliberately copies the snapshot's old `Created` value to
   the new live stream;
2. the restored snapshot may also roll the numeric KV sequence back, so the
   same creation time and the same numeric token can jointly reappear;
3. stream-info checking and revision-CAS publishing are separate server
   requests, so a client-side per-operation check has a deletion/recreation
   time-of-check/time-of-use gap; and
4. after restart, the public live value remains the original time, but the
   file-store's in-memory metadata retains a recovery-time value. A later
   snapshot or no-op config update can propagate that different value.

The existing five-action Lean theorem remains sound for its closed LTS. The
finding is about runtime correspondence and the load-bearing substrate
assumption, not the proof of the modeled actions.

## Post-merge status

PR #74 merged at `bd1c7e3dd`, followed by the ledger commit `5004471ae`.
The landed artifacts chose the ruling's allowed deferral rather than
implementing the proposed timestamp pin. `packages/plait/DECISIONS.md` T6 says
the register does not record creation time or refuse on mismatch, and
`VERIFICATION.md:99-102` bounds every runtime claim to a fixed backing-stream
incarnation while naming administrative lifecycle mutation and the missing
pin as residuals.

Accordingly, this finding does **not** refute the landed five-action theorem or
require retracting the bounded ledger row. It refutes one contemplated way to
close T6 in a later change: `Created` equality cannot be promoted from
diagnostic metadata to evidence that the same incarnation/history still
exists. The unresolved safety mechanism remains the separately enforced
credential and administrative-process boundary.

## Finding DEV711-CREATED-1 — restore can reuse the pin and token

The minimized exact-pins trace is:

1. Create `KV_DEV711_CREATED_RESTORE`; its creation time is `C`.
2. Create one work key. The holder receives revision/token `1`.
3. Snapshot the stream while the grant at revision `1` is current.
4. Commit outcome A with expected revision `1`; it lands at revision `2`.
5. Delete the stream and restore the earlier snapshot.
6. The restored stream reports creation time `C`, and the work key is again at
   revision `1`.
7. The pre-deletion holder submits token `1`; outcome B lands at revision `2`.

The pinned real server produced:

```text
snapshot-created=2026-08-17T16:33:50.7342293Z restored-created=2026-08-17T16:33:50.7342293Z created-equal=true snapshot-last-seq=1 restored-revision=1 old-token=1 old-outcome-revision=2 pre-delete-token-accepted-after-rollback=true second-outcome-revision=2 final="outcome-B-from-pre-delete-token"
```

Thus `(Created, numeric revision)` is not a restore-safe epoch/token pair. Two
historical terminal outcomes landed for the same work digest, while the
proposed creation-time check observed no mismatch.

This is not merely an inference from unspecified clock precision. Standalone
restore explicitly implements the equality:

- the snapshot archives the file store's `FileStreamInfo`, whose `Created`
  field exists to remember the creation time
  ([nats-server `filestore.go:81–85`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L81-L85));
- `Snapshot` marshals `fs.cfg` into the archive
  ([`filestore.go:12205–12223`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L12205-L12223));
- restore reads that archived `FileStreamInfo`, requires the live name to be
  absent, creates the stream, then overwrites its in-memory creation time with
  the archived value
  ([`stream.go:9174–9217`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L9174-L9217)); and
- the restore response reports the resulting `mset.createdTime()`
  ([`jetstream_api.go:4058–4073`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L4058-L4073)).

The revision half is the same owning predicate already established by the
lifecycle audit: KV `Update` sends only
`Nats-Expected-Last-Subject-Sequence` and returns the publish acknowledgement's
sequence
([nats.go `jetstream/kv.go:1116–1150`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1116-L1150));
the server compares that numeric value with the current subject sequence and
does not include `Created`
([nats-server `stream.go:6440–6466`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6440-L6466)).

### Why this source and probe are pertinent

The coordinator selected fixed incarnation specifically to avoid adding an
epoch to the v0 model. Snapshot restore is therefore pertinent because it is a
public administrative transition that removes and reinstalls the same backing
stream while changing the retained history. The probe uses the public
snapshot, delete, restore, stream-info, and KV APIs on the exact file-backed,
R1, nonclustered server envelope. It retains the old KV handle and old numeric
token, so the stale caller is not rebound or reissued authority by the test.

Clustered restore is not a rebuttal. The pinned clustered path creates a fresh
stream-assignment time
([`jetstream_cluster.go:8833–8888`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_cluster.go#L8833-L8888)),
whereas DEV-711 explicitly claims the standalone R1 envelope. The difference
means the timestamp's semantics are topology-dependent; it does not supply a
portable public identity guarantee.

## Finding DEV711-CREATED-2 — recovery metadata can drift without replacement

The second probe found the opposite failure mode:

```text
restart-original-created=2026-08-17T16:33:50.7614323Z live-after-restart-created=2026-08-17T16:33:50.7614323Z after-noop-update-and-second-restart-created=2026-08-17T16:33:50.7771926Z restored-from-post-restart-snapshot-created=2026-08-17T16:33:50.7934366Z live-preserved-across-first-restart=true noop-update-preserved-created-after-next-restart=false snapshot-restore-preserved-original=false
```

There are two reproducible drifts:

- create at `C0` → restart → no-op stream-config update → restart reports a
  later `C1`; and
- create at `C0` → restart → snapshot → delete/restore reports a later `C2`.

No logical stream replacement occurs before the no-op update. A strict pin
would nevertheless refuse the same persisted stream after the next restart.
That is an availability false positive, distinct from the rollback safety
false negative above.

The source explains the result:

1. initial standalone creation assigns `time.Now().UTC()` to `mset.created`
   ([`stream.go:904–935`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L904-L935));
2. `setupStore` passes that value into `newFileStoreWithCreated`
   ([`stream.go:5199–5224`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L5199-L5224)),
   which stores it in `fs.cfg.Created`
   ([`filestore.go:392–444`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L392-L444));
3. restart separately reads the persisted `FileStreamInfo`, reconstructs the
   stream, and only then resets `mset.created` to the stored value
   ([`jetstream.go:1434–1444,1519–1548`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream.go#L1434-L1444));
4. that setter changes only `mset.created`, not `fs.cfg.Created`
   ([`stream.go:1601–1613`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L1601-L1613));
5. a config update preserves the file store's current `fs.cfg.Created` and
   writes it to metadata
   ([`filestore.go:700–708`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L700-L708)); and
6. a snapshot likewise marshals `fs.cfg`, not the public `mset.created` value
   ([`filestore.go:12205–12223`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L12205-L12223)).

Normal restart alone still reports `C0`; the pinned server's upstream tests
intentionally verify that public preservation. The new finding is the split
between the public stream field and the file store's metadata after recovery,
made observable by update or snapshot.

### Why this is pertinent

DEV-711 proposes comparing a stored open-time pin with later public
`StreamInfo.Created`. An operationally ordinary restart plus a no-op update
must not be mislabeled as a backing-stream reincarnation unless the contract
explicitly chooses that surprising boundary. More importantly, the same drift
shows that `Created` lacks stable identity semantics even before considering
adversarial lifecycle mutation.

The update path is also directly relevant to DEV-716's guard work: denying
delete, purge, and restore while permitting stream update would still permit
this creation-time drift. Denying update avoids this particular propagation,
but it does not convert the timestamp into a unique or atomic epoch.

## Assignment, persistence, and public contract

For a newly created standalone stream, nats-server samples
`time.Now().UTC()`; clustered creation does the same for the assignment
([standalone `stream.go:904–935`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L904-L935),
[clustered `jetstream_cluster.go:8296–8303`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_cluster.go#L8296-L8303)).
The file store serializes `fs.cfg` to `meta.inf`
([`filestore.go:973–1012`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L973-L1012)).
Create and info responses expose `mset.createdTime()`
([`jetstream_api.go:1464–1484,2018–2029`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L1464-L1484)).

The public contract calls the value a timestamp, not an identifier:

- nats.go v1.53.1: "the timestamp when the stream was created," represented as
  `time.Time`
  ([`jetstream/stream_config.go:24–33`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/stream_config.go#L24-L33));
- `@nats-io/jetstream` 3.4.0: "The ISO Timestamp when the stream was created,"
  represented as `string`
  ([`jetstream/src/jsapi_types.ts:68–80`](https://github.com/nats-io/nats.js/blob/v3.4.0/jetstream/src/jsapi_types.ts#L68-L80)).

No pinned public source promises uniqueness, monotonicity, collision refusal,
non-reuse, or restore-freshness. Ordinary delete/recreate usually samples a
different wall-clock value, and can therefore be diagnostically useful, but a
timestamp difference observed in tests is not a uniqueness guarantee. The
explicit restore reuse above is enough to refute the pin without relying on a
possible wall-clock collision.

## Client exposure is observation, not enforcement

### Go v1.53.1

`Stream.Info` returns the server's `StreamInfo`; it does not derive an epoch
([`jetstream/stream.go:435–483`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/stream.go#L435-L483)).
KV `Status` internally calls backing-stream `Info`
([`jetstream/kv.go:1583–1590`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1583-L1590)),
but its `KeyValueStatus` interface does not expose `Created`
([`:310–343`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L310-L343)).
The exported concrete `*KeyValueBucketStatus` does offer `StreamInfo()`, so a
caller may type-assert, or more directly bind the `KV_<bucket>` stream
([`:810–832`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L810-L832)).

### TypeScript 3.4.0

`KvStatus.streamInfo` is public
([`kv/src/types.ts:233–246`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/types.ts#L233-L246)).
`status()` fetches backing-stream info and `KvStatusImpl.streamInfo` returns it
unchanged
([`kv/src/kv.ts:1011–1027,1098–1100`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L1011-L1027)).

These sources are pertinent to implementation feasibility only: both runtimes
can observe the field. They are not independent oracles for its meaning; both
consume the same server response, and neither upgrades a timestamp into an
epoch.

## Pin timing and the TOCTOU boundary

The available client-side strategies have different limitations:

| Strategy | What it catches | What it does not establish |
| --- | --- | --- |
| Pin once at open | A stream that already differs at open | Replacement after open; snapshot rollback with reused `Created`; later metadata drift |
| Recheck before every KV mutation | An already-visible ordinary replacement | Replacement between info response and publish; restore with equal `Created` |
| Recheck after mutation | A replacement visible after the publish | Safety: a stale outcome may already have landed and cannot be retracted |
| Recheck before and after | Better diagnosis of ordinary races | Atomic correspondence; equal-`Created` restore; prevention of an already-landed stale write |

The gap is structural. Stream info is requested on a JetStream management
subject, while KV CAS publishes a distinct message carrying only the expected
numeric subject sequence. The server has no operation that atomically asserts
both `Created == pin` and `last-subject-sequence == token`. A deterministic
adversarial schedule is therefore:

```text
application: INFO reports pinned C
administrator: delete and recreate stream; new grant receives token 1
application: UPDATE(expected-subject-sequence=1) lands
```

The earlier DEV711-LIFECYCLE-1 real-server probe already witnesses the last
two steps and the accepted stale write. Re-running it is not needed to establish
the TOCTOU: the owning server predicates show that the info result is not an
input to the later CAS.

## What restricted credentials can and cannot do

Restricted application credentials can make `Created` a useful diagnostic
within a *separately ratified* fixed-incarnation operational premise:

- application identities must be unable to delete, purge, restore, or update
  the backing stream and unable to delete/purge register data;
- the deployment must demonstrably use those credentials, rather than merely
  test a credential shape;
- privileged administration must exclude concurrent lifecycle mutation while
  register holders may act, or explicitly terminate the old register session
  and its claims; and
- restore/rollback remains a named out-of-model transition requiring its own
  procedure and negative controls.

Under that envelope, a `Created` mismatch can fail closed and report that the
operational premise was violated. It still is not the mechanism that makes F5
true. The ACL/process boundary is load-bearing; privileged administrators can
race any client-side check, and snapshot restore can evade an equality check.

This distinguishes four layers:

- **Model theorem:** I1/I2 for grant, renew, commit, expire-steal, and observe
  in the closed Lean/Veil transition system; unchanged by this audit.
- **Runtime correspondence:** KV revision CAS implements the modeled token
  only while the same, non-rolled-back backing-stream history remains in force.
- **Substrate assumption:** no delete, recreate, restore, rollback, or sequence
  reset while issued tokens remain semantically live.
- **Operational guard:** credentials and administrative procedures enforce
  that assumption. `Created` may detect some violations but cannot enforce it.

No liveness conclusion follows. Fail-closed mismatch handling may sacrifice
availability, and this report does not specify recovery, retry, or operator
progress behavior.

## Probe artifact and provenance

Artifacts:

- [`reference/dev711-created-time-incarnation/probe.go`](reference/dev711-created-time-incarnation/probe.go)
- [`reference/dev711-created-time-incarnation/output.txt`](reference/dev711-created-time-incarnation/output.txt)

Command, run from `go/`:

```text
go run ../docs/research/reference/dev711-created-time-incarnation/probe.go
```

It ran repeatedly during development; the committed transcript is the final
successful run, exit `0`. Pins and envelope:

- nats-server `v2.14.4`, module tag dereference
  `bbd6dc5e903f3505a1d9a7a21c50e0131901afd7`;
- nats.go `v1.53.1`, commit
  `db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac`;
- Go `1.26.5 windows/amd64`;
- embedded standalone server, file storage, R1, unrestricted administrative
  in-process connection.

The TypeScript packages are pinned to `3.4.0` in `bun.lock` with source at
nats.js tag/commit `v3.4.0` / `95e76e79d9feaa0a0bf3b0e8da526ec5a3460979`.
They were source-traced but not separately executed. That is pertinent to API
parity, not the counterexample: the server owns `Created`, snapshot restore,
and the CAS predicate, so a second client cannot be an independent oracle.

## Disposition boundary

The already-ratified fixed-incarnation option remains coherent if its meaning
is operational rather than inferred from `Created`: the same stream history is
kept continuously, destructive lifecycle and rollback are excluded, and the
guard is executable. What must not be claimed is that comparison with
JetStream creation time proves that continuity.

Before a creation-time check is made a gate, its intended status needs one
explicit clarification:

1. **Diagnostic only (supported by this audit):** mismatch refuses and reports
   an operational-boundary violation, but equality is not evidence of the same
   incarnation and the safety claim still names the credential/admin premise.
2. **Safety epoch (refuted):** equality is treated as proof of the same backing
   incarnation. Snapshot rollback is a minimized counterexample.

An opaque, server-enforced epoch could support a stronger cross-lifecycle
claim, but the coordinator has correctly kept epoch-bearing tokens out of v0.
This report does not reopen that choice or prescribe a product repair.

## Explicit non-coverage

- No product code, spec, fixture, `VERIFICATION.md`, or Multica state was
  changed.
- The probe is standalone R1 because that is the current DEV-711 envelope. It
  does not generalize the distinct clustered restore implementation.
- Crash recovery of an interrupted restore, filesystem rollback outside the
  JetStream API, account import/export, mirror/source behavior, and clock
  manipulation were not executed. None is needed for the two witnessed
  counterexamples.
- This is safety and correspondence research only. It makes no liveness,
  retry-fairness, lease-progress, or operational-recovery claim.
