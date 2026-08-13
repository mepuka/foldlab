/**
 * The interface's test surface: the laws that license each public function, and
 * the negative controls that show each gate can fail.
 *
 * Four claims are checked. Cache union is a join-semilattice, so any gossip
 * order converges. `runCached` equals `run`, so the cache is invisible. A
 * corrupt entry is refused and never returned. Eviction can change what a cache
 * costs and never what it answers.
 */

import { algebras, encodeFoldState, steps } from "@foldlab/core/algebra"
import { defineFold } from "@foldlab/core/fold"
import { foldCacheKey } from "@foldlab/core/foldCache"
import { arbitraryForEvent } from "@foldlab/core/foldArbitrary"
import { headFrom, mergeSeed, type Head, type StreamEvent } from "@foldlab/core/stream"
import { describe, expect, test } from "bun:test"
import { Duration, Effect, Layer, Stream } from "effect"
import * as FastCheck from "fast-check"
import { absorb, Backing, BackingInMemory, type Snapshot } from "../src/backing.ts"
import { Eviction, EvictionCap, EvictionNever, sweep } from "../src/eviction.ts"
import {
  Federation,
  peerOf,
  unionSnapshots,
  type MergeReport,
  type Peer,
} from "../src/federation.ts"
import { FoldCache, FoldCacheLive, FoldCacheVerified } from "../src/foldCache.ts"
import { FederatedFoldCache, LocalFoldCache, VerifiedFoldCache } from "../src/layers.ts"
import { backingUnavailable } from "../src/refusal.ts"

const sumFold = defineFold<StreamEvent, number>(algebras.sum, steps.payloadLength)
const anonymousFold = defineFold<StreamEvent, number>(
  algebras.sum,
  (event) => event.payload.length,
)

const historyArb = FastCheck.array(
  arbitraryForEvent<StreamEvent>({ kind: "streamEvent" }),
  { maxLength: 24 },
)

const keyOf = (head: Head): string => {
  const key = foldCacheKey(sumFold, head)
  if (typeof key !== "string") throw new Error(key.refusal.reason)
  return key
}

const bytesOf = (value: number): string => {
  const encoded = encodeFoldState(value)
  if (!encoded.ok) throw new Error(encoded.refusal.reason)
  return encoded.bytes
}

/** Snapshots compare by content, not by insertion order — they are sets. */
const show = (snapshot: Snapshot): string =>
  [...snapshot]
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
    .map(([key, bytes]) => `${key}=${bytes}`)
    .join("|")

/** A store that always fails, to prove unreachability costs time and not answers. */
const BackingBroken: Layer.Layer<Backing> = Layer.sync(Backing, () => ({
  read: () => Effect.fail(backingUnavailable("the store is down")),
  write: () => Effect.fail(backingUnavailable("the store is down")),
  snapshot: Effect.fail(backingUnavailable("the store is down")),
  stats: Effect.fail(backingUnavailable("the store is down")),
  drop: () => Effect.fail(backingUnavailable("the store is down")),
}))

