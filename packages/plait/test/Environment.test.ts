/**
 * The environment wall: the provision algebra's runtime carrier confirmed
 * against the proven collapse, and filling-from-an-environment reaching the
 * corpus's own committed bytes.
 *
 * The correspondence cases are digest-seeded and derived, never hand-picked:
 * the same discipline the algebra brand suites use. The corpus tie runs the
 * builder twin of the holey vector — already walled byte-identical to the
 * committed corpus elsewhere — through `fillFrom`, and requires the exact
 * bytes of the committed filled twin. A shadowed provision, a duplicated
 * fact, and a permuted fact set must all reach that same value; a genuine
 * tie must refuse, because a read never arbitrates.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { Effect, Result } from "effect"

import {
  fillFrom,
  greatestAt,
  positionedOf,
  provisionFold,
  type ProvisionFact,
} from "../src/planes/Environment.js"
import { loadKernelArtifact } from "./KernelConformance.harness.js"
import { PROGRAM_RECIPES } from "./KernelProgram.harness.js"

const run = <A>(effect: Effect.Effect<A, unknown>): A =>
  Effect.runSync(effect as Effect.Effect<A, never>)

/* -------------------------------------------- seeded correspondence cases */

const seedFromText = (text: string): number => {
  let seed = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    seed = Math.imul(seed ^ text.charCodeAt(index), 0x01000193) >>> 0
  }
  return seed
}

const sequenceFrom = (seedText: string): (() => number) => {
  let state = seedFromText(seedText)
  return () => {
    state = (state + 0x9e3779b9) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad)
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97)
    return ((mixed ^ (mixed >>> 15)) >>> 0)
  }
}

const CASES = 40

const derivedEvents = (
  next: () => number,
): ReadonlyArray<{ readonly hole: bigint; readonly value: bigint }> => {
  const length = next() % 12
  const events: Array<{ readonly hole: bigint; readonly value: bigint }> = []
  for (let index = 0; index < length; index++) {
    events.push({ hole: BigInt(next() % 5), value: BigInt(next() % 100) })
  }
  return events
}

const valuationEntries = (
  valuation: ReadonlyMap<bigint, bigint>,
): ReadonlyArray<readonly [string, string]> =>
  [...valuation.entries()]
    .map(([hole, value]) => [String(hole), String(value)] as const)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))

describe("the provision correspondence", () => {
  test("the order-carrying fold IS the positioned greatest-read, over derived cases", () => {
    const next = sequenceFrom("provision-correspondence")
    for (let index = 0; index < CASES; index++) {
      const events = derivedEvents(next)
      const folded = provisionFold(events)
      const read = run(greatestAt(positionedOf(events)))
      expect(valuationEntries(read)).toEqual(valuationEntries(folded))
    }
  })

  test("a later provision shadows an earlier one; nothing is deleted", () => {
    const read = run(greatestAt([
      { hole: 7n, value: 41n, position: 0n },
      { hole: 7n, value: 42n, position: 5n },
    ]))
    expect(read.get(7n)).toBe(42n)
  })

  test("duplicated facts and permuted fact sets cannot move the read", () => {
    const facts: ReadonlyArray<ProvisionFact> = [
      { hole: 1n, value: 10n, position: 0n },
      { hole: 2n, value: 20n, position: 1n },
      { hole: 1n, value: 11n, position: 2n },
    ]
    const baseline = valuationEntries(run(greatestAt(facts)))
    const permuted = [facts[2]!, facts[0]!, facts[1]!]
    const duplicated = [...facts, facts[0]!, facts[2]!]
    expect(valuationEntries(run(greatestAt(permuted)))).toEqual(baseline)
    expect(valuationEntries(run(greatestAt(duplicated)))).toEqual(baseline)
  })

  test("disjoint provisions are order-free", () => {
    const left = [{ hole: 1n, value: 10n }]
    const right = [{ hole: 2n, value: 20n }]
    expect(valuationEntries(provisionFold([...left, ...right])))
      .toEqual(valuationEntries(provisionFold([...right, ...left])))
  })

  test("a genuine tie refuses: a read never arbitrates", () => {
    const outcome = Effect.runSync(Effect.result(greatestAt([
      { hole: 7n, value: 1n, position: 3n },
      { hole: 7n, value: 2n, position: 3n },
    ])))
    expect(Result.isFailure(outcome)).toBe(true)
    if (Result.isFailure(outcome)) {
      expect(outcome.failure.kind).toBe("ambiguous-binding")
    }
  })
})

/* ----------------------------------------------------- the corpus tie */

let filledBytes = ""

beforeAll(async () => {
  const corpus = await loadKernelArtifact()
  const record = corpus.programs.find((program) => program.name === "holey-filled")
  if (record === undefined) throw new Error("corpus program holey-filled is missing")
  filledBytes = record.bytes
})

describe("filling from an environment", () => {
  test("reaches the corpus's committed filled bytes through the shadowing read", () => {
    const holey = PROGRAM_RECIPES["holey"]!()
    const filled = run(fillFrom(holey, [
      { hole: 7n, value: 41n, position: 0n },
      { hole: 7n, value: 42n, position: 9n },
    ]))
    expect(filled.requirements).toEqual([])
    expect(filled.bytes).toBe(filledBytes)
  })

  test("provides only what the program requires and leaves the rest standing", () => {
    const holey = PROGRAM_RECIPES["holey"]!()
    const filled = run(fillFrom(holey, [
      { hole: 99n, value: 1n, position: 0n },
    ]))
    expect(filled.requirements).toEqual([7n])
    expect(filled.bytes).toBe(holey.bytes)
  })
})
