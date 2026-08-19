/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect } from "effect"

import type { DeclaredLane, EmittedEvent } from "../planes/Lane.js"
import { declare, emit, type Lanes } from "../planes/Lane.js"
import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import type { SessionFact } from "./sessionfacts.js"
import { SESSION_EVENT_FORM, SessionFact as SessionFactSchema } from "./sessionfacts.js"

/**
 * The substrate-session lane: the carriage the session vocabulary travels on.
 *
 * The vocabulary itself — the declared event form, the four fact schemas, and
 * the mints — lives one plane deeper, because the establishment path needs it
 * before any lane can exist. This module is the carriage half: it declares the
 * lane and it lands a fact on it.
 *
 * **The lane's route carries no estate-invented word.** Its handle IS the
 * digest of the declared event form, so the subject the wire sees is derived
 * from a declaration rather than named by this package. A hand-chosen handle
 * would be a protocol word the substrate never carried.
 *
 * **This is the only landing path.** Everything that mints a session fact —
 * the establishment path, the status pump — hands the fact to a holder that
 * already owns a lane connection, and that holder lands it through the emit
 * below. A second landing path built beside this one would be a second door
 * onto the lane; the exposure the pump offers is a hand-off, never a landing.
 */

/** The digest of the declared event form, which is also the lane's handle. */
export const sessionEventSchema: Effect.Effect<Digest, Refusal> = digestOf(
  SESSION_EVENT_FORM as unknown as WireValue,
)

/**
 * Declares the substrate-session lane.
 *
 * Keyed by the session digest, so every fact about one session routes to one
 * partition and a session's establishment, transitions, readings, and teardown
 * never separate — which is what makes the pump's observation order readable as
 * lane order rather than as a set.
 */
export const sessionLane = Effect.fn("SessionLane.declare")(function* (): Effect.fn.Return<
  DeclaredLane<SessionFact, 8>,
  Refusal
> {
  const eventSchema = yield* sessionEventSchema
  return yield* declare({
    handle: eventSchema,
    event: SessionFactSchema,
    eventSchema,
    partitions: 8 as const,
    partitionKey: { path: ["session"] },
  })
})

/** Lands one substrate-session fact on the declared lane. */
export const landFact = Effect.fn("SessionLane.land")(function* (
  lane: DeclaredLane<SessionFact, 8>,
  fact: SessionFact,
  holder: string,
): Effect.fn.Return<EmittedEvent, Refusal, Lanes> {
  return yield* emit(lane, fact, { holder })
})

/**
 * Lands every fact a pump has minted and not yet handed over, in order.
 *
 * This is the hand-off the pump's exposure exists for, and it is deliberately
 * the SAME emit every other landing uses: the facts come out of the pump as
 * values and go in through the lane's one door. Order is preserved because the
 * pump hands them over in the order it observed them and this walks them in
 * that order.
 */
export const landFacts = Effect.fn("SessionLane.landAll")(function* (
  lane: DeclaredLane<SessionFact, 8>,
  facts: ReadonlyArray<SessionFact>,
  holder: string,
): Effect.fn.Return<ReadonlyArray<EmittedEvent>, Refusal, Lanes> {
  const landed: Array<EmittedEvent> = []
  for (const fact of facts) landed.push(yield* landFact(lane, fact, holder))
  return landed
})
