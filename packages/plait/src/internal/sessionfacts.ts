/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { Schema } from "effect"

import type { Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import { Effect } from "effect"
import type { SessionGroups, SubstrateSession } from "./substrate.js"
import { nameSessionOf } from "./substrate.js"

/**
 * The substrate-session vocabulary: every fact one connection's life produces,
 * and how each one is minted.
 *
 * Four facts and nothing is ever retracted. An established fact names one
 * connection's establishment; an ended fact names its teardown with the cause
 * the substrate reported; a transition fact names one transcribed state change;
 * an observation names one reading taken within a state. A reconnect lands a
 * NEW established fact naming the prior session as its predecessor and leaves
 * the prior fact exactly as it lies — the past is not edited, and "the
 * connection came back as a different connection" becomes a fact rather than an
 * invisible internal event.
 *
 * **Why this vocabulary sits below the lane that carries it.** The lane module
 * reaches the lane service, which opens its own connection; the spine reaches
 * this module the moment a connection resolves, before any lane exists. Keeping
 * the minting here and the carriage next door is what lets the establishment
 * path mint its own session without importing the machinery that would need a
 * session in order to be built.
 *
 * **What this module does not do, and why it cannot.** It mints and it never
 * lands. Landing goes through the lane service, and the lane service opens a
 * connection whose establishment is itself a substrate session — so a spine
 * that landed its own establishment fact would open a connection to record that
 * it had opened a connection, without end. The mint happens where the
 * connection resolves and the landing is performed by a holder that already
 * owns a lane connection. An owner minting in-process closes that regress; a
 * client cannot.
 */

/**
 * The declared event form for the substrate-session lane.
 *
 * Its digest is both the lane's admitted event-schema digest and the lane's
 * route handle. Declaring the form as data rather than deriving a digest from a
 * runtime schema object keeps the route reproducible by any party holding this
 * record: the route is a function of the declaration, computed with no I/O and
 * no access to this module's runtime.
 *
 * The variant list is ADD-ONLY, for the reason every declared roster in this
 * package is: the form's digest is the lane's route, so appending a variant
 * moves the route visibly and readably while rewriting one in place would move
 * it silently. The transition and observation variants were appended when the
 * status pump gave the lane something to carry besides establishment and
 * teardown; the two original variants are untouched, in place and in order.
 */
export const SESSION_EVENT_FORM = {
  v: 0,
  kind: "substrate-session-event",
  variants: [
    {
      kind: "substrate-session-established",
      fields: ["session", "options", "roster", "predecessor"],
    },
    {
      kind: "substrate-session-ended",
      fields: ["session", "cause"],
    },
    {
      kind: "substrate-session-transition",
      fields: ["session", "event", "from", "to", "payload"],
    },
    {
      kind: "substrate-session-observation",
      fields: ["session", "event", "state", "payload"],
    },
  ],
} as const

/**
 * One connection's establishment, named by the session digest it cites.
 *
 * `roster` is the group-1 field roster the session was folded under, carried
 * for the same reason `options` is: the fact pins the declared values the fold
 * consumed, so a reader diagnoses a disagreement from the fact instead of
 * discovering only that two digests differ. Two parties on different rosters
 * name different sessions — that much the fold already guarantees — and this
 * field is what lets either of them say WHICH roster the other folded.
 */
export const SessionEstablished = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-session-established"),
  session: Schema.String,
  options: Schema.String,
  roster: Schema.String,
  predecessor: Schema.NullOr(Schema.String),
})

/** One connection's establishment, named by the session digest it cites. */
export type SessionEstablished = typeof SessionEstablished.Type

/** One connection's teardown, citing the cause the substrate reported. */
export const SessionEnded = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-session-ended"),
  session: Schema.String,
  cause: Schema.String,
})

/** One connection's teardown, citing the cause the substrate reported. */
export type SessionEnded = typeof SessionEnded.Type

/**
 * What one transcribed payload field carries once it is on the wire.
 *
 * The pin's payloads are not all wire values — one carries the client's own
 * error object and one carries a live subscription — so each field is projected
 * to the value a fact can hold, and a field the client did not send is `null`
 * rather than absent, exactly as a substrate declaration's fields are. The key
 * set is therefore the row's transcribed field set, always all of it, and two
 * emissions of one event cannot differ by an optional field's presence.
 */
export const SessionPayload = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Finite, Schema.Array(Schema.String), Schema.Null]),
)

