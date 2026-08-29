/**
 * Store location and configuration — the host half of the CLI.
 *
 * Resolution order (CLI grill round 1): the `--store` flag, then the
 * `CAS_STORE` environment variable, then walk-up discovery of a `.cas`
 * directory from the working directory. Nothing here creates a store:
 * `init` is the only creator, and a missing store is a typed refusal
 * with guidance, never an implicit mkdir.
 *
 * Vocabulary law: "store" is where the bytes live; "roots" only ever
 * means published addresses. The store location is host territory —
 * the Lean model deliberately says nothing about paths.
 */
import { Context, Effect, FileSystem, Layer, Option, Path, Schema } from "effect"
import { Cas } from "../../src/index.ts"

/** Serve policy as configuration: the numbers the wire's capability
 * document will publish. The credential is never inline (grill round
 * 2); `credentialEnv` names an environment variable instead. */
export const ServePolicy = Schema.Struct({
  port: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 })),
  maxBatchKeys: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  maxNodeBytes: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  anonymousReads: Schema.Boolean,
  credentialEnv: Schema.optionalKey(Schema.String),
})
export type ServePolicy = typeof ServePolicy.Type

/** The store's host configuration, written by `init`, printed by
 * `status`, overridden by flags and environment: flags > env > config
 * file > defaults. */
export const StoreConfig = Schema.Struct({
  backend: Schema.Literal("file"),
  serve: Schema.optionalKey(ServePolicy),
  backup: Schema.optionalKey(Schema.Struct({ target: Schema.String })),
})
export type StoreConfig = typeof StoreConfig.Type

export const defaultServePolicy: ServePolicy = ServePolicy.make({
  port: 8080,
  maxBatchKeys: 64,
  maxNodeBytes: 1_048_576,
  anonymousReads: true,
})

/** No store answered the resolution order. Carries what was searched so
 * the guidance names concrete paths. */
export class NoStoreFound extends Schema.TaggedError<NoStoreFound>()(
  "cli/NoStoreFound",
  { searchedFrom: Schema.String },
) {
  override get message(): string {
    // Continuation lines carry the formatter's own two-space indent so
    // the guidance stays aligned under its ERROR heading.
    return [
      `no store found from ${this.searchedFrom}`,
      "  searched: the --store flag, then CAS_STORE, then every parent directory for .cas",
      "  create one here with: cas init   (or cas init --bare <directory>)",
    ].join("\n")
  }
}

/** `init` refuses to touch an existing store — it is the only creator,
 * and it creates exactly once. */
export class StoreAlreadyExists extends Schema.TaggedError<StoreAlreadyExists>()(
  "cli/StoreAlreadyExists",
  { store: Schema.String },
) {
  override get message(): string {
    return `a store already lives at ${this.store}`
  }
}

export class InvalidAddress extends Schema.TaggedError<InvalidAddress>()(
  "cli/InvalidAddress",
  { input: Schema.String },
) {
  override get message(): string {
    return `not an address: "${this.input}" — an address is 64 lowercase hex characters`
  }
}

export interface Located {
  /** The store root directory: the `.cas` directory, or the bare
   * directory itself. */
  readonly store: string
  /** How the store was found: named outright (by the `--store` flag or
   * `CAS_STORE`, which the flag's own config fallback resolves), or
   * discovered by walking up from the working directory. */
  readonly origin: "explicit" | "discovered"
  readonly configPath: string
}

const located = (
  store: string,
  origin: Located["origin"],
  path: Path.Path,
): Located => ({
  store,
  origin,
  configPath: path.join(store, "config.json"),
})

/** Whether a directory is a store root: the ratified layout's
 * `objects/` directory is present. */
const isStoreRoot = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  directory: string,
): Effect.Effect<boolean> =>
  fs.exists(path.join(directory, "objects")).pipe(
    Effect.orElseSucceed(() => false),
  )

const workingDirectory: Effect.Effect<string> = Effect.sync(() => process.cwd())

/** Resolve the store: an explicitly named one — the `--store` flag or
 * the `CAS_STORE` fallback its own config resolves — otherwise walk-up
 * `.cas` discovery, otherwise a typed refusal carrying guidance. */
