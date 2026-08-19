import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, test } from "bun:test"

import type { Cause } from "effect"
import { Deferred, Effect, Layer, Queue, Result, Stream } from "effect"
import { HttpRouter } from "effect/unstable/http"

import { decodeJson, encodeJsonValue } from "@foldlab/core/jcs"

import * as ApiFace from "../src/surface/api.js"
import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { Cells, cellName, stateOf, type CellService, type Observation } from "../src/planes/Cell.js"
import {
  LANE_TAIL_LIMIT_DEFAULT,
  LANE_TAIL_LIMIT_MAX,
  LaneReads,
  type DeclaredLane,
  type LandedFact,
  type LaneReadService,
} from "../src/planes/Lane.js"
import {
  Holder,
  OutcomeValue,
  Registers,
  WorkKey,
  matchState,
  type RegisterService,
  type RegisterState,
} from "../src/planes/Register.js"
import { connectionChanges, connectionsOf } from "../src/internal/connectionfold.js"
import { heartbeatLane } from "../src/internal/heartbeatlane.js"
import {
  INCARNATION_CHAIN_MAX,
  incarnation,
  incarnationName,
  roundKey,
} from "../src/internal/incarnations.js"
import { admittedLimit, readSpan, readerBehind, stageArrival } from "../src/internal/lanereads.js"
import type { SessionFact } from "../src/internal/sessionfacts.js"
import { mintSession, observationFact, transitionFact } from "../src/internal/sessionfacts.js"
import { sessionLane } from "../src/internal/sessionlanes.js"
import {
  estateDeclaration,
  substrateDeclarationOf,
  type SessionGroups,
} from "../src/internal/substrate.js"
import { declaredConnect } from "../src/internal/transport.js"
import { WIRE_STATUS_BY_DECLARATION } from "../src/internal/wirevocabulary.js"
import { declareSubstrateWrit } from "../src/internal/writs.js"
import { RETIRED_DRAFT_MARKERS, checkNoTrackingArtifacts } from "../scripts/refusal-vocabulary.js"

/**
 * The read-side face, exercised over fixtures rather than over a substrate.
 *
 * **What the arms hold, and why fixtures are the right oracle for them.** Every
 * law this file checks is the FACE's — that a payload is the plane read's own
 * canonical bytes, that a collection is bounded, that the live read is transport
 * rather than accumulation, that a write verb is refused, and that no served
 * string carries a tracking artifact. None of those is a claim about the
 * substrate, and every one is sharper when the plane read is a value this file
 * also holds: the wall can then compare the bytes the wire carried against the
 * bytes that value has, which is what "served equals derived" means. What a live
 * substrate would add — that the read adapters speak the substrate's protocol
 * correctly — is a different claim and is not made here.
 *
 * **No event word and no state name is spelled by hand.** The facts the fold
 * walks are minted through the estate's own mints, and every event word is
 * reached through the wire vocabulary's by-declaration index, so a renamed event
 * moves this file by construction rather than by search.
 */

const SERVERS = "127.0.0.1:14222"
/** The layer the bounded lane read opens under; its writ is the declared one. */
const LAYER = "foldlab-plait-lane-reads"
const ORIGIN = "http://read.face"

const INFO = {
  server_id: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  server_name: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  version: "2.14.4",
  proto: 1,
  go: "go1.26.5",
  host: "127.0.0.1",
  port: 14222,
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

/** Rows reached by the vendor's own declaration name, never by their word. */
const DROP = WIRE_STATUS_BY_DECLARATION.DisconnectStatus.type
const RETRY = WIRE_STATUS_BY_DECLARATION.ReconnectingStatus.type
const READING = WIRE_STATUS_BY_DECLARATION.ClientPingStatus.type

const HOLDER = Holder.make("read-face-wall")
const REGISTER_KEY = "read-face-work"
const CELL_NAME = "read-face-cell"
const STEP_EVENT = "plait-connection-step"
const REFUSAL_EVENT = "plait-refusal"

const run = <A>(effect: Effect.Effect<A, unknown>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.orDie) as Effect.Effect<A>)

