/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import type { NatsConnection, Status, Subscription } from "@nats-io/nats-core"
import { Effect, Queue, Scope, Stream } from "effect"

import type { Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import type { SessionFact, SessionPayload } from "./sessionfacts.js"
import { endedFact, mintSession, observationFact, transitionFact } from "./sessionfacts.js"
import type {
  EstateDeclaration,
  SubstrateDeclaration,
} from "./substrate.js"
import { substrateDeclarationOf } from "./substrate.js"
import type {
  MachinePosition,
  StatusEventRow,
  StatusField,
} from "./statusvocabulary.js"
import { statusRowFor, transitionRowFor } from "./statusvocabulary.js"

/**
 * The status pump: one connection's status source, consumed once, as a source
 * of facts.
 *
 * Nothing in this estate observed a connection changing state before this
 * module existed. The pinned client publishes a status source per connection
 * and it was read nowhere, so a connection that lost its substrate, retried,
 * exhausted its attempt budget and closed permanently did so invisibly. This
 * module is the one consumer of that source, and every event it observes
 * becomes either a transition fact or an observation on the session lane,
 * according to the transcribed tables next door.
 *
 * **It is built once, as a fact source, never twice as callbacks.** There is
 * one consumer per connection and the spine attaches it where the connection
 * is established, so no caller can arrange for a second one by accident. A
 * second one is a defect of this package rather than a refusal, and it dies as
 * one: the estate's domain language has no sentence for "you called the spine
 * wrong", and dressing a defect as a retryable absence is exactly what the
 * transport spine's own two-sided rule forbids.
 *
 * *What the second consumer would actually do, measured at the pin, and it is
 * not what the commissioning record assumed.* The client's status source fans
 * out: every call registers a fresh listener and the protocol pushes each
 * event to all of them. So a second consumer does not steal events and does
 * not silently lose facts — it DOUBLES them, minting every transition twice
 * and running a second successor chain against the same connection. The fence
 * stands, with its reason corrected: it exists against double-minting.
 *
 * **Nothing here branches on an event name.** The pump matches the value the
 * client sent against the transcribed rows and then reads what to do off the
 * row it matched. That is why the lame-duck row gets no reaction here: there
 * is no place to put one. This slice emits that fact; reacting to it belongs
 * to a process long-lived enough to move, and the transcription gate refuses
 * any per-event branch appearing in this module.
 *
 * **The position is declared and the pressure is real.** Facts leave through a
 * bounded queue, so a holder that stops draining stops the pump rather than
 * silently dropping the record of what happened. The client's own status
 * iterator buffers behind it, which is the only place a status event may wait.
 *
 * The seam tag is the rank this module actually holds, not the shape it looks
 * like: it reaches nothing on the state-carrier plane, mints truth-plane facts
 * out of a transcribed vocabulary, and hands them over as values. The durable
 * fold pump next door ranks a plane shallower because it reaches folds and
 * anchors; this one does not, and tagging it by resemblance rather than by its
 * edges would have put a cycle through the lane service.
 */

/** The bound on facts a pump holds before it stops reading its source. */
export const STATUS_PUMP_BUFFER_BOUND = 256

/** What one pump needs in order to mint the facts one connection produces. */
export interface StatusPumpTerms {
  /** The session live at the moment the pump attaches. */
  readonly session: Digest
  /** The declared connect-options digest; it does not move across a reconnect. */
  readonly options: Digest
  /** The estate's own declaration; it does not move across a reconnect. */
  readonly estate: EstateDeclaration
  /** Reads the substrate's declaration again, for a successor mint. */
  readonly declaration: Effect.Effect<SubstrateDeclaration, Refusal>
  /** The terminal cause the pin resolves; empty when it resolved without one. */
  readonly cause: Effect.Effect<string>
}

/** One attached pump: its consumer, and the facts it has minted. */
export interface StatusPump {
  /** Consumes the status source to exhaustion; the pump's whole body. */
  readonly run: Effect.Effect<void, Refusal>
  /**
   * Every fact minted and not yet taken, in the order the pump observed them.
   *
   * This is the exposed hand-off, and it is deliberately not a second landing
   * path: a holder that already owns a lane connection takes from here and
   * lands each fact through the lane's own emit. A spine that landed its own
   * facts would open a connection in order to record that it had opened a
   * connection.
   */
  readonly take: Effect.Effect<ReadonlyArray<SessionFact>>
  /** The session the pump currently cites, which a reconnect moves. */
  readonly session: Effect.Effect<Digest>
}

const asRecord = (status: Status): { readonly [key: string]: unknown } =>
  status as unknown as { readonly [key: string]: unknown }

const subjectOf = (value: unknown): string | null => {
  const subscription = value as Subscription | null
  return subscription !== null && typeof subscription?.getSubject === "function"
    ? subscription.getSubject()
    : null
}

/**
 * Projects one transcribed field onto the value a fact can carry.
 *
 * The projection is over the field's own SORT, which is a column of the
 * transcription table, so adding a row adds no branch here. Two of the pin's
 * sorts are not wire values at all — one carries the client's own error object
 * and one a live subscription — and each is projected to the one string that
 * survives leaving the process: the error as the client renders it, the
 * subscription as the subject it was created on. A field the client did not
 * send folds as `null` rather than vanishing, so the fact's key set is the
 * row's field set, always all of it.
 */
const projectField = (
  field: StatusField,
  value: unknown,
): string | number | ReadonlyArray<string> | null => {
  if (value === undefined || value === null) return null
  switch (field.sort) {
    case "string":
      return typeof value === "string" ? value : null
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? value : null
    case "string-list":
      return Array.isArray(value) ? value.map((entry) => String(entry)) : null
    case "error-object":
      return String(value)
    case "subscription":
      return subjectOf(value)
  }
}

/** Projects one status event's whole payload, walking the row rather than the value. */
export const projectPayload = (row: StatusEventRow, status: Status): SessionPayload => {
  const record = asRecord(status)
  const payload: Record<string, string | number | ReadonlyArray<string> | null> = {}
  for (const field of row.payload) {
    payload[field.name] = projectField(field, record[field.name])
  }
  return payload
}

/** What one observed status event produced: facts to land, and where the machine now is. */
interface Step {
  readonly facts: ReadonlyArray<SessionFact>
  readonly position: MachinePosition
  readonly session: Digest
}

/**
 * Turns one observed status event into the facts it emits.
 *
 * Every decision is read off a table row. A row placed as a reading emits one
 * observation citing the state it was read within and moves the machine
 * nowhere; a row placed as a transition emits its fact and moves the machine
 * to the state the row names. A row that mints a successor mints it through
 * the session lane's own mint, with the live session as predecessor, and the
 * successor's establishment lands after the transition that produced it — the
 * order a reader needs to see the chain. A row the pin never declared produces
 * nothing at all, which is the only honest reading of a value this package's
 * transcription does not cover.
 */
const step = Effect.fn("StatusPump.step")(function* (
  terms: StatusPumpTerms,
  status: Status,
  position: MachinePosition,
  session: Digest,
): Effect.fn.Return<Step, Refusal> {
  const row = statusRowFor(status.type)
  if (row === undefined) return { facts: [], position, session }
  const payload = projectPayload(row, status)
  const transition = transitionRowFor(row.type)
  if (transition === undefined) {
    return {
      facts: [observationFact({ session, event: row.type, state: position, payload })],
      position,
      session,
    }
  }
  if (transition.emits === "ended") {
    return {
      facts: [endedFact(session, yield* terms.cause)],
      position: transition.state,
      session,
    }
  }
  const moved = transitionFact({
    session,
    event: row.type,
    from: position,
    to: transition.state,
    payload,
  })
  if (!transition.mintsSuccessor) {
    return { facts: [moved], position: transition.state, session }
  }
  const successor = yield* mintSession({
    substrate: yield* terms.declaration,
    options: terms.options,
    estate: terms.estate,
  }, session)
  return {
    facts: [moved, successor.established],
    position: transition.state,
    session: successor.digest,
  }
})

/**
 * The fact stream one status source produces.
 *
 * Exposed on its own so the transducer can be exercised over a constructed
 * source with no server behind it: the tables, the ordering, the successor
 * chain and the reading/transition split are all properties of this function,
 * and only the socket is missing from a test that drives it directly.
 */
export const statusFacts = (
  source: Stream.Stream<Status>,
  terms: StatusPumpTerms,
  onSession: (session: Digest) => void,
): Stream.Stream<SessionFact, Refusal> => {
  let position: MachinePosition = null
  let session = terms.session
  return source.pipe(
    Stream.mapEffect((status) =>
      Effect.map(step(terms, status, position, session), (taken) => {
        position = taken.position
        session = taken.session
        onSession(taken.session)
        return taken.facts
      })
    ),
    Stream.flatMap((facts) => Stream.fromIterable(facts)),
  )
}

/**
 * Every connection this package has already attached a pump to.
 *
 * Weakly held, so the fence costs a connection nothing once it is gone. It is
 * the executable half of "built once": a second attach on one connection is
 * refused by construction rather than by a comment saying it does not happen.
 */
const pumped = new WeakSet<NatsConnection>()

/** Reports whether a pump is already attached to this connection. */
export const hasStatusPump = (connection: NatsConnection): boolean => pumped.has(connection)

/**
 * The terminal cause one connection reports, read from the pin rather than
 * inferred.
 *
 * The pin resolves its closed promise with an error when the connection died
 * of one and with nothing when it was taken down in order. The empty string
 * is that second report, carried rather than replaced by a word this package
 * would have had to invent.
 */
export const terminalCause = (connection: NatsConnection): Effect.Effect<string> =>
  Effect.promise(() => connection.closed()).pipe(
    Effect.map((cause) => (cause === undefined ? "" : String(cause))),
    Effect.catchCause(() => Effect.succeed("")),
  )

/**
 * Attaches the one status pump this connection gets.
 *
 * The source is consumed exactly once, here. Attaching twice is a defect of
 * this package and dies as one; the transport spine's own rule is that a
 * defect never wears the absence sort, and there is no domain sentence for
 * calling the spine wrong.
 */
export const attachStatusPump = Effect.fn("StatusPump.attach")(function* (
  connection: NatsConnection,
  terms: StatusPumpTerms,
): Effect.fn.Return<StatusPump, never, Scope.Scope> {
  if (pumped.has(connection)) {
    throw new Error(
      "one connection carries one status pump; a second consumer double-mints its facts",
    )
  }
  pumped.add(connection)
  const queue = yield* Queue.bounded<SessionFact>(STATUS_PUMP_BUFFER_BOUND)
  yield* Effect.addFinalizer(() => Queue.shutdown(queue))
  let session = terms.session
  const source = Stream.fromAsyncIterable(connection.status(), (cause) => cause).pipe(
    Stream.orDie,
  )
  const facts = statusFacts(source, terms, (moved) => {
    session = moved
  })
  return {
    run: Stream.runForEach(facts, (fact) => Queue.offer(queue, fact)),
    take: Queue.clear(queue).pipe(
      Effect.map((taken) => taken as ReadonlyArray<SessionFact>),
    ),
    session: Effect.sync(() => session),
  }
})

/** Builds the terms one established connection's pump runs under. */
export const pumpTerms = (
  connection: NatsConnection,
  input: {
    readonly session: Digest
    readonly options: Digest
    readonly estate: EstateDeclaration
  },
): StatusPumpTerms => ({
  session: input.session,
  options: input.options,
  estate: input.estate,
  declaration: Effect.suspend(() => substrateDeclarationOf(connection.info)),
  cause: terminalCause(connection),
})
