/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { Effect, Predicate } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import { structuralRefusal, type Next, type Refusal } from "../truth/Refusal.js"

/**
 * The substrate session — one connection's identity, folded at establishment.
 *
 * Three groups fold into one canonical value and its digest is the session's
 * name: what the substrate declares about itself and about you, what the
 * process declares about itself, and what the estate knows that the substrate
 * cannot. The fold is a pure function of those three groups and reaches no
 * connection, which is the whole property: two parties holding the same three
 * groups compute the same digest with zero I/O, so a session can be CITED by a
 * party that never saw the connection, and a privileged client and an
 * in-process owner minting from different carriage produce identical bytes.
 *
 * Three constructions carry that property and are not decorations:
 *
 * 1. **The field roster is one declared list.** Group 1 is not read by inline
 *    branches over a connection object; it is the table below, walked. The
 *    open question of whether the per-connection exchange key belongs in the
 *    fold therefore moves one row of one list, never any code.
 * 2. **Nothing here reads a clock.** No establishment time, no round-trip
 *    time, no connection statistics: a claimed time is observation data,
 *    carried, never identifying, and frontier readings are not identity.
 * 3. **The predecessor is not folded.** A reconnect mints a successor naming
 *    its predecessor, and that naming rides the session-established fact
 *    rather than the folded value — because a party holding only the three
 *    groups must still compute the name, and a predecessor is not one of them.
 *
 * The connection identifier the substrate assigns is carried and is never the
 * identity: it is unique per server incarnation only, is reused after restart,
 * and carries none of the declared half.
 */

/** How one group-1 field reaches this package from the pinned client. */
export type FieldProvenance =
  /** Declared by the pinned client's own server-information type. */
  | "declared"
  /** Sent by the substrate on the wire; absent from that declaration. */
  | "measured"

/** The wire sort one group-1 field carries when the substrate sends it. */
export type FieldSort = "string" | "number" | "boolean"

/** One transcribed field of the substrate's own declaration. */
export interface SubstrateField {
  /** The substrate's own key, verbatim; never renamed. */
  readonly name: string
  readonly sort: FieldSort
  readonly provenance: FieldProvenance
}

/**
 * The substrate's declared field set, transcribed rather than designed.
 *
 * Every name is the substrate's own and none is renamed. `provenance` records
 * how each row reaches this package: a `declared` row is carried by the pinned
 * client's server-information type, and a `measured` row is one the substrate
 * sends on the wire that the pinned type does not carry — the three of them are
 * transcribed from a live connection at the pins rather than from that type,
 * and they are the reason this table is data with provenance instead of an
 * interface.
 *
 * The per-connection exchange key is deliberately ABSENT. It was measured on
 * the same live connection; whether it belongs in the fold is an open pin held
 * by the operator, not a drafting question, and this slice lands with it
 * excluded. Ruling it in later adds one row here.
 *
 * Staged debt: this table is hand-carried and owes the substrate-vocabulary
 * emitter group, which the corpus does not yet mint. It is transcription with
 * provenance until that group exists, never a twin of one.
 */
export const SUBSTRATE_FIELDS: ReadonlyArray<SubstrateField> = [
  { name: "server_id", sort: "string", provenance: "declared" },
  { name: "server_name", sort: "string", provenance: "declared" },
  { name: "version", sort: "string", provenance: "declared" },
  { name: "proto", sort: "number", provenance: "declared" },
  { name: "go", sort: "string", provenance: "declared" },
  { name: "host", sort: "string", provenance: "declared" },
  { name: "port", sort: "number", provenance: "declared" },
  { name: "headers", sort: "boolean", provenance: "declared" },
  { name: "max_payload", sort: "number", provenance: "declared" },
  { name: "jetstream", sort: "boolean", provenance: "declared" },
  { name: "client_id", sort: "number", provenance: "declared" },
  { name: "client_ip", sort: "string", provenance: "declared" },
  { name: "connect_info", sort: "boolean", provenance: "measured" },
  { name: "remote_account", sort: "string", provenance: "measured" },
  { name: "api_lvl", sort: "number", provenance: "declared" },
]

/**
 * Group 1 — what the substrate declares about itself and about you.
 *
 * Exactly the roster's keys, always all of them: a field the substrate did not
 * send is `null` rather than absent, so the folded key set is fixed and two
 * mints over the same connection cannot differ by an optional field's presence.
 */
