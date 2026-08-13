/**
 * Federation: a separate service, because a single-node user must not pay for
 * it and must not have to learn it exists.
 *
 * The whole design rests on one fact about the entries rather than on any
 * protocol. A key names the computation and the exact history; the fold is a
 * function of those two; so an entry's bytes are determined by its key. Union of
 * two caches is therefore a join on a semilattice — idempotent, commutative,
 * associative — and two nodes that exchange entries in any order, any number of
 * times, with any duplication, converge. There is no vector clock here, no
 * version, no tie-break, and no last-writer-wins, because there is never a
 * writer to prefer: agreeing entries are byte-identical and disagreeing entries
 * are evidence of corruption.
 *
 * What that buys operationally: gossip needs no coordination, a partition
 * cannot cause divergence (only staleness), a replayed or reordered exchange is
 * a no-op, and a peer needs no authority — with `FoldCacheVerified` above it, a
 * lying peer's entry is refused on first read by re-folding locally.
 */

import { Context, Duration, Effect, Layer, Schedule, Stream } from "effect"
import { absorb, Backing, type BackingShape, type Snapshot } from "./backing.ts"
import { corruptEntry, type BackingUnavailable, type CorruptEntry } from "./refusal.ts"

/**
 * The join. Entries agreeing on a key collapse to one; entries disagreeing are
 * refused rather than resolved.
 *
 * This is a join on the sub-domain where shared keys agree, and that sub-domain
 * is where every honest pair of caches lives. Outside it there is nothing to
 * compute: two different byte strings under one name cannot both be the fold's
 * answer, so the union is undefined there and says so. Making it total by
 * preferring a side is the one move that would turn a corrupt entry into the
 * network's consensus.
 */
export const unionSnapshots = (
  left: Snapshot,
  right: Snapshot,
): { readonly ok: true; readonly snapshot: Snapshot } | {
  readonly ok: false
  readonly refusal: CorruptEntry
} => {
  const merged = new Map(left)
  for (const [key, bytes] of right) {
    const held = merged.get(key)
    if (held !== undefined && held !== bytes) {
      return {
        ok: false,
        refusal: corruptEntry(
          key,
          "key-collision",
          "two caches name different canonical bytes under one key",
        ),
      }
    }
    merged.set(key, bytes)
  }
  return { ok: true, snapshot: merged }
}

/** What one exchange with one peer did. Monotone: a repeat absorbs nothing. */
export interface MergeReport {
  readonly peer: string
  readonly offered: number
  readonly absorbed: number
}

/**
 * A source of entries. It is not an authority and holds no credential: the only
 * thing a peer can do is offer bytes that are checked exactly as strictly as
 * locally computed ones.
 */
export interface Peer {
  readonly name: string
  readonly snapshot: Effect.Effect<Snapshot, BackingUnavailable>
}

export class Peers extends Context.Service<Peers, ReadonlyArray<Peer>>()(
  "@foldlab/cache/Peers",
) {}

export interface FederationShape {
  /** Files a peer's entries locally, refusing any that disagree with what is held. */
  readonly merge: (
    peer: string,
    remote: Snapshot,
  ) => Effect.Effect<MergeReport, BackingUnavailable | CorruptEntry>
  /** What this node offers a peer. */
  readonly publish: Effect.Effect<Snapshot, BackingUnavailable>
  /**
   * The anti-entropy loop as a Stream: one round per tick, one report per peer.
   *
   * A round is a plain sequence of merges because order does not matter — that
   * is the theorem spent, not a simplification. A peer that cannot be reached
   * is skipped, since staleness is the only thing unreachability costs. A peer
   * whose entry collides with one already held ends the stream with
   * `CorruptEntry`: that is evidence, and a loop that swallowed it would be a
   * loop that quietly spread corruption.
   */
  readonly antiEntropy: (
    interval: Duration.Input,
  ) => Stream.Stream<MergeReport, BackingUnavailable | CorruptEntry>
}

export class Federation extends Context.Service<Federation, FederationShape>()(
  "@foldlab/cache/Federation",
) {}

const merge = (
  backing: BackingShape,
  peer: string,
  remote: Snapshot,
): Effect.Effect<MergeReport, BackingUnavailable | CorruptEntry> =>
  Effect.map(absorb(backing, remote), (absorbed) => ({
    peer,
    offered: remote.size,
    absorbed,
  }))

const round = (
  backing: BackingShape,
  peers: ReadonlyArray<Peer>,
): Effect.Effect<ReadonlyArray<MergeReport>, BackingUnavailable | CorruptEntry> =>
  Effect.gen(function*() {
    const reports: Array<MergeReport> = []
    for (const peer of peers) {
      const offered = yield* Effect.result(peer.snapshot)
      if (offered._tag === "Failure") continue
      reports.push(yield* merge(backing, peer.name, offered.success))
    }
    return reports
  })

export const FederationLive: Layer.Layer<Federation, never, Backing | Peers> = Layer.effect(
  Federation,
)(
  Effect.gen(function*() {
    const backing = yield* Backing
    const peers = yield* Peers
    const shape: FederationShape = {
      merge: (peer, remote) => merge(backing, peer, remote),
      publish: backing.snapshot,
      antiEntropy: (interval) =>
        Stream.fromSchedule(Schedule.spaced(interval)).pipe(
          Stream.mapEffect(() => round(backing, peers)),
          Stream.flatMap(Stream.fromIterable),
        ),
    }
    return shape
  }),
)

/** No peers: what a single-node deployment provides, and the default. */
export const PeersNone: Layer.Layer<Peers> = Layer.sync(Peers, () => [])

/** A fixed peer list, for a deployment that knows its neighbours by name. */
export const PeersOf = (peers: ReadonlyArray<Peer>): Layer.Layer<Peers> =>
  Layer.sync(Peers, () => peers)

/**
 * A peer backed by another node's `Backing`, which is what an in-process test
 * and a real two-node deployment differ by: where the snapshot comes from.
 * Nothing above this line can tell.
 */
export const peerOf = (name: string, backing: BackingShape): Peer => ({
  name,
  snapshot: backing.snapshot,
})