describe("the cache is invisible", () => {
  test("runCached equals a fresh fold, cold and warm", () => {
    FastCheck.assert(
      FastCheck.property(historyArb, (events) => {
        const head = headFrom(mergeSeed(), events)
        const expected = sumFold.fold(events)
        const program = Effect.gen(function*() {
          const cache = yield* FoldCache
          const cold = yield* cache.runCached(sumFold, head, Effect.succeed(events))
          const warm = yield* cache.runCached(sumFold, head, Effect.succeed(events))
          return [cold, warm] as const
        })
        const [cold, warm] = Effect.runSync(Effect.provide(program, LocalFoldCache))
        expect(cold).toBe(expected)
        expect(warm).toBe(expected)
      }),
      { seed: 0x0fc0_0001, numRuns: 200, endOnFailure: false },
    )
  })

  test("verifying every hit does not change any answer", () => {
    FastCheck.assert(
      FastCheck.property(historyArb, (events) => {
        const head = headFrom(mergeSeed(), events)
        const program = Effect.gen(function*() {
          const cache = yield* FoldCache
          yield* cache.runCached(sumFold, head, Effect.succeed(events))
          return yield* cache.runCached(sumFold, head, Effect.succeed(events))
        })
        expect(Effect.runSync(Effect.provide(program, VerifiedFoldCache)))
          .toBe(sumFold.fold(events))
      }),
      { seed: 0x0fc0_0002, numRuns: 200, endOnFailure: false },
    )
  })

  test("a hit never reads the history; a verified hit always does", () => {
    const events = [
      { stream: "alpha", seq: 1, payload: new TextEncoder().encode("a=1") },
      { stream: "alpha", seq: 2, payload: new TextEncoder().encode("b=22") },
    ]
    const head = headFrom(mergeSeed(), events)
    const counted = (): { readonly history: Effect.Effect<typeof events>; reads: () => number } => {
      let reads = 0
      return {
        history: Effect.sync(() => {
          reads++
          return events
        }),
        reads: () => reads,
      }
    }
    const twice = (source: Effect.Effect<typeof events>) =>
      Effect.gen(function*() {
        const cache = yield* FoldCache
        yield* cache.runCached(sumFold, head, source)
        yield* cache.runCached(sumFold, head, source)
      })

    const local = counted()
    Effect.runSync(Effect.provide(twice(local.history), LocalFoldCache))
    expect(local.reads()).toBe(1)

    const verified = counted()
    Effect.runSync(Effect.provide(twice(verified.history), VerifiedFoldCache))
    expect(verified.reads()).toBe(2)
  })

  test("a store that cannot be reached is a miss, not a failure", () => {
    const events: ReadonlyArray<StreamEvent> = []
    const head = headFrom(mergeSeed(), events)
    const program = Effect.gen(function*() {
      const cache = yield* FoldCache
      return yield* cache.runCached(sumFold, head, Effect.succeed(events))
    })
    const stack = Layer.provide(FoldCacheLive, BackingBroken)
    expect(Effect.runSync(Effect.provide(program, stack))).toBe(sumFold.fold(events))
  })

  test("a fold with no admitted name is refused, not silently uncached", () => {
    const events: ReadonlyArray<StreamEvent> = []
    const head = headFrom(mergeSeed(), events)
    const program = Effect.gen(function*() {
      const cache = yield* FoldCache
      return yield* Effect.result(
        cache.runCached(anonymousFold, head, Effect.succeed(events)),
      )
    })
    const outcome = Effect.runSync(Effect.provide(program, LocalFoldCache))
    expect(outcome._tag).toBe("Failure")
    if (outcome._tag !== "Failure") return
    expect(outcome.failure).toEqual({
      _tag: "IdentityUnavailable",
      feature: "fold-cache",
      reason: "the step is anonymous",
    })
  })
})

describe("cache union is a join-semilattice", () => {
  // One universe of correct entries: every key names one byte string, which is
  // the situation any two honest caches are in.
  const agreeing: ReadonlyArray<readonly [string, string]> = [
    ["k1", "1"],
    ["k2", "2"],
    ["k3", "[1,2]"],
    ["k4", "{\"a\":1}"],
    ["k5", "null"],
  ]
  const agreeingArb = FastCheck.subarray([...agreeing]).map(
    (pairs): Snapshot => new Map(pairs),
  )
  const joined = (left: Snapshot, right: Snapshot): Snapshot => {
    const union = unionSnapshots(left, right)
    if (!union.ok) throw new Error(union.refusal.reason)
    return union.snapshot
  }

  test("idempotent, commutative, associative", () => {
    FastCheck.assert(
      FastCheck.property(agreeingArb, agreeingArb, agreeingArb, (a, b, c) => {
        expect(show(joined(a, a))).toBe(show(a))
        expect(show(joined(a, b))).toBe(show(joined(b, a)))
        expect(show(joined(joined(a, b), c))).toBe(show(joined(a, joined(b, c))))
      }),
      { seed: 0x0fc0_0003, numRuns: 400, endOnFailure: false },
    )
  })

  // The negative control. Same generator, but keys may carry two different byte
  // strings — the only situation a merge rule can be wrong about. Our union
  // refuses both ways round; last-writer-wins answers both ways round, and
  // differently, which is what makes it unfit to federate.
  const conflicting: ReadonlyArray<readonly [string, string]> = [
    ["k1", "1"],
    ["k1", "2"],
    ["k2", "3"],
    ["k2", "4"],
  ]
  const conflictingArb = FastCheck.subarray([...conflicting]).map(
    (pairs): Snapshot => new Map(pairs),
  )
  const lastWriterWins = (left: Snapshot, right: Snapshot): Snapshot =>
    new Map([...left, ...right])
  const orderFree = (
    union: (left: Snapshot, right: Snapshot) => Snapshot | undefined,
  ): FastCheck.IProperty<[Snapshot, Snapshot]> =>
    FastCheck.property(conflictingArb, conflictingArb, (a, b) => {
      const forward = union(a, b)
      const backward = union(b, a)
      if (forward === undefined || backward === undefined) {
        // A refusal is order-free too: both directions must refuse together.
        expect(forward).toBe(backward as undefined)
        return
      }
      expect(show(forward)).toBe(show(backward))
    })

  test("a collision is refused, and the refusal is order-free", () => {
    FastCheck.assert(
      orderFree((left, right) => {
        const union = unionSnapshots(left, right)
        return union.ok ? union.snapshot : undefined
      }),
      { seed: 0x0fc0_0004, numRuns: 400, endOnFailure: false },
    )
    const clash = unionSnapshots(new Map([["k1", "1"]]), new Map([["k1", "2"]]))
    expect(clash.ok).toBe(false)
    if (clash.ok) return
    expect(clash.refusal._tag).toBe("CorruptEntry")
    expect(clash.refusal.cause).toBe("key-collision")
  })

  test("negative control: last-writer-wins fails the same property", () => {
    const control = FastCheck.check(orderFree(lastWriterWins), {
      seed: 0x0fc0_0004,
      numRuns: 400,
      endOnFailure: false,
    })
    expect(control.failed).toBe(true)
  })
})

