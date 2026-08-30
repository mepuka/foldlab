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
  Match,
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
  isRegisteredTag,
  kindJson,
  renderBindingJson,
  renderJson,
  renderPayload,
  tagHex,
  tagLabel,
} from "./render.ts"
import {
  findLabRoot,
  ledgers,
  readLedger,
  stated,
  type AdmissionLedger,
  type EnvironmentLedger,
  type LawLedger,
  type LedgerRead,
  type ObligationLedger,
} from "./ledgers.ts"
import {
  AnnotationNode,
  annotationsAbout,
  NameKey,
  nameablePlanes,
  subjectFor,
  type FoundAnnotation,
} from "./naming.ts"
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

/**
 * The machine register, on every verb that answers a question. `serve`
 * is the one exception and always will be: on stdio the protocol IS
 * stdout, so a second register there would be a corrupt frame.
 *
 * One JSON object per invocation, printed through the ratified
 * canonical printer — compact, keys ordered by codepoint at every
 * depth, the same shape `show` has answered with since the round-2
 * ruling. Every fact the prose prints is in it, under a stable key.
 */
const jsonFlag = Flag.boolean("json").pipe(
  Flag.withDefault(false),
  Flag.withDescription(
    "answer as one JSON object instead of prose — the same facts, in the machine register",
  ),
)

/** An address off the command line. The refusal is the CLI's own
 * clause, so a mistyped address reads as guidance instead of a schema
 * issue — the library is never asked about a string that is not one. */
const decodeAddress = (
  input: string,
): Effect.Effect<Cas.ContentId, InvalidAddress> =>
  Schema.decodeUnknownEffect(Cas.ContentId)(input).pipe(
    Effect.mapError(() => new InvalidAddress({ input })),
  )

/**
 * THE ARGUMENT REFUSALS, and why they are raised HERE.
 *
 * The runner can enforce both of these itself — `Argument.file` takes a
 * `mustExist` option, and `Flag.withSchema` would put `Cas.Byte` on
 * `--kind-tag`. Both were used, and both answered at grade D: a failure
 * inside the parser becomes `CliError.ShowHelp`, which prints a
 * twenty-line help document above the one sentence that matters
 * (`Command.ts:2684-2696`, an unconditional `Console.log` that
 * `renderErrors: false` does not reach).
 *
 * The deeper reason to move them is not the rendering. A tag byte is
 * the STORE's law and a file that must exist is the ESTATE's — neither
 * is a fact about the shape of an argument vector. Judged in the
 * handler they arrive through `userFacing` like every other refusal, in
 * the same words, with no help document in front of them. The parser is
 * left doing what it is for: turning an argument vector into a string
 * and a number.
 */
export class NoSuchFile extends Schema.TaggedError<NoSuchFile>()(
  "cli/NoSuchFile",
  { file: Schema.String },
) {
  override get message(): string {
    return [
      `no file at ${this.file}`,
      "  put reads a file's bytes, so the path has to name one that exists",
    ].join("\n")
  }
}

export class NotAKindTag extends Schema.TaggedError<NotAKindTag>()(
  "cli/NotAKindTag",
  { given: Schema.Int },
) {
  override get message(): string {
    return [
      `not a kind tag: ${this.given} — a kind tag is one byte, 0 to 255`,
      "  the named kinds are in library/cas/REGISTRY.md; the default is 1, an opaque value payload",
    ].join("\n")
  }
}

/** The path exists but does not read as one file — a directory, most
 * likely. `put`'s contract is a file's bytes, and the audit's A7 row
 * answered this with the platform's own `BadResource`, which names
 * neither the mistake nor the fix. */
export class NotAFile extends Schema.TaggedError<NotAFile>()(
  "cli/NotAFile",
  { file: Schema.String },
) {
  override get message(): string {
    return [
      `not a file: ${this.file}`,
      "  put reads one file's bytes — a directory has no bytes to read",
      "  name a file inside it instead",
    ].join("\n")
  }
}

