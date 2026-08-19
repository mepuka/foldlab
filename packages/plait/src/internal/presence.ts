/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect, Reducer } from "effect"

import { commutative, declare as declareAlgebra, type CommutativeAlgebra, type RungName } from "../truth/Algebra.js"
import type { WireValue } from "../truth/Canonical.js"
import type { Refusal, StructuralRefusal } from "../truth/Refusal.js"
import type { Anchor } from "../planes/Anchor.js"
import type { Contribution, DeclaredFold } from "../planes/Fold.js"
import { declare as declareFold } from "../planes/Fold.js"
import type { DeclaredLane } from "../planes/Lane.js"
import type { HeartbeatTick } from "./heartbeat.js"
import type { SessionFact } from "./sessionfacts.js"
import type { PositionedEvent } from "./successors.js"

/**
 * Presence and staleness: the two questions the session and heartbeat lanes
 * answer, as declared folds read at an anchor.
 *
 * Neither read asks the substrate anything. "Who is connected" is a reduction
 * over session facts, not a query against the broker's connection table, not a
 * read of a monitoring endpoint, and not a system-account subscription — at
 * this estate's pins those are not the elegant option, they are not available
 * at all. "How stale is this session" is arithmetic over positions on the
 * heartbeat lane. No clock appears on either side of either read.
 *
 * **Presence is lossy in exactly one direction and says so.** A process killed
 * with signal 9 emits no ended fact, so membership persists while the heartbeat
 * lane stops advancing for it. That is ABSENCE, read off silence, and it is the
 * honest reading. What is never available is the other direction: no read here
 * reports a session as connected-and-current when its heartbeat lane has
 * stopped advancing, and no session lacking an established fact is ever a
 * member. The broker's connection table has the dual failure — it shows
 * connections the server has not yet reaped — and that is why it is refused as
 * an oracle rather than merely unused.
 *
 * **What this module deliberately cannot do.** It emits no verdict. There is no
 * timeout here, no eviction, no liveness claim, and no predicate that mentions
 * absence or a deadline: acting on silence is a fenced decide belonging to a
 * supervisor, fed by tick facts, and the door refuses the trigger that would
 * try to say it here. `stalenessOf` returns a reading and a tolerance
 * comparison; the reading is evidence and the comparison is the READER's, never
 * a decision this module made on anyone's behalf.
 */

/**
 * The rung the presence reduction stands at, and therefore the plane it may
 * read.
 *
 * Commutative and idempotent, over a bottom: hearing one establishment twice
 * means what hearing it once means, and the order two establishments arrive in
 * decides nothing. Those are exactly the erasures the set plane makes, so this
 * rung is what licenses the set-plane carrier — the rung types the carrier,
 * rather than a carrier being chosen and a rung asserted afterwards. The
 * fabric model's join-semilattice package is the proved law behind the join and
 * is cited here rather than restated.
 *
 * The ladder ships one branding door and it brands the rung below this one, so
 * the type-level brand this rung would carry does not yet exist to be attached.
 * The rung is therefore EARNED by executing the ladder's own atom suite over
 * this algebra — the same predicates, walked from the same table — and the wall
 * beside this module runs that execution rather than asserting the result.
 */
export const PRESENCE_RUNG: RungName = "bounded-semilattice"

/**
 * Which reading of "absent by silence" the estate's readers take.
 *
 * **This is an open pin, and it is the operator's.** The reduction below is
 * membership — established and not ended — and that reduction alone cannot
 * express silence: after a hard kill there is no ended fact, so membership
 * persists. Two readings are available and neither is this seat's to choose:
 *
 * - `composed-at-the-reader` — presence returns membership and the reader
 *   composes it with the staleness read, so "absent by silence" is what the
 *   pair says together; or
 * - `carried-with-each-member` — the presence read carries each member's
 *   staleness, so one read exhibits the silence directly.
 *
 * Both are constructed below and {@link presenceAt} returns both shapes, so
 * ruling this pin is an edit to this one declaration and to nothing else. No
 * third state is invented: under either reading a member is a member, and the
 * silence is a separate number rather than a new kind of membership.
 */
export type SilenceReading = "composed-at-the-reader" | "carried-with-each-member"

/** The reading the estate's readers take today; the operator's to rule. */
export const SILENCE_READING: SilenceReading = "carried-with-each-member"

/**
 * The presence fold's state: two accumulating sets, never a membership verdict.
 *
 * Both halves grow and neither is ever edited, which is what makes the join
 * idempotent and commutative. Membership is READ off the pair — established
 * minus ended — rather than stored, because storing it would mean an ended fact
 * arriving before its establishment could remove something that was never
 * added, and the arrival order would then decide the value.
 */
