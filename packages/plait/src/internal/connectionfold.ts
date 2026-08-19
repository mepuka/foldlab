/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect, Match, Stream } from "effect"

import { structuralRefusal, type Next, type Refusal } from "../truth/Refusal.js"
import type { SessionFact } from "./sessionfacts.js"
import type { MachinePosition, StatusEventRow } from "./statusvocabulary.js"
import { CONNECTION_TRANSITIONS, statusRowFor, transitionRowFor } from "./statusvocabulary.js"
import type { PositionedEvent } from "./successors.js"

/**
 * The connection machine as a read: per session, the state the landed facts
 * support, and how far the fold read to support it.
 *
 * The machine itself is proved elsewhere and transcribed here from nothing. Its
 * shape is the ruled one — the eleven-symbol alphabet split into seven
 * transitions and four readings, a table total over that alphabet, the terminal
 * absorbing everything, a reading holding the state it is read within, a
 * transition landing in the state its own event names, and an initial state
 * named by no event because establishment is not a status event but the session
 * fact itself. That shape is stated once, in the substrate model beside this
 * package (`Substrate/Definitions.lean`, `lawfulTarget` and `run`), and proved
 * there; what this module does is WALK it over facts.
 *
 * **The machine arrives as data and is never re-spelled.** Every state name,
 * every event word and the placement of each comes out of the transcribed
 * tables next door, which are themselves absorbed from the wire vocabulary's
 * own status group. There is no event name and no state name written by hand in
 * this module, and there is no default arm: a word is either a row of the table
 * or it is a word this estate has not transcribed, and the fold refuses rather
 * than guessing where it lands. A hand-typed event name here would be the
 * second statement of a table that already exists, which is exactly the drift
 * the vocabulary discipline was built to refuse.
 *
 * **This fold never says live.** It reports the last state the facts it walked
 * support, and nothing about now: a connection whose last landed fact was a
 * drop reads as dropped whether it came back a second later or never. What is
 * missing from a read is the distance between the fold's position and the
 * lane's head, and that distance is a POSITION difference the reader computes,
 * never an age this module invents. No clock is consulted on any path below,
 * and the staleness question — how far behind a session's own evidence is —
 * belongs to the heartbeat read, which is separate and stays separate.
 *
 * **The lane IS the log.** The substrate's own events reach this estate as
 * facts, minted by the one status pump and landed through the one emit onto the
 * session lane; folding those facts is how the estate knows what a connection
 * did. Diagnostics are a different register entirely: the spans this module
 * opens, whatever a console prints, and whatever the vendor's server writes to
 * its own log are EVIDENCE MACHINERY — they help a human or an agent see what
 * ran, they are never read back into meaning, and nothing here is load-bearing
 * on any of them. A trace, in the estate's sense, is the causal chain of facts
 * reachable by digest from a root; this fold is the first named view over one
 * such chain — a session's own facts, in lane order, reduced to where its
 * machine stands.
 *
 * **Read-side only.** Nothing here arbitrates, retries, emits, or reacts. The
 * fold answers and the answer is a value; acting on it is a fenced decide that
 * lives nowhere in this package.
 *
 * **Positions are per-partition coordinates, so this fold never sorts and never
 * compares two sessions' positions.** The session lane partitions by the
 * session digest, so one session's facts occupy one dense sequence and the
 * order they were read in IS oldest-first; two sessions' positions come from
 * two sequences and are not comparable at all. A fold that sorted its input by
 * position would be interleaving eight independent sequences into one order no
 * reader ever saw, which is why the walk takes the facts in the order the
 * caller read them and reports each session's position as its own.
 */

/**
 * One connection's reading: where its machine stands, and how far the fold read.
 *
 * `state` is `null` at the initial position — the model's own initial state,
 * which is named by no event because establishment is not a status event. It is
 * the absence of a transition, not a made-up name for being connected.
 *
 * `position` is the lane position of the last fact this fold consumed for the
 * session, and it is `null` when the fold consumed none. The pair is what keeps
 * an unknown session distinguishable from an established and quiet one: a
 * session no fact cited reads as `null` state at `null` position, and a session
 * whose establishment landed and which has moved nowhere since reads as `null`
 * state at the position that establishment landed at.
 */
export interface ConnectionReading {
  /** The session digest as the facts carry it, admitted by the lane's own schema. */
  readonly session: string
  /** The state the walked facts support, or the initial position. */
  readonly state: MachinePosition
  /** The lane position of the last fact consumed; `null` when none was. */
  readonly position: number | null
}

/**
 * One step of the fold: what one delivered fact did to one session's machine.
 *
 * `event` is the transcribed word the table was walked with, and it is `null`
 * where the fact carries no word for the machine to read. `moved` is exactly
 * `from !== to` and is carried so that "each transition as it lands" is a
 * filter a reader can apply rather than a rule a reader has to remember: a
 * reading, a duplicate, and anything at all after the terminal all report
 * `false`, because none of them moved the machine.
 */
