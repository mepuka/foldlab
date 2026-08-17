import { describe, expect, test } from "bun:test"

import {
  decodeEnvelope,
  encodeEnvelope,
  INLINE_BODY_MAX_BYTES,
  verifyEnvelopeDigest,
} from "../src/Wire.js"

const utf8 = new TextEncoder()
const digest = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"

const frame = (extra: string): Uint8Array =>
  utf8.encode(
    `{"v":0,"kind":"emit","lane":"${digest}","key":"entity-1","holder":"seat-a","body":{"value":1},"pins":[]${extra}}`,
  )

describe("decodeEnvelope", () => {
  test("carries holder verbatim and re-derives the envelope digest", () => {
    const decoded = decodeEnvelope(frame(""))

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error(decoded.refusal.law)
    expect(decoded.envelope.holder).toBe("seat-a")
    expect(String(decoded.digest)).toBe(
      "bb4f3e5e257ca09b067986bbcb6fa72f9b868eea9d4dff92afd94e2876aa795a",
    )
  })

  test("refuses an excess property with the closed-envelope law", () => {
    const decoded = decodeEnvelope(frame(',"smuggled":true'))

    expect(decoded.ok).toBe(false)
    if (decoded.ok) throw new Error("the excess property was admitted")
    expect(decoded.refusal.sort).toBe("structural")
    expect(decoded.refusal.kind).toBe("malformed-envelope")
    expect(decoded.refusal.law).toBe(
      "Envelope v0 is a closed struct; excess properties are refused.",
    )
  })

  test("inlines at most 256 KiB of canonical body bytes", () => {
    const envelope = (body: string): Uint8Array =>
      utf8.encode(JSON.stringify({
        v: 0,
        kind: "emit",
        lane: digest,
        key: "entity-1",
        holder: "seat-a",
        body,
        pins: [],
      }))

    const atBoundary = decodeEnvelope(envelope("x".repeat(INLINE_BODY_MAX_BYTES - 2)))
    const overBoundary = decodeEnvelope(envelope("x".repeat(INLINE_BODY_MAX_BYTES - 1)))

    expect(atBoundary.ok).toBe(true)
    expect(overBoundary.ok).toBe(false)
    if (overBoundary.ok) throw new Error("oversize body was inlined")
    expect(overBoundary.refusal.kind).toBe("inline-body-too-large")
  })

  test("refuses a message id that does not name the envelope", () => {
    const verified = verifyEnvelopeDigest(frame(""), "0".repeat(64))

    expect(verified.ok).toBe(false)
    if (verified.ok) throw new Error("the false message id was admitted")
    expect(verified.refusal.kind).toBe("digest-mismatch")
    expect(verified.refusal.path).toEqual(["Nats-Msg-Id"])
  })

  test("encodes through the same constrained envelope door", () => {
    const decoded = decodeEnvelope(frame(""))
    if (!decoded.ok) throw new Error(decoded.refusal.law)

    const encoded = encodeEnvelope(decoded.envelope)

    expect(encoded.ok).toBe(true)
    if (!encoded.ok) throw new Error(encoded.refusal.law)
    expect(String(encoded.digest)).toBe(String(decoded.digest))
    expect(encoded.bytes).toEqual(decoded.bytes)
  })
})
