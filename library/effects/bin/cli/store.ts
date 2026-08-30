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
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { Cas } from "../../src/index.ts"
// The host's metrics, imported by the composition rather than the
// other way round: `bin/mcp/telemetry.ts` names no CLI module, so the
// dependency stays one-directional. The SQL path is timed HERE because
// here is the only place that knows there is one.
import * as Telemetry from "../mcp/telemetry.ts"

/** The bound a store gets when its config predates the field, and the
 * one `init` writes today.
 *
 * Sixty-four store-touching calls at once. The audit measured roughly
 * 46 KB of resident memory per in-flight request, so this is a ceiling
 * of about 3 MB of concurrency — bounded by construction, and still
 * wide enough that the bound is not the throughput limit on any
 * ordinary client. */
export const defaultMaxInFlight = 64

/** Serve policy as configuration: the numbers the wire's capability
 * document will publish. The credential is never inline (grill round
 * 2); `credentialEnv` names an environment variable instead. */
export const ServePolicy = Schema.Struct({
  port: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 })),
  maxBatchKeys: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  maxNodeBytes: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  /**
   * How many store-touching calls the host will run at once — the one
   * policy field that is about the HOST rather than the wire, and the
   * only one that is transport-independent for the same reason
   * `maxNodeBytes` is: it bounds work, not bytes.
   *
   * Semantics, exactly:
   *
   * - It is a CONCURRENCY bound, not a queue bound and not a rate
   *   limit. Call number `maxInFlight + 1` waits for a permit; it is
   *   never refused, never dropped, and never answered out of turn.
   *   Ordering within a session remains the client's business, as it
   *   already was.
   * - It gates the handlers that TOUCH THE STORE — every one of the
   *   five tools. `initialize` and `tools/list` are the protocol's own
   *   and are deliberately outside the gate, so a saturated store
   *   never makes the host look dead to a client asking what it
   *   serves.
   * - `cas_run` holds ONE permit for the whole program, not one per
   *   instruction: a run is one call, and its instructions are
   *   sequential by the document's own law.
   * - It bounds admitted work, not resident memory. The transport's
   *   own outbound queue is upstream of this field and is not bounded
   *   by it.
   * - The key may be absent: a store initialized before this field
   *   existed decodes with `defaultMaxInFlight` and is served under
   *   it. `init` writes the number out, so a store created today says
   *   what it is served under.
   */
  maxInFlight: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(defaultMaxInFlight)),
  ),
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
  maxInFlight: defaultMaxInFlight,
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
 * The two SQLite connections one store is opened with, and the four
 * seams split across them.
 *
 * ## Why two connections and not one
 *
 * The Bun driver holds ONE `Database` behind ONE `Semaphore(1)`
 * (`node_modules/@effect/sql-sqlite-bun/src/SqliteClient.ts:217`), so
 * every statement on a client is serialized against every other
 * statement on that client — reads behind writes included. Its own
 * module doc states the consequence: explicit transactions on a
 * writable connection take the write lock for their whole duration
 * "even when they only read", and "clients opened with `readonly:
 * true` are unaffected".
 *
 * So the read path gets its own connection, and reads are no longer
 * queued behind the writer's permit. WAL makes this safe for free: a
 * reader never blocks a writer and a writer never blocks a reader,
 * which the audit's four-process probe already demonstrated across
 * processes and this does within one.
 *
 * ## What it does NOT fix, measured
 *
 * `test/McpBackpressure.test.ts` timed the split against a single
 * shared client under a 3000 ms external write-lock hold, and the two
 * are indistinguishable: a concurrent `tools/list` is answered at
 * ~3012 ms either way. The reason is that the driver's semaphore is
 * not the binding constraint here — `bun:sqlite` is SYNCHRONOUS, so
 * the busy wait stops the event loop itself, and a second connection
 * has nothing to run on. The driver's own sentence about readonly
 * clients is about EXPLICIT TRANSACTIONS taking the write lock for
 * their duration, and this estate opens none (`grep withTransaction
 * src bin scripts` finds nothing).
 *
 * The split is kept because it is correct, costs one connection, and
 * becomes load-bearing the moment either of those two facts changes —
 * a transaction on the write path, or a driver that does not block the
 * loop (the audit's R6). Removing the stall is that change, not this
 * one. What BS-1 delivers against the remainder is visibility:
 * `bin/mcp/telemetry.ts`'s heartbeat reports the gap, and
 * `cas.store.sql_wait` — wrapped around both planes below — reports
 * the wait that caused it.
 *
 * ## The split, seam by seam
 *
 * - `ByteReader`, `RootStore.list`, and `WordLog.since` — the readonly
 *   connection.
 * - `ByteWriter`, `RootStore.publish`, and `WordLog.append` — the
 *   writable one.
 *
 * `RootStore` is one service with one method on each side, so it is
 * assembled from two shapes here rather than provided twice. Nothing
 * new is minted to do it: `Cas.makeKvsBackend` and
 * `Cas.makeSqlRootStore` are the library's own constructors, and this
 * is the composition — the one place allowed to decide which client
 * each of them is built over.
 *
 * The write side is built FIRST, and it is what creates the file and
 * both tables: a `readonly: true` client is opened with `create:
 * false`, so it cannot make the database and must not be asked to make
 * a table.
 *
 * Three tables in one file: `cas_objects`, the byte plane through the
 * key-value backend; `cas_roots`, the naming plane through the roots
 * adapter; and `cas_word`, the receipts plane through the word log.
 * One file is also the unit Litestream replicates, so the bytes, the
 * names, and the history are backed up together or not at all — a
 * restore restores THIS device's word, which is the honest reading of
 * "the word does not sync": backup is the same device remembering,
 * never two devices merging. A future device-sync deployment must
 * exclude `cas_word` from replication or move it to a local session
 * database; that is a composition change here, not a seam change. The writable client opens the database in WAL mode by default,
 * which is what Litestream requires; nothing here configures it, and
 * `test/KvsSqlite.test.ts` asserts it.
 */
const kvsOver = (client: SqlClient.SqlClient) =>
  Layer.build(KeyValueStore.layerSql({ table: objectTable })).pipe(
    Effect.map(Context.get(KeyValueStore.KeyValueStore)),
    Effect.provideService(SqlClient.SqlClient, client),
  )

/** The writable connection and the two seams that use it. This is also
 * what creates the file and both tables — `CREATE TABLE IF NOT EXISTS`
 * is a build step of each of these constructors. */
const sqliteWriteSide = (filename: string) =>
  SqliteClient.make({ filename }).pipe(
    Effect.flatMap((client) =>
      Effect.all([
        kvsOver(client).pipe(Effect.map((kvs) => Cas.makeKvsBackend(kvs).writer)),
        Cas.makeSqlRootStore().pipe(Effect.provideService(SqlClient.SqlClient, client)),
        Cas.makeSqlWordLog().pipe(Effect.provideService(SqlClient.SqlClient, client)),
      ]).pipe(Effect.map(([writer, roots, word]) => ({
        writer,
        publish: roots.publish,
        append: word.append,
      })))
    ),
  )

/** The readonly connection and the two seams that use it. Opened with
 * `create: false` by the driver, so it is built only after the write
 * side has made the file and the tables. */
const sqliteReadSide = (filename: string) =>
  SqliteClient.make({ filename, readonly: true }).pipe(
    Effect.flatMap((client) =>
      Effect.all([
        kvsOver(client).pipe(Effect.map((kvs) => Cas.makeKvsBackend(kvs).reader)),
        Cas.makeSqlRootStore().pipe(Effect.provideService(SqlClient.SqlClient, client)),
        Cas.makeSqlWordLog().pipe(Effect.provideService(SqlClient.SqlClient, client)),
      ]).pipe(Effect.map(([reader, roots, word]) => ({
        reader,
        list: roots.list,
        since: word.since,
      })))
    ),
  )

const layerSqlitePlanes = (store: string): Layer.Layer<
  Cas.ByteReader | Cas.ByteWriter | Cas.RootStore | Cas.WordLog
> =>
  Layer.effectContext(
    // Sequenced, not parallel: the write side is what makes the
    // database the read side is then allowed to open.
    sqliteWriteSide(`${store}/${casDatabaseName}`).pipe(
      Effect.flatMap((writes) =>
        sqliteReadSide(`${store}/${casDatabaseName}`).pipe(
          Effect.map((reads) =>
            // Every seam wrapped in the SQL timer: `cas.store.sql_wait`
            // is the head-of-line stall's own measurement, and it only
            // measures if it wraps the whole path including the wait.
            Context.make(Cas.ByteReader, {
              loadBytes: (id) => Telemetry.timeSql(reads.reader.loadBytes(id)),
              presence: (id) => Telemetry.timeSql(reads.reader.presence(id)),
            }).pipe(
              Context.add(Cas.ByteWriter, {
                putBytes: (id, bytes) => Telemetry.timeSql(writes.writer.putBytes(id, bytes)),
              }),
              Context.add(Cas.RootStore, {
                publish: (root) => Telemetry.timeSql(writes.publish(root)),
                list: Telemetry.timeSql(reads.list),
              }),
              Context.add(Cas.WordLog, {
                append: (entry) => Telemetry.timeSql(writes.append(entry)),
                since: (mark) => Telemetry.timeSql(reads.since(mark)),
              }),
            )
          ),
        )
      ),
    ),
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * THE db-backed composition, and the only place a database is named.
 * The library speaks `KeyValueStore` and `SqlClient` and never a
 * driver (`test/KvsSqlite.test.ts`'s own claim); the CLI is a shipped
 * binary, so the concrete choice — SQLite on one file, through the Bun
 * driver — is made here, at the composition, where every other host
 * choice is already made.
 */
const layerSqliteCasAt = (store: string): Layer.Layer<
  | Cas.Store
  | Cas.Loader
  | Cas.RootStore
  | Cas.WordLog
  | Cas.ByteReader
  | Cas.ByteWriter
  | Cas.AddressScheme
> =>
  Cas.layerStore.pipe(
    Layer.provideMerge(layerSqlitePlanes(store)),
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
  | Cas.WordLog
  | Cas.ByteReader
  | Cas.ByteWriter
  | Cas.AddressScheme,
  never,
  FileSystem.FileSystem
> =>
  backend === "sqlite"
    ? layerSqliteCasAt(store)
    // The file composition is spelled from the same pieces `layerFile`
    // composes, with the word log merged BESIDE the backend — it must
    // stand under `layerStore`'s build, where the store law reads it
    // as an optional service, or admissions would go unreceipted.
    : Cas.layerStore.pipe(
        Layer.provideMerge(Layer.merge(
          Cas.layerFileBackend(store),
          Cas.layerFileWordLog(store),
        )),
        Layer.provideMerge(Cas.layerAddressSha256Live),
      )

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
  | Cas.WordLog
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
