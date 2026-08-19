/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import { declare, laneHandle, type DeclaredLane } from "../planes/Lane.js"

/**
 * The seat vocabulary: what one spawned seat's life produces as facts, how a
 * seat is named, and the lane that carries both.
 *
 * A SEAT is one party the estate brought up because an admitted spawn said to.
 * The kernel's spawn lands nothing — the model interprets it as world-identity,
 * so the language records that a speaker was minted and records no speaker —
 * and this vocabulary is the harness's own testimony about what it did with
 * that sentence. The relation is the status pump's, exactly: the substrate says
 * a connection changed, the pump lands a fact saying so, and nothing pretends
 * the substrate landed it.
 *
 * **Two facts, and nothing is ever retracted.** An opening fact names one seat,
 * the writ it speaks under, and the spawn that called for it; a retirement fact
 * names the same seat, the way its one run ended, and where the run's trace
 * landed. A seat whose holder dies leaves the opening fact exactly as it lies:
 * crash is not a fact, so an unretired seat is what a dead seat looks like, and
 * inferring retirement from a lane going quiet would be forging the second one.
 *
 * **A seat is named by the spawn that called for it, never by a mint.** The
 * name is the digest of the seat value below, which cites the landed trace fact
 * that carried the spawn and the program node the spawn stood at. Both are
 * already-landed coordinates, so two parties reading one trace name one seat
 * with no I/O and no agreement — which is what makes bringing the same seat up
 * twice absorbable rather than a race, and what makes a redelivered trace one
 * seat rather than two.
 *
 * **The route carries no estate-invented word.** The handle IS the digest of
 * the declared event form, exactly as the substrate-session, heartbeat, and
 * run-trace lanes derive theirs, so the subject the wire sees is a function of
 * a declaration rather than a name this package chose.
 *
 * **Keyed by the seat, because that is what has an order.** One seat's opening
 * and retirement route to one partition and read in the order they landed. Two
 * seats' positions come from two sequences and are not comparable, which is the
 * reading every lane in this package takes of its own partitions.
 *
 * **Nothing here lands anything.** Landing a seat fact is a judged emit through
 * the one door and belongs where the engine is reached; this module is the
 * shape, the name, and the route.
 */

/** One seat's opening, as the fact that announces it. */
export const SPAWN_SEAT_OPENED = "spawn-seat-opened"

/** One seat's retirement, as the fact that announces it. */
export const SPAWN_SEAT_RETIRED = "spawn-seat-retired"

/** The value whose digest names one seat; never a fact, and never landed. */
export const SPAWN_SEAT_NAME = "spawn-seat"

/**
 * How many partitions the seat lane declares.
 *
 * A seat keys the lane, so this number is how widely unrelated seats spread and
 * never how one seat's own two facts are ordered — one seat's life lands on one
 * partition however many there are.
 */
export const SPAWN_SEAT_PARTITIONS = 8

/**
 * The declared event form for the seat lane.
 *
 * Its digest is both the lane's admitted event-schema digest and its route
 * handle, so a party holding this record reproduces the route with no I/O and
 * no access to this module's runtime. The variant list is ADD-ONLY for the
 * reason every declared roster in this package is: the form's digest is the
 * route, so appending moves the route visibly while rewriting one in place
 * would move it silently.
 */
export const SPAWN_SEAT_EVENT_FORM = {
  v: 0,
  kind: "spawn-seat-event",
  variants: [
    {
      kind: SPAWN_SEAT_OPENED,
      fields: ["seat", "writ", "trace", "node", "request"],
    },
    {
      kind: SPAWN_SEAT_RETIRED,
      fields: ["seat", "writ", "outcome", "landing", "trace"],
    },
  ],
} as const

/**
 * The value one seat's name is the digest of.
 *
 * `trace` is the landed run-trace fact that carried the admitted spawn and
 * `node` is the program node the spawn stood at, written as the trace writes
 * it. The pair is a coordinate inside an immutable value, so the name is a
 * function of what landed and of nothing else — no counter, no clock, and no
 * minted identifier, none of which the door would admit into a sentence anyway.
 */
