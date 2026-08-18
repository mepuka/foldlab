/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * References that decode by resolving — the R-channel move.
 *
 * Decoding a `ResolvedOf` requires `Catalog` (and `Payloads` for bodies stored
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
 * `ResolveCache` memoizes that one verified seam and is the only cache this
 * path admits. It lives here rather than in a module of its own because the
 * pin's barrel already exports `Cache` (API log 0018), and because a memo whose
 * whole correctness is inherited from `resolve` belongs beside `resolve`.
 *
 * @module
 */
import {
  Cache,
  Context,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Schema,
  SchemaGetter,
} from "effect"

import { canonicalBytes, type WireValue } from "./Canonical.js"
import { Catalog, Payloads } from "./Catalog.js"
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
): Effect.fn.Return<WireValue, Refusal, Catalog | Payloads> {
  const catalog = yield* Catalog
  const cataloged = yield* catalog.get(digest)
  if (Option.isSome(cataloged)) return yield* verified(digest, cataloged.value)
  const payloads = yield* Payloads
  const payload = yield* payloads.get(digest)
  if (Option.isNone(payload)) return yield* absent(digest)
  return yield* verified(digest, yield* decodePayload(digest, payload.value))
})

/** How large the memo may grow. Deployment configuration, never identity. */
export interface ResolveCacheOptions {
  /**
   * The most entries the memo holds before the oldest are evicted. There is no
   * default: a capacity is a memory budget somebody measured, and a number this
   * package invented would be a claim about a deployment it has never seen.
   */
  readonly capacity: number
}

/**
 * A memoizing view of `resolve`, with the same seam and the same answers.
 *
 * The signature is `resolve`'s, minus the services — the layer captures those
 * at construction — so a caller substituting one for the other changes nothing
 * it can observe except how long the second lookup takes.
 */
export interface ResolveCacheService {
  /**
   * Resolves one digest, answering from the memo when it already holds that
   * digest's value. A hit does not re-derive and does not need to: the value it
   * returns was re-derived against this exact digest when it was resolved, and
   * a digest names one canonical byte string forever.
   */
  readonly resolve: (digest: Digest) => Effect.Effect<WireValue, Refusal>
}

const makeResolveCache = Effect.fn("ResolveCache.make")(function* (
  options: ResolveCacheOptions,
): Effect.fn.Return<ResolveCacheService, never, Catalog | Payloads> {
  const cache = yield* Cache.makeWith(resolve, {
    capacity: options.capacity,
    /**
     * Successes never expire; failures are never served. The pin reaches the
     * second half by stamping a zero-lived entry as already expired
     * (`Cache.ts:443-445`, `hasExpired` :484-489) rather than through the
     * removal branch at :446-448, which a zero `Duration` never reaches because
     * `Duration.isFinite(Duration.zero)` is true. The entry a failed lookup
     * leaves behind is therefore dead weight — never readable, reclaimed by
     * capacity eviction — and the fence holds either way (DEV-739 T2).
     */
    timeToLive: (exit) => Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
  })
  return {
    resolve: Effect.fn("ResolveCache.resolve")(function* (
      digest: Digest,
    ): Effect.fn.Return<WireValue, Refusal> {
      return yield* Cache.get(cache, digest)
    }),
  }
})

/**
 * The memo over the one verified resolution seam.
 *
 * **What licenses it.** A digest names exactly one canonical byte string, and
 * `resolve` re-derives the digest of whatever it fetched before returning it.
 * So a memoized *success* can never be stale — there is nothing an invalidation
 * could learn. Eviction exists only to bound memory.
 *
 * **Why it sits here and not on the store.** `Catalog.get` and the `Payloads`
 * seam are deliberately unverified so a lying layer can be supplied under them
 * and refused at one door (DECISIONS T18). A memo on either would hold
 * unverified bytes. This one decorates the door itself, so every entry in it
 * has already passed re-derivation and a tampered store is still refused —
 * refusals, being failures, are never memoized.
 *
 * **Keys are digests only.** Nothing anchor-shaped is cacheable here: a surface
 * keyed by `(directory, petname, anchor)` names whatever is current, which is a
 * head-relative reading and never a truth, and it does not enter this cache.
 * The corollary is that the memo is scoped to digests rather than to a store —
 * an entry resolved through one catalog answers a later caller reading through
 * another, which is exactly what content addressing licenses.
 *
 * **What it does NOT claim.**
 * - *No freshness.* Nothing here is fresh or stale; the keyspace is immutable,
 *   so neither word means anything about it.
 * - *No absence reasoning.* A failed resolve is head-relative absence. It is
 *   not recorded, not counted, and not consulted: it flows to the caller's
 *   `Refusal.retryAbsence` policy exactly as an uncached one would.
 * - *No cross-process coherence.* This memo is one process's, and two processes
 *   holding different subsets of the same immutable truths disagree about
 *   nothing.
 * - *No durability role.* It caches over whatever durability the substrate
 *   already has; losing every entry loses time and nothing else. The in-memory
 *   catalog layer's own boundlessness is the store's question, and the durable
 *   layer act owns it — this cache neither fixes it nor hides it.
 * - *Capacity is deployment configuration*, never identity-bearing: two
 *   processes at different capacities resolve the same digests to the same
 *   values.
 *
 * The cached value is shared by reference. Wire values are immutable across
 * this package, and a caller that mutates one poisons every later resolve of
 * that digest in this process.
 *
 * @example
 * ```ts
 * import { ResolveCache } from "@foldlab/plait/Resolved"
 * import { substrateLayer } from "@foldlab/plait/Catalog"
 * import { Effect, Layer } from "effect"
 *
 * const layer = ResolveCache.layer({ capacity: 4096 }).pipe(
 *   Layer.provide(substrateLayer),
 * )
 *
 * Effect.gen(function* () {
 *   const cache = yield* ResolveCache
 *   return yield* cache.resolve(digest)
 * }).pipe(Effect.provide(layer))
 * ```
 */
export class ResolveCache extends Context.Service<ResolveCache, ResolveCacheService>()(
  "@foldlab/plait/ResolveCache",
) {
  /**
   * Builds the memo over the substrate services this layer is given, which is
   * why they are its requirement and not the memoized seam's: the pinned
   * constructor captures its lookup's context at construction, so the surface
   * callers hold has a clean channel.
   *
   * Concurrent lookups of one digest deduplicate onto a single in-flight
   * resolve, an interrupted lookup leaves no entry behind, and eviction is
   * oldest-first with a hit re-inserting its entry — least-recently-used in
   * effect. All three are the pinned cache's behaviour, not this module's
   * (`Cache.ts:424-431`, :436-441, `checkCapacity` :491-500).
   */
  static readonly layer = (
    options: ResolveCacheOptions,
  ): Layer.Layer<ResolveCache, never, Catalog | Payloads> =>
    Layer.effect(ResolveCache, makeResolveCache(options))
}

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
  extends Schema.Codec<A, Digest, Catalog | Payloads | RD, RE> {}

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
  extends Schema.Codec<A, Digest, Catalog | Payloads | RD, Catalog | RE> {}

/** Builds a write-through reference for the explicit emit path. */
export const PublishingOf = <A, RD = never, RE = never>(
  schema: Schema.Codec<A, WireValue, RD, RE>,
): PublishingOf<A, RD, RE> =>
  DigestType.pipe(
    Schema.decodeTo(schema, { decode: resolveGetter, encode: publishGetter }),
  )

/** The leaf special case of the explicit emit path. */
export type Publishing<A> = PublishingOf<A>
