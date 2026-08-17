import { Predicate, Result, Schema } from "effect"

import { decodeJson } from "../../core/src/jcs.js"
import { canonicalBytes } from "./Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "./Digest.js"
import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

/** The four monotone observation kinds admitted by envelope v0. */
export const EnvelopeKind = Schema.Literals([
  "emit",
  "attest",
  "checkpoint",
  "sealed",
])

/** The four monotone observation kinds admitted by envelope v0. */
export type EnvelopeKind = typeof EnvelopeKind.Type

/** A recomputable derivation claim attached to a produced value. */
export const Certificate = Schema.Struct({
  schema: Digest,
  program: Digest,
  inputAnchor: Digest,
  spanHead: Digest,
})

/** A recomputable derivation claim attached to a produced value. */
export type Certificate = typeof Certificate.Type

/** A digest reference used when a canonical body exceeds the inline threshold. */
export const BlobReference = Schema.Struct({ blob: Digest })

/** A digest reference used when a canonical body exceeds the inline threshold. */
export type BlobReference = typeof BlobReference.Type

/** The maximum canonical byte length of an inline body. */
export const INLINE_BODY_MAX_BYTES = 256 * 1024

/** The closed envelope-v0 boundary shape. */
export const Envelope = Schema.Struct({
  v: Schema.Literal(0),
  kind: EnvelopeKind,
  lane: Digest,
  key: Schema.Json,
  holder: Schema.String,
  body: Schema.Json,
  cert: Schema.optionalKey(Certificate),
  pins: Schema.Array(Digest),
})

/** The closed envelope-v0 boundary shape. */
export type Envelope = typeof Envelope.Type

/** The constrained envelope decoder's explicit success or refusal. */
export type EnvelopeDecode =
  | {
    readonly ok: true
    readonly envelope: Envelope
    readonly bytes: Uint8Array
    readonly digest: DigestValue
  }
  | { readonly ok: false; readonly refusal: StructuralRefusal }

const closedEnvelopeLaw =
  "Envelope v0 is a closed struct; excess properties are refused."
const envelopeShapeLaw =
  "Envelope v0 fields must have the fixed wire shapes declared by the fabric contract."
const inlineBodyLaw =
  `Envelope v0 inlines at most ${INLINE_BODY_MAX_BYTES} canonical body bytes; larger bodies use {blob}.`

const malformed = (
  law: string,
  got: string,
  expected: string,
): EnvelopeDecode => ({
  ok: false,
  refusal: structuralRefusal({
    kind: "malformed-envelope",
    law,
    path: [],
    got,
    expected,
    next: [],
  }),
})

const bodyRefusal = (body: Envelope["body"]): StructuralRefusal | undefined => {
  if (Predicate.isObject(body) && Object.hasOwn(body, "blob")) {
    const reference = Schema.decodeUnknownResult(BlobReference, {
      onExcessProperty: "error",
      errors: "all",
    })(body)
    if (Result.isFailure(reference)) {
      return structuralRefusal({
        kind: "malformed-blob-reference",
        law: "Envelope v0 reserves {blob: Digest} as an exact closed body form.",
        path: ["body"],
        got: String(reference.failure),
        expected: "exactly one blob field carrying a lowercase SHA-256 digest",
        next: [],
      })
    }
    return undefined
  }

  const canonical = canonicalBytes(body)
  if (!canonical.ok) {
    return structuralRefusal({
      kind: "malformed-envelope",
      law: envelopeShapeLaw,
      path: ["body"],
      got: canonical.refusal.reason,
      expected: "one RFC 8785 wire value",
      next: [],
    })
  }
  if (canonical.bytes.byteLength > INLINE_BODY_MAX_BYTES) {
    return structuralRefusal({
      kind: "inline-body-too-large",
      law: inlineBodyLaw,
      path: ["body"],
      got: canonical.bytes.byteLength,
      expected: INLINE_BODY_MAX_BYTES,
      next: [],
    })
  }
  return undefined
}

/**
 * Constrained-decodes one envelope and refuses rather than repairing input.
 *
 * @example
 * ```ts
 * import { decodeEnvelope } from "@foldlab/plait/Wire"
 *
 * decodeEnvelope(new TextEncoder().encode("{}"))
 * // { ok: false, refusal: { sort: "structural", ... } }
 * ```
 */
export const decodeEnvelope = (bytes: Uint8Array): EnvelopeDecode => {
  const parsed = decodeJson(bytes)
  if (!parsed.ok) {
    return malformed(
      envelopeShapeLaw,
      parsed.refusal.reason,
      "one constrained JSON envelope",
    )
  }

  const decoded = Schema.decodeUnknownResult(Envelope, {
    onExcessProperty: "error",
    errors: "all",
  })(parsed.value)
  if (Result.isFailure(decoded)) {
    const got = String(decoded.failure)
    return malformed(
      got.includes("Expected no excess property") ? closedEnvelopeLaw : envelopeShapeLaw,
      got,
      "the closed Envelope v0 schema",
    )
  }

  const bodyFailure = bodyRefusal(decoded.success.body)
  if (bodyFailure !== undefined) return { ok: false, refusal: bodyFailure }

  const canonical = canonicalBytes(decoded.success)
  if (!canonical.ok) {
    return malformed(
      envelopeShapeLaw,
      canonical.refusal.reason,
      "an RFC 8785 envelope value",
    )
  }
  const identity = digestOf(decoded.success)
  if (!identity.ok) {
    return malformed(
      envelopeShapeLaw,
      identity.refusal.reason,
      "an RFC 8785 envelope value",
    )
  }

  return {
    ok: true,
    envelope: decoded.success,
    bytes: canonical.bytes,
    digest: identity.digest,
  }
}

/** Canonical-encodes a typed envelope through the constrained decode door. */
export const encodeEnvelope = (envelope: Envelope): EnvelopeDecode => {
  const canonical = canonicalBytes(envelope)
  if (!canonical.ok) {
    return malformed(
      envelopeShapeLaw,
      canonical.refusal.reason,
      "an RFC 8785 envelope value",
    )
  }
  return decodeEnvelope(canonical.bytes)
}

/**
 * Constrained-decodes an envelope and checks that its message id is its digest.
 *
 * @example
 * ```ts
 * import { verifyEnvelopeDigest } from "@foldlab/plait/Wire"
 *
 * verifyEnvelopeDigest(bytes, messageId)
 * ```
 */
export const verifyEnvelopeDigest = (
  bytes: Uint8Array,
  messageId: string,
): EnvelopeDecode => {
  const decoded = decodeEnvelope(bytes)
  if (!decoded.ok) return decoded
  if (decoded.digest === messageId) return decoded
  return {
    ok: false,
    refusal: structuralRefusal({
      kind: "digest-mismatch",
      law: "Nats-Msg-Id must equal SHA-256 over the envelope's canonical uncompressed bytes.",
      path: ["Nats-Msg-Id"],
      got: messageId,
      expected: decoded.digest,
      next: [],
    }),
  }
}
