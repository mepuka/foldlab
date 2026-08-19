/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Ref, Schedule, Schema, Scope } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import { structuralRefusal, type Next, type Refusal } from "../truth/Refusal.js"

/**
 * The heartbeat seat: a declared schedule, and one tick fact per firing.
 *
 * The estate never asks a connection whether it is still alive. A seat holds a
 * declared schedule and emits evidence; readers fold that evidence. This module
 * is the emitting half — the schedule as a declared value, the tick as a fact,
 * and the seat that turns firings into facts. The reading half lives next door,
 * and nothing here reads it.
 *
 * **The whole tick body is a function of its declared inputs, and no field of
 * it is a clock reading.** The claimed time is the SCHEDULE's own claimed time
 * for firing n — its origin advanced n periods — computed by arithmetic over
 * declared data. That is the difference between a tick pattern and a log line:
 * a log line records when the process happened to look at a clock, so two
 * emitters of the same occurrence disagree; a tick records which occurrence of
 * a declared schedule this is, so they cannot. The seat still consults a clock
 * in order to PACE itself — sleeping a period between firings is liveness, and
 * the liveness plane is where a clock is allowed to live — but nothing it
 * consults there reaches a field, a digest, or a fold.
 *
 * **The occurrence key is `(session, schedule, firing)`.** Two emitters that
 * observed the same occurrence and the same health mint byte-identical bodies,
 * so the second landing is absorbed on the monotone plane by the lane's own
 * message id rather than counted. The bound is stated where it bites and is not
 * smoothed over: health is a genuine observation, so two emitters that observed
 * DIFFERENT health mint different bytes — and that is the right answer, because
 * two parties claiming different health of one connection are not making one
 * claim twice. The occurrence key makes a second emitter safe; it does not make
 * two disagreeing observers agree.
 *
 * **The health value must not claim what it cannot see.** At this posture the
 * server's own health call is unreachable, so the health a tick carries is what
 * the pinned client itself exposes about the connection and nothing more, and
 * the provenance field says exactly that. Without the provenance field the
 * client posture and the daemon posture would emit identical bytes for
 * non-identical claims, which is the one way this design could quietly lie.
 */

/** Where a tick's health value was read. */
export const HealthSource = Schema.Literals([
  /** Read from the pinned client's own view of its connection. */
  "client-observed",
  /** Read from the server's own in-process health call. */
  "server-reported",
])

/** Where a tick's health value was read. */
export type HealthSource = typeof HealthSource.Type

/**
 * The declared health vocabulary, and the bound on what a client may say.
 *
 * Three words, and every one of them is something the pinned client answers
 * about its own connection without asking the substrate anything. A fourth word
 * naming something only the server knows would need the daemon posture and the
 * `server-reported` provenance beside it.
 */
export const HEALTH_VALUES = ["open", "draining", "closed"] as const

/** One declared health value. */
export const HealthValue = Schema.Literals(HEALTH_VALUES)

/** One declared health value. */
export type HealthValue = typeof HealthValue.Type

/**
 * The declared event form for the heartbeat lane.
 *
 * Its digest is both the lane's admitted event-schema digest and the lane's
 * route handle, exactly as the session lane's form is: the subject the wire
 * sees is derived from a declaration rather than named by this package. The
 * variant list is ADD-ONLY for the same reason every declared roster here is.
 */
export const HEARTBEAT_EVENT_FORM = {
  v: 0,
  kind: "substrate-heartbeat-event",
  variants: [
    {
      kind: "substrate-heartbeat-tick",
      fields: ["session", "schedule", "firing", "claimed", "health", "healthSource"],
    },
  ],
} as const

/**
 * One heartbeat schedule, declared as data so that changing it is a difference
 * in the truth plane.
 *
 * `origin` is the declared instant firing zero would have claimed and `period`
 * is the declared span between firings. Both are declared values, not readings:
 * nothing constructs a schedule by asking what time it is. A fold over ticks can
 * therefore say which schedule produced them, and "we changed the heartbeat
 * interval" becomes a second declared value with a second digest rather than an
 * invisible edit to a running process.
 */
export const HeartbeatSchedule = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-heartbeat-schedule"),
  origin: Schema.String,
  period: Schema.Finite,
})

