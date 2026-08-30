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
import { canonicalJson } from "../../src/cas/Value.ts"
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

/* ── put --program ───────────────────────────────────────────────── */

/**
 * A PROGRAM DOCUMENT as store content.
 *
 * The everyday register gains one word here, and it gains it the way
 * the vocabulary law says words are gained: consumer-gated. `step` and
 * `cont` sat in the protocol register with the note "abstracted by
 * 'program', when a run verb lands". The run verb lands below, so the
 * word is now the store's and the two tags stay invisible — this verb
 * says "program", never "cont", and `run` answers a history, never a
 * word.
 *
 * The input is a lift document: the recognizer's own answer about a
 * program, the same canonical JSON `lake exe emitprograms` writes
 * beside the generated modules. It is READ, never trusted — the table
 * it denotes is laid into the store through the store's own admission
 * door, children-first, and the address that comes back is computed by
 * this host's digest and nobody's claim.
 *
 * The document carries no word and cannot: a document that brought one
 * would be a hoover-side artifact claiming an execute-side result, and
 * the decoder refuses it. Words come from running.
 */
const putProgramDocument = (file: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const document = yield* decodeLiftDocument(yield* fs.readFileString(file))
    const store = yield* Cas.Store
    const stored = yield* Cas.Programs.putProgram(store, document.program)
    yield* Console.log([
      `address    ${stored.address}`,
      // "kind program", not "kind 0x0f": the tag is protocol register
      // and this verb speaks the everyday one.
      `kind       program  (scheme ${Cas.SchemeVersion})`,
      `program    ${document.name}`,
      `lines      ${stored.steps.length} ${stored.steps.length === 1 ? "step" : "steps"}`,
    ].join("\n"))
  })

/** The lift document, in the shape the emitter writes it.
 *
 * Only the fields this verb reads are decoded, and the `kind` literal
 * is one of them: a refusal document is not a program, and a document
 * of another kind must die at the door rather than be coaxed into one.
 */
const LiftDocument = Schema.Struct({
  instructions: Schema.Array(Schema.Struct({
    payloadHex: Schema.Uint8ArrayFromHex,
    refs: Schema.Array(Schema.Struct({
      expectedTag: Cas.Byte,
      source: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    })),
    tag: Cas.Byte,
    version: Cas.Byte,
  })),
  kind: Schema.Literal("lifted"),
  name: Schema.String,
})

/** A file that is not a program document. The CLI's own clause, so a
 * wrong file reads as guidance rather than as a schema issue. */
class NotAProgramDocument extends Schema.TaggedError<NotAProgramDocument>()(
  "cli/NotAProgramDocument",
  { detail: Schema.String },
) {
  override get message(): string {
    return [
      "that file is not a program document",
      `  ${this.detail}`,
      "  a program document is the lift document the recognizer answers —",
      "  see library/effects/test/generated/VectorProgramLifts.json",
    ].join("\n")
  }
}

const decodeLiftDocument = (text: string) =>
  // One door: the Schema JSON codec parses and validates in one step,
  // so nothing here reaches for `JSON.parse` and there is no
  // intermediate `unknown` to be careless with.
  Schema.decodeUnknownEffect(Schema.fromJsonString(LiftDocument))(text).pipe(
    Effect.mapError(() =>
      new NotAProgramDocument({
        detail: "it is not a JSON document carrying a lifted program's instructions",
      })
    ),
    Effect.map((document) => ({
      name: document.name,
      program: document.instructions.map((instruction): Cas.Programs.Line => ({
        _tag: "put",
        version: instruction.version,
        tag: instruction.tag,
        payload: instruction.payloadHex,
        refs: instruction.refs.map((ref) => ({
          expectedTag: ref.expectedTag,
          source: Cas.Programs.answer(ref.source),
        })),
      })) satisfies Cas.Programs.Program,
    })),
  )

export const put = Command.make("put", {
  store: storeFlag,
  kindTag: Flag.integer("kind-tag").pipe(
    Flag.withSchema(Cas.Byte),
    Flag.withDefault(defaultKindTag),
    Flag.withDescription(
      "the kind the content takes, as a tag byte (default: 1, an opaque value payload)",
    ),
  ),
  // Not a second verb. `put` already means "put this file in the
  // store", and `--kind-tag` already means "as this kind"; a program
  // is a kind whose content is a subgraph rather than one node, so it
  // is one more thing the same verb can be told about the same file.
  // A hyphenated `put-program` would spell a second verb for one act.
  program: Flag.boolean("program").pipe(
    Flag.withDefault(false),
    Flag.withDescription(
      "the file is a program document; its table is put and the address is the program's",
    ),
  ),
  file: Argument.file("file", { mustExist: true }).pipe(
    Argument.withDescription("the file whose bytes become the payload"),
  ),
}, ({ file, kindTag, program, store }) =>
  (program ? putProgramDocument(file) : putProgram(file, kindTag)).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "put a file's bytes in the store as one node — the address is the answer, and equal bytes give it back unchanged; --program puts a program document's whole table instead",
  ))

/* ── run ─────────────────────────────────────────────────────────── */

/**
 * RUN THE PROGRAM AT AN ADDRESS — the verb that makes a stored program
 * a citizen rather than a document someone happens to hold.
 *
 * Every arrow goes through a library door: load the cont node, recover
 * the table from the step nodes it names, run it against this same
 * store. Nothing is inlined, nothing is replayed, and the history that
 * comes back is minted by the run and by nothing else — the direction
 * law, spelled as a verb.
 *
 * The human line says "history"; `--json` says `word`. That is
 * collision 5 in the vocabulary, resolved the way it was ruled.
 */
const runStoredProgram = (address: string, json: boolean) =>
  Effect.gen(function* () {
    const id = yield* decodeAddress(address)
    const store = yield* Cas.Store
    const program = yield* Cas.Programs.loadProgram(store, id)
    const outcome = yield* Cas.Programs.runProgram(store, program)
    yield* Console.log(json
      // `word` is the model's name and it stays the name in --json,
      // because word equality is the conformance gate. The bytes go
      // through the ratified canonical printer, like every other
      // --json surface in this package.
      ? canonicalJson({
        program: id,
        lines: program.length,
        word: outcome.word.map((admitted) => ({ address: admitted })),
      })
      : [
        `program    ${id}`,
        `lines      ${program.length} ${program.length === 1 ? "step" : "steps"}`,
        `history    ${outcome.word.length} admitted`,
        ...outcome.word.map((admitted, position) => `  ${position}  ${admitted}`),
      ].join("\n"))
  })

export const run = Command.make("run", {
  store: storeFlag,
  json: Flag.boolean("json").pipe(
    Flag.withDefault(false),
    Flag.withDescription("render the run's word as one JSON document"),
  ),
  address: Argument.string("address").pipe(
    Argument.withDescription("the 64-hex address of the program to run"),
  ),
}, ({ address, json, store }) =>
  runStoredProgram(address, json).pipe(
    Effect.provide(layerStoreAt(store)),
    userFacing,
  )).pipe(Command.withDescription(
    "run the program stored at an address — its table is recovered from the store and run against it, and the answer is the history it admitted",
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
