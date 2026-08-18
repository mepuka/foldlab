/**
 * The content-addressed value store and the payload store, as services.
 *
 * These are the two substrate seams a resolved reference decodes through
 * (`Resolved.ts`). Both are read surfaces over content-addressed storage; the
 * digest is the only address, and no metadata this module carries has any
 * identity role.
 *
 * **Bound, stated once.** Neither service ships a durable layer yet.
 * `Catalog.layer` is process-local: the durable catalog authority is a
 * venue's, reached through the request plane (`Venues.ts` in the binding
 * module map, not built). `Blobs.layer` answers every lookup with absence
 * because the object-store semantics at `@nats-io/obj@3.4.0` are unprobed —
 * grill item 9/10 of the ratified next-phase plan requires a probe suite on
 * the substrate gate before any object-store surface ships. Nothing here
 * claims durability, federation, or a `Blob.ts` inline threshold.
 *
 * @module
 */
import { Context, Effect, Layer, Option } from "effect"

import type { WireValue } from "./Canonical.js"
import { digestOf, type Digest } from "./Digest.js"
import type { Refusal } from "./Refusal.js"

/**
 * Reads and admits content-addressed values.
 *
 * `get` is deliberately unverified: re-derivation is the caller's law, and it
 * happens at exactly one seam (`Resolved.resolve`). Verifying inside the
 * service would make the tampered-store control unwritable, because the layer
 * under test would police itself.
 */
export interface CatalogService {
  readonly get: (digest: Digest) => Effect.Effect<Option.Option<WireValue>, Refusal>
  readonly put: (value: WireValue) => Effect.Effect<Digest, Refusal>
}

/** Reads content-addressed payloads stored outside the inline threshold. */
export interface BlobService {
  readonly get: (digest: Digest) => Effect.Effect<Option.Option<Uint8Array>, Refusal>
}

const makeMemoryCatalog: Effect.Effect<CatalogService> = Effect.sync(() => {
  const store = new Map<string, WireValue>()
  return {
    get: (digest) => Effect.sync(() => Option.fromNullishOr(store.get(digest))),
    put: Effect.fn("Catalog.put")(function* (value): Effect.fn.Return<Digest, Refusal> {
      const digest = yield* digestOf(value)
      store.set(digest, value)
      return digest
    }),
  }
})

/**
 * The content-addressed value store a resolved reference decodes through.
 *
 * @example
 * ```ts
 * import { Catalog } from "@foldlab/plait/Catalog"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const catalog = yield* Catalog
 *   return yield* catalog.put({ terms: { a: 1 } })
 * }).pipe(Effect.provide(Catalog.layer))
 * ```
 */
export class Catalog extends Context.Service<Catalog, CatalogService>()(
  "@foldlab/plait/Catalog",
) {
  /**
   * A process-local content-addressed store. Values live for the process, not
   * for the fabric: nothing durable, shared, or federated is claimed.
   */
  static readonly layer: Layer.Layer<Catalog> = Layer.effect(Catalog, makeMemoryCatalog)

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (service: CatalogService): Layer.Layer<Catalog> =>
    Layer.succeed(Catalog, Catalog.of(service))
}

/**
 * The payload store named by digest for bodies above the inline threshold.
 *
 * @example
 * ```ts
 * import { Blobs } from "@foldlab/plait/Catalog"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const blobs = yield* Blobs
 *   return yield* blobs.get(digest)
 * }).pipe(Effect.provide(Blobs.layer))
 * ```
 */
export class Blobs extends Context.Service<Blobs, BlobService>()(
  "@foldlab/plait/Blobs",
) {
  /**
   * Every lookup is head-relative absence. This is the standing layer until
   * the object-store probe suite lands on the substrate gate; a layer that
   * trusted store-side digests would be a verify-on-read hole, so none ships.
   */
  static readonly layer: Layer.Layer<Blobs> = Layer.succeed(
    Blobs,
    Blobs.of({ get: () => Effect.succeed(Option.none()) }),
  )

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (service: BlobService): Layer.Layer<Blobs> =>
    Layer.succeed(Blobs, Blobs.of(service))
}

/** The two substrate services every resolved reference decodes through. */
export const substrateLayer: Layer.Layer<Catalog | Blobs> = Layer.mergeAll(
  Catalog.layer,
  Blobs.layer,
)
