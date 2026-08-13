/**
 * The laws that license `combineKV` — the meaning fold's missing `combine`.
 *
 * The centrepiece is not a property run but a wall: the frozen merged corpus in
 * `fixtures/stream-wall.json` is cut at every one of its six split points, each
 * half folded on its own, the halves combined, and the resulting `stateDigest`
 * compared against the frozen `foldStateDigest` that Go wrote once. Parallel
 * replay is not licensed by a property over invented histories; it is licensed
 * by reproducing, out of independently folded pieces, the exact digest the wall
 * already holds.
 *
 * The negative half matters as much. `combineKV` is a monoid and NOT a
 * semilattice, and the two failures are pinned here with minimized
 * counterexamples so that nobody reads "the KV lane has a combine" as "the KV
 * lane federates".
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Exit } from "effect"
import * as FastCheck from "fast-check"
import {
  applyMerge,
  combineKV,
  combineKVEffect,
  emptyKV,
  event,
  foldKV,
  KVCountOverflow,
  stateDigest,
  type Head,
  type KVState,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/stream-wall.json"), "utf8"),
) as Record<string, string | number>

const alpha = [event("alpha", 1, "a=1"), event("alpha", 2, "b=2"), event("alpha", 3, "a=3")]
const beta = [event("beta", 1, "c=4"), event("beta", 2, "a=5")]
const fact: MergeFact = {
  picks: [
    { stream: "alpha", seq: 1 },
    { stream: "beta", seq: 1 },
    { stream: "alpha", seq: 2 },
    { stream: "beta", seq: 2 },
    { stream: "alpha", seq: 3 },
  ],
}
const merged = Effect.runSync(applyMerge(
  fact,
  new Map<string, ReadonlyArray<StreamEvent>>([["alpha", alpha], ["beta", beta]]),
))

const defined = (state: KVState | undefined): KVState => {
  if (state === undefined) throw new Error("combineKV refused inside a law that admits its inputs")
  return state
}

/** Equality of fold states is equality of the canonical digest, never of shape. */
const digest = (state: KVState | undefined): Head => stateDigest(defined(state))

const admittedEvent: FastCheck.Arbitrary<StreamEvent> = FastCheck.record({
  stream: FastCheck.constantFrom("alpha", "beta", "gamma"),
  seq: FastCheck.integer({ min: 0, max: 32 }),
  key: FastCheck.constantFrom("a", "b", "c", "ß", "\u{10000}"),
  value: FastCheck.constantFrom("1", "2", "3", "", "ß"),
}).map(({ stream, seq, key, value }) => event(stream, seq, `${key}=${value}`))

const history = FastCheck.array(admittedEvent, { maxLength: 16 })

describe("combineKV: the parallel-replay license", () => {
  test("WALL: every split of the frozen corpus recombines to the frozen fold digest", () => {
    const frozen = fixture["foldStateDigest"] as Head
    expect(digest(Effect.runSync(foldKV(merged)))).toBe(frozen)
    for (let split = 0; split <= merged.length; split++) {
      const left = Effect.runSync(foldKV(merged.slice(0, split)))
      const right = Effect.runSync(foldKV(merged.slice(split)))
      expect(digest(combineKV(left, right))).toBe(frozen)
    }
  })

  test("WALL: a three-way split recombines to the frozen digest under either grouping", () => {
    const frozen = fixture["foldStateDigest"] as Head
    for (let i = 0; i <= merged.length; i++) {
      for (let j = i; j <= merged.length; j++) {
        const a = Effect.runSync(foldKV(merged.slice(0, i)))
        const b = Effect.runSync(foldKV(merged.slice(i, j)))
        const c = Effect.runSync(foldKV(merged.slice(j)))
        expect(digest(combineKV(defined(combineKV(a, b)), c))).toBe(frozen)
        expect(digest(combineKV(a, defined(combineKV(b, c))))).toBe(frozen)
      }
    }
  })

  test("monoid identity: the empty state changes nothing on either side", () => {
    FastCheck.assert(
      FastCheck.property(history, (events) => {
        const state = Effect.runSync(foldKV(events))
        expect(digest(combineKV(emptyKV, state))).toBe(stateDigest(state))
        expect(digest(combineKV(state, emptyKV))).toBe(stateDigest(state))
      }),
      { seed: 0x14_06_10, numRuns: 300, endOnFailure: false, verbose: 1 },
    )
  })

  test("monoid associativity: grouping never moves the digest", () => {
    FastCheck.assert(
      FastCheck.property(history, history, history, (xs, ys, zs) => {
        const a = Effect.runSync(foldKV(xs))
        const b = Effect.runSync(foldKV(ys))
        const c = Effect.runSync(foldKV(zs))
        expect(digest(combineKV(defined(combineKV(a, b)), c)))
          .toBe(digest(combineKV(a, defined(combineKV(b, c)))))
      }),
      { seed: 0x14_06_11, numRuns: 300, endOnFailure: false, verbose: 1 },
    )
  })

  test("homomorphism: folding a concatenation equals combining the folds", () => {
    FastCheck.assert(
      FastCheck.property(history, history, (xs, ys) => {
        const whole = Effect.runSync(foldKV([...xs, ...ys]))
        expect(digest(combineKV(
          Effect.runSync(foldKV(xs)),
          Effect.runSync(foldKV(ys)),
        ))).toBe(stateDigest(whole))
      }),
      {
        seed: 0x14_06_12,
        numRuns: 500,
        endOnFailure: false,
        verbose: 1,
        examples: [[alpha, beta], [merged, []], [[], merged]],
      },
    )
  })

  test("an arbitrary split point of an arbitrary history recombines exactly", () => {
    FastCheck.assert(
      FastCheck.property(history, FastCheck.nat(), (events, raw) => {
        const split = raw % (events.length + 1)
        expect(digest(combineKV(
          Effect.runSync(foldKV(events.slice(0, split))),
          Effect.runSync(foldKV(events.slice(split))),
        ))).toBe(stateDigest(Effect.runSync(foldKV(events))))
      }),
      { seed: 0x14_06_13, numRuns: 500, endOnFailure: false, verbose: 1 },
    )
  })
})

