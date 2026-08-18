import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import { canonicalize, empty, join, stateOf, type Observation } from "../src/Cell.js"

const run = <A>(effect: Effect.Effect<A, unknown>): A =>
  Effect.runSync(effect as Effect.Effect<A, never>)

const observation = (holder: unknown, value: unknown): Observation =>
  ({ holder, value }) as Observation

const alpha = observation(1, 10)
const beta = observation(2, 20)
const gamma = observation(3, 30)

const digestOfSet = (observations: ReadonlyArray<Observation>): string =>
  run(stateOf(observations)).digest

describe("the cell join", () => {
  test("is idempotent: a delta already carried adds nothing", () => {
    expect(digestOfSet(run(join([alpha, beta], [alpha])))).toBe(digestOfSet([alpha, beta]))
    expect(digestOfSet(run(join([alpha], [alpha])))).toBe(digestOfSet([alpha]))
  })

  test("is commutative: the schedule does not reach the state", () => {
    expect(digestOfSet(run(join([alpha, beta], [beta, gamma]))))
      .toBe(digestOfSet(run(join([beta, gamma], [alpha, beta]))))
  })

  test("is associative: grouping does not reach the state", () => {
    const left = run(join(run(join([alpha], [beta])), [gamma]))
    const right = run(join([alpha], run(join([beta], [gamma]))))
    expect(digestOfSet(left)).toBe(digestOfSet(right))
  })

  test("the empty cell is the identity", () => {
    expect(digestOfSet(run(join([], [alpha, beta])))).toBe(digestOfSet([alpha, beta]))
    expect(run(empty).observations).toEqual([])
  })

  test("canonicalization erases multiplicity and arrival order", () => {
    const shuffled = canonicalize([gamma, alpha, beta, alpha, gamma])
    expect(run(shuffled)).toEqual(run(canonicalize([alpha, beta, gamma])))
  })

  test("same verified set means byte-identical state for every TypeScript replica", () => {
    // The claim is set equality under the DECLARED canonical-bytes comparator.
    // Agreement with the Lean carrier's own comparator ORDER is not claimed.
    expect(digestOfSet([gamma, beta, alpha])).toBe(digestOfSet([alpha, gamma, beta]))
  })

  test("a value outside the RFC 8785 seam refuses instead of canonicalizing", () => {
    const refusal = Effect.runSync(Effect.flip(join([], [observation("h", Number.NaN)])))
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("non-canonical-value")
    expect(refusal.next.length).toBeGreaterThan(0)
  })
})