export interface ConnectionStep {
  /** The session digest the consumed fact cites. */
  readonly session: string
  /** The lane position the consumed fact landed at. */
  readonly position: number
  /** The transcribed word fed to the table, or `null` where the fact names none. */
  readonly event: string | null
  /** Where the machine stood before this fact. */
  readonly from: MachinePosition
  /** Where the machine stands after it. */
  readonly to: MachinePosition
  /** Whether this step moved the machine; exactly `from !== to`. */
  readonly moved: boolean
}

const teachTheTranscription: ReadonlyArray<Next> = [{
  subject: "Connection.read",
  note:
    "Fold facts whose event word the transcribed status vocabulary places. A word that reached the lane from outside that vocabulary is transcribed into the table before anything folds it, so the state it lands in is read rather than guessed.",
}]

/**
 * The one refusal this fold mints: the table carries no row for what a fact
 * named.
 *
 * Minted from one literal and reached from both sites that can hit it — a fact
 * carrying an event word the transcription does not place, and a teardown fact
 * the machine table places no emission for. Both are the same fact about the
 * world: the fold was handed a word the table is silent about, and a fold that
 * held the state instead would be repairing its input into a different value.
 */
const unplaced = (path: ReadonlyArray<string>, got: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A connection state is folded only from words the transcribed status vocabulary places; a word the table carries no row for names no landing to read.",
    path,
    got,
    expected: "a word the transcribed status vocabulary places",
    next: teachTheTranscription,
  })

/**
 * Whether a position is the machine's absorbing one, read off the table's own
 * column rather than compared against a name.
 *
 * The initial position matches no row, which is the correct answer twice over:
 * it is not the terminal, and it is not spelled like a state at all.
 */
const absorbing = (state: MachinePosition): boolean =>
  CONNECTION_TRANSITIONS.some((row) => row.state === state && row.absorbing)

/**
 * The word the machine table places on the fact form that carries a teardown.
 *
 * The pump lands the terminal transition as the session-ended fact rather than
 * as a transition fact, because the record already had a form for "this
 * connection is over". So the fold reads that fact back through the row whose
 * emission column names it — the word travels out of the table, and the fold
 * would never reach the terminal from the lane without it. A table placing no
 * such emission leaves the fold with nothing to walk, and it says so.
 */
const terminalWord: Effect.Effect<string, Refusal> = (() => {
  const emitting = CONNECTION_TRANSITIONS.filter((row) => row.emits === "ended")
  const only = emitting.length === 1 ? emitting[0] : undefined
  return only === undefined
    ? Effect.fail(unplaced(["kind"], "the machine table places no terminal emission"))
    : Effect.succeed(only.event)
})()

/**
 * Where the ratified machine lands one transcribed row from one position: the
 * terminal absorbs everything, a reading holds the state it is read within, and
 * a transition lands in the state its own event names.
 *
 * This is the model's own transition rule, and every name in it is read off the
 * table: the terminal is whichever row declares itself absorbing, the landing
 * is the matched row's own state column, and a row the machine table does not
 * carry is a reading by construction rather than by a list kept beside the
 * table.
 *
 * The admissible-predecessor column is deliberately NOT consulted. The machine
 * is total over its alphabet from every state, and a status event is the
 * client's own evidence: evidence is never refused, and never re-aimed, for
 * arriving in an order a table did not expect. What the fold reports is the
 * state the event names, whatever it left.
 */
export const lawfulTarget = (from: MachinePosition, row: StatusEventRow): MachinePosition => {
  if (absorbing(from)) return from
  const moving = transitionRowFor(row.type)
  return moving === undefined ? from : moving.state
}

/**
 * The word one session fact hands the machine, or `null` where it hands none.
 *
 * A fold over the fact union, closed by the compiler: a variant added to the
 * lane's vocabulary tomorrow is an arm this record is missing, and a variant
 * the union does not carry is an arm no one can spell. There is no default and
 * no fallthrough, which is what makes "which facts the machine reads" a
 * decision recorded in the type rather than an omission nobody notices.
 *
 * Two variants hand the machine nothing, each for its own reason. An
 * establishment is not a status event — it is the session fact itself, and the
 * position it leaves the machine at is the initial one the model names. The
 * drain disposition is a fact about a server incarnation minted by the side
 * that runs the server, not a reading taken from THIS connection's status
 * source; the client's own status source reports the same disposition through
 * its own transcribed row, and a fold that consumed both would move one
 * disposition twice.
 */
const wordOf: (fact: SessionFact) => Effect.Effect<string | null, Refusal> = Match.type<
  SessionFact
