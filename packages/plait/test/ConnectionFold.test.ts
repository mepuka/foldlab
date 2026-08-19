import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, test } from "bun:test"

import type { Status } from "@nats-io/nats-core"
import { Effect, Stream } from "effect"

import { Digest, digestOf } from "../src/truth/Digest.js"
import type { Refusal, StructuralRefusal } from "../src/truth/Refusal.js"
import {
  connectionChanges,
  connectionOf,
  connectionsOf,
  connectionTransitions,
  lawfulTarget,
  stepConnection,
  type ConnectionStep,
} from "../src/internal/connectionfold.js"
import { lameDuckFact } from "../src/internal/incarnations.js"
import type { SessionFact } from "../src/internal/sessionfacts.js"
import {
  mintSession,
  observationFact,
  SESSION_EVENT_FORM,
  transitionFact,
} from "../src/internal/sessionfacts.js"
import { statusFacts, type StatusPumpTerms } from "../src/internal/statuspump.js"
import type { MachinePosition, StatusEventRow } from "../src/internal/statusvocabulary.js"
import {
  CONNECTION_TRANSITIONS,
  OBSERVATION_EVENTS,
  STATUS_EVENTS,
  statusRowFor,
  TRANSITION_EVENTS,
  transitionRowFor,
} from "../src/internal/statusvocabulary.js"
import { WIRE_STATUS_BY_DECLARATION } from "../src/internal/wirevocabulary.js"
import {
  declaredConnect,
} from "../src/internal/transport.js"
import {
  estateDeclaration,
  substrateDeclarationOf,
  type SessionGroups,
} from "../src/internal/substrate.js"
import { declareSubstrateWrit } from "../src/internal/writs.js"
import type { PositionedEvent } from "../src/internal/successors.js"
import { checkNoEventBranch } from "../scripts/status-vocabulary.js"

/**
 * The connection machine as a read, exercised over facts the pump itself
 * minted, with no substrate behind any of it.
 *
 * **No event word and no state name is written by hand in this file.** Rows are
 * reached by the vendor's own type-alias name through the wire vocabulary's
 * by-declaration index, and every expectation is the matched row's own column.
 * That is the whole shape of the discipline: a test that spelled a state would
 * be a second statement of the table it is checking, and two statements sharing
 * a mistake agree perfectly. The last describe block below holds this file to
 * that rule mechanically.
 *
 * **What the arms claim, and what they do not.** The fold is checked against
 * the TABLE — the terminal absorbs, a reading holds, a transition lands in the
 * state its own event names — and against sequences the pump's own transducer
 * produced from constructed status values. It is NOT checked against the
 * substrate model's `run` executed in lockstep over a generated corpus: that
 * oracle is a follow-on and this file does not claim it. What holds the table
 * itself honest is elsewhere and stays elsewhere — the transcription gate
 * against the pinned client's own declaration bytes, and the model gate's
 * alphabet arm against the transcription's canonical rendering.
 */

const INFO = {
  server_id: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  server_name: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  version: "2.14.4",
  proto: 1,
  go: "go1.26.5",
  host: "127.0.0.1",
  port: 62433,
  headers: true,
  max_payload: 1048576,
  jetstream: true,
  client_id: 5,
  client_ip: "127.0.0.1",
  connect_info: true,
  remote_account: "$G",
  api_lvl: 4,
  xkey: "XBYJ4PZQ5YC5CJ7D7QZPYJLIHS4GQ3R7AQWINRBNK42NVZMR5ATUOGW5",
}

const SERVERS = "127.0.0.1:62433"
const LAYER = "foldlab-plait-lanes"
const packageRoot = resolve(import.meta.dir, "..")
const FOLD_PATH = "src/internal/connectionfold.ts"

/**
 * The rows this file exercises, each reached by the vendor's own declaration
 * name rather than by its wire word.
 *
 * This is the estate's existing idiom for naming one row without spelling it:
 * the word travels out of the table instead of into the query, so a renamed
 * event moves these bindings by construction and a reordered table does not
 * move them at all.
 */