describe("combineKV: the rights it does NOT confer", () => {
  test("NEGATIVE CONTROL: commutativity fails, minimized — order is the semantics", () => {
    const left = Effect.runSync(foldKV([event("s", 1, "a=1")]))
    const right = Effect.runSync(foldKV([event("s", 2, "a=2")]))
    expect(digest(combineKV(left, right))).not.toBe(digest(combineKV(right, left)))
    expect([...defined(combineKV(left, right)).entries]).toEqual([["a", "2"]])
    expect([...defined(combineKV(right, left)).entries]).toEqual([["a", "1"]])

    // The failure is exactly same-key writes: disjoint keys DO commute, which is
    // the classification the lane already draws between commuting and
    // non-commuting events.
    const disjoint = Effect.runSync(foldKV([event("s", 2, "b=2")]))
    expect(digest(combineKV(left, disjoint))).toBe(digest(combineKV(disjoint, left)))
  })

  test("NEGATIVE CONTROL: idempotence fails, minimized — the count is a sum", () => {
    const state = Effect.runSync(foldKV([event("s", 1, "a=1")]))
    const doubled = defined(combineKV(state, state))
    expect([...doubled.entries]).toEqual([["a", "1"]])
    expect(doubled.count).toBe(2)
    expect(stateDigest(doubled)).not.toBe(stateDigest(state))

    // Even the empty state is not absorbing in the general case: only the count
    // moves, and the count is inside the frozen digest preimage.
    expect(digest(combineKV(emptyKV, emptyKV))).toBe(stateDigest(emptyKV))
  })

  test("the u32 count wall refuses, on both the value and the typed channel", () => {
    const maxU32 = 0xffff_ffff
    const heavy: KVState = { entries: new Map([["a", "1"]]), count: maxU32 }
    const one: KVState = { entries: new Map([["b", "2"]]), count: 1 }
    expect(combineKV(heavy, one)).toBeUndefined()
    expect(combineKV(one, heavy)).toBeUndefined()
    expect(defined(combineKV(heavy, emptyKV)).count).toBe(maxU32)

    const exit = Effect.runSyncExit(combineKVEffect(heavy, one))
    expect(Exit.isFailure(exit)).toBe(true)
    const refusal = Effect.runSync(Effect.flip(combineKVEffect(heavy, one)))
    expect(refusal).toBeInstanceOf(KVCountOverflow)
    expect(refusal.left).toBe(maxU32)
    expect(refusal.right).toBe(1)

    for (const bad of [-1, 0.5, Number.MAX_SAFE_INTEGER]) {
      expect(combineKV({ entries: new Map(), count: bad }, emptyKV)).toBeUndefined()
      expect(combineKV(emptyKV, { entries: new Map(), count: bad })).toBeUndefined()
    }
  })

  test("the result owns its map: mutating an input afterwards cannot move it", () => {
    const source = new Map([["a", "1"]])
    const combined = defined(combineKV({ entries: source, count: 1 }, emptyKV))
    source.set("a", "tampered")
    expect([...combined.entries]).toEqual([["a", "1"]])
  })

  test("combineKVEffect succeeds exactly where combineKV is defined", () => {
    FastCheck.assert(
      FastCheck.property(history, history, (xs, ys) => {
        const left = Effect.runSync(foldKV(xs))
        const right = Effect.runSync(foldKV(ys))
        const value = combineKV(left, right)
        const exit = Effect.runSyncExit(combineKVEffect(left, right))
        expect(Exit.isSuccess(exit)).toBe(value !== undefined)
        if (value !== undefined) {
          expect(stateDigest(Effect.runSync(combineKVEffect(left, right)))).toBe(stateDigest(value))
        }
      }),
      { seed: 0x14_06_14, numRuns: 200, endOnFailure: false },
    )
  })
})