export interface SubstrateDeclaration {
  readonly v: 0
  readonly kind: "substrate-declaration"
  readonly fields: { readonly [field: string]: string | number | boolean | null }
}

/** How one declared connect option got its value. */
export type OptionSource =
  /** The estate passes this option to the client on every connect. */
  | "estate-set"
  /** The estate passes nothing; the pinned client's own default table carries it. */
  | "client-default"
  /**
   * The estate passes nothing and the pinned client's default table carries
   * nothing either: the value declared is what the client's own code reads
   * when the option is absent. Naming the distinction matters, because an
   * unset option's effective value lives at its point of use rather than in
   * one table, and that is exactly the kind of value nobody has read.
   */
  | "client-unset"

/** One connect option, named with the value the connection runs under. */
export interface ConnectOption {
  readonly name: string
  readonly source: OptionSource
}

/**
 * Every connect option the estate runs under, named.
 *
 * A default the estate never chose is not a decision, so this table names all
 * of them — the four the spine passes and the pinned defaults it inherits —
 * and the declared value carries a value for each. Naming a default is not
 * choosing it: this slice changes no runtime value, and the value pins stay
 * the operator's to rule with the declaration in front of them.
 *
 * `estate-set` rows are the ones the spine actually passes, and
 * {@link estateConnectArguments} projects exactly those back out, so the value
 * the fact pins and the arguments the connection ran under have ONE source.
 * A `client-default` row is carried in the declaration and never passed:
 * passing a transcribed default would silently become a runtime change the day
 * the transcription and the client disagreed.
 *
 * Staged debt, same as the roster above: hand-carried transcription owing the
 * substrate-vocabulary emitter group.
 */
export const CONNECT_OPTIONS: ReadonlyArray<ConnectOption> = [
  { name: "authenticator", source: "estate-set" },
  { name: "debug", source: "client-unset" },
  { name: "ignoreAuthErrorAbort", source: "client-default" },
  { name: "ignoreClusterUpdates", source: "client-unset" },
  { name: "inboxPrefix", source: "estate-set" },
  { name: "maxPingOut", source: "client-default" },
  { name: "maxReconnectAttempts", source: "client-default" },
  { name: "name", source: "estate-set" },
  { name: "noEcho", source: "client-unset" },
  { name: "noRandomize", source: "client-default" },
  { name: "pedantic", source: "client-default" },
  { name: "pingInterval", source: "client-default" },
  { name: "reconnect", source: "client-default" },
  { name: "reconnectJitter", source: "client-default" },
  { name: "reconnectJitterTLS", source: "client-default" },
  { name: "reconnectTimeWait", source: "client-default" },
  { name: "servers", source: "estate-set" },
  { name: "timeout", source: "client-unset" },
  { name: "verbose", source: "client-default" },
  { name: "waitOnFirstConnect", source: "client-default" },
]

/**
 * The value every non-estate-set option above runs at, transcribed from the
 * pinned client.
 *
 * The `client-default` rows are the pinned client's own default table. The
 * four `client-unset` rows are not in it: three of them the client never sets
 * and reads as absent, and the connect handshake bound is read at its point of
 * use as "the caller's value or twenty seconds". Both readings are the
 * client's; neither is this package's choice.
 *
 * These are declared, not applied. The bound is stated where it bites: if this
 * transcription and the client ever disagree, the declaration is wrong and the
 * runtime is unchanged — which is the failure this slice prefers, because the
 * other one changes what the estate runs under by editing a table.
 */
export const CONNECT_OPTION_DEFAULTS: {
  readonly [option: string]: string | number | boolean | null
} = {
  debug: false,
  ignoreAuthErrorAbort: false,
  ignoreClusterUpdates: false,
  maxPingOut: 2,
  maxReconnectAttempts: 10,
  noEcho: false,
  noRandomize: false,
  pedantic: false,
  pingInterval: 120_000,
  reconnect: true,
  reconnectJitter: 100,
  reconnectJitterTLS: 1_000,
  reconnectTimeWait: 2_000,
  timeout: 20_000,
  verbose: false,
  waitOnFirstConnect: false,
}

/** Group 2 — what the process declares about itself. */
export interface ConnectOptionsDeclaration {
  readonly v: 0
  readonly kind: "substrate-connect-options"
  readonly options: {
    readonly [option: string]: WireValue
  }
}