const DROP = WIRE_STATUS_BY_DECLARATION.DisconnectStatus.type
const RETRY = WIRE_STATUS_BY_DECLARATION.ReconnectingStatus.type
const REATTACH = WIRE_STATUS_BY_DECLARATION.ReconnectStatus.type
const DRAIN = WIRE_STATUS_BY_DECLARATION.LDMStatus.type
const TEARDOWN = WIRE_STATUS_BY_DECLARATION.CloseStatus.type
const STALE = WIRE_STATUS_BY_DECLARATION.StaleConnectionStatus.type
const FAILURE_READING = WIRE_STATUS_BY_DECLARATION.ServerErrorStatus.type
const LIVENESS_READING = WIRE_STATUS_BY_DECLARATION.ClientPingStatus.type

/**
 * A word no transcribed row places, planted to exercise the refusal.
 *
 * Typed as an ordinary word rather than as its own literal, because the arms
 * below compare it against the table's literal columns and a narrowed type
 * would make those comparisons a compile error instead of a measurement.
 */
const PLANTED: string = "a-word-the-transcription-places-nowhere"

const groupsFor = Effect.fn("fold.groups")(function* (
  info: unknown = INFO,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: SERVERS }, LAYER)
  const writ = yield* declareSubstrateWrit(LAYER)
  return {
    substrate: yield* substrateDeclarationOf(info),
    options: declared.digest,
    estate: estateDeclaration({ writ: writ.digest, layer: LAYER, shapes: [] }),
  }
})

const termsOver = (input: {
  readonly session: Digest
  readonly groups: SessionGroups
  readonly reconnectedInfo?: unknown
}): StatusPumpTerms => ({
  session: input.session,
  options: input.groups.options,
  estate: input.groups.estate,
  declaration: substrateDeclarationOf(input.reconnectedInfo ?? INFO),
  cause: Effect.succeed(""),
})

/** One status value of the named type, carrying every field any row declares. */
const statusOf = (name: string): Status =>
  ({
    type: name,
    server: SERVERS,
    added: ["one"],
    deleted: [],
    error: new Error("the substrate answered a protocol line this way"),
    pendingPings: 2,
    pending: 4096,
    sub: { getSubject: () => "flb.fab.ev.x.0" },
  }) as unknown as Status

/**
 * The facts one status sequence produces, minted by the pump's own transducer.
 *
 * Nothing here writes a fact by hand: the sequence goes in as the values the
 * pinned client sends and comes out as the facts the estate lands, so what the
 * fold walks below is the pump's output rather than a fixture agreeing with it.
 */
const minted = async (
  words: ReadonlyArray<string>,
  terms: StatusPumpTerms,
): Promise<ReadonlyArray<SessionFact>> =>
  Effect.runPromise(
    Stream.runCollect(
      statusFacts(Stream.fromIterable(words.map(statusOf)), terms, () => {}),
    ).pipe(Effect.orDie),
  )

const positioned = <Event>(
  events: ReadonlyArray<Event>,
): Promise<ReadonlyArray<PositionedEvent<Event>>> =>
  Effect.runPromise(
    Effect.forEach(events, (event, index) =>
      Effect.map(
        digestOf(event as never).pipe(Effect.orDie),
        (digest) => ({ position: index + 1, event, digest }),
      )),
  )

/**
 * One session's facts, minted by the pump and positioned as a lane read gives
 * them.
 *
 * The connection identifier the substrate assigns is what separates two
 * sessions, so a caller that needs a second session moves that one field — the
 * same field a real second connection moves — rather than inventing a digest.
 *
 * A re-attach inside one of these sequences reads the substrate's declaration
 * back UNCHANGED, so the successor it mints folds from the same three groups
 * and carries the same name. That is deliberate: these sequences exercise the
 * machine, and the successor chain has its own arm below, which moves the
 * identifier the way a real re-attach does.
 */
