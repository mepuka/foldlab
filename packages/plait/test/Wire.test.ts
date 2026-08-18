import { describe, expect, test } from "bun:test"
import { Effect, Tracer } from "effect"

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

/** Collects every span a program emits, per the pin's own tracer example. */
const spanNamesOf = async (program: Effect.Effect<unknown, unknown>): Promise<Array<string>> => {
  const names: Array<string> = []
  const tracer = Tracer.make({
    span(options) {
      names.push(options.name)
      return new Tracer.NativeSpan(options)
    },
  })
  await Effect.runPromise(Effect.provideService(program, Tracer.Tracer, tracer))
  return names
}

describe("decodeEnvelope", () => {
  test("carries holder verbatim and re-derives the envelope digest", async () => {
    const decoded = await Effect.runPromise(decodeEnvelope(frame("")))

    expect(decoded.envelope.holder).toBe("seat-a")
    expect(String(decoded.digest)).toBe(
      "bb4f3e5e257ca09b067986bbcb6fa72f9b868eea9d4dff92afd94e2876aa795a",
    )
  })

  test("still emits the Digest.digestOf child span it emitted before B-5", async () => {
    // B-5 removed one redundant canonicalization and nothing else. A trace is
    // observable, so the decode's span tree must not change shape: the digest
    // door is `Effect.fn("Digest.digestOf")` deliberately, under the old name.
    const names = await spanNamesOf(decodeEnvelope(frame("")))

    expect(names).toContain("Wire.decodeEnvelope")
    expect(names).toContain("Canonical.canonicalBytes")
    expect(names.filter((name) => name === "Digest.digestOf").length).toBe(1)
  })

  test("refuses an excess property with the closed-envelope law", async () => {
    const refusal = await Effect.runPromise(
      Effect.flip(decodeEnvelope(frame(',"smuggled":true'))),
    )

    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("malformed-envelope")
    expect(refusal.law).toBe(
      "Envelope v0 is a closed struct; excess properties are refused.",
    )
    expect(refusal.path).toEqual(["smuggled"])
    expect(refusal.got).toBe(true)
    expect(refusal.expected).toBe("no excess property")
  })

  test("reports the observed value and path for a malformed field", async () => {
    const malformed = utf8.encode(
      `{"v":0,"kind":"emit","lane":"${digest}","key":"entity-1","holder":7,"body":1,"pins":[]}`,
    )
    const refusal = await Effect.runPromise(Effect.flip(decodeEnvelope(malformed)))

    expect(refusal.law).toBe(
      "Envelope v0 fields must have the fixed wire shapes declared by the fabric contract.",
    )
    expect(refusal.path).toEqual(["holder"])
    expect(refusal.got).toBe(7)
    expect(refusal.expected).toBe("a holder string carried verbatim")
  })

  test("reports nested excess properties from the structured schema issue", async () => {
    const malformed = utf8.encode(JSON.stringify({
      v: 0,
      kind: "attest",
      lane: digest,
      key: "entity-1",
      holder: "seat-a",
      body: 1,
      cert: {
        schema: digest,
        program: digest,
        inputAnchor: digest,
        spanHead: digest,
        smuggled: true,
      },
      pins: [],
    }))
    const refusal = await Effect.runPromise(Effect.flip(decodeEnvelope(malformed)))

    expect(refusal.law).toBe(
      "Envelope v0 is a closed struct; excess properties are refused.",
    )
    expect(refusal.path).toEqual(["cert", "smuggled"])
    expect(refusal.got).toBe(true)
  })

  test("refuses both widened and non-digest blob references at their exact paths", async () => {
    const envelope = (body: unknown): Uint8Array =>
      utf8.encode(JSON.stringify({
        v: 0,
        kind: "checkpoint",
        lane: digest,
        key: "entity-1",
        holder: "seat-a",
        body,
        pins: [],
      }))
    const widened = await Effect.runPromise(
      Effect.flip(decodeEnvelope(envelope({ blob: digest, extra: true }))),
    )
    const malformed = await Effect.runPromise(
      Effect.flip(decodeEnvelope(envelope({ blob: "not-a-digest" }))),
    )

    expect(widened.kind).toBe("malformed-blob-reference")
    expect(widened.path).toEqual(["body", "extra"])
    expect(widened.got).toBe(true)
    expect(malformed.kind).toBe("malformed-blob-reference")
    expect(malformed.path).toEqual(["body", "blob"])
    expect(malformed.got).toBe("not-a-digest")
  })

  test("inlines at most 256 KiB of canonical body bytes", async () => {
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

    const atBoundary = await Effect.runPromise(
      decodeEnvelope(envelope("x".repeat(INLINE_BODY_MAX_BYTES - 2))),
    )
    const overBoundary = await Effect.runPromise(
      Effect.flip(decodeEnvelope(envelope("x".repeat(INLINE_BODY_MAX_BYTES - 1)))),
    )

    expect(atBoundary.envelope.body).toHaveLength(INLINE_BODY_MAX_BYTES - 2)
    expect(overBoundary.kind).toBe("inline-body-too-large")
  })

  test("refuses a message id that does not name the envelope", async () => {
    const refusal = await Effect.runPromise(
      Effect.flip(verifyEnvelopeDigest(frame(""), "0".repeat(64))),
    )

    expect(refusal.kind).toBe("digest-mismatch")
    expect(refusal.path).toEqual(["Nats-Msg-Id"])
  })

  test("encodes through the same constrained envelope door", async () => {
    const decoded = await Effect.runPromise(decodeEnvelope(frame("")))
    const encoded = await Effect.runPromise(encodeEnvelope(decoded.envelope))

    expect(String(encoded.digest)).toBe(String(decoded.digest))
    expect(encoded.bytes).toEqual(decoded.bytes)
  })
})