export const SpawnSeatName = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal(SPAWN_SEAT_NAME),
  trace: Digest,
  node: Schema.String,
})

/** The value one seat's name is the digest of. */
export type SpawnSeatName = typeof SpawnSeatName.Type

/**
 * One seat's opening, naming the writ it speaks under.
 *
 * This is the first act a seat lands, and the writ rides it because that is the
 * whole claim: a seat brought up for an admitted spawn speaks under the policy
 * that spawn requested, and a reader holding this fact resolves the policy
 * rather than inferring it. `request` is the model identity label the admitted
 * sentence named, written exactly, so a reader can check the writ against the
 * spawn without holding this consumer's translation.
 */
export const SeatOpened = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal(SPAWN_SEAT_OPENED),
  seat: Digest,
  writ: Digest,
  trace: Digest,
  node: Schema.String,
  request: Schema.String,
})

/** One seat's opening, naming the writ it speaks under. */
export type SeatOpened = typeof SeatOpened.Type

/**
 * One seat's retirement, naming how its run ended and where the record is.
 *
 * `outcome` is the run's own word — the three ways a program run can end — and
 * `landing` is what became of writing that run's trace down, which is a
 * different question with a different answer: a run that ended perfectly well
 * may have had its trace refused at the door or lost to a seam. `trace` carries
 * the identity the trace fact landed at and is null exactly when it did not
 * land, which is why the three fields stand together rather than one standing
 * in for the others.
 *
 * Both words are carried as TEXT rather than as literal unions. Each is already
 * spelled where its concept lives — the run outcome by the run-trace form, the
 * landing by the fold over the trace landing — and a closed union restated here
 * would be a third statement of a vocabulary this fact only passes through.
 */
export const SeatRetired = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal(SPAWN_SEAT_RETIRED),
  seat: Digest,
  writ: Digest,
  outcome: Schema.String,
  landing: Schema.String,
  trace: Schema.NullOr(Digest),
})

/** One seat's retirement, naming how its run ended and where the record is. */
export type SeatRetired = typeof SeatRetired.Type

/** Every fact the seat lane carries: one seat, two moments. */
export const SeatFact = Schema.Union([SeatOpened, SeatRetired])

/** Every fact the seat lane carries. */
export type SeatFact = typeof SeatFact.Type

/**
 * Names one seat: the digest of the coordinate the spawn was sighted at.
 *
 * Reproducible by any party holding the trace, which is what makes the name a
 * fence rather than a bookkeeping key — two consumers reading one redelivered
 * trace compute one name and the second bring-up is absorbed, with nothing
 * exchanged between them.
 */
export const seatName = Effect.fn("SpawnSeat.name")(function* (
  trace: DigestValue,
  node: string,
): Effect.fn.Return<DigestValue, Refusal> {
  const value: SpawnSeatName = { v: 0, kind: SPAWN_SEAT_NAME, trace, node }
  return yield* digestOf(value as unknown as WireValue)
})

/** The digest of the declared event form, which is also the lane's handle. */
export const spawnSeatEventSchema: Effect.Effect<DigestValue, Refusal> = digestOf(
  SPAWN_SEAT_EVENT_FORM as unknown as WireValue,
)

/**
 * Declares the seat lane.
 *
 * Keyed by the seat digest, so a seat's opening and retirement land on one
 * partition and read in the order they happened — the same reading the
 * substrate-session lane takes of one connection's facts.
 */
export const spawnSeatLane = Effect.fn("SpawnSeatLane.declare")(function* (): Effect.fn.Return<
  DeclaredLane<SeatFact, typeof SPAWN_SEAT_PARTITIONS>,
  Refusal
> {
  const eventSchema = yield* spawnSeatEventSchema
  return yield* declare({
    handle: yield* laneHandle(eventSchema),
    event: SeatFact,
    eventSchema,
    partitions: SPAWN_SEAT_PARTITIONS,
    partitionKey: { path: ["seat"] },
  })
})
