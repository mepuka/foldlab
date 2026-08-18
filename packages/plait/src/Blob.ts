/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * The public content-addressed blob store: durable put, verified get, presence.
 *
 * This is the application-facing store. It is not the catalog-internal payload
 * seam — that one lives in `Catalog.ts` as `Payloads`, is `Option`-returning
 * and unverified by design, and is read through `Resolved.resolve`, which is
 * where its verification happens (DECISIONS T18). Splitting the two is the
 * whole point of this module (affordances record A-9, grill G-5): one name over
 * two concepts made the public promise a blob store and the implementation a
 * catalog-internal stub.
 *
 * **Verification is inside the service here, and that is not a contradiction of
 * T18.** T18's argument is that a store which polices its own answers cannot be
 * made to lie by a control. For a real backend the control does not need the
 * service's cooperation: it flips bytes on the substrate, behind the API, so
 * verified-get stays testable while no unverified public read path exists.
 *
 * **The licensing law.** Content addressing makes every backend's correctness
 * locally checkable — the reader re-derives the digest of what it fetched and
 * refuses on mismatch — so no backend is ever trusted about content. Backend
 * choice is availability and cost, never meaning. Identity is of the exact
 * bytes stored; store metadata carries no identity role.
 *
 * **The probe gate binds the object-store backend only**, and both halves of
 * that sentence travel together wherever either appears: the filesystem
 * backend's substrate is the OS filesystem and its wall is the
 * backend-agnostic conformance suite (`test/BlobsConformance.ts`), while the
 * NATS object-store backend is an interface slot with no build — the
 * object-store semantics at `@nats-io/obj@3.4.0` are unprobed and DEV-730 is
 * the probe that gates them.
 *
 * @module
 */
import { Context, Effect, FileSystem, Layer, PlatformError } from "effect"

import type { Digest } from "./Digest.js"
import { digestOfStoredBytes } from "./internal/digests.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Next,
  type Refusal,
} from "./Refusal.js"

/**
 * A content-addressed store of opaque byte payloads.
 *
 * Capabilities, never vendors: a backend is just another `Layer` satisfying
 * this interface, so nothing here is shaped by one store's vocabulary.
 *
 * **Ranged and partial reads are refused, and the refusal is recorded here on
 * purpose (grill G-6).** A byte range cannot re-derive the whole-value digest,
 * so a partial read cannot verify on read, so the capability stays off this
 * interface until the law that would license it exists. The candidate law is
 * named: a chunk manifest — large values carried as a manifest of chunk
 * digests, the manifest itself a cataloged value — under which a ranged read
 * verifies the chunks it fetched. DEV-730's partial-read findings are that
 * law's evidence base. Until it exists, `get` is whole-value on every backend.
 */
export interface BlobsService {
  /**
   * Durable put: derives the digest client-side over the exact bytes handed
   * in, writes, and acknowledges only after the backend's durable write
   * completes. Idempotent by content addressing — putting the same bytes twice
   * names the same blob and changes nothing.
   */
  readonly put: (bytes: Uint8Array) => Effect.Effect<Digest, Refusal>
  /**
   * Verified get: fetches, RE-DERIVES the digest over the fetched bytes, and
   * refuses `digest-mismatch` on disagreement. There is no unverified public
   * read path. A digest the store does not hold is the `blob-absent` absence,
   * which `Refusal.retryAbsence` can see and `Option.none` could not.
   */
  readonly get: (digest: Digest) => Effect.Effect<Uint8Array, Refusal>
  /**
   * Presence, head-relative: a `false` says this store does not hold those
   * bytes yet, never that they do not exist. Presence is not verification —
   * only `get` re-derives.
   */
  readonly has: (digest: Digest) => Effect.Effect<boolean, Refusal>
}

/** Where a filesystem-backed store keeps its content-addressed files. */
export interface FileSystemBlobOptions {
  /** The directory the store owns outright; nothing else writes under it. */
  readonly root: string
}

/** The fan-out prefix length. Layout, never identity. */
const FANOUT_PREFIX = 2

/**
 * Joins with `/`. An absolute root plus `/` resolves on every host the pin's
 * `FileSystem` layers target, and requiring the pin's `Path` service instead
 * would add a second substrate to a layer whose only substrate is the file
 * system (DEV-738 T3).
 */
const joinPath = (...segments: ReadonlyArray<string>): string => segments.join("/")

const teachPut: ReadonlyArray<Next> = [{
  subject: "blob.put",
  note: "Put the bytes into this store and reference them under the digest it returns.",
}]

const teachRepair: ReadonlyArray<Next> = [{
  subject: "blob.put",
  note:
    "Re-put the original bytes: this store is holding bytes that do not hash to the requested digest.",
}]

