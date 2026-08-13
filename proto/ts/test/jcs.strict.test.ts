import { describe, expect, test } from "bun:test"

import rfc8785 from "../../../fixtures/jcs-rfc8785.json"
import cg1 from "../../../go/canonical/probes/cg1-vector.json"
import { GoJcsProbe } from "../../../packages/core/test/jcsProbe.ts"
import {
  canonicalize,
  canonicalizeStructure,
  normalize,
  sha256Hex,
  structureDigest,
  type Json,
} from "../src/jcs.ts"

const bytesOf = (outcome: ReturnType<typeof canonicalize>): string => {
  expect(outcome.ok).toBe(true)
  if (!outcome.ok) throw new Error(outcome.refusal.reason)
  return outcome.bytes
}

const refusalOf = (outcome: ReturnType<typeof canonicalize>) => {
  expect(outcome.ok).toBe(false)
  if (outcome.ok) throw new Error(`expected refusal, got ${outcome.bytes}`)
  return outcome.refusal
}

describe("proto JCS has the core/Go canonical identity domain", () => {
  test("RFC 8785 Appendix B licenses negative zero as 0", () => {
    const oracle = rfc8785.numbers.find((row) => row.ieee754 === "8000000000000000")
    expect(oracle?.encoded).toBe("0")
    if (oracle?.encoded !== "0") throw new Error("RFC 8785 minus-zero oracle is missing")
    expect(bytesOf(canonicalize(-0))).toBe(oracle.encoded)
    expect(bytesOf(canonicalizeStructure({ k: "literal", value: -0 }))).toBe(
      '{"k":"literal","value":0}',
    )
  })

  test("non-finite numbers refuse as typed data", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => canonicalize(value)).not.toThrow()
      expect(refusalOf(canonicalize(value))).toMatchObject({
        _tag: "NonCanonicalValue",
        path: "$",
        reason: "number is not finite",
      })
    }
  })

  test("cycles refuse without overflowing the stack, including through structure identity", () => {
    const cycle: Record<string, Json> = {}
    cycle["self"] = cycle

    expect(() => canonicalize(cycle)).not.toThrow()
    expect(refusalOf(canonicalize(cycle))).toMatchObject({
      _tag: "NonCanonicalValue",
      path: "$/self",
      reason: "cyclic values are outside the canonical domain",
    })
    expect(() => canonicalizeStructure(cycle)).not.toThrow()
    expect(canonicalizeStructure(cycle)).toEqual(canonicalize(cycle))
    expect(() => structureDigest(cycle)).not.toThrow()
    const canonical = canonicalize(cycle)
    const identity = structureDigest(cycle)
    expect(identity.ok).toBe(false)
    if (!canonical.ok && !identity.ok) expect(identity.refusal).toEqual(canonical.refusal)
  })

  test("non-plain objects refuse instead of colliding onto their enumerable shape", () => {
    class Costume {
      readonly k = "string"
    }
    const costume = new Costume() as unknown as Json
    expect(refusalOf(canonicalize(costume))).toMatchObject({
      path: "$",
      reason: "non-plain objects are outside the canonical domain",
    })
  })

  test("undefined object members refuse instead of emitting non-JSON text", () => {
    const costume = { present: true, absent: undefined } as unknown as Json
    const refusal = refusalOf(canonicalize(costume))
    expect(refusal).toMatchObject({
      path: "$/absent",
      reason: "undefined is outside the canonical domain",
    })
    expect(JSON.stringify(refusal)).not.toContain('"bytes"')
  })

  test("lone surrogates in values and member names cannot mint structure identity", () => {
    const cases: ReadonlyArray<Json> = [
      { k: "literal", value: cg1.tsLoneSurrogate },
      { k: "literal", value: "\udc00" },
      { [cg1.tsLoneSurrogate]: 0 },
      { "\udfff": 0 },
    ]
    for (const value of cases) {
      expect(refusalOf(canonicalize(value)).reason).toContain("not valid Unicode")
      expect(canonicalizeStructure(value).ok).toBe(false)
      const identity = structureDigest(value)
      expect(identity.ok).toBe(false)
      if (identity.ok) {
        throw new Error(`identity mutant minted ${identity.digest}`)
      }
      expect(identity.refusal.reason).toContain("not valid Unicode")
    }

    // Causal control: this is the old bug's exact mutant. JSON.stringify
    // repairs the lone UTF-16 unit into bytes and therefore produces a digest.
    const mutant = sha256Hex(JSON.stringify({ k: "literal", value: cg1.tsLoneSurrogate }))
    expect(mutant).toMatch(/^[0-9a-f]{64}$/)
  })

  test("the named normalizer is pure and idempotent on admitted structures", () => {
    const source: Json = {
      k: "struct",
      fields: {
        nested: {
          k: "union",
          of: [{ k: "string" }, { k: "null" }, { k: "bool" }],
        },
      },
      optional: [],
    }
    const before = structuredClone(source)
    const once = normalize(source)
    const twice = normalize(once)
    expect(source).toEqual(before)
    expect(twice).toEqual(once)
    expect(bytesOf(canonicalize(once))).toBe(bytesOf(canonicalize(twice)))

    // Negative control: an in-place union sort changes the caller's value.
    const mutant = structuredClone(source) as any
    mutant.fields.nested.of.sort((left: Json, right: Json) =>
      bytesOf(canonicalize(left)).localeCompare(bytesOf(canonicalize(right))))
    expect(mutant).not.toEqual(before)
  })
})

test("the proto canonicalizer is directly walled to the real Go canonicalizer", async () => {
  const probe = new GoJcsProbe()
  const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value)
  try {
    const minusZero = await probe.canonicalize(utf8("-0"))
    expect(minusZero).toEqual({ accepted: true, canonical: bytesOf(canonicalize(-0)) })

    for (const [runtimeValue, wire] of [
      [cg1.tsLoneSurrogate, '"\\ud800"'],
      ["\udc00", '"\\udc00"'],
      [{ [cg1.tsLoneSurrogate]: 0 }, '{"\\ud800":0}'],
      [{ "\udfff": 0 }, '{"\\udfff":0}'],
    ] as const) {
      expect(refusalOf(canonicalize(runtimeValue as Json)).reason).toContain("not valid Unicode")
      expect(await probe.canonicalize(utf8(wire))).toEqual({ accepted: false })
    }
  } finally {
    await probe.close()
  }
}, 60_000)
