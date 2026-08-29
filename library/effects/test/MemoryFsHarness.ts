/**
 * A pure in-memory realization of the `FileSystem` subset the file
 * backend uses — the test layer for every store-root suite, no
 * platform reach anywhere. State lives behind `Ref`, so every
 * operation is an ordinary effectful service call. It enforces what a
 * real filesystem enforces (writes need their parent directory;
 * hard links need their source and never overwrite), so a backend that skipped
 * `makeDirectory` fails here too.
 */
import { Effect, FileSystem, PlatformError, Ref } from "effect"

const notFound = (method: string, path: string) =>
  PlatformError.systemError({
    _tag: "NotFound",
    method,
    module: "FileSystem",
    pathOrDescriptor: path,
  })

const alreadyExists = (method: string, path: string) =>
  PlatformError.systemError({
    _tag: "AlreadyExists",
    method,
    module: "FileSystem",
    pathOrDescriptor: path,
  })

const parentOf = (path: string): string =>
  path.slice(0, Math.max(0, path.lastIndexOf("/")))

export interface MemoryFs {
  readonly fs: FileSystem.FileSystem
  /** Every file currently held, path → bytes. */
  readonly dump: Effect.Effect<ReadonlyMap<string, Uint8Array>>
  /** Overwrite one file in place — the corruption lever for tests. */
  readonly poke: (path: string, bytes: Uint8Array) => Effect.Effect<void>
}

export const makeMemoryFs: Effect.Effect<MemoryFs> = Effect.gen(function* () {
  const files = yield* Ref.make<ReadonlyMap<string, Uint8Array>>(new Map())
  const directories = yield* Ref.make<ReadonlySet<string>>(new Set([""]))
  const tempSerial = yield* Ref.make(0)

  const withDirectories = (path: string, recursive: boolean) =>
    (current: ReadonlySet<string>): ReadonlySet<string> => {
      const next = new Set(current)
      if (recursive) {
        const segments = path.split("/")
        for (let index = 1; index <= segments.length; index += 1) {
          next.add(segments.slice(0, index).join("/"))
        }
        return next
      }
      next.add(path)
      return next
    }

  const inserted = (path: string, bytes: Uint8Array) =>
    (current: ReadonlyMap<string, Uint8Array>): ReadonlyMap<string, Uint8Array> =>
      new Map(current).set(path, bytes)

  const removed = (path: string) =>
    (current: ReadonlyMap<string, Uint8Array>): ReadonlyMap<string, Uint8Array> => {
      const next = new Map(current)
      next.delete(path)
      return next
    }

  const requireDirectory = (method: string, path: string) =>
    Ref.get(directories).pipe(
      Effect.flatMap((present) => present.has(path)
        ? Effect.void
        : Effect.fail(notFound(method, path))),
    )

  const fs = FileSystem.makeNoop({
    exists: (path) =>
      Effect.all([Ref.get(files), Ref.get(directories)]).pipe(
        Effect.map(([held, present]) => held.has(path) || present.has(path)),
      ),
    link: (fromPath, toPath) => Ref.modify(files, (held) => {
      const source = held.get(fromPath)
      if (source === undefined) return ["missing" as const, held]
      if (held.has(toPath)) return ["exists" as const, held]
      return ["linked" as const, new Map(held).set(toPath, source)]
    }).pipe(
      Effect.flatMap((result) => result === "linked"
        ? Effect.void
        : Effect.fail(result === "missing"
            ? notFound("link", fromPath)
            : alreadyExists("link", toPath))),
    ),
    makeDirectory: (path, options) =>
      Ref.update(directories, withDirectories(path, options?.recursive ?? false)),
    makeTempFile: (options) => {
      const directory = options?.directory ?? ""
      return requireDirectory("makeTempFile", directory).pipe(
        Effect.flatMap(() => Ref.modify(tempSerial, (serial) =>
          [serial + 1, serial + 1] as const)),
        Effect.flatMap((serial) => {
          const path = `${directory}/${options?.prefix ?? "tmp-"}${serial}`
          return Ref.update(files, inserted(path, new Uint8Array(0))).pipe(
            Effect.as(path),
          )
        }),
      )
    },
    readDirectory: (path) =>
      requireDirectory("readDirectory", path).pipe(
        Effect.flatMap(() => Ref.get(files)),
        Effect.map((held) => {
          const prefix = `${path}/`
          return [...held.keys()]
            .filter((key) => key.startsWith(prefix)
              && !key.slice(prefix.length).includes("/"))
            .map((key) => key.slice(prefix.length))
        }),
      ),
    readFile: (path) =>
      Ref.get(files).pipe(
        Effect.flatMap((held) => {
          const resident = held.get(path)
          return resident === undefined
            ? Effect.fail(notFound("readFile", path))
            : Effect.succeed(resident.slice())
        }),
      ),
    remove: (path, options) =>
      Ref.get(files).pipe(
        Effect.flatMap((held) => held.has(path)
          ? Ref.update(files, removed(path))
          : options?.force === true
            ? Effect.void
            : Effect.fail(notFound("remove", path))),
      ),
    rename: (oldPath, newPath) =>
      Ref.get(files).pipe(
        Effect.flatMap((held) => {
          const resident = held.get(oldPath)
          return resident === undefined
            ? Effect.fail(notFound("rename", oldPath))
            : Ref.update(files, (current) => {
                const next = new Map(current)
                next.delete(oldPath)
                next.set(newPath, resident)
                return next
              })
        }),
      ),
    writeFile: (path, data) =>
      requireDirectory("writeFile", parentOf(path)).pipe(
        Effect.flatMap(() => Ref.update(files, inserted(path, data.slice()))),
      ),
  })

  return {
    dump: Ref.get(files),
    fs,
    poke: (path, bytes) => Ref.update(files, inserted(path, bytes.slice())),
  }
})
