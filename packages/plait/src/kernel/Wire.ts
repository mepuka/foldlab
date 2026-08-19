/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * @module
 */
import { Effect, Predicate, Result, Schema, SchemaIssue } from "effect"

import { decodeJson, type JsonValue } from "@foldlab/core/jcs"
import { canonicalBytes } from "../truth/Canonical.js"
import { Digest, type Digest as DigestValue } from "../truth/Digest.js"
import { digestOfCanonicalBytes } from "../internal/digests.js"
import { structuralRefusal, type StructuralRefusal,
  WireValueSchema,
} from "../truth/Refusal.js"

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

/**
 * The `max_payload` the pinned server advertises, MEASURED and not assumed.
 *
 * `test/MaxPayloadSemantics.test.ts` reads it off the pinned `v2.14.4` server's
 * own INFO block and then measures the boundary against it on both sides: over a
 * raw socket the server answers a publish of exactly this many bytes `+OK` and
 * one byte more `-ERR 'Maximum Payload Violation'`, and the pinned client
 * enforces the same boundary locally without sending. Until that probe landed
 * this number was folklore — the vendor scorecard's one UNANSWERED item
 * (`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md`, item 4) — and the
 * inline threshold below was a round number with nothing under it.
 *
 * It is the DEFAULT at the pin, so it is a property of the substrate this
 * package is walled against and not of NATS: an operator sets `max_payload` in
 * server config, which is why the emit seam checks the live value against this
 * pin rather than trusting it (`hasPayloadBudget`).
 */
export const MAX_PAYLOAD_BYTES = 1024 * 1024

/**
 * What the emit path's header block costs inside that same budget.
 *
 * `max_payload` bounds the whole published frame, headers included, and the emit
 * seam always sets `Nats-Msg-Id` to the 64-character envelope digest. That one
 * header costs 91 bytes: the largest body the pinned server accepts on a
 * JetStream publish carrying it is `MAX_PAYLOAD_BYTES - 91`.
 *
 * Two independent routes reach that number and the wall compares them — a
 * bracketed bisection against the live server, and a count of the header block
 * the wire grammar requires (`NATS/1.0\r\nNats-Msg-Id: <64 hex>\r\n\r\n`).
 * Neither is computed from the other, so a later slice that adds a header moves
 * the measurement and the derivation together or the disagreement is a finding.
 */
export const EMIT_HEADER_BYTES = 91

/** The measured budget one emitted envelope's canonical bytes may occupy. */
export const EMIT_PAYLOAD_BUDGET_BYTES = MAX_PAYLOAD_BYTES - EMIT_HEADER_BYTES

/**
 * The stated margin between the measured budget and the inline threshold.
 *
 * A quarter, and the quarter is load-bearing rather than decorative. An
 * envelope carries its body TWICE in the worst admitted case: a lane declared
 * with an empty partition-key path keys by the whole event, so `key` and `body`
 * are the same value, and an emit at the threshold publishes roughly twice the
 * threshold. A half-budget threshold would put that case exactly on the limit;
 * a quarter puts it at half, measured at 524,430 bytes against a 1,048,485-byte
 * emit budget.
 *
 * Stated residual, because the margin is a bound on the body and not on the
 * frame: `holder`, `pins`, and `cert` are caller-supplied and unbounded, so a
 * caller who attaches tens of thousands of pins can still exceed the budget with
 * a lawful body. That case refuses at the substrate, not here, and bounding the
 * frame needs its own ruled ticket.
 */
export const INLINE_BODY_MARGIN = 4

/** The maximum canonical byte length of an inline body. */
export const INLINE_BODY_MAX_BYTES = MAX_PAYLOAD_BYTES / INLINE_BODY_MARGIN

/**
 * The threshold's substrate half: whether a live server's advertised
 * `max_payload` is at least the budget the threshold was pinned against.
 *
 * A floor, not a pin. A server advertising MORE carries every emit this
 * threshold admits and is not a violation; a server advertising less makes the
 * threshold folklore again, and an emit at it would fail past this package's
 * error channel — the pinned client raises an over-budget publish as
 * `InvalidArgumentError`, which `internal/transport.ts` classifies as a caller
 * defect and rethrows rather than dressing as a retryable absence.
 *
 * The arithmetic half — that the pinned budget really does carry a doubled body
 * at the threshold plus the header block — is checked over the constants alone
 * and needs no server (`test/MaxPayloadSemantics.test.ts`).
 */
export const hasPayloadBudget = (advertised: number | undefined): boolean =>
  advertised !== undefined && advertised >= MAX_PAYLOAD_BYTES

