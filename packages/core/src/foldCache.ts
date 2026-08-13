/**
 * The fold cache: a fold's digest together with a history head names exactly
 * one result.
 *
 * Both halves of the key are already commitments — the digest names the
 * computation and the head names the exact history it ran over — so an entry
 * cannot become wrong as more events arrive; a longer history simply has a
 * different head and a different key. There is nothing to invalidate here and
 * no expiry, and entries are never edited in place: a write returns a new cache
 * and leaves the one it was given untouched.
 */

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

/**
 * A handle to a set of cached results. The entries are held outside the handle,
 * so the handle carries no readable state and an object wearing the same shape
 * carries no entries. Such an impostor is refused rather than read as an empty
 * cache, which would otherwise turn a structural costume into a permanent run
 * of silent misses.
 */
export interface FoldCache {
  readonly [FoldCacheTypeId]: true
}

const cacheStorage = new WeakMap<FoldCache, ReadonlyMap<string, CacheEntry>>()

/**
 * The fold offered has no name to be keyed by: it was not built by this
 * package, or one of its halves is anonymous. The reason repeats whatever the
 * algebra or the step already said about itself, so a caller learns which half
 * to declare rather than only that something was missing.
 */
export type IdentityUnavailable = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "IdentityUnavailable"
    readonly feature: "fold-cache"
    readonly reason: string
  }
}

/**
 * The handle was not issued here, so there are no entries behind it. Refusing
 * keeps a miss meaning "not stored yet" instead of also meaning "asked the
 * wrong thing".
 */
export type CacheUnavailable = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "CacheUnavailable"
    readonly feature: "fold-cache"
    readonly reason: "the cache was not issued by emptyFoldCache or putFoldCache"
  }
}

/**
 * The key already names different bytes. One name may only ever mean one
 * result, so the disagreement is surfaced instead of being resolved by
 * overwriting or by keeping the older entry — either choice would hide the fact
 * that two answers claimed the same name. Rewriting a key with the identical
 * bytes is not a conflict and succeeds.
 */
export type CacheConflict = {
  readonly ok: false
  readonly refusal: {
    readonly _tag: "CacheConflict"
    readonly feature: "fold-cache"
    readonly reason: "the cache key already names different canonical bytes"
  }
}

/**
 * What a write can answer: the new cache with the stored bytes, or one of the
 * four refusals — no name, no cache, a name already meaning something else, or
 * a value the canonical encoder will not accept. Every one is a returned value;
 * a write never throws.
 */
export type CacheWrite =
  | { readonly ok: true; readonly cache: FoldCache; readonly bytes: string }
  | IdentityUnavailable
  | CacheUnavailable
  | CacheConflict
  | Exclude<CanonicalEncoding, { readonly ok: true }>

/**
 * What a read can answer: a miss, a hit carrying both the value and the bytes
 * it was stored as, or a refusal. A miss is a success — nothing is stored under
 * that name yet — and is kept distinct from the two refusals, which mean the
 * question itself could not be asked.
 */
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

/**
 * The name a result is filed under: the fold's digest and the history head,
 * together.
 *
 * The pair is the whole licensing law. A fold is a function of the computation
 * and the history it ran over, and both of those already have names, so the two
 * names taken together name exactly one result — which is what makes the key
 * safe to hand to a store that has never seen the fold and cannot recompute it.
 * Two nodes deriving a key for the same fold over the same history derive the
 * same string; two entries under one key that differ in bytes are not a merge
 * conflict but proof that one of them is corrupt.
 *
 * Exported so a store outside this module files entries under the same name
 * this module reads them by. A caller assembling the string itself would be a
 * second key rule, free to drift from this one, and drift here does not surface
 * as an error — it surfaces as a cache that silently never hits, or worse,
 * hits on the wrong thing.
 *
 * Refuses with `IdentityUnavailable`, as a returned value, for a fold with no
 * admitted name — the same refusal the read and write sides return, for the
 * same reason.
 */
export const foldCacheKey = <E, A extends FoldState>(
  fold: Fold<E, A>,
  head: Head,
): string | IdentityUnavailable =>
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

/**
 * Issues an empty cache. Starting empty is the only construction needed:
 * because a key already names both the computation and the exact history, an
 * entry can never go stale, so there is no invalidation state for a cache to
 * carry and nothing for a fresh one to inherit.
 */
export const emptyFoldCache = (): FoldCache => issueCache(new Map())

/**
 * Records what a fold produced over one history, returning a new cache; the
 * cache passed in keeps whatever it had.
 *
 * The entry is filed under the fold's digest with the history head and stored
 * as canonical bytes, so storing the same result twice is recognised as the
 * same entry rather than as a disagreement.
 *
 * Refuses in four ways, all as returned values: `CacheUnavailable` when the
 * handle was not issued here, `IdentityUnavailable` when the fold has no name
 * to be keyed by, `CacheConflict` when that name already means different bytes,
 * and the encoder's own refusal when the value has no canonical form.
 *
 * A standing limit: a key names declarations, not behavior. A fold assembled
 * from a genuine declaration re-hosted onto a foreign combine carries the same
 * digest as its honest counterpart, so it can write under that shared name and
 * be read back as the honest fold's result. No consumer yet depends on the
 * distinction.
 */
export const putFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
  value: A,
): CacheWrite => {
  const current = cacheStorage.get(cache)
  if (current === undefined) return unavailableCache()
  const key = foldCacheKey(fold, head)
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

/**
 * Looks up what a fold produced over one history.
 *
 * A hit is the value a fresh fold over that same history would produce, rebuilt
 * from the stored canonical bytes rather than from a shared object, so a caller
 * cannot reach back and alter what a later reader sees. A miss is an ordinary
 * success. Refuses with `CacheUnavailable` for a handle not issued here and
 * `IdentityUnavailable` for a fold with no name, and carries the same standing
 * limit on re-hosted declarations as the write side.
 */
export const getFoldCache = <E, A extends FoldState>(
  cache: FoldCache,
  fold: Fold<E, A>,
  head: Head,
): CacheRead<A> => {
  const entries = cacheStorage.get(cache)
  if (entries === undefined) return unavailableCache()
  const key = foldCacheKey(fold, head)
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

// A key names a history, not the state that history folded to. Two different
// histories reaching the same state are stored separately, and a repeated state
// is never recognised as one — nothing here cuts a fold short on that ground.
