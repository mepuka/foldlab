import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import { algebras, encodeFoldState, steps, type Algebra } from "../src/algebra.ts"
import {
  emptyFoldCache,
  getFoldCache,
  putFoldCache,
} from "../src/foldCache.ts"
import { defineFold } from "../src/fold.ts"
import { arbitraryForEvent } from "../src/foldArbitrary.ts"
import { headFrom, mergeSeed, type StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

describe("sound fold cache", () => {
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
})
