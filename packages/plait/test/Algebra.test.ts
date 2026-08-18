import { describe, expect, test } from "bun:test"

import { Effect, Reducer } from "effect"
import { resolve } from "node:path"
import * as FastCheck from "fast-check"

import {
  commutative,
  commutativeLaws,
  declare,
  earnedLawsOf,
  hasCommutativeWitness,
  hasRung,
  lawSuite,
  rungLaws,
  type LawPredicates,
  type RungName,
} from "../src/truth/Algebra.js"

const arbitraryInteger = (seed: number): number => FastCheck.sample(
  FastCheck.integer(),
  { seed: seed | 0, numRuns: 1 },
)[0]!

describe("declared algebras", () => {
  test("digest-seeded derived law cases earn a commutative brand", async () => {
    const algebra = await Effect.runPromise(declare({
      declaration: { name: "integer-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))
    const laws = commutativeLaws(algebra, Object.is)

    FastCheck.assert(FastCheck.property(
      FastCheck.integer(),
      FastCheck.integer(),
      FastCheck.integer(),
      (left, middle, right) =>
        laws.leftIdentity(left) &&
        laws.rightIdentity(left) &&
        laws.associative(left, middle, right) &&
        laws.commutative(left, middle),
    ))

    const earned = await Effect.runPromise(commutative(algebra, {
      arbitrary: arbitraryInteger,
      equals: Object.is,
    }))
    expect(earned.digest).toBe(algebra.digest)
  })

  test("a degenerate arbitrary cannot enumerate its way through the brand door", async () => {
    const algebra = await Effect.runPromise(declare({
      declaration: { name: "integer-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))
    const refusal = await Effect.runPromise(Effect.flip(commutative(algebra, {
      arbitrary: () => 0,
      equals: Object.is,
    })))

    expect(refusal.kind).toBe("unearned-commutative-algebra")
    expect(refusal.path).toEqual(["suite", "arbitrary"])
  })

  test("a derived suite refuses a non-commutative claim", async () => {
    const algebra = await Effect.runPromise(declare({
      declaration: { name: "ordered-subtract", version: 0 },
      reducer: Reducer.make<number>((left, right) => left - right, 0),
    }))
    const refusal = await Effect.runPromise(Effect.flip(
      commutative(algebra, { arbitrary: arbitraryInteger, equals: Object.is }),
    ))
    expect(refusal.kind).toBe("unearned-commutative-algebra")
    expect(refusal.law).toContain("F4")
    const trace = "FOLD CONTROL: PASS component=earned-commutative-brand mutant=ordered-subtract refusal=structural/unearned-commutative-algebra law=F4"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.unearned-commutative.trace.txt",
    )).text())
    console.info(trace)
  })
})

const climbs: ReadonlyArray<readonly [RungName, RungName]> = [
  ["monoid", "magma"],
  ["commutative-monoid", "monoid"],
  ["bounded-semilattice", "commutative-monoid"],
  ["group", "monoid"],
  ["abelian-group", "commutative-monoid"],
]

describe("the rung ladder", () => {
  test("climbing a rung adds laws and drops none", () => {
    for (const [higher, lower] of climbs) {
      const above = rungLaws[higher]
      const below = rungLaws[lower]
      expect(below.every((law) => above.includes(law)), `${higher} ⊇ ${lower}`).toBe(true)
      expect(above.length).toBeGreaterThan(below.length)
    }
  })

  test("the two tops are incomparable, so the ladder is a poset and not a chain", () => {
    const lattice = rungLaws["bounded-semilattice"]
    const abelian = rungLaws["abelian-group"]
    expect(abelian.every((law) => lattice.includes(law))).toBe(false)
    expect(lattice.every((law) => abelian.includes(law))).toBe(false)
  })

  test("an earned brand carries its law atoms and licenses only the rung it earned", async () => {
    const algebra = await Effect.runPromise(declare({
      declaration: { name: "integer-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))

    expect(earnedLawsOf(algebra)).toEqual([])
    expect(hasRung(algebra, "commutative-monoid")).toBe(false)

    const earned = await Effect.runPromise(commutative(algebra, {
      arbitrary: arbitraryInteger,
      equals: Object.is,
    }))

    expect([...earnedLawsOf(earned)].sort()).toEqual(
      [...rungLaws["commutative-monoid"]].sort(),
    )
    expect(hasRung(earned, "monoid")).toBe(true)
    expect(hasRung(earned, "commutative-monoid")).toBe(true)
    expect(hasCommutativeWitness(earned)).toBe(true)
    // Adding up is not idempotent, so the rung that makes a redelivery free
    // was never earned and the runtime witness says so.
    expect(hasRung(earned, "bounded-semilattice")).toBe(false)
  })

  test("the derived suite separates a count from a maximum on exactly idempotence", async () => {
    const counting = await Effect.runPromise(declare({
      declaration: { name: "integer-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))
    const greatest = await Effect.runPromise(declare({
      declaration: { name: "integer-max", version: 0 },
      reducer: Reducer.make<number>((left, right) => Math.max(left, right), 0),
    }))
    const held = <State>(suite: LawPredicates<State>, cases: readonly [State, State, State]) => {
      const [left, middle, right] = cases
      return {
        total: suite.total(left, right),
        associative: suite.associative(left, middle, right),
        identity: suite.identity(left),
        commutative: suite.commutative(left, right),
        bounded: suite.bounded(left),
      }
    }
    const count = lawSuite(counting, Object.is)
    const max = lawSuite(greatest, Object.is)
    const everyLawHeld = {
      total: true,
      associative: true,
      identity: true,
      commutative: true,
      bounded: true,
    }

    expect(held(count, [3, 5, 7])).toEqual(everyLawHeld)
    expect(held(max, [3, 5, 7])).toEqual(everyLawHeld)

    // Both are commutative monoids; only one may read the set plane.
    expect(count.idempotent(3)).toBe(false)
    expect(max.idempotent(3)).toBe(true)
  })

  test("totality is the atom the model cannot carry for a TypeScript reducer", async () => {
    const throwing = await Effect.runPromise(declare({
      declaration: { name: "partial-combine", version: 0 },
      reducer: Reducer.make<number>((left, right) => {
        if (right === 0) throw new Error("undefined at zero")
        return left + right
      }, 0),
    }))
    const laws = lawSuite(throwing, Object.is)

    expect(laws.total(3, 5)).toBe(true)
    expect(laws.total(3, 0)).toBe(false)
  })
})