/** The addressed content sits on a plane the annotation subject union
 * does not span, so nothing can be said ABOUT it yet. The refusal
 * prints the five planes from the same table the arm switch reads, so
 * the sentence and the union move together. */
export class NotNameable extends Schema.TaggedError<NotNameable>()(
  "cli/NotNameable",
  { address: Schema.String, tag: Schema.Int },
) {
  override get message(): string {
    const planes = nameablePlanes
      .map(([plane, tag]) => `${plane} (${tagHex(tag)})`)
      .join(", ")
    return [
      `nothing can be said about kind ${tagLabel(this.tag)} yet — the annotation plane does not span it`,
      `  a name is an annotation, and an annotation's subject must be one of: ${planes}`,
      `  the address ${this.address} holds kind ${tagLabel(this.tag)}`,
      "  widening the subject union is a Lean ruling (Cas.Schema.AnnotationSubject), not a flag",
    ].join("\n")
  }
}

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
  json: jsonFlag,
  directory: Argument.string("directory").pipe(
    Argument.optional,
    Argument.withDescription("where the store lives (default: the current directory)"),
  ),
}, ({ backend, bare, directory, json }) =>
  Effect.gen(function* () {
    const target = Option.getOrElse(directory, () => ".")
    const location = yield* initStore(target, bare, backend)
    if (json) {
      return yield* Console.log(renderJson({
        backend,
        bare,
        config: location.configPath,
        created: true,
        store: location.store,
      }))
    }
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

/** The label column the store block is laid out in. `doctor` prints a
 * second block beside this one and uses a wider column of its own, so
 * the width is named rather than counted out in spaces. */
const storeColumn = 11

/** What the serve policy says, without its label — so the same
 * sentence can sit in either block's column. */
const serveSummary = (config: Option.Option<StoreConfig>): string => {
  if (Option.isNone(config) || config.value.serve === undefined) {
    return "not configured — `cas init` writes the defaults"
  }
  const serve = config.value.serve
  const reads = serve.anonymousReads ? "anonymous reads" : "credential required"
  return `port ${serve.port} · maxBatchKeys ${serve.maxBatchKeys} · maxNodeBytes ${serve.maxNodeBytes} · maxInFlight ${serve.maxInFlight} · ${reads}`
}

const serveLine = (config: Option.Option<StoreConfig>): string =>
  `${"serve".padEnd(storeColumn)}${serveSummary(config)}`

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

/** The serve policy in the machine register, or absent. `null` and not
 * an empty object: a store with no policy is a different fact from one
 * whose policy is all defaults. */
const serveJson = (config: Option.Option<StoreConfig>): Schema.Json => {
  if (Option.isNone(config) || config.value.serve === undefined) return null
  const serve = config.value.serve
  return {
    anonymousReads: serve.anonymousReads,
    credentialEnv: serve.credentialEnv ?? null,
    maxBatchKeys: serve.maxBatchKeys,
    maxInFlight: serve.maxInFlight,
    maxNodeBytes: serve.maxNodeBytes,
    port: serve.port,
  }
}

/** Read-only by law: every step here loads, counts, or lists. */
const statusProgram = (json: boolean) =>
  Effect.gen(function* () {
    const location = yield* StoreLocation
    const roots = yield* Cas.RootStore
    const config = yield* readConfig(location)
    const backend = backendOf(config)
    const published = yield* roots.list
    // The object count is a walk of the fanout directories, so it is a
    // file-backend answer. A db-backed store holds its objects in a
    // table this verb does not query — and reporting a directory walk's
    // zero for it would be a false statement, not a missing feature.
    const objects = backend === "file" ? yield* countObjects(location) : null
    if (json) {
      return yield* Console.log(renderJson({
        backend,
        // `null` where the prose says "status does not count them":
        // the machine register must not be able to read an uncounted
        // store as an empty one.
        backup: Option.isSome(config) && config.value.backup !== undefined
          ? config.value.backup.target
          : null,
        config: Option.isSome(config) ? location.configPath : null,
        objects,
        origin: location.origin,
        roots: published.length,
        serve: serveJson(config),
        store: location.store,
      }))
    }
    yield* Console.log(
      `store      ${location.store}  (${backendLabel(backend, location.origin)})`,
    )
    yield* Console.log(`config     ${Option.isSome(config) ? location.configPath : "none"}`)
    yield* Console.log(objects === null
      ? `objects    in ${location.store}/cas.db — status does not count them`
      : `objects    ${objects}`)
    yield* Console.log(`roots      ${published.length} published`)
    yield* Console.log(serveLine(config))
    yield* Console.log(backupLine(config, backend))
  })

export const status = Command.make("status", {
  store: storeFlag,
  json: jsonFlag,
}, ({ json, store }) =>
  statusProgram(json).pipe(Effect.provide(layerStoreAt(store)), userFacing)).pipe(
    Command.withDescription(
      "where the data lives and what it holds — read-only: status never alters anything",
    ),
  )

/* ── ls ──────────────────────────────────────────────────────────── */

const lsProgram = (json: boolean) =>
  Effect.gen(function* () {
    const roots = yield* Cas.RootStore
    const loader = yield* Cas.Loader
    const published = yield* roots.list
    if (json) {
      // Every root reported, loaded or not — the listing states what
      // the store answered, and a root that will not load carries its
      // clause under `refused` rather than vanishing from the array.
      const rows = yield* Effect.forEach(published.toSorted(), (id) =>
        Effect.result(loader.load(id)).pipe(Effect.map((loaded) =>
          Result.match(loaded, {
            onSuccess: (node) => ({
              address: id,
              kind: kindJson(node.kind.tag, node.kind.version),
              links: node.refs.length,
              refused: null,
            }),
            onFailure: (error) => ({
              address: id,
              kind: null,
              links: null,
              refused: casErrorMessage(error),
            }),
          })
        )))
      return yield* Console.log(renderJson({ roots: rows }))
    }
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
  json: jsonFlag,
}, ({ json, store }) =>
  lsProgram(json).pipe(Effect.provide(layerStoreAt(store)), userFacing)).pipe(
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
  // `show` keeps the register round-2 ruled for it: not a summary of
  // the prose, but the described canonical node document itself. It is
  // the one verb whose subject IS a document, so the machine register
  // is the content's own spelling rather than a report about it.
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

/** What a tag with no registry row is told out loud (audit E19, ruling
 * ask 4). The store admits every tag at the scheme version, so this is
 * a NOTE and not a refusal: a working tag is legal, and `0x54` and
 * `0x58` are in live use with no row anywhere. It goes to stderr, which
 * is what keeps `--json`'s single object on stdout intact. */
const workingTagNote = (tag: number): string =>
  [
    `note: kind ${tagHex(tag)} has no registry row — a working tag, admitted as it stands`,
    "  the named kinds are in library/cas/REGISTRY.md",
  ].join("\n")

const putProgram = (file: string, kindTag: number, json: boolean) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    // The two argument laws, ruled here rather than in the parser —
    // see THE ARGUMENT REFUSALS above.
    if (!Number.isInteger(kindTag) || kindTag < 0 || kindTag > 0xff) {
      return yield* new NotAKindTag({ given: kindTag })
    }
    if (!(yield* fs.exists(file).pipe(Effect.orElseSucceed(() => false)))) {
      return yield* new NoSuchFile({ file })
    }
    const payload = yield* fs.readFile(file)
    const store = yield* Cas.Store
    // One node, no links: `put` is the store law's own door, so every
    // admission clause it refuses on arrives named.
    const id = yield* store.put(Cas.NodeInput.make({
      kind: { version: Cas.SchemeVersion, tag: kindTag },
      payload,
      refs: [],
    }))
    if (!isRegisteredTag(kindTag)) {
      yield* Console.error(workingTagNote(kindTag))
    }
    if (json) {
      return yield* Console.log(renderJson({
        address: id,
        bytes: payload.length,
        kind: kindJson(kindTag, Cas.SchemeVersion),
      }))
    }
    yield* Console.log(`address    ${id}`)
    yield* Console.log(
      `kind       ${tagLabel(kindTag)}  (scheme ${Cas.SchemeVersion})`,
    )
    yield* Console.log(`payload    ${payload.length} bytes`)
  })

export const put = Command.make("put", {
  store: storeFlag,
  json: jsonFlag,
  kindTag: Flag.integer("kind-tag").pipe(
    Flag.withDefault(defaultKindTag),
    Flag.withDescription(
      "the kind the content takes, as a tag byte, 0 to 255 (default: 1, an opaque value payload)",
    ),
  ),
  file: Argument.string("file").pipe(
    Argument.withDescription("the file whose bytes become the payload"),
  ),
}, ({ file, json, kindTag, store }) =>
  putProgram(file, kindTag, json).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "put a file's bytes in the store as one node — the address is the answer, and equal bytes give it back unchanged",
  ))