const groupsFor = Effect.fn("wall.groups")(function* (
  client: number,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: SERVERS }, LAYER)
  const writ = yield* declareSubstrateWrit(LAYER)
  return {
    substrate: yield* substrateDeclarationOf({ ...INFO, client_id: client }),
    options: declared.digest,
    estate: estateDeclaration({ writ: writ.digest, layer: LAYER, shapes: [] }),
  }
})

/** One session's scripted facts: an establishment, two moves, one reading. */
const scripted = async (client: number): Promise<{
  readonly session: Digest
  readonly facts: ReadonlyArray<SessionFact>
}> => {
  const groups = await run(groupsFor(client))
  const minted = await run(mintSession(groups, null))
  const session = minted.digest
  return {
    session,
    facts: [
      minted.established,
      transitionFact({ session, event: DROP, from: null, to: DROP, payload: {} }),
      transitionFact({ session, event: RETRY, from: DROP, to: RETRY, payload: {} }),
      observationFact({ session, event: READING, state: RETRY, payload: {} }),
    ],
  }
}

/** The coordinates a lane read would have given those facts. */
const landed = <Event>(
  events: ReadonlyArray<Event>,
  partition: number,
): Promise<ReadonlyArray<LandedFact<Event>>> =>
  run(Effect.forEach(events, (event, index) =>
    Effect.map(digestOf(event as WireValue), (digest): LandedFact<Event> => ({
      partition,
      position: index + 1,
      digest,
      holder: HOLDER,
      event,
    }))))

/**
 * The clip a bounded tail is expected to apply, written here rather than
 * imported, so the served rows are compared against an independently stated
 * bound instead of against the one the read applies.
 */
const clipped = <Event>(
  facts: ReadonlyArray<LandedFact<Event>>,
  limit: number,
  partition: number | undefined,
): ReadonlyArray<LandedFact<Event>> => {
  const parts = [...new Set(facts.map((fact) => fact.partition))].sort((a, b) => a - b)
  const rows: Array<LandedFact<Event>> = []
  for (const part of parts) {
    if (partition !== undefined && part !== partition) continue
    const own = facts.filter((fact) => fact.partition === part)
    rows.push(...own.slice(Math.max(0, own.length - limit)))
  }
  return rows
}

interface Fixture {
  readonly session: Digest
  readonly sessionFacts: ReadonlyArray<LandedFact<SessionFact>>
  readonly sessionLaneDigest: Digest
  readonly sessionHandle: string
  readonly heartbeatHandle: string
  readonly observations: ReadonlyArray<Observation>
  readonly register: RegisterState
  readonly store: Digest
  readonly incarnation: Digest
  readonly rounds: ReadonlyMap<string, RegisterState>
}

const ABSENT: RegisterState = { token: 0, holder: null, outcome: null }

const buildFixture = async (): Promise<Fixture> => {
  const first = await scripted(INFO.client_id)
  const second = await scripted(INFO.client_id + 1)
  // Two sessions on two partitions: the tail reports each partition's own
  // sequence, which is what makes "positions are per-partition" observable.
  const facts = [
    ...await landed(first.facts, 0),
    ...await landed(second.facts, 3),
  ]
  const lane = await run(sessionLane())
  const beats = await run(heartbeatLane())

  const store = await run(digestOf({ v: 0, kind: "substrate-store", dir: "a-store" }))
  const options = await run(digestOf({ v: 0, kind: "substrate-options" }))
  const value = incarnation({ store, options, predecessor: null })
  const name = await run(incarnationName(value))
  const round = await run(roundKey(store, null))
  const register: RegisterState = {
    token: 7,
    holder: HOLDER,
    outcome: { token: 7, value: OutcomeValue.make("landed-outcome") },
  }

  return {
    session: first.session,
    sessionFacts: facts,
    sessionLaneDigest: lane.digest,
    sessionHandle: lane.handle,
    heartbeatHandle: beats.handle,
    observations: [{ holder: "seat-a", value: 1 }, { holder: "seat-b", value: 2 }],
    register,
    store,
    incarnation: name,
    rounds: new Map<string, RegisterState>([
      [WorkKey.make(REGISTER_KEY), register],
      // One round decided, and the round after it decided by nobody: a chain of
      // exactly one, which is what a store on its first incarnation looks like.
      [round, { token: 1, holder: HOLDER, outcome: { token: 1, value: OutcomeValue.make(name) } }],
    ]),
  }
}

