/**
 * Plane: surface — entry points.
 *
 * First contact: the opening declaration set, and the registration that lets an
 * agent client speak it.
 *
 * ## Configuration is declared sentences
 *
 * There is no configuration file here in the ordinary sense — no settings a
 * reader has to trust somebody kept current. What this module mints is a set of
 * DECLARED VALUES, each canonical, each named by the SHA-256 of its own bytes,
 * and each written at the name it earned. Four of them are the opening set:
 *
 * - the **store**, the directory the substrate's durable state lives in
 *   (`internal/incarnations.ts`'s declaration, consumed rather than restated);
 * - the **options**, the value the substrate runs under
 *   (`internal/serveroptions.ts`'s declaration, filled at the coordinates the
 *   party named and at the shipped lifecycle command's own start posture);
 * - the **holder**, who the party acts as — attribution, never authority;
 * - the **writ**, what the party grants their agent: the views it may image and
 *   the served tools it may call.
 *
 * A fifth value, the OPENING, names those four by digest and is the one file in
 * the set that carries an ambient name rather than a digest — a root has to be
 * findable, and every reference under it is a digest, which is the addressing
 * discipline this estate holds everywhere else.
 *
 * ## Running it twice is running it once
 *
 * Every value above is a function of the party's own arguments and of committed
 * artifacts, so re-running over the same arguments re-derives the same bytes and
 * writes them at the same names. That is not a courtesy: it is what makes "start
 * the substrate and run this again" a safe instruction, and it is the property
 * the wall executes rather than asserts.
 *
 * ## What a writ here does and does not do
 *
 * The writ is a DECLARATION and not a guard, the same stance the read plane's
 * writ and the substrate writ both take. It says what a party granted; nothing
 * in this slice refuses a call for being outside it, and the report says so in
 * one clause rather than leaving the reader to assume enforcement that does not
 * exist yet.
 *
 * ## The tool names are the artifact's, never this module's
 *
 * The served toolset is read from the committed tool-schema artifact through
 * `surface/mcp.ts`'s own reader. A tool name written here would be a twin of
 * the model's emission with nothing holding the two together, so no tool name
 * is spelled in this file.
 *
 * @module
 */
import { Effect, FileSystem, Path, Schema, Scope } from "effect"

import { decodeJson, type JsonValue } from "@foldlab/core/jcs"

import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { digestOf, Digest } from "../truth/Digest.js"
import { structuralRefusal, type Refusal, type StructuralRefusal } from "../truth/Refusal.js"
import { Holder } from "../kernel/Wire.js"
import {
  store as storeDeclaration,
  type SubstrateStore,
} from "../internal/incarnations.js"
import {
  declaredServerOptions,
  type DeclaredServerOptions,
} from "../internal/serveroptions.js"
import { acquireConnection, transportRefusalFor } from "../internal/transport.js"
import { servedTools } from "./mcp.js"

/* ========================================================================== */
/* 1. The vocabulary — what first contact refuses, and what each refusal teaches */
/* ========================================================================== */

/**
 * The absence one first contact can observe: the substrate an agent would speak
 * to is not answering.
 *
 * It is an ABSENCE and not a structural fault, which is the whole teaching: the
 * declarations are already minted and re-derive byte for byte, so the repair is
 * to bring the substrate up and say the same sentences again. The kind is the
 * spine's own transport absence — no new word enters the vocabulary — and the
 * law, the expectation and the repair are this surface's, because what stays
 * per-adapter is data and not shape.
 */
const substrateAbsent = transportRefusalFor({
  kind: "transport-unavailable",
  law:
    "An agent speaks to a substrate that is already serving; a declaration set names one and never starts it.",
  expected: "a substrate answering at the declared address",
  next: () => [{
    subject: "substrate up",
    note:
      "Start the substrate over the store directory this declaration names, giving it the name it declares and the address of the coordination substrate its incarnation fence and its lanes live on — that fence cannot live on the substrate it is deciding whether to start. Then say these sentences again: the same arguments re-derive the same declarations, byte for byte.",
  }],
})