/* ── publish ─────────────────────────────────────────────────────── */

const publishProgram = (address: string, json: boolean) =>
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
    if (json) {
      return yield* Console.log(renderJson({
        kind: kindJson(node.kind.tag, node.kind.version),
        published: id,
      }))
    }
    yield* Console.log(`published  ${id}`)
    yield* Console.log(
      `kind       ${tagLabel(node.kind.tag)}  (scheme ${node.kind.version})`,
    )
  })

export const publish = Command.make("publish", {
  store: storeFlag,
  json: jsonFlag,
  address: Argument.string("address").pipe(
    Argument.withDescription("the 64-hex address to publish as a root"),
  ),
}, ({ address, json, store }) =>
  publishProgram(address, json).pipe(
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
  )).pipe(
    // The verb table gets the one line; `serve --help` gets what BS-1
    // landed. Without the short form the whole boot-gate paragraph is
    // repeated inside `cas --help`'s subcommand listing.
    Command.withShortDescription(
      "speak MCP over stdio against this store — reads must be anonymous; see serve --help",
    ),
    Command.withDescription(
    [
      "speak MCP over stdio against this store — the five tools the estate's manifest declares, and no others",
      "",
      "  REFUSED AT BOOT: a store whose config says anonymousReads: false is not served over stdio at all.",
      "  stdio's peer is the process that launched this one, so there is no wire to present a credential on",
      "  and nothing to check it against. Set anonymousReads: true, or serve that store some other way.",
      "  Two more things happen before a byte of protocol: the emitted tool manifest is read and compared to",
      "  the table this host serves, and the host refuses to start if they disagree; and maxNodeBytes is",
      "  clamped under the transport's 16 MiB frame cap, because a payload crosses as hex and an oversized",
      "  request would be lost rather than refused. A 2s heartbeat goes to stderr, so a gap in it is the",
      "  host stalled. Nothing is written to stdout: on stdio the protocol IS stdout, and the logs are logfmt",
      "  on stderr at whatever the runner's own --log-level says.",
    ].join("\n"),
  ),
  )

