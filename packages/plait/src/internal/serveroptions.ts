/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import type { Effect } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"

/**
 * The substrate's server options, as declared data, and the inventory of
 * channels a declared value may not open.
 *
 * Only Go can hold an embedded server, so the daemon is where these options
 * become a running process. That is carriage. What the options MEAN — which
 * rows exist, at which sorts, spelled how, closed at what setting, and what a
 * party who wanted a closed channel is taught — is estate vocabulary, and
 * estate vocabulary does not live in one language. Both tables below are
 * declared here and transcribed there, and a byte comparison across the
 * boundary is what makes the two one table read twice rather than two tables
 * maintained in parallel.
 *
 * **Transcription, not design.** Every key is the pinned vendor's own: its
 * configuration word where it has one, and otherwise its own field name in the
 * snake spelling its configuration uses. The `named` column records which of
 * the two a row is, so a reader resolves a key back to the vendor rather than
 * to a convention. `declaration` is the vendor's own identifier verbatim, and
 * `site` is where that identifier is declared in the pinned source — a row
 * resolves to one declaration at one version rather than to a table somebody
 * maintains.
 *
 * **The values are transcribed, not ruled.** Several rows carry settings that
 * are priced decisions belonging to the operator — the sync mode, the log
 * suppression, the server name, the monitoring HTTP port. What is recorded is
 * what is MEASURED at those rows; a value moved here would be a ruling taken by
 * a transcription, which is the failure the declared value exists to prevent.
 *
 * Staged debt, the same shape the substrate roster and the status vocabulary
 * carry: both tables are hand-carried transcription owing the corpus's
 * substrate-vocabulary emitter group, which the emitter does not yet mint. They
 * are transcription with provenance until that group exists, never a twin of
 * one.
 */

/** The sort one declared option's value carries. */
export type ServerOptionSort = "string" | "number" | "boolean" | "string-list"

/** Which of the vendor's two spellings a row's key is. */
export type ServerOptionNaming =
  /** The vendor's own configuration or wire spelling, carried verbatim. */
  | "config"
  /**
   * The vendor's configuration has no word for this option, so the key is the
   * vendor's own field name in the snake spelling its configuration uses
   * everywhere else. No estate word enters either way.
   */
  | "field"

/** One transcribed row of the option table. */
export interface ServerOptionRow {
  /**
   * The key the declared value carries this option under, as a path through
   * the value's own nesting. The nesting is the vendor's: a row inside one of
   * the vendor's configuration blocks is spelled inside it here.
   */
  readonly name: string
  readonly sort: ServerOptionSort
  readonly named: ServerOptionNaming
  /** The vendor's own identifier for this option, verbatim. */
  readonly declaration: string
  /** Where that identifier is declared in the pinned vendor source. */
  readonly site: string
}

/**
 * The pin both tables were transcribed at, carried as data.
 *
 * A version is a pin and not a location: a reader checks the tables against the
 * declarations the named module version ships, which is what the parity wall's
 * oracle arm does against the module the daemon actually links.
 */
export const SERVER_OPTION_PIN = {
  module: "github.com/nats-io/nats-server/v2",
  version: "v2.14.4",
} as const

/**
 * Every server option the daemon depends on, transcribed whole.
 *
 * The roster is ADD-ONLY in the same sense the session field roster is: the
 * declared value's key set is this list, so a row renamed, retyped, or removed
 * renames every options value the estate ever declared and every incarnation
 * that cited one. A row joins by appending, with its provenance.
 *
 * The last eight rows are the closed inventory's own options. They are in the
 * table because the daemon depends on them — it depends on them being at their
 * closed setting, and a dependency nobody declared is the one the admission
 * door cannot check.
 */
