import { describe, expect, test } from "bun:test"
import { rosettaChecks, rosettaReport } from "../../../examples/rosetta/rosetta.ts"

describe("the runnable Rosetta demo", () => {
  test("every narrated payoff is an assertion in the package battery", () => {
    expect(rosettaChecks.map(({ label }) => label)).toEqual([
      "the fold carries a name, so it can be referred to elsewhere",
      "the history has a content address",
      "the result was stored under its two names",
      "a freshly rebuilt, structurally equal history hits the same entry",
      "the cached value is what a fresh fold would produce",
      "folding the halves and combining equals folding the whole",
      "so both routes agree with the cached entry, under one digest",
      "a NUL key is refused as a typed value, not thrown",
      "and no state was produced to be corrupted",
      "appending one event moved both derived atoms",
      "the meaning fold advanced",
      "the identity fold advanced",
      "and the live state still equals a cold fold of the same log",
    ])
    expect(rosettaChecks.every(({ held }) => held)).toBe(true)
  })

  test("the demonstrated outputs stay exact without a stdout fixture", () => {
    expect(rosettaReport).toEqual({
      foldDigest: "0157cd627aae99b0da409d75d04090ddf1b965b0f2537052be2d67a5ccc79179",
      foldState: [6, 310],
      foldStateBytes: "[6,310]",
      head: "be0ecbc2318c45890a0c46fe6e329a3883c09c70b8d68229479109775f4d3bd2",
      cacheBytes: "[6,310]",
      refusal: { tag: "MalformedPayload", seq: 100 },
      liveState: [7, 900],
      liveHead: "c50a0221087c9f4a7909db1136ee78909bd8b263152cac7c79cc8da9ef07bf4d",
    })
  })
})