/** Refuses a holder that is not one; the sort's own law, taught at first contact. */
const malformedHolder = (got: string): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A holder is a named party; every fact a bootstrap declares is attributed to one, and attribution is never authority.",
    path: ["holder"],
    got,
    expected: "a party name of at least one character",
    next: [{
      subject: "plait init",
      note:
        "Name the party this agent acts as. The name travels on every fact the agent lands, so a later reader can say who spoke; it grants nothing, and nothing is checked against it.",
    }],
  })

/** Refuses a tool name the served artifact does not carry. */
const unservedTool = (got: string, served: ReadonlyArray<string>): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A writ grants tools the served artifact declares; the served rows are the enumeration, so a name outside them names nothing.",
    path: ["writ", "tools"],
    got,
    expected: [...served],
    next: [{
      subject: "plait init",
      note:
        "Grant one of the tools this server actually serves, or grant none and receive them all. The served rows are the model's own emission; a name spelled by hand would be a grant over a tool nobody serves.",
    }],
  })

/** Refuses a view that is not a content address. */
const malformedView = (got: string): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A view is named by the digest of the declared fold it images, never by a nickname.",
    path: ["writ", "views"],
    got,
    expected: "a lowercase SHA-256 digest written as 64 hexadecimal characters",
    next: [{
      subject: "plait init",
      note:
        "Name each view by the digest a fold declaration returned. A first contact usually names none: the least writ is lawful, and it grants no view.",
    }],
  })

/** Refuses a port no agent could dial. */
const undialablePort = (got: number): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A declared substrate address is one an agent can dial; the bootstrap declares the address it registers, so the two cannot disagree.",
    path: ["port"],
    got,
    expected: "a port from 1 through 65535",
    next: [{
      subject: "plait init",
      note:
        "Declare the port the substrate will listen on. The registration carries this address to the agent client, so a port nothing can dial would register a server nothing can reach.",
    }],
  })

/** Refuses a registration file that is not one object an agent client can read. */
const malformedRegistration = (got: string): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "An agent-client registration is one JSON object naming servers; a bootstrap adds an entry to it and never overwrites what it cannot read.",
    path: ["registration"],
    got,
    expected: "one JSON object",
    next: [{
      subject: "plait init",
      note:
        "Repair or move the existing registration and say these sentences again. Everything already in it is kept — the bootstrap adds one entry and leaves every other one alone — so the only reason to refuse is that its bytes could not be read at all.",
    }],
  })

/* ========================================================================== */
/* 2. The declarations — the values, and the names they earn                  */
/* ========================================================================== */

/** Who a party acts as, declared as a value so the attribution has a name. */
export interface DeclaredHolder {
  readonly v: 0
  readonly kind: "holder"
  readonly holder: Holder
}

/** Declares one holder. */
export const declaredHolder = (holder: Holder): DeclaredHolder => ({
  v: 0,
  kind: "holder",
  holder,
})

/**
 * What one party grants their agent at the language door, declared.
 *
 * It is a third writ shape beside the read plane's (`planes/Session.ts`, which
 * scopes what a session may image) and the substrate's
 * (`internal/writs.ts`, which records what a connection may do at the
 * substrate), and it is not a twin of either: it fences a third thing, the
 * language door an agent speaks through, and it is the value the door's pinned
 * universe carries as a policy referent. Its `views` are the read plane's own
 * vocabulary so that a view granted here is the same coordinate that seam
 * judges; its `tools` are the served artifact's rows.
 *
 * Both lists are SETS — sorted and duplicate-free — so two parties granting the
 * same things in different orders declare the same bytes and therefore the same
 * writ.
 */
