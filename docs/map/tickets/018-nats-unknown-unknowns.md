---
id: 018
title: NATS/JetStream unknown unknowns — the pre-registered anxiety ledger
type: wayfinder:research
status: closed
assignee:
blocked-by: []
---

## Method

Written BEFORE reading the vendor documentation set
(NATS_fundamentals, operator's local corpus), so the reading scores
our priors: each item below gets CONFIRMED (real hazard, vendor
practice exists), REFUTED (benign, mechanism cited), or joined by
NOVEL hazards the list missed — the misses being the actual measure
of our unknown-unknowns. Every item states what would make it benign.

## Register 1 — protocol and server

1. **Journal erosion by default retention.** JetStream streams carry
   retention/limits/discard policies; if any journal stream runs a
   default that ages out or discards old messages, append-only-forever
   is silently false and verify-on-read meets manufactured absence.
   Benign if: the journal shape gate already pins retention/discard
   (VERIFY what journal.go's gate actually pins), and the envelope
   refuses anything else. Same class as the Done-erasure finding, one
   level up — this is my top fear.
2. **Acked-write durability.** What does an ack MEAN at file storage —
   fsync per append, interval sync, OS cache? Kill-9 storms (G1)
   tested process death, not power/fs loss. An acked-then-lost append
   breaks the chain silently. Benign if: sync semantics are explicit
   and the envelope pins the sync mode our proofs assume.
3. **Core-NATS request/reply is at-most-once.** Our REQUEST verb and
   ingress-publish ride core NATS: no persistence, no redelivery; a
   daemon restart mid-request loses it. We treat no-reply as absence +
   retry — is that sound under every server-side drop mode (slow
   consumer discard, max payload violation, permission refusal:
   which of these even produce an error vs silence)?
4. **max_payload and large frames.** Default ~1MB; schema encodings
   and frames will someday exceed it. What exactly happens at the
   boundary (typed error? connection state?), and does the vendor
   prescribe chunking patterns compatible with identity-of-canonical-
   bytes (chunking must stay transport, never identity)?
5. **Duplicate-window semantics.** Msg-id dedup has a TTL (~2min
   default). Any de-dup assumption outliving the window is false.
   Which of our appends rely on msg-id vs expected-seq CAS, and is
   expected-seq the ONLY dedup we ever lean on?
6. **Stream/KV admin surface beyond Delete/Purge.** The Done finding
   generalizes: compaction, message-delete, stream-edit, republish,
   sources — enumerate every server operation that can rewrite or
   erase history, so the envelope can deny the lot.
7. **KV history depth and underlying-stream behavior.** KV is a view
   over a stream; history limits, TTLs, and revision semantics under
   the hood — do register buckets pin history so steal-chains (WL2)
   can never lose revisions they cite?

## Register 2 — client libraries

8. **Publish buffering and reconnect.** nats.go buffers writes;
   during reconnect, what is in flight, what is dropped, what is
   silently replayed? Our request/reply masks some of this — but the
   ingress publish path and the TS client's library (verify which one
   proto/ts pinned) each need their reconnect story stated.
9. **Subscription pending limits.** Client-side pending buffers DROP
   on overflow by default in some libraries. A dropped reply = our
   "absence" — is backpressure distinguishable from absence anywhere,
   and does the vendor prescribe limits/flow-control we ignore?
10. **Consumer lifecycle.** Ephemeral vs durable consumers in our
    read path; inactivity thresholds that silently delete durables;
    redelivery and ordering guarantees per consumer type — which does
    protod's read/fetch actually use, and is its ordering assumption
    (per-stream total order surfaced in order) contractual?

## Register 3 — application layer (ours)

11. **The unenumerated-assumption census.** Our proofs name four
    substrate assumptions; items 1–10 suggest the honest number is
    larger (ordering, ack semantics, sync mode, retention). Output: a
    complete enumerated list, each either envelope-pinned + law-tested
    (per task 16's pattern) or stated as residual in VERIFICATION.md.
12. **DontListen vs socket parity.** The in-process connection skips
    the network layer; conformance runs loopback sockets. Do the two
    paths differ anywhere observable (flush, error surfacing,
    payload limits), and does the vendor treat them as equivalent?

## Deliverable

A dossier scoring every item (confirmed/refuted/novel-adjacent), each
verdict with the vendor citation (document + section), plus the novel
hazards list, ranked. Then the coordinator does the needs
determination: which items become envelope clauses + law tests (task
16's pattern), which become VERIFICATION residuals, which are
refuted and recorded as such.

## Resolution (2026-08-13)

Corpus read and scored — full scorecard:
[docs/research/2026-08-13-nats-vendor-corpus-scorecard.md](../../research/2026-08-13-nats-vendor-corpus-scorecard.md).
Priors: Register 1 landed (5 of 7 confirmed/partial with mechanisms),
Register 2 aimed one layer high (real failures are server-side and
mostly loud), Register 3 was unanswerable by a vendor corpus. Scariest
confirmation: acked ≠ synced — the two-minute failsafe and the
kill-9/pull-the-plug boundary (exactly where G1 stopped). Most
important novel: persist-mode-async passes both shape gates today.
Hardening batch: scratch/codex/19; sync-mode pin is the one operator
decision. Stated residual gap: 1,311 slide frames unread (candidate
targeted vision pass).
