import { describe, expect, test } from "bun:test"

import { Effect, Layer, Option, Schema } from "effect"

import { Catalog, Payloads, substrateLayer, type CatalogService } from "../src/Catalog.js"
import { digestOf, type Digest } from "../src/Digest.js"
import { decodeRefusing } from "../src/Refusal.js"
import { PublishingOf, ResolvedOf, publish, resolve } from "../src/Resolved.js"

const TermMap = Schema.Record(Schema.String, Schema.String)
const terms = { alpha: "one", beta: "two" }
const termsDigest = Effect.runSync(digestOf(terms))

/** A frame whose body is itself a resolved reference — the nesting case. */
const Frame = Schema.Struct({ at: Schema.Number, terms: ResolvedOf(TermMap) })

const Envelope = Schema.Struct({
  lane: Schema.String,
  body: ResolvedOf(TermMap),
})

/** A catalog that answers every lookup with the same wrong value. */
const tamperedCatalog = (wrong: unknown): CatalogService => ({
  get: () => Effect.succeed(Option.some(wrong as never)),
  put: (value) => digestOf(value),
})

describe("resolved references", () => {
  test("encode is total: it needs no services and publishes nothing", () => {
    const encoded = Effect.runSync(
      Schema.encodeEffect(Envelope)({ lane: "plait.dev", body: terms }),
    )
    expect(encoded.body).toBe(termsDigest)

    // The catalog is untouched by encode: decoding the same bytes against a
    // fresh substrate refuses with absence rather than succeeding.
    const refusal = Effect.runSync(
      decodeRefusing(Envelope)(encoded).pipe(Effect.provide(substrateLayer), Effect.flip),
    )
    expect(refusal.sort).toBe("absence")
    expect(refusal.kind).toBe("cataloged-value-absent")
    expect(refusal.next.length).toBeGreaterThan(0)
  })

  test("decode ∘ encode = id in a catalog that already holds the value", () => {
    const decoded = Effect.runSync(
      Effect.gen(function* () {
        const encoded = yield* Schema.encodeEffect(Envelope)({ lane: "l", body: terms })
        yield* publish(terms)
        return yield* Schema.decodeUnknownEffect(Envelope)(encoded)
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(decoded).toEqual({ lane: "l", body: terms })
  })

  test("re-derivation is unskippable: a tampered store refuses on the digest", () => {
    const refusal = Effect.runSync(
      decodeRefusing(Envelope)({ lane: "l", body: termsDigest }).pipe(
        Effect.provide(Layer.mergeAll(
          Catalog.testLayer(tamperedCatalog({ alpha: "TAMPERED" })),
          Payloads.layer,
        )),
        Effect.flip,
      ),
    )
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("digest-mismatch")
    expect(refusal.expected).toBe(termsDigest)
    expect(refusal.next.length).toBeGreaterThan(0)
  })

  test("a malformed digest slot refuses before any store is asked", () => {
    let asked = 0
    const counting: CatalogService = {
      get: () => Effect.sync(() => {
        asked++
        return Option.none()
      }),
      put: (value) => digestOf(value),
    }
    const refusal = Effect.runSync(
      decodeRefusing(Envelope)({ lane: "l", body: "not-a-digest" }).pipe(
        Effect.provide(Layer.mergeAll(Catalog.testLayer(counting), Payloads.layer)),
        Effect.flip,
      ),
    )
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("malformed-value")
    expect(asked).toBe(0)
  })

  test("a payload resolves through the internal seam and is re-derived there too", () => {
    const bytes = new TextEncoder().encode(JSON.stringify(terms))
    const payloadsOnly = Layer.mergeAll(
      Catalog.testLayer({
        get: () => Effect.succeed(Option.none()),
        put: (value) => digestOf(value),
      }),
      Payloads.testLayer({
        get: (digest: Digest) =>
          Effect.succeed(digest === termsDigest ? Option.some(bytes) : Option.none()),
      }),
    )
    expect(Effect.runSync(resolve(termsDigest).pipe(Effect.provide(payloadsOnly)))).toEqual(terms)
  })

  test("service channels propagate through nesting, and encoding stays empty", () => {
    type DecodeServices = Schema.Codec.DecodingServices<typeof Frame>
    type EncodeServices = Schema.Codec.EncodingServices<typeof Frame>
    const decodeProof: DecodeServices extends Catalog | Payloads ? true : false = true
    const encodeProof: [EncodeServices] extends [never] ? true : false = true
    expect(decodeProof && encodeProof).toBe(true)

    // A reference whose target already carries services still composes.
    const nested = ResolvedOf(Frame)
    const encoded = Effect.runSync(
      Schema.encodeEffect(nested)({ at: 1, terms }),
    )
    expect(encoded).toBe(Effect.runSync(digestOf({ at: 1, terms: termsDigest })))
  })

  test("the explicit emit path publishes, and only it carries Catalog on encode", () => {
    const Emitted = Schema.Struct({ lane: Schema.String, body: PublishingOf(TermMap) })
    type EmitServices = Schema.Codec.EncodingServices<typeof Emitted>
    const emitProof: Catalog extends EmitServices ? true : false = true
    expect(emitProof).toBe(true)

    const round = Effect.runSync(
      Effect.gen(function* () {
        const wire = yield* Schema.encodeEffect(Emitted)({ lane: "l", body: terms })
        // The emit path decodes through the SAME seam every other path uses.
        // Pinning decodeRefusing's encoding services to `never` closed this
        // door and forced callers past the seam onto SchemaIssue (F-3).
        return yield* decodeRefusing(Emitted)(wire)
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(round.body).toEqual(terms)
  })

  test("the seam covers the emit path: an emitted frame refuses as a Refusal", () => {
    const Emitted = Schema.Struct({ lane: Schema.String, body: PublishingOf(TermMap) })
    const refusal = Effect.runSync(
      decodeRefusing(Emitted)({ lane: "l", body: termsDigest }).pipe(
        Effect.provide(substrateLayer),
        Effect.flip,
      ),
    )
    // Not a SchemaIssue: the whole point of the seam is that no caller of a
    // Plait codec ever sees one.
    expect(refusal.sort).toBe("absence")
    expect(refusal.kind).toBe("cataloged-value-absent")
    expect(refusal.next.length).toBeGreaterThan(0)
  })
})