export interface AgentWrit {
  readonly v: 0
  readonly kind: "agent-writ"
  /** Attribution, never authority. */
  readonly holder: Holder
  /** The declared views this agent may image. */
  readonly views: ReadonlyArray<Digest>
  /** The served tools this agent may call, by the artifact's own rows. */
  readonly tools: ReadonlyArray<string>
}

const set = <A extends string>(values: ReadonlyArray<A>): ReadonlyArray<A> =>
  [...new Set(values)].sort()

/** Declares one agent writ over an already-judged holder, view set, and toolset. */
export const agentWrit = (input: {
  readonly holder: Holder
  readonly views: ReadonlyArray<Digest>
  readonly tools: ReadonlyArray<string>
}): AgentWrit => ({
  v: 0,
  kind: "agent-writ",
  holder: input.holder,
  views: set(input.views),
  tools: set(input.tools),
})

/**
 * The opening: the four values a first contact declares, each named by digest.
 *
 * It carries no address, no directory and no command. Those are ambient
 * coordinates that mean nothing to a party on another host; what travels is the
 * digest, and the one place an address is written down is the registration,
 * which is a spawn recipe for another program rather than a plait item.
 */
export interface OpeningDeclaration {
  readonly v: 0
  readonly kind: "plait-opening"
  readonly holder: Digest
  readonly store: Digest
  readonly options: Digest
  readonly writ: Digest
}

/** Declares one opening over the digests of the four values it names. */
export const openingDeclaration = (input: {
  readonly holder: Digest
  readonly store: Digest
  readonly options: Digest
  readonly writ: Digest
}): OpeningDeclaration => ({
  v: 0,
  kind: "plait-opening",
  holder: input.holder,
  store: input.store,
  options: input.options,
  writ: input.writ,
})

/**
 * The posture the shipped lifecycle command starts a substrate under,
 * transcribed so a first contact can declare the value the daemon will run
 * under rather than a value that merely resembles it.
 *
 * **Transcription, not design.** Every row here is what the shipped `up` verb
 * declares when it starts a substrate, and none of it is a ruling this module
 * takes: JetStream on, a bound listener, the substrate's own log unsuppressed
 * because a daemon owns its process and therefore owns its log, the vendor's
 * own signal handlers uninstalled, the two durability rows at their declared
 * settings, and every row of the closed-channel inventory at its closed
 * setting.
 *
 * **The wall is executed, not argued.** The bootstrap gate starts the real
 * lifecycle command and compares the options digest and the store digest it
 * prints against the ones declared here. A row that drifts moves one of those
 * digests and reddens that comparison, which is a cross-language oracle rather
 * than two tables agreeing on inspection.
 */
const DAEMON_START_POSTURE = {
  jetStream: true,
  listen: true,
  noLog: false,
  signals: false,
  syncInterval: "2m0s",
  syncAlways: false,
  httpPort: 0,
  httpsPort: 0,
  profPort: 0,
  websocketPort: 0,
  mqttPort: 0,
  clusterPort: 0,
  gatewayPort: 0,
  leafNodePort: 0,
  leafNodeRemotes: [] as ReadonlyArray<string>,
} as const

/** Declares the server-options value at one party's coordinates. */
export const bootstrapOptions = (coordinates: {
  readonly serverName: string
  readonly storeDir: string
  readonly host: string
  readonly port: number
}): DeclaredServerOptions =>
  declaredServerOptions({
    serverName: coordinates.serverName,
    storeDir: coordinates.storeDir,
    host: coordinates.host,
    port: coordinates.port,
    ...DAEMON_START_POSTURE,
  })

/* ========================================================================== */
/* 3. The registration — the spawn recipe the agent client reads              */
/* ========================================================================== */

/** How this program was invoked, so the registration can name the same program. */
export interface Invocation {
  /** The runtime that is executing this command. */
  readonly command: string
  /** The program that runtime is executing. */
  readonly program: string
}

/** Where the declaration set and the registration are written under a project. */
export const HOME = ".plait"

/** Where each declared value is written, under its own name. */
export const VALUES = "values"

