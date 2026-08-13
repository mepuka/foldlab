/** Immutable memo entries: a fold digest plus a history head names one result. */

import { encodeFoldState, type CanonicalEncoding, type FoldState } from "./algebra.ts"
import type { Fold } from "./fold.ts"
import type { Head } from "./stream.ts"

interface CacheEntry {
  readonly bytes: string
}

export interface FoldCache {
  readonly entries: ReadonlyMap<string, CacheEntry>
}

export type IdentityUnavailable = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "IdentityUnavailable"
    readonly feature: "fold-cache"
    readonly reason: string
  }
}

export type CacheWrite =
  | { readonly ok: true; readonly cache: FoldCache; readonly bytes: string }
  | IdentityUnavailable
  | Exclude<CanonicalEncoding, { readonly ok: true }>

export type CacheRead<A extends FoldState> =
  | { readonly ok: true; readonly hit: false }
  | { readonly ok: true; readonly hit: true; readonly value: A; readonly bytes: string }
  | IdentityUnavailable

const identityRefusal = (fold: Fold<unknown, FoldState>): IdentityUnavailable => ({
  ok: false,
  refusal: {
    _tag: "IdentityUnavailable",
    feature: "fold-cache",
    reason: fold.algebra.declaration === undefined
      ? fold.algebra.identityIssue ?? "the algebra is anonymous"
      : fold.step.identityIssue ?? "the step is anonymous",
  },
})

const keyFor = <E, A extends FoldState>(fold: Fold<E, A>, head: Head): string | IdentityUnavailable =>
  fold.digest === undefined
    ? identityRefusal(fold as unknown as Fold<unknown, FoldState>)
    : `${fold.digest}:${head}`

/** Uniqueness makes the empty memo sufficient; no invalidation state exists. */
export const emptyFoldCache = (): FoldCache => ({ entries: new Map() })

/** Fold uniqueness licenses immutable insertion at `(fold digest, head)`. */
export const putFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
  value: A,
): CacheWrite => {
  const key = keyFor(fold, head)
  if (typeof key !== "string") return key
  const encoded = encodeFoldState(value)
  if (!encoded.ok) return encoded
  const entries = new Map(cache.entries)
  entries.set(key, { bytes: encoded.bytes })
  return { ok: true, cache: { entries }, bytes: encoded.bytes }
}

/** Fold uniqueness licenses a hit as the same value a fresh replay would produce. */
export const getFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
): CacheRead<A> => {
  const key = keyFor(fold, head)
  if (typeof key !== "string") return key
  const entry = cache.entries.get(key)
  if (entry === undefined) return { ok: true, hit: false }
  return {
    ok: true,
    hit: true,
    value: JSON.parse(entry.bytes) as A,
    bytes: entry.bytes,
  }
}

// Follow-on only: downstream work may key on state digest for early cutoff.