/** The closed envelope-v0 boundary shape. */
export const Envelope = Schema.Struct({
  v: Schema.Literal(0),
  kind: EnvelopeKind,
  lane: Digest,
  key: WireValueSchema,
  holder: Schema.String,
  body: WireValueSchema,
  cert: Schema.optionalKey(Certificate),
  pins: Schema.Array(Digest),
})

/** The closed envelope-v0 boundary shape. */
export type Envelope = typeof Envelope.Type

/** One admitted envelope together with its canonical bytes and identity. */
export interface DecodedEnvelope {
  readonly envelope: Envelope
  readonly bytes: Uint8Array
  readonly digest: DigestValue
}

const closedEnvelopeLaw =
  "Envelope v0 is a closed struct; excess properties are refused."
const envelopeShapeLaw =
  "Envelope v0 fields must have the fixed wire shapes declared by the fabric contract."
const inlineBodyLaw =
  `Envelope v0 inlines at most ${INLINE_BODY_MAX_BYTES} canonical body bytes; larger bodies use {blob}.`
const blobReferenceLaw =
  "Envelope v0 reserves {blob: Digest} as an exact closed body form."

interface LocatedIssue {
  readonly path: ReadonlyArray<string>
  readonly issue: SchemaIssue.Issue
}

/**
 * Walks to the first leaf issue, keeping its `_tag`.
 *
 * An audited deviation from the pin's own formatters (audit B-9): the pinned
 * `makeFormatterStandardSchemaV1` walk erases the leaf tag, and the refusal
 * taxonomy below reads exactly that tag — `UnexpectedKey` is what separates the
 * closed-struct law from the field-shape law. `internal/refusals.ts` walks
 * issues too, for a different law (recovering the ridden refusal annotation);
 * friction card FH-8 records the considered-and-refused merge of the two.
 */
const firstIssue = (
  issue: SchemaIssue.Issue,
  path: ReadonlyArray<string> = [],
): LocatedIssue => {
  switch (issue._tag) {
    case "Pointer":
      return firstIssue(
        issue.issue,
        [...path, ...issue.path.map(String)],
      )
    case "Composite":
      return firstIssue(issue.issues[0], path)
    case "AnyOf":
      return issue.issues[0] === undefined
        ? { path, issue }
        : firstIssue(issue.issues[0], path)
    case "Filter":
    case "Encoding":
      return firstIssue(issue.issue, path)
    default:
      return { path, issue }
  }
}

const envelopeExpectedAt = (path: ReadonlyArray<string>): JsonValue => {
  const [head, second] = path
  if (head === undefined) return "the closed Envelope v0 object"
  if (head === "v") return 0
  if (head === "kind") return ["emit", "attest", "checkpoint", "sealed"]
  if (head === "lane") return "a lowercase SHA-256 digest"
  if (head === "key") return "one RFC 8785 JSON value"
  if (head === "holder") return "a holder string carried verbatim"
  if (head === "body") return "one RFC 8785 JSON value or exact {blob: Digest}"
  if (head === "pins") return "an array of lowercase SHA-256 digests"
  if (head === "cert") {
    return second === undefined
      ? "a certificate object with schema, program, inputAnchor, and spanHead digests"
      : "a lowercase SHA-256 digest"
  }
  return "a field declared by the closed Envelope v0 schema"
}

const observed = (issue: SchemaIssue.Issue): JsonValue =>
  SchemaIssue.hasInput(issue) && Schema.is(WireValueSchema)(issue.input)
    ? issue.input
    : "missing"

const envelopeSchemaRefusal = (
  issue: SchemaIssue.Issue,
): StructuralRefusal => {
  const located = firstIssue(issue)
  const excess = located.issue._tag === "UnexpectedKey"
  return structuralRefusal({
    kind: "malformed-envelope",
    law: excess ? closedEnvelopeLaw : envelopeShapeLaw,
    path: located.path,
    got: observed(located.issue),
    expected: excess ? "no excess property" : envelopeExpectedAt(located.path),
    next: [{
      subject: "decode",
      note: "Submit one closed Envelope v0 value with the expected field shape.",
    }],
  })
}

const jsonRefusal = (
  bytes: Uint8Array,
  refusal: { readonly offset: number; readonly reason: string },
): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-envelope",
    law: envelopeShapeLaw,
    path: ["bytes", String(refusal.offset)],
    got: bytes[refusal.offset] ?? "end-of-input",
    expected: "one constrained JSON envelope",
    next: [{ subject: "decode", note: refusal.reason }],
  })

