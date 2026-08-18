# Addendum to the JetStream guarantees dossier — Jepsen remediation status at v2.14.4

**Status:** research feeding Multica ticket **DEV-782**. Resolves the
`UNVERIFIED` marker in
[`docs/research/2026-08-12-jetstream-guarantees-source-verified.md`](../../../../../Users/pooks/Dev/foldlab/docs/research/2026-08-12-jetstream-guarantees-source-verified.md)
§7 — *"Whether the corruption/fsync issues are addressed in v2.14.4 is
**UNVERIFIED** — not traced in source."* Verified against primary
artifacts on **2026-08-18**.

**Verification basis.** All issue states, labels, comment bodies, PR
merge commits and release notes below were read through the GitHub API
against `nats-io/nats-server`, not through search summaries. Source
quotes are from the tree at tag `v2.14.4`.

Pinned version confirmed: tag `v2.14.4` is an annotated tag created
`2026-07-30T12:34:44Z`, dereferencing to commit
`bbd6dc5e903f3505a1d9a7a21c50e0131901afd7` — byte-identical to the
commit recorded in the dossier header
(`gh api repos/nats-io/nats-server/git/tags/e31be768b9d65be3abef301f7dd4ee61188c2681`).

A distinction used throughout: **fixed in source** (a merged commit
that is an ancestor of `v2.14.4`) versus **documented as expected
behavior** (prose added, code unchanged). They are not interchangeable
and are not merged in the verdicts below.

---

## Per-finding verdicts

### 1. #7549 — single-bit errors in `.blk` files → partial loss of acknowledged writes

**Verdict: OPEN. NOT FIXED IN v2.14.4. No mitigation traced to any
merged artifact.**

https://github.com/nats-io/nats-server/issues/7549 — state `OPEN`,
opened `2025-11-13`, labels `defect`, `stale`, no milestone, no
`closedAt`, four comments, and — checked directly — **an empty issue
timeline**: no `cross-referenced`, `referenced`, `connected` or
`closed` events. Nothing in the repository has ever linked a pull
request or commit to this issue.