const laneReadsFixture = (
  fixture: Fixture,
  live: Stream.Stream<LandedFact<SessionFact>, Refusal> = Stream.empty,
): Layer.Layer<LaneReads> =>
  LaneReads.testLayer({
    tail: ((lane: DeclaredLane<unknown, number>, options?: {
      readonly partition?: number | undefined
      readonly limit?: number | undefined
    }) =>
      Effect.succeed(
        lane.digest === fixture.sessionLaneDigest
          ? clipped(fixture.sessionFacts, admittedLimit(options?.limit), options?.partition)
          : [],
      )) as unknown as LaneReadService["tail"],
    follow: (() => live) as unknown as LaneReadService["follow"],
  })

const cellsFixture = (fixture: Fixture): Layer.Layer<Cells> =>
  Cells.testLayer({
    read: (() => stateOf(fixture.observations)) as unknown as CellService["read"],
    merge: (() => Effect.die("the read face never merges")) as unknown as CellService["merge"],
  })

const registersFixture = (fixture: Fixture): Layer.Layer<Registers> =>
  Registers.testLayer({
    observe: ((work: string) =>
      Effect.succeed(fixture.rounds.get(work) ?? ABSENT)) as unknown as RegisterService["observe"],
    grant: (() => Effect.die("the read face never grants")) as unknown as RegisterService["grant"],
    renew: (() => Effect.die("the read face never renews")) as unknown as RegisterService["renew"],
    commit: (() => Effect.die("the read face never commits")) as unknown as RegisterService["commit"],
    expireSteal: (() =>
      Effect.die("the read face never steals")) as unknown as RegisterService["expireSteal"],
  })

interface Face {
  readonly get: (path: string) => Promise<Response>
  readonly send: (method: string, path: string) => Promise<Response>
  readonly dispose: () => Promise<void>
}

const face = (
  fixture: Fixture,
  live?: Stream.Stream<LandedFact<SessionFact>, Refusal>,
): Face => {
  const carriers = Layer.mergeAll(
    laneReadsFixture(fixture, live),
    cellsFixture(fixture),
    registersFixture(fixture),
  )
  const app = ApiFace.layer.pipe(HttpRouter.provideRequest(carriers), Layer.orDie)
  const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
  return {
    get: (path) => handler(new Request(`${ORIGIN}${path}`)),
    send: (method, path) => handler(new Request(`${ORIGIN}${path}`, { method })),
    dispose,
  }
}

const bytesOf = async (response: Response): Promise<Uint8Array> =>
  new Uint8Array(await response.arrayBuffer())

const textOf = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

const valueOf = (bytes: Uint8Array): Record<string, WireValue> => {
  const decoded = decodeJson(bytes)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok) throw new Error("the served payload did not decode")
  return decoded.value as Record<string, WireValue>
}

const parsed = (payload: string): Record<string, WireValue> =>
  valueOf(new TextEncoder().encode(payload))

/** The canonical bytes one wire value has anywhere in the estate. */
const canonical = (value: WireValue): Promise<Uint8Array> => run(canonicalBytes(value))

/** One served member's own bytes, for the served-equals-derived comparison. */
const memberBytes = async (bytes: Uint8Array, member: string): Promise<Uint8Array> =>
  canonical(valueOf(bytes)[member]!)

/** The frames one Server-Sent Events body carries, in arrival order. */
const framesOf = (body: string): ReadonlyArray<{ event: string; data: string }> =>
  body
    .split("\n\n")
    .filter((frame) => frame.trim() !== "")
    .map((frame) => {
      const lines = frame.split("\n")
      const event = lines.find((line) => line.startsWith("event: "))?.slice(7) ?? "message"
      const data = lines
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n")
      return { event, data }
    })