export const SERVER_OPTIONS = [
  {
    name: "server_name",
    sort: "string",
    named: "config",
    declaration: "server.Options.ServerName",
    site: "server/opts.go:399",
  },
  {
    name: "store_dir",
    sort: "string",
    named: "config",
    declaration: "server.Options.StoreDir",
    site: "server/opts.go:468",
  },
  {
    name: "addr",
    sort: "string",
    named: "config",
    declaration: "server.Options.Host",
    site: "server/opts.go:400",
  },
  {
    name: "port",
    sort: "number",
    named: "config",
    declaration: "server.Options.Port",
    site: "server/opts.go:401",
  },
  {
    name: "dont_listen",
    sort: "boolean",
    named: "config",
    declaration: "server.Options.DontListen",
    site: "server/opts.go:402",
  },
  {
    name: "jetstream",
    sort: "boolean",
    named: "config",
    declaration: "server.Options.JetStream",
    site: "server/opts.go:447",
  },
  {
    name: "no_log",
    sort: "boolean",
    named: "field",
    declaration: "server.Options.NoLog",
    site: "server/opts.go:410",
  },
  {
    name: "no_sigs",
    sort: "boolean",
    named: "field",
    declaration: "server.Options.NoSigs",
    site: "server/opts.go:411",
  },
  {
    name: "sync_interval",
    sort: "string",
    named: "config",
    declaration: "server.Options.SyncInterval",
    site: "server/opts.go:469",
  },
  {
    name: "sync_always",
    sort: "boolean",
    named: "field",
    declaration: "server.Options.SyncAlways",
    site: "server/opts.go:470",
  },
  {
    name: "http_port",
    sort: "number",
    named: "config",
    declaration: "server.Options.HTTPPort",
    site: "server/opts.go:436",
  },
  {
    name: "https_port",
    sort: "number",
    named: "config",
    declaration: "server.Options.HTTPSPort",
    site: "server/opts.go:438",
  },
  {
    name: "prof_port",
    sort: "number",
    named: "config",
    declaration: "server.Options.ProfPort",
    site: "server/opts.go:474",
  },
  {
    name: "websocket.port",
    sort: "number",
    named: "config",
    declaration: "server.Options.Websocket.Port",
    site: "server/opts.go:598",
  },
  {
    name: "mqtt.port",
    sort: "number",
    named: "config",
    declaration: "server.Options.MQTT.Port",
    site: "server/opts.go:693",
  },
  {
    name: "cluster.port",
    sort: "number",
    named: "config",
    declaration: "server.Options.Cluster.Port",
    site: "server/opts.go:68",
  },
  {
    name: "gateway.port",
    sort: "number",
    named: "config",
    declaration: "server.Options.Gateway.Port",
    site: "server/opts.go:146",
  },
  {
    name: "leafnodes.port",
    sort: "number",
    named: "config",
    declaration: "server.Options.LeafNode.Port",
    site: "server/opts.go:185",
  },
  {
    name: "leafnodes.remotes",
    sort: "string-list",
    named: "config",
    declaration: "server.Options.LeafNode.Remotes",
    site: "server/opts.go:219",
  },
] as const satisfies ReadonlyArray<ServerOptionRow>

/** One declared option table, named by its own bytes. */
export interface ServerOptionTable {
  readonly v: 0
  readonly kind: "substrate-server-option-table"
  readonly pin: { readonly module: string; readonly version: string }
  readonly options: ReadonlyArray<ServerOptionRow>
}

/**
 * Declares one option table as a value, so the table has a name of its own and
 * two languages are held to one table by comparing bytes.
 */
export const serverOptionTable = (
  pin: { readonly module: string; readonly version: string },
  rows: ReadonlyArray<ServerOptionRow>,
): ServerOptionTable => ({
  v: 0,
  kind: "substrate-server-option-table",
  pin: { module: pin.module, version: pin.version },
  options: rows.map((row) => ({
    name: row.name,
    sort: row.sort,
    named: row.named,
    declaration: row.declaration,
    site: row.site,
  })),
})

/** The declared option table this package stands on. */
export const SERVER_OPTION_TABLE: ServerOptionTable = serverOptionTable(
  SERVER_OPTION_PIN,
  SERVER_OPTIONS,
)

