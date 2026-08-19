/**
 * The combinator wall: the closed lawful set behaves as the variety argument
 * says it must. The product transports exactly the intersection of earned
 * brands — and the transport is CONFIRMED by re-earning through the same
 * suite door that earns first-order brands, so the metatheorem is never a
 * suite skipped. The transformers move the event side of the F4 bridge only:
 * a filtered-out event leaves the state exactly where it stood because the
 * algebra's own identity contributes, and a rung survives both transformers
 * because the algebra is untouched.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Reducer, Schema } from "effect"

import {
  commutative,
  declare,
  earnedLawsOf,
  hasRung,
  product,
  rungLaws,
  type CommutativeAlgebra,
  type DeclaredAlgebra,
} from "../src/truth/Algebra.js"
import { filtered, mapped, type Contribution } from "../src/planes/Fold.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import { Digest } from "../src/truth/Digest.js"
import { LaneHandle } from "../src/planes/Lane.js"

const run = <A>(effect: Effect.Effect<A, unknown>): A =>
  Effect.runSync(effect as Effect.Effect<A, never>)

const numberSuite = {
  arbitrary: (seed: number) => Math.abs(seed) % 97,
  equals: (left: number, right: number) => left === right,
}

const pairSuite = {
  arbitrary: (seed: number) =>
    [Math.abs(seed) % 89, Math.abs(seed * 7 + 3) % 83] as readonly [number, number],
  equals: (left: readonly [number, number], right: readonly [number, number]) =>
    left[0] === right[0] && left[1] === right[1],
}

const declareSum = (): DeclaredAlgebra<number> =>
  run(declare({
    declaration: { name: "wall-sum" },
    reducer: Reducer.make<number>((a, b) => a + b, 0),
  }))

const declareMax = (): DeclaredAlgebra<number> =>
  run(declare({
    declaration: { name: "wall-max" },
    reducer: Reducer.make<number>((a, b) => (a > b ? a : b), 0),
  }))

const earnedSum = (): CommutativeAlgebra<number> => run(commutative(declareSum(), numberSuite))
const earnedMax = (): CommutativeAlgebra<number> => run(commutative(declareMax(), numberSuite))

describe("the product combinator", () => {
  test("combines pointwise", () => {
    const pair = run(product(declareSum(), declareMax()))
    const contributions: ReadonlyArray<readonly [number, number]> = [[1, 5], [2, 3], [4, 4]]
    const folded = contributions.reduce(
      (state, next) => pair.reducer.combine(state, next),
      pair.reducer.initialValue,
    )
    expect(folded).toEqual([7, 5])
  })

  test("transports exactly the intersection of earned brands", () => {
    const both = run(product(earnedSum(), earnedMax()))
    expect([...earnedLawsOf(both)].sort())
      .toEqual([...rungLaws["commutative-monoid"]].sort())
    expect(hasRung(both, "commutative-monoid")).toBe(true)

    const halfEarned = run(product(earnedSum(), declareMax()))
    expect(earnedLawsOf(halfEarned)).toEqual([])
    expect(hasRung(halfEarned, "commutative-monoid")).toBe(false)
  })

  test("the transported brand re-earns through the suite door — confirmation, not trust", () => {
    const both = run(product(earnedSum(), earnedMax()))
    const confirmed = run(commutative<readonly [number, number]>(both, pairSuite))
    expect(hasRung(confirmed, "commutative-monoid")).toBe(true)
  })

  test("the product's identity is the pair of identities", () => {
    const pair = run(product(declareSum(), declareMax()))
    expect(pair.reducer.initialValue).toEqual([0, 0])
    expect(pair.reducer.combine(pair.reducer.initialValue, [3, 9])).toEqual([3, 9])
  })
})

const Event = Schema.Struct({ tenant: Schema.String, delta: Schema.Finite })
type Event = typeof Event.Type

const deltaContribution: Contribution<Event, number> = {
  declaration: { name: "wall-delta" },
  apply: (event) => event.delta,
}

describe("the contribution transformers", () => {
  test("a filtered-out event contributes the algebra's identity: the state stands still", () => {
    const algebra = earnedSum()
    const keepAlpha = filtered(algebra, {
      declaration: { predicate: "tenant-is-alpha" },
      test: (event: Event) => event.tenant === "alpha",
    }, deltaContribution)
    const step = (state: number, event: Event) =>
      algebra.reducer.combine(state, keepAlpha.apply(event))
    const after = [
      { tenant: "alpha", delta: 3 },
      { tenant: "beta", delta: 100 },
      { tenant: "alpha", delta: 4 },
    ].reduce(step, algebra.reducer.initialValue)
    expect(after).toBe(7)
  })

  test("a mapped contribution reads the transformed event", () => {
    const doubled = mapped({
      declaration: { transform: "double-delta" },
      apply: (event: Event) => ({ ...event, delta: event.delta * 2 }),
    }, deltaContribution)
    expect(doubled.apply({ tenant: "alpha", delta: 5 })).toBe(10)
  })

  test("the rung survives the transformers: a partitioned fold accepts the filtered step", () => {
    const algebra = earnedSum()
    const lane = run(Lane.declare({
      handle: LaneHandle.make("combinator-lane"),
      event: Event,
      eventSchema: Digest.make("e".repeat(64)),
      partitions: 2 as const,
      partitionKey: { path: ["tenant"] },
    }))
    const fold = run(Fold.declare({
      lane,
      algebra,
      contribution: filtered(algebra, {
        declaration: { predicate: "tenant-is-alpha" },
        test: (event: Event) => event.tenant === "alpha",
      }, deltaContribution),
    }))
    expect(fold.digest.length).toBe(64)
  })
})
