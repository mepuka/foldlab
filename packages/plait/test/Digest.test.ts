import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { digestOf } from "../src/truth/Digest.js"

describe("digestOf", () => {
  test("is SHA-256 over canonical uncompressed bytes", async () => {
    const digest = await Effect.runPromise(digestOf({ a: 1 }))

    expect(String(digest)).toBe(
      "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
    )
  })
})