/** One option table's name: the digest of its declared bytes. */
export const serverOptionTableDigest = (
  table: ServerOptionTable,
): Effect.Effect<Digest, Refusal> => digestOf(table as unknown as WireValue)

/**
 * The law the admission door defends.
 *
 * One law over an inventory of rows rather than one law per row, because what
 * is being kept is a single property: the estate's substrate admits connections
 * at the doors the estate declared and at no others.
 */
export const CLOSED_CHANNEL_LAW =
  "A declared server-options value opens no admission channel outside the estate's declared inventory; a closed channel is closed by declaration, never by accident."

/**
 * One row of the closed-channel inventory.
 *
 * Each row refuses on its own. The row carries the option it reads, the setting
 * at which that option is CLOSED, and the repair a party who wanted the channel
 * is taught — all as data, because a refusal assembled from a switch statement
 * cannot be compared across a language boundary, and a repair written at a call
 * site cannot be read by anybody who has not gone looking for it.
 */
export interface ClosedChannelRow {
  /** The channel's own name. */
  readonly row: string
  /** The declared option this row reads, by the option table's own key. */
  readonly option: string
  /** The vendor's own identifier for that option, verbatim. */
  readonly declaration: string
  /** Where that identifier is declared in the pinned vendor source. */
  readonly site: string
  /**
   * The setting at which this channel is closed, declared rather than
   * inferred: absence is not closure, and a row whose closed setting were
   * implicit would be a row nobody declared.
   */
  readonly closed: number | ReadonlyArray<string>
  /** The surface the repair is performed at. */
  readonly subject: string
  /**
   * What a party who wanted this channel is taught. It names the inventory,
   * states that the row is closed by declaration rather than by accident, and
   * names the act that would open it.
   */
  readonly repair: string
}

/**
 * The estate's closed-channel inventory.
 *
 * Eight rows, each refusing on its own. Four are the operator-named channels
 * and four are the remaining admission surfaces the pinned vendor can open from
 * its own options struct; every one of them is a door into the estate's
 * substrate that the estate has not declared, and the door refuses a declared
 * value that opens any of them BEFORE a server is constructed — which is what
 * makes the refusal a refusal rather than a shutdown.
 *
 * The inventory is not a blanket no. The estate's own declared value passes it
 * unchanged, which is the other half of every probe the wall runs: a refusal
 * that refused everything would prove nothing about what it refuses.
 */
