/**
 * The v0 verbs, each a program over the store's services — never a new
 * operation (plan §13 ruling 5). Host concerns (location, config,
 * output) live here; every semantic step goes through the library's
 * doors: `CasLoader` for reads, `RootStore` for publication, the
 * described codecs for `--json`.
 *
 * Each verb is written against services alone and the composition is
 * provided once, at the command boundary — including the store
 * location itself, which `layerStoreAt` resolves into a dependency.
 */
import {
  Cause,
  Config,
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Result,
  Schema,
} from "effect"
import { Argument, CliError, Command, Flag } from "effect/unstable/cli"
import { Cas } from "../../src/index.ts"
import {
  backendOf,
  countObjects,
  initStore,
  InvalidAddress,
  layerStoreAt,
  readConfig,
  StoreLocation,
  type Located,
  type StoreBackend,
  type StoreConfig,
} from "./store.ts"
import {
  casErrorMessage,
  renderBindingJson,
  renderPayload,
  tagLabel,
} from "./render.ts"
import {
  layerServe,
  layerStderrLogs,
  policyOrDefault,
  serveUntilClosed,
} from "../mcp/server.ts"

/**
 * Every failure a verb can surface is rendered as a user error: the
 * runner prints the message through its own formatter and marks it
 * reported, so a refusal reads as guidance instead of a stack trace.
 * Store refusals go through the library's own error fold, so each
 * clause arrives named; anything else is normalized by `prettyErrors`,
 * which turns an Error, a string, or a bare primitive into one message
 * without this module reaching for `.message` itself.
 *
 * Only the typed error channel is mapped: defects keep their stack
 * traces and interrupts stay interrupts, because neither is something
 * a user can act on.
 */
const userFacing = <A, E, R>(
  program: Effect.Effect<A, E, R>,
): Effect.Effect<A, CliError.UserError, R> =>
  Effect.mapError(program, (error) => {
    const message = Cas.isCasError(error)
      ? casErrorMessage(error)
      : Cause.prettyErrors(Cause.fail(error))
        .map((pretty) => pretty.message)
        .join("\n")
    return new CliError.UserError({ cause: error, userMessage: message })
  })

/** Flag, then `CAS_STORE`, then absent — the precedence is the flag's
 * own config fallback, so this module never reads the environment.
 * Discovery happens below it, in `locateStore`. */
const storeFlag = Flag.string("store").pipe(
  Flag.withFallbackConfig(Config.string("CAS_STORE")),
  Flag.optional,
  Flag.withDescription(
    "the store to use; otherwise CAS_STORE, otherwise every parent is searched for a .cas directory",
  ),
)

/** What the store line says about itself: which backend was opened,
 * and whether the store was named or walked up to. The backend is read
 * from the config rather than assumed, so the line cannot claim a
 * layout the store does not have. */
const backendLabel = (
  backend: StoreBackend,
  origin: Located["origin"],
): string =>
  origin === "discovered" ? `${backend} backend, discovered` : `${backend} backend`

/** An address off the command line. The refusal is the CLI's own
 * clause, so a mistyped address reads as guidance instead of a schema
 * issue — the library is never asked about a string that is not one. */
const decodeAddress = (
  input: string,
): Effect.Effect<Cas.ContentId, InvalidAddress> =>
  Schema.decodeUnknownEffect(Cas.ContentId)(input).pipe(
    Effect.mapError(() => new InvalidAddress({ input })),
  )

/* ── init ────────────────────────────────────────────────────────── */

export const init = Command.make("init", {
  backend: Flag.choice("backend", ["file", "sqlite"]).pipe(
    Flag.withDefault("file" as StoreBackend),
    Flag.withDescription(
      "where the bytes live: file, a directory of objects; sqlite, one cas.db a litestream replica backs up",
    ),
  ),
  bare: Flag.boolean("bare").pipe(
    Flag.withDefault(false),
    Flag.withDescription(
      "make the directory itself the store root — servable and committable — instead of creating .cas inside it",
    ),
  ),
  directory: Argument.string("directory").pipe(
    Argument.optional,
    Argument.withDescription("where the store lives (default: the current directory)"),
  ),
}, ({ backend, bare, directory }) =>
  Effect.gen(function* () {
    const target = Option.getOrElse(directory, () => ".")
    const location = yield* initStore(target, bare, backend)
    yield* Console.log(`initialized store  ${location.store}`)
    yield* Console.log(`config             ${location.configPath}`)
    // What to do with it next is a property of the layout, so the line
    // states the one that was created — never the file backend's
    // advice over a live WAL database.
    yield* Console.log(backend === "file"
      ? "the directory is the store: rsync it, commit it, push it"
      : `the database is the store: ${location.store}/cas.db — replicate it with litestream`)
  }).pipe(userFacing)).pipe(Command.withDescription(
    "create a store here — the only verb that ever creates one; add --wizard to be walked through it",
  ))