describe("the reads this face declares", () => {
  test("the index answers every declared read, and every declared read answers", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const index = valueOf(await bytesOf(await served.get("/")))
      const reads = index.reads as ReadonlyArray<Record<string, string>>
      expect(reads.length).toBeGreaterThan(0)
      // Every declared row names a bound. A read that announced no bound would
      // be a read whose reader cannot tell a short answer from a clipped one.
      for (const read of reads) {
        expect({ path: read.path, bound: read.bound === undefined || read.bound === "" })
          .toEqual({ path: read.path, bound: false })
        expect({ path: read.path, answers: read.answers === undefined || read.answers === "" })
          .toEqual({ path: read.path, answers: false })
      }
      // The roster is the router's own: every declared path, with its parameters
      // filled, answers rather than falling through to the miss.
      const filled: Record<string, string> = {
        ":handle": fixture.sessionHandle,
        ":work": REGISTER_KEY,
        ":cell": CELL_NAME,
        ":store": fixture.store,
      }
      for (const read of reads) {
        const path = read.path!
        if (path.endsWith("/changes")) continue
        const concrete = Object.entries(filled).reduce(
          (walked, [token, value]) => walked.replace(token, value),
          path,
        )
        const response = await served.get(concrete)
        expect({ path: concrete, status: response.status })
          .toEqual({ path: concrete, status: 200 })
      }
    } finally {
      await served.dispose()
    }
  })
})