describe("verification is sound", () => {
  const events = [
    { stream: "alpha", seq: 1, payload: new TextEncoder().encode("a=1") },
  ]
  const head = headFrom(mergeSeed(), events)
  const honest = sumFold.fold(events)

  const withInjected = (
    stack: Layer.Layer<FoldCache, never, Backing>,
    bytes: string,
  ) => {
    const program = Effect.gen(function*() {
      const store = yield* Backing
      yield* store.write(keyOf(head), bytes)
      const cache = yield* FoldCache
      return yield* Effect.result(cache.runCached(sumFold, head, Effect.succeed(events)))
    })
    return Effect.runSync(Effect.provide(program, Layer.provideMerge(stack, BackingInMemory)))
  }

  test("bytes that are not canonical are refused by every stack", () => {
    for (const stack of [FoldCacheLive, FoldCacheVerified]) {
      // "1.0" decodes to 1 and re-encodes to "1": no honest writer produced it.
      const outcome = withInjected(stack, "1.0")
      expect(outcome._tag).toBe("Failure")
      if (outcome._tag !== "Failure") continue
      expect(outcome.failure._tag).toBe("CorruptEntry")
      if (outcome.failure._tag !== "CorruptEntry") continue
      expect(outcome.failure.cause).toBe("non-canonical-bytes")
    }
  })

  test("a canonical lie is refused by the verified stack", () => {
    const outcome = withInjected(FoldCacheVerified, bytesOf(honest + 1))
    expect(outcome._tag).toBe("Failure")
    if (outcome._tag !== "Failure") return
    expect(outcome.failure._tag).toBe("CorruptEntry")
    if (outcome.failure._tag !== "CorruptEntry") return
    expect(outcome.failure.cause).toBe("fold-disagreement")
  })

  test("negative control: without re-folding, the same lie is returned", () => {
    // This is what the verified Layer buys, stated as a fact rather than a
    // hope: the cheap check cannot catch a well-formed wrong answer.
    const outcome = withInjected(FoldCacheLive, bytesOf(honest + 1))
    expect(outcome._tag).toBe("Success")
    if (outcome._tag !== "Success") return
    expect(outcome.success).toBe(honest + 1)
  })

  test("a collision refuses the write rather than choosing a side", () => {
    const program = Effect.gen(function*() {
      const store = yield* Backing
      yield* store.write("k", "1")
      yield* store.write("k", "1")
      const again = yield* Effect.result(store.write("k", "2"))
      const held = yield* store.read("k")
      return [again, held] as const
    })
    const [again, held] = Effect.runSync(Effect.provide(program, BackingInMemory))
    expect(held).toBe("1")
    expect(again._tag).toBe("Failure")
    if (again._tag !== "Failure") return
    expect(again.failure._tag).toBe("CorruptEntry")
  })
})