/* ── doctor ──────────────────────────────────────────────────────── */

/**
 * THE CHECKUP: what this store is, and what the lab it sits in has
 * proved so far.
 *
 * The verb exists because four emitted ledgers had no runtime reader
 * (CLI audit §1, ruling ask 1): agent-readable JSON reachable only
 * through a `mise` or `lake` gate. `doctor` is that reader, and it is
 * also where config validation finally has a home — `readConfig`
 * refuses correctly, but until now only when some other verb happened
 * to open a store.
 *
 * Everything here is READ-ONLY, and everything it prints is a number
 * some emitter already wrote down. It re-derives nothing: a checkup
 * that recomputed the lab's counters would be a second, drifting copy
 * of them, which is the defect this verb was built to close.
 *
 * A store outside a checkout has no ledgers, and that is not a failure
 * — it is a fact, and it is said as one.
 */
/** `doctor`'s label column: wide enough for "obligations", and used by
 * both of its blocks so the two line up as one report. */
const labColumn = 13

/** The store half of the checkup — the same facts `status` states,
 * laid out in this verb's own column. */
const checkupStoreLines = (
  location: Located,
  backend: StoreBackend,
  config: Option.Option<StoreConfig>,
  objects: number | null,
  roots: number,
): ReadonlyArray<string> => {
  const row = (label: string, value: string): string => `${label.padEnd(labColumn)}${value}`
  return [
    row("store", `${location.store}  (${backendLabel(backend, location.origin)})`),
    // "reads" is the finding, not decoration: `readConfig` has already
    // refused the invocation if it does not, so a config named here is
    // a config this build decoded.
    row("config", Option.isSome(config) ? `${location.configPath} — reads` : "none"),
    row("objects", objects === null ? `in ${location.store}/cas.db` : String(objects)),
    row("roots", `${roots} published`),
    row("serve", serveSummary(config)),
  ]
}

