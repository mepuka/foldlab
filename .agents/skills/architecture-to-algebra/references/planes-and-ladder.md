# Planes, rungs, carriers, and the cost ladder

Cut from `scratch/research/2026-08-18-algebra-engine-architecture.md`
(§3, §4, §10). Use during probe 4 (reads → folds → rungs → carriers)
and whenever storage, channels, or performance come up.

## The free-object chain IS the storage stack

The factorization chain of free objects — sequences ↠ multisets ↠
finite sets — read as architecture, with the carrier each stage gets:

| Quotient stage | What it remembers | Carrier | Estate construct |
| --- | --- | --- | --- |
| sequences (Σ*) | arrival order + duplicates | JetStream stream (sequence numbers) | positioned plane |
| multisets | counts, not order | stream + dedup window (msg-id = digest) | count-class measurements |
| finite sets | membership only | CAS (digest space; object store / FS carriers) | the join plane; truth |
| directory (named cells) | greatest binding per name | KV bucket, last-per-subject | greatest-read / provision |

NATS KV's last-per-subject read is literally the proven provision
fold: subject = name, stream sequence = position, read = greatest
position per name. The estate adds what the product lacks: laws,
refusal typing, anchored reads.

## One equality, many carriers

Never duplicate the CAS; duplicate carriers. "One CAS" is a logical
claim — one digest space, one equality — never a physical claim about
buckets or streams. Carrier limits (per-stream indexing, message
size) are placement-plane engineering: shard streams by kind and
partition, put blobs wherever, record where bytes sleep as placement
facts. Metadata about digest d is more facts keyed by d on a meta
lane, discriminated by kind — never a second address space, because a
second CAS is a second equality, the one thing there can't be two of.

Coherence between planes is pre-paid: every carrier read is
verify-on-read (hash, compare), and a mismatch is the
machine-applicable `unverifiedRead` refusal. Carriers may be stale,
partial, or wrong; truth never degrades because truth is the
equality, not the carrier.

## The rung⇒carrier rule

**A fold may read from the deepest quotient its algebra respects.**

- Commutative + idempotent (bounded semilattice) → the set plane
  (CAS). Redelivery and reordering are free.
- Commutative, not idempotent (counting monoids) → the multiset
  presentation; dedup by content digest makes at-least-once harmless.
- Non-commutative / positional (latest-wins, sequences, provision) →
  the positioned plane, with an anchor that carries positions.

Publishing a result down the chain (claiming a positional fold as a
set-plane fact) requires invariance under the quotient — the
homomorphism condition. A fold that wants order sensitivity AND the
cheap plane is a contradiction: surface it.

The fence has a native carrier too: publish with
expected-last-sequence (compare-and-set on a subject). `decide` uses
it; the race loser gets a typed refusal with a mechanical repair
(re-read, re-decide).

## The cost ladder — physics prices bytes, logic prices meaning

An operation's tier is determined by which laws its algebra
satisfies; optimization is proving a stronger law. Classical anchors
are order-of-magnitude folklore; estate tiers are cost classes.

| Tier | Estate operation | Cost class (anchor) | Notes |
| --- | --- | --- | --- |
| T0 | kernel judgment — admit intrinsic checks, eval on in-hand bytes | function call (≈ns–µs) | stateless; intrinsic refusals are free |
| T1 | verified local read — digest-keyed cache, local carrier + hash | RAM→NVMe (≈100 ns–100 µs) | digest cache never invalidates |
| T2 | positioned read/append — KV get, stream publish, consumer step | same-DC round trip (≈0.5 ms) | appends, directory reads, watches, door-relative checks |
| T3 | remote carrier fetch — placement + fetch + verify | WAN (≈10–150 ms) | parallel from untrusted sources: verification is local |
| T4 | the fence — expected-sequence publish × (1 + contention) | consensus (RTT × rounds) | decide only; the one mandatory wait |
| T5 | ratification — grill, seal, writ grant | minutes–days | the human plane; kept rare by design |

Three inversions against the classical table: cache invalidation is
deleted (digest keys are valid forever; name "invalidation" is a new
greatest position, pushed not guessed); speculation is free on the
join plane (a fence-race loss is the branch-mispredict analog); the
expensive instruction is coordination, not the disk seek — and the
ladder gains a rung (T5) classical charts never print. The whole
design is an exercise in demotion: keep every operation on the
cheapest rung its laws permit.

## The license table — optimization = proof

Every classical optimization has a lawful precondition, held by brand
rather than hope:

| Optimization | License | When unlicensed |
| --- | --- | --- |
| shard / parallelize | commutativity | rung⇒carrier type error |
| retry at-least-once | idempotence | never needed — exactly-once is refused vocabulary |
| incremental views | associativity (monoid fold) | replay from anchor |
| fuse passes | fold-combinator discipline | leaves-the-variety refusal |
| memoize forever | content addressing | `unverifiedRead` on mismatch |
| pushdown to storage | homomorphism (quotient invariance) | quotient violation |
| speculate | join-plane monotonicity | fence races only, typed retry |
| approximate in constant space | semilattice sketches (HLL/CMS/MinHash) | non-mergeable sketch refused |
| skip coordination | CALM: monotone ⇔ coordination-free | unfenced decide refused |

Consequence for services: a service is a bundle of declared folds + a
root + a writ, so its performance envelope is legible at declaration
time from the rungs of its folds — SLA from signature. Strengthening
its laws is the only way to move it down the ladder.

Honest bound: tier assignments are ordering claims, not measurements;
constants (hash throughput, boundary crossings, locality, contention)
move real numbers within and across adjacent tiers.
