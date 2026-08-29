/**
 * The storage seams: one grow-only byte plane, split by capability.
 *
 * A backend is deliberately dumb: it holds admitted canonical bytes
 * under their content addresses and answers presence. Admission is NOT
 * its concern — the store law and the server core judge every candidate
 * through the shared pure admission judgment before `putBytes` is ever
 * called, so a backend cannot weaken the store's invariants and a new
 * backend implements storage, never the law. Verification is not its
 * concern either — every read above the seam recomputes the digest and
 * re-decodes canonically, so a corrupt or hostile backend surfaces as a
 * typed refusal, never as silently served bytes.
 *
 * The split is by capability, checked at the type level: `ByteReader`
 * answers reads, `ByteWriter` accepts joins, and `RootStore` grows the
 * published-roots registry. A read-only backend (a static host, a git
 * server) provides the reader and nothing else, so writing over it is a
 * compile error, not a runtime refusal.
 *
 * Algebraically each plane is a join-semilattice: `putBytes` is join
 * with a singleton (content addressing makes re-insertion of identical
 * bytes the identity), `publish` grows a monotone set, and `presence`
 * is an advisory membership answer. Grow-only monotonicity is what
 * makes lock-free backends lawful: a passed reference check cannot be
 * invalidated by a concurrent admission.
 */
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { ContentId } from "./Node.ts"
import type { PresenceStatus } from "../internal/wire.ts"

export type { PresenceStatus }

/** A backend that could not answer — maps to the capacity/unavailable
 * class everywhere it surfaces, never to an admission verdict. */
export class BackendFailure extends Schema.TaggedError<BackendFailure>()(
  "CasBackendFailure",
  { reason: Schema.String },
) {}

export interface ByteReaderShape {
  /** The canonical bytes at an address, if admitted. */
  readonly loadBytes: (
    id: ContentId,
  ) => Effect.Effect<Option.Option<Uint8Array>, BackendFailure>
  /** Advisory presence, positionally aligned to the request order. A
   * backend reports per-key failure without failing the batch. */
  readonly presence: (
    ids: ReadonlyArray<ContentId>,
  ) => Effect.Effect<ReadonlyArray<PresenceStatus>, BackendFailure>
}

/** The read capability of the byte plane. Every backend provides it. */
export class ByteReader extends Context.Service<ByteReader, ByteReaderShape>()(
  "foldlab/cas/ByteReader",
) {}

export interface ByteWriterShape {
  /** Join one admitted node in. Callers admit first; writing identical
   * bytes again is the identity. */
  readonly putBytes: (
    id: ContentId,
    bytes: Uint8Array,
  ) => Effect.Effect<void, BackendFailure>
}

/** The write capability of the byte plane. Read-only backends never
 * provide it. */
export class ByteWriter extends Context.Service<ByteWriter, ByteWriterShape>()(
  "foldlab/cas/ByteWriter",
) {}

export interface RootStoreShape {
  /** Grow the published-roots set. Idempotent. */
  readonly publish: (
    root: ContentId,
  ) => Effect.Effect<void, BackendFailure>
  /** Every published root. Order is unspecified; the set only grows. */
  readonly list: Effect.Effect<ReadonlyArray<ContentId>, BackendFailure>
}

/** The published-roots registry — naming, not content, so a seam of its
 * own beside the byte plane. */
export class RootStore extends Context.Service<RootStore, RootStoreShape>()(
  "foldlab/cas/RootStore",
) {}

/** The store-root layout contract every path-shaped backend shares:
 * the address is the path. The file backend writes it; the path reader
 * reads it from any host that serves bytes at a path. */
export const objectRelativePath = (id: ContentId): string =>
  `objects/${id.slice(0, 2)}/${id.slice(2)}`

/** A published root under the store root: an empty file whose presence
 * is the publication. */
export const rootRelativePath = (id: ContentId): string => `roots/${id}`

/** The three seam shapes over one shared state, for embedding a backend
 * without Layer machinery. */
export interface MemoryBackend {
  readonly reader: ByteReaderShape
  readonly writer: ByteWriterShape
  readonly roots: RootStoreShape
}

/** One isolated in-memory backend: plain maps, atomic by the event
 * loop, grow-only by construction. */
export const makeMemoryBackend = (): MemoryBackend => {
  const nodes = new Map<ContentId, Uint8Array>()
  const roots = new Set<ContentId>()
  return {
    reader: {
      loadBytes: (id) => Effect.sync(() => {
        const resident = nodes.get(id)
        return resident === undefined
          ? Option.none()
          : Option.some(resident.slice())
      }),
      presence: (ids) => Effect.sync(() =>
        ids.map((id): PresenceStatus => nodes.has(id) ? "present" : "missing")),
    },
    writer: {
      putBytes: (id, bytes) => Effect.sync(() => {
        if (!nodes.has(id)) nodes.set(id, bytes.slice())
      }),
    },
    roots: {
      publish: (root) => Effect.sync(() => {
        roots.add(root)
      }),
      list: Effect.sync(() => [...roots]),
    },
  }
}

/** Provide the three seams from one memory backend. Each Layer build is
 * one isolated store. */
export const layerMemoryBackend: Layer.Layer<ByteReader | ByteWriter | RootStore> =
  Layer.syncContext(() => {
    const backend = makeMemoryBackend()
    return Context.make(ByteReader, backend.reader).pipe(
      Context.add(ByteWriter, backend.writer),
      Context.add(RootStore, backend.roots),
    )
  })
