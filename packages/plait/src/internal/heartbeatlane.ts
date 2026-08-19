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
import type { HeartbeatTick } from "./heartbeat.js"
import { HEARTBEAT_EVENT_FORM, HeartbeatFact } from "./heartbeat.js"

/**
 * The heartbeat lane: the carriage every tick fact travels on.
 *
 * The vocabulary — the declared event form, the schedule, the tick, and the
 * seat — lives one plane deeper, so a party that only mints ticks never reaches
 * the machinery that carries them. This module declares the lane and lands one
 * fact on it, and it is the only landing path.
 *
 * **One partition, and that is the staleness read's licence rather than a
 * capacity choice.** The staleness question is positional — the head of this
 * lane minus the greatest firing citing one session — and a positioned read is
 * licensed only by a carrier that keeps order. More than one partition erases
 * order across partitions, and the arithmetic would then be over a quotient
 * that no longer has the positions it subtracts. The rung types the carrier: at
 * one partition the lane reads positioned, and the fold declaration next door
 * type-checks against exactly that.
 */

/** The digest of the declared event form, which is also the lane's handle. */
export const heartbeatEventSchema: Effect.Effect<Digest, Refusal> = digestOf(
  HEARTBEAT_EVENT_FORM as unknown as WireValue,
)

/**
 * Declares the heartbeat lane.
 *
 * Keyed by the session digest so the envelope carries which connection a tick
 * is about; at one partition every tick lands in one ordered stream regardless,
 * which is what the positioned staleness read subtracts against.
 */
export const heartbeatLane = Effect.fn("HeartbeatLane.declare")(function* (): Effect.fn.Return<
  DeclaredLane<HeartbeatTick, 1>,
  Refusal
> {
  const eventSchema = yield* heartbeatEventSchema
  return yield* declare({
    handle: eventSchema,
    event: HeartbeatFact,
    eventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["session"] },
  })
})

/**
 * Lands one tick on the declared lane.
 *
 * The lane's own emit derives the message id from the envelope's canonical
 * bytes, so two emitters of one occurrence — whose bodies are byte-identical by
 * construction — land one message and the second is reported as the duplicate
 * it is. Absorption is the substrate executing the monotone plane's law, not a
 * count this package keeps.
 */
export const landTick = Effect.fn("HeartbeatLane.land")(function* (
  lane: DeclaredLane<HeartbeatTick, 1>,
  tick: HeartbeatTick,
  holder: string,
): Effect.fn.Return<EmittedEvent, Refusal, Lanes> {
  return yield* emit(lane, tick, { holder })
})
