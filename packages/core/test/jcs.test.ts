import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import { canonicalizeJson, decodeJson, encodeJsonValue, type JsonValue } from "../src/jcs.ts"

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

class AdversarialBox {
  constructor(readonly value: number) {}
}

const nonPlainObjectArbitrary: FastCheck.Arbitrary<JsonValue> = FastCheck.oneof(
  FastCheck.integer().map((value) => new AdversarialBox(value) as unknown as JsonValue),
  FastCheck.integer().map((value) => new Date(value) as unknown as JsonValue),
  FastCheck.array(FastCheck.tuple(FastCheck.string(), FastCheck.integer()), { maxLength: 8 })
    .map((entries) => new Map(entries) as unknown as JsonValue),
  FastCheck.integer().map((value) => Object.assign(
    Object.create({ inherited: value }) as Record<string, JsonValue>,
    { own: value },
  )),
)

describe("RFC 8785 canonical JSON", () => {
  test("Appendix B serializes negative zero as zero", () => {
    expect(encodeJsonValue(-0)).toEqual({ ok: true, bytes: "0" })
  })

  test("every RFC 8785 Appendix B number vector matches", () => {
    for (const vector of rfc.numbers) {
      const encoded = encodeJsonValue(floatFromBits(vector.ieee754))
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

describe("non-plain objects are outside the canonical domain (J1)", () => {
  test("the adversarial generator targets non-plain prototypes", () => {
    FastCheck.assert(
      FastCheck.property(nonPlainObjectArbitrary, (value) => {
        const result = encodeJsonValue(value)
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.refusal._tag).toBe("NonCanonicalValue")
      }),
      { seed: 0x22c1_0004, numRuns: 250, endOnFailure: false },
    )
  })

  test.each([
    [new Date(0), "Date"],
    [new Map([["a", 1]]), "Map"],
    [new Set([1, 2]), "Set"],
    [/re/, "RegExp"],
  ])("encodeJsonValue refuses a %s smuggled past the type", (value) => {
    const result = encodeJsonValue(value as unknown as JsonValue)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusal._tag).toBe("NonCanonicalValue")
  })

  test("a prototype-carrying instance does not collide with an empty object", () => {
    class Widget {
      constructor(readonly id = 7) {}
    }
    expect(encodeJsonValue({})).toEqual({ ok: true, bytes: "{}" })
    // Before the fix Date/Map/instances all serialize as {}, colliding the
    // "unique equality witness"; the refusal keeps them out of the domain.
    expect(encodeJsonValue(new Widget() as unknown as JsonValue).ok).toBe(false)
    expect(encodeJsonValue(new Date(0) as unknown as JsonValue).ok).toBe(false)
  })

  test("plain and null-prototype objects remain in the domain", () => {
    expect(encodeJsonValue({ a: 1 })).toEqual({ ok: true, bytes: '{"a":1}' })
    // The constrained decoder mints null-prototype objects; they must still encode.
    const nullProto = Object.assign(Object.create(null) as Record<string, JsonValue>, { a: 1 })
    expect(encodeJsonValue(nullProto)).toEqual({ ok: true, bytes: '{"a":1}' })
  })
})
