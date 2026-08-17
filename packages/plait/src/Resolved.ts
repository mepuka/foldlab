/**
 * References that decode by resolving — the R-channel move.
 *
 * Decoding a `ResolvedOf` requires `Catalog` (and `Blobs` for payloads stored
 * outside the inline threshold) from the environment; decode re-derives the
 * digest of whatever it fetched and refuses on mismatch. There is no decode
 * path that trusts an asserted digest: the schema *is* the verify-on-read law,
 * and a handler that decodes such a body cannot compile without the services.
 *
 * **Encode is total and NOT publishing.** `encode` computes the digest of the
 * canonical bytes and writes nothing, so `decode ∘ encode = id` holds only in
 * a catalog already holding the value. Publication is the explicit `publish`
 * act. `PublishingOf` (`EncodingServices` carrying `Catalog`) is reserved for
 * the explicit emit path, which keeps derivation, replay, and memo-key
 * computation runnable with no environment.
 *
 * Service channels propagate: a resolved value may itself hold resolved
 * references, which is the normal case for a frame that references cataloged
 * values, not the exotic one.
 *
 * @module
 */
import { Effect, Option, Schema, SchemaGetter } from "effect"

import { canonicalBytes, type WireValue } from "./Canonical.js"
import { Blobs, Catalog } from "./Catalog.js"
import { Digest, digestOf } from "./Digest.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Next,
  type Refusal,
} from "./Refusal.js"
import { refusalIssue } from "./internal/refusals.js"

/** The type-side digest schema: the hex check without the encoding path. */
const DigestType = Schema.toType(Digest)

const teachPublish: ReadonlyArray<Next> = [{
  subject: "catalog.publish",
  note: "Publish the value under this digest before resolving the reference, then decode again.",
}]
const teachRederive: ReadonlyArray<Next> = [{
  subject: "catalog.publish",
  note: "Re-derive the digest from the value's canonical uncompressed bytes and reference it under that digest.",
}]
const teachBlobBytes: ReadonlyArray<Next> = [{
  subject: "catalog.publish",
  note: "Store the payload as the canonical uncompressed bytes of one RFC 8785 wire value.",
}]

const absent = (digest: Digest): Refusal =>
  absenceRefusal({
    kind: "cataloged-value-absent",
    law: "A reference resolves only against a catalog or payload store that holds its value.",
    path: ["digest"],
    got: "absent",
    expected: digest,
    next: teachPublish,
  })

const incoherent = (expected: Digest, got: Digest): Refusal =>
  structuralRefusal({
    kind: "digest-mismatch",
    law: "A resolved value's identity is re-derived on read and never asserted.",
    path: ["digest"],
    got,
    expected,
    next: teachRederive,
  })

const malformedPayload = (digest: Digest, reason: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "Stored payload bytes decode as one RFC 8785 wire value before any identity check.",
    path: ["blob", digest],
    got: reason,
    expected: "one RFC 8785 wire value",
    next: teachBlobBytes,
  })

const verified = Effect.fn("Resolved.verified")(function* (
  digest: Digest,
  value: WireValue,
): Effect.fn.Return<WireValue, Refusal> {
  const rederived = yield* digestOf(value)
  if (rederived === digest) return value
  return yield* incoherent(digest, rederived)
})

const decodePayload = (
  digest: Digest,
  bytes: Uint8Array,
): Effect.Effect<WireValue, Refusal> =>
  Effect.try({
    try: () => JSON.parse(new TextDecoder().decode(bytes)) as WireValue,
    catch: (cause) => malformedPayload(digest, String(cause)),
  })

/**
 * Resolves one digest to its value, re-deriving identity before returning it.
 *
 * The catalog is asked first; a payload store lookup follows; an unresolvable
 * digest is head-relative absence, the only retryable sort. This is the single
 * resolution seam every `ResolvedOf` decode runs through, so every resolve
 * carries one span.
 *
 * @example
 * ```ts
 * import { resolve } from "@foldlab/plait/Resolved"
 * import { substrateLayer } from "@foldlab/plait/Catalog"
 * import { Effect } from "effect"
 *
 * resolve(digest).pipe(Effect.provide(substrateLayer))
 * ```
 */
export const resolve = Effect.fn("Resolved.resolve")(function* (
  digest: Digest,
): Effect.fn.Return<WireValue, Refusal, Catalog | Blobs> {
  const catalog = yield* Catalog
  const cataloged = yield* catalog.get(digest)
  if (Option.isSome(cataloged)) return yield* verified(digest, cataloged.value)
  const blobs = yield* Blobs
  const payload = yield* blobs.get(digest)
  if (Option.isNone(payload)) return yield* absent(digest)
  return yield* verified(digest, yield* decodePayload(digest, payload.value))
})

/**
 * Admits a value into the catalog and returns its identity with its bytes.
 *
 * Publication is an explicit act; no encode path performs it.
 */
export const publish = Effect.fn("Resolved.publish")(function* (
  value: WireValue,
): Effect.fn.Return<{ readonly digest: Digest; readonly bytes: Uint8Array }, Refusal, Catalog> {
  const catalog = yield* Catalog
  const bytes = yield* canonicalBytes(value)
  const digest = yield* catalog.put(value)
  return { digest, bytes }
})

const resolveGetter = SchemaGetter.transformOrFail((digest: Digest) =>
  Effect.mapError(resolve(digest), refusalIssue)
)

const digestGetter = SchemaGetter.transformOrFail((wire: WireValue) =>
  Effect.mapError(digestOf(wire), refusalIssue)
)

const publishGetter = SchemaGetter.transformOrFail((wire: WireValue) =>
  Effect.mapError(
    Effect.flatMap(Catalog, (catalog) => catalog.put(wire)),
    refusalIssue,
  )
)

/**
 * A reference whose decode resolves it. `RD`/`RE` carry the referenced
 * schema's own channels so a resolved body may itself hold references.
 */
export interface ResolvedOf<A, RD = never, RE = never>
  extends Schema.Codec<A, Digest, Catalog | Blobs | RD, RE> {}

/**
 * Builds a resolving reference over a wire schema.
 *
 * @example
 * ```ts
 * import { ResolvedOf } from "@foldlab/plait/Resolved"
 * import { Schema } from "effect"
 *
 * const Frame = Schema.Struct({
 *   terms: ResolvedOf(Schema.Record(Schema.String, Schema.String)),
 * })
 * ```
 */
export const ResolvedOf = <A, RD = never, RE = never>(
  schema: Schema.Codec<A, WireValue, RD, RE>,
): ResolvedOf<A, RD, RE> =>
  DigestType.pipe(
    Schema.decodeTo(schema, { decode: resolveGetter, encode: digestGetter }),
  )

/** The leaf special case: a reference whose target carries no channels. */
export type Resolved<A> = ResolvedOf<A>

/**
 * The explicit emit path: encode publishes, so the encode channel carries
 * `Catalog`. Reserved for emission — never for derivation, replay, or
 * memo-key computation, which must stay runnable with no environment.
 */
export interface PublishingOf<A, RD = never, RE = never>
  extends Schema.Codec<A, Digest, Catalog | Blobs | RD, Catalog | RE> {}

/** Builds a write-through reference for the explicit emit path. */
export const PublishingOf = <A, RD = never, RE = never>(
  schema: Schema.Codec<A, WireValue, RD, RE>,
): PublishingOf<A, RD, RE> =>
  DigestType.pipe(
    Schema.decodeTo(schema, { decode: resolveGetter, encode: publishGetter }),
  )

/** The leaf special case of the explicit emit path. */
export type Publishing<A> = PublishingOf<A>