describe("served equals derived: the payload is the plane read's own bytes", () => {
  test("the connection snapshot carries exactly the fold's own value", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const bytes = await bytesOf(await served.get("/sessions"))
      const derived = await run(connectionsOf(
        clipped(fixture.sessionFacts, LANE_TAIL_LIMIT_DEFAULT, undefined),
      ))
      expect(await memberBytes(bytes, "connections")).toEqual(
        await canonical(derived.map((reading) => ({
          session: reading.session,
          state: reading.state,
          position: reading.position,
        }))),
      )
      const value = valueOf(bytes)
      expect(value.lane).toBe(fixture.sessionLaneDigest)
      expect(value.limit).toBe(LANE_TAIL_LIMIT_DEFAULT)
    } finally {
      await served.dispose()
    }
  })

  test("the lane tail carries every fact's own coordinates, per partition", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const bytes = await bytesOf(await served.get(`/lanes/${fixture.sessionHandle}`))
      const derived = clipped(fixture.sessionFacts, LANE_TAIL_LIMIT_DEFAULT, undefined)
      expect(await memberBytes(bytes, "facts")).toEqual(
        await canonical(derived.map((fact) => ({
          partition: fact.partition,
          position: fact.position,
          digest: fact.digest,
          holder: fact.holder,
          event: fact.event as WireValue,
        }))),
      )
      // Per partition and never interleaved: the rows come out grouped by the
      // partition that carried them, each group in its own position order.
      const rows = valueOf(bytes).facts as ReadonlyArray<Record<string, number>>
      expect(rows.map((row) => row.partition!)).toEqual(
        [...rows.map((row) => row.partition!)].sort((a, b) => a - b),
      )
    } finally {
      await served.dispose()
    }
  })

  test("the register read carries the fold's three-state vocabulary", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const bytes = await bytesOf(await served.get(`/registers/${REGISTER_KEY}`))
      const derived = matchState({
        absent: (): WireValue => ({ state: "absent" }),
        held: (state): WireValue => ({
          state: "held",
          token: state.token,
          holder: state.holder,
        }),
        landed: (state): WireValue => ({
          state: "landed",
          token: state.token,
          holder: state.holder,
          outcome: { token: state.outcome.token, value: state.outcome.value },
        }),
      })(fixture.register)
      expect(await memberBytes(bytes, "observed")).toEqual(await canonical(derived))
      expect(valueOf(bytes).work).toBe(WorkKey.make(REGISTER_KEY))
    } finally {
      await served.dispose()
    }
  })

  test("the cell read carries the canonical observation set and its identity", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const bytes = await bytesOf(await served.get(`/cells/${CELL_NAME}`))
      const derived = await run(stateOf(fixture.observations))
      expect(await memberBytes(bytes, "state")).toEqual(await canonical({
        observations: derived.observations.map((observation) => ({
          holder: observation.holder,
          value: observation.value,
        })),
        digest: derived.digest,
      }))
      expect(valueOf(bytes).cell).toBe(await run(cellName(CELL_NAME)))
    } finally {
      await served.dispose()
    }
  })

  test("the incarnation chain carries the succession the fence decided, newest first", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const bytes = await bytesOf(await served.get(`/incarnations/${fixture.store}`))
      expect(await memberBytes(bytes, "chain")).toEqual(
        await canonical([fixture.incarnation]),
      )
      const value = valueOf(bytes)
      expect(value.store).toBe(fixture.store)
      expect(value.bound).toBe(INCARNATION_CHAIN_MAX)
    } finally {
      await served.dispose()
    }
  })

  test("the projection is total over each plane value's own fields", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      // Nothing is re-shaped on the way out, and that is held mechanically: a
      // field added to a plane value and not to its projection would leave the
      // wire silently narrower, and the key sets would stop agreeing here.
      const facts = valueOf(await bytesOf(
        await served.get(`/lanes/${fixture.sessionHandle}`),
      )).facts as ReadonlyArray<Record<string, WireValue>>
      expect(Object.keys(facts[0]!).sort())
        .toEqual(Object.keys(fixture.sessionFacts[0]!).sort())

      const connections = valueOf(await bytesOf(await served.get("/sessions")))
        .connections as ReadonlyArray<Record<string, WireValue>>
      const reading = (await run(connectionsOf(fixture.sessionFacts)))[0]!
      expect(Object.keys(connections[0]!).sort()).toEqual(Object.keys(reading).sort())

      const state = valueOf(await bytesOf(await served.get(`/cells/${CELL_NAME}`)))
        .state as Record<string, WireValue>
      const cell = await run(stateOf(fixture.observations))
      expect(Object.keys(state).sort()).toEqual(Object.keys(cell).sort())
      expect(Object.keys((state.observations as ReadonlyArray<Record<string, WireValue>>)[0]!).sort())
        .toEqual(Object.keys(cell.observations[0]!).sort())

      const observed = valueOf(await bytesOf(await served.get(`/registers/${REGISTER_KEY}`)))
        .observed as Record<string, WireValue>
      // The register's projection is the FOLD's, so its key set is the arm's
      // and not the observed struct's: a landed state names its token, its
      // holder and its outcome, and the fold's own name for which arm answered.
      expect(Object.keys(observed).sort()).toEqual(["holder", "outcome", "state", "token"])
    } finally {
      await served.dispose()
    }
  })

  test("every served payload is its own canonical form: decoding and re-encoding returns the bytes", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const paths = [
        "/",
        "/sessions",
        `/lanes/${fixture.sessionHandle}`,
        `/registers/${REGISTER_KEY}`,
        `/cells/${CELL_NAME}`,
        `/incarnations/${fixture.store}`,
        // Both refusal registers too, so a refusal payload is held to the same
        // law an answer is.
        "/lanes/a-handle-no-declaration-derives",
        "/nothing-declares-this",
      ]
      for (const path of paths) {
        const bytes = await bytesOf(await served.get(path))
        const decoded = decodeJson(bytes)
        expect({ path, ok: decoded.ok }).toEqual({ path, ok: true })
        if (!decoded.ok) continue
        const reencoded = encodeJsonValue(decoded.value)
        expect({ path, ok: reencoded.ok }).toEqual({ path, ok: true })
        if (!reencoded.ok) continue
        // A payload shaped by hand fails here: the re-encoding is the one
        // canonical form, and only a payload that WAS that form matches it.
        expect({ path, bytes: reencoded.bytes }).toEqual({ path, bytes: textOf(bytes) })
      }
    } finally {
      await served.dispose()
    }
  })
})

