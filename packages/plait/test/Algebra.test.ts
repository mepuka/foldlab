import { describe, expect, test } from "bun:test"

import { Effect, Reducer } from "effect"
import { resolve } from "node:path"
import * as FastCheck from "fast-check"

import {
  commutative,
  commutativeLaws,
  declare,
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
