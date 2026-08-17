import { describe, expect, test } from "bun:test"

import { canonicalBytes } from "../src/Canonical.js"

describe("canonicalBytes", () => {
  test("uses the package/core RFC 8785 seam", () => {
    const result = canonicalBytes({ z: 1, a: [true, null] })

    expect(result).toEqual({
      ok: true,
      bytes: new TextEncoder().encode('{"a":[true,null],"z":1}'),
    })
  })
})