describe("every collection is bounded", () => {
  test("the span is clipped to the last positions the stream carries", () => {
    expect(readSpan(1, 100, 10)).toEqual({ from: 91, count: 10 })
    expect(readSpan(40, 100, 1000)).toEqual({ from: 40, count: 61 })
    expect(readSpan(1, 3, 10)).toEqual({ from: 1, count: 3 })
    // An empty stream has no span, which is how a lane nobody emitted onto reads
    // as an empty tail rather than as a read of positions nobody wrote.
    expect(readSpan(1, 0, 10)).toBeUndefined()
    expect(readSpan(5, 4, 10)).toBeUndefined()
  })

  test("a limit has a default, a floor and a ceiling, and none of them is a demand", () => {
    expect(admittedLimit(undefined)).toBe(LANE_TAIL_LIMIT_DEFAULT)
    expect(admittedLimit(0)).toBe(1)
    expect(admittedLimit(-4)).toBe(1)
    expect(admittedLimit(LANE_TAIL_LIMIT_MAX * 10)).toBe(LANE_TAIL_LIMIT_MAX)
    expect(admittedLimit(7)).toBe(7)
    expect(admittedLimit(Number.NaN)).toBe(LANE_TAIL_LIMIT_DEFAULT)
  })

  test("the served answer reports the bound it was taken under, and honours it", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const value = valueOf(await bytesOf(
        await served.get(`/lanes/${fixture.sessionHandle}?limit=2`),
      ))
      expect(value.limit).toBe(2)
      const rows = value.facts as ReadonlyArray<Record<string, number>>
      expect(rows.length).toBe(clipped(fixture.sessionFacts, 2, undefined).length)
      // The bound is per partition, so two partitions at two rows each is four
      // rows and not two: a lane-wide count would have to divide across
      // sequences that cannot be compared.
      expect(rows.length).toBe(4)

      const one = valueOf(await bytesOf(
        await served.get(`/lanes/${fixture.sessionHandle}?limit=2&partition=3`),
      ))
      expect((one.facts as ReadonlyArray<Record<string, number>>).length).toBe(2)
    } finally {
      await served.dispose()
    }
  })

  test("a live read that cannot stage an arrival teaches instead of dropping it", async () => {
    // The measurement is over a real bounded queue rather than a description of
    // one: the unsafe offer a live read stages with answers `false` when the
    // queue is full and DROPS the message, so this arm fills a queue of one and
    // watches what the second arrival does. A stream carrying "each landing,
    // once" cannot lose one quietly, so the second arrival must end the stream
    // with the refusal rather than vanish.
    const lane = await run(sessionLane())
    const staged = await Effect.runPromise(Effect.gen(function* () {
      const queue = yield* Queue.make<string, Refusal | Cause.Done>({ capacity: 1 })
      const first = stageArrival(queue, "one", () => readerBehind(lane, 0, 1))
      const second = stageArrival(queue, "two", () => readerBehind(lane, 0, 1))
      const drained = yield* Effect.result(Stream.runCollect(Stream.fromQueue(queue)))
      return { first, second, drained }
    }))
    expect({ first: staged.first, second: staged.second })
      .toEqual({ first: true, second: false })
    expect(Result.isFailure(staged.drained)).toBe(true)
    if (!Result.isFailure(staged.drained)) return
    const refusal = staged.drained.failure
    // Absence, because the facts are all still on the lane: the repair is the
    // bounded tail, and the sort is what tells a reader the read may be taken
    // again.
    expect({ sort: refusal.sort, kind: refusal.kind })
      .toEqual({ sort: "absence", kind: "lane-read-window-exceeded" })
    expect(refusal.next[0]!.subject).toBe("Lane.tail")
  })

  test("a malformed bound refuses structurally rather than being repaired into a default", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const response = await served.get(`/lanes/${fixture.sessionHandle}?limit=every`)
      expect(response.status).toBe(422)
      expect(valueOf(await bytesOf(response)).sort).toBe("structural")
    } finally {
      await served.dispose()
    }
  })
})

