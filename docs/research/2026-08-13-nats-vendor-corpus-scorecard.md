# NATS vendor corpus scorecard — ticket 018's priors, graded

Provenance: Opus scout over the operator's local corpus (seven Synadia
RethinkCon 2026 workshop transcripts, 10h55m, ASR with audited edits;
doc 05 "Best Practices for Building Apps on JetStream" is the
load-bearing document). Scored against the PRE-REGISTERED ledger in
docs/map/tickets/018. Stated unread surface: 1,311 slide frames
(config-key-bearing; candidate for a targeted vision pass). Citations
are doc§timestamp; spoken numbers are ASR, not documentation.

## Scorecard (12 pre-registered items)

1. Journal erosion by retention — PARTIAL. journal.go's shape gate
   (badShapeReason, journal.go:255-289) already pins retention/
   discard/limits/deny-delete-purge — the ledger's benign-if held.
   Residue: per-message TTLs exist (05§01:44:21), unchecked; and the
   gate runs ONCE at Open while configs are now live-mutable
   (05§00:35:49) — open-time assertion, not standing invariant.
2. Acked-write durability — CONFIRMED; scariest item. Default: writes
   reach kernel buffers; OS syncs at leisure; failsafe explicit sync
   EVERY TWO MINUTES (05§01:21:01, verbatim). Kill-9 safe (exactly
   what G1 tested); pull-the-plug NOT safe. Single-server remedy:
   server config sync=always — never set by us. Our "acked = durable"
   has a power-loss window.
3. Request/reply at-most-once — CONFIRMED; drop taxonomy: permission
   refusal is loud (03§00:15:27); pending overflow disconnects
   (05§01:23:44); server IPQ overflow drops SILENTLY with only a log
   line (05§00:44:43) — and we run NoLog:true.
4. max_payload — UNANSWERED by corpus (term appears once, bare).
5. Duplicate window — PARTIAL, benign for us: window is time-based,
   connection-independent, PERSISTENT across restart (05§00:37:19).
   journal.go's load-bearing dedup is expected-seq CAS + digest
   re-read (journal.go:238-245); msg-id is belt-and-braces.
6. Admin surface beyond Delete/Purge — CONFIRMED, larger than gate:
   unchecked fields include RePublish, SubjectTransform, per-message
   TTL, AllowDirect/MirrorDirect, AllowAtomicPublish, AllowMsgCounter,
   Compression, Replicas, MaxMsgSize (05 passim; 04§01:21:30).
7. KV history/stream behavior — CONFIRMED: KV = opinionated stream
   view; watcher = ordered consumer; delete = rollup (05§01:44:21).
   Effector gate's History>=1 is a FLOOR not a pin; history-1 discards
   prior revision VALUES (numbers stay monotonic; CAS-by-revision
   safe; read-back of cited historical values is not).
8. Publish buffering/reconnect — PARTIAL: vendor prescribes exactly
   our msg-id + republish-on-doubt pattern (05§00:37:19); client-lib
   reconnect internals unanswered. proto/ts pins
   @nats-io/transport-node 3.4.0.
9. Pending limits — CONFIRMED but mode inverted: dominant failure is
   loud disconnect at the 64MB/connection budget (05§01:23:44);
   prescribed: fetch with bytes-limit API. Silent modes are
   server-side (IPQ; per-stream queues, 05§01:31:37 — and the vendor
   says make buffers SMALLER to fail faster).
10. Consumer lifecycle — REFUTED as feared: protod's read path uses
    NO consumers (GetMsg walk, journal.go:172-201); ordering is
    stream-sequence + chain check. Inverted into perf finding: the
    per-message GetMsg loop is the vendor-named antipattern
    (05§01:33:04); get-batch (cap 1000, resumable) is prescribed.
    Our ONE consumer: Effector.Watch (ordered consumer, 64MB budget
    applies).
11. Assumption census — corpus supplies entries (sync mode, dedup
    persistence, queue limits, GOMEMLIMIT, config-include precedence
    01§01:26:32); the census itself is our deliverable.
12. DontListen parity — UNANSWERED; corrected premise: protod runs
    BOTH transports simultaneously (in-process daemon conn + loopback
    listener, protod.go:80-95).

## Novel hazards (ranked; the unknown-unknowns measure)

1. persist-mode-async (05§01:11:17): recent creation-time-only
   single-replica flag that stops buffer flushing; passes BOTH shape
   gates today; invisible to verify-on-read. Deny it.
2. sync=always is the only single-server power-loss remedy and lives
   in SERVER config — outside the current envelope gate's reach.
3. Shape gates never re-check after Open; configs are now mutable.
4. Effector's hot path is the vendor's worst-case demo: random
   deletes at history-1 (27k/s → ~1-2k/s, 05§01:09:14).
5. KV memory-residency cliff: perf "as long as it fits in memory"
   (05§01:17:19); our gate REQUIRES MaxBytes unbounded; nothing ages
   out (connects to the Forget(fence) theorem candidate — now an
   operational need, not just theory).
6. GOMEMLIMIT explicit-set is vendor best practice; we inherit host.
7. Subject impersonation: anyone can answer on any subject
   (03§00:35:16; 07§01:16:32 live demo of memory overwrite) — wrong
   answers that look authoritative, worse than absence.
8. No auth out of the box; protod's loopback listener is open — any
   local process reaches $JS.API.>, our request subjects, reply
   impersonation (01§00:21:16).
9. NoLog:true suppresses the only IPQ-drop signal (05§00:44:43).
10. journal.Read is the walk antipattern with a scaling wall.
11. Subject-cardinality memory index: journals safe (singleton pin);
    KV key-space IS subject-space (05§01:40:18; 06§00:52:55).
12. Stream internal queues drop under burst (mostly mitigated by our
    sync acks).
13. Config-include precedence can silently relocate the store to temp
    (01§01:26:32) — ours when file-config ever arrives.
14. Version bumps are semantics changes (2.14/2.15 examples) —
    pins-are-law vindicated by vendor evidence.
15. Opportunity class: server-side atomic batch CAS publish and
    counters (05§00:17:33, §00:24:34) overlap effector hand-rolls;
    adopting them moves the safety argument into vendor code — a
    trust-migration decision, not a free win.

## Determination targets (coordinator)

Envelope/gate widening (post task-16): deny persist-mode-async; pin
sync mode explicitly (operator decision: default-with-stated-residual
vs always); add unchecked stream fields; History==1 exact pin;
standing shape re-check (config-change advisories or cadence); auth
on the listener; NoLog off with drop-signal surfacing; GOMEMLIMIT +
monitoring + named connections. Read-path: get-batch migration walled
by digest equality. VERIFICATION residuals: power-loss window, IPQ
silence, impersonation-until-auth. Stated gap: the 1,311 slide frames
remain unread.
