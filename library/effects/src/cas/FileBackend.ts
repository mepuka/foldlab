/**
 * The file backend: the byte-plane seams over one store root, written
 * entirely against Effect's `FileSystem` service — no platform reach
 * anywhere. The composition chooses the realization by providing a
 * `FileSystem` layer; this module only speaks the service.
 *
 * On-disk contract:
 *
 *     store-root/
 *       objects/<first 2 hex>/<remaining 62 hex>   canonical bytes
 *       roots/<64 hex>                             empty file; presence
 *                                                  is the publication
 *
 * The address is the path, so presence is an existence check and the
 * filesystem is the map — no index file, no manifest. Writes publish by
 * temp-file-then-rename: a crashed write leaves only a temp file, never
 * a half object, and readers never observe retraction (grow-only). Two
 * writers racing one address both carry the same canonical bytes —
 * content addressing — so whichever rename lands last leaves identical
 * content. The backend stays dumb: it never verifies bytes on read; the
 * store law above the seam recomputes the digest and re-decodes, so
 * disk corruption surfaces as a typed refusal there. Durability is the
 * host filesystem's default (no fsync); a power cut may lose the newest
 * objects but cannot corrupt admitted ones.
 */
import { Context, Effect, FileSystem, Layer, Option, PlatformError, Schema } from "effect"
import {
  BackendFailure,
  ByteReader,
  ByteWriter,
  objectRelativePath,
  RootStore,
  rootRelativePath,
  type ByteReaderShape,
  type ByteWriterShape,
  type PresenceStatus,
  type RootStoreShape,
} from "./Backend.ts"
import { ContentId } from "./Node.ts"

/** A store root: the non-empty base path the backend joins with `/`.
 * Validated at every public constructor, branded past validation. */
export const StoreRoot = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("StoreRoot"),
)
export type StoreRoot = typeof StoreRoot.Type

const rootHex = /^[0-9a-f]{64}$/u

const isNotFound = (error: PlatformError.PlatformError): boolean =>
  error.reason._tag === "NotFound"

const failure = (error: PlatformError.PlatformError): BackendFailure =>
  new BackendFailure({ reason: error.message })

/** Build the three seam shapes over one store root. */
export const makeFileBackend = (
  fs: FileSystem.FileSystem,
  storeRoot: string,
): {
  readonly reader: ByteReaderShape
  readonly writer: ByteWriterShape
  readonly roots: RootStoreShape
} => {
  const root = StoreRoot.make(storeRoot)
  const objectPath = (id: ContentId): string =>
    `${root}/${objectRelativePath(id)}`
  const fanoutDir = (id: ContentId): string =>
    objectPath(id).slice(0, root.length + "/objects/xx".length)
  const rootsDir = `${root}/roots`

  const loadBytes: ByteReaderShape["loadBytes"] = Effect.fn(
    "FileBackend.loadBytes",
  )(function* (id) {
    return yield* fs.readFile(objectPath(id)).pipe(
      Effect.asSome,
      Effect.catchTag("PlatformError", (error) => isNotFound(error)
        ? Effect.succeed(Option.none<Uint8Array>())
        : Effect.fail(failure(error))),
    )
  })

  const presenceOf = (id: ContentId): Effect.Effect<PresenceStatus> =>
    fs.exists(objectPath(id)).pipe(
      Effect.map((resident) => resident ? "present" as const : "missing" as const),
      Effect.catchTag("PlatformError", () =>
        Effect.succeed("failed" as const)),
    )

  const presence: ByteReaderShape["presence"] = Effect.fn(
    "FileBackend.presence",
  )(function* (ids) {
    return yield* Effect.forEach(ids, presenceOf)
  })

  const putBytes: ByteWriterShape["putBytes"] = Effect.fn(
    "FileBackend.putBytes",
  )(function* (id, bytes) {
    const target = objectPath(id)
    const attempt = Effect.gen(function* () {
      if (yield* fs.exists(target)) return
      const directory = fanoutDir(id)
      yield* fs.makeDirectory(directory, { recursive: true })
      const temp = yield* fs.makeTempFile({ directory, prefix: "put-" })
      yield* fs.writeFile(temp, bytes.slice())
      yield* fs.rename(temp, target).pipe(
        // A lost rename race is a win: the same address carries the
        // same canonical bytes, so whatever resides is this write.
        Effect.catchTag("PlatformError", (error) =>
          fs.exists(target).pipe(
            Effect.orElseSucceed(() => false),
            Effect.flatMap((resident) => resident
              ? fs.remove(temp, { force: true }).pipe(Effect.ignore)
              : Effect.fail(error)),
          )),
      )
    })
    return yield* attempt.pipe(
      Effect.catchTag("PlatformError", (error) => Effect.fail(failure(error))),
    )
  })

  const publish: RootStoreShape["publish"] = Effect.fn(
    "FileBackend.publish",
  )(function* (root) {
    return yield* fs.makeDirectory(rootsDir, { recursive: true }).pipe(
      Effect.andThen(fs.writeFile(`${rootsDir}/${root}`, new Uint8Array(0))),
      Effect.catchTag("PlatformError", (error) => Effect.fail(failure(error))),
    )
  })

  const list: RootStoreShape["list"] = fs.readDirectory(rootsDir).pipe(
    Effect.map((entries) => entries
      .filter((entry) => rootHex.test(entry))
      .map((entry) => ContentId.make(entry))),
    Effect.catchTag("PlatformError", (error) => isNotFound(error)
      ? Effect.succeed([] as ReadonlyArray<ContentId>)
      : Effect.fail(failure(error))),
  )

  return {
    reader: { loadBytes, presence },
    writer: { putBytes },
    roots: { publish, list },
  }
}

/** Provide the three seams from one store root. The `FileSystem`
 * realization is the composition's choice and stays a visible layer
 * requirement. */
export const layerFileBackend = (
  storeRoot: string,
): Layer.Layer<
  ByteReader | ByteWriter | RootStore,
  never,
  FileSystem.FileSystem
> =>
  Layer.effectContext(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const backend = makeFileBackend(fs, storeRoot)
    return Context.make(ByteReader, backend.reader).pipe(
      Context.add(ByteWriter, backend.writer),
      Context.add(RootStore, backend.roots),
    )
  }))
