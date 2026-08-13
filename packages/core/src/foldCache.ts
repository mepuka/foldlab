/** Immutable memo entries: a fold digest plus a history head names one result. */

import {
  encodeFoldState,
  hasAdmittedDeclaration,
  type CanonicalEncoding,
  type FoldState,
} from "./algebra.ts"
import { isAdmittedFold, type Fold } from "./fold.ts"
import type { Head } from "./stream.ts"

interface CacheEntry {
  readonly bytes: string
}

const FoldCacheTypeId: unique symbol = Symbol("@foldlab/core/FoldCache")

export interface FoldCache {
  readonly [FoldCacheTypeId]: true
}

const cacheStorage = new WeakMap<FoldCache, ReadonlyMap<string, CacheEntry>>()

export type IdentityUnavailable = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "IdentityUnavailable"
    readonly feature: "fold-cache"
    readonly reason: string
  }
}

export type CacheUnavailable = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "CacheUnavailable"
    readonly feature: "fold-cache"
    readonly reason: "the cache was not issued by emptyFoldCache or putFoldCache"
  }
}

export type CacheConflict = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "CacheConflict"
    readonly feature: "fold-cache"
    readonly reason: "the cache key already names different canonical bytes"
  }
}

export type CacheWrite =
  | { readonly ok: true; readonly cache: FoldCache; readonly bytes: string }
  | IdentityUnavailable
  | CacheUnavailable
  | CacheConflict
  | Exclude<CanonicalEncoding, { readonly ok: true }>

export type CacheRead<A extends FoldState> =
  | { readonly ok: true; readonly hit: false }
  | { readonly ok: true; readonly hit: true; readonly value: A; readonly bytes: string }
  | IdentityUnavailable
  | CacheUnavailable

const identityRefusal = (fold: Fold<unknown, FoldState>): IdentityUnavailable => ({
  ok: false,
  refusal: {
    _tag: "IdentityUnavailable",
    feature: "fold-cache",
    reason: !hasAdmittedDeclaration(fold.algebra)
      ? fold.algebra.identityIssue ?? (fold.algebra.declaration === undefined
        ? "the algebra is anonymous"
        : "the algebra declaration is not admitted")
      : !hasAdmittedDeclaration(fold.step)
      ? fold.step.identityIssue ?? (fold.step.declaration === undefined
        ? "the step is anonymous"
        : "the step declaration is not admitted")
      : "the fold identity is unavailable",
  },
})

const keyFor = <E, A extends FoldState>(fold: Fold<E, A>, head: Head): string | IdentityUnavailable =>
  !isAdmittedFold(fold)
    ? {
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "the fold has no admitted identity",
      },
    }
    : fold.digest === undefined
    ? identityRefusal(fold as unknown as Fold<unknown, FoldState>)
    : `${fold.digest}:${head}`

const unavailableCache = (): CacheUnavailable => ({
  ok: false,
  refusal: {
    _tag: "CacheUnavailable",
    feature: "fold-cache",
    reason: "the cache was not issued by emptyFoldCache or putFoldCache",
  },
})

const issueCache = (entries: ReadonlyMap<string, CacheEntry>): FoldCache => {
  const cache: FoldCache = Object.freeze({ [FoldCacheTypeId]: true as const })
  cacheStorage.set(cache, entries)
  return cache
}

/** Uniqueness makes the empty memo sufficient; no invalidation state exists. */
export const emptyFoldCache = (): FoldCache => issueCache(new Map())

/** Fold uniqueness licenses immutable insertion at `(fold digest, head)`. */
export const putFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
  value: A,
): CacheWrite => {
  const current = cacheStorage.get(cache)
  if (current === undefined) return unavailableCache()
  const key = keyFor(fold, head)
  if (typeof key !== "string") return key
  const encoded = encodeFoldState(value)
  if (!encoded.ok) return encoded
  const existing = current.get(key)
  if (existing !== undefined) {
    return existing.bytes === encoded.bytes
      ? { ok: true, cache, bytes: encoded.bytes }
      : {
        ok: false,
        refusal: {
          _tag: "CacheConflict",
          feature: "fold-cache",
          reason: "the cache key already names different canonical bytes",
        },
      }
  }
  const entries = new Map(current)
  entries.set(key, { bytes: encoded.bytes })
  return { ok: true, cache: issueCache(entries), bytes: encoded.bytes }
}

/** Fold uniqueness licenses a hit as the same value a fresh replay would produce. */
export const getFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
): CacheRead<A> => {
  const entries = cacheStorage.get(cache)
  if (entries === undefined) return unavailableCache()
  const key = keyFor(fold, head)
  if (typeof key !== "string") return key
  const entry = entries.get(key)
  if (entry === undefined) return { ok: true, hit: false }
  return {
    ok: true,
    hit: true,
    value: JSON.parse(entry.bytes) as A,
    bytes: entry.bytes,
  }
}

// Follow-on only: downstream work may key on state digest for early cutoff.
