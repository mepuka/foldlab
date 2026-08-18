import { describe, expect, test } from "bun:test"

import { Effect, Layer, Option } from "effect"

import type { WireValue } from "../src/Canonical.js"
import { Catalog, Payloads, type CatalogService } from "../src/Catalog.js"
import { digestOf, type Digest } from "../src/Digest.js"
import type { Refusal } from "../src/Refusal.js"
import { ResolveCache, publish, type ResolveCacheService } from "../src/Resolved.js"

const terms = { alpha: "one", beta: "two" }
const other = { alpha: "ONE", beta: "two" }
const termsDigest = Effect.runSync(digestOf(terms))
const otherDigest = Effect.runSync(digestOf(other))

/**
 * A catalog that counts the reads reaching it. Every claim in this suite is a
 * claim about how often the store below the memo is asked, so the count is the
 * evidence and the service is otherwise the shipped in-memory one.
 */
interface CountingCatalog {
  readonly service: CatalogService
  readonly reads: () => number
  /** Answers every read with the wrong value while this is set. */
  tamper: WireValue | undefined
  /** Runs before each answer; the seam a concurrency test suspends on. */
  before: Effect.Effect<void>
}

const countingCatalog = (): CountingCatalog => {
  const store = new Map<string, WireValue>()
  let reads = 0
  const counting: CountingCatalog = {
    tamper: undefined,
    before: Effect.void,
    reads: () => reads,
    service: {
      get: (digest) =>
        Effect.gen(function* () {
          reads++
          yield* counting.before
          if (counting.tamper !== undefined) return Option.some(counting.tamper)
          return Option.fromNullishOr(store.get(digest))
        }),
      put: (value) =>
        Effect.gen(function* () {
          const digest = yield* digestOf(value)
          store.set(digest, value)
          return digest
        }),
    },
  }
  return counting
}

/**
 * The memo over one counting store, with the substrate also in the program's
 * own context so a test can publish through the same store it resolves from.
 */
const layerOver = (catalog: CountingCatalog, capacity: number) => {
  const substrate = Layer.mergeAll(Catalog.testLayer(catalog.service), Payloads.layer)
  return Layer.mergeAll(
    substrate,
    Layer.provide(ResolveCache.layer({ capacity }), substrate),
  )
}

