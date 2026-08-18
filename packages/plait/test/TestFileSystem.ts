import { randomUUID } from "node:crypto"
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"

import { Effect, FileSystem, Layer, PlatformError } from "effect"

/**
 * A real-filesystem `FileSystem` layer for the blob wall, built from the pin's
 * own test seam (`FileSystem.makeNoop`, FileSystem.ts:825) over
 * `node:fs/promises`.
 *
 * **Why this and not a platform layer.** `Blob.layerFileSystem` requires the
 * pin's portable `FileSystem` service and this package depends on no platform
 * package — the platform layer is the application's choice (A-9), and adding
 * `@effect/platform-bun` here to run a test would make the wall's convenience a
 * dependency of the package under test. So the bound is stated rather than
 * hidden: the wall exercises the store against the OS filesystem, and the
 * behaviour of `BunFileSystem` or `NodeFileSystem` specifically is the
 * application's to verify.
 *
 * Only the operations the store uses are implemented; every other operation
 * keeps `makeNoop`'s refusal, so a store that reached for one would be caught.
 */
const attempt = <A>(
  method: string,
  path: string,
  run: () => Promise<A>,
): Effect.Effect<A, PlatformError.PlatformError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      PlatformError.systemError({
        _tag: (cause as { readonly code?: string }).code === "ENOENT" ? "NotFound" : "Unknown",
        module: "FileSystem",
        method,
        pathOrDescriptor: path,
        cause,
      }),
  })

/** The node-backed subset of the pin's FileSystem the blob store reaches for. */
export const testFileSystemLayer: Layer.Layer<FileSystem.FileSystem> = FileSystem.layerNoop({
  makeDirectory: (path, options) =>
    attempt("makeDirectory", path, async () => {
      await mkdir(path, { recursive: options?.recursive ?? false })
    }),
  makeTempFile: (options) => {
    const directory = options?.directory ?? tmpdir()
    const path = `${directory}/${options?.prefix ?? ""}${randomUUID()}`
    return attempt("makeTempFile", path, async () => {
      await writeFile(path, new Uint8Array())
      return path
    })
  },
  writeFile: (path, data) =>
    attempt("writeFile", path, async () => {
      await writeFile(path, data)
    }),
  rename: (oldPath, newPath) =>
    attempt("rename", oldPath, async () => {
      await rename(oldPath, newPath)
    }),
  readFile: (path) => attempt("readFile", path, async () => new Uint8Array(await readFile(path))),
  exists: (path) =>
    attempt("exists", path, async () => {
      await access(path)
      return true
    }).pipe(
      Effect.catch((error) =>
        error.reason._tag === "NotFound" ? Effect.succeed(false) : Effect.fail(error)
      ),
    ),
})
