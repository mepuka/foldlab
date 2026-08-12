# JetStream concurrency guarantees: what the server source actually promises

Every load-bearing claim below was verified against primary source at the
pinned versions from `go/go.sum`:

- `nats-io/nats-server` tag **v2.14.4**, commit `bbd6dc5e903f3505a1d9a7a21c50e0131901afd7`
- `nats-io/nats.go` tag **v1.53.1**, commit `db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac`
- `nats-io/nats-architecture-and-design` main, commit `e23afc3f1b0df57a79a81105a4dccc5363b8d655`

Citations are `file:line` within those trees. Docs (ADRs) are cited as
*intent*; server/client code is cited as *fact*. Anything not confirmed in
a primary artifact is marked **UNVERIFIED**. Client code under audit:
`go/journal/journal.go` and `go/effector/effector.go`.

## Verdicts

| Client assumption | Verdict |
|---|---|
| **Journal position-CAS** — `WithExpectLastSequencePerSubject(seq)` gives exactly one winner per position, atomic with the append | **VERIFIED** (standalone: check+append in one `mset.mu` critical section; clustered: leader-side check under `clMu` + inflight-subject blocking + leadership gated on apply catch-up; a publish that raced a leader change gets an error, never a silent second success) |
| **Dedup assist** — `Nats-Msg-Id` within `Duplicates` absorbs same-entry retries; CAS remains the authority | **VERIFIED-WITH-CAVEAT** (dedup map is in-memory, rebuilt from stream contents on restart — but only within the window, and in *standalone* mode the CAS check fires *before* the dedup check, so a retry surfaces as wrong-last-sequence, not `Duplicate`; the journal's digest-compare fallback is load-bearing, not belt-and-braces) |
| **Effector create-only claim** — `kv.Create` is an atomic "I am first" | **VERIFIED** (Create = publish with `Nats-Expected-Last-Subject-Sequence: 0`; `ErrKeyExists` mapped from wrong-last-sequence 10071/10164) |
| **Revision-CAS steal/commit** — `kv.Update(key, value, rev)` validates and writes at one linearization point | **VERIFIED** (Update = publish with expected-last-subject-sequence = rev; same server mechanism as the journal CAS; `ErrKeyRevisionMismatch` mapped from 10071/10164) |
| **Watch-as-chatter** — KV Watch is an ordered-consumer live plane that may be classified as droppable chatter | **VERIFIED-WITH-CAVEAT** (ordered consumer silently recreates itself on gap or heartbeat loss and resumes from last-delivered stream seq + 1 — no silent misses, no duplicates *in this client*; but ADR-8 explicitly reserves "the same Entry might be delivered more than once", so treating it as chatter with `Get` as recovery authority is the correct posture) |
| **Get-then-Update liveness** — reads may be stale but CAS still protects safety | **VERIFIED** (KV `Get` is a DIRECT GET served by any replica; ADR-8 disclaims read-after-write consistency; the server-side CAS check runs at the leader against applied state, so a stale read costs a retry, never a lost decision) |

## 1. Expected-last-sequence-per-subject: where the check lives

There are two enforcement paths in v2.14.4, split by
`canConsistencyCheck := !isClustered || traceOnly`
(server/stream.go:6247, comment at 6352-6356: "Certain checks have
already been performed if in clustered mode, so only check if not").

**Standalone / R1** — the check is inside
`processJetStreamMsgWithBatch` (server/stream.go:6190), which takes
`mset.mu` for the whole store operation (stream.go:6205-6208, "Hold lock
while storing the message"). The check itself (stream.go:6441-6466):
`store.LoadLastMsg(seqSubj, &smv)` → `fseq`; `ErrStoreMsgNotFound` with
expected `0` is success; `err != nil || fseq != seq` returns
`NewJSStreamWrongLastSequenceError(fseq)`. The append happens later in
the same function under the same lock. **Check and append share one
critical section.**

**Clustered (R>1)** — the check runs at the *leader, before the raft
proposal*, in `checkMsgHeadersPreClusteredProposal`
(server/jetstream_batching.go:541, header comment: "mset.clMu lock must
be held"), called from `processClusteredInboundMsg`
(server/jetstream_cluster.go:10314) with `clMu` held across check +
`commitSingleMsg` → `node.Propose` (jetstream_cluster.go:10303-10334).
The apply path stores verbatim — no re-check at apply. Atomicity across
the proposal gap is carried by three mechanisms:

1. **Inflight-subject blocking.** While a checked publish is proposed
   but not yet applied, the subject is held in
   `mset.expectedPerSubjectInProcess`; a second expected-seq publish on
   the same subject is refused outright
   (jetstream_batching.go:772-789), and a plain publish inflight on the
   subject also blocks an expected-seq publish (786-789). The
   clseq→subject bookkeeping is cleared at apply
   (jetstream_cluster.go:4616-4623). `mset.expectedPerSubjectSequence`
   is declared at server/stream.go:568 ("Inflight 'expected per
   subject' subjects per clseq").
2. **Term-pinned proposals.** The proposal carries the term snapshot
   taken at entry (jetstream_cluster.go:10208); `raft.Propose` rejects
   it if `state != Leader || term != n.term` (server/raft.go:914-919).
   A proposal cannot straddle a leader change.
3. **Leadership gated on apply catch-up.** `switchToLeader` sets an
   apply floor `n.aflr = n.pindex` and deliberately does *not* signal
   leadership (server/raft.go:5449-5470, comment: "It's important to
   wait signaling we're leader if we're not up-to-date yet");
   `leaderState` flips true only when the upper layer has processed up
   to that floor (raft.go:1263-1276). `processClusteredInboundMsg`
   refuses publishes until `mset.isLeader()` (jetstream_cluster.go:10244),
   which reads `node.Leader()` → `leaderState`
   (stream.go:1240-1245, raft.go:1796-1801). The code spells the
   distinction out: `isLeaderNodeState` "returns whether the node
   thinks it is the leader, regardless of whether applies are
   up-to-date yet (unlike isLeader, which requires applies to be caught
   up)" (stream.go:1247-1250). So by the time a new leader runs
   `LoadLastMsg` for a CAS check, every entry committed under prior
   terms that it holds is applied to its store.

On every leader transition all inflight CAS state is wiped and `clseq`
reset (`processStreamLeaderChange`, jetstream_cluster.go:4713-4726), so
a new leader starts from applied truth only.

**Can two publishes with the same expected sequence both succeed across
a leader change?** Not through any path visible in this source: the old
leader's un-proposed check dies with its term (mechanism 2); its
proposed-but-uncommitted entry either commits (in which case the new
leader has applied it before accepting publishes, mechanism 3, and the
second publish fails the `fseq != seq` check) or is discarded by raft.
The residual caveat is the one the Jepsen work demonstrated (see §7):
these guarantees hold for raft's failure model (crashes, partitions,
pauses), not for storage-level corruption or unsynced-write loss.

**Error codes.** Two distinct constants
(server/jetstream_errors_generated.go:663-666, 895-896):
`JSStreamWrongLastSequenceErrF` = **10071**, "wrong last sequence:
{seq}" (carries the current subject seq — the standalone path and the
clustered store-checked path return this), and
`JSStreamWrongLastSequenceConstantErr` = **10164**, "wrong last
sequence" with no seq — returned when the refusal comes from inflight
blocking (jetstream_batching.go:774, 781, 788) where the server cannot
yet know the final seq. nats.go v1.53.1 knows both:
`JSErrCodeStreamWrongLastSequence`/`JSErrCodeStreamWrongLastSequenceConstant`
(jetstream/errors.go:58, 64), and journal.go's `isWrongLastSequence`
checks both — correct against this server.

## 2. Nats-Msg-Id deduplication

**Mechanism.** A per-stream in-memory map `mset.ddmap` guarded by
`ddMu`, entries `{id, seq, ts}` (`storeMsgIdLocked`,
server/stream.go:5364-5378), purged by a timer walking entries older
than the `Duplicates` window (`purgeMsgIds`, stream.go:5309-5353).
Default window is 2 minutes (`StreamDefaultDuplicatesWindow`,
stream.go:1640).

**Check sites.** Clustered: pre-proposal in
`checkMsgHeadersPreClusteredProposal` (jetstream_batching.go:611-633) —
a hit with a known seq returns the duplicate ack `{seq, "duplicate":
true}` (jetstream_cluster.go:10316-10322); a hit on an entry still
inflight (seq 0) returns a conflict error instead
(jetstream_batching.go:624). Standalone: in `processJetStreamMsgWithBatch`
(stream.go:6673-6693), same duplicate ack shape (6686-6688).

**Ordering asymmetry worth knowing.** In the *clustered* path the
msgId check (line 611) runs before the expected-seq check (line 763):
a retried journal append gets the benign duplicate ack. In the
*standalone* path the expected-seq check (6441) runs *before* dedup
(6673): the same retry fails with 10071 first, and never reaches the
dedup map. journal.go survives both because its wrong-last-sequence
fallback re-reads position seq+1 and compares digests
(journal.go:238-246) — that fallback is the actual retry guarantee, and
`ack.Duplicate` (nats.go jetstream/publish.go:144-146, parsed from the
`"duplicate"` JSON field) is only the fast path.

**Survival.** The map is not persisted as such, but it is *rebuilt from
stream contents* on stream recovery: `rebuildDedupe`
(stream.go:1436-1467) scans from `GetSeqFromTime(now - Duplicates)` to
the last seq and re-inserts every `Nats-Msg-Id` header; called during
stream setup (stream.go:1021-1024). Failover: every replica maintains
its own map at apply time (stream.go:7085-7103 — "R1 or not leader"
branch stores on followers) and during catchup
(jetstream_cluster.go:10913-10919), so a new leader already has the
applied-window state. Only *inflight* entries (seq still 0) are dropped
on leader change (jetstream_cluster.go:4691-4711). Net: dedup survives
restart and failover **within the window, for messages that made it
into the stream** — retries of a publish that was never stored get no
dedup help, which is exactly why CAS must stay the authority.

## 3. KV semantics as a stream mapping (nats.go v1.53.1)

All in `jetstream/kv.go` unless noted.

- **Bucket = stream** `KV_<bucket>`, subjects `$KV.<bucket>.>`, with
  `MaxMsgsPerSubject: history`, `Discard: DiscardNew`, `AllowRollup:
  true`, `DenyDelete: true`, `AllowDirect: true` (unconditionally),
  `Duplicates` capped at 2 minutes (kv.go:672-694). Note: history is
  **not** `DiscardOld` at stream level — the stream discard policy is
  `DiscardNew` (kv.go:690, matching ADR-8 "Discard Policy is always set
  to `new`", adr/ADR-8.md:255); per-key history trimming is done by the
  store's per-subject limit enforcement
  (server/filestore.go:5618 `enforceMsgPerSubjectLimit`).
- **Create(key, v)** = `updateRevision(key, v, 0, ttl)` (kv.go:1072) =
  publish with `WithExpectLastSequencePerSubject(0)` (kv.go:1140),
  which sets header `Nats-Expected-Last-Subject-Sequence: 0`
  (jetstream/publish.go:215-216; header constant
  jetstream/message.go:192). Deleted-key path: on `ErrKeyDeleted`,
  retry with the tombstone's revision (kv.go:1077-1079).
- **Update(key, v, rev)** = publish with
  `WithExpectLastSequencePerSubject(rev)` (kv.go:1117-1151).
- **Revision = stream sequence.** `kve.revision = m.Sequence` on reads
  (kv.go:958), `pa.Sequence` on writes (kv.go:1150), and the watch path
  parses it from the ack-reply stream-seq token (kv.go:1314).
- **Error mapping.** `isWrongLastSeqErr` accepts 10071 *and* 10164
  (kv.go:1097-1104). Create maps it to `ErrKeyExists`
  (kv.go:1081-1090; `ErrKeyExists` itself embeds APIError 10071,
  jetstream/errors.go:393). Update wraps it as
  `ErrKeyRevisionMismatch` via `mapRevisionMismatch` (kv.go:1106-1120).
  effector.go's reliance on `ErrKeyExists` / `ErrKeyRevisionMismatch`
  (effector.go:133, 178, 222) is exactly this mapping.

ADR-8 documents the header contract as intent: "we use the new
`Nats-Expected-Last-Subject-Sequence` header. The special value `0` ...
indicate[s] that the message should only be accepted if it's the first
message on the subject" (adr/ADR-8.md:313-315).

## 4. KV Watch ordering

`WatchFiltered` subscribes through the *legacy* push API with
`nats.OrderedConsumer()` bound to the bucket stream (kv.go:1334,
1355-1360), `DeliverLastPerSubject` unless history is requested
(1335-1337). Verified properties:

- **Ordering is stream-sequence order across all watched keys** — a
  single flow-controlled ordered consumer over the bucket; per-key
  order is a projection of that. Entries carry the stream seq as
  revision (kv.go:1314).
- **Gap handling is silent recreate, not silent loss.** The ordered
  consumer tracks consumer/stream seqs; on a consumer-seq gap it
  resets from `jsi.sseq + 1` (nats.go js.go:2164-2185), on missed
  heartbeats likewise (js.go:2388), rebuilding the ephemeral consumer
  with `DeliverByStartSequencePolicy`/`OptStartSeq`
  (js.go:2210-2285). Resumption is from last-*delivered*, so nothing is
  skipped and nothing is redelivered in this client. ADR-17 states the
  intent: recreate "from last known stream sequence" (adr/ADR-17.md:23).
- **Duplicates are reserved by spec.** ADR-8's Watch contract says "the
  same Entry might be delivered more than once" (adr/ADR-8.md:143-144)
  — clients must be idempotent even though this Go path doesn't
  currently produce dupes.
- **The nil marker** on `Updates()` means "end of initial values": sent
  when received count reaches the pending count captured at consumer
  creation, or immediately if there were none (kv.go:1322-1330,
  1372-1381).

One subtlety: after a mid-initial-load reset, redelivery is by start
sequence, not last-per-subject — harmless at `History: 1` (the
effector's shape), worth rechecking if history ever grows.

## 5. Linearizability caveats under clustering

- **Reads are not linearizable by design.** Buckets are always
  `AllowDirect: true` (kv.go:687) and `kv.Get` →
  `stream.GetLastMsgForSubject` → `$JS.API.DIRECT.GET.<stream>.<subj>`
  whenever `AllowDirect` is set (jetstream/stream.go:560-592). Direct
  gets are served by any replica. ADR-8 is blunt: "We do not provide
  read-after-write consistency. Reads are performed directly to any
  replica, including out of date ones" (adr/ADR-8.md:227-229).
- **Consequence for the effector's Get-then-Update(rev):** safety is
  untouched — the CAS is adjudicated at the leader against applied
  state (§1), so a stale `Get` produces a stale revision that loses
  with `ErrKeyRevisionMismatch`. What degrades is liveness: a claimant
  reading a stale replica can spin on refusals until the replica
  catches up. Same for `Lookup` returning a stale claim/outcome — the
  `Do` flow re-converges because every decision point is a CAS or a
  re-read (effector.go:279-321).
- **Known upstream misbehavior in the family:** nats-server issue
  [#5162](https://github.com/nats-io/nats-server/issues/5162) — KV
  Create racing Delete on a tombstoned key returns wrong-last-sequence
  spuriously (the Create fallback reads the tombstone revision, a
  concurrent delete moves it). The effector never deletes keys, so this
  race is out of its state space. **UNVERIFIED beyond the issue text**:
  I did not reproduce or trace the fix in v2.14.4 source.
- The Jepsen findings (§7) bound all of the above: under storage
  corruption or unsynced-write loss, raft state itself can split-brain,
  and no header check survives that.

## 6. Antithesis instrumentation

Confirmed: nats-server v2.14.4 depends on
`github.com/antithesishq/antithesis-sdk-go v0.7.2-default-no-op`
(go.mod:8) and imports its `assert` package in the five load-bearing
files: raft.go:33, jetstream_cluster.go:37, filestore.go:44,
memstore.go:25, stream.go:36. The call sites are safety-property
assertions for deterministic-simulation runs, e.g. "WAL truncate lost
commits" (raft.go:3997), "Truncate to earlier entry would lose commits"
(raft.go:4366), "Raft response term mismatch" (raft.go:3723), "Reset
clustered state" (jetstream_cluster.go:3899), and filestore/memstore
read/write/flush/sync error unreachables (filestore.go:5168-8420,
memstore.go:2429). The `-default-no-op` module version means these
compile to no-ops outside an Antithesis environment; inside one they
become checked invariants. This is instrumentation for Synadia's own
simulation testing, not a proof artifact.

## 7. Published third-party testing

- **Jepsen: NATS 2.12.1** (Kyle Kingsbury, 2025-12-08,
  https://jepsen.io/analyses/nats-2.12.1) — primary artifact, read.
  Tested at-least-once delivery on R=5 streams (partly *inside
  Antithesis*). Explicitly did **not** check the linearizable-writes
  claim or exactly-once/CAS semantics. Findings: acknowledged-write
  loss and persistent split-brain from minority file corruption
  (#7549, #7556, unresolved at publication); ~2-minute lazy fsync
  loses acknowledged writes on coordinated power failure (#7564, now
  documented behavior); single OS crash + network delay/process pause
  causes committed-write loss and split-brain surviving restart
  (#7567, unresolved); crash-deletes-stream in 2.10.22 (#6888, fixed
  2.10.23). No clean-fault (partition/pause/crash-without-power-loss)
  write loss observed in 2.12.1. Whether the corruption/fsync issues
  are addressed in v2.14.4 is **UNVERIFIED** — not traced in source.
- **Antithesis "Finding bugs in Raft implementations" (2026)** — read;
  covers HashiCorp Raft, Aeron, OpenRaft, MicroRaft. NATS is not among
  the subjects. Cited only to scope: it is *not* evidence about NATS.
- **Formal verification (TLA+) of JetStream's raft or KV: none found.**
  Searched for "NATS JetStream TLA+", "formal verification NATS raft";
  results surface only the generic ongardie/raft.tla spec and NATS
  discussions (#4577 asserts linearizable writes as documentation
  prose, not proof). **UNVERIFIED that any formal model of NATS's
  bespoke raft exists**; NATS's raft is a from-scratch implementation
  (server/raft.go), not a port of a verified one.

## Deployment assumptions this imposes

1. **R>=3 file-backed replicas for both journal streams and effector
   buckets.** Every §1 guarantee routes through raft; R1 has no
   failover story, and the Jepsen fsync finding means an R1 file store
   can silently lose acknowledged appends on power loss. Replication is
   the durability mechanism NATS itself now documents as the guarantee.
2. **Treat direct-get reads as stale-capable everywhere.** The KV path
   is always `AllowDirect: true` and the client always uses it. Any
   read-then-CAS flow must tolerate refusal loops (ours do); nothing
   may treat a `Get` as proof of current state. If read staleness ever
   becomes a liveness problem, the escape hatch is reading via
   `GetMsg`/non-direct APIs against the leader, not weakening the CAS.
3. **Dedup window >= retry horizon, and never rely on it across
   unstored publishes.** The 2-minute floor in `badShapeReason`
   (journal.go:274) matches the server default; any client retry policy
   (backoff totals, reconnect windows) must complete inside the
   configured `Duplicates`, because rebuild-on-restart only covers
   messages that were stored. The journal's digest-compare fallback
   must stay — in standalone/R1 topologies it is the *only* thing that
   converts a retry into `Duplicate`.
4. **Watchers are chatter; `Get` is recovery.** The ordered consumer
   self-heals from gaps, but ADR-8 reserves redelivery and the recreate
   is invisible to the application. Correct classification: a watcher
   that seems wrong is resolved by re-reading the register, never by
   trusting the watch stream.
5. **The corruption failure mode is outside the protocol.** Jepsen's
   unresolved findings (#7549/#7556/#7567) mean disk corruption or
   unsynced-write loss on even a minority of nodes can split-brain the
   raft layer. Mitigations are operational: `sync: always` where the
   write-loss window matters, disk integrity monitoring, and the
   journal's verify-on-read (`ErrTampered`) as the last tripwire — it
   is the only layer here that detects a corrupted history rather than
   assuming raft prevented one.
