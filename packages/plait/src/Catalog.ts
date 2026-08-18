/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * The content-addressed value store and the catalog's internal payload seam.
 *
 * These are the two substrate seams a resolved reference decodes through
 * (`Resolved.ts`). Both are read surfaces over content-addressed storage; the
 * digest is the only address, and no metadata this module carries has any
 * identity role.
 *
 * **The payload seam is not the blob store, and the two no longer share a
 * name.** `Payloads` is catalog-internal plumbing — get-only,
 * `Option`-returning, unverified by design — because verify-on-read for this
 * path lives at exactly one door, `Resolved.resolve`, which is what keeps the
 * tampered-store control writable (DECISIONS T18, preserved verbatim). The
 * public application blob store is `Blob.ts`: put, verified get, presence,
 * absence as an `AbsenceRefusal`, and verification hidden inside the service.
 * Two concepts, two names (affordances record A-9, grill G-5).
 *
 * **Bound, stated once.** Neither service here ships a durable layer yet.
 * `Catalog.layer` is process-local: the durable catalog authority is a
 * venue's, reached through the request plane (`Venues.ts` in the binding
 * module map, not built). `Payloads.layer` answers every lookup with absence
 * because no probed payload substrate stands behind this seam; a layer that
 * trusted store-side digests would be a verify-on-read hole, so none ships.
 * Nothing here claims durability or federation.
 *
 * **The probe gate binds the object-store backend only**, and both halves of
 * that sentence travel together wherever either appears: the filesystem
 * backend's substrate is the OS filesystem and its wall is `Blob.ts`'s
 * backend-agnostic conformance suite, while the NATS object-store backend is
 * an interface slot with no build — the object-store semantics at
 * `@nats-io/obj@3.4.0` are unprobed and DEV-730 is the probe that gates them.
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

/**
 * Reads the payload bytes of a cataloged value the catalog does not itself
 * hold — the catalog-internal seam under `Resolved.resolve`, not a blob store.
 *
 * Unverified by design, for the same reason `CatalogService.get` is: this leg
 * exists so a lying layer can be supplied under it and refused at the one
 * verify door. It keeps `Option` deliberately — it is package-internal
 * plumbing, never an agent-facing surface, and the surface that owes callers
 * head-relative vocabulary is `Blob.BlobsService`, whose absence is an
 * `AbsenceRefusal` that `Refusal.retryAbsence` can see.
 */
export interface PayloadService {
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
 * The catalog-internal payload seam, named by digest, read through
 * `Resolved.resolve` and verified there.
 *
 * Application code that wants a blob store wants `Blob.Blobs` instead: this
 * tag exists so the resolve seam has a second, deliberately unverified leg to
 * read through and a control can lie under it.
 *
 * @example
 * ```ts
 * import { Payloads } from "@foldlab/plait/Catalog"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const payloads = yield* Payloads
 *   return yield* payloads.get(digest)
 * }).pipe(Effect.provide(Payloads.layer))
 * ```
 */
export class Payloads extends Context.Service<Payloads, PayloadService>()(
  "@foldlab/plait/Payloads",
) {
  /**
   * Every lookup is head-relative absence. This is the standing layer: the
   * probe gate binds the object-store backend only — the filesystem backend's
   * substrate is the OS filesystem and its wall is `Blob.ts`'s conformance
   * suite — and the tenth substrate suite's evidence rules no backend: it
   * says what the pinned object store does, which is advisory. A layer that
   * trusted store-side digests would be a verify-on-read hole, so none ships.
   * Two things that evidence made concrete: the object store's metadata is
   * written by the client and never checked by the server, and its digest is
   * verified only when the last chunk arrives, so a streamed prefix is
   * unverified bytes.
   */
  static readonly layer: Layer.Layer<Payloads> = Layer.succeed(
    Payloads,
    Payloads.of({ get: () => Effect.succeed(Option.none()) }),
  )

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (service: PayloadService): Layer.Layer<Payloads> =>
    Layer.succeed(Payloads, Payloads.of(service))
}

/** The two substrate services every resolved reference decodes through. */
export const substrateLayer: Layer.Layer<Catalog | Payloads> = Layer.mergeAll(
  Catalog.layer,
  Payloads.layer,
)