/** The one file in the set that carries an ambient name: the root of the walk. */
export const OPENING = "opening.json"

/** The project-scoped agent-client registration. */
export const REGISTRATION = ".mcp.json"

/** The entry this bootstrap owns inside that registration. */
export const SERVER = "plait"

/**
 * The arguments the registration hands the agent client.
 *
 * The registration names THE PROGRAM THE PARTY JUST RAN. A spawn recipe has to
 * name an executable, so one coordinate in this file is unavoidably a location;
 * making it the invocation's own is what keeps it from being a location this
 * module invented, and it is stable across runs from the same checkout, which
 * is what keeps the registration byte-identical on a second bootstrap.
 *
 * Everything after it is the product's own verb and the digests the opening
 * declared.
 */
export const registrationArguments = (input: {
  readonly invocation: Invocation
  readonly url: string
  readonly holder: Holder
  readonly writ: Digest
}): ReadonlyArray<string> => [
  input.invocation.program,
  "mcp",
  "--nats",
  input.url,
  "--holder",
  input.holder,
  "--writ",
  input.writ,
]

/**
 * Places this bootstrap's entry into a registration, keeping every other entry.
 *
 * A registration is an agent client's, not this estate's: a party may have
 * registered other servers there, and a bootstrap that replaced the file would
 * be taking a decision nobody asked it to take. What it replaces is exactly one
 * entry, under one key, and the rest of the object travels through unchanged.
 */
export const placeRegistration = (
  existing: { readonly [key: string]: JsonValue },
  entry: { readonly command: string; readonly args: ReadonlyArray<string> },
): { readonly [key: string]: JsonValue } => {
  const held = existing["mcpServers"]
  const servers = held !== null && typeof held === "object" && !Array.isArray(held)
    ? held as { readonly [key: string]: JsonValue }
    : {}
  return {
    ...existing,
    mcpServers: {
      ...servers,
      [SERVER]: { command: entry.command, args: [...entry.args] },
    },
  }
}

/* ========================================================================== */
/* 4. The bootstrap — judge, mint, write, report                              */
/* ========================================================================== */

/** What a party asks for when they say the opening sentences. */
export interface BootstrapRequest {
  /** Who the party acts as. */
  readonly holder: string
  /** The project the declaration set and the registration are written into. */
  readonly directory: string
  /** The substrate's store directory, or `null` to place it under the project. */
  readonly store: string | null
  /** The name the substrate runs under. */
  readonly serverName: string
  /** The address the substrate listens on. */
  readonly host: string
  /** The port the substrate listens on, and the port the agent dials. */
  readonly port: number
  /** The declared views granted, by digest. A first contact usually names none. */
  readonly views: ReadonlyArray<string>
  /** The served tools granted; empty grants every row the artifact serves. */
  readonly tools: ReadonlyArray<string>
  /** How this program was invoked, so the registration names the same program. */
  readonly invocation: Invocation
}

/** One opening, minted and written: every value, its name, and where an agent dials. */
export interface Opening {
  readonly holder: Holder
  /** The address the registration hands the agent client. */
  readonly url: string
  readonly holderDigest: Digest
  readonly storeDigest: Digest
  readonly optionsDigest: Digest
  readonly writDigest: Digest
  readonly openingDigest: Digest
  /** The exact bytes written to the registration, named by their own digest. */
  readonly registrationDigest: Digest
  /** The served tools this writ grants, in the writ's own order. */
  readonly tools: ReadonlyArray<string>
  /** What the registration hands the agent client, verbatim. */
  readonly arguments_: ReadonlyArray<string>
}

/**
 * Judges the holder at first contact.
 *
 * The check is the sort's own and is asked rather than restated — a typed
 * caller cannot reach the refusing branch at all — but the TEACHING is this
 * surface's, because a party meeting this estate for the first time is owed a
 * sentence about what a holder is rather than a sentence about a seam they have
 * not read.
 */