/** One ledger's line: what it said when it was read, and what happened
 * to it otherwise. Absent and unreadable stay apart in the human
 * register too — one says an emitter has not run, the other says its
 * output no longer matches, and they call for different repairs. */
const ledgerLine = <A>(
  label: string,
  read: LedgerRead<A>,
  reading: (facts: A) => string,
): string => {
  const column = label.padEnd(labColumn)
  return Match.value(read).pipe(Match.tagsExhaustive({
    absent: (ledger) => `${column}not written yet — no ${ledger.path}`,
    read: (ledger) => `${column}${reading(ledger.facts)}`,
    unreadable: (ledger) => `${column}unreadable: ${ledger.reason} — ${ledger.path}`,
  }))
}

/** A counter that may be absent, said as a number or as a dash. A
 * ledger that did not answer must not read as a zero. */
const said = (value: number | null): string => value === null ? "—" : String(value)

/** One ledger in the machine register, with the same three states the
 * prose keeps apart — so an agent can tell a lab that has not emitted
 * from one whose output no longer decodes, and neither from a real
 * count of zero. */
const ledgerJson = <A>(
  read: LedgerRead<A>,
  project: (facts: A) => Schema.Json,
): Schema.Json =>
  Match.value(read).pipe(Match.tagsExhaustive({
    absent: (ledger): Schema.Json => ({ facts: null, path: ledger.path, state: "absent" }),
    read: (ledger): Schema.Json => ({
      facts: project(ledger.facts),
      path: ledger.path,
      state: "read",
    }),
    unreadable: (ledger): Schema.Json => ({
      facts: null,
      path: ledger.path,
      reason: ledger.reason,
      state: "unreadable",
    }),
  }))

/**
 * What each ledger says, in each register.
 *
 * The four pairs are written out rather than folded into one because
 * the ledgers are four different documents saying four different
 * things: a toolchain pin is not a counter, and pretending otherwise
 * would cost the sentences their meaning. What they DO share is that
 * every number here is one an emitter wrote down.
 */
const toolchainReading = (facts: EnvironmentLedger): string => {
  const pins = facts.distinctPins
  if (pins === undefined) return "no pins recorded"
  const excluded = facts.excludedGates
  return `${pins.length} Lean ${pins.length === 1 ? "pin" : "pins"}: ${pins.join(", ")}${
    excluded === undefined ? "" : ` · ${excluded.length} gates excluded`
  }`
}

