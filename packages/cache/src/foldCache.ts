/**
 * The fold-through cache: one verb, and the cache is not one of its arguments.
 *
 * A caller asks for the result of a fold over a history it already has a
 * verified head for, and gets it. Whether that answer was recomputed, read from
 * this process's memory, read from a durable store, or absorbed from a peer
 * three hops away an hour ago is not part of the question and is not part of
 * the answer. The interface is the whole leverage: there is no get, no put, no
 * key, and therefore no call site that can get the get/miss/compute/put dance
 * wrong, and no second place where "what does this key mean" is decided.
 *
 * The history is passed as an Effect and is read only on a miss. That is the
 * performance contract and it is testable: on a hit the events are never
 * enumerated, so a hit costs one store read and one entry check no matter how
 * long the history is.
 *
 * The precondition the caller owns: `head` is the head of `history`. It is the
 * one thing this module cannot check for free — checking it is exactly the cost
 * of not caching — so it is stated, not assumed silently, and the verified
 * Layer checks it by re-folding.
 */

import { encodeFoldState, type FoldState } from "@foldlab/core/algebra"
import type { Fold } from "@foldlab/core/fold"
import { foldCacheKey } from "@foldlab/core/foldCache"
import type { Head, StreamEvent } from "@foldlab/core/stream"
import { Context, Effect, Layer, Result } from "effect"
import { Backing, BackingInMemory } from "./backing.ts"
import { readEntry } from "./entry.ts"
import {
  corruptEntry,
  identityUnavailable,
  type CorruptEntry,
  type IdentityUnavailable,
} from "./refusal.ts"

export interface FoldCacheShape {
  /**
   * The result of `fold` over the history whose head is `head`.
   *
   * Fails only two ways, and both mean something is wrong rather than slow:
   * `IdentityUnavailable` when the fold has no admitted name to be keyed by,
   * and `CorruptEntry` when a stored entry cannot have come from an honest
   * writer. A store that cannot be reached is a miss; a fold state with no
   * canonical form is a permanent miss. Neither is in the error channel,
   * because neither can change the answer.
   */
  readonly runCached: <A extends FoldState, EH = never, RH = never>(
    fold: Fold<StreamEvent, A>,
    head: Head,
    history: Effect.Effect<ReadonlyArray<StreamEvent>, EH, RH>,
  ) => Effect.Effect<A, IdentityUnavailable | CorruptEntry | EH, RH>
}

export class FoldCache extends Context.Service<FoldCache, FoldCacheShape>()(
  "@foldlab/cache/FoldCache",
) {}

const make = (verifyOnRead: boolean): Effect.Effect<FoldCacheShape, never, Backing> =>
  Effect.gen(function*() {
    const backing = yield* Backing
    const runCached = <A extends FoldState, EH = never, RH = never>(
      fold: Fold<StreamEvent, A>,
      head: Head,
      history: Effect.Effect<ReadonlyArray<StreamEvent>, EH, RH>,
    ): Effect.Effect<A, IdentityUnavailable | CorruptEntry | EH, RH> =>
      Effect.gen(function*() {
        // The one key rule, borrowed rather than restated. See the note on
        // `foldCacheKey`: a second derivation here would fail silently.
        const key = foldCacheKey(fold, head)
        if (typeof key !== "string") return yield* Effect.fail(identityUnavailable(key))

        // A store that cannot answer is a miss. The theorem licenses this: an
        // entry is content-keyed, so the only thing an unreachable store costs
        // is the fold it would have saved.
        const found = yield* Effect.result(backing.read(key))
        const stored = Result.isSuccess(found) ? found.success : undefined

        if (stored !== undefined) {
          const entry = readEntry(key, stored)
          if (!entry.ok) return yield* Effect.fail(entry.refusal)
          if (!verifyOnRead) {
            // The value is rebuilt from the bytes, never shared out of the
            // store, so a holder cannot edit what a later reader sees.
            return entry.value as A
          }
          const fresh = encodeFoldState(fold.fold(yield* history))
          if (!fresh.ok || fresh.bytes !== stored) {
            return yield* Effect.fail(corruptEntry(
              key,
              "fold-disagreement",
              "the stored entry differs from a fresh fold of the offered history",
            ))
          }
          return entry.value as A
        }

        const value = fold.fold(yield* history)
        const encoded = encodeFoldState(value)
        // A fold state outside the canonical domain has no bytes to store. The
        // fold still ran, so the answer is returned; the key simply stays a
        // permanent miss rather than turning a naming limit into a failure.
        if (!encoded.ok) return value
        const written = yield* Effect.result(backing.write(key, encoded.bytes))
        if (Result.isFailure(written) && written.failure._tag === "CorruptEntry") {
          // Our own honest result collided with something already filed under
          // this key. That is not a write problem to be retried — it is proof
          // that the stored side is corrupt, and it is surfaced.
          return yield* Effect.fail(written.failure)
        }
        return value
      })
    return { runCached }
  })

/**
 * The cache as a memo: an entry is trusted once it survives the always-on
 * canonical-form check. Right for a store this node wrote and nobody else can
 * reach.
 */
export const FoldCacheLive: Layer.Layer<FoldCache, never, Backing> = Layer.effect(FoldCache)(
  make(false),
)

/**
 * The cache as an assertion: every hit is re-folded from the offered history and
 * compared byte for byte before it is returned.
 *
 * This is what makes an untrusted peer safe to accept entries from — the peer
 * can lie, and the lie is caught locally on the first read, without asking
 * anyone. The price is exact and worth stating plainly: a verified hit costs
 * what a miss costs, so this Layer buys safety with the saving, never with
 * correctness. Choose it where entries arrive from outside; choose
 * `FoldCacheLive` where they do not.
 */
export const FoldCacheVerified: Layer.Layer<FoldCache, never, Backing> = Layer.effect(FoldCache)(
  make(true),
)

/** One node, one process, nothing shared: the whole stack a single-node user needs. */
export const FoldCacheLocal: Layer.Layer<FoldCache> = Layer.provide(FoldCacheLive, BackingInMemory)

/** One node, verifying every hit against the history it is handed. */
export const FoldCacheLocalVerified: Layer.Layer<FoldCache> = Layer.provide(
  FoldCacheVerified,
  BackingInMemory,
)