const blobSchemaRefusal = (issue: SchemaIssue.Issue): StructuralRefusal => {
  const located = firstIssue(issue)
  const excess = located.issue._tag === "UnexpectedKey"
  return structuralRefusal({
    kind: "malformed-blob-reference",
    law: blobReferenceLaw,
    path: ["body", ...located.path],
    got: observed(located.issue),
    expected: excess
      ? "no excess property"
      : "exactly one blob field carrying a lowercase SHA-256 digest",
    next: [{
      subject: "decode",
      note: "Replace the body with the exact {blob: Digest} form.",
      body: { blob: "0".repeat(64) },
    }],
  })
}

const validateBody = Effect.fn("Wire.validateBody")(function* (
  body: Envelope["body"],
): Effect.fn.Return<void, StructuralRefusal> {
  if (Predicate.isObject(body) && Object.hasOwn(body, "blob")) {
    const reference = Schema.decodeUnknownResult(BlobReference, {
      onExcessProperty: "error",
      errors: "first",
      reportInput: true,
    })(body)
    if (Result.isFailure(reference)) return yield* blobSchemaRefusal(reference.failure.issue)
    return
  }

  const canonical = yield* canonicalBytes(body).pipe(
    Effect.mapError((refusal) => structuralRefusal({
      kind: "malformed-envelope",
      law: envelopeShapeLaw,
      path: ["body", ...refusal.path],
      got: refusal.got,
      expected: refusal.expected,
      next: refusal.next,
    })),
  )
  if (canonical.byteLength > INLINE_BODY_MAX_BYTES) {
    return yield* structuralRefusal({
      kind: "inline-body-too-large",
      law: inlineBodyLaw,
      path: ["body"],
      got: canonical.byteLength,
      expected: INLINE_BODY_MAX_BYTES,
      next: [{
        subject: "decode",
        note: "Store the body as a blob and submit the exact {blob: Digest} form.",
        body: { blob: "0".repeat(64) },
      }],
    })
  }
})

/**
 * Constrained-decodes one envelope and refuses rather than repairing input.
 *
 * @example
 * ```ts
 * import { decodeEnvelope } from "@foldlab/plait/Wire"
 * import { Effect } from "effect"
 *
 * Effect.runPromise(Effect.flip(decodeEnvelope(new TextEncoder().encode("{}"))))
 * // StructuralRefusal
 * ```
 */
export const decodeEnvelope = Effect.fn("Wire.decodeEnvelope")(function* (
  bytes: Uint8Array,
): Effect.fn.Return<DecodedEnvelope, StructuralRefusal> {
  const parsed = decodeJson(bytes)
  if (!parsed.ok) return yield* jsonRefusal(bytes, parsed.refusal)

  const decoded = Schema.decodeUnknownResult(Envelope, {
    onExcessProperty: "error",
    errors: "first",
    reportInput: true,
  })(parsed.value)
  if (Result.isFailure(decoded)) {
    return yield* envelopeSchemaRefusal(decoded.failure.issue)
  }

  yield* validateBody(decoded.success.body)
  const bytesCanonical = yield* canonicalBytes(decoded.success)
  return {
    envelope: decoded.success,
    bytes: bytesCanonical,
    digest: digestOfCanonicalBytes(bytesCanonical),
  }
})

/** Canonical-encodes a typed envelope through the constrained decode door. */
export const encodeEnvelope = Effect.fn("Wire.encodeEnvelope")(function* (
  envelope: Envelope,
): Effect.fn.Return<DecodedEnvelope, StructuralRefusal> {
  const bytes = yield* canonicalBytes(envelope)
  return yield* decodeEnvelope(bytes)
})

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
export const verifyEnvelopeDigest = Effect.fn("Wire.verifyEnvelopeDigest")(function* (
  bytes: Uint8Array,
  messageId: string,
): Effect.fn.Return<DecodedEnvelope, StructuralRefusal> {
  const decoded = yield* decodeEnvelope(bytes)
  if (decoded.digest === messageId) return decoded
  return yield* structuralRefusal({
    kind: "digest-mismatch",
    law: "Nats-Msg-Id must equal SHA-256 over the envelope's canonical uncompressed bytes.",
    path: ["Nats-Msg-Id"],
    got: messageId,
    expected: decoded.digest,
    next: [{
      subject: "Nats-Msg-Id",
      note: "Re-derive SHA-256 from the canonical uncompressed envelope bytes before publishing.",
      body: decoded.digest,
    }],
  })
})