describe("eviction is economic", () => {
  test("a sweep that drops everything cannot change an answer", () => {
    FastCheck.assert(
      FastCheck.property(historyArb, (events) => {
        const head = headFrom(mergeSeed(), events)
        const program = Effect.gen(function*() {
          const cache = yield* FoldCache
          const before = yield* cache.runCached(sumFold, head, Effect.succeed(events))
          const dropped = yield* sweep
          const after = yield* cache.runCached(sumFold, head, Effect.succeed(events))
          return [before, after, dropped] as const
        })
        const stack = Layer.provideMerge(
          Layer.provide(FoldCacheLive, BackingInMemory),
          Layer.merge(BackingInMemory, EvictionCap(0)),
        )
        const [before, after] = Effect.runSync(Effect.provide(program, stack))
        expect(after).toBe(before)
        expect(after).toBe(sumFold.fold(events))
      }),
      { seed: 0x0fc0_0005, numRuns: 150, endOnFailure: false },
    )
  })

  test("a policy naming keys that do not exist drops nothing", () => {
    const Invented: Layer.Layer<Eviction> = Layer.sync(Eviction, () => ({
      select: () => Effect.succeed(new Set(["not-a-key", "also-not-a-key"])),
    }))
    const program = Effect.gen(function*() {
      const store = yield* Backing
      yield* store.write("k", "1")
      const dropped = yield* sweep
      const held = yield* store.read("k")
      return [dropped, held] as const
    })
    const [dropped, held] = Effect.runSync(
      Effect.provide(program, Layer.merge(BackingInMemory, Invented)),
    )
    expect(dropped).toBe(0)
    expect(held).toBe("1")
  })

  test("the default keeps everything", () => {
    const program = Effect.gen(function*() {
      const store = yield* Backing
      yield* store.write("k", "1")
      return yield* sweep
    })
    expect(Effect.runSync(Effect.provide(program, Layer.merge(BackingInMemory, EvictionNever))))
      .toBe(0)
  })
})

describe("federation converges without coordination", () => {
  const alpha: Snapshot = new Map([["k1", "1"], ["k2", "2"]])
  const beta: Snapshot = new Map([["k2", "2"], ["k3", "3"]])

  const absorbing = (order: ReadonlyArray<Snapshot>) =>
    Effect.runSync(Effect.provide(
      Effect.gen(function*() {
        const store = yield* Backing
        for (const remote of order) yield* absorb(store, remote)
        return yield* store.snapshot
      }),
      BackingInMemory,
    ))

  test("any exchange order reaches the same store", () => {
    expect(show(absorbing([alpha, beta]))).toBe(show(absorbing([beta, alpha])))
    expect(show(absorbing([alpha, beta, alpha, beta]))).toBe(show(absorbing([alpha, beta])))
  })

  test("anti-entropy is monotone: the second round absorbs nothing", async () => {
    const peerStore = Effect.runSync(Effect.provide(
      Effect.gen(function*() {
        const store = yield* Backing
        yield* absorb(store, alpha)
        return store
      }),
      BackingInMemory,
    ))
    const peer: Peer = peerOf("alpha", peerStore)
    const program = Effect.gen(function*() {
      const federation = yield* Federation
      return yield* Stream.runCollect(
        Stream.take(federation.antiEntropy(Duration.millis(1)), 2),
      )
    })
    const reports: ReadonlyArray<MergeReport> = await Effect.runPromise(
      Effect.provide(program, FederatedFoldCache([peer])),
    )
    expect(reports.map((report) => report.absorbed)).toEqual([2, 0])
    expect(reports.every((report) => report.peer === "alpha")).toBe(true)
  })

  test("a lying peer's entry is refused on the first read", () => {
    const events = [{ stream: "alpha", seq: 1, payload: new TextEncoder().encode("a=1") }]
    const head = headFrom(mergeSeed(), events)
    const lie: Snapshot = new Map([[keyOf(head), bytesOf(sumFold.fold(events) + 7)]])
    const peer: Peer = { name: "liar", snapshot: Effect.succeed(lie) }
    const program = Effect.gen(function*() {
      const federation = yield* Federation
      yield* federation.merge("liar", lie)
      const cache = yield* FoldCache
      return yield* Effect.result(cache.runCached(sumFold, head, Effect.succeed(events)))
    })
    const outcome = Effect.runSync(Effect.provide(program, FederatedFoldCache([peer])))
    expect(outcome._tag).toBe("Failure")
    if (outcome._tag !== "Failure") return
    expect(outcome.failure._tag).toBe("CorruptEntry")
    if (outcome.failure._tag !== "CorruptEntry") return
    expect(outcome.failure.cause).toBe("fold-disagreement")
  })
})
