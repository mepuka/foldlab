import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import { algebras, steps } from "../src/algebra.ts"
import {
  arbitraryForEvent,
  arbitraryForHistory,
  arbitraryForUnicodeString,
  arbitraryForValue,
} from "../src/foldArbitrary.ts"
import { makeFoldLawSuite } from "../src/foldLaws.ts"
import { defineFold, type Fold } from "../src/fold.ts"
import type { StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents } from "./foldTestData.ts"

const containsNonAscii = (value: string): boolean =>
  [...value].some((unit) => unit.codePointAt(0)! > 0x7f)
const sequenceSumFold = defineFold(algebras.sum, steps.sequenceNumber)

describe("generated proof inputs reach declared boundaries", () => {
  test("Unicode strings cover non-ASCII, surrogate-adjacent, and supplementary scalars", () => {
    const strings = FastCheck.sample(arbitraryForUnicodeString({ maxLength: 12 }), {
      seed: 0x51_01,
      numRuns: 3_640,
    })

    expect(strings.some(containsNonAscii)).toBe(true)
    expect(strings.some((value) => value.includes("\ud7ff"))).toBe(true)
    expect(strings.some((value) => value.includes("\ue000"))).toBe(true)
    expect(strings.some((value) => [...value].some((unit) => unit.codePointAt(0)! > 0xffff)))
      .toBe(true)
  })

  test("set-union values and stream events use the same Unicode-scalar domain", () => {
    const sets = FastCheck.sample(arbitraryForValue(algebras.setUnion.generator!), {
      seed: 0x51_02,
      numRuns: 400,
    })
    const events = FastCheck.sample(
      arbitraryForEvent<StreamEvent>({ kind: "streamEvent" }),
      { seed: 0x51_03, numRuns: 400 },
    )

    expect(sets.some((set) => set.some(containsNonAscii))).toBe(true)
    expect(events.some((event) => containsNonAscii(event.stream))).toBe(true)
  })

  test("law histories contain a real event-driven u32 wrap", () => {
    const event = arbitraryForEvent<StreamEvent>({ kind: "streamEvent" })
    const histories = FastCheck.sample(
      arbitraryForHistory({ kind: "streamEvent" }, event, 24),
      { seed: 0x51_04, numRuns: 200 },
    )

    expect(histories.some((history) =>
      history.length === 2 &&
      history[0]?.seq === 0xffff_ffff &&
      history[1]?.seq === 1 &&
      sequenceSumFold.fold(history) === 0
    )).toBe(true)
  })

  test("REFUSED: a fold that drops only u32 wrap fails the history law", () => {
    const honest = sequenceSumFold
    const gateDropped: Fold<StreamEvent, number> = {
      ...honest,
      fold: (events) => {
        const history = [...events]
        const raw = history.reduce((sum, event) => sum + event.seq, 0)
        return raw > 0xffff_ffff ? 0xffff_ffff : honest.fold(history)
      },
    }
    const suite = makeFoldLawSuite(gateDropped, { fixtures: foldFixtureEvents })
    if (!suite.ok) throw new Error(suite.refusal.reason)
    const law = suite.laws.find(({ name }) => name === "zip consistency (banana-split)")
    expect(law).toBeDefined()
    expect(() => law!.check()).toThrow()
  })
})
