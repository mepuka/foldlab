/**
 * The three refusals a federated cache can raise, and the line between the two
 * that mean something is wrong and the one that only means something is slow.
 *
 * Each is a plain value carried in an Effect's failure channel, wearing the same
 * `_tag`/`feature`/`reason` shape the core cache returns from its own read and
 * write. A refusal that crosses a service boundary is data on both sides of it.
 */

import type { IdentityUnavailable as CoreIdentityUnavailable } from "@foldlab/core/foldCache"

/**
 * The fold offered has no name to be keyed by. The reason is repeated verbatim
 * from the core cache, so a caller learns which half — algebra or step — is
 * anonymous rather than only that a name was missing.
 */
export type IdentityUnavailable = {
  readonly _tag: "IdentityUnavailable"
  readonly feature: "fold-cache"
  readonly reason: string
}

/**
 * A stored entry is not what an honest node could have written.
 *
 * Three ways that happens, and none of them is a merge conflict. Bytes that are
 * not the canonical encoding of the value they decode to were mangled in
 * transit or in storage. Two different byte strings under one key mean one side
 * is corrupt or SHA-256 broke, because the key already names the computation
 * and the exact history — one name can only ever mean one result. Bytes that
 * disagree with a fresh fold of the offered history mean the same thing, caught
 * by actually running the fold rather than by comparing two stored claims.
 *
 * This is the refusal that must never be resolved by picking a side. Picking a
 * side is how a corrupt entry becomes the consensus answer.
 */
export type CorruptEntry = {
  readonly _tag: "CorruptEntry"
  readonly feature: "fold-cache"
  readonly key: string
  readonly cause: "non-canonical-bytes" | "key-collision" | "fold-disagreement"
  readonly reason: string
}

/**
 * The backing store could not answer. This one is economic: it appears on the
 * `Backing` and `Federation` interfaces, where an operator needs to hear it, and
 * never on `runCached`, where a store that cannot be reached is simply a miss.
 */
export type BackingUnavailable = {
  readonly _tag: "BackingUnavailable"
  readonly feature: "fold-cache"
  readonly reason: string
}

/** Every refusal this package can raise, for a caller that handles them as one. */
export type CacheRefusal = IdentityUnavailable | CorruptEntry | BackingUnavailable

export const corruptEntry = (
  key: string,
  cause: CorruptEntry["cause"],
  reason: string,
): CorruptEntry => ({ _tag: "CorruptEntry", feature: "fold-cache", key, cause, reason })

export const backingUnavailable = (reason: string): BackingUnavailable => ({
  _tag: "BackingUnavailable",
  feature: "fold-cache",
  reason,
})

/**
 * Unwraps the core cache's `{ ok: false, refusal }` return into the bare
 * refusal an Effect failure channel carries. The reason is copied, never
 * rewritten: the core cache already said which half of the fold is anonymous,
 * and restating it here in this module's own words would be a second
 * explanation free to drift from the first.
 */
export const identityUnavailable = (
  refused: CoreIdentityUnavailable,
): IdentityUnavailable => ({
  _tag: "IdentityUnavailable",
  feature: "fold-cache",
  reason: refused.refusal.reason,
})