/**
 * Group 3 — what the estate knows and the substrate cannot.
 *
 * Minimal by declaration, and the bound is stated rather than implied: the
 * parent record calls this group a sketch, so the schema carries exactly the
 * three fields that record names and nothing beyond them.
 *
 * - `writ` is the writ digest the connection acts under, or `null`. The spine
 *   acquires connections below the plane that judges writs, so `null` is the
 *   honest value at this posture and is NOT a placeholder for a writ that
 *   exists and was dropped.
 * - `layer` is which service layer opened the connection — the connection name
 *   the spine passes unconditionally, which is what makes per-layer connection
 *   counts readable at all.
 * - `shapes` is the asserted-shape set: the declared shapes this connection
 *   claimed at open, sorted and deduplicated so the set is a set. It is empty
 *   at this posture because every carrier asserts its shapes lazily; an empty
 *   set here is HONESTLY empty, which is the ambiguity this field exists to
 *   close — re-assertion after a reconnect now has a declared target.
 */
export interface EstateDeclaration {
  readonly v: 0
  readonly kind: "substrate-estate"
  readonly writ: string | null
  readonly layer: string
  readonly shapes: ReadonlyArray<string>
}

/** The three groups one substrate session folds. */
export interface SessionGroups {
  readonly substrate: SubstrateDeclaration
  readonly options: Digest
  readonly estate: EstateDeclaration
}

/** The folded value whose digest is one substrate session's name. */
export interface SubstrateSession {
  readonly v: 0
  readonly kind: "substrate-session"
  readonly substrate: SubstrateDeclaration
  readonly options: string
  readonly estate: EstateDeclaration
}

const teachReadInfo: ReadonlyArray<Next> = [{
  subject: "substrate.declaration",
  note: "Fold the substrate declaration from an established connection's own server information; every declared field carries the sort the substrate sends it with.",
}]

const malformed = (
  path: ReadonlyArray<string>,
  got: string,
  expected: string,
): Refusal => structuralRefusal({
  kind: "malformed-value",
  law: "A substrate session folds the substrate's own declaration, field by field, from the declared roster.",
  path,
  got,
  expected,
  next: teachReadInfo,
})

const sortOf = (value: unknown): FieldSort | null =>
  typeof value === "string"
    ? "string"
    : typeof value === "number"
    ? "number"
    : typeof value === "boolean"
    ? "boolean"
    : null

/**
 * Folds group 1 from the substrate's own declaration.
 *
 * The roster is walked; nothing is selected by hand. A field the substrate did
 * not send folds as `null`, and a field it sent at a sort the roster does not
 * name refuses rather than folding a coerced value — a silently coerced field
 * would move the session digest without moving anything the substrate said.
 */
export const substrateDeclarationOf = Effect.fn("Substrate.declarationOf")(function* (
  info: unknown,
): Effect.fn.Return<SubstrateDeclaration, Refusal> {
  if (!Predicate.isObject(info)) {
    return yield* malformed(["info"], String(info), "the substrate's own declaration record")
  }
  const record = info as { readonly [key: string]: unknown }
  const fields: Record<string, string | number | boolean | null> = {}
  for (const field of SUBSTRATE_FIELDS) {
    const value = Object.hasOwn(record, field.name) ? record[field.name] : undefined
    if (value === undefined || value === null) {
      fields[field.name] = null
      continue
    }
    const sort = sortOf(value)
    if (sort !== field.sort) {
      return yield* malformed(
        ["info", field.name],
        sort ?? String(value),
        field.sort,
      )
    }
    if (sort === "number" && !Number.isFinite(value as number)) {
      return yield* malformed(["info", field.name], String(value), "a finite number")
    }
    fields[field.name] = value as string | number | boolean
  }
  return { v: 0, kind: "substrate-declaration", fields }
})

/** What the estate sets on one connection, before anything is declared. */
export interface ConnectionDeclarationInput {
  readonly servers: string | ReadonlyArray<string>
  readonly name: string
  readonly inboxPrefix: string | null
  readonly authenticator: string | null
}

/**
 * Declares group 2 for one connection: every option named, with the value the
 * connection runs under.
 *
 * The estate-set rows take the caller's values; every other row takes the
 * transcribed default. An option named in the roster with no default and no
 * caller value refuses, so a row added to the roster without its value cannot
 * silently declare `undefined`.
 */
