/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */

/**
 * The connection status vocabulary, transcribed from the pinned client rather
 * than designed here, and the machine that vocabulary induces.
 *
 * Two tables live in this module and both are DATA. Nothing below is control
 * flow, nothing below is a hand-written union, and no consumer of either table
 * branches on a spelling: the pump walks the rows, and a row is found by
 * matching the value the client sent against the row's own transcribed name.
 * That is the whole reason the tables are values — a switch statement over
 * eleven cases cannot be byte-compared against the vendor's declaration, and
 * byte-comparing them is what the transcription gate does.
 *
 * **The transcription table** is every status event type the pinned client
 * declares, in the order it declares them, with the payload fields each one
 * carries and the sort of each field. Every name is the vendor's own and none
 * is renamed. Per-row provenance is the vendor's own type-alias name for that
 * row, so a reader resolves one row back to one declaration rather than to a
 * table; the pin the whole table was read at rides beside it as data.
 *
 * **Full adoption, no convenient subset.** All eleven rows are transcribed
 * even where this estate has no consumer for a row today, because a subset is
 * a design decision wearing a transcription's clothes.
 *
 * **The machine table** places those eleven rows. Seven are state transitions
 * and four are readings that occur WITHIN a state. Modelling a reading as a
 * state would be exactly the invention the vocabulary ruling forbids, so the
 * placement is a declared column and the gate refuses a reading promoted to a
 * state. The state a transition enters is NAMED BY THE TRANSITION, so no state
 * carries a word the vendor never said; the state before any transition has
 * been observed is `null`, which is not a name but the honest absence of one.
 *
 * Two measured properties of the pin that this module records rather than
 * assumes:
 *
 * 1. The pin declares its eleven types in one order and then lists them in its
 *    union in a slightly different one — the slow-consumer and force-reconnect
 *    rows swap places between the two. This table follows the DECLARATION
 *    order, because that is the order the declarations occupy in the bytes the
 *    gate reads, and a table ordered by a restatement would be ordered by the
 *    restatement's mistakes.
 * 2. The client's status source FANS OUT: each call to it registers a fresh
 *    listener and every event is pushed to every listener. A second consumer
 *    therefore duplicates facts rather than stealing them, which is why the
 *    one-pump-per-connection fence is a fence against double-minting and not
 *    against silent loss.
 *
 * Staged debt, the same shape the substrate roster carries: this table is
 * hand-carried transcription and owes the substrate-vocabulary emitter group,
 * which the corpus does not yet mint. It is transcription with provenance
 * until that group exists, never a twin of one.
 */

/** Where one transcribed payload field's value comes from at the pin. */
export type StatusFieldSort =
  /** A plain string the client sends. */
  | "string"
  /** A list of strings the client sends. */
  | "string-list"
  /** A number the client sends. */
  | "number"
  /**
   * The client's own error object; how it renders is what a fact can carry.
   *
   * The sort is spelled apart from the event name that carries it on purpose.
   * The vocabulary of sorts is this transcription's own and the vocabulary of
   * events is the vendor's, and a word that appeared in both would make the
   * consumer's sort branch indistinguishable from a per-event branch — which is
   * exactly what the transcription gate refuses.
   */
  | "error-object"
  /** The client's own subscription object; its subject is what a fact can carry. */
  | "subscription"

/** One transcribed payload field of one status event. */
export interface StatusField {
  /** The vendor's own field name, verbatim; never renamed. */
  readonly name: string
  readonly sort: StatusFieldSort
  /** Whether the vendor declares the field optional. */
  readonly optional: boolean
}

/** Where one row's placement puts it: a state transition, or a reading. */
export type StatusPlacement = "transition" | "observation"

/** One transcribed status event type. */
export interface StatusEventRow {
  /** The vendor's own event discriminant, verbatim; never renamed. */
  readonly type: string
  /** The vendor's own type-alias name for this row: this row's provenance. */
  readonly declaration: string
  readonly payload: ReadonlyArray<StatusField>
  readonly placement: StatusPlacement
}

