import { describe, expect, test } from "bun:test"

import { digestOf } from "../src/Digest.js"

describe("digestOf", () => {
  test("is SHA-256 over canonical uncompressed bytes", () => {
    const result = digestOf({ a: 1 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.refusal.reason)
    expect(String(result.digest)).toBe(
      "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
    )
  })
})