const environmentJson = (facts: EnvironmentLedger): Schema.Json => ({
  excludedGates: facts.excludedGates === undefined ? null : [...facts.excludedGates],
  leanExes: facts.leanExes === undefined ? null : facts.leanExes.length,
  pins: facts.distinctPins === undefined ? null : [...facts.distinctPins],
  tasks: facts.tasks === undefined ? null : facts.tasks.length,
})

const lawReading = (facts: LawLedger): string =>
  `${said(stated(facts.counters?.rulings))} rulings — ${
    said(stated(facts.counters?.bound))
  } bound, ${said(stated(facts.counters?.owed))} owed`

const lawJson = (facts: LawLedger): Schema.Json => ({
  bound: stated(facts.counters?.bound),
  owed: stated(facts.counters?.owed),
  rulings: stated(facts.counters?.rulings),
  superseded: stated(facts.counters?.superseded),
})

const obligationReading = (facts: ObligationLedger): string =>
  `${said(stated(facts.counters?.discharged))} discharged, ${
    said(stated(facts.counters?.owed))
  } owed, ${said(stated(facts.counters?.parked))} parked`

const obligationJson = (facts: ObligationLedger): Schema.Json => ({
  discharged: stated(facts.counters?.discharged),
  owed: stated(facts.counters?.owed),
  parked: stated(facts.counters?.parked),
  pinPending: stated(facts.counters?.pinPending),
})

const admissionReading = (facts: AdmissionLedger): string =>
  `${said(stated(facts.counts?.rows))} rows — ${said(stated(facts.counts?.admitted))} admitted, ${
    said(stated(facts.counts?.deferred))
  } deferred, ${said(stated(facts.counts?.rejected))} rejected`

const admissionJson = (facts: AdmissionLedger): Schema.Json => ({
  admitted: stated(facts.counts?.admitted),
  deferred: stated(facts.counts?.deferred),
  rejected: stated(facts.counts?.rejected),
  rows: stated(facts.counts?.rows),
})

const doctorProgram = (json: boolean) =>
  Effect.gen(function* () {
    const location = yield* StoreLocation
    const roots = yield* Cas.RootStore
    // The config is read here EXPLICITLY, not incidentally: a checkup
    // whose whole job is to say whether the store is well has to be the
    // verb that asks. It has already refused if it will not read, which
    // is the answer — `doctor` never reports a store as healthy over a
    // config it could not decode.
    const config = yield* readConfig(location)
    const backend = backendOf(config)
    const published = yield* roots.list
    const objects = backend === "file" ? yield* countObjects(location) : null

    // The lab is looked for from the store first and the working
    // directory second: a store inside a checkout answers from where it
    // lives, and one named from elsewhere still finds the checkout the
    // caller is standing in.
    const fromStore = yield* findLabRoot(location.store)
    const lab = Option.isSome(fromStore)
      ? fromStore
      : yield* findLabRoot(yield* Effect.sync(() => process.cwd()))

    if (Option.isNone(lab)) {
      if (json) {
        return yield* Console.log(renderJson({
          lab: null,
          ledgers: null,
          store: {
            backend,
            config: Option.isSome(config) ? location.configPath : null,
            objects,
            origin: location.origin,
            roots: published.length,
            serve: serveJson(config),
            store: location.store,
          },
        }))
      }
      yield* Effect.forEach(
        checkupStoreLines(location, backend, config, objects, published.length),
        // Named, not point-free: `Effect.forEach` hands the index in as
        // a second argument, and `Console.log` would print it.
        (line) => Console.log(line),
      )
      yield* Console.log("")
      return yield* Console.log(
        `${"lab".padEnd(labColumn)}none — this store is not inside a foldlab checkout, so there are no ledgers to read`,
      )
    }

    const labRoot = lab.value
    const [environment, laws, obligations, admission] = yield* Effect.all([
      readLedger(labRoot, ledgers.environment),
      readLedger(labRoot, ledgers.laws),
      readLedger(labRoot, ledgers.obligations),
      readLedger(labRoot, ledgers.admissionMap),
    ])

    if (json) {
      return yield* Console.log(renderJson({
        lab: labRoot,
        ledgers: {
          admissionMap: ledgerJson(admission, admissionJson),
          environment: ledgerJson(environment, environmentJson),
          laws: ledgerJson(laws, lawJson),
          obligations: ledgerJson(obligations, obligationJson),
        },
        store: {
          backend,
          config: Option.isSome(config) ? location.configPath : null,
          objects,
          origin: location.origin,
          roots: published.length,
          serve: serveJson(config),
          store: location.store,
        },
      }))
    }

    yield* Effect.forEach(
      checkupStoreLines(location, backend, config, objects, published.length),
      // Named, not point-free: `Effect.forEach` hands the index in as a
      // second argument, and `Console.log` would print it.
      (line) => Console.log(line),
    )
    yield* Console.log("")
    yield* Console.log(`${"lab".padEnd(labColumn)}${labRoot}`)
    yield* Console.log(ledgerLine("toolchain", environment, toolchainReading))
    yield* Console.log(ledgerLine("laws", laws, lawReading))
    yield* Console.log(ledgerLine("obligations", obligations, obligationReading))
    yield* Console.log(ledgerLine("admission", admission, admissionReading))
  })