/** One heartbeat schedule, declared as data. */
export type HeartbeatSchedule = typeof HeartbeatSchedule.Type

/** One declared schedule and the digest that is its name. */
export interface DeclaredSchedule {
  readonly value: HeartbeatSchedule
  readonly digest: Digest
}

/**
 * One firing of one schedule for one session: the tick fact.
 *
 * `claimed` is observation data and NOTHING more — it is carried, it is never
 * identifying, and no fold may consult it. A fold that reads it has put a clock
 * inside meaning and broken replay determinism, which is why the presence and
 * staleness reads next door reach positions and firings and never this field.
 */
export const HeartbeatTick = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("substrate-heartbeat-tick"),
  session: Schema.String,
  schedule: Schema.String,
  firing: Schema.Natural,
  claimed: Schema.String,
  health: HealthValue,
  healthSource: HealthSource,
})

/** One firing of one schedule for one session: the tick fact. */
export type HeartbeatTick = typeof HeartbeatTick.Type

/** Every fact the heartbeat lane carries. */
export const HeartbeatFact = HeartbeatTick

/** Every fact the heartbeat lane carries. */
export type HeartbeatFact = HeartbeatTick

/**
 * The triple that names one occurrence, and the whole duplicate-safety claim.
 *
 * Its two digest fields are carried as the plain strings the fact carries: an
 * occurrence is READ OFF a tick, and a tick's fields have already been admitted
 * by the lane's own schema. Re-branding them here would be this module asserting
 * a second time what the door already decided.
 */
export interface Occurrence {
  readonly session: string
  readonly schedule: string
  readonly firing: number
}

/** One health reading and the provenance that keeps two postures apart. */
export interface HealthReading {
  readonly health: HealthValue
  readonly healthSource: HealthSource
}

const teachDeclareSchedule: ReadonlyArray<Next> = [{
  subject: "Heartbeat.declareSchedule",
  note: "Declare the schedule with an instant its origin can be read from and a positive whole span between firings.",
}]

const malformed = (
  path: ReadonlyArray<string>,
  got: string,
  expected: string,
): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A heartbeat schedule is declared data, and every firing's claimed time is arithmetic over it.",
    path,
    got,
    expected,
    next: teachDeclareSchedule,
  })

/**
 * Declares one heartbeat schedule and names it by its own bytes.
 *
 * The origin is checked here rather than at each firing, because a schedule
 * whose origin cannot be read is a schedule whose every claimed time would be
 * unreadable — refusing once at the declaration is the difference between one
 * refusal and a lane full of them.
 */
export const declareSchedule = Effect.fn("Heartbeat.declareSchedule")(function* (
  input: { readonly origin: string; readonly period: number },
): Effect.fn.Return<DeclaredSchedule, Refusal> {
  const origin = Date.parse(input.origin)
  if (!Number.isFinite(origin)) {
    return yield* malformed(["origin"], input.origin, "one readable declared instant")
  }
  if (!Number.isSafeInteger(input.period) || input.period <= 0) {
    return yield* malformed(["period"], String(input.period), "a positive whole span between firings")
  }
  const value: HeartbeatSchedule = {
    v: 0,
    kind: "substrate-heartbeat-schedule",
    origin: new Date(origin).toISOString(),
    period: input.period,
  }
  return { value, digest: yield* digestOf(value as unknown as WireValue) }
})

/**
 * The claimed time of the n-th firing of a declared schedule.
 *
 * Arithmetic over declared data, and the reason the tick body is duplicate-safe
 * at all: two emitters racing on firing n do not each read a clock and disagree,
 * they each compute the same instant from the same declaration. It is spelled
 * back out through the same canonical instant form the origin took, so the field
 * has one spelling rather than one per emitter's formatting.
 */
export const claimedAt = (schedule: HeartbeatSchedule, firing: number): string =>
  new Date(Date.parse(schedule.origin) + firing * schedule.period).toISOString()

/**
 * Mints one tick fact from an occurrence and a health reading.
 *
 * Pure, total, and reaching nothing: given the same occurrence and the same
 * reading it returns the same value, so two emitters produce the same bytes and
 * the second landing is absorbed rather than counted.
 */
