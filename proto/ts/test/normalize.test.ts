import { describe, expect, test } from "bun:test"

import { canonicalize, normalize, type Json } from "../src/jcs.ts"

const canonicalBytes = (value: Json): string => {
  const encoded = canonicalize(value)
  if (!encoded.ok) throw new Error(encoded.refusal.reason)
  return encoded.bytes
}

const rng = (seed: number): (() => number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed
}

const generatedTerm = (next: () => number, depth: number): Json => {
  const leaves = ["string", "bool", "int", "null", "opaque"] as const
  if (depth === 0) return { k: leaves[next() % leaves.length]! }
  switch (next() % 8) {
    case 0:
      return { k: leaves[next() % leaves.length]! }
    case 1:
      return { k: "literal", value: ["x", next() % 17, true, null][next() % 4]! }
    case 2:
      return { k: "list", of: generatedTerm(next, depth - 1) }
    case 3:
      return {
        k: "struct",
        fields: { a: generatedTerm(next, depth - 1), z: generatedTerm(next, depth - 1) },
        optional: ["z"],
      }
    case 4: {
      const members: Json[] = [
        { k: "brand", name: "Left", of: generatedTerm(next, depth - 1) },
        { k: "brand", name: "Right", of: generatedTerm(next, depth - 1) },
      ]
      if ((next() & 1) === 0) members.reverse()
      return { k: "union", of: members }
    }
    case 5:
      return { k: "brand", name: "Generated", of: generatedTerm(next, depth - 1) }
    case 6:
      return {
        k: "check",
        base: generatedTerm(next, depth - 1),
        check: { name: "bounded", args: { max: next() % 32 } },
      }
    default:
      return { k: "ref", digest: "0123456789abcdef".repeat(4) }
  }
}

const toggleRootUnion = (value: Json): Json => {
  if (typeof value !== "object" || value === null || Array.isArray(value) || value["k"] !== "union") {
    return value
  }
  return { ...value, of: [...(value["of"] as Json[])].reverse() }
}

describe("flb.type.v0 normalize laws", () => {
  test("generated terms normalize totally and idempotently", () => {
    const next = rng(0x36d20003)
    for (let index = 0; index < 512; index++) {
      const term = generatedTerm(next, 4)
      const before = canonicalBytes(term)
      const once = normalize(term)
      const twice = normalize(once)
      expect(canonicalBytes(twice)).toBe(canonicalBytes(once))
      expect(canonicalBytes(term)).toBe(before)
    }
  })

  test("permuted unordered members converge to one normal form", () => {
    const left: Json = { k: "brand", name: "Left", of: { k: "union", of: [{ k: "string" }, { k: "null" }] } }
    const right: Json = { k: "brand", name: "Right", of: { k: "bool" } }
    const first: Json = { k: "union", of: [left, right] }
    const second: Json = {
      k: "union",
      of: [right, { ...left, of: { k: "union", of: [{ k: "null" }, { k: "string" }] } }],
    }
    expect(canonicalBytes(normalize(first))).toBe(canonicalBytes(normalize(second)))
  })

  test("the idempotence canary rejects an order-toggling mutant", () => {
    const term: Json = { k: "union", of: [{ k: "null" }, { k: "string" }] }
    expect(canonicalBytes(toggleRootUnion(toggleRootUnion(term)))).not.toBe(
      canonicalBytes(toggleRootUnion(term)),
    )
  })
})