export const locateStore = (
  explicit: Option.Option<string>,
): Effect.Effect<Located, NoStoreFound, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    if (Option.isSome(explicit)) {
      return located(path.resolve(explicit.value), "explicit", path)
    }

    const start = yield* workingDirectory
    let current = path.resolve(start)
    for (;;) {
      const candidate = path.join(current, ".cas")
      if (yield* isStoreRoot(fs, path, candidate)) {
        return located(candidate, "discovered", path)
      }
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
    return yield* new NoStoreFound({ searchedFrom: start })
  })

/** The store composition at a resolved root: the file backend under
 * the store law, scheme-0 SHA-256 through WebCrypto. The `FileSystem`
 * realization stays a visible requirement, satisfied once at the
 * entry point by the platform layer. */
export const layerCasAt = (store: string) =>
  Cas.layerFile(store).pipe(Layer.provideMerge(Cas.layerAddressSha256Live))

/** Where this invocation's store was found, as a dependency — so a
 * verb that prints paths asks the context for them instead of
 * threading a value through every call. */
export class StoreLocation extends Context.Service<StoreLocation, Located>()(
  "foldlab/cas/cli/StoreLocation",
) {}

/**
 * The whole composition for one invocation: resolve the store, then
 * open it. `Layer.unwrap` turns the resolution effect into a layer, so
 * a store path discovered at runtime still arrives as an ordinary
 * dependency — provided once at the command boundary, never inside a
 * program.
 */
export const layerStoreAt = (
  explicit: Option.Option<string>,
): Layer.Layer<
  Cas.Store | Cas.Loader | Cas.RootStore | StoreLocation,
  NoStoreFound,
  FileSystem.FileSystem | Path.Path
> =>
  Layer.unwrap(locateStore(explicit).pipe(
    Effect.map((location) => Layer.merge(
      layerCasAt(location.store),
      Layer.succeed(StoreLocation, location),
    )),
  ))

/** Read and decode the store's config, absent when the file is not
 * there. A present-but-invalid config is a typed refusal, never a
 * silent default. */
export const readConfig = (
  location: Located,
): Effect.Effect<
  Option.Option<StoreConfig>,
  Schema.SchemaError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const raw = yield* fs.readFileString(location.configPath).pipe(
      Effect.asSome,
      Effect.orElseSucceed(() => Option.none<string>()),
    )
    if (Option.isNone(raw)) return Option.none()
    const decoded = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(StoreConfig))(raw.value)
    return Option.some(decoded)
  })

/** Create a store: `<target>/.cas` by default, the target itself when
 * bare. Fails when a store already lives there — init creates exactly
 * once. Answers the created store root. */
export const initStore = (
  target: string,
  bare: boolean,
): Effect.Effect<
  Located,
  StoreAlreadyExists,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const resolved = path.resolve(target)
    const store = bare ? resolved : path.join(resolved, ".cas")

    if (yield* isStoreRoot(fs, path, store)) {
      return yield* new StoreAlreadyExists({ store })
    }

    const config = StoreConfig.make({
      backend: "file",
      serve: defaultServePolicy,
    })
    const rendered = yield* Schema.encodeEffect(
      Schema.fromJsonString(StoreConfig, { space: 2 }),
    )(config).pipe(Effect.orDie)

    yield* fs.makeDirectory(path.join(store, "objects"), { recursive: true }).pipe(
      Effect.andThen(fs.makeDirectory(path.join(store, "roots"), { recursive: true })),
      Effect.andThen(fs.writeFileString(path.join(store, "config.json"), `${rendered}\n`)),
      Effect.orDie,
    )
    return located(store, "explicit", path)
  })

/** Count admitted objects by walking the fanout directories — a
 * disk-side inspection through the same `FileSystem` service the
 * backend uses. Read-only, like everything `status` does. */
export const countObjects = (
  location: Located,
): Effect.Effect<number, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const objectsDir = path.join(location.store, "objects")
    const noEntries: ReadonlyArray<string> = []
    const fanouts = yield* fs.readDirectory(objectsDir).pipe(
      Effect.orElseSucceed(() => noEntries),
    )
    const objectName = /^[0-9a-f]{62}$/u
    const counts = yield* Effect.forEach(fanouts, (fanout) =>
      fs.readDirectory(path.join(objectsDir, fanout)).pipe(
        Effect.map((entries) => entries.filter((entry) => objectName.test(entry)).length),
        Effect.orElseSucceed(() => 0),
      ))
    return counts.reduce((sum, count) => sum + count, 0)
  })