The maintainer response is the load-bearing artifact. Neil Twigg
(`@neilalexander`, MEMBER), 2025-11-17
([comment](https://github.com/nats-io/nats-server/issues/7549#issuecomment-3541906577)),
describing current behavior — not a plan, and not superseded by any
later comment:

> "If on recovery a message checksum is found to be faulty, I believe
> the current behaviour is to truncate the remainder of that block back
> to the faulty sequence."

> "Since following blocks could be fine, this would indeed create a gap
> of lost data in the middle of the stream (and should report in the
> stream info's num deleted count). **We don't currently have an active
> method of detecting this mid-stream and reconciling from peers**,
> although I think there are certain specific cases (i.e. where we
> truncate the postfix of the _last message block_ in particular) where
> catchup from a peer would do the right thing by default"

> "As an aside, at present it is not common for JetStream to refuse to
> start in these scenarios."

The reporter subsequently escalated the finding from *loss* to
*split-brain*, 2025-11-20
([comment](https://github.com/nats-io/nats-server/issues/7549#issuecomment-3559107374)):

> "Errors in the .blk files on a minority of nodes can also cause
> split-brain: acknowledged records can go missing on a majority of
> nodes, but be present on some."

with readers on `n2` observing every acknowledged record while readers
on `n5` saw 1,167,167 of 1,479,661 acknowledged records as lost. No
maintainer has replied to that escalation.

Negative search, recorded so the absence is auditable: merged PRs in
the repository with `corrupt` or `checksum` in the title were
enumerated for the whole project history. The most recent relevant
merges are `#7305` "Improve filestore corrupt message errors"
(2025-09-12, *predates* the Jepsen report), `#8312` "[FIXED] Filestore
compact corrupts compressed/encrypted blocks" (2026-06-15, a
compaction bug, not a recovery path), and `#8311` (counter staging).
None of them introduce peer reconciliation of a mid-stream checksum
gap. The v2.14.4 note closest in subject matter — *"Filestore blocks
with unsynced or truncated key files are now removed and counted as
lost data instead of failing to recover altogether (#8365)"* — governs
**encryption key files**, not per-message block checksums, and its
stated remedy is to *count data as lost*, which is orthogonal to
recovering it from a healthy replica.

**UNVERIFIED:** whether any unreleased or unlabelled work on this
exists. The claim made here is bounded and negative: no primary
artifact reachable from the issue, the release notes, or a title search
of merged PRs connects a fix to #7549.

---

### 2. #7556 — corruption of `$SYS` snapshot files on a minority → permanent stream deletion

**Verdict: OPEN, but PARTIALLY FIXED IN SOURCE. Three fixes are
ancestors of `v2.14.4`. The maintainer states on the record that the
issue is deliberately kept open because the work is incomplete.**

https://github.com/nats-io/nats-server/issues/7556 — state `OPEN`,
opened `2025-11-16`, labels `defect`, `stale`.

Maintainer status, `@neilalexander` (MEMBER), **2026-05-22** — the most
recent word on this family from the project, and the single most
important sentence in this addendum
([comment](https://github.com/nats-io/nats-server/issues/7556#issuecomment-4517665933)):

> "There are some fixes in so that the server won't start if it detects
> a corrupted snapshot, but we are keeping the issue open for now as
> there is still more work to be done."

The fixes he refers to, traced to commits and confirmed present in the
pinned tree:

| PR | Title | Merge commit | Merged | Ancestor of `v2.14.4`? |
|---|---|---|---|---|
| [#7566](https://github.com/nats-io/nats-server/pull/7566) | NRG: Snapshot error handling | `69f8981d4cd76a2814da66d81f2353a0d855225f` | 2025-11-20 | **yes** |
| [#7580](https://github.com/nats-io/nats-server/pull/7580) | NRG: Don't reset WAL when failing to load last snapshot | `ed24187f90ed908de3133a242a018aecd40576f8` | 2025-11-24 | **yes** |
| [#7620](https://github.com/nats-io/nats-server/pull/7620) | NRG: WAL must align with snapshot | `7671adf4375ea145739207d8e39e97d83e856a45` | 2026-02-05 | **yes** |

Ancestry was checked mechanically, not inferred from dates:
`gh api repos/nats-io/nats-server/compare/<sha>...v2.14.4` returns
status `ahead` for `69f8981` and `ed24187`, i.e. `v2.14.4` is a
descendant of both.

PR #7566 body (Neil Twigg), stating what changed:

> "Previously we were papering over some quite serious snapshot issues
> by just deleting them from disk and then continuing to recover
> regardless. Now we will surface the problems much more aggressively,
> up to even refusing to start. This is especially important with the
> metalayer where the secondary effects can be dangerous if we can't
> recover correctly."

PR #7620 body (Maurice van Veen), on the failure mode it closes:

> "We previously were not checking that these align, this would allow
> for the snapshot to be non-existent but the WAL to be way ahead or
> there to be a gap (somehow) between the snapshot and WAL itself. Both
> could lead to data loss."

The corresponding release-note line, v2.14.0 → *Fixed → JetStream*:

> "Raft nodes will no longer start if the snapshot is missing or
> corrupt, or if the snapshot doesn't align with the remaining log on
> disk, avoiding potential data loss (#7566, #7580, #7620)"

Read the remedy precisely: the new behavior is **fail-stop on the
affected node**, not repair. It converts "silently delete the stream
and take down the cluster" into "this node refuses to start". That is a
strict improvement in safety and a strict regression in availability,
and it is the shape the estate must plan around.

Not backported to the 2.12 line: `compare/69f8981...v2.12.15` returns
`diverged`, and likewise for `ed24187`. Anything still on 2.12.x does
not have these.

---

### 3. #7564 — ~2-minute lazy fsync loses acknowledged writes

**Verdict: OPEN. DOCUMENTED AS EXPECTED BEHAVIOR — not fixed. NO
DEFAULT CHANGED in v2.14.4. `sync_interval: always` remains the only
single-server remedy, and it is a server-wide setting.**

https://github.com/nats-io/nats-server/issues/7564 — state `OPEN`,
opened `2025-11-19`, label `defect` only (notably **not** `stale`).

The design position, Derek Collison (MEMBER), 2025-11-19
([comment](https://github.com/nats-io/nats-server/issues/7564#issuecomment-3554391305)):

> "The way the system handles fsync is by design. Most of our production
> setups, and in fact Synadia Cloud as well is that each replica is in a
> separate AZ. These have separate power, networking etc. So the
> possibility of a loss here is extremely low in terms of due to power
> outages. We do not want to penalize production users looking for
> higher ingest. However the period between fsync is configurable and we
> do have a `sync_always` option for the configuration as well which
> some of our production customers utilize."

The reporter offered to close once documented; the project declined, and
explicitly left the default question open. Maurice van Veen (MEMBER),
2025-12-15
([comment](https://github.com/nats-io/nats-server/issues/7564#issuecomment-3655592144)):

> "Can keep it open for now. Not sure yet though if fsync will become
> the default, there are multiple angles to consider."

**What the documentation change said.** The change is
[nats-io/nats.docs#896](https://github.com/nats-io/nats-server/issues/7567#issuecomment-3582750513),
merged 2025-11-26, touching `nats-concepts/jetstream/README.md` and
`running-a-nats-service/configuration/README.md`, published at
https://docs.nats.io/nats-concepts/jetstream under **"Syncing data to
disk"**. Quoting the live text (fetched from the `nats.docs` default
branch, 2026-08-18) — the sentences that bind the estate:

> "while JetStream does flush file writes to the OS synchronously, under
> the default configuration it does not immediately `fsync` data to
> disk. The server uses a configurable `sync_interval` option, with a
> default value of 2 minutes"

> "In a non-replicated setup, an OS failure may result in data loss. A
> client might publish a message and receive an acknowledgment, but the
> data may not yet be safely stored to disk."

> "If a failed server lost data locally due to an OS failure, although
> extremely rare, there are some combinations of events where it may
> rejoin the cluster and form a new majority with nodes that have never
> received or persisted a given message. The cluster may then proceed
> with incomplete data causing acknowledged messages to be lost."

> "Additionally, setting `sync_interval: always` will make sure servers
> `fsync` after every message before it is acknowledged. This setting,
> combined with replication in different data centers or availability
> zones, provides the strongest durability guarantees but at the slowest
> performance."

The docs also name the operational mitigation for the split-brain
variant, which is the estate-actionable half:

> "A potential mitigation to a failure of this kind is not automatically
> bringing back a server process that was OS-failed until it is known
> that a majority of the remaining servers have received the new writes,
> or by peer-removing the crashed server and admitting it as a new and
> wiped peer"

**Did any default change? No.** Confirmed in the pinned tree, not
inferred:

- `server/filestore.go:332` — `defaultSyncInterval = 2 * time.Minute`
- `server/filestore.go:416-417` — `if fcfg.SyncInterval == 0 { fcfg.SyncInterval = defaultSyncInterval }`
- `server/opts.go:6159-6160` — `if opts.SyncInterval == 0 && !opts.syncSet { opts.SyncInterval = defaultSyncInterval }`

**Is `sync=always` still the remedy? Yes, with three caveats now
verifiable in source.** `server/opts.go:2681-2687` accepts both spellings
of the key and only the literal string `always`:

```go
case "sync", "sync_interval":
    if v, ok := mv.(string); ok && strings.ToLower(v) == "always" {
        opts.SyncInterval = defaultSyncInterval
        opts.SyncAlways = true
    } else {
        opts.SyncInterval = parseDuration(mk, tk, mv, errors, warnings)
    }
```

1. It is parsed in the server-level `jetstream` block and applied to
   every stream on the server (`server/stream.go:988`,
   `fsCfg.SyncAlways = s.getOpts().SyncAlways`). There is no per-stream
   opt-in; the docs' recommended way to scope it is a separate tagged
   cluster plus placement tags.
2. It takes effect by setting `O_SYNC` at open time, not by an explicit
   `fsync` call — `server/filestore.go:13946-13951`,
   `writeFileWithOptionalSync` → `writeAtomically(..., fs.syncAlways.Load())`,
   which ORs in `os.O_SYNC`.
3. **New in the 2.14 line and worth a guard rail:** a stream-level
   `persist_mode: async` silently overrides it. `server/stream.go:993-997`:

```go
// Async persist mode opts in to async flushing,
// sync always would also be disabled if it was configured.
if config.PersistMode == AsyncPersistMode {
    fsCfg.SyncAlways = false
    fsCfg.AsyncFlush = true
}
```

   The declared contract of that mode (`server/stream.go:190-196`) is
   explicit that it trades away the acknowledgement guarantee: *"The
   publish acknowledgement may be sent before the persisting completes.
   This means writes could be lost if they weren't flushed prior to a
   hard kill of the server."* It is rejected for replicated streams
   (`server/stream.go:1826-1832`: `"async persist mode is not supported
   on replicated streams"`), which means **it is reachable only in
   exactly the estate's current R=1 file-backed posture**.

---

### 4. #7567 — OS crash + delay/pause → committed-write loss and split-brain surviving restart

**Verdict: OPEN. NOT FIXED. Classified by the project as expected
behavior of the deferred-fsync design, answered with documentation and
an operational workaround.**

https://github.com/nats-io/nats-server/issues/7567 — state `OPEN`,
opened `2025-11-19`, labels `defect`, `stale`, no milestone, and a
timeline containing exactly one event: a cross-reference to #7564. No
linked PR, no closing commit.

The exchange establishes both the scope and the project's position.
Maurice van Veen (MEMBER), 2025-11-21
([comment](https://github.com/nats-io/nats-server/issues/7567#issuecomment-3563657545)):

> "Gotcha, yeah, this can be expected when the entire OS crashes instead
> of just a process crash/kill."

> "The `sync: always` server config setting can be used such that these
> writes are immediately synced to disk, that should prevent this from
> happening but at the cost of performance."

And, in the same comment, the operational mitigation that the estate's
runbook has to absorb:

> "For example, if the OS crashes and it stays dead until someone
> manually restarts it, then it should be safe still? … I _think_ if the
> OS is restarted automatically this could still be problematic though."

The scope correction matters and should not be softened in either
direction. The reporter confirmed, 2025-11-21
([comment](https://github.com/nats-io/nats-server/issues/7567#issuecomment-3563567151)),
that "process kill" in the original title meant node-level fault:

> "I'm speaking a bit loosely here — 'process' in the sense of the
> entire node. This is a simulated power fault/VM failure/OS crash/etc."

So the trigger is genuinely an OS-level fault, not a `SIGKILL` of
`nats-server` — narrower than the dossier's §7 phrasing implies. But it
is still *a single node's* OS fault, and it still produced, per the
reporter's follow-up
([comment](https://github.com/nats-io/nats-server/issues/7567#issuecomment-3560696192)),
"the loss of committed writes across every replica" in one run. The
dossier's §7 characterisation stands; the fault class should be
restated as node/OS-level.

Closed by no one; the last substantive maintainer position is that
`sync: always` is the fix and the probability is the open question.

---

### 5. Release-notes scan, v2.13.x and v2.14.x

**There is no v2.13.x.** Confirmed two ways: a tag listing of the
repository returns zero refs matching `v2.13*`, and every v2.14.x
release note carries the line *"Please note that the 2.13.x version was
skipped."* The 2.14 upgrade guide states: *"Note that version 2.13 was
skipped: 2.14 is the direct successor of 2.12."* The estate's
v2.14.4 pin is therefore two minor lines' worth of change past 2.12.1,
not three.

Durability, corruption-detection and raft-integrity entries across the
2.14 line, quoted from the release notes, that merit the estate's
attention:

**v2.14.0** (2026-04-30) — *Fixed → JetStream*
- "Raft nodes will no longer start if the snapshot is missing or corrupt, or if the snapshot doesn't align with the remaining log on disk, avoiding potential data loss (#7566, #7580, #7620)" — the #7556 partial fix.
- "Filestore operations now handle read and write errors from the filesystem more thoroughly (#7788)". The upgrade guide is blunter about the consequence: *"Previously, not all filestore I/O errors were appropriately handled, allowing the stream and server to continue to run. In 2.14, these errors are surfaced: an affected stream freezes, logs the error, and reports an unhealthy state in health checks."*
- "Filestore recovers from partial purge after hard kill (#7676)"
- *Changed*: "Invalid or divergent consumer state is reset to match the stream state on startup, i.e. after unclean shutdowns (#7692)"

**v2.14.1** (2026-05-20)
- "Raft nodes will now ignore temporary snapshots on recovery after a crash (#8101)"
- "Raft node append entry caches are now invalidated correctly on WAL truncation and snapshot installs (#8149)"
- "Caches are now cleared correctly when converting filestore encryption mode, avoiding block-level corruption (#8105, #8166)"
- "Raft nodes will no longer allow proposals to remove unknown peers (#8154)"

**v2.14.2** (2026-06-02)
- "Fixed a case where the filestore would not release a lock after handling a write error (#8232)"
- "Fixed a case where Raft peers were not correctly tracked after an inactivity stall during catchup (#8226)"
- "Fixed a drift that could occur in the peer sets after a peer remove of an online node (#8258)"

**v2.14.3** (2026-06-29)
- "Raft nodes no longer participate in voting or candidacy after write errors (#8290)" — directly relevant: a node whose disk is failing stops being electable.
- "Stream catchup is no longer skipped when limits are exceeded, preventing possible stream desync (#8265)"
- "Filestore compaction no longer corrupts compressed or encrypted blocks (#8312)"
- "Raft now reverts uncommitted membership changes correctly when truncating or snapshotting (#8332)"
- "Meta recovery snapshots no longer leave phantom streams or consumers behind (#8324)"

**v2.14.4** (2026-07-30) — the estate's pin
- "Filestore blocks with unsynced or truncated key files are now removed and counted as lost data instead of failing to recover altogether (#8365)" — note the direction: this *relaxes* a fail-stop into counted loss, for encryption key files.
- "Filestore encryption key files are now synced to disk more aggressively (#8366)"
- "Raft proposals now require the term to be passed down from JetStream, preventing situations where stale proposals from a previous term could make changes in a new term after a fast election (#8370)"
- "Raft elections now correctly ignore votes from removed peers (#8353)"
- "Replicated streams that were recreated while a node was down are no longer treated as an update by a returning node processing a snapshot, avoiding stale Raft groups from continuing to run (#8413)"
- *Improved*: "The disk concurrency semaphore can now be configured with the `max_concurrent_io` option in the `jetstream` config block (#8336)", raised to 4096 slots from a CPU-scaled count — relevant if the estate ever enables `sync_interval: always`, since that path is I/O-bound.

**Upgrade candidate, flagged not recommended here.** **v2.14.5**
(2026-08-12, six days before this addendum) carries one JetStream fix
squarely in the durability class: *"Fix a bug that could result in
potential data loss when handling idempotent stream creates when an
offline node catches up from a metalayer snapshot, caused by an
incorrect update to the create time in the stream assignment (#8449)"*.
It is R>1-shaped (metalayer catchup by a returning node) and so bears on
the future posture rather than today's. Whether to move the pin is a
DEV-782 decision, not a finding.

---

### 6. #5162 — KV `Create` racing `Delete` on a tombstoned key returns spurious wrong-last-sequence

**Verdict: OPEN. NOT FIXED in v2.14.4. Judged by maintainers to be
unfixable within the current protocol, and partly a client-side
concern. The dossier's existing `UNVERIFIED` marker on this item is now
resolved to a confirmed negative.**

https://github.com/nats-io/nats-server/issues/5162 — state `OPEN`,
opened `2024-03-02`, label `defect`, assignees `Jarema` and `piotrpio`,
no milestone, no `closedAt`, three comments, and a timeline with no
linked PR or closing commit in the two and a half years it has been
open.

Derek Collison (MEMBER), 2024-03-03
([comment](https://github.com/nats-io/nats-server/issues/5162#issuecomment-1975201378)):

> "I think this is more a client thing."

R.I. Pienaar (CONTRIBUTOR), 2024-08-28 — the last word on the thread
([comment](https://github.com/nats-io/nats-server/issues/5162#issuecomment-2314449642)):

> "I do not think we can improve this scenario at the moment given
> current API capabilities"

The reporter's own framing of the root cause, which is the part that
constrains the estate's client code:

> "The JetStream protocol does not appear to have a mechanism for an
> atomic KV Create which avoids the client library needing to check for
> a delete marker."

The dossier §"Deployment assumptions" item recording this race as
possibly out of the state space in v2.14.4 must be corrected: it is
**in** the state space. The race is a two-round-trip client pattern
(update at revision 0; on tombstone, retry at the delete marker's
revision) with no server-side atomic primitive underneath it, and
nothing in the 2.14 line adds one. Mitigation stays where the dossier
already put it — the client must tolerate a spurious
wrong-last-sequence from `Create` and retry, exactly as it tolerates a
genuine CAS refusal.

---

## Deployment assumptions delta

What this verification changes, and what it confirms, for the estate.

**Confirmed unchanged — the dossier's assumption 5 stands as written.**
"The corruption failure mode is outside the protocol." Both #7549 and
#7567 are open with no fix, and #7556 is open by the maintainer's
explicit decision. Disk corruption or unsynced-write loss on a minority
of nodes can still lose acknowledged writes and split-brain the raft
layer at v2.14.4. The journal's verify-on-read (`ErrTampered`) remains
the only layer in the estate's stack that detects a corrupted history
rather than assuming raft prevented one. Nothing in the 2.14 line
displaces it, and it must not be removed or made optional.

**Confirmed unchanged — assumption 1's fsync premise.** The 2-minute
`sync_interval` default survives into v2.14.4 verbatim in source. The
project has documented the behavior and declined to change the default,
with fsync-by-default still explicitly undecided as of 2025-12-15. Any
estate document that reads as though the Jepsen finding was "addressed"
should be corrected to "documented".

**Changed — R=1 file-backed acquires a new, specific footgun.** The
2.14 line introduces stream-level `persist_mode: async`, which is
*only* accepted on non-replicated file-backed streams and which sets
`SyncAlways = false` unconditionally, overriding a server-wide
`sync_interval: always`. Its own doc comment concedes acknowledgement
may precede persistence. Action for DEV-782: the estate should assert
`persist_mode` is absent or `default` on every stream it creates, and
treat its presence as a configuration defect. This did not exist at
2.12.1 and so is absent from the dossier entirely.

**Changed — R=1 gains a partial, availability-costing safety net.** The
#7556 fixes (#7566/#7580/#7620) are confirmed present in the pinned
tree, and they are not replication-specific: a node with a corrupt or
misaligned raft snapshot now refuses to start rather than deleting the
stream. Combined with the v2.14.0 filestore change — *"an affected
stream freezes, logs the error, and reports an unhealthy state in
health checks"* — the estate's single-node posture now fails loudly
where 2.12.1 failed silently. Two consequences: the estate's health
checks must actually be wired to `healthz`, because a frozen stream is
now the designed signal and a silently-wedged writer is the failure
mode if nothing reads it; and single-node restart is no longer
guaranteed to succeed after an unclean shutdown, so the runbook needs a
"node refuses to start on corrupt snapshot" branch. On R=1 there is no
peer to recover from — the branch terminates in restore-from-backup.

**Changed — the R=1 write-loss window is now precisely specifiable.**
For a single-replica file-backed stream, `AsyncFlush` is off by
construction (`server/stream.go:991`,
`fsCfg.AsyncFlush = !fsCfg.SyncAlways && config.Replicas > 1`), so
writes reach the OS synchronously; the exposure is exclusively the
un-`fsync`ed page cache, bounded by `sync_interval`, and realised only
by an OS-level fault (power loss, kernel crash, VM failure, hardware
fault) — *not* by a `SIGKILL` of `nats-server`. The remedy is
`sync_interval: always` in the server's `jetstream` block, server-wide,
and the estate should decide explicitly whether that trade is worth
making now rather than inheriting the default by silence.

**Changed for the future R>=3 posture — the operational mitigations are
now named by upstream and must be written into the runbook before, not
after, the migration.** The docs and #7567 converge on one rule that
contradicts ordinary autoscaling/restart reflexes: an OS-failed node
must **not** be automatically restarted back into the cluster. Upstream
prescribes either holding it out until a majority is known to have the
new writes, or peer-removing it and re-admitting it as a wiped peer.
Any orchestration the estate adopts — supervisor restart policies,
Kubernetes `restartPolicy`, cloud auto-recovery — must be configured
against that rule, because automatic OS-level restart is the precise
trigger for #7567's split-brain. This is a new operational constraint
that the dossier's assumption 1 does not currently carry.

**Confirmed — assumption 1's replication rationale is weakened, not
invalidated, and the reason should be recorded.** The docs' own worked
example puts stream-state divergence on a 3-replica multi-AZ deployment
behind a five-step fault alignment, and the reporter's counter — *"placing
nodes in separate AZs does not mean that NATS' strategy of not syncing
things to disk is safe"* ([#7564](https://github.com/nats-io/nats-server/issues/7564#issuecomment-3554904995))
— stands unrefuted, with #7567 as the demonstration. R>=3 remains the
right target because it is the only failover story, but it should not
be recorded as a durability guarantee against correlated OS-level
faults. Only `sync_interval: always` is that, and only per the
project's own claim.

**Corrected — assumption 3's KV race caveat.** The dossier speculates
that #5162's race may be out of the state space in v2.14.4. It is not.
The issue is open, unassigned to any release, and judged unfixable
under current API capabilities. The client's tolerance of a spurious
wrong-last-sequence from `Create` is load-bearing and must stay.

**Scope correction to §7 prose.** The dossier renders #7567 as "single
OS crash + network delay/process pause". That is right, but the
neighbouring #7564 entry and the general framing risk being read as
"process crash". Both findings require an *OS-level* fault, confirmed by
the reporter on the record. Tightening this wording removes the main
avenue for someone to over-read the estate's exposure — and, equally, for
someone to dismiss it, since disk failure and kernel crash are in scope
alongside power loss.

---

## Residual UNVERIFIED

- Whether unreleased or unlabelled work on #7549 exists. The negative
  finding here is bounded by what is reachable from the issue timeline,
  the 2.14.x release notes, and a title search of merged PRs.
- Whether the #7556 fixes actually prevent the Jepsen-observed
  stream-deletion scenario. Confirmed: the commits are in the pinned
  tree and their stated intent matches. **Not confirmed:** that the
  scenario no longer reproduces — no re-run against 2.14.x has been
  published by Jepsen or by the project, and the maintainer says work
  remains.
- Whether `sync_interval: always` is sufficient against #7549. The
  Jepsen report is explicit that the `.blk` corruption run *already used*
  `sync-interval always` — *"a Jetstream stream using sync-interval
  `always` which experiences single-bit errors in the `blk` files … can
  cause the loss of some or all acknowledged records"*
  ([#7549](https://github.com/nats-io/nats-server/issues/7549)). fsync
  policy is not a remedy for corruption; only integrity monitoring and
  the journal's own verify-on-read are.