export interface PresenceState {
  readonly v: 0
  readonly kind: "substrate-presence"
  readonly established: ReadonlyArray<string>
  readonly ended: ReadonlyArray<string>
}

const union = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => [...new Set([...left, ...right])].sort()

/** The bottom: nothing established, nothing ended. */
export const PRESENCE_BOTTOM: PresenceState = {
  v: 0,
  kind: "substrate-presence",
  established: [],
  ended: [],
}

/** The pointwise set union of two presence states. */
export const joinPresence = (left: PresenceState, right: PresenceState): PresenceState => ({
  v: 0,
  kind: "substrate-presence",
  established: union(left.established, right.established),
  ended: union(left.ended, right.ended),
})

/** Declares the presence algebra and earns the commutative brand its lane demands. */
export const presenceAlgebra: Effect.Effect<
  CommutativeAlgebra<PresenceState>,
  StructuralRefusal
> = declareAlgebra<PresenceState>({
  declaration: { name: "substrate-presence-join", version: 0 },
  reducer: Reducer.make<PresenceState>(joinPresence, PRESENCE_BOTTOM),
}).pipe(
  Effect.flatMap((algebra) =>
    commutative(algebra, {
      // Seeded states drawn from a small alphabet, so distinct triples are
      // reachable and the derived cases genuinely overlap: a suite whose
      // generated sets never intersect would earn idempotence for free.
      arbitrary: (seed) => {
        const digits = Math.abs(seed) % 8
        const members = ["a", "b", "c"].filter((_, index) => (digits >> index & 1) === 1)
        return {
          v: 0,
          kind: "substrate-presence",
          established: members,
          ended: (digits & 4) === 4 ? members.slice(0, 1) : [],
        }
      },
      equals: (left, right) =>
        left.established.join(",") === right.established.join(",") &&
        left.ended.join(",") === right.ended.join(","),
    })
  ),
)

/**
 * The per-event contribution: what one session fact adds to presence.
 *
 * Exactly two of the four session facts contribute anything. An establishment
 * adds its session to the established half; a teardown adds it to the ended
 * half. A transition and a reading contribute the algebra's own bottom, which
 * is the identity law executing rather than a skip written beside the fold.
 *
 * **A heartbeat contributes nothing here, and cannot.** This contribution is
 * over the session lane's facts, and a tick is not one of them: a fold that
 * inferred membership from a heartbeat would be reading liveness out of
 * evidence that never claimed identity, and the wall beside this module plants
 * exactly that mutant and kills it.
 */
export const presenceContribution: Contribution<SessionFact, PresenceState> = {
  declaration: {
    v: 0,
    kind: "substrate-presence-contribution",
    establishes: "substrate-session-established",
    ends: "substrate-session-ended",
  },
  apply: (fact) =>
    fact.kind === "substrate-session-established"
      ? { v: 0, kind: "substrate-presence", established: [fact.session], ended: [] }
      : fact.kind === "substrate-session-ended"
      ? { v: 0, kind: "substrate-presence", established: [], ended: [fact.session] }
      : PRESENCE_BOTTOM,
}

/** Declares the presence fold over one session lane. */
export const presenceFold = Effect.fn("Presence.declare")(function* (
  lane: DeclaredLane<SessionFact, 8>,
): Effect.fn.Return<DeclaredFold<SessionFact, PresenceState, 8>, Refusal> {
  return yield* declareFold({
    lane,
    algebra: yield* presenceAlgebra,
    contribution: presenceContribution,
  })
})

/**
 * The membership a presence state denotes: established, and not ended.
 *
 * Sorted, so two readers holding the same state read the same list rather than
 * the same set in two orders.
 */
export const membersOf = (state: PresenceState): ReadonlyArray<string> => {
  const ended = new Set(state.ended)
  return state.established.filter((session) => !ended.has(session)).sort()
}

/**
 * One session's staleness on the heartbeat lane, and the tolerance a reader
 * brought.
 *
 * `staleness` is `null` when no tick citing the session was ever read, which is
 * the honest absence of a reading rather than a staleness of zero. `current` is
 * false in that case for the same reason: a session nothing was ever heard from
 * is not current, and calling its silence fresh is the exact lie this reading
 * exists to make unavailable.
 */
