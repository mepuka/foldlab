# The NATS agent protocol: three wire shapes, one promotion rule

The mapping page NEXT.md orders before any derived-node code. Every
mechanism cited here is grounded in the ported substrate
(`go/journal/journal.go`, `go/effector/effector.go`, `go/cmd/journald/`),
which passes its embedded-NATS conformance tests under this repo's gates.
Theory heritage: `.reference/playground-core/SPEC.md` (amended §2/§3/§6).
The server-side guarantees every mechanism below leans on are
source-verified at the pinned versions in
[2026-08-12-jetstream-guarantees-source-verified.md](2026-08-12-jetstream-guarantees-source-verified.md)
— including the two caveats that matter (KV reads are never
read-after-write consistent; the dedup assist is standalone-path-ordered
behind CAS, so the digest-compare fallback is load-bearing).

## The frame: general replay with four specific properties

The whole substrate is one generic capability — **replay** — made
trustworthy by four properties, each carried by a specific NATS mechanism:

1. **Facts before visibility.** An outside-world outcome becomes a journal
   fact before any program logic may observe it. After that, the world is
   never needed again: re-running is folding facts. (This is what makes
   replay *general* — nothing about the payloads is domain-specific.)
2. **Content-addressed identity.** Every value has one canonical byte form
   (RFC 8785, `go/canonical`) and its digest is its name. Equal names are
   equal things; every cross-boundary claim is a digest equality.
3. **CAS-only writes.** Nothing is ever blind-written. Journal appends
   carry an expected position; register transitions carry an expected
   revision. Check and act share a linearization point — the audited
   lesson (playground A6): a read followed by a separate write is a
   protocol bug, not a style choice.
4. **Verify-on-read.** Readers recompute: chain linkage, canonical bytes,
   digests. Storage is never trusted; a mismatch is a typed refusal
   (`ErrTampered`), and evidence is preserved, not destroyed.

Everything an agent fleet needs to say to itself maps onto three wire
shapes that differ in exactly one dimension: **what surviving means**.

## Shape 1 — Journal facts (JetStream stream: history that happened)

The unit of "this happened, in this order, provably."

| Mechanism | In the code | Why |
|---|---|---|
| Stream `J_<name>`, single subject `j.<name>` | `journal.Open` | One subject = one total order; a multi-subject stream has interleaving ambiguity, so the shape gate refuses it |
| Append CAS | `PublishMsg(..., WithExpectLastSequencePerSubject(seq))` | Position occupancy is decided by the server atomically — two racers get exactly one winner; the loser gets `ErrConflict` after a digest compare (same bytes → `Duplicate`, benign) |
| `Nats-Msg-Id` = entry digest | `appendEntry` | The dedup window absorbs redelivery of the *same* entry; CAS remains the authority, dedup is only an assist |
| Chain linkage | `wireEntry{payload, prev, seq}` | Each entry names its predecessor's digest; the head commits the whole prefix (the identity fold) |
| Verify-on-read | `Journal.Read` | Seq must match position, prev must match verified head, wire bytes must be canonical — else `ErrTampered` at the exact position |
| Shape gate | `badShapeReason` | `DenyDelete`, `DenyPurge`, no eviction limits, no rollup, no mirror/sources, `FirstSeq == 1`, file storage — the substrate axioms checked at `Open`, not assumed |

Surviving means: **forever, in order, tamper-evident**.

## Shape 2 — Commitment registers (JetStream KV: decisions with exactly one winner)

The unit of "this contested thing was decided once, and stale actors are
refusable." One authority key per unit of work: `work.<digest>` in bucket
`E_<name>`, holding a tagged value —
`{"expiry":…,"fence":…,"owner":…,"tag":"claim"}` or
`{"fence":…,"result":…,"tag":"done"}` — never two keys, so every
transition validates and writes at a single linearization point.

| Transition | KV primitive | Semantics |
|---|---|---|
| First claim | `kv.Create` (create-only) | Atomic "I am first"; `ErrKeyExists` → someone else holds it or it's done |
| Steal after lease expiry | `kv.Update` at read revision | Fence increments monotonically; revision mismatch → you lost the race, `ErrHeld` |
| Commit | `kv.Update` at read revision, value → `done` | The fence check and the outcome write are the SAME atomic step; a superseded claimant gets `ErrFenced`, never a silent overwrite |
| Read | `kv.Get` + strict canonical decode | Expired claim reads as `Unclaimed` (lease = liveness only); `done` is terminal |

Two disciplines worth naming because they generalize to every future
register: **leases are liveness, fences are safety** (a lease expiring
never un-decides anything; only the fence refuses stale writers), and
**the value is a strict tagged union** (unknown fields, non-canonical
bytes, or a wrong tag are decode refusals — the register cannot drift
into an untyped bag).