const blobAbsent = (digest: Digest): Refusal =>
  absenceRefusal({
    kind: "blob-absent",
    law: "A blob reads only from a store that already holds bytes under its digest.",
    path: ["blob", digest],
    got: "absent",
    expected: digest,
    next: teachPut,
  })

const blobMismatch = (expected: Digest, got: Digest): Refusal =>
  structuralRefusal({
    kind: "digest-mismatch",
    law: "A blob's identity is re-derived over the fetched bytes and never asserted by its store.",
    path: ["blob", expected],
    got,
    expected,
    next: teachRepair,
  })

/**
 * Whether a platform failure is the substrate saying "no such path".
 *
 * Exactly two platform outcomes carry meaning at this seam: not-found is the
 * `blob-absent` absence, and a byte-level disagreement is `digest-mismatch`,
 * which `get` derives itself rather than asking the substrate about. Every
 * other `PlatformError` is a defect and dies as one — refusals are the estate's
 * domain language and a defect is never dressed in it (the B-7 disposition).
 */
const isNotFound = (error: PlatformError.PlatformError): boolean =>
  error.reason._tag === "NotFound"

const makeFileSystemBlobs = Effect.fn("Blobs.makeFileSystem")(function* (
  options: FileSystemBlobOptions,
): Effect.fn.Return<BlobsService, never, FileSystem.FileSystem> {
  const fileSystem = yield* FileSystem.FileSystem
  const directoryOf = (digest: Digest): string =>
    joinPath(options.root, digest.slice(0, FANOUT_PREFIX))
  const pathOf = (digest: Digest): string => joinPath(directoryOf(digest), digest)

  /**
   * Write to a staged name, then rename into place: the digest-named file
   * appears only complete, so a reader never observes a partial blob under a
   * digest that would not re-derive. Crash-durable at the OS level, not
   * power-durable — the pin's `writeFile` does not fsync, and an fsync option
   * is priced when a consumer needs it, never claimed before it is measured.
   */
  const put: BlobsService["put"] = Effect.fn("Blobs.put")(function* (bytes) {
    const digest = digestOfStoredBytes(bytes)
    const directory = directoryOf(digest)
    yield* Effect.orDie(fileSystem.makeDirectory(directory, { recursive: true }))
    const staged = yield* Effect.orDie(
      fileSystem.makeTempFile({ directory, prefix: "staged-" }),
    )
    yield* Effect.orDie(fileSystem.writeFile(staged, bytes))
    yield* Effect.orDie(fileSystem.rename(staged, pathOf(digest)))
    return digest
  })

  const get: BlobsService["get"] = Effect.fn("Blobs.get")(function* (digest) {
    const bytes = yield* fileSystem.readFile(pathOf(digest)).pipe(
      Effect.catch((error) =>
        isNotFound(error) ? Effect.fail(blobAbsent(digest)) : Effect.die(error)
      ),
    )
    const rederived = digestOfStoredBytes(bytes)
    if (rederived !== digest) return yield* blobMismatch(digest, rederived)
    return bytes
  })

  const has: BlobsService["has"] = Effect.fn("Blobs.has")(function* (digest) {
    return yield* Effect.orDie(fileSystem.exists(pathOf(digest)))
  })

  return { put, get, has }
})

/**
 * The application blob store, with verification inside the service.
 *
 * @example
 * ```ts
 * import { Blobs } from "@foldlab/plait/Blob"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const blobs = yield* Blobs
 *   const digest = yield* blobs.put(new TextEncoder().encode("hello"))
 *   return yield* blobs.get(digest)
 * })
 * ```
 */
export class Blobs extends Context.Service<Blobs, BlobsService>()(
  "@foldlab/plait/Blobs",
) {
  /**
   * The day-0 backend, over the pin's own portable `FileSystem` service and no
   * new dependency of this package. The platform layer is the application's
   * choice — `@effect/platform-bun`'s `BunFileSystem` or
   * `@effect/platform-node`'s `NodeFileSystem`, both catalog-pinned at the
   * workspace root — and it is a requirement of this layer, never a dependency
   * of this package.
   *
   * Files land at `<root>/<first two hex characters>/<digest>`. The fan-out is
   * layout and carries no identity; the digest is the whole address.
   *
   * @example
   * ```ts
   * import { Blobs } from "@foldlab/plait/Blob"
   *
   * const layer = Blobs.layerFileSystem({ root: "/var/lib/plait/blobs" })
   * ```
   */
  static readonly layerFileSystem = (
    options: FileSystemBlobOptions,
  ): Layer.Layer<Blobs, never, FileSystem.FileSystem> =>
    Layer.effect(Blobs, makeFileSystemBlobs(options))

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (service: BlobsService): Layer.Layer<Blobs> =>
    Layer.succeed(Blobs, Blobs.of(service))
}