export interface StalenessReading {
  /** The head of the heartbeat lane the read was taken against. */
  readonly head: number
  /** The greatest firing citing this session, and where it landed. */
  readonly firing: number | null
  readonly position: number | null
  /** Head minus that position; `null` when nothing was ever heard. */
  readonly staleness: number | null
  /** The reader's own tolerance, carried so a reading says what it was judged by. */
  readonly tolerance: number
  /** Whether this session is within the reader's tolerance. Never true on silence. */
  readonly current: boolean
}

/**
 * The staleness read: the head of the heartbeat lane minus the greatest firing
 * citing one session.
 *
 * Positional, and licensed by a positioned carrier: the ticks arrive with the
 * positions they landed at, and the read subtracts them. No clock is consulted
 * on either side, and the tick's own claimed field is never touched — reading
 * it would put a clock inside meaning, and the wall plants that mutant.
 *
 * **Ties go to the later landing, and that is what makes the read duplicate-
 * safe.** Two landings of one occurrence carry the same firing, so the walk
 * takes the position the evidence most recently reached rather than the
 * position it first reached: a duplicate that lands at the head leaves the
 * distance from the head where it was. Taking the earlier landing instead would
 * be equally deterministic and would make a re-landed tick look one position
 * staler than the tick it repeats, which is a duplicate changing a read that
 * duplicates are supposed to be free in.
 *
 * The tolerance is the READER's parameter and nothing here decides with it. A
 * reading that falls outside it is a reading, not a verdict; the verdict on
 * silence is a supervisor's fenced decide and does not live in this package.
 */
export const stalenessOf = (
  ticks: ReadonlyArray<PositionedEvent<HeartbeatTick>>,
  head: number,
  session: string,
  tolerance: number,
): StalenessReading => {
  let greatest: PositionedEvent<HeartbeatTick> | undefined
  for (const tick of ticks) {
    if (tick.event.session !== session) continue
    if (greatest === undefined || tick.event.firing >= greatest.event.firing) greatest = tick
  }
  if (greatest === undefined) {
    return { head, firing: null, position: null, staleness: null, tolerance, current: false }
  }
  const staleness = head - greatest.position
  return {
    head,
    firing: greatest.event.firing,
    position: greatest.position,
    staleness,
    tolerance,
    current: staleness <= tolerance,
  }
}

/** One member of a presence read, carrying its own silence. */
export interface PresenceMember {
  readonly session: string
  readonly staleness: StalenessReading
}

/**
 * One presence read, taken at an anchor.
 *
 * `membership` is the reduction's own answer and `members` is that answer with
 * each member's staleness beside it — the two readings the open pin names, both
 * constructed, so ruling the pin moves one declaration and no code.
 * `staleness` is the read's OWN honest staleness: the session lane's head minus
 * the anchor the fold was read at.
 */
export interface PresenceReading {
  readonly anchor: Anchor
  readonly state: PresenceState
  readonly head: number
  readonly staleness: number
  readonly membership: ReadonlyArray<string>
  readonly members: ReadonlyArray<PresenceMember>
  readonly reading: SilenceReading
}

/**
 * Reads presence at an anchor, with head-minus-anchor as the read's own
 * staleness.
 *
 * The anchor is the reader's. Nothing here waits for the lane to catch up and
 * nothing claims the read is current: a read at a floor behind the head is a
 * read of what was true by that floor, and the distance is reported rather than
 * closed.
 */
export const presenceAt = (input: {
  readonly anchor: Anchor
  readonly state: PresenceState
  readonly head: number
  readonly ticks: ReadonlyArray<PositionedEvent<HeartbeatTick>>
  readonly heartbeatHead: number
  readonly tolerance: number
}): PresenceReading => {
  const membership = membersOf(input.state)
  return {
    anchor: input.anchor,
    state: input.state,
    head: input.head,
    staleness: input.head - input.anchor.floor,
    membership,
    members: membership.map((session) => ({
      session,
      staleness: stalenessOf(input.ticks, input.heartbeatHead, session, input.tolerance),
    })),
    reading: SILENCE_READING,
  }
}

/**
 * The non-negotiable half of the open pin, as a computation rather than a
 * comment: every session this read would call connected-and-current.
 *
 * Under either reading of the pin, this list must never contain a session whose
 * heartbeat lane has stopped advancing past the reader's tolerance, and it can
 * never contain a session with no established fact — membership is the only
 * source of entries and only an establishment adds one.
 */
export const currentMembers = (reading: PresenceReading): ReadonlyArray<string> =>
  reading.members.filter((member) => member.staleness.current).map((member) => member.session)

/** The canonical bytes a presence state folds to, for a state-digest compare. */
export const presenceStateValue = (state: PresenceState): WireValue =>
  state as unknown as WireValue