describe("the stream replays", () => {
  test("scripted landings arrive in order, once each, as the fold's own steps", async () => {
    const fixture = await buildFixture()
    const served = face(fixture, Stream.fromIterable(fixture.sessionFacts))
    try {
      const response = await served.get("/sessions/changes")
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain(ApiFace.STREAM_MEDIA_TYPE)
      const frames = framesOf(await response.text())
      const steps = await run(Stream.runCollect(
        connectionChanges(Stream.fromIterable(fixture.sessionFacts)),
      ))
      // One frame per landed fact: in order, once each, nothing dropped and
      // nothing repeated.
      expect(frames.length).toBe(fixture.sessionFacts.length)
      expect(frames.length).toBe(steps.length)
      for (let index = 0; index < frames.length; index++) {
        const step = steps[index]!
        const expected = textOf(await canonical({
          v: 0,
          kind: STEP_EVENT,
          step: {
            session: step.session,
            position: step.position,
            event: step.event,
            from: step.from,
            to: step.to,
            moved: step.moved,
          },
        }))
        expect({ index, event: frames[index]!.event, data: frames[index]!.data })
          .toEqual({ index, event: STEP_EVENT, data: expected })
      }
      // Once each, checked on the coordinates themselves rather than on a count.
      const coordinates = frames.map((frame) => {
        const step = parsed(frame.data).step as Record<string, WireValue>
        return `${String(step.session)}:${String(step.position)}`
      })
      expect(new Set(coordinates).size).toBe(coordinates.length)
    } finally {
      await served.dispose()
    }
  })

  test("a refusal mid-stream teaches on the wire rather than closing silently", async () => {
    const fixture = await buildFixture()
    const planted = observationFact({
      session: fixture.session,
      event: "a-word-the-transcription-places-nowhere",
      state: null,
      payload: {},
    })
    const rows = await landed<SessionFact>([planted], 0)
    const served = face(fixture, Stream.fromIterable(rows))
    try {
      const frames = framesOf(await (await served.get("/sessions/changes")).text())
      expect(frames.length).toBe(1)
      expect(frames[0]!.event).toBe(REFUSAL_EVENT)
      const refusal = parsed(frames[0]!.data)
      expect({ sort: refusal.sort, kind: refusal.kind })
        .toEqual({ sort: "structural", kind: "malformed-value" })
    } finally {
      await served.dispose()
    }
  })
})

describe("the first byte", () => {
  test("the first frame is on the wire before the producing sequence completes", async () => {
    const fixture = await buildFixture()
    const gate = await Effect.runPromise(Deferred.make<void>())
    const emitted: Array<number> = []
    const [first, ...rest] = fixture.sessionFacts
    const live: Stream.Stream<LandedFact<SessionFact>, Refusal> = Stream.make(first!).pipe(
      Stream.concat(Stream.fromEffectDrain(Deferred.await(gate))),
      Stream.concat(Stream.fromIterable(rest)),
      Stream.tap((fact) => Effect.sync(() => emitted.push(fact.position))),
    )
    const served = face(fixture, live)
    try {
      const response = await served.get("/sessions/changes")
      const reader = response.body!.getReader()
      const chunk = await reader.read()
      // The measurement: a frame is readable, and the producer has emitted
      // exactly the one fact behind it. Everything after it is still waiting on
      // a gate this test has not opened.
      expect(chunk.done).toBe(false)
      const frames = framesOf(textOf(chunk.value!))
      expect(frames.length).toBeGreaterThanOrEqual(1)
      expect(frames[0]!.event).toBe(STEP_EVENT)
      expect(emitted).toEqual([first!.position])
      expect(rest.length).toBeGreaterThan(0)

      // Opening the gate lets the rest through the same, already-open response.
      await Effect.runPromise(Deferred.succeed(gate, undefined))
      let seen = frames.length
      while (seen < fixture.sessionFacts.length) {
        const next = await reader.read()
        if (next.done) break
        seen += framesOf(textOf(next.value!)).length
      }
      expect(seen).toBe(fixture.sessionFacts.length)
      expect(emitted.length).toBe(fixture.sessionFacts.length)
    } finally {
      await served.dispose()
    }
  })
})

