import { describe, expect, test } from "bun:test"

import { Effect, Reducer, Schema } from "effect"
import { resolve } from "node:path"

import * as Algebra from "../src/truth/Algebra.js"
import { Digest } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"

const Event = Schema.Struct({ partition: Schema.String, delta: Schema.Finite })
const eventSchema = Digest.make("b".repeat(64))

const makeLane = () => Lane.declare({
  handle: "fold-counter",
  event: Event,
  eventSchema,
  partitions: 2 as const,
  partitionKey: { path: ["partition"] },
})

const makeAlgebra = () => Algebra.declare({
  declaration: { name: "integer-sum", version: 0 },
  reducer: Reducer.make<number>((left, right) => left + right, 0),
})

describe("declared folds", () => {
  test("partitioned declaration refuses an algebra without an earned F4 brand", async () => {
    const [lane, plain] = await Effect.runPromise(Effect.all([makeLane(), makeAlgebra()]))
    Object.defineProperty(plain, Symbol.for("@foldlab/plait/Algebra/commutative"), {
      value: true,
    })
    const forged = plain as unknown as Algebra.CommutativeAlgebra<number>

    const refusal = await Effect.runPromise(Effect.flip(Fold.declare({
      lane,
      algebra: forged,
      contribution: {
        declaration: { name: "counter-delta", version: 0 },
        apply: (event: typeof Event.Type) => event.delta,
      },
    })))

    expect(refusal.kind).toBe("unearned-commutative-algebra")
    expect(refusal.law).toContain("F4")
  })

  test("the step factors through event contributions by construction", async () => {
    const [lane, plain] = await Effect.runPromise(Effect.all([makeLane(), makeAlgebra()]))
    const earned = await Effect.runPromise(Algebra.commutative(plain, {
      arbitrary: (seed) => seed,
      equals: Object.is,
    }))
    const attemptedIntruder = {
      lane,
      algebra: earned,
      contribution: {
        declaration: { name: "counter-delta", version: 0 },
        apply: (event: typeof Event.Type) => event.delta,
      },
      // A JavaScript caller can carry this excess property, but the only
      // declaration door ignores it and derives `step` from contribution.
      step: () => 999,
    }
    const fold = await Effect.runPromise(Fold.declare(attemptedIntruder))

    expect(fold.step(4, { partition: "north", delta: 3 })).toBe(7)
    expect(fold.digest).not.toBe(fold.algebra.digest)
    expect(fold.declaration.lane).toBe(lane.digest)
    const trace = "FOLD CONTROL: PASS component=step-algebra-compatibility mutant=incompatible-step ignored-by=Fold.declare derived=7 intruder=999"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.compatibility.trace.txt",
    )).text())
    console.info(trace)
  })
})