const walked = async (
  words: ReadonlyArray<string>,
  client: number = INFO.client_id,
): Promise<{
  readonly session: Digest
  readonly delivered: ReadonlyArray<PositionedEvent<SessionFact>>
}> => {
  const info = { ...INFO, client_id: client }
  const groups = await Effect.runPromise(groupsFor(info).pipe(Effect.orDie))
  const session = await Effect.runPromise(mintSession(groups, null))
  const facts = await minted(
    words,
    termsOver({ session: session.digest, groups, reconnectedInfo: info }),
  )
  return { session: session.digest, delivered: await positioned(facts) }
}

const read = (
  delivered: ReadonlyArray<PositionedEvent<SessionFact>>,
  session: string,
): Promise<{
  readonly session: string
  readonly state: MachinePosition
  readonly position: number | null
}> => Effect.runPromise(connectionOf(delivered, session).pipe(Effect.orDie))

const refusalOf = (effect: Effect.Effect<unknown, Refusal>): Promise<Refusal> =>
  Effect.runPromise(Effect.flip(effect))

/** The state the machine table's own row for one word names. */
const named = (word: string): MachinePosition => {
  const row = transitionRowFor(word)
  if (row === undefined) throw new Error("the machine table places no transition for that row")
  return row.state
}

/** The row the transcription places for one word. */
const rowFor = (word: string): StatusEventRow => {
  const row = statusRowFor(word)
  if (row === undefined) throw new Error("the transcription places no row for that word")
  return row
}

/** Every position the machine can stand in, the initial one included. */
const POSITIONS: ReadonlyArray<MachinePosition> = [
  null,
  ...CONNECTION_TRANSITIONS.map((row) => row.state),
]

/** The absorbing state, read off the table's own column. */
const terminalState = (): MachinePosition => {
  const absorbing = CONNECTION_TRANSITIONS.filter((row) => row.absorbing)
  expect(absorbing.length).toBe(1)
  return absorbing[0]!.state
}

const traced = async (name: string, line: string): Promise<void> => {
  expect(`${line}\n`).toBe(
    await Bun.file(resolve(import.meta.dir, `../negative-controls/${name}`)).text(),
  )
  console.info(line)
}