Surviving means: **exactly one committed outcome per name, forever**.

## Shape 3 — Ephemeral chatter (core NATS: everything that may be lost)

Plain pub/sub and request/reply. Presence, progress hints, wakeups,
"work may be available," metrics. The defining test: **if every chatter
message were dropped, no theorem breaks — only latency suffers.** Chatter
may accelerate what the facts already determine; it may never decide
anything. (The journald live plane is the existing example: an NDJSON
sidecar *announcing* appends, while `Read`'s verification remains the
authority.)

## The promotion rule (the one law of the protocol)

> If a message must be exactly-once-meaningful, it is not a message.
> Promote it: name it by digest, decide it in a register, record it as a
> journal fact. Chatter accelerates; facts decide.

Concretely, promotion is `effector.Do(digest, owner, lease, effect)`:
lookup (already committed → return the recorded outcome, zero effects),
claim, run the effect, commit at the claim's fence. The at-least-once
crash window (effect ran, commit didn't) is impossible to eliminate —
Two Generals — but the register makes reruns *refusable* and the outcome
unique.

## Mapping agent-coordination needs onto the shapes

| Need | Shape | Sketch |
|---|---|---|
| Task claiming / work distribution | Register | Work item's digest is the key; N agents race `Claim`; crashed agents are stolen from after lease expiry, fenced out on return |
| Result exchange | Register + journal | Outcome commits in the register (dedup + refusal), then lands as a journal fact (order + provenance) |
| Conversation / LLM traffic | Journal | ADR-0005: the journal is load-bearing for LLM traffic; a transcript is a chained history, replayable and citable by head |
| Agent inbox / mailbox | Journal per correlation key | The entity collector's quotient: one key, one chained history — an inbox IS an entity |
| Barrier / rendezvous | Register | Key = digest of the barrier condition; the fact that all parties arrived commits once |
| Broadcast, presence, "wake up" | Chatter | Droppable by definition; anything that must not be dropped gets promoted |
| Anchors index ("seen this history before") | KV (new, next lane) | Key = correlation key, value = anchor triple `(key, head, state digest)`, revision-CAS on advance — the collector's first real backing |

## JetStream utilities inventory (used / refused / next)

**Used now:** create-only `Create`, revision-CAS `Update`, `Get`,
`History: 1`, file storage, expected-last-sequence publish, `Nats-Msg-Id`
dedup, `GetMsg` by sequence, shape gates on both stream and bucket config.

**Deliberately refused** (each is a gate, not an omission):
- KV TTL / stream eviction on authority data — the server deleting an
  authority key would un-decide a decision; `badShapeReason` refuses
  `TTL != 0`. Leases expire by *timestamp comparison at read*, never by
  server-side deletion.
- `History > 1` on the register — the steal chain's audit trail belongs
  in the journal; the register stores only the current authority.
- Mirrors/sources/rollup/purge on journals — imported or removable
  messages break the "position occupancy is proof" reading of CAS.

**Next to explore (the investigation lane, in order):**
1. **KV `Watch` as the register live plane** — watch `work.>` and get
   revision-ordered transition notifications (claim → steal → done) for
   free; classify it honestly as chatter (a watcher that misses events
   must recover by `Get`, which it can, because the register is the
   authority). This is the cheapest new capability standing.
2. **Anchors in KV through the Go twin** — the derived-node conformance
   test on embedded NATS (backlog item 2): entity collector backed by a
   KV bucket, anchor advance as revision-CAS, walls against the in-memory
   collector by digest equality.
3. **Ordered consumers vs the `GetMsg` loop** — `Read` fetches
   one-message-at-a-time; an ordered consumer delivers batches with
   server-tracked flow. Verification logic is unchanged (verify-on-read
   is consumer-agnostic); this is purely a throughput experiment for the
   bench harness.
4. **Subject-hierarchy journals** — `j.<name>.<partition>` with
   per-subject CAS would give per-key total order with cross-key
   concurrency: exactly the entity quotient, at the substrate level. The
   shape gate currently pins the singleton subject on purpose; relaxing
   it is a design decision (ADR), not a tweak — it changes what "the"
   order means.

## What this buys that a message broker doesn't

A broker moves bytes; this protocol makes three *claims* checkable by
recomputation: what happened (chained journal, verify-on-read), what was
decided (fenced register, single linearization point), and what anything
is (canonical bytes → digest). An agent joining mid-flight trusts no
peer: it reads the journal and recomputes. That is the "trustless" in the
one-idea doc, and it is why the same three shapes should carry domain
events, LLM traffic, and the registry's own mint facts without new
machinery.