/**
 * The pin the table below was transcribed at, carried as data.
 *
 * A version is a pin and not a location: a reader checks the table against the
 * declaration the named package version ships, which is what the transcription
 * gate does with the installed bytes.
 */
export const STATUS_VOCABULARY_PIN = {
  package: "@nats-io/nats-core",
  version: "3.4.0",
  union: "Status",
} as const

/**
 * Every status event the pinned client declares, transcribed whole.
 *
 * Rows are in the pin's declaration order. Each row's `declaration` is the
 * vendor's own alias name, so a row resolves to a declaration rather than to a
 * position, and a reordering that kept the names would still be caught.
 */
export const STATUS_EVENTS = [
  {
    type: "disconnect",
    declaration: "DisconnectStatus",
    payload: [{ name: "server", sort: "string", optional: false }],
    placement: "transition",
  },
  {
    type: "reconnect",
    declaration: "ReconnectStatus",
    payload: [{ name: "server", sort: "string", optional: false }],
    placement: "transition",
  },
  {
    type: "reconnecting",
    declaration: "ReconnectingStatus",
    payload: [],
    placement: "transition",
  },
  {
    type: "update",
    declaration: "ClusterUpdateStatus",
    payload: [
      { name: "added", sort: "string-list", optional: true },
      { name: "deleted", sort: "string-list", optional: true },
    ],
    placement: "observation",
  },
  {
    type: "ldm",
    declaration: "LDMStatus",
    payload: [{ name: "server", sort: "string", optional: false }],
    placement: "transition",
  },
  {
    type: "error",
    declaration: "ServerErrorStatus",
    payload: [{ name: "error", sort: "error-object", optional: false }],
    placement: "observation",
  },
  {
    type: "ping",
    declaration: "ClientPingStatus",
    payload: [{ name: "pendingPings", sort: "number", optional: false }],
    placement: "observation",
  },
  {
    type: "staleConnection",
    declaration: "StaleConnectionStatus",
    payload: [],
    placement: "transition",
  },
  {
    type: "forceReconnect",
    declaration: "ForceReconnectStatus",
    payload: [],
    placement: "transition",
  },
  {
    type: "slowConsumer",
    declaration: "SlowConsumerStatus",
    payload: [
      { name: "sub", sort: "subscription", optional: false },
      { name: "pending", sort: "number", optional: false },
    ],
    placement: "observation",
  },
  {
    type: "close",
    declaration: "CloseStatus",
    payload: [],
    placement: "transition",
  },
] as const satisfies ReadonlyArray<StatusEventRow>

/**
 * Every transcribed event name, derived from the table.
 *
 * The type is a PROJECTION of the data and never a second statement of it: a
 * hand-written union standing beside the table is the refused alternative, and
 * deriving it here means a row appended tomorrow widens the type by
 * construction.
 */
export type StatusEventType = (typeof STATUS_EVENTS)[number]["type"]

/**
 * Which fact form one transition row emits.
 *
 * Teardown is not a transition fact wearing a different name: the terminal row
 * emits the session-ended fact, whose schema and cause field the session lane
 * already declares. Every other transition emits a transition fact.
 */
export type TransitionEmission = "transition" | "ended"

/** One row of the connection machine: a transition, with what it emits. */
export interface TransitionRow {
  /** The transcribed event that fires this transition. */
  readonly event: string
  /** The state entered, named by the transition that enters it. */
  readonly state: string
  /** Every state this transition may be entered from; `null` is "no transition observed yet". */
  readonly from: ReadonlyArray<string | null>
  /** Whether the row mints a successor session naming its predecessor. */
  readonly mintsSuccessor: boolean
  readonly emits: TransitionEmission
  /** Whether the state entered is absorbing: no row leaves it. */
  readonly absorbing: boolean
}

