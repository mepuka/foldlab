/**
 * Generated laws for the declared fold grammar. These are property suites,
 * not sampled examples: every primitive and a nested product earn their API
 * rights from deterministic, shrinking fast-check runs.
 */

import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import {
  algebras,
  encodeFoldState,
  homomorphisms,
  steps,
  type DeclaredHom,
  type FoldState,
  type Step,
} from "../src/algebra.ts"
import { defineFold, type Fold } from "../src/fold.ts"
import { makeFoldLawSuite } from "../src/foldLaws.ts"
import { event, type StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

const registerLaws = <
  A extends FoldState,
  B extends FoldState = A,
  C extends FoldState = A,
>(
  name: string,
  fold: Fold<StreamEvent, A>,
  options: {
    readonly map?: DeclaredHom<A, B>
    readonly zip?: Fold<StreamEvent, C>
  },
): void => {
  const suite = makeFoldLawSuite(fold, {
    fixtures: foldFixtureEvents,
    ...options,
  })
  if (!suite.ok) throw new Error(`${name}: ${suite.refusal.reason}`)
  describe(name, () => {
    for (const law of suite.laws) {
      test(`${law.name}; seed=${law.seed}`, law.check)
    }
  })
}

registerLaws("sum", primitiveFolds.sum, { zip: primitiveFolds.count })
registerLaws("count", primitiveFolds.count, { zip: primitiveFolds.sum })
registerLaws("max", primitiveFolds.max, {
  map: homomorphisms.isPositiveFromMax,
  zip: primitiveFolds.count,
})
registerLaws("min", primitiveFolds.min, { zip: primitiveFolds.any })
registerLaws("any", primitiveFolds.any, { zip: primitiveFolds.setUnion })
registerLaws("all", primitiveFolds.all, { zip: primitiveFolds.max })
registerLaws("setUnion", primitiveFolds.setUnion, { zip: primitiveFolds.sum })
registerLaws(
  "nested product",
  primitiveFolds.sum.zip(primitiveFolds.count.zip(primitiveFolds.setUnion)),
  { zip: primitiveFolds.max },
)

describe("fold construction rights", () => {
  test("sum and count close under u32 modular addition", () => {
    expect(algebras.sum.combine(0xffff_ffff, 1)).toBe(0)
    expect(algebras.count.combine(0xffff_ffff, 1)).toBe(0)
  })

  test("zip performs one traversal", () => {
    let traversals = 0
    const events: Iterable<StreamEvent> = {
      [Symbol.iterator]: () => {
        traversals++
        return foldFixtureEvents[Symbol.iterator]()
      },
    }
    expect(primitiveFolds.sum.zip(primitiveFolds.count).fold(events)).toEqual([15, 5])
    expect(traversals).toBe(1)
  })

  test("map construction does not replay and mapped folding commutes", () => {
    let calls = 0
    const counted: Step<StreamEvent, number | null> = {
      ...steps.sequenceNumber,
      apply: (input) => {
        calls++
        return input.seq
      },
    }
    const source = defineFold(algebras.max, counted)
    const mapped = source.map(homomorphisms.isPositiveFromMax)
    expect(calls).toBe(0)
    expect(mapped.fold(foldFixtureEvents)).toBe(true)
    expect(calls).toBe(foldFixtureEvents.length)
    expect(mapped.fold([])).toBe(homomorphisms.isPositiveFromMax.map(source.fold([])))
  })

  test("declared payloadNumber is total over invalid and missing JSON paths", () => {
    const number = steps.payloadNumber(["metrics", "score"])
    expect(number.apply(event("json", 1, "{\"metrics\":{\"score\":3}}"))).toBe(3)
    expect(number.apply(event("json", 2, "{\"metrics\":{}}"))).toBeNull()
    expect(number.apply(event("json", 3, "not-json"))).toBeNull()
  })

  test("payloadNumber snapshots its identity-bearing path", () => {
    const path = ["metrics", "score"]
    const number = steps.payloadNumber(path)
    const digest = number.declaration?.digest
    path[1] = "other"
    expect(number.apply(event("json", 1, "{\"metrics\":{\"score\":3}}"))).toBe(3)
    expect(number.declaration?.digest).toBe(digest)
  })

  test("the declared hom encoding is the canonical encoding of its spec", () => {
    const declared = homomorphisms.isPositiveFromMax.declaration
    expect(encodeFoldState(declared.spec)).toEqual({ ok: true, bytes: declared.encoding })
  })

  test("canonical encoding refuses cycles as data", () => {
    const cyclic: Array<FoldState> = []
    cyclic.push(cyclic)
    expect(encodeFoldState(cyclic)).toEqual({
      ok: false,
      refusal: {
        _tag: "NonCanonicalValue",
        path: "$/0",
        reason: "cyclic values are outside the canonical domain",
      },
    })
  })

  test("fast-check shrinks a failure to its minimized counterexample", () => {
    const result = FastCheck.check(
      FastCheck.property(FastCheck.integer({ min: 0, max: 100 }), (value) => value < 0),
      { examples: [[100]], seed: 0x14_06_05, endOnFailure: false },
    )
    expect(result.failed).toBe(true)
    if (result.failed) {
      expect(result.numShrinks).toBeGreaterThan(0)
      expect(result.counterexample).toEqual([0])
    }
  })
})
