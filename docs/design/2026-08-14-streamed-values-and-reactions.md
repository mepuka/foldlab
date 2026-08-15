# Streamed values and reactions: what the move calculus licenses on the wire

2026-08-14, from the operator's question: "what does the algebra say we
can get as streamed values and how do we react to them?" Companions:
the [lit synthesis](../research/2026-08-14-lit-synthesis.md) (D1–D6
ratified), the [adoption boundary](2026-08-14-adoption-boundary.md).
This note is the catalog the stable-watch surface implements.

## The two native streams

1. **The move stream** (the journal tail). Totally ordered within a
   venue, hash-chained (= causal delivery discharged by construction),
   replayable. Everything else is derived from it by folding. This is
   the op-based view.
2. **The state scan** — the running meaning fold, emitting
   (head, state digest, state) per move. Its law: each element is ⊒ the
   previous in the information order (presence is monotone) — an
   **inflationary walk up the lattice**. The WALK is
   linearization-contingent (which path you take up the lattice depends
   on the schedule); the DESTINATION is not (commuting segments join to
   the same point). One sentence: **intermediate states are testimony;
   limits are truth.**

## Derived streams: the three-tier trichotomy (Bloom^L, load-bearing)

| Tier | Definition | Evaluation | May you REACT (side-effect)? |
| --- | --- | --- | --- |
| **Morphism** g(a ⊔ b) = g(a) ⊔ g(b) | commutes with join | incremental, per move, off the tail — never refold | Yes, at stable thresholds |
| **Monotone** a ⊑ b ⟹ g(a) ⊑ g(b) | order-preserving only | must re-evaluate against the full fold | Yes, at stable thresholds |
| **Non-monotone** | anything else | any evaluation | **NEVER** — display only, head-stamped |

Examples. Morphisms: per-hole projection (state → status of h);
candidate-set projection; "the set of holes ever disputed"; any union/
join-shaped view. Monotone-not-morphism: "all of holes A,B,C are
settled-stably" (conjunction of thresholds). Non-monotone: "hole h is
filled and undisputed" (Moore-shaped — the refuted naive predicate);
"number of OPEN holes" (doubly illegal: non-monotone AND a tally);
"no dispute exists" (an absence claim — anti-monotone, head-relative).

**The aggregate gate** (Amsterdamer–Deutch–Tannen): fold outputs that
COUNT, SUM, or TALLY leave the provenance framework unless carried in
the tensor K ⊗ M. Idempotent (join/max/union-shaped) folds are safe.
This is an admission rule on declared algebras, enforced at
declaration, not discovered downstream. (Note: plurality at the FENCE
is legal — the fence is not a streamed fold; it is a one-shot function
of the canonical candidate set at decision time.)

## The reaction rule

A **reaction** is a consumer bound to (stable predicate, stable
payload):

- **Fires on rising edges of stable properties only** — decided_h;
  single-seat fill (the seal); dispute-existence; monotone conjunctions
  of these. Stability = preserved under every journal extension (the
  DEL positive fragment; Threshold Consistency).
- **Payload is the stable witness, not the whole state** (D6): handing
  a callback the full snapshot leaks unstable parts through a stable
  trigger.
- **Retroactive from head 0** (D6): a late subscriber sees every
  crossing already in the journal — subscription time must not change
  what fires. (LVish handlers got this right in 2014; a tail-only
  rising-edge loop gets it wrong.)
- **Exactly-once by digest, not by delivery**: a reaction's identity is
  (predicate digest, crossing witness); its EFFECT is a move (CAS
  refuses duplicates) or an external binding (work-digest idempotent).
  At-least-once transport is therefore harmless end to end.

**Reactions close the loop.** A reaction emits moves or bindings, which
extend the journal, which advances the scan, which crosses thresholds,
which fires reactions. **An agent IS a standing reaction**: the loop
fold → frontier → propose → submit is a reactor subscribed to "my
frontier changed," whose payload is the frontier (a stable-relative
view of its own head) and whose output is moves. The whole system is a
fixpoint computation climbing a lattice, with explicitly-marked
non-monotone escapes.

## The two special reactable streams

1. **Contention is a stream.** "A dispute exists on h" is MONOTONE
   (dispute-appearance never un-happens; resolution adds decided, it
   does not remove the dispute fact). So disputes are first-class
   reactable events — and **the fence itself is just a reactor**
   subscribed to dispute-existence, holding decide authority. So are
   escalation, reconciliation-before-fence, and dispute dashboards.
   Contention handling needs no machinery the reaction rule doesn't
   already give.
2. **Seals turn absence into presence.** "h will never be filled
   further" is anti-monotone as an observation — but a protocol-phase
   CLOSE (a seal: the seat set for h can no longer act, itself a
   decided fact) is monotone evidence that makes the closed-world
   reading of h stable from that head on. Frontier-shrinking becomes
   reactable exactly when a seal lands. This is the sealing idea
   (Blazes) as a runtime event, and it is how "the protocol phase is
   complete" becomes a lawful trigger.

## The parallel and compaction licenses (already proved machinery)

- **Associativity** of the declared fold ⟹ segment-wise folding and
  mid-stream compaction (prefix → (head, state digest)).
- **Commutativity + idempotence of the join** ⟹ shard folds merge by
  join with no coordination (the KV combine laws on main); sharding by
  hole/commutativity class is sound because reactions are directional
  (a dispute in one shard cannot un-decide another).
- **Replay = re-interpretation under the recorded linearization**; the
  scan is reproducible byte-for-byte, so every derived stream is too.

## The worked example (order protocol)

Streams: the venue's move tail; the state scan; morphism projections
per hole; the dispute stream on `order.*`. Stable events:
`order.currency` filled (single seat — sealed at fill),
`order.id_format` decided (fence), phase-close seal on the order
section. Reactions: the fence (subscribed to disputes on `order.*`);
the fulfillment service (subscribed to id-decided ∧ currency-stable,
payload = the two witnesses, effect = an external binding to the
shipping API, work-digest idempotent); the operator dashboard
(non-monotone projections, head-stamped, display only — no actuation
path exists from it by construction).

## What the algebra refuses, in one list

Reacting to Moore predicates (filled-and-undisputed); acting on
absence without a seal; counting/summing folds outside K ⊗ M; global
`decided(h)` (only `decided_h` exists); bounded-time delivery promises
(only "eventually"); actuation from non-monotone views.
