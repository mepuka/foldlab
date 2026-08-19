import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import {
  VolatilityClass,
  declare,
  orderedSegments,
  volatilityRank,
  type ContextProgram,
} from "../src/kernel/ContextProgram.js"

const digestA = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
const digestB = "bb4f3e5e257ca09b067986bbcb6fa72f9b868eea9d4dff92afd94e2876aa795a"

const segment = (
  name: string,
  volatility: VolatilityClass,
  selector: unknown,
): unknown => ({
  name,
  volatility,
  selector,
  renderer: { renderer: digestB },
})

const program = {
  v: 0,
  segments: [
    segment("shard", "turn", { _tag: "outcome", work: digestA }),
    segment("frame", "static", { _tag: "catalog", value: digestA }),
    segment("siblings", "live", { _tag: "cell", cell: "outcomes" }),
    segment("frontier", "live", { _tag: "frontier", session: digestA, seat: digestB }),
    segment("protocol", "session", { _tag: "span", lane: digestA, anchor: digestB }),
  ],
}

describe("context program declarations", () => {
  test("the volatility order is declared stable-first", () => {
    expect([...VolatilityClass.literals]).toEqual([
      "static",
      "policy",
      "session",
      "live",
      "turn",
    ])
    expect(volatilityRank("static")).toBeLessThan(volatilityRank("policy"))
    expect(volatilityRank("session")).toBeLessThan(volatilityRank("live"))
    expect(volatilityRank("live")).toBeLessThan(volatilityRank("turn"))
  })

  test("a program is a canonical value with a digest", () => {
    const declared = Effect.runSync(declare(program))
    expect(declared.digest).toMatch(/^[0-9a-f]{64}$/)
    // Identity is of the value, not of the object: an equal program re-declares
    // to the same digest.
    expect(Effect.runSync(declare(structuredClone(program))).digest).toBe(declared.digest)
  })

  test("segments order by volatility class, then by declaration order", () => {
    const declared = Effect.runSync(declare(program))
    expect(orderedSegments(declared.program).map((each): string => each.name)).toEqual([
      "frame",
      "protocol",
      "siblings",
      "frontier",
      "shard",
    ])
  })

  test("an ambient selector is unrepresentable, not merely discouraged", () => {
    const refusal = Effect.runSync(Effect.flip(declare({
      v: 0,
      segments: [segment("now", "turn", { _tag: "timestamp" })],
    })))
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.next.length).toBeGreaterThan(0)
  })

  test("a renderer named by a string rather than a digest refuses", () => {
    const refusal = Effect.runSync(Effect.flip(declare({
      v: 0,
      segments: [{
        name: "frame",
        volatility: "static",
        selector: { _tag: "catalog", value: digestA },
        renderer: { renderer: "render it nicely" },
      }],
    })))
    expect(refusal.kind).toBe("malformed-value")
  })

  test("an unversioned program refuses", () => {
    const refusal = Effect.runSync(Effect.flip(declare({ segments: [] })))
    expect(refusal.kind).toBe("malformed-value")
  })

  test("the empty program is admitted and orders to nothing", () => {
    const declared = Effect.runSync(declare({ v: 0, segments: [] }))
    const empty: ContextProgram = declared.program
    expect(orderedSegments(empty)).toEqual([])
  })
})