const judgeHolder = Effect.fn("init.judgeHolder")(function* (
  holder: string,
): Effect.fn.Return<Holder, Refusal> {
  if (!Schema.is(Holder)(holder)) return yield* malformedHolder(holder)
  return holder
})

/** Judges each granted view as a content address. */
const judgeViews = Effect.fn("init.judgeViews")(function* (
  views: ReadonlyArray<string>,
): Effect.fn.Return<ReadonlyArray<Digest>, Refusal> {
  const judged: Array<Digest> = []
  for (const view of views) {
    if (!Schema.is(Digest)(view)) return yield* malformedView(view)
    judged.push(view)
  }
  return judged
})

/**
 * Judges the granted toolset against the served artifact's own rows.
 *
 * An empty grant is not an empty toolset: a party who names no tool is granting
 * the whole served surface, which is what first contact wants and what makes
 * `plait init --holder <name>` a complete sentence.
 */
const judgeTools = Effect.fn("init.judgeTools")(function* (
  tools: ReadonlyArray<string>,
): Effect.fn.Return<ReadonlyArray<string>, Refusal> {
  const served = servedTools().map((row) => row.name)
  if (tools.length === 0) return served
  for (const tool of tools) {
    if (!served.includes(tool)) return yield* unservedTool(tool, served)
  }
  return tools
})

/** Reads the registration already in place, or the empty object when there is none. */
const readRegistration = Effect.fn("init.readRegistration")(function* (
  path: string,
): Effect.fn.Return<
  { readonly [key: string]: JsonValue },
  Refusal,
  FileSystem.FileSystem
> {
  const fs = yield* FileSystem.FileSystem
  if (!(yield* fs.exists(path).pipe(Effect.orDie))) return {}
  const bytes = yield* fs.readFile(path).pipe(Effect.orDie)
  const decoded = decodeJson(bytes)
  if (!decoded.ok) return yield* malformedRegistration(decoded.refusal.reason)
  const value = decoded.value
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return yield* malformedRegistration(typeof value)
  }
  return value as { readonly [key: string]: JsonValue }
})

/**
 * Writes one declared value at the name its own bytes earned.
 *
 * The file name IS the digest, so idempotence is a construction rather than a
 * comparison: writing the same value twice writes the same bytes at the same
 * name, and a value whose bytes moved would be written at a name nothing else
 * refers to.
 */
const writeValue = Effect.fn("init.writeValue")(function* (
  directory: string,
  value: WireValue,
): Effect.fn.Return<Digest, Refusal, FileSystem.FileSystem | Path.Path> {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const digest = yield* digestOf(value)
  const bytes = yield* canonicalBytes(value)
  yield* fs.writeFile(path.join(directory, `${digest}.json`), bytes).pipe(Effect.orDie)
  return digest
})

/**
 * Says the opening sentences: judge what the party asked for, mint the four
 * declarations and the opening that names them, write them at their own names,
 * and place the registration.
 *
 * Nothing here reaches a substrate. A declaration is a sentence about what a
 * party declares, and a sentence does not need a server to be true — which is
 * why the whole set is minted and written before anything is probed, and why
 * the repair for an absent substrate is to bring one up and say the same
 * sentences again.
 *
 * A filesystem that will not carry the write is a DEFECT and dies as one. The
 * estate's domain language is refusals about meaning; an unwritable directory
 * is not a sentence in it, and dressing one as a refusal would teach a repair
 * this estate cannot perform.
 */