export const doctor = Command.make("doctor", {
  store: storeFlag,
  json: jsonFlag,
}, ({ json, store }) =>
  doctorProgram(json).pipe(Effect.provide(layerStoreAt(store)), userFacing)).pipe(
    Command.withDescription(
      "the checkup — what this store is, whether its config reads, and what the lab's emitted ledgers say; read-only",
    ),
  )

/* ── verify ──────────────────────────────────────────────────────── */

/** The audit's verdict as one line: how many nodes the walk covered,
 * or the refusal's own clause. */
const verdictLine = (
  id: Cas.ContentId,
  walked: ReadonlyArray<Cas.ContentId>,
): string =>
  `${id}  verified  ${walked.length} ${walked.length === 1 ? "node" : "nodes"}`

/** One root's verdict in the machine register. `verified` is the field
 * an agent branches on, and it is a boolean on every row — a refusal
 * carries its clause beside it rather than instead of it. */
const verdictJson = (
  id: Cas.ContentId,
  audited: Result.Result<ReadonlyArray<Cas.ContentId>, Cas.Error>,
): Schema.Json =>
  Result.match(audited, {
    onSuccess: (walked) => ({
      address: id,
      nodes: walked.length,
      refused: null,
      verified: true,
    }),
    onFailure: (error) => ({
      address: id,
      nodes: null,
      refused: casErrorMessage(error),
      verified: false,
    }),
  })

const verifyProgram = (address: Option.Option<string>, json: boolean) =>
  Effect.gen(function* () {
    if (Option.isSome(address)) {
      // A named root is the caller's claim, so its refusal is the
      // command's refusal — the clause is rendered as an error and the
      // exit is non-zero, which is what makes the verb a gate.
      const id = yield* decodeAddress(address.value)
      const walked = yield* Cas.Graph.verify(id)
      return yield* Console.log(json
        ? renderJson({ roots: [verdictJson(id, Result.succeed(walked))] })
        : verdictLine(id, walked))
    }
    const roots = yield* Cas.RootStore
    const published = yield* roots.list
    if (json) {
      const rows = yield* Effect.forEach(published.toSorted(), (id) =>
        Effect.result(Cas.Graph.verify(id)).pipe(
          Effect.map((audited) => verdictJson(id, audited)),
        ))
      return yield* Console.log(renderJson({ roots: rows }))
    }
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
  json: jsonFlag,
  address: Argument.string("address").pipe(
    Argument.optional,
    Argument.withDescription(
      "the root to audit (default: every published root)",
    ),
  ),
}, ({ address, json, store }) =>
  verifyProgram(address, json).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "re-hash and re-decode everything reachable from a root — the whole audit, over an untrusted store",
  ))
