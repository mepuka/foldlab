# FINDING-WATCH-EVICTION-001 — `History:1` can erase a transition owed by WL1/WL2

Status: **OPEN — disposition not ratified.** GitHub issue #15's first timeout
proposal was explicitly retracted by the owner. The latest comment names three
semantic choices and selects none. No production code or standing Watch law is
changed here.

## Minimized result

An `Effector.Watch` ordered consumer is created before either write, then paused
through the pinned JetStream consumer-pause API for 250 ms. While it is paused,
one public `Claim` and its public `Commit` write revisions 1 and 2 to the same
work key. This replaces the original scheduler/load stall with a deterministic
stall at the same public seam.

With the production bucket shape (`History:1`), JetStream's independent stream
state reports exactly one retained message, `first=2 last=2`. When the already-
established watch resumes it emits only `[committed]`; the `held` transition is
gone. With one and only one bucket field changed to `History:2`, stream state is
`msgs=2 first=1 last=2` and the same watch emits `[held committed]`.

This rules out watcher establishment, a ten-second test deadline, and strict
decode as causes. The retained stream coordinates are the mechanism oracle;
the one-field deeper-history run is the causal negative control.

## Reproduce the red evidence

PowerShell, from `go/`:

```powershell
$env:FOLDLAB_WATCH_EVICTION_FINDING = "1"
go test ./effector -run '^TestFindingWL1RequiresBothClaimAndCommit$' -count=3
Remove-Item Env:FOLDLAB_WATCH_EVICTION_FINDING
```

The three deterministic failures are:

```text
WL1 lost a transition with an established watcher: got [committed], want [held committed]
```

The normal gate skips that deliberately red law assertion. It instead runs
`TestFindingHistoryOneEvictsAnEstablishedWatchTransition`, which pins both the
observed loss and the `History:2` control. Thus the finding remains executable
without turning every unrelated branch red.

## The unresolved contract choice

1. Deepen the register bucket and retain WL1/WL2 as lossless laws.
2. Ratify `Watch` as best-effort chatter and restate WL1/WL2 so they promise
   faithful revision order only for transitions actually delivered; recovery
   remains `Lookup`.
3. Give `Watch` a separate, explicit retention/durability contract and build
   the storage and gap semantics that contract requires.

**Recommendation: option 2.** It matches `watch.go` and `go/CONTEXT.md`, which
already say Watch is chatter and `Lookup` is authority. Merely increasing
`History` cannot make the current universal reading true: NATS caps KV history
at 64, so a sufficiently long stall or same-key transition chain can still
evict an owed value. If a real consumer needs every transition, choose option 3
as a separately designed durable feed rather than disguising a finite buffer as
a losslessness theorem.

Until that choice is ratified, changing the production history, weakening the
law comments/tests, or adding a new Watch protocol would all silently decide a
load-bearing semantic question.
