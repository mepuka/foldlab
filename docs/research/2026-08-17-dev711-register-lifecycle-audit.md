# DEV-711 — JetStream register lifecycle audit

**Status:** FINDING — stop and ratify the lifecycle envelope before F5 is
claimed of the running register.

**Exact question.** Does DEV-711's F5 register claim remain true when its
numeric fencing token is a JetStream KV revision and the bucket or its backing
stream is purged, deleted, and recreated?

**Answer.** Not across a backing-stream incarnation change. Within one stream
incarnation, revisions do keep their fencing order even when messages or
tombstones are purged. Deleting and recreating the bucket/backing stream starts
a new sequence epoch, however, and the first grant reuses revision `1`. A stale
holder from the deleted incarnation can then present its old token `1`; the
server sees the new key's current revision `1` and accepts the write. The CAS
header carries no stream-incarnation identity.

This does not refute an inductive proof over DEV-711's stated five-action
transition system. It finds a missing, load-bearing correspondence assumption:
the five actions do not include bucket/stream deletion, purge, or reset, while
the runtime substrate does. F5 is therefore a theorem only for a fixed register
incarnation unless the lifecycle is explicitly added to the model.

## Finding DEV711-LIFECYCLE-1 — revisions are not global fencing tokens

The minimized real-server trace is:

1. In bucket incarnation A, `create(work)` lands at revision/token `1`.
2. `update(work, outcome-A, expected=1)` lands at revision `2`.
3. An administrator deletes the bucket (or directly deletes `KV_<bucket>`),
   including its data.
4. The same bucket name is recreated. `create(work)` again lands at
   revision/token `1`.
5. The old holder, retaining the old KV handle and old token `1`, executes
   `update(work, stale-outcome, expected=1)`. It lands at revision `2`.

Thus both of these proposed consequences are false across reincarnation:

