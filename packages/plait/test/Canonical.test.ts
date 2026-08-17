import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { canonicalBytes } from "../src/Canonical.js"

describe("canonicalBytes", () => {
  test("uses the package/core RFC 8785 seam", async () => {
    const bytes = await Effect.runPromise(canonicalBytes({ z: 1, a: [true, null] }))

    expect(bytes).toEqual(new TextEncoder().encode('{"a":[true,null],"z":1}'))
  })

  test("translates package/core failures into the Plait refusal vocabulary", async () => {
    const refusal = await Effect.runPromise(
      Effect.flip(canonicalBytes(Number.NaN)),
    )

    expect(refusal._tag).toBe("StructuralRefusal")
    expect(refusal.kind).toBe("non-canonical-value")
    expect(refusal.sort).toBe("structural")
    expect(refusal.path).toEqual([])
    expect(refusal.got).toBe("number is not finite")
    expect(refusal.expected).toBe("one RFC 8785 wire value")
    expect(refusal.next).toEqual([])
  })
})