describe("the machine the fold walks, as the table carries it", () => {
  test("the fold's two derivations of the terminal agree: one absorbing row, and it is the one that ends", () => {
    const absorbing = CONNECTION_TRANSITIONS.filter((row) => row.absorbing)
    const ending = CONNECTION_TRANSITIONS.filter((row) => row.emits === "ended")
    // Both are singletons and both are the same row. The fold depends on this
    // twice: it reads the teardown fact back through the ending row's word, and
    // it holds the state at the absorbing one.
    expect(absorbing.length).toBe(1)
    expect(ending.length).toBe(1)
    expect(ending[0]!.event).toBe(absorbing[0]!.event)
    expect(ending[0]!.state).toBe(absorbing[0]!.state)
  })

  test("the terminal absorbs every transcribed symbol, from itself", () => {
    const terminal = terminalState()
    for (const row of STATUS_EVENTS) {
      expect({ event: row.type, target: lawfulTarget(terminal, row) })
        .toEqual({ event: row.type, target: terminal })
    }
  })

  test("a reading holds the state it is read within, from every position", () => {
    expect(OBSERVATION_EVENTS.length).toBeGreaterThan(0)
    for (const from of POSITIONS) {
      for (const row of OBSERVATION_EVENTS) {
        expect({ from, event: row.type, target: lawfulTarget(from, row) })
          .toEqual({ from, event: row.type, target: from })
      }
    }
  })

  test("a transition lands in the state its own event names, from every non-terminal position", () => {
    const terminal = terminalState()
    expect(TRANSITION_EVENTS.length).toBeGreaterThan(0)
    for (const from of POSITIONS) {
      if (from === terminal) continue
      for (const row of TRANSITION_EVENTS) {
        expect({ from, event: row.type, target: lawfulTarget(from, row) })
          .toEqual({ from, event: row.type, target: named(row.type) })
      }
    }
  })

  test("the three clauses cover every position-and-symbol pair, with none left to a default", () => {
    const terminal = terminalState()
    let covered = 0
    for (const from of POSITIONS) {
      for (const row of STATUS_EVENTS) {
        const clauses = [
          from === terminal,
          from !== terminal && row.placement === "observation",
          from !== terminal && row.placement === "transition",
        ].filter((holds) => holds)
        // Exactly one clause answers each pair: the arms above partition the
        // table rather than overlapping on it.
        expect({ from, event: row.type, clauses: clauses.length })
          .toEqual({ from, event: row.type, clauses: 1 })
        covered += 1
      }
    }
    // Every position over every symbol: the same table size the substrate
    // model's own machine is proved total at.
    expect(covered).toBe(POSITIONS.length * STATUS_EVENTS.length)
  })

  test("the admissible-predecessor column is not consulted: an unexpected order still lands where the event names", () => {
    // A transition reached from a state its own predecessor column never lists.
    // The machine is total, so the fold reports the state the event names and
    // refuses nothing: a status event is the client's own evidence.
    const row = transitionRowFor(DRAIN)!
    const unexpected = POSITIONS.filter((from) =>
      from !== null && !(row.from as ReadonlyArray<MachinePosition>).includes(from)
      && from !== terminalState()
    )
    expect(unexpected.length).toBeGreaterThan(0)
    for (const from of unexpected) {
      expect(lawfulTarget(from, rowFor(DRAIN))).toBe(named(DRAIN))
    }
  })
})