/* ── status ──────────────────────────────────────────────────────── */

const serveLine = (config: Option.Option<StoreConfig>): string => {
  if (Option.isNone(config) || config.value.serve === undefined) {
    return "serve      not configured — `cas init` writes the defaults"
  }
  const serve = config.value.serve
  const reads = serve.anonymousReads ? "anonymous reads" : "credential required"
  return `serve      port ${serve.port} · maxBatchKeys ${serve.maxBatchKeys} · maxNodeBytes ${serve.maxNodeBytes} · maxInFlight ${serve.maxInFlight} · ${reads}`
}

/** What backing this store up means when the config names no target.
 * The advice is the layout's, not one sentence for both: a file store
 * IS its directory, so copying the directory is a backup; a db-backed
 * store is a live SQLite file in WAL mode, where a file copy can catch
 * a torn moment and replication is the answer. */
const backupLine = (
  config: Option.Option<StoreConfig>,
  backend: StoreBackend,
): string => {
  if (Option.isSome(config) && config.value.backup !== undefined) {
    return `backup     ${config.value.backup.target}`
  }
  return backend === "file"
    ? "backup     the directory is the store — rsync it, commit it, push it"
    : "backup     replicate cas.db with litestream — do not copy or commit a live WAL database"
}

/** Read-only by law: every step here loads, counts, or lists. */
const statusProgram = Effect.gen(function* () {
  const location = yield* StoreLocation
  const roots = yield* Cas.RootStore
  const config = yield* readConfig(location)
  const backend = backendOf(config)
  const published = yield* roots.list
  yield* Console.log(
    `store      ${location.store}  (${backendLabel(backend, location.origin)})`,
  )
  yield* Console.log(`config     ${Option.isSome(config) ? location.configPath : "none"}`)
  // The object count is a walk of the fanout directories, so it is a
  // file-backend answer. A db-backed store holds its objects in a
  // table this verb does not query — and reporting a directory walk's
  // zero for it would be a false statement, not a missing feature.
  yield* Console.log(backend === "file"
    ? `objects    ${yield* countObjects(location)}`
    : `objects    in ${location.store}/cas.db — status does not count them`)
  yield* Console.log(`roots      ${published.length} published`)
  yield* Console.log(serveLine(config))
  yield* Console.log(backupLine(config, backend))
})

export const status = Command.make("status", {
  store: storeFlag,
}, ({ store }) =>
  statusProgram.pipe(Effect.provide(layerStoreAt(store)), userFacing)).pipe(
    Command.withDescription(
      "where the data lives and what it holds — read-only: status never alters anything",
    ),
  )

/* ── ls ──────────────────────────────────────────────────────────── */

const lsProgram = Effect.gen(function* () {
  const roots = yield* Cas.RootStore
  const loader = yield* Cas.Loader
  const published = yield* roots.list
  if (published.length === 0) {
    return yield* Console.log("no roots published")
  }
  for (const id of published.toSorted()) {
    // A published root that will not load is reported in place: the
    // listing states what the store answered, root by root.
    const loaded = yield* Effect.result(loader.load(id))
    yield* Console.log(Result.match(loaded, {
      onSuccess: (node) =>
        `${id}  kind ${tagLabel(node.kind.tag)}  ${node.refs.length} links`,
      onFailure: (error) => `${id}  ${casErrorMessage(error)}`,
    }))
  }
})

export const ls = Command.make("ls", {
  store: storeFlag,
}, ({ store }) =>
  lsProgram.pipe(Effect.provide(layerStoreAt(store)), userFacing)).pipe(
    Command.withDescription(
      "the published roots — every entry point, loaded and re-verified as it is listed",
    ),
  )

