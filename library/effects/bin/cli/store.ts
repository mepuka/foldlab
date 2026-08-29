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
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Context, Effect, FileSystem, Layer, Option, Path, Schema } from "effect"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
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
  backend: Schema.Literals(["file", "sqlite"]),
  serve: Schema.optionalKey(ServePolicy),
  backup: Schema.optionalKey(Schema.Struct({ target: Schema.String })),
})
export type StoreConfig = typeof StoreConfig.Type

/** Which backend a store is opened with. The config file is where a
 * store states it, and `init` is what writes it. */
export type StoreBackend = StoreConfig["backend"]

/** The database file of a db-backed store, beside its config. The
 * store is still a directory — the layout is one file inside it
 * instead of two directories. */
export const casDatabaseName = "cas.db"

/** The object table of a db-backed store, as `test/KvsSqlite.test.ts`
 * and `scripts/litestream-check.ts` name it. */
const objectTable = "cas_objects"

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

/** Which backend a located store is opened with: what its config says,
 * and the file backend when there is no config — every store written
 * before `--backend` existed is a file store. */
export const backendOf = (config: Option.Option<StoreConfig>): StoreBackend =>
  Option.match(config, {
    onNone: () => "file" as const,
    onSome: (present) => present.backend,
  })

/** Whether a directory is a store root. Two layouts answer yes: the
 * ratified file one, whose `objects/` directory is its own witness,
 * and the db-backed one, which has no directories to point at — its
 * witness is the config `init` wrote naming the backend, with the
 * database beside it. A config alone is not a store, and a stray
 * `cas.db` alone is not either. */
const isStoreRoot = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  directory: string,
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const exists = (relative: string): Effect.Effect<boolean> =>
      fs.exists(path.join(directory, relative)).pipe(
        Effect.orElseSucceed(() => false),
      )
    if (yield* exists("objects")) return true
    // Discovery must not stop at an undecodable config: walking past
    // it is what lets the real store above it still be found. The
    // refusal a malformed config deserves is raised when a verb opens
    // the store it names, where `readConfig` fails typed.
    const config = yield* readConfig(located(directory, "discovered", path)).pipe(
      Effect.provideService(FileSystem.FileSystem, fs),
      Effect.orElseSucceed(() => Option.none<StoreConfig>()),
    )
    if (backendOf(config) !== "sqlite") return false
    return yield* exists(casDatabaseName)
  })

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

/**
 * THE db-backed composition, and the only place a database is named.
 * The library speaks `KeyValueStore` and `SqlClient` and never a
 * driver (`test/KvsSqlite.test.ts`'s own claim); the CLI is a shipped
 * binary, so the concrete choice — SQLite on one file, through the Bun
 * driver — is made here, at the composition, where every other host
 * choice is already made.
 *
 * Two tables in one file: `cas_objects`, the byte plane through the
 * key-value backend, and `cas_roots`, the naming plane through the
 * roots adapter over the same client. One file is also the unit
 * Litestream replicates, so the bytes and the names they name are
 * backed up together or not at all.
 *
 * The client opens the database in WAL mode by default, which is what
 * Litestream requires; nothing here configures it, and
 * `test/KvsSqlite.test.ts` asserts it.
 */
const layerSqliteCasAt = (store: string): Layer.Layer<
  | Cas.Store
  | Cas.Loader
  | Cas.RootStore
  | Cas.ByteReader
  | Cas.ByteWriter
  | Cas.AddressScheme
> =>
  Layer.mergeAll(Cas.layerStore, Cas.layerSqlRootStore()).pipe(
    Layer.provideMerge(Cas.layerKvsBackend),
    Layer.provide(KeyValueStore.layerSql({ table: objectTable })),
    // The store root stays a directory: the database is one file
    // inside it, beside the config that names the backend.
    Layer.provide(SqliteClient.layer({
      filename: `${store}/${casDatabaseName}`,
    })),
    Layer.provideMerge(Cas.layerAddressSha256Live),
  )