describe("the fold over the sequences the pump mints", () => {
  test("the drop-then-retry sequence lands in the state its last transition names", async () => {
    const { session, delivered } = await walked([DROP, RETRY, RETRY, STALE])
    const reading = await read(delivered, session)
    expect(reading.state).toBe(named(STALE))
    expect(reading.position).toBe(delivered.length)
  })

  test("the drain path and the close path both reach the terminal, and it absorbs after", async () => {
    const drained = await walked([DRAIN, TEARDOWN])
    expect((await read(drained.delivered, drained.session)).state).toBe(terminalState())

    const closed = await walked([TEARDOWN])
    expect((await read(closed.delivered, closed.session)).state).toBe(terminalState())

    // Two paths to one terminal, and everything after it is absorbed.
    const after = await walked([DRAIN, TEARDOWN, DROP, RETRY, FAILURE_READING])
    const reading = await read(after.delivered, after.session)
    expect(reading.state).toBe(terminalState())
    expect(reading.position).toBe(after.delivered.length)
  })

  test("the teardown fact is read back through the row that emits it, so the lane reaches the terminal", async () => {
    const { delivered } = await walked([TEARDOWN])
    // The pump lands teardown as the session-ended form rather than as a
    // transition, so the fold would never reach the terminal from the lane if
    // it did not read that fact back through the machine table's own row.
    expect(delivered.map((one) => one.event.kind)).toEqual(["substrate-session-ended"])
    const step = await Effect.runPromise(
      stepConnection(null, delivered[0]!).pipe(Effect.orDie),
    )
    expect(step.event).toBe(rowFor(TEARDOWN).type)
    expect(step.to).toBe(terminalState())
    expect(step.moved).toBe(true)
  })

  test("readings taken on a live connection move the machine nowhere", async () => {
    const readings = OBSERVATION_EVENTS.map((row) => row.type)
    const { session, delivered } = await walked([DROP, ...readings])
    const reading = await read(delivered, session)
    // The state is the one the single transition named, and the readings that
    // followed it each advanced the position and nothing else.
    expect(reading.state).toBe(named(DROP))
    expect(reading.position).toBe(delivered.length)

    const steps = await Effect.runPromise(
      Stream.runCollect(connectionChanges(Stream.fromIterable(delivered))).pipe(Effect.orDie),
    )
    expect(steps.map((step) => step.moved)).toEqual([true, ...readings.map(() => false)])
    for (const step of steps.slice(1)) {
      expect({ from: step.from, to: step.to }).toEqual({ from: named(DROP), to: named(DROP) })
    }
  })

  test("a duplicate delivery is absorbed: the second landing moves nothing", async () => {
    const { session, delivered } = await walked([DROP])
    const twice = [...delivered, { ...delivered[0]!, position: delivered.length + 1 }]
    const reading = await read(twice, session)
    expect(reading.state).toBe(named(DROP))
    // The position advanced because the fold read another fact; the state did
    // not, because the machine was already there.
    expect(reading.position).toBe(twice.length)
    const steps = await Effect.runPromise(
      Stream.runCollect(connectionChanges(Stream.fromIterable(twice))).pipe(Effect.orDie),
    )
    expect(steps.map((step) => step.moved)).toEqual([true, false])
  })

  test("a session no fact cited reads as unknown, never as established", async () => {
    const { delivered } = await walked([DROP])
    const stranger: string = Digest.make("f".repeat(64))
    const reading = await read(delivered, stranger)
    // Both null: nothing was walked, so there is no state AND no position. An
    // established and quiet session reads with a position, which is what keeps
    // the two apart.
    expect(reading).toEqual({ session: stranger, state: null, position: null })
  })

  test("every variant the lane declares reaches the fold, and two of them hand the machine nothing", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const session = await Effect.runPromise(mintSession(groups, null))
    const moving = await walked([DROP, TEARDOWN])
    const facts: ReadonlyArray<SessionFact> = [
      session.established,
      moving.delivered[1]!.event,
      moving.delivered[0]!.event,
      observationFact({
        session: session.digest,
        event: rowFor(LIVENESS_READING).type,
        state: null,
        payload: {},
      }),
      lameDuckFact({
        // Through the digest door rather than cast into it, so a constant that
        // is not a digest fails here instead of folding.
        incarnation: Digest.make("c".repeat(64)),
        session: session.digest,
        server: "the server the vendor named",
      }),
    ]
    // Every declared variant of the lane's event form is exercised, so the
    // compiler-closed arm record is executed rather than merely present.
    expect(new Set(facts.map((fact) => fact.kind)).size)
      .toBe(SESSION_EVENT_FORM.variants.length)

    const delivered = await positioned(facts)
    const steps = await Effect.runPromise(
      Effect.forEach(delivered, (one) => stepConnection(null, one)).pipe(Effect.orDie),
    )
    const handed = new Map(delivered.map((one, index) => [one.event.kind, steps[index]!]))
    // The establishment and the drain disposition hand the machine no word: one
    // is the session fact itself, the other is the daemon's report about a
    // server incarnation rather than a reading from this connection's source.
    expect(handed.get("substrate-session-established")!.event).toBe(null)
    expect(handed.get("substrate-session-established")!.moved).toBe(false)
    expect(handed.get("substrate-incarnation-lame-duck")!.event).toBe(null)
    expect(handed.get("substrate-incarnation-lame-duck")!.moved).toBe(false)
    // The teardown hands the word the machine table places for its own form.
    expect(handed.get("substrate-session-ended")!.to).toBe(terminalState())
    // A transition and a reading each hand their own transcribed word.
    expect(handed.get("substrate-session-transition")!.event).toBe(rowFor(DROP).type)
    expect(handed.get("substrate-session-observation")!.moved).toBe(false)
  })

  test("an establishment leaves the machine at the initial position, which is named by no event", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const session = await Effect.runPromise(mintSession(groups, null))
    const delivered = await positioned<SessionFact>([session.established])
    const reading = await read(delivered, session.digest)
    expect(reading.state).toBe(null)
    expect(reading.position).toBe(1)
    // No transcribed transition enters the initial position, which is why it is
    // an absence and not a name.
    expect(CONNECTION_TRANSITIONS.some((row) => row.state === null)).toBe(false)
  })
})