export const CLOSED_CHANNELS = [
  {
    row: "websocket",
    option: "websocket.port",
    declaration: "server.Options.Websocket.Port",
    site: "server/opts.go:598",
    closed: 0,
    subject: "substrate.options.websocket",
    repair:
      "The WebSocket listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting, and the inventory is where the estate says so out loud. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface — a door with its own upgrade handshake, its own cookie and token handling, and its own account posture, none of which anybody has ruled. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "mqtt",
    option: "mqtt.port",
    declaration: "server.Options.MQTT.Port",
    site: "server/opts.go:693",
    closed: 0,
    subject: "substrate.options.mqtt",
    repair:
      "The MQTT listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface — and this one also brings a second protocol whose topics are translated into the estate's subjects, so what a connection may reach stops being a question the estate's own permission projection answers. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "cluster",
    option: "cluster.port",
    declaration: "server.Options.Cluster.Port",
    site: "server/opts.go:68",
    closed: 0,
    subject: "substrate.options.cluster",
    repair:
      "The cluster route listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a route is a new authentication surface that admits another SERVER rather than a client — a peer that carries every subject and shares the estate's data plane, which is a durability and consensus posture nobody has ruled. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "gateway",
    option: "gateway.port",
    declaration: "server.Options.Gateway.Port",
    site: "server/opts.go:146",
    closed: 0,
    subject: "substrate.options.gateway",
    repair:
      "The gateway listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a gateway is a new authentication surface admitting an entire other cluster, and traffic crossing it is governed by an authority outside this estate. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "leafnode-listener",
    option: "leafnodes.port",
    declaration: "server.Options.LeafNode.Port",
    site: "server/opts.go:185",
    closed: 0,
    subject: "substrate.options.leafnodes",
    repair:
      "The leafnode listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface, and a leafnode binds a remote server into an account of this estate's own — the subjects it may import and export are an account posture, not a port number. The daemon is deliberately shaped so this row remains openable; opening it is still a ruling. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "leafnode-remotes",
    option: "leafnodes.remotes",
    declaration: "server.Options.LeafNode.Remotes",
    site: "server/opts.go:219",
    closed: [],
    subject: "substrate.options.leafnodes",
    repair:
      "The leafnode remotes are a row of the estate's closed-channel inventory, and they are closed by declaration rather than by accident: the declared server-options value carries this list empty. Opening it is an operator ruling and nothing less. This row admits in the other direction — the substrate dials OUT and binds itself into another authority's namespace — so it is a new authentication surface in the sense that matters most: a credential this estate presents elsewhere, and a set of subjects that then cross both ways. Bring the ruling and this inventory row moves with it; until one exists, declare the list empty and the substrate starts.",
  },
  {
    row: "https-monitoring",
    option: "https_port",
    declaration: "server.Options.HTTPSPort",
    site: "server/opts.go:438",
    closed: 0,
    subject: "substrate.options.monitoring",
    repair:
      "The HTTPS monitoring listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a monitoring listener is a new authentication surface that serves the substrate's own state — who is connected, what streams exist, what the server is doing — over a socket whose credential posture nobody has ruled. The daemon needs no such socket: its health and registration reads are in-process, and what they observe lands as facts. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
  {
    row: "profiling",
    option: "prof_port",
    declaration: "server.Options.ProfPort",
    site: "server/opts.go:474",
    closed: 0,
    subject: "substrate.options.profiling",
    repair:
      "The profiling listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a profiling listener is a new authentication surface with no authentication at all — it serves the process's own memory, goroutines, and stacks to anybody who reaches the port. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
  },
] as const satisfies ReadonlyArray<ClosedChannelRow>

/** One declared closed-channel inventory, named by its own bytes. */
export interface ClosedChannelInventory {
  readonly v: 0
  readonly kind: "substrate-closed-channels"
  readonly law: string
  readonly channels: ReadonlyArray<ClosedChannelRow>
}

/**
 * Declares one closed-channel inventory as a value.
 *
 * The law rides the value rather than each row, because the rows share it: what
 * differs per row is which channel is closed and what a party who wanted it is
 * taught.
 */
export const closedChannelInventory = (
  law: string,
  channels: ReadonlyArray<ClosedChannelRow>,
): ClosedChannelInventory => ({
  v: 0,
  kind: "substrate-closed-channels",
  law,
  channels: channels.map((channel) => ({
    row: channel.row,
    option: channel.option,
    declaration: channel.declaration,
    site: channel.site,
    closed: Array.isArray(channel.closed) ? [...channel.closed] : channel.closed,
    subject: channel.subject,
    repair: channel.repair,
  })),
})

/** The declared inventory this package stands on. */
export const CLOSED_CHANNEL_INVENTORY: ClosedChannelInventory = closedChannelInventory(
  CLOSED_CHANNEL_LAW,
  CLOSED_CHANNELS,
)

/** One inventory's name: the digest of its declared bytes. */
export const closedChannelInventoryDigest = (
  inventory: ClosedChannelInventory,
): Effect.Effect<Digest, Refusal> => digestOf(inventory as unknown as WireValue)

/**
 * What a party declares when it declares the substrate's server options.
 *
 * Two rows are named the positive way round — the listen switch and the signal
 * switch — so that the value a caller writes reads as what the substrate DOES
 * rather than as what it refrains from. The declared value carries the vendor's
 * own keys at the vendor's own polarity; the inversion lives in this input and
 * never in the bytes.
 *
 * The sync interval is taken as the vendor's OWN rendering of the duration
 * rather than as a number of milliseconds. The bound is stated where it bites:
 * the rendering is the daemon's language's, so this side carries the rendered
 * string and does not derive it, and a parity comparison over this field
 * compares what both sides declared rather than two independent renderings.
 */
export interface DeclaredServerOptionsInput {
  readonly serverName: string
  readonly storeDir: string
  readonly host: string
  readonly port: number
  readonly jetStream: boolean
  /** Whether the substrate binds a client socket at all. */
  readonly listen: boolean
  readonly noLog: boolean
  /** Whether the substrate installs the vendor's own signal handlers. */
  readonly signals: boolean
  /** The vendor's own rendering of the flush interval. */
  readonly syncInterval: string
  readonly syncAlways: boolean
  readonly httpPort: number
  readonly httpsPort: number
  readonly profPort: number
  readonly websocketPort: number
  readonly mqttPort: number
  readonly clusterPort: number
  readonly gatewayPort: number
  readonly leafNodePort: number
  readonly leafNodeRemotes: ReadonlyArray<string>
}

/** One declared server-options value, named by its own bytes. */
export interface DeclaredServerOptions {
  readonly v: 0
  readonly kind: "substrate-server-options"
  readonly options: {
    readonly [option: string]: WireValue
  }
}

/**
 * Declares one server-options value.
 *
 * The nesting is the VENDOR's. A row the vendor declares inside a configuration
 * block is declared inside that block here, spelled with that block's own word,
 * so the option table's key for it is a path through the vendor's own structure
 * rather than a name the estate flattened and rejoined.
 */
export const declaredServerOptions = (
  input: DeclaredServerOptionsInput,
): DeclaredServerOptions => ({
  v: 0,
  kind: "substrate-server-options",
  options: {
    server_name: input.serverName,
    store_dir: input.storeDir,
    addr: input.host,
    port: input.port,
    jetstream: input.jetStream,
    dont_listen: !input.listen,
    no_log: input.noLog,
    no_sigs: !input.signals,
    sync_interval: input.syncInterval,
    sync_always: input.syncAlways,
    http_port: input.httpPort,
    https_port: input.httpsPort,
    prof_port: input.profPort,
    websocket: { port: input.websocketPort },
    mqtt: { port: input.mqttPort },
    cluster: { port: input.clusterPort },
    gateway: { port: input.gatewayPort },
    leafnodes: { port: input.leafNodePort, remotes: [...input.leafNodeRemotes] },
  },
})

/** One declared server-options value's name. */
export const declaredServerOptionsDigest = (
  declared: DeclaredServerOptions,
): Effect.Effect<Digest, Refusal> => digestOf(declared as unknown as WireValue)

/**
 * Reads one option out of a declared value by the path the table names it
 * under, or `undefined` when the value carries no such option.
 */
export const optionAt = (
  declared: DeclaredServerOptions,
  path: string,
): WireValue | undefined => {
  let cursor: unknown = declared.options
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) return undefined
    const record = cursor as { readonly [key: string]: unknown }
    if (!Object.hasOwn(record, segment)) return undefined
    cursor = record[segment]
  }
  return cursor as WireValue
}

/**
 * Every inventory row one declared value ENABLES.
 *
 * The reading is a walk over the inventory, not a chain of branches: a row is
 * enabled when the value at the option it reads is not the setting the row
 * declares closed. Comparison is over the declared settings rendered as JSON
 * text, so a row whose closed setting is a list is compared the same way as one
 * whose closed setting is a number, and no row needs a special case.
 *
 * This side READS; the daemon REFUSES. The refusal belongs where the server is
 * constructed, because refusing after construction would be a shutdown wearing
 * a refusal's name. What this function is for is every other party — a
 * configuration surface, a review, a test — that wants to know what a declared
 * value would be refused for before handing it over.
 */
export const enabledClosedChannels = (
  declared: DeclaredServerOptions,
  inventory: ReadonlyArray<ClosedChannelRow> = CLOSED_CHANNELS,
): ReadonlyArray<ClosedChannelRow> =>
  inventory.filter((channel) => {
    const current = optionAt(declared, channel.option)
    if (current === undefined) return true
    return JSON.stringify(current) !== JSON.stringify(channel.closed)
  })