/** What one transcribed payload field carries once it is on the wire. */
export type SessionPayload = typeof SessionPayload.Type

/**
 * One transcribed state transition of one connection.
 *
 * `event` is the vendor's own event name and `to` is the state that event
 * enters, which is named by the event itself — no state here carries a word the
 * substrate never said. `from` is the state the connection left, and it is
 * `null` when no transition had yet been observed on that session, which is the
 * honest absence of a state rather than an invented initial one.
 *
 * The terminal row does not land here: teardown lands as a session-ended fact,
 * because the record already has a form for "this connection is over" and a
 * second one would be a twin.
 */
export const SessionTransition = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-session-transition"),
  session: Schema.String,
  event: Schema.String,
  from: Schema.NullOr(Schema.String),
  to: Schema.String,
  payload: SessionPayload,
})

/** One transcribed state transition of one connection. */
export type SessionTransition = typeof SessionTransition.Type

/**
 * One reading taken within a state, never a state itself.
 *
 * Four of the pin's eleven event types are readings — a ping went out, a
 * subscription fell behind, the gossiped cluster list moved, the server sent a
 * protocol error — and none of them moves the connection anywhere. They land
 * citing the session and the state they were read within, and nothing folds a
 * state decision out of one.
 */
export const SessionObservation = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-session-observation"),
  session: Schema.String,
  event: Schema.String,
  state: Schema.NullOr(Schema.String),
  payload: SessionPayload,
})

/** One reading taken within a state, never a state itself. */
export type SessionObservation = typeof SessionObservation.Type

/** Every fact the substrate-session lane carries. */
export const SessionFact = Schema.Union([
  SessionEstablished,
  SessionEnded,
  SessionTransition,
  SessionObservation,
])

/** Every fact the substrate-session lane carries. */
export type SessionFact = typeof SessionFact.Type

/** One minted substrate session and the fact that announces it. */
export interface MintedSession {
  /** The folded value the digest names. */
  readonly value: SubstrateSession
  /** The session's name. */
  readonly digest: Digest
  /** The fact that lands on the lane. */
  readonly established: SessionEstablished
}

/**
 * Mints one substrate session from its three groups.
 *
 * The predecessor rides the FACT, never the folded value: the name must stay
 * computable by a party holding only the three groups, and a predecessor is not
 * one of them. Absent for the first session of a process; on a reconnect it is
 * the prior session's digest, and the prior fact is untouched — this function
 * reads nothing and writes nothing, so there is nothing for it to touch.
 */
export const mintSession = Effect.fn("SessionLane.mint")(function* (
  groups: SessionGroups,
  predecessor: Digest | null,
): Effect.fn.Return<MintedSession, Refusal> {
  const named = yield* nameSessionOf(groups)
  return {
    value: named.session,
    digest: named.digest,
    established: {
      v: 0,
      kind: "substrate-session-established",
      session: named.digest,
      options: groups.options,
      roster: groups.substrate.roster,
      predecessor,
    },
  }
})

/**
 * The teardown fact for one session, citing the cause the substrate reported.
 *
 * An empty cause is not a missing one: the pinned client resolves its closed
 * promise with an error when the connection died of one and with nothing when
 * it was taken down in order, so the empty string is the pin's own report that
 * there was no cause to give. That is what keeps an orderly teardown and a hard
 * kill distinguishable in the record rather than merely remembered — the two
 * share an end state and do not share a cause.
 */
export const endedFact = (session: Digest, cause: string): SessionEnded => ({
  v: 0,
  kind: "substrate-session-ended",
  session,
  cause,
})

/** One transition fact, citing the session it happened to. */
export const transitionFact = (input: {
  readonly session: Digest
  readonly event: string
  readonly from: string | null
  readonly to: string
  readonly payload: SessionPayload
}): SessionTransition => ({
  v: 0,
  kind: "substrate-session-transition",
  session: input.session,
  event: input.event,
  from: input.from,
  to: input.to,
  payload: input.payload,
})

/** One observation fact, citing the session and the state it was read within. */
export const observationFact = (input: {
  readonly session: Digest
  readonly event: string
  readonly state: string | null
  readonly payload: SessionPayload
}): SessionObservation => ({
  v: 0,
  kind: "substrate-session-observation",
  session: input.session,
  event: input.event,
  state: input.state,
  payload: input.payload,
})
