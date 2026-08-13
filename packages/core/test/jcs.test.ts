import { describe, expect, test } from "bun:test"
import { encodeFoldState } from "../src/algebra.ts"
import { canonicalizeJson, decodeJson } from "../src/jcs.ts"

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value)
const rfc = await Bun.file(new URL("../../../fixtures/jcs-rfc8785.json", import.meta.url)).json() as {
  readonly numbers: ReadonlyArray<{
    readonly ieee754: string
    readonly encoded: string | null
    readonly comment: string
  }>
}

const floatFromBits = (bits: string): number => {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setBigUint64(0, BigInt(`0x${bits}`))
  return view.getFloat64(0)
}

describe("RFC 8785 canonical JSON", () => {
  test("Appendix B serializes negative zero as zero", () => {
    expect(encodeFoldState(-0)).toEqual({ ok: true, bytes: "0" })
  })

  test("every RFC 8785 Appendix B number vector matches", () => {
    for (const vector of rfc.numbers) {
      const encoded = encodeFoldState(floatFromBits(vector.ieee754))
      if (vector.encoded === null) {
        expect(encoded.ok, `${vector.ieee754} (${vector.comment})`).toBe(false)
      } else {
        expect(encoded, `${vector.ieee754} (${vector.comment})`).toEqual({
          ok: true,
          bytes: vector.encoded,
        })
      }
    }
  })

  test("constrained decode accepts exactly one unambiguous JSON value", () => {
    expect(canonicalizeJson(utf8(' { "b": 2, "a": 1 } '))).toEqual({
      ok: true,
      bytes: '{"a":1,"b":2}',
    })
  })

  test.each([
    ['{"a":1,"a":2}', "duplicate member names"],
    ['{"a":1,"\\u0061":2}', "escape-equivalent duplicate member names"],
    ['"\\ud800"', "lone high surrogate"],
    ['"\\udc00"', "lone low surrogate"],
    ["null true", "a trailing second value"],
  ])("constrained decode refuses %s (%s)", (input) => {
    expect(decodeJson(utf8(input)).ok).toBe(false)
  })

  test("constrained decode refuses invalid UTF-8", () => {
    expect(decodeJson(new Uint8Array([0x22, 0xff, 0x22])).ok).toBe(false)
  })
})
