/**
 * The server's storage seam: a grow-only byte plane any backend can
 * realize — an in-memory map, a filesystem, an object store.
 *
 * The backend is deliberately dumb: it holds admitted canonical bytes
 * under their content addresses and published roots, and it answers
 * presence. Admission is NOT its concern — the server core judges every
 * candidate through the shared pure admission law before `putBytes` is
 * ever called, so a backend cannot weaken the store's invariants and a
 * new backend implements storage, never the law.
 *
 * Algebraically the shape is the join-semilattice the model's
 * confirmed/published sets already are: `putBytes` is join with a
 * singleton (content addressing makes re-insertion of identical bytes
 * the identity), `publishRoot` grows a monotone set, and `presence` is
 * an advisory membership answer. Grow-only monotonicity is what makes
 * lock-free backends lawful: a passed reference check cannot be
 * invalidated by a concurrent admission.
 */
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { ContentId } from "../cas/Node.ts"
import type { PresenceStatus } from "../internal/remoteControl.ts"

/** A backend that could not answer — maps to the capacity/unavailable
 * class on the wire, never to an admission verdict. */
export class ServerBackendFailure extends Schema.TaggedError<ServerBackendFailure>()(
  "CasServerBackendFailure",
  { reason: Schema.String },
) {}

export interface CasServerBackendShape {
  /** The canonical bytes at an address, if admitted. */
  readonly loadBytes: (
    id: ContentId,
  ) => Effect.Effect<Option.Option<Uint8Array>, ServerBackendFailure>
  /** Join one admitted node in. Callers admit first; writing identical
   * bytes again is the identity. */
  readonly putBytes: (
    id: ContentId,
    bytes: Uint8Array,
  ) => Effect.Effect<void, ServerBackendFailure>
  /** Advisory presence, positionally aligned to the request order. A
   * backend reports per-key failure without failing the batch. */
  readonly presence: (
    ids: ReadonlyArray<ContentId>,
  ) => Effect.Effect<ReadonlyArray<PresenceStatus>, ServerBackendFailure>
  /** Grow the published-roots set. Idempotent. */
  readonly publishRoot: (
    root: ContentId,
  ) => Effect.Effect<void, ServerBackendFailure>
}

export class CasServerBackend extends Context.Service<
  CasServerBackend,
  CasServerBackendShape
>()("foldlab/effect-replay/CasServerBackend") {
  /** One isolated in-memory backend: plain maps, atomic by the event
   * loop, grow-only by construction. */
  static readonly layerMemory: Layer.Layer<CasServerBackend> = Layer.sync(
    CasServerBackend,
    () => {
      const nodes = new Map<ContentId, Uint8Array>()
      const roots = new Set<ContentId>()
      return CasServerBackend.of({
        loadBytes: (id) => Effect.sync(() => {
          const resident = nodes.get(id)
          return resident === undefined
            ? Option.none()
            : Option.some(resident.slice())
        }),
        putBytes: (id, bytes) => Effect.sync(() => {
          if (!nodes.has(id)) nodes.set(id, bytes.slice())
        }),
        presence: (ids) => Effect.sync(() =>
          ids.map((id) => nodes.has(id) ? "present" as const : "missing" as const)),
        publishRoot: (root) => Effect.sync(() => {
          roots.add(root)
        }),
      })
    },
  )
}