/**
 * The connection machine, as declared data.
 *
 * Seven rows, one per transcribed transition. Nothing here decides anything at
 * runtime: the pump reads `state`, `mintsSuccessor` and `emits` off the row it
 * matched, and the `from` column is the machine's declared shape — what the
 * gate checks for totality and reachability, and what a state model consumes.
 * The pump does not refuse an inadmissible predecessor, because a status event
 * is the client's own evidence and evidence is never refused for arriving in
 * an order a table did not expect; the fact records the state it left.
 *
 * The terminal row is reachable from every state including the unobserved one,
 * and it is normal rather than exceptional: at the pinned defaults a connection
 * that exhausts its attempt budget closes permanently, so a machine that
 * modelled the terminal state as an error would be modelling the ordinary case
 * as one.
 */
export const CONNECTION_TRANSITIONS = [
  {
    event: "disconnect",
    state: "disconnect",
    from: [null, "reconnect", "ldm", "staleConnection", "forceReconnect"],
    mintsSuccessor: false,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "reconnect",
    state: "reconnect",
    from: ["disconnect", "reconnecting", "forceReconnect"],
    mintsSuccessor: true,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "reconnecting",
    state: "reconnecting",
    from: ["disconnect", "reconnecting", "staleConnection", "forceReconnect", "ldm"],
    mintsSuccessor: false,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "ldm",
    state: "ldm",
    from: [null, "reconnect"],
    mintsSuccessor: false,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "staleConnection",
    state: "staleConnection",
    from: [null, "reconnect", "ldm"],
    mintsSuccessor: false,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "forceReconnect",
    state: "forceReconnect",
    from: [null, "reconnect", "ldm", "staleConnection"],
    mintsSuccessor: false,
    emits: "transition",
    absorbing: false,
  },
  {
    event: "close",
    state: "close",
    from: [
      null,
      "disconnect",
      "reconnect",
      "reconnecting",
      "ldm",
      "staleConnection",
      "forceReconnect",
    ],
    mintsSuccessor: false,
    emits: "ended",
    absorbing: true,
  },
] as const satisfies ReadonlyArray<TransitionRow>

/**
 * Every state the machine can be in, derived from the machine table.
 *
 * Derived, never declared beside it: a hand-written state union is the refused
 * alternative and the gate plants one to prove the refusal executes.
 */
export type ConnectionState = (typeof CONNECTION_TRANSITIONS)[number]["state"]

/**
 * One machine row as the table actually carries it, states and all.
 *
 * The wide interface above is what the table is checked AGAINST; this is what
 * reading the table gives back. A consumer that matched a row gets the row's
 * own state as a state and not as a string, so the machine's vocabulary reaches
 * the pump without the pump restating it.
 */
export type ConnectionTransition = (typeof CONNECTION_TRANSITIONS)[number]

/**
 * The machine's position: a state, or the absence of one.
 *
 * `null` is not a state and is not spelled like one. It says a connection has
 * been established and no transition has yet been observed — which is a real
 * condition of a live connection and is exactly the thing a made-up
 * "connected" state would have papered over.
 */
export type MachinePosition = ConnectionState | null

/** The transcribed row for one event name, or `undefined` if the pin never declared it. */
export const statusRowFor = (
  type: string,
): StatusEventRow | undefined => STATUS_EVENTS.find((row) => row.type === type)

/** The machine row for one event name, or `undefined` when the row is a reading. */
export const transitionRowFor = (
  event: string,
): ConnectionTransition | undefined =>
  CONNECTION_TRANSITIONS.find((row): row is ConnectionTransition => row.event === event)

/** Every transcribed row placed as a state transition. */
export const TRANSITION_EVENTS: ReadonlyArray<StatusEventRow> = STATUS_EVENTS.filter(
  (row) => row.placement === "transition",
)

/** Every transcribed row placed as a reading within a state. */
export const OBSERVATION_EVENTS: ReadonlyArray<StatusEventRow> = STATUS_EVENTS.filter(
  (row) => row.placement === "observation",
)

/** Every state the machine declares, in the order its rows enter them. */
export const CONNECTION_STATES: ReadonlyArray<string> = CONNECTION_TRANSITIONS.map(
  (row) => row.state,
)