/** The store composition at a resolved root, dispatched on the backend
 * the store's config declares: the file backend over a store root, or
 * the byte plane and roots registry over one SQLite file. Either way
 * scheme-0 SHA-256 through WebCrypto, and either way the same seams
 * come out — which is the point of dispatching here and nowhere else.
 * The `FileSystem` realization stays a visible requirement, satisfied
 * once at the entry point by the platform layer. */
export const layerCasAt = (
  store: string,
  backend: StoreBackend = "file",
): Layer.Layer<
  | Cas.Store
  | Cas.Loader
  | Cas.RootStore
  | Cas.ByteReader
  | Cas.ByteWriter
  | Cas.AddressScheme,
  never,
  FileSystem.FileSystem
> =>
  backend === "sqlite"
    ? layerSqliteCasAt(store)
    : Cas.layerFile(store).pipe(Layer.provideMerge(Cas.layerAddressSha256Live))

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
 *
 * The read seam and the address scheme stay in the answer beside the
 * typed doors, because the graph laws are stated over them:
 * `Cas.Graph.verify` recomputes every address itself rather than
 * trusting the store, which is exactly what `cas verify` is for.
 */
export const layerStoreAt = (
  explicit: Option.Option<string>,
): Layer.Layer<
  | Cas.Store
  | Cas.Loader
  | Cas.RootStore
  | Cas.ByteReader
  | Cas.AddressScheme
  | StoreLocation,
  NoStoreFound | Schema.SchemaError,
  FileSystem.FileSystem | Path.Path
> =>
  Layer.unwrap(Effect.gen(function* () {
    const location = yield* locateStore(explicit)
    // The config is read once, here, and decides which backend is
    // opened — so a verb never asks, and an undecodable config refuses
    // the invocation instead of being defaulted past.
    const config = yield* readConfig(location)
    return Layer.merge(
      layerCasAt(location.store, backendOf(config)),
      Layer.succeed(StoreLocation, location),
    )
  }))

/**
 * Create the database of a db-backed store, which is done by opening
 * it: the client creates the file, the key-value layer creates the
 * object table, and the roots adapter creates the roots table, all at
 * layer build. The listing below is what forces that build — `init`
 * admits no content, and this read of an empty registry is the whole
 * creation step.
 *
 * The composition is provided here rather than at the command
 * boundary because creating a store is not opening one: the boundary
 * layer resolves and opens a store that already exists, and this is
 * the one moment before that is true.
 */
const createDatabase = (store: string): Effect.Effect<void> =>
  Cas.RootStore.pipe(
    Effect.flatMap((roots) => roots.list),
    Effect.asVoid,
    Effect.provide(layerSqliteCasAt(store)),
    Effect.orDie,
  )

/** Create a store: `<target>/.cas` by default, the target itself when
 * bare. Fails when a store already lives there — init creates exactly
 * once. Answers the created store root. */
export const initStore = (
  target: string,
  bare: boolean,
  backend: StoreBackend = "file",
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
      backend,
      serve: defaultServePolicy,
    })
    const rendered = yield* Schema.encodeEffect(
      Schema.fromJsonString(StoreConfig, { space: 2 }),
    )(config).pipe(Effect.orDie)

    // The config comes first for both layouts: it is what a db-backed
    // store is recognized by, and writing it before the database means
    // a half-created store is never a directory holding an
    // unattributable cas.db.
    yield* fs.makeDirectory(store, { recursive: true }).pipe(
      Effect.andThen(fs.writeFileString(path.join(store, "config.json"), `${rendered}\n`)),
      Effect.orDie,
    )

    if (backend === "sqlite") {
      yield* createDatabase(store)
      return located(store, "explicit", path)
    }

    yield* fs.makeDirectory(path.join(store, "objects"), { recursive: true }).pipe(
      Effect.andThen(fs.makeDirectory(path.join(store, "roots"), { recursive: true })),
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