>().pipe(
  Match.discriminatorsExhaustive("kind")({
    "substrate-session-established": () => Effect.succeed(null),
    "substrate-session-ended": () => terminalWord,
    "substrate-session-transition": (fact) => Effect.succeed(fact.event),
    "substrate-session-observation": (fact) => Effect.succeed(fact.event),
    "substrate-incarnation-lame-duck": () => Effect.succeed(null),
  }),
)

/**
 * One step of the fold: a position, a delivered fact, and where the machine
 * stands after it.
 *
 * The alphabet is consulted first and the transition rule second, which is the
 * model's own order: its table is indexed by state AND symbol, so a symbol
 * outside the alphabet has no row from any state — the terminal included — and
 * the walk stops rather than absorbing something it never admitted. Only once a
 * row is in hand does the rule apply.
 */
export const stepConnection = Effect.fn("Connection.step")(function* (
  from: MachinePosition,
  delivered: PositionedEvent<SessionFact>,
): Effect.fn.Return<ConnectionStep, Refusal> {
  const word = yield* wordOf(delivered.event)
  const row = word === null ? undefined : statusRowFor(word)
  if (word !== null && row === undefined) {
    return yield* unplaced([String(delivered.position), "event"], word)
  }
  const to = row === undefined ? from : lawfulTarget(from, row)
  return {
    session: delivered.event.session,
    position: delivered.position,
    event: word,
    from,
    to,
    moved: from !== to,
  }
})

/**
 * One session's connection state, folded from that session's own facts.
 *
 * The walk is oldest-first over the facts as the caller read them, which for
 * one session is lane order, because the lane partitions by session and one
 * partition is one dense sequence. Facts citing other sessions are passed over
 * rather than folded: a fold answers about the facts it walked, so a word the
 * table is silent about on a NEIGHBOURING session refuses the snapshot below
 * and does not refuse this read.
 */
export const connectionOf = Effect.fn("Connection.read")(function* (
  delivered: ReadonlyArray<PositionedEvent<SessionFact>>,
  session: string,
): Effect.fn.Return<ConnectionReading, Refusal> {
  let state: MachinePosition = null
  let position: number | null = null
  for (const one of delivered) {
    if (one.event.session !== session) continue
    // Annotated rather than inferred: the accumulator is assigned from the step
    // and the step is computed from the accumulator, which is a cycle the
    // checker declines to resolve on its own.
    const step: ConnectionStep = yield* stepConnection(state, one)
    state = step.to
    position = step.position
  }
  return { session, state, position }
})

/**
 * Every session these facts know about, with the state each one's machine
 * stands in.
 *
 * Known means cited: a session enters the snapshot when a fact names it, so a
 * lane read from a position after an establishment still reports the session,
 * at whatever state its later facts support. Rows come back ordered by session
 * name so two readers holding the same facts read the same list rather than the
 * same set in two orders.
 */
export const connectionsOf = Effect.fn("Connection.snapshot")(function* (
  delivered: ReadonlyArray<PositionedEvent<SessionFact>>,
): Effect.fn.Return<ReadonlyArray<ConnectionReading>, Refusal> {
  const readings = new Map<string, ConnectionReading>()
  for (const one of delivered) {
    const known = readings.get(one.event.session)
    const step = yield* stepConnection(known === undefined ? null : known.state, one)
    readings.set(step.session, {
      session: step.session,
      state: step.to,
      position: step.position,
    })
  }
  return [...readings.values()].sort((left, right) => (left.session < right.session ? -1 : 1))
})

/**
 * The stream face of the fold: one element per delivered fact, carrying the
 * step that fact took.
 *
 * The same shape the session seam's own change stream has — an element is one
 * step, the state is threaded by the stream rather than held by the caller, and
 * the stream never closes itself because a fold names a position, not a
 * lifetime. Pacing, batching and debounce are the consumer's and are not
 * promised here.
 *
 * The threaded state is a map from session to position, so one stream carries
 * every session on the lane and each one's machine advances only on its own
 * facts.
 */
export const connectionChanges = <E, R>(
  delivered: Stream.Stream<PositionedEvent<SessionFact>, E, R>,
): Stream.Stream<ConnectionStep, E | Refusal, R> =>
  delivered.pipe(
    Stream.mapAccumEffect(
      () => new Map<string, MachinePosition>(),
      (states, one) =>
        Effect.map(
          stepConnection(states.get(one.event.session) ?? null, one),
          (step) => [states.set(step.session, step.to), [step]] as const,
        ),
    ),
  )

/**
 * The same stream with the steps that moved nothing filtered out: each
 * transition as it lands.
 *
 * Derived from the fold's steps rather than folded a second way, so a reader
 * that wants the readings too takes the stream above and loses nothing.
 */
export const connectionTransitions = <E, R>(
  delivered: Stream.Stream<PositionedEvent<SessionFact>, E, R>,
): Stream.Stream<ConnectionStep, E | Refusal, R> =>
  Stream.filter(connectionChanges(delivered), (step) => step.moved)