export const connectOptionsDeclaration = Effect.fn("Substrate.connectOptions")(function* (
  input: ConnectionDeclarationInput,
): Effect.fn.Return<ConnectOptionsDeclaration, Refusal> {
  const set: { readonly [option: string]: WireValue } = {
    authenticator: input.authenticator,
    inboxPrefix: input.inboxPrefix,
    name: input.name,
    servers: typeof input.servers === "string" ? [input.servers] : [...input.servers],
  }
  const options: Record<string, WireValue> = {}
  for (const option of CONNECT_OPTIONS) {
    const value = option.source === "estate-set"
      ? set[option.name]
      : CONNECT_OPTION_DEFAULTS[option.name]
    if (value === undefined) {
      return yield* malformed(
        ["options", option.name],
        "absent",
        `a declared value for the ${option.source} option`,
      )
    }
    options[option.name] = value
  }
  return { v: 0, kind: "substrate-connect-options", options }
})

/** What the estate passes to the pinned client, projected from the declaration. */
export interface EstateConnectArguments {
  readonly servers: ReadonlyArray<string>
  readonly name: string
  readonly inboxPrefix: string | null
  readonly authenticator: string | null
}

/**
 * Projects back out exactly the options the estate sets.
 *
 * This is the pin's other half: the arguments the connection runs under and
 * the value the session fact names are one value read twice, so "the fact
 * pins the options the connection ran under" is a construction rather than a
 * comment. Every `client-default` row stays declared and unpassed.
 */
export const estateConnectArguments = Effect.fn("Substrate.estateArguments")(function* (
  declaration: ConnectOptionsDeclaration,
): Effect.fn.Return<EstateConnectArguments, Refusal> {
  const servers = declaration.options["servers"]
  const name = declaration.options["name"]
  const inboxPrefix = declaration.options["inboxPrefix"]
  const authenticator = declaration.options["authenticator"]
  if (!Array.isArray(servers) || !servers.every((server) => typeof server === "string")) {
    return yield* malformed(["options", "servers"], String(servers), "a list of server addresses")
  }
  if (typeof name !== "string") {
    return yield* malformed(["options", "name"], String(name), "one connection name")
  }
  if (inboxPrefix !== null && typeof inboxPrefix !== "string") {
    return yield* malformed(["options", "inboxPrefix"], String(inboxPrefix), "one inbox prefix or null")
  }
  if (authenticator !== null && typeof authenticator !== "string") {
    return yield* malformed(["options", "authenticator"], String(authenticator), "one authenticator name or null")
  }
  return { servers: [...servers], name, inboxPrefix, authenticator }
})

/** The digest of one declared connect-options value. */
export const connectOptionsDigest = (
  declaration: ConnectOptionsDeclaration,
): Effect.Effect<Digest, Refusal> => digestOf(declaration as unknown as WireValue)

/**
 * Declares group 3.
 *
 * The shape set is sorted and deduplicated here rather than by its callers, so
 * two parties that assert the same shapes in different orders fold to the same
 * bytes.
 */
export const estateDeclaration = (input: {
  readonly writ: string | null
  readonly layer: string
  readonly shapes: ReadonlyArray<string>
}): EstateDeclaration => ({
  v: 0,
  kind: "substrate-estate",
  writ: input.writ,
  layer: input.layer,
  shapes: [...new Set(input.shapes)].sort(),
})

/** Folds the three groups into the value whose digest names the session. */
export const substrateSession = (groups: SessionGroups): SubstrateSession => ({
  v: 0,
  kind: "substrate-session",
  substrate: groups.substrate,
  options: groups.options,
  estate: groups.estate,
})

/**
 * The session's name: SHA-256 over the folded value's canonical bytes, through
 * the one canonicalizer.
 */
export const substrateSessionName = (
  session: SubstrateSession,
): Effect.Effect<Digest, Refusal> => digestOf(session as unknown as WireValue)

/** Folds the three groups and names the session in one step. */
export const nameSessionOf = Effect.fn("Substrate.nameSession")(function* (
  groups: SessionGroups,
): Effect.fn.Return<{ readonly session: SubstrateSession; readonly digest: Digest }, Refusal> {
  const session = substrateSession(groups)
  return { session, digest: yield* substrateSessionName(session) }
})
