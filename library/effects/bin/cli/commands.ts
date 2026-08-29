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
import { Cause, Config, Console, Effect, Option, Result, Schema } from "effect"
import { Argument, CliError, Command, Flag } from "effect/unstable/cli"
import { Cas } from "../../src/index.ts"
import {
  countObjects,
  initStore,
  InvalidAddress,
  layerStoreAt,
  readConfig,
  StoreLocation,
  type Located,
  type StoreConfig,
} from "./store.ts"
import {
  casErrorMessage,
  renderBindingJson,
  renderPayload,
  tagLabel,
} from "./render.ts"

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

const originLabel = {
  explicit: "file backend",
  discovered: "file backend, discovered",
} satisfies Record<Located["origin"], string>

/* ── init ────────────────────────────────────────────────────────── */

export const init = Command.make("init", {
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
}, ({ bare, directory }) =>
  Effect.gen(function* () {
    const target = Option.getOrElse(directory, () => ".")
    const location = yield* initStore(target, bare)
    yield* Console.log(`initialized store  ${location.store}`)
    yield* Console.log(`config             ${location.configPath}`)
    yield* Console.log("the directory is the store: rsync it, commit it, push it")
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
  return `serve      port ${serve.port} · maxBatchKeys ${serve.maxBatchKeys} · maxNodeBytes ${serve.maxNodeBytes} · ${reads}`
}

const backupLine = (config: Option.Option<StoreConfig>): string =>
  Option.isSome(config) && config.value.backup !== undefined
    ? `backup     ${config.value.backup.target}`
    : "backup     the directory is the store — rsync it, commit it, push it"

/** Read-only by law: every step here loads, counts, or lists. */
const statusProgram = Effect.gen(function* () {
  const location = yield* StoreLocation
  const roots = yield* Cas.RootStore
  const config = yield* readConfig(location)
  const objects = yield* countObjects(location)
  const published = yield* roots.list
  yield* Console.log(`store      ${location.store}  (${originLabel[location.origin]})`)
  yield* Console.log(`config     ${Option.isSome(config) ? location.configPath : "none"}`)
  yield* Console.log(`objects    ${objects}`)
  yield* Console.log(`roots      ${published.length} published`)
  yield* Console.log(serveLine(config))
  yield* Console.log(backupLine(config))
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
    const id = yield* Schema.decodeUnknownEffect(Cas.ContentId)(address).pipe(
      Effect.mapError(() => new InvalidAddress({ input: address })),
    )
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