describe("the reads", () => {
  test("the snapshot names every session the facts cite, each at its own state and its own position", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const session = await Effect.runPromise(mintSession(groups, null))
    // The re-attach row mints a successor, so this one sequence produces facts
    // about two sessions: the predecessor's transitions, and the successor's
    // own establishment.
    const facts = await minted(
      [DROP, RETRY, REATTACH],
      termsOver({
        session: session.digest,
        groups,
        reconnectedInfo: { ...INFO, client_id: 6 },
      }),
    )
    const delivered = await positioned(facts)
    const snapshot = await Effect.runPromise(connectionsOf(delivered).pipe(Effect.orDie))

    expect(snapshot.length).toBe(2)
    const predecessor = snapshot.find((row) => row.session === session.digest)!
    const successor = snapshot.find((row) => row.session !== session.digest)!
    expect(predecessor.state).toBe(named(REATTACH))
    // The successor is established and has moved nowhere; its position is its
    // own establishment's, not the predecessor's last.
    expect(successor.state).toBe(null)
    expect(successor.position).toBe(delivered.length)
    expect(predecessor.position).toBe(delivered.length - 1)
    // Ordered by session name, so two readers of the same facts read one list.
    expect(snapshot.map((row) => row.session)).toEqual(
      [...snapshot.map((row) => row.session)].sort(),
    )
    // And the per-session read is the snapshot's row for that session.
    expect(await read(delivered, session.digest)).toEqual(predecessor)
  })

  test("the stream carries one step per fact, and the transitions are the steps that moved", async () => {
    const { delivered } = await walked([DROP, LIVENESS_READING, RETRY, FAILURE_READING])
    const steps = await Effect.runPromise(
      Stream.runCollect(connectionChanges(Stream.fromIterable(delivered))).pipe(Effect.orDie),
    )
    expect(steps.length).toBe(delivered.length)
    expect(steps.map((step) => step.position)).toEqual(delivered.map((one) => one.position))
    expect(steps.map((step) => step.moved)).toEqual([true, false, true, false])

    const moved = await Effect.runPromise(
      Stream.runCollect(connectionTransitions(Stream.fromIterable(delivered))).pipe(Effect.orDie),
    )
    expect(moved.map((step) => step.to)).toEqual([named(DROP), named(RETRY)])
    // The filtered stream is the same steps, not a second walk.
    expect(moved).toEqual(steps.filter((step: ConnectionStep) => step.moved))
  })

  test("the stream threads one machine per session, so one session's facts move only its own", async () => {
    const first = await walked([DROP])
    const second = await walked([DRAIN], INFO.client_id + 1)
    // Two sessions minted from different substrate declarations, interleaved on
    // one stream: each step reports its own session's machine.
    expect(first.session).not.toBe(second.session)
    const interleaved = [
      first.delivered[0]!,
      second.delivered[0]!,
    ].map((one, index) => ({ ...one, position: index + 1 }))
    const steps = await Effect.runPromise(
      Stream.runCollect(connectionChanges(Stream.fromIterable(interleaved))).pipe(Effect.orDie),
    )
    expect(steps.map((step) => step.from)).toEqual([null, null])
    expect(steps.map((step) => step.to)).toEqual([named(DROP), named(DRAIN)])
  })

  test("the fold never says live: the same facts read twice, a wait apart, are one answer", async () => {
    const { session, delivered } = await walked([DROP, RETRY])
    const first = await read(delivered, session)
    await Bun.sleep(25)
    expect(await read(delivered, session)).toEqual(first)
    // And the module consults no clock at all, which is why it cannot.
    const source = readFileSync(resolve(packageRoot, FOLD_PATH), "utf8")
      .replace(/\/\*[\s\S]*?\*\//gu, " ")
    for (const reading of ["Date", "performance", "Clock", "setTimeout"]) {
      expect({ reading, found: source.includes(reading) }).toEqual({ reading, found: false })
    }
  })
})