/* ── show ────────────────────────────────────────────────────────── */

const showProgram = (address: string, json: boolean) =>
  Effect.gen(function* () {
    const id = yield* decodeAddress(address)
    const loader = yield* Cas.Loader
    const node = yield* loader.load(id)
    if (json) {
      return yield* Console.log(renderBindingJson(id, node))
    }
    yield* Console.log(`address    ${id}`)
    yield* Console.log(`kind       ${tagLabel(node.kind.tag)}  (scheme ${node.kind.version})`)
    yield* Console.log(`payload    ${renderPayload(node.payload)}`)
    if (node.refs.length === 0) {
      return yield* Console.log("links      none")
    }
    for (const [index, ref] of node.refs.entries()) {
      yield* Console.log(`link ${index}     ${ref.id}  expects ${tagLabel(ref.expectedTag)}`)
    }
  })

export const show = Command.make("show", {
  store: storeFlag,
  json: Flag.boolean("json").pipe(
    Flag.withDefault(false),
    Flag.withDescription(
      "emit the described canonical node document — the exact bytes the address is computed over — instead of the human rendering",
    ),
  ),
  address: Argument.string("address").pipe(
    Argument.withDescription("the 64-hex address to load"),
  ),
}, ({ address, json, store }) =>
  showProgram(address, json).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "one node, loaded and re-verified: its kind, payload, and typed links",
  ))

/* ── put ─────────────────────────────────────────────────────────── */

/**
 * NOT the ratified input register. CLI grill round 1 ruling 2 rules
 * `put`'s input to be the described canonical node document — the
 * vector wire shape, kind/payload/refs — so that a node with links can
 * be spelled at all. This verb takes bytes and a kind tag, which is a
 * strict subset: refs are always empty, and no format is minted (the
 * ruling's actual prohibition). The node-document register, and the
 * separate `--schema` and blob-ingestion verbs the same ruling names,
 * remain owed.
 */
/** The kind a file's bytes take when nothing else is said: registry
 * row 1 (`value`, 0x01, RATIFIED core — an opaque value payload),
 * which is what bytes with no declared discipline are. The store
 * admits every tag at the scheme version, so naming a row that
 * carries its own payload law — a blob node, a schema node — is a
 * claim only the caller can make, through `--kind-tag`. */
const defaultKindTag = 0x01

const putProgram = (file: string, kindTag: number) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const payload = yield* fs.readFile(file)
    const store = yield* Cas.Store
    // One node, no links: `put` is the store law's own door, so every
    // admission clause it refuses on arrives named.
    const id = yield* store.put(Cas.NodeInput.make({
      kind: { version: Cas.SchemeVersion, tag: kindTag },
      payload,
      refs: [],
    }))
    yield* Console.log(`address    ${id}`)
    yield* Console.log(
      `kind       ${tagLabel(kindTag)}  (scheme ${Cas.SchemeVersion})`,
    )
    yield* Console.log(`payload    ${payload.length} bytes`)
  })

export const put = Command.make("put", {
  store: storeFlag,
  kindTag: Flag.integer("kind-tag").pipe(
    Flag.withSchema(Cas.Byte),
    Flag.withDefault(defaultKindTag),
    Flag.withDescription(
      "the kind the content takes, as a tag byte (default: 1, an opaque value payload)",
    ),
  ),
  file: Argument.file("file", { mustExist: true }).pipe(
    Argument.withDescription("the file whose bytes become the payload"),
  ),
}, ({ file, kindTag, store }) =>
  putProgram(file, kindTag).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "put a file's bytes in the store as one node — the address is the answer, and equal bytes give it back unchanged",
  ))

/* ── publish ─────────────────────────────────────────────────────── */

const publishProgram = (address: string) =>
  Effect.gen(function* () {
    const id = yield* decodeAddress(address)
    const loader = yield* Cas.Loader
    // Load before publishing, fail-closed: publication claims an
    // address is an entry point, so an address that will not load —
    // absent, non-canonical, mis-addressed — is refused here instead
    // of becoming a root `ls` has to report as broken.
    const node = yield* loader.load(id)
    const roots = yield* Cas.RootStore
    yield* roots.publish(id)
    yield* Console.log(`published  ${id}`)
    yield* Console.log(
      `kind       ${tagLabel(node.kind.tag)}  (scheme ${node.kind.version})`,
    )
  })

