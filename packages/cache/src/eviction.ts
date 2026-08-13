/**
 * The economic seam. Everything here decides what a cache is worth keeping, and
 * nothing here can decide what an answer is.
 *
 * That is a fact about the types, not a discipline the policy author is asked
 * to observe. A policy is handed `KeyStat` — a name, a size, an age — and
 * returns names. There is no byte string on either side of its interface, so a
 * policy cannot write an entry, cannot alter one, and cannot see the value it
 * is dropping. The worst a badly written or actively hostile policy can do is
 * drop everything, and the cost of that is arithmetic: every later `runCached`
 * misses and folds, returning exactly the answer it would have returned anyway.
 *
 * This is the invalidation-free property spent. A cache whose entries can never
 * be wrong has no correctness reason to evict, so eviction is left with only
 * the economic reason, and the interface is cut so it can express only that.
 */

import { Clock, Context, Duration, Effect, Layer } from "effect"
import { Backing, type KeyStat } from "./backing.ts"
import type { BackingUnavailable } from "./refusal.ts"

export interface EvictionShape {
  /**
   * Names the entries to forget. Keys that are not held are ignored, so a
   * policy cannot fail by naming something absent — and cannot achieve
   * anything by naming something it invented.
   */
  readonly select: (
    stats: ReadonlyArray<KeyStat>,
  ) => Effect.Effect<ReadonlySet<string>>
}

export class Eviction extends Context.Service<Eviction, EvictionShape>()(
  "@foldlab/cache/Eviction",
) {}

/** Keep everything. The right default: an entry that cannot go stale has no deadline. */
export const EvictionNever: Layer.Layer<Eviction> = Layer.sync(Eviction, () => ({
  select: () => Effect.succeed(new Set<string>()),
}))

/**
 * Forget entries this node has held longer than `maxAge`.
 *
 * The age is local bookkeeping and deliberately not part of the entry: the same
 * entry is older on one node than another, and both are right, because age says
 * nothing about the answer. Two nodes running different TTLs stay convergent —
 * they simply hold different subsets of the same set, and anti-entropy refills
 * whatever either one dropped.
 */
export const EvictionTtl = (maxAge: Duration.Input): Layer.Layer<Eviction> =>
  Layer.sync(Eviction, () => ({
    select: (stats) =>
      Effect.map(Clock.currentTimeMillis, (now) => {
        const limit = Duration.toMillis(maxAge)
        const doomed = new Set<string>()
        for (const stat of stats) {
          if (now - stat.storedAtMillis > limit) doomed.add(stat.key)
        }
        return doomed
      }),
  }))

/**
 * Keep at most `maxEntries`, dropping the ones stored longest ago first. Ties
 * broken by key so the choice is deterministic — two nodes with the same
 * contents make the same choice, which keeps a fleet's behaviour explainable
 * even though correctness never depended on it.
 */
export const EvictionCap = (maxEntries: number): Layer.Layer<Eviction> =>
  Layer.sync(Eviction, () => ({
    select: (stats) =>
      Effect.sync(() => {
        if (stats.length <= maxEntries) return new Set<string>()
        const ordered = [...stats].sort((left, right) =>
          left.storedAtMillis === right.storedAtMillis
            ? (left.key < right.key ? -1 : left.key > right.key ? 1 : 0)
            : left.storedAtMillis - right.storedAtMillis
        )
        return new Set(ordered.slice(0, stats.length - maxEntries).map((stat) => stat.key))
      }),
  }))

/**
 * Runs the policy once and forgets what it named, returning the count actually
 * dropped.
 *
 * The law this is licensed by: the store after a sweep holds a subset of what
 * it held before, and `runCached` is invariant under shrinking the store — a
 * dropped key is a miss, and a miss folds. So a sweep can change what the cache
 * costs and can never change what it returns.
 */
export const sweep: Effect.Effect<number, BackingUnavailable, Backing | Eviction> = Effect.gen(
  function*() {
    const backing = yield* Backing
    const eviction = yield* Eviction
    const stats = yield* backing.stats
    const doomed = yield* eviction.select(stats)
    return yield* backing.drop(doomed)
  },
)