describe("a symbol the transcription places nowhere", () => {
  test("the planted word really is outside the alphabet", () => {
    expect(statusRowFor(PLANTED)).toBeUndefined()
    expect(STATUS_EVENTS.some((row) => row.type === PLANTED)).toBe(false)
    expect(CONNECTION_TRANSITIONS.some((row) => row.event === PLANTED)).toBe(false)
  })

  test("a fact carrying it refuses structurally, and the lawful twin beside it folds", async () => {
    const { session, delivered } = await walked([DROP])
    const planted = await positioned<SessionFact>([
      delivered[0]!.event,
      observationFact({ session, event: PLANTED, state: named(DROP), payload: {} }),
    ])
    const refusal = await refusalOf(connectionOf(planted, session)) as StructuralRefusal
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.got).toBe(PLANTED)
    // The refusal names where it stopped, so the fact that carried the word is
    // findable rather than merely reported.
    expect(refusal.path).toEqual([String(planted[1]!.position), "event"])
    expect(refusal.next.length).toBeGreaterThan(0)

    // The lawful twin: the same fold, the same position, the same fact shape,
    // and one word the table places. It folds and lands.
    const lawful = await positioned<SessionFact>([
      delivered[0]!.event,
      observationFact({
        session,
        event: rowFor(FAILURE_READING).type,
        state: named(DROP),
        payload: {},
      }),
    ])
    expect(await read(lawful, session)).toEqual({
      session,
      state: named(DROP),
      position: lawful.length,
    })
  })

  test("it refuses rather than guessing: the state the fold would have held is available and not taken", async () => {
    const { session, delivered } = await walked([DROP])
    const planted = await positioned<SessionFact>([
      delivered[0]!.event,
      transitionFact({
        session,
        event: PLANTED,
        from: named(DROP),
        to: PLANTED,
        payload: {},
      }),
    ])
    // The fact even tells the fold where it thinks it landed. The fold does not
    // read it: a landing is read off the table or it is not read.
    const refusal = await refusalOf(connectionOf(planted, session)) as StructuralRefusal
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.got).toBe(PLANTED)
    // Holding the state would have been the guess, and it is a state the table
    // does place — which is exactly why refusing is the only honest answer.
    expect(CONNECTION_TRANSITIONS.some((row) => row.state === named(DROP))).toBe(true)
  })

  test("every read refuses on it: the snapshot, the stream, and the step", async () => {
    const { session, delivered } = await walked([DROP])
    const planted = await positioned<SessionFact>([
      delivered[0]!.event,
      observationFact({ session, event: PLANTED, state: named(DROP), payload: {} }),
    ])
    expect(((await refusalOf(connectionsOf(planted))) as StructuralRefusal).kind)
      .toBe("malformed-value")
    expect(((await refusalOf(stepConnection(null, planted[1]!))) as StructuralRefusal).kind)
      .toBe("malformed-value")
    const streamed = await refusalOf(
      Stream.runCollect(connectionChanges(Stream.fromIterable(planted))),
    ) as StructuralRefusal
    expect(streamed.kind).toBe("malformed-value")
  })

  test("a neighbouring session's unplaced word refuses the snapshot and not this session's read", async () => {
    const clean = await walked([DROP])
    const other = await walked([DRAIN], INFO.client_id + 1)
    expect(clean.session).not.toBe(other.session)
    const mixed = await positioned<SessionFact>([
      clean.delivered[0]!.event,
      observationFact({
        session: other.session,
        event: PLANTED,
        state: named(DRAIN),
        payload: {},
      }),
    ])
    // A fold answers about the facts it walked. The snapshot walked both.
    expect(((await refusalOf(connectionsOf(mixed))) as StructuralRefusal).kind)
      .toBe("malformed-value")
    expect(await read(mixed, clean.session))
      .toEqual({ session: clean.session, state: named(DROP), position: 1 })
  })
})