export const tickFact = (
  schedule: DeclaredSchedule,
  occurrence: { readonly session: Digest; readonly firing: number },
  reading: HealthReading,
): HeartbeatTick => ({
  v: 0,
  kind: "substrate-heartbeat-tick",
  session: occurrence.session,
  schedule: schedule.digest,
  firing: occurrence.firing,
  claimed: claimedAt(schedule.value, occurrence.firing),
  health: reading.health,
  healthSource: reading.healthSource,
})

/** The occurrence one tick names — the triple, and nothing observed. */
export const occurrenceOf = (tick: HeartbeatTick): Occurrence => ({
  session: tick.session,
  schedule: tick.schedule,
  firing: tick.firing,
})

/** One occurrence's name: the digest of the triple that identifies it. */
export const occurrenceName = (occurrence: Occurrence): Effect.Effect<Digest, Refusal> =>
  digestOf({
    v: 0,
    kind: "substrate-heartbeat-occurrence",
    session: occurrence.session,
    schedule: occurrence.schedule,
    firing: occurrence.firing,
  } as unknown as WireValue)

/**
 * What the pinned client itself says about one connection's health.
 *
 * Three predicates the client answers about its own state, and no fourth
 * reaching for anything the substrate would have to be asked for. The
 * provenance is `client-observed` because that is what this is; the daemon
 * posture supplies the same shape with the other provenance and the schema does
 * not move.
 */
export const clientHealth = (connection: NatsConnection): HealthReading => ({
  health: connection.isClosed() ? "closed" : connection.isDraining() ? "draining" : "open",
  healthSource: "client-observed",
})

/**
 * What one seat needs in order to turn firings into facts.
 *
 * The landing is a parameter carrying its own requirement rather than a lane
 * this module reaches: the seat mints and hands over, exactly as the status
 * pump does, and a seat that opened its own carriage would be a second landing
 * path onto a lane that already has one.
 */
export interface HeartbeatSeatTerms<Landing = never> {
  /** The declared schedule this seat holds. */
  readonly schedule: DeclaredSchedule
  /**
   * The session each firing cites, read at the firing.
   *
   * It is an effect rather than a value because a reconnect mints a successor
   * session, and a seat that cited the session it was built with would keep
   * emitting evidence about a connection that no longer exists.
   */
  readonly session: Effect.Effect<Digest>
  /** The health reading each firing carries, taken at the firing. */
  readonly health: Effect.Effect<HealthReading>
  /** Where the minted fact goes; the seat never lands anything itself. */
  readonly land: (tick: HeartbeatTick) => Effect.Effect<void, Refusal, Landing>
}

/** One attached seat: its body, one firing on demand, and the count so far. */
export interface HeartbeatSeat<Landing = never> {
  /** Fires forever on the declared period; the seat's whole body. */
  readonly run: Effect.Effect<void, Refusal, Landing>
  /** Fires exactly once, minting and landing the next occurrence. */
  readonly fire: Effect.Effect<HeartbeatTick, Refusal, Landing>
  /** How many firings this seat has emitted. */
  readonly firings: Effect.Effect<number>
}

/**
 * Attaches one heartbeat seat.
 *
 * Firing numbers come from the seat's own successor — n, then n+1 — and never
 * from a clock reading, so a seat resumed against a recorded count continues
 * the same occurrence sequence rather than re-deriving one from elapsed time.
 * The pacing is `Schedule.spaced` over the declared period: the period is
 * declared data read out of the schedule, so the one place the seat consults
 * time is bounded by a value the truth plane carries.
 */
export const attachHeartbeatSeat = Effect.fn("Heartbeat.attach")(function* <Landing>(
  terms: HeartbeatSeatTerms<Landing>,
): Effect.fn.Return<HeartbeatSeat<Landing>, never, Scope.Scope> {
  const firings = yield* Ref.make(0)
  const fire = Effect.gen(function* () {
    const firing = yield* Ref.updateAndGet(firings, (count) => count + 1)
    const tick = tickFact(
      terms.schedule,
      { session: yield* terms.session, firing },
      yield* terms.health,
    )
    yield* terms.land(tick)
    return tick
  })
  return {
    fire,
    firings: Ref.get(firings),
    run: Effect.repeat(fire, Schedule.spaced(terms.schedule.value.period)).pipe(Effect.asVoid),
  }
})