describe("no write enters here", () => {
  test("every write verb is refused with the methods this face carries", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const paths = ["/", "/sessions", `/cells/${CELL_NAME}`, `/registers/${REGISTER_KEY}`]
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        for (const path of paths) {
          const response = await served.send(method, path)
          expect({ method, path, status: response.status })
            .toEqual({ method, path, status: 405 })
          expect(response.headers.get("allow")).toBe(ApiFace.READ_METHODS.join(", "))
          const refusal = valueOf(await bytesOf(response))
          expect(refusal.sort).toBe("structural")
          // The teaching names where judgment lives, so a caller learns the door
          // rather than merely that this was the wrong verb.
          const next = refusal.next as ReadonlyArray<Record<string, string>>
          expect(next.length).toBeGreaterThan(0)
          expect(next[0]!.note).toContain("admission door")
        }
      }
    } finally {
      await served.dispose()
    }
  })

  test("a read this face does not declare answers 404 with the roster", async () => {
    const fixture = await buildFixture()
    const served = face(fixture)
    try {
      const response = await served.get("/nothing-declares-this")
      expect(response.status).toBe(404)
      const refusal = valueOf(await bytesOf(response))
      expect(refusal.sort).toBe("structural")
      const expected = refusal.expected as ReadonlyArray<string>
      expect(expected).toContain("/sessions")
      expect(expected).toContain("/cells/:cell")
    } finally {
      await served.dispose()
    }
  })

  test("the face reaches no write module at all", () => {
    // The type already says it — the layer requires the three READ services and
    // nothing else — and this is the same fact read off the import graph, so a
    // handler that grew a write would move both together.
    const source = readFileSync(
      resolve(import.meta.dir, "../src/surface/api.ts"),
      "utf8",
    )
    const specifiers = [...source.matchAll(/from "([^"]+)"/g)].map((found) => found[1]!)
    for (const specifier of specifiers) {
      expect({ specifier, carriage: specifier.includes("/carriage/") })
        .toEqual({ specifier, carriage: false })
      expect({ specifier, door: specifier.includes("KernelDoor") })
        .toEqual({ specifier, door: false })
    }
  })
})

describe("law 10 over the bytes this face serves", () => {
  const swept = async (): Promise<string> => {
    const fixture = await buildFixture()
    const served = face(fixture, Stream.fromIterable(fixture.sessionFacts))
    try {
      const paths = [
        "/",
        "/sessions",
        `/lanes/${fixture.sessionHandle}`,
        `/lanes/${fixture.heartbeatHandle}`,
        `/registers/${REGISTER_KEY}`,
        `/cells/${CELL_NAME}`,
        `/incarnations/${fixture.store}`,
        "/lanes/a-handle-no-declaration-derives",
        "/nothing-declares-this",
      ]
      const lines: Array<string> = []
      for (const path of paths) lines.push(textOf(await bytesOf(await served.get(path))))
      for (const method of ["POST", "DELETE"]) {
        lines.push(textOf(await bytesOf(await served.send(method, "/sessions"))))
      }
      lines.push(await (await served.get("/sessions/changes")).text())
      return lines.join("\n")
    } finally {
      await served.dispose()
    }
  }

  test("no served payload carries a tracking id, a filesystem path, or a generation command", async () => {
    const bytes = await swept()
    const checked = checkNoTrackingArtifacts(
      [{ surface: "the read face's served payloads", bytes }],
      RETIRED_DRAFT_MARKERS,
      // No exclusion is live on this surface: the id-shaped tokens the official
      // documents excuse by name appear in nothing this face serves, so excusing
      // one here would be a standing licence nothing relies on.
      [],
    )
    expect(checked).toEqual({
      ok: true,
      surfaces: 1,
      lines: bytes.split("\n").length,
      exclusions: 0,
    })
  })

  test("the sweep goes red on a plant, so the pass is evidence", async () => {
    const bytes = await swept()
    for (const planted of ["DEV-878", "packages/plait/src/surface/api.ts", "bun run gates"]) {
      const checked = checkNoTrackingArtifacts(
        [{ surface: "the read face's served payloads", bytes: `${bytes}\n${planted}` }],
        RETIRED_DRAFT_MARKERS,
        [],
      )
      expect({ planted, ok: checked.ok }).toEqual({ planted, ok: false })
    }
  })
})
