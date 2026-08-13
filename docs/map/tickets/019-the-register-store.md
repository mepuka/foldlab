---
id: 019
title: The register store — decisions graduate to a foldlab-owned substrate
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Operator-ratified direction (2026-08-13): the effector's register
graduates from JetStream KV to a foldlab-owned micro-store
implementing EXACTLY the four-property contract the proofs stand on —
atomic create-if-absent, revision CAS, linearizable read, immutable
Done — as an append-only single file with fsync-per-commit
(affordable because decisions are rare; dissolves the sync-mode
residual for the safety kernel). The Done-erasure class dies
structurally: no Delete exists because none is written. JetStream KV
remains the NON-AUTHORITATIVE live plane (Watch/chatter — WL4 already
licenses this); journals remain on JetStream behind the envelope,
the monotone theorem licensing the asymmetry (evidence tolerates a
weaker substrate because its worst failure is detectable absence).
Rejected and recorded: forking nats-server (pin-bump wars,
trusted-base bloat); config-gating alone (the scorecard proved config
cannot express sync/admin denial).

Grill before building:
- File format and identity: entries as canonical bytes with digests
  (the store's own content should be foldlab-lawful — verify-on-read
  applies to our own WAL); torn-write handling; the recovery fold.
- Crash atomicity of claim/steal/commit against the proven A6
  transition table — the model is the SPEC; the store is a new
  implementation under the existing lockstep harness (R4 from day
  one, negative controls included).
- The KV-mirror sync: how the authority store feeds the chatter
  plane; staleness semantics (recoverable-from, never correct).
- Concurrency scope: single-process daemon-internal store first
  (matches the ownership model — decisions single-home per daemon);
  multi-process access explicitly out of scope v1.
- Migration: effector.Open gains a backend choice; the envelope
  certifies which backend a deployment's claims were proven under;
  ticket 017's journaled-Done lands naturally here (the store CAN
  emit the outcome fact — decide whether it must).
- Ladder plan: the four properties become law tests against OUR store
  (task 16's suite re-pointed); model unchanged; lockstep replays the
  15,378-schedule corpus against the new backend; R5 candidate later
  (a store this small is Perennial/GoJournal territory).
