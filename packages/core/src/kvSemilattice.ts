/**
 * The KV meaning fold as a JOIN-SEMILATTICE, on an enriched state that keeps
 * what the shipped `KVState` throws away.
 *
 * `stream.ts` gives the lane a monoid: `combineKV` is associative and unital
 * and satisfies the parallel-replay homomorphism unconditionally, which is
 * everything a split-and-recombine replay needs. It is not commutative and not
 * idempotent, because order IS the semantics of last-write-wins and because
 * `count` is a sum. A fold that federates WITHOUT a committed order needs all
 * three laws, and the only way to get them is to stop throwing away the thing
 * the order was standing in for.
 *
 * So the carrier here is `key -> (witness, value)` plus the set of identity
 * coordinates the state has absorbed. The witness is `(seq, stream)`: the
 * sequence number as the logical clock, the stream id as the deterministic
 * tie-break between two replicas at the same clock. That is the classical
 * last-write-wins register, and the ordering choice is not free — see
 * `compareWitness` for the frozen-corpus evidence that ranks it against the
 * other candidate.
 *
 * WHAT IS PROVEN, and where (test/kvSemilattice.test.ts):
 *
 *   idempotent    join(s, s) = s
 *   commutative   join(a, b) = join(b, a)
 *   associative   grouping does not matter
 *   projection    projectKV(foldSeqKV(xs)) = foldKV(xs), digest for digest,
 *                 on histories that are strictly increasing in witness order
 *                 with distinct coordinates
 *
 * The first three hold over the whole witness-consistent domain — the domain
 * in which a coordinate names one event, which is what the journal's
 * position-CAS enforces and what `MergeDuplicateSequence` refuses to work
 * without. The projection law is the one with a real precondition, and the
 * frozen wall corpus satisfies it: `projectKV(foldSeqKV(merged))` reproduces
 * the frozen `foldStateDigest` byte for byte.
 *
 * WALL STATUS: single-implementation, TypeScript only. There is no Go twin and
 * therefore no cross-language wall for anything in this file — the same
 * standing that `fixtures/fold-pin.json` declares for the fold lane. The one
 * claim here that IS wall-anchored is the projection law, because the digest it
 * has to reproduce was frozen by Go.
 *
 * Refusals are values, in the `{ ok }` discipline this package's fold lane
 * already uses (`jcs.ts`, `algebra.ts`, `foldLaws.ts`), not thrown and not on
 * the Effect channel.
 */

import { emptyKV, kvStep, type KVState, type StreamEvent } from "./stream.ts"

/**
 * One key's winning write: the value, and the identity coordinate that won it.
 * The coordinate is kept, not summarized — it is the entire reason the join
 * below can be commutative when the left fold it replaces cannot be.
 */
export interface SeqEntry {
  readonly seq: number
  readonly stream: string
  readonly value: string
}

/**
 * The enriched state: winners by key, plus every coordinate absorbed so far.
 *
 * `seen` is the price of idempotence and it is not a small one — the state is
 * O(history) where `KVState` is O(distinct keys). It buys the only thing a
 * counter cannot give: `projectKV` has to reproduce `KVState.count`, the count
 * is inside the frozen `stateDigest` preimage, and a count that is a sum is
 * exactly what makes `combineKV(s, s) != s`. Remembering WHICH events were
 * absorbed makes re-absorbing one free; remembering only HOW MANY cannot.
 */
export interface SeqKVState {
  readonly entries: ReadonlyMap<string, SeqEntry>
  readonly seen: ReadonlyMap<string, ReadonlySet<number>>
}

export const emptySeqKV: SeqKVState = { entries: new Map(), seen: new Map() }

/**
 * Two events claim one identity coordinate with different payloads, so the join
 * has no lawful winner.
 *
 * Refusing is not a shrug. The lane already holds that a sequence number is an
 * identity coordinate and that last-write-wins is not a lawful way to resolve
 * two events sharing one (`stream.ts` `MergeDuplicateSequence`,
 * `go/stream/stream.go` `MergeDuplicateSequence`), and that replay never
 * resolves ambiguity with a silent policy. Picking the byte-greater value here
 * would be exactly such a policy, and it would contradict a shipped wall.
 *
 * Nothing is given up by refusing, because the tie is unreachable in a lawful
 * journal: the position-CAS in `go/journal/journal.go` appends under
 * `WithExpectLastSequencePerSubject`, so a position within a subject is owned
 * by one entry. A conflict observed here is evidence of divergence upstream,
 * and the useful response to evidence is to name it.
 *
 * Equal coordinate with EQUAL value is not a conflict and never refuses —
 * absorbing the same fact twice is precisely what idempotence is.
 */
export type SeqKVRefusal =
  | {
    readonly _tag: "MalformedPayload"
    readonly stream: string
    readonly seq: number
  }
  | {
    readonly _tag: "WitnessConflict"
    readonly key: string
    readonly stream: string
    readonly seq: number
    readonly left: string
    readonly right: string
  }

export type SeqKVResult =
  | { readonly ok: true; readonly state: SeqKVState }
  | { readonly ok: false; readonly refusal: SeqKVRefusal }

/**
 * The witness order: sequence number first, stream id second, streams compared
 * by their UTF-8 bytes exactly as `stateDigest` compares keys.
 *
 * The order of the two fields is load-bearing and was decided by evidence, not
 * taste. Ordering by `(stream, seq)` — stream first — makes one replica
 * dominate every other at every clock, and it is refuted outright by the
 * repository's own frozen corpus: over the merged log in
 * `fixtures/stream-wall.json` it elects `a=5` where the shipped left fold
 * elects `a=3`, and the projected digest comes out `910950be...` against the
 * frozen `bb947adc...`. Ordering by `(seq, stream)` is the classical
 * last-write-wins register — logical clock, then replica id as a deterministic
 * tie-break — and it reproduces the frozen digest on that same corpus.
 * `test/kvSemilattice.test.ts` runs both and shows the split.
 *
 * Sequence numbers are safe integers by the lane's contract, so comparing them
 * as numbers is comparing them as the u64 coordinates they encode to.
 */