export const publish = Command.make("publish", {
  store: storeFlag,
  address: Argument.string("address").pipe(
    Argument.withDescription("the 64-hex address to publish as a root"),
  ),
}, ({ address, store }) =>
  publishProgram(address).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "publish an address as a root — loaded first, so an address that will not load is never published",
  ))

/* ── serve ───────────────────────────────────────────────────────── */

/**
 * The host over the store this invocation resolved. The policy is a
 * property of that store, so it is read here — where the store is
 * already open and `layerStoreAt` has already refused an undecodable
 * config — and handed to the host, which knows about policies and
 * nothing about where stores live.
 */
const layerServeHere = Layer.unwrap(Effect.gen(function* () {
  const location = yield* StoreLocation
  const config = yield* readConfig(location)
  yield* Effect.logInfo("store opened").pipe(
    Effect.annotateLogs({ store: location.store, origin: location.origin }),
  )
  return layerServe(policyOrDefault(
    Option.isSome(config) ? config.value.serve : undefined,
  ))
}))

/**
 * The MCP host, over the store this invocation resolves — the verb the
 * `ServePolicy` `init` writes has been waiting for (BOOTSTRAP B2).
 *
 * The tool table is the Lean-emitted manifest's, checked against what
 * this host serves before a byte of protocol is spoken, so `cas serve`
 * either answers the estate's own five tools or refuses to start.
 *
 * Nothing here prints. On stdio the protocol IS stdout, so the whole
 * surface is the log, and this verb's one output choice is where it
 * goes: logfmt on stderr. How MUCH it says is the runner's own
 * built-in `--log-level` global flag (`GlobalFlag.LogLevel`, which
 * sets `References.MinimumLogLevel`) — this package declares no second
 * flag by that name.
 */
export const serve = Command.make("serve", {
  store: storeFlag,
}, ({ store }) =>
  serveUntilClosed.pipe(
    Effect.provide(layerServeHere),
    Effect.provide(layerStoreAt(store)),
    Effect.provide(layerStderrLogs),
    userFacing,
  )).pipe(Command.withDescription(
    "speak MCP over stdio against this store — the five tools the estate's manifest declares, and no others",
  ))

/* ── verify ──────────────────────────────────────────────────────── */

/** The audit's verdict as one line: how many nodes the walk covered,
 * or the refusal's own clause. */
const verdictLine = (
  id: Cas.ContentId,
  walked: ReadonlyArray<Cas.ContentId>,
): string =>
  `${id}  verified  ${walked.length} ${walked.length === 1 ? "node" : "nodes"}`

const verifyProgram = (address: Option.Option<string>) =>
  Effect.gen(function* () {
    if (Option.isSome(address)) {
      // A named root is the caller's claim, so its refusal is the
      // command's refusal — the clause is rendered as an error and the
      // exit is non-zero, which is what makes the verb a gate.
      const id = yield* decodeAddress(address.value)
      return yield* Console.log(verdictLine(id, yield* Cas.Graph.verify(id)))
    }
    const roots = yield* Cas.RootStore
    const published = yield* roots.list
    if (published.length === 0) {
      return yield* Console.log("no roots published")
    }
    for (const id of published.toSorted()) {
      // Over every root the verdict is reported in place, as `ls`
      // reports a root that will not load: a listing states what the
      // store answered root by root, never stopping at the first
      // refusal.
      const audited = yield* Effect.result(Cas.Graph.verify(id))
      yield* Console.log(Result.match(audited, {
        onSuccess: (walked) => verdictLine(id, walked),
        onFailure: (error) => `${id}  ${casErrorMessage(error)}`,
      }))
    }
  })

export const verify = Command.make("verify", {
  store: storeFlag,
  address: Argument.string("address").pipe(
    Argument.optional,
    Argument.withDescription(
      "the root to audit (default: every published root)",
    ),
  ),
}, ({ address, store }) =>
  verifyProgram(address).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "re-hash and re-decode everything reachable from a root — the whole audit, over an untrusted store",
  ))
