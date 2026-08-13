import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import { algebras, encodeFoldState, steps, type Algebra } from "../src/algebra.ts"
import {
  emptyFoldCache,
  getFoldCache,
  putFoldCache,
  type FoldCache,
} from "../src/foldCache.ts"
import { defineFold } from "../src/fold.ts"
import { arbitraryForEvent } from "../src/foldArbitrary.ts"
import { headFrom, mergeSeed, type StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

describe("sound fold cache", () => {
  test("cache writes return a typed refusal beyond the constrained JSON depth", () => {
    const nested = (depth: number): unknown => {
      let value: unknown = null
      for (let index = 0; index < depth; index++) value = [value]
      return value
    }

    expect(encodeFoldState(nested(256) as never).ok).toBe(true)

    const atBoundary = putFoldCache(
      emptyFoldCache(),
      primitiveFolds.setUnion,
      mergeSeed(),
      nested(257) as ReadonlyArray<string>,
    )
    expect(atBoundary).toMatchObject({
      ok: false,
      refusal: {
        _tag: "NonCanonicalValue",
        reason: "nesting exceeds 256",
      },
    })

    expect(() => putFoldCache(
      emptyFoldCache(),
      primitiveFolds.setUnion,
      mergeSeed(),
      nested(20_000) as ReadonlyArray<string>,
    )).not.toThrow()
  })

  test("a cache hit byte-equals a fresh fold", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.array(arbitraryForEvent<StreamEvent>({ kind: "streamEvent" }), { maxLength: 64 }),
        (events) => {
        const head = headFrom(mergeSeed(), events)
        const fresh = primitiveFolds.sum.fold(events)
        const empty = emptyFoldCache()
        const write = putFoldCache(empty, primitiveFolds.sum, head, fresh)
        expect(write.ok).toBe(true)
        if (!write.ok) return

        expect(getFoldCache(empty, primitiveFolds.sum, head)).toEqual({ ok: true, hit: false })
        const hit = getFoldCache(write.cache, primitiveFolds.sum, head)
        expect(hit.ok).toBe(true)
        if (!hit.ok || !hit.hit) return
        const freshBytes = encodeFoldState(primitiveFolds.sum.fold(events))
        expect(freshBytes.ok).toBe(true)
        if (!freshBytes.ok) return
        expect(hit.bytes).toBe(freshBytes.bytes)
        expect(hit.value).toBe(fresh)
        },
      ),
      {
        examples: [[foldFixtureEvents]],
        seed: 0x07ca_0001,
        numRuns: 250,
        endOnFailure: false,
      },
    )
  })

  test("anonymous algebras and steps remain usable but refuse cache identity", () => {
    const anonymous: Algebra<number> = {
      empty: 0,
      combine: (left, right) => left + right,
    }
    const fold = defineFold<StreamEvent, number>(anonymous, (input) => input.payload.length)
    expect(fold.fold(foldFixtureEvents)).toBe(15)
    expect(fold.digest).toBeUndefined()
    expect(putFoldCache(emptyFoldCache(), fold, mergeSeed(), 15)).toEqual({
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "the algebra is anonymous",
      },
    })
  })

  test("a declared algebra with an anonymous step names the missing identity", () => {
    const fold = defineFold<StreamEvent, number>(algebras.sum, (input) => input.payload.length)
    const read = getFoldCache(emptyFoldCache(), fold, mergeSeed())
    expect(read).toEqual({
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "the step is anonymous",
      },
    })
  })

  test("a non-canonical declared-step request becomes an identity refusal", () => {
    const step = steps.payloadNumber(["\ud800"])
    const fold = defineFold(algebras.max, step)
    expect(fold.digest).toBeUndefined()
    expect(putFoldCache(emptyFoldCache(), fold, mergeSeed(), null)).toEqual({
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "step spec is outside the RFC 8785 domain",
      },
    })
  })

  test("a spread fold retaining an honest digest cannot poison the cache", () => {
    const honest = primitiveFolds.sum
    const forged = {
      ...honest,
      empty: 999,
      extend: () => 999,
      fold: () => 999,
    }
    const write = putFoldCache(emptyFoldCache(), forged, mergeSeed(), 999)
    const refusal = {
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "the fold has no admitted identity",
      },
    } as const
    expect(write).toEqual(refusal)
    expect(getFoldCache(emptyFoldCache(), forged, mergeSeed())).toEqual(refusal)
    expect(getFoldCache(emptyFoldCache(), honest, mergeSeed())).toEqual({ ok: true, hit: false })
  })

  test("an unbranded declaration costume cannot mint an honest cache key", () => {
    const honest = primitiveFolds.sum
    const declaration = algebras.sum.declaration!
    const costume = defineFold<StreamEvent, number>({
      empty: 0,
      combine: () => 999,
      declaration: {
        [Symbol.for("@foldlab/core/Declaration")]: true,
        spec: declaration.spec,
        encoding: declaration.encoding,
        digest: declaration.digest,
      },
    } as unknown as Algebra<number>, steps.payloadLength)

    expect(costume.digest).toBeUndefined()
    expect(putFoldCache(emptyFoldCache(), costume, mergeSeed(), 999)).toEqual({
      ok: false,
      refusal: {
        _tag: "IdentityUnavailable",
        feature: "fold-cache",
        reason: "the algebra declaration is not admitted",
      },
    })
    expect(getFoldCache(emptyFoldCache(), honest, mergeSeed())).toEqual({ ok: true, hit: false })
  })

  test("cache storage is opaque and structurally fabricated caches refuse", () => {
    const honest = primitiveFolds.sum
    const head = mergeSeed()
    const key = `${honest.digest}:${head}`
    const empty = emptyFoldCache()
    const exposed = (empty as unknown as {
      readonly entries?: Map<string, { readonly bytes: string }>
    }).entries
    expect(exposed).toBeUndefined()
    exposed?.set(key, { bytes: "999" })
    expect(getFoldCache(empty, honest, head)).toEqual({ ok: true, hit: false })

    const fabricated = {
      entries: new Map([[key, { bytes: "999" }]]),
    } as unknown as FoldCache
    expect(getFoldCache(fabricated, honest, head)).toEqual({
      ok: false,
      refusal: {
        _tag: "CacheUnavailable",
        feature: "fold-cache",
        reason: "the cache was not issued by emptyFoldCache or putFoldCache",
      },
    })
  })

  test("an existing cache key is idempotent but cannot be overwritten", () => {
    const honest = primitiveFolds.sum
    const head = mergeSeed()
    const first = putFoldCache(emptyFoldCache(), honest, head, 1)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const same = putFoldCache(first.cache, honest, head, 1)
    expect(same).toEqual({ ok: true, cache: first.cache, bytes: "1" })
    expect(putFoldCache(first.cache, honest, head, 999)).toEqual({
      ok: false,
      refusal: {
        _tag: "CacheConflict",
        feature: "fold-cache",
        reason: "the cache key already names different canonical bytes",
      },
    })
    expect(getFoldCache(first.cache, honest, head)).toEqual({
      ok: true,
      hit: true,
      value: 1,
      bytes: "1",
    })
  })

  test("KNOWN GAP: a genuine declaration re-host can poison its honest digest peer", () => {
    const honest = primitiveFolds.max
    const rehosted = defineFold<StreamEvent, number | null>({
      empty: null,
      combine: () => 999,
      declaration: algebras.max.declaration!,
    }, steps.sequenceNumber)
    expect(rehosted.digest).toBe(honest.digest)

    const write = putFoldCache(emptyFoldCache(), rehosted, mergeSeed(), 999)
    expect(write.ok).toBe(true)
    if (!write.ok) return
    expect(getFoldCache(write.cache, honest, mergeSeed())).toEqual({
      ok: true,
      hit: true,
      value: 999,
      bytes: "999",
    })
  })
})