describe("the executed mutant", () => {
  test("PLANT: a fold promoting a reading to a state change dies on the placement column; the shipped fold does not", async () => {
    // The named vector: one transition, then one reading taken within the state
    // it entered. The lawful machine holds; the mutant moves.
    const { session, delivered } = await walked([DROP, FAILURE_READING])
    expect(delivered.map((one) => one.event.kind)).toEqual([
      "substrate-session-transition",
      "substrate-session-observation",
    ])

    /** The mutant's transition rule: every row lands in the state its own word names. */
    const promoting = (from: MachinePosition, row: StatusEventRow): MachinePosition =>
      CONNECTION_TRANSITIONS.some((entry) => entry.state === from && entry.absorbing)
        ? from
        : (row.type as MachinePosition)

    /** The shipped walk with its transition rule replaced, and nothing else. */
    const foldWith = (
      target: (from: MachinePosition, row: StatusEventRow) => MachinePosition,
    ): MachinePosition => {
      let state: MachinePosition = null
      for (const one of delivered) {
        const fact = one.event
        if (
          fact.kind !== "substrate-session-transition"
          && fact.kind !== "substrate-session-observation"
        ) continue
        state = target(state, rowFor(fact.event))
      }
      return state
    }

    const mutated = foldWith(promoting)
    const lawful = foldWith(lawfulTarget)

    // The placement arm is what kills it: the mutant's answer is a word the
    // machine table places as a reading, so no transcribed transition enters it
    // and it is not a state at all.
    expect(rowFor(FAILURE_READING).placement).toBe("observation")
    expect(mutated).toBe(rowFor(FAILURE_READING).type as MachinePosition)
    expect(CONNECTION_TRANSITIONS.some((row) => row.state === mutated)).toBe(false)

    // The lawful rule holds the state the transition entered, and it IS a state
    // the table places.
    expect(lawful).toBe(named(DROP))
    expect(CONNECTION_TRANSITIONS.some((row) => row.state === lawful)).toBe(true)
    // And the shipped fold answers exactly what the lawful rule does.
    expect((await read(delivered, session)).state).toBe(lawful)

    await traced(
      "ConnectionFold.reading-promoted.trace.txt",
      "CONNECTION CONTROL: PASS component=connection-fold mutant=reading-promoted-to-state vector=transition-then-reading law=readings-hold-state",
    )
  })
})

describe("the vocabulary discipline over this slice", () => {
  test("neither the fold nor this file spells a transcribed event or state name", () => {
    const fold = readFileSync(resolve(packageRoot, FOLD_PATH), "utf8")
    expect(checkNoEventBranch(STATUS_EVENTS, fold)).toEqual({ ok: true })
    const suite = readFileSync(import.meta.path, "utf8")
    expect(checkNoEventBranch(STATUS_EVENTS, suite)).toEqual({ ok: true })

    // Red on plant, so the pass is evidence: the same clause refuses a spelling.
    const planted = `${fold}\nconst named = "${STATUS_EVENTS[0]!.type}"\n`
    expect(checkNoEventBranch(STATUS_EVENTS, planted).ok).toBe(false)
  })

  test("every state the fold can report is a state some transcribed transition enters", async () => {
    const reachable = new Set<MachinePosition>([null])
    for (const row of TRANSITION_EVENTS) {
      const { session, delivered } = await walked([row.type])
      reachable.add((await read(delivered, session)).state)
    }
    for (const state of reachable) {
      if (state === null) continue
      expect(CONNECTION_TRANSITIONS.some((row) => row.state === state)).toBe(true)
    }
    // Every transition row is reachable in one step from the initial position,
    // so the set the fold can report is the machine's own state set.
    expect(reachable.size).toBe(CONNECTION_TRANSITIONS.length + 1)
  })
})
