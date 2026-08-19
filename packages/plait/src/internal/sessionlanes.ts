/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import type { DeclaredLane, EmittedEvent } from "../planes/Lane.js"
import { declare, emit, type Lanes } from "../planes/Lane.js"
import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import type { SessionGroups, SubstrateSession } from "./substrate.js"
import { nameSessionOf } from "./substrate.js"

/**
 * The substrate-session lane: where establishment and teardown accumulate.
 *
 * Two facts land here and neither is ever retracted. A session-established
 * fact names one connection's establishment; a session-ended fact names its
 * teardown with the cause the substrate reported. A reconnect lands a NEW
 * established fact naming the prior session as its predecessor and leaves the
 * prior fact exactly as it lies — the past is not edited, and "the connection
 * came back as a different connection" becomes a fact rather than an
 * invisible internal event.
 *
 * **The lane's route carries no estate-invented word.** Its handle IS the
 * digest of the declared event form below, so the subject the wire sees is
 * derived from a declaration rather than named by this package. A hand-chosen
 * handle would be a protocol word the substrate never carried.
 *
 * **What this module does not do, and why it cannot yet.** It mints and it
 * lands, and the two are separate calls. Landing goes through the lane
 * service, and the lane service opens its own connection — whose establishment
 * is itself a substrate session. A spine that landed its own establishment
 * fact through a lane service would open a connection to record that it had
 * opened a connection, without end. So the mint happens where the connection
 * resolves and the landing is performed by a holder that already owns a lane
 * connection. An owner minting in-process closes that regress; a client cannot.
 */

/**
 * The declared event form for this lane.
 *
 * Its digest is both the lane's admitted event-schema digest and the lane's
 * route handle. Declaring the form as data rather than deriving a digest from
 * a runtime schema object keeps the route reproducible by any party holding
 * this record: the route is a function of the declaration, computed with no
 * I/O and no access to this module's runtime.
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

/** Every fact the substrate-session lane carries. */
export const SessionFact = Schema.Union([SessionEstablished, SessionEnded])

/** Every fact the substrate-session lane carries. */
export type SessionFact = typeof SessionFact.Type

/** The digest of the declared event form, which is also the lane's handle. */
export const sessionEventSchema: Effect.Effect<Digest, Refusal> = digestOf(
  SESSION_EVENT_FORM as unknown as WireValue,
)

/**
 * Declares the substrate-session lane.
 *
 * Keyed by the session digest, so every fact about one session routes to one
 * partition and a session's establishment and teardown never separate.
 */
export const sessionLane = Effect.fn("SessionLane.declare")(function* (): Effect.fn.Return<
  DeclaredLane<SessionFact, 8>,
  Refusal
> {
  const eventSchema = yield* sessionEventSchema
  return yield* declare({
    handle: eventSchema,
    event: SessionFact,
    eventSchema,
    partitions: 8 as const,
    partitionKey: { path: ["session"] },
  })
})

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
 * computable by a party holding only the three groups, and a predecessor is
 * not one of them. Absent for the first session of a process; on a reconnect
 * it is the prior session's digest, and the prior fact is untouched — this
 * function reads nothing and writes nothing, so there is nothing for it to
 * touch.
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

/** The teardown fact for one session, citing the cause the substrate reported. */
export const endedFact = (session: Digest, cause: string): SessionEnded => ({
  v: 0,
  kind: "substrate-session-ended",
  session,
  cause,
})

/** Lands one substrate-session fact on the declared lane. */
export const landFact = Effect.fn("SessionLane.land")(function* (
  lane: DeclaredLane<SessionFact, 8>,
  fact: SessionFact,
  holder: string,
): Effect.fn.Return<EmittedEvent, Refusal, Lanes> {
  return yield* emit(lane, fact, { holder })
})
