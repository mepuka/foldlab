// The proto adapter side of the fixture wall: proto/wire/fixtures was
// generated once by the Go side (cmd/wirefix) and frozen. Every canonical
// byte string and digest re-derives through the single TS encoder; a mismatch
// means the adapter or identity path drifted — never edit the fixture.
import { describe, expect, test } from "bun:test"
import { canonicalize, entryDigest, foldChain, sha256Hex, GENESIS, type Json } from "../src/jcs.ts"

const fixture = async (name: string): Promise<any> =>
  (await import(`../../wire/fixtures/${name}`, { with: { type: "json" } })).default

const canonicalBytes = (value: Json): string => {
  const encoded = canonicalize(value)
  if (!encoded.ok) throw new Error(encoded.refusal.reason)
  return encoded.bytes
}

describe("type fixtures re-derive byte-identically", async () => {
  const vectors: Array<{ name: string; structure: Json; canonical: string; digest: string }> =
    await fixture("types.json")
  test("corpus is non-empty", () => expect(vectors.length).toBeGreaterThan(0))
  for (const vector of vectors) {
    test(vector.name, () => {
      const canonical = canonicalBytes(vector.structure)
      expect(canonical).toBe(vector.canonical)
      expect(sha256Hex(canonical)).toBe(vector.digest)
    })
  }
})

describe("chain fixtures re-derive", async () => {
  const vectors: Array<{ name: string; payloads: string[]; entryDigests: string[]; head: string }> =
    await fixture("chains.json")
  test("corpus is non-empty", () => expect(vectors.length).toBeGreaterThan(0))
  for (const vector of vectors) {
    test(vector.name, () => {
      let prev = GENESIS
      vector.payloads.forEach((payload, seq) => {
        const result = entryDigest({ seq, prev, payload })
        expect(result).toEqual({ ok: true, digest: vector.entryDigests[seq]! })
        if (!result.ok) throw new Error(result.refusal.reason)
        prev = result.digest
      })
      expect(prev).toBe(vector.head)

      // The same law through the read-side fold.
      const entries = vector.payloads.map((payload, seq) => ({
        seq,
        prev: vector.entryDigests[seq - 1] ?? GENESIS,
        payload,
      }))
      const fold = foldChain(entries)
      expect(fold).toEqual({ ok: true, seq: vector.payloads.length - 1, head: vector.head })
    })
  }
})

describe("frame fixtures re-derive", async () => {
  const vectors: Array<{ name: string; frame: Json; canonical: string }> = await fixture("frames.json")
  test("corpus is non-empty", () => expect(vectors.length).toBeGreaterThan(0))
  for (const vector of vectors) {
    test(vector.name, () => {
      expect(canonicalBytes(vector.frame)).toBe(vector.canonical)
    })
  }
})

describe("concierge request/reply fixtures re-derive", async () => {
  const vectors: Array<{
    name: string
    request: Json
    requestCanonical: string
    reply: Json
    replyCanonical: string
  }> = await fixture("concierge.json")
  test("corpus is non-empty", () => expect(vectors.length).toBeGreaterThan(0))
  for (const vector of vectors) {
    test(vector.name, () => {
      expect(canonicalBytes(vector.request)).toBe(vector.requestCanonical)
      expect(canonicalBytes(vector.reply)).toBe(vector.replyCanonical)
    })
  }
})

describe("the fold refuses what it cannot verify", () => {
  test("a tampered payload is caught by the chain fold", () => {
    const first = entryDigest({ seq: 0, prev: GENESIS, payload: "a" })
    if (!first.ok) throw new Error(first.refusal.reason)
    const honest = [
      { seq: 0, prev: GENESIS, payload: "a" },
      { seq: 1, prev: first.digest, payload: "b" },
    ]
    expect(foldChain(honest).ok).toBe(true)
    const tampered = [{ ...honest[0]!, payload: "A" }, honest[1]!]
    const fold = foldChain(tampered)
    expect(fold.ok).toBe(false)
  })
})