describe("the resolve cache", () => {
  test("a success is memoized forever: the store is asked once", () => {
    const catalog = countingCatalog()
    const resolved = Effect.runSync(
      Effect.gen(function* () {
        const cache = yield* ResolveCache
        yield* publish(terms)
        const first = yield* cache.resolve(termsDigest)
        const second = yield* cache.resolve(termsDigest)
        const third = yield* cache.resolve(termsDigest)
        return [first, second, third]
      }).pipe(Effect.provide(layerOver(catalog, 8))),
    )
    expect(resolved).toEqual([terms, terms, terms])
    expect(catalog.reads()).toBe(1)
  })

  test("a failure is never cached: a resolve retried after publication succeeds", () => {
    // The fence made executable. An absence is head-relative — it says this
    // store does not hold the value YET — so recording it would turn a
    // retryable observation into a permanent one, which is exactly what F8
    // forbids and what a naive memo would do.
    const catalog = countingCatalog()
    const outcome = Effect.runSync(
      Effect.gen(function* () {
        const cache = yield* ResolveCache
        const refusal = yield* Effect.flip(cache.resolve(termsDigest))
        const readsAfterRefusal = catalog.reads()
        yield* publish(terms)
        const resolved = yield* cache.resolve(termsDigest)
        return { refusal, readsAfterRefusal, resolved }
      }).pipe(Effect.provide(layerOver(catalog, 8))),
    )
    expect(outcome.refusal.sort).toBe("absence")
    expect(outcome.refusal.kind).toBe("cataloged-value-absent")
    expect(outcome.readsAfterRefusal).toBe(1)
    expect(outcome.resolved).toEqual(terms)
    // The second resolve went to the store rather than to a remembered absence.
    expect(catalog.reads()).toBe(2)
  })

  test("the memo decorates the verified seam: a tampered store is still refused", () => {
    // Why the cache is not on `Catalog.get` (T18): the store below it is
    // deliberately unverified, so a memo there would hold whatever the store
    // said. This one holds only values that passed re-derivation, and the
    // refusal it does not hold is repealed the moment the store tells the truth.
    const catalog = countingCatalog()
    const outcome = Effect.runSync(
      Effect.gen(function* () {
        const cache = yield* ResolveCache
        yield* publish(terms)
        catalog.tamper = other
        const refusal = yield* Effect.flip(cache.resolve(termsDigest))
        catalog.tamper = undefined
        const resolved = yield* cache.resolve(termsDigest)
        return { refusal, resolved }
      }).pipe(Effect.provide(layerOver(catalog, 8))),
    )
    expect(outcome.refusal.sort).toBe("structural")
    expect(outcome.refusal.kind).toBe("digest-mismatch")
    expect(outcome.refusal.expected).toBe(termsDigest)
    expect(outcome.refusal.got).toBe(otherDigest)
    expect(outcome.resolved).toEqual(terms)
    expect(catalog.reads()).toBe(2)
  })

  test("capacity bounds the memo and nothing else: an evicted digest re-resolves", () => {
    // Eviction is a memory budget, not a correctness event — the re-resolve
    // re-derives and returns the same value, which is what makes capacity
    // deployment configuration rather than something identity-bearing.
    const catalog = countingCatalog()
    const resolved = Effect.runSync(
      Effect.gen(function* () {
        const cache = yield* ResolveCache
        yield* publish(terms)
        yield* publish(other)
        const first = yield* cache.resolve(termsDigest)
        yield* cache.resolve(otherDigest)
        const again = yield* cache.resolve(termsDigest)
        return { first, again }
      }).pipe(Effect.provide(layerOver(catalog, 1))),
    )
    expect(resolved.first).toEqual(terms)
    expect(resolved.again).toEqual(terms)
    expect(catalog.reads()).toBe(3)
  })

  test("concurrent resolves of one digest deduplicate onto one lookup", async () => {
    // The pinned cache's behaviour, not this module's: awaiters join the
    // entry's in-flight fiber rather than starting a second read.
    const catalog = countingCatalog()
    catalog.before = Effect.yieldNow
    const resolved = await Effect.runPromise(
      Effect.gen(function* () {
        const cache = yield* ResolveCache
        yield* publish(terms)
        return yield* Effect.all(
          [
            cache.resolve(termsDigest),
            cache.resolve(termsDigest),
            cache.resolve(termsDigest),
          ],
          { concurrency: "unbounded" },
        )
      }).pipe(Effect.provide(layerOver(catalog, 8))),
    )
    expect(resolved).toEqual([terms, terms, terms])
    expect(catalog.reads()).toBe(1)
  })

  test("keys are digests only, and the memoized seam carries no services", () => {
    // The fence at the type level: nothing anchor-shaped can be handed to this
    // surface, because the only thing it accepts is a digest.
    type Key = Parameters<ResolveCacheService["resolve"]>[0]
    const keyProof: [Key] extends [Digest] ? true : false = true
    const digestProof: [Digest] extends [Key] ? true : false = true
    const layerProof: Layer.Layer<ResolveCache, never, Catalog | Payloads> = ResolveCache
      .layer({ capacity: 1 })
    expect(keyProof && digestProof && layerProof !== undefined).toBe(true)

    const catalog = countingCatalog()
    expect(
      Effect.runSync(
        Effect.gen(function* () {
          const cache = yield* ResolveCache
          // The layer captured `Catalog | Payloads` at construction, so this
          // annotation compiles only while the memoized seam's channel is empty.
          const clean: Effect.Effect<WireValue, Refusal> = cache.resolve(termsDigest)
          return yield* Effect.flip(clean)
        }).pipe(Effect.provide(layerOver(catalog, 1))),
      ).kind,
    ).toBe("cataloged-value-absent")
  })
})