- "no stale token ever lands" — the old token is numerically current again;
- "at most one landed outcome per work digest" — an outcome landed before the
  deletion and another lands after it (and the second may be the zombie's).

The issue spec fixes a model with state `(token, holder, outcome?)`, only five
actions, and no holder-identity authority
([dispatch 32, decisions 4–5](../../scratch/dispatch/32-plait-register-spec.md#L118-L146)).
It maps runtime authority to `create`/`update(rev)` and says the revision-CAS
order *is* the token order
([decision 7](../../scratch/dispatch/32-plait-register-spec.md#L164-L185)).
Its claimed result is per work digest, including arbitrary interleavings
([fabric §5.5](../design/2026-08-17-plait-coordination-fabric.md#L382-L400)).
None of those cited bounds names a fixed backing-stream incarnation.

The source chain is direct:

1. NATS documents a KV bucket as a JetStream stream named `KV_<bucket>`; a
   value write appends a message to the key's subject
   ([official KV documentation](https://docs.nats.io/learn/key-value/)).
2. nats.go v1.53.1 sets an entry's revision from the message's stream sequence
   and returns the publish acknowledgement's stream sequence from writes
   ([`kv.go:954–960, 1122–1150`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L954-L960)).
   `Update` supplies the revision only as
   `Nats-Expected-Last-Subject-Sequence`
   ([`kv.go:1116–1150`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1116-L1150)).
3. nats-server v2.14.4 loads the last message for that subject and compares its
   numeric sequence with the numeric header; there is no stream epoch in the
   predicate
   ([`server/stream.go:6440–6466`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6440-L6466)).
4. `DeleteKeyValue` is exactly a delete of `KV_<bucket>`
   ([nats.go `kv.go:733–745`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L733-L745));
   direct `DeleteStream` calls the stream-delete API
   ([`jetstream.go:840–861`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/jetstream.go#L840-L861)).
   The official API describes stream delete as deleting the stream and all its
   data, while purge leaves the stream
   ([NATS API reference](https://github.com/nats-io/nats.docs/blob/master/using-nats/jetstream/nats_api_reference.md#streams)).
5. A file-backed stream allocates the next message as `LastSeq + 1`
   ([nats-server `filestore.go:5210–5218`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L5210-L5218)).
   A fresh store starts from its zero state, hence its first message is `1`, as
   the probe confirms. The pinned server's own R1/R3 test independently asserts
   the same lifecycle fact: publish gets sequence `1`, delete/recreate the
   stream, and the new first publish again gets `1`
   ([`jetstream_test.go:20749–20850`](https://github.com/nats-io/nats-server/blob/bbd6dc5e903f3505a1d9a7a21c50e0131901afd7/server/jetstream_test.go#L20749-L20850)).

Nor do the pinned public APIs expose a documented opaque incarnation identifier
that could already be part of this CAS. Go `StreamInfo` exposes configuration,
creation time, state, cluster, mirror, and sources
([nats.go `stream_config.go:24–54`](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/stream_config.go#L24-L54));
the TypeScript shape has the analogous fields
([nats.js `jsapi_types.ts:69–108`](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/src/jsapi_types.ts#L69-L108)).
Creation time is not specified as a unique fencing epoch and is not carried by
the expected-sequence header.

The generated KV stream sets `DenyDelete: true` but `DeleteKeyValue` still
deletes the stream: the option governs individual-message deletion, not resource
lifecycle. nats.go's generated bucket configuration and deletion path make that
distinction explicit
([`kv.go:672–694, 733–745`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L672-L745)).

The pinned TypeScript client has the same semantics, rather than an independent
epoch mechanism. `@nats-io/kv` 3.4.0 `create` sends expected last-subject
sequence `0`; `update` sends the supplied numeric version in the same header;
and the returned token is `PubAck.seq`
([`kv/src/kv.ts:588–658`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L588-L658)).
Its entry revision is the stored message's stream sequence
([`:1118–1158`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L1118-L1158)),
and `purgeBucket`/`destroy` delegate directly to stream purge/delete
([`:1003–1009`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L1003-L1009)).

## The distinct destructive-operation cases

These operations do not all have the same effect. Treating them as one
"deletion-resurrection" case would hide the new finding.

| Operation under administrator authority | Sequence epoch | Old outcome | Old numeric token after recreation | F5 consequence |
| --- | --- | --- | --- | --- |
| Key `Delete`, then `Create` | Preserved: marker `3`, new grant `4` | No longer current | Still stale; refused | Token fence holds, but outcome immutability / one-landing fails without the DEV-704 credential guard |
| Key `Purge`, then `Create` | Preserved: purge marker `3`, new grant `4` | Prior revisions removed | Still stale; refused | Same split: no token reuse, but terminal outcome is forgotten |
| Remove the tombstone with `PurgeDeletes`, then `Create` | Preserved: empty stream has `FirstSeq=4, LastSeq=3`; new grant `4` | Removed | Still stale; refused | Same split; tombstone removal does not reset the stream epoch |
| Purge the whole backing stream, then `Create` | Preserved: after purge `FirstSeq=3, LastSeq=2`; new grant `3` | Removed | Still stale; refused | Same split; purge is terminal erasure, not token-epoch reset |
| Delete/recreate KV bucket | Reset: new grant is `1` | Removed with stream | Reused and accepted | Breaks both the stale-token corollary and one-landing |
| Delete/recreate `KV_<bucket>` directly | Reset: new grant is `1` | Removed with stream | Reused and accepted | Same counterexample; bucket deletion is this stream operation |

The preservation half follows from source as well as the probe. Key delete and
purge append a `DEL`/`PURGE` marker; create after a marker CASes against the
marker revision
([nats.go `kv.go:1061–1079, 1153–1205`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1061-L1079)).
`PurgeDeletes` removes markers using filtered stream purge
([`:1525–1580`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1525-L1580)).
Whole file-store purge advances `FirstSeq` to `LastSeq + 1` without resetting
`LastSeq`
([nats-server `filestore.go:10231–10258`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/filestore.go#L10231-L10258)).

DEV-704 already placed terminal immutability in the credential/shape envelope,
not the data mechanism
([fabric §6.3](../design/2026-08-17-plait-coordination-fabric.md#L516-L535)).
This audit adds one separate obligation: that envelope must also bind the
*backing stream incarnation* if a bare revision is called a fencing token.
Denying key `Delete`/`Purge` alone is insufficient. Until DEV-716 or another
ratified gate lands, the tree itself says no live standing guard may be claimed.

## Real-server probe

Artifact:
[`docs/research/reference/dev711-register-lifecycle/probe.go`](reference/dev711-register-lifecycle/probe.go).
It uses the old KV handle for the post-recreation stale write, so the witness
does not smuggle in a rebind by the zombie.

Pins and provenance:

- repository head at investigation start: `018efb94ded1f392f951626df7af78709fa776c3`;
- nats-server module `v2.14.4`, annotated tag `e31be768…`, dereferenced commit
  `bbd6dc5e903f3505a1d9a7a21c50e0131901afd7`, Go module sum
  `h1:efgjZ8cdExAKRuqSg8UPJFprb+l7NlBtSDPhDlw3rO4=`;
- nats.go `v1.53.1`, commit
  `db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac`, Go module sum
  `h1:Otsq3uLc/kLdjmkNHkXH0jBqwUquwdKFoe3fq6/3/Xo=`;
- `@nats-io/kv`, `@nats-io/jetstream`, and `@nats-io/nats-core` `3.4.0`,
  nats.js commit `95e76e79d9feaa0a0bf3b0e8da526ec5a3460979`; the exact npm integrity
  values remain pinned in [`bun.lock`](../../bun.lock);
- Go `1.26.5 windows/amd64`; embedded server, file storage, single node,
  `Replicas=1`, non-clustered, administrator-capable in-process connection.

Command, run from `go/`:

```text
go run ../docs/research/reference/dev711-register-lifecycle/probe.go
```

Output (second run after changing the reincarnation cases to retain the old KV
handle; exit `0`):

```text
pins nats-server=2.14.4 nats.go=v1.53.1 storage=file replicas=1 clustered=false
bucket-delete-recreate old_token=1 old_outcome_rev=2 before="old-holder/outcome-A" deleted_lookup_bucket_not_found=true new_token=1 token_reused=true stale_old_token_commit_accepted=true stale_commit_rev=2 after="old-holder/stale-outcome"
stream-delete-recreate old_token=1 old_outcome_rev=2 new_token=1 token_reused=true stale_old_token_commit_accepted=true stale_commit_rev=2 after="old-holder/stale-outcome"
stream-purge old_token=1 old_outcome_rev=2 before_msgs=2 before_first=1 before_last=2 after_msgs=0 after_first=3 after_last=2 old_outcome_forgotten=true new_token=3 token_reused=false stale_old_token_refused=true new_outcome_rev=4 after="new-holder/outcome-B"
key-delete-recreate old_token=1 old_outcome_rev=2 delete_marker_rev=3 delete_marker_op=KeyValueDeleteOp key_absent=true new_token=4 token_reused=false stale_old_token_refused=true new_outcome_rev=5 after="new-holder/outcome-B"
key-purge-recreate old_token=1 old_outcome_rev=2 purge_marker_rev=3 purge_marker_op=KeyValuePurgeOp key_absent=true new_token=4 token_reused=false stale_old_token_refused=true new_outcome_rev=5 after="new-holder/outcome-B"
tombstone-remove-recreate old_token=1 old_outcome_rev=2 delete_marker_rev=3 after_remove_msgs=0 after_remove_first=4 after_remove_last=3 key_absent=true new_token=4 token_reused=false stale_old_token_refused=true new_outcome_rev=5 after="new-holder/outcome-B"
```

## Pertinence and required disposition

DEV-711's Veil proof can still correctly establish I1/I2 for the five modeled
actions. It cannot establish closure under an environmental transition absent
from the model. Likewise, a model-generated replay corpus that operates on one
pre-created bucket will not falsify incarnation reuse. Calling the runtime wall
F5 correspondence without a lifecycle bound would therefore overstate what the
wall exercised.

One of these semantic dispositions is required before the runtime claim lands:

1. **Fixed-incarnation bound.** State that F5 is per `(work digest, backing
   stream incarnation)`, not unconditionally per work digest. Creation happens
   once; stream/bucket purge, delete, restore-over, and recreate are excluded
   environmental transitions. The credential/shape envelope must cover both
   KV data verbs and the relevant stream-management lifecycle APIs. Privileged
   administrator lifecycle remains a named residual. This keeps the five-action
   model unchanged but narrows the claim.
2. **Cross-incarnation claim.** If F5 must remain per work digest across resource
   lifecycle, a numeric KV revision is not an adequate token identity. A stable
   epoch/incarnation order and terminal record must survive or detect bucket
   replacement, stale callers must present that epoch with the revision, and
   lifecycle/reset actions must be regrilled and added to the model and wall.
3. **Recreation means a new register.** Ratify that replacing the backing stream
   creates a new semantic register even when the bucket and work-digest strings
   are reused. Then the public claim and every consumer must key/register results
   by that incarnation; no cross-incarnation uniqueness or stale-token claim is
   made.

This report does not select among them. Under the repository's findings-before-
fixes rule, the omitted load-bearing assumption is the deliverable.

## Explicit non-coverage

- The probe/report changed no product code, fixtures, specification, or claims
  ledger. After this report was verified, its minimized finding was posted to
  Multica DEV-711 as comment `d9f56ed6-65f6-437c-88c1-f009fedb6ae3`.
- The probe is single-node, non-clustered, file-backed R1, matching DEV-711's
  current substrate envelope. It does not test replicated KV, mirrors, sources,
  gateways, leaf nodes, or clustered direct-read behavior.
- It uses administrator authority intentionally. It does not test the proposed
  application credential set or DEV-716, which is not live on this branch.
- It does not cover snapshot/restore, backup import, manual `FirstSeq`
  configuration, account replacement, server-store rollback, sequence overflow,
  disk corruption, power loss, or deletion racing an in-flight publish. Those
  are additional ways an incarnation/epoch claim could need definition; none is
  needed for the minimized counterexample.
- The TypeScript binding was source-traced at exactly 3.4.0 but not separately
  executed. Both official clients emit the same server CAS header and consume
  the same stream-sequence acknowledgement; the Go real-server probe tests the
  owning server predicate.
- Safety only. No lease timing, retry fairness, availability, or eventual
  progress claim was investigated.