export const bootstrap = Effect.fn("init.bootstrap")(function* (
  request: BootstrapRequest,
): Effect.fn.Return<Opening, Refusal, FileSystem.FileSystem | Path.Path> {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  if (!Number.isSafeInteger(request.port) || request.port < 1 || request.port > 65535) {
    return yield* undialablePort(request.port)
  }
  const holder = yield* judgeHolder(request.holder)
  const views = yield* judgeViews(request.views)
  const tools = yield* judgeTools(request.tools)

  const project = path.resolve(request.directory)
  const home = path.join(project, HOME)
  const values = path.join(home, VALUES)
  const storeDir = request.store === null
    ? path.join(home, "store")
    : path.resolve(request.store)

  const store: SubstrateStore = storeDeclaration(storeDir)
  const options = bootstrapOptions({
    serverName: request.serverName,
    storeDir,
    host: request.host,
    port: request.port,
  })
  const writ = agentWrit({ holder, views, tools })
  const holderValue = declaredHolder(holder)

  yield* fs.makeDirectory(values, { recursive: true }).pipe(Effect.orDie)
  const holderDigest = yield* writeValue(values, holderValue as unknown as WireValue)
  const storeDigest = yield* writeValue(values, store as unknown as WireValue)
  const optionsDigest = yield* writeValue(values, options as unknown as WireValue)
  const writDigest = yield* writeValue(values, writ as unknown as WireValue)

  const opening = openingDeclaration({
    holder: holderDigest,
    store: storeDigest,
    options: optionsDigest,
    writ: writDigest,
  })
  const openingDigest = yield* digestOf(opening as unknown as WireValue)
  yield* fs.writeFile(
    path.join(home, OPENING),
    yield* canonicalBytes(opening as unknown as WireValue),
  ).pipe(Effect.orDie)

  const url = `nats://${request.host}:${request.port}`
  const arguments_ = registrationArguments({
    invocation: request.invocation,
    url,
    holder,
    writ: writDigest,
  })
  const registrationPath = path.join(project, REGISTRATION)
  const placed = placeRegistration(yield* readRegistration(registrationPath), {
    command: request.invocation.command,
    args: arguments_,
  })
  // The registration travels through the one canonicalizer like every other
  // value this bootstrap writes, which is what makes a second bootstrap over
  // the same arguments write the same bytes rather than the same meaning.
  const registrationBytes = yield* canonicalBytes(placed as WireValue)
  yield* fs.writeFile(registrationPath, registrationBytes).pipe(Effect.orDie)

  return {
    holder,
    url,
    holderDigest,
    storeDigest,
    optionsDigest,
    writDigest,
    openingDigest,
    registrationDigest: yield* digestOf(placed as WireValue),
    tools: writ.tools,
    arguments_,
  }
})

/**
 * Asks whether a substrate is answering where the registration says it is.
 *
 * The connection is the spine's own — one acquire site, one declared writ, one
 * scope that closes it — and it is opened for exactly one reason: to learn
 * whether an agent handed this registration would reach anything. Nothing is
 * published, nothing is subscribed to, and the writ this layer holds says so:
 * it is the LEAST writ, declared and empty rather than absent.
 *
 * The layer name is written here as a literal on purpose. The wall that keeps
 * every acquire site under a declared writ reads the source bytes and matches a
 * quoted second argument, so a name reached through a constant would be a site
 * that fence never sees.
 */
export const probeSubstrate = (
  url: string,
): Effect.Effect<void, Refusal, Scope.Scope> =>
  Effect.asVoid(acquireConnection(
    { servers: url },
    "foldlab-plait-bootstrap",
    "init.substrate",
    substrateAbsent,
  ))

/**
 * The standing state, in one line.
 *
 * Digests name every value it cites; the one coordinate that is not a digest is
 * the party's own holder, which is the point of the line. The closing clause is
 * the honest one and is not decoration: the writ is declared and nothing yet
 * refuses a call for being outside it.
 */
export const standingLine = (opening: Opening): string =>
  `STANDING: holder=${opening.holder} writ=${opening.writDigest}`
  + ` store=${opening.storeDigest} options=${opening.optionsDigest}`
  + ` opening=${opening.openingDigest} registration=${opening.registrationDigest}`
  + ` tools=${opening.tools.length}`
  + " — your agent can now speak, under a writ that is declared and not yet a guard:"
  + " nothing refuses a call for being outside it."