export const compareWitness = (left: SeqEntry, right: SeqEntry): number => {
  if (left.seq !== right.seq) return left.seq < right.seq ? -1 : 1
  const leftBytes = new TextEncoder().encode(left.stream)
  const rightBytes = new TextEncoder().encode(right.stream)
  const shared = Math.min(leftBytes.length, rightBytes.length)
  for (let i = 0; i < shared; i++) {
    const delta = leftBytes[i]! - rightBytes[i]!
    if (delta !== 0) return delta < 0 ? -1 : 1
  }
  return leftBytes.length === rightBytes.length
    ? 0
    : leftBytes.length < rightBytes.length
    ? -1
    : 1
}

const seenWith = (
  seen: ReadonlyMap<string, ReadonlySet<number>>,
  stream: string,
  seq: number,
): Map<string, ReadonlySet<number>> => {
  const next = new Map(seen)
  const existing = next.get(stream)
  const seqs = new Set(existing ?? [])
  seqs.add(seq)
  next.set(stream, seqs)
  return next
}

/**
 * One event as a one-key state, decoded through the lane's single walled
 * decoder: `kvStep` over the empty state, so a payload this admits is exactly a
 * payload the shipped meaning fold admits, and there is still only one
 * definition of what the meaning fold reads.
 */
export const singletonSeqKV = (e: StreamEvent): SeqKVResult => {
  const stepped = kvStep(emptyKV(), e)
  if (stepped === undefined) {
    return { ok: false, refusal: { _tag: "MalformedPayload", stream: e.stream, seq: e.seq } }
  }
  const [entry] = stepped.entries
  if (entry === undefined) {
    return { ok: false, refusal: { _tag: "MalformedPayload", stream: e.stream, seq: e.seq } }
  }
  return {
    ok: true,
    state: {
      entries: new Map([[entry[0], { seq: e.seq, stream: e.stream, value: entry[1] }]]),
      seen: new Map([[e.stream, new Set([e.seq])]]),
    },
  }
}

/**
 * The join: per key, the entry with the greater witness; over coordinates, set
 * union.
 *
 * Idempotent because a set union absorbs and a maximum absorbs. Commutative
 * because a maximum under a total order does not care which argument it was
 * handed. Associative for the same reason. All three hold over the whole
 * witness-consistent domain, which is the domain in which no coordinate carries
 * two different values.
 *
 * Off that domain the refusal channel does NOT associate, and the suite pins it
 * rather than hiding it: with `a` and `b` holding different values at one
 * coordinate and `c` holding a later one for the same key, `(a ⊔ b) ⊔ c`
 * refuses while `a ⊔ (b ⊔ c)` succeeds, because the later entry has already
 * displaced the conflicting pair. That asymmetry is the honest shape of a
 * partial join, and it is the reason the laws are stated over the consistent
 * domain instead of over everything.
 */
export const combineSeqKV = (left: SeqKVState, right: SeqKVState): SeqKVResult => {
  const entries = new Map(left.entries)
  for (const [key, incoming] of right.entries) {
    const held = entries.get(key)
    if (held === undefined) {
      entries.set(key, incoming)
      continue
    }
    const order = compareWitness(held, incoming)
    if (order === 0) {
      if (held.value !== incoming.value) {
        return {
          ok: false,
          refusal: {
            _tag: "WitnessConflict",
            key,
            stream: incoming.stream,
            seq: incoming.seq,
            left: held.value,
            right: incoming.value,
          },
        }
      }
      continue
    }
    if (order < 0) entries.set(key, incoming)
  }
  let seen = left.seen
  for (const [stream, seqs] of right.seen) {
    for (const seq of seqs) seen = seenWith(seen, stream, seq)
  }
  return { ok: true, state: { entries, seen } }
}

/** One fold step: absorb an event by joining its one-key state. */
export const seqKvStep = (state: SeqKVState, e: StreamEvent): SeqKVResult => {
  const single = singletonSeqKV(e)
  return single.ok ? combineSeqKV(state, single.state) : single
}

/**
 * Fold a history into the enriched state. Written as a left fold only because
 * a list has a left end: the join is commutative, so the traversal order is a
 * convenience here, not a semantics — which is the entire difference between
 * this fold and `foldKV`.
 */
export const foldSeqKV = (events: ReadonlyArray<StreamEvent>): SeqKVResult => {
  let state = emptySeqKV
  for (const e of events) {
    const next = seqKvStep(state, e)
    if (!next.ok) return next
    state = next.state
  }
  return { ok: true, state }
}

/**
 * Drop the witnesses: the shipped `KVState`, whose `stateDigest` is frozen.
 *
 * This is the map that makes the enriched state a refinement rather than a
 * replacement — the projection commutes with the fold on histories that are
 * strictly increasing in witness order with distinct coordinates, so the state
 * digest the wall froze is reproduced, not re-negotiated. `count` comes from
 * the coordinate set, which is why the set had to be carried at all.
 */
export const projectKV = (state: SeqKVState): KVState => {
  let count = 0
  for (const seqs of state.seen.values()) count += seqs.size
  const entries = new Map<string, string>()
  for (const [key, entry] of state.entries) entries.set(key, entry.value)
  return { entries, count }
}
