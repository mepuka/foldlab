import { afterEach, describe, expect, test } from "bun:test"

import { Effect, Exit, Fiber, Layer, Stream } from "effect"
import { HttpRouter } from "effect/unstable/http"

import { decodeJson } from "@foldlab/core/jcs"

import * as ApiFace from "../src/surface/api.js"
import type { WireValue } from "../src/truth/Canonical.js"
import type { Digest } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { Cells, cellName } from "../src/planes/Cell.js"
import {
  LANE_TAIL_LIMIT_DEFAULT,
  LaneReads,
  Lanes,
  type LandedFact,
} from "../src/planes/Lane.js"
import { Registers, workKey } from "../src/planes/Register.js"
import { Holder } from "../src/kernel/Wire.js"
import { connectionsOf } from "../src/internal/connectionfold.js"
import type { SessionFact } from "../src/internal/sessionfacts.js"
import { mintSession, observationFact, transitionFact } from "../src/internal/sessionfacts.js"
import { landFacts, sessionLane } from "../src/internal/sessionlanes.js"
import {
  estateDeclaration,
  substrateDeclarationOf,
  type SessionGroups,
} from "../src/internal/substrate.js"
import { declaredConnect } from "../src/internal/transport.js"
import { WIRE_STATUS_BY_DECLARATION } from "../src/internal/wirevocabulary.js"
import { declareSubstrateWrit } from "../src/internal/writs.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The read path against a real substrate.
 *
 * `Api.test.ts` holds the FACE's laws over fixtures — that a payload is the
 * plane read's own canonical bytes, that a collection is bounded, that the live
 * read is transport. What that file cannot hold is that the read adapters speak
 * the substrate correctly, because a fixture answers whatever it was given.
 * This file is that half and only that half: facts are landed through the emit
 * path, read back through the bounded tail and the live continuation, and then
 * served through the face over the same server — so the claim "the face reads
 * the planes" is measured end to end rather than assembled from two halves that
 * never met.
 *
 * The two arms are held apart on purpose. A read that agreed with the emit
 * acknowledgement but disagreed with the stream would pass one and fail the
 * other, which is what makes the pair evidence rather than a round trip through
 * one implementation.
 */

const LAYER = "foldlab-plait-lane-reads"
const HOLDER = Holder.make("read-face-live")
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

const DROP = WIRE_STATUS_BY_DECLARATION.DisconnectStatus.type
const RETRY = WIRE_STATUS_BY_DECLARATION.ReconnectingStatus.type
const READING = WIRE_STATUS_BY_DECLARATION.ClientPingStatus.type

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const groupsFor = Effect.fn("wall.groups")(function* (
  client: number,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: `127.0.0.1:${INFO.port}` }, LAYER)
  const writ = yield* declareSubstrateWrit(LAYER)
  return {
    substrate: yield* substrateDeclarationOf({ ...INFO, client_id: client }),
    options: declared.digest,
    estate: estateDeclaration({ writ: writ.digest, layer: LAYER, shapes: [] }),
  }
})

/** One session's facts, minted through the estate's own mints. */
const scripted = Effect.fn("wall.scripted")(function* (
  client: number,
): Effect.fn.Return<{
  readonly session: Digest
  readonly facts: ReadonlyArray<SessionFact>
}, Refusal> {
  const minted = yield* mintSession(yield* groupsFor(client), null)
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
})

const carriers = (servers: string) =>
  Layer.mergeAll(
    Lanes.layer({ servers }),
    LaneReads.layer({ servers }),
  )

const valueOf = (bytes: Uint8Array): Record<string, WireValue> => {
  const decoded = decodeJson(bytes)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok) throw new Error("the served payload did not decode")
  return decoded.value as Record<string, WireValue>
}

describe("the read path over a real substrate", () => {
  test("the bounded tail reads back exactly what emit landed, grouped by partition", async () => {
    harness = await startNatsHarness()
    const servers = harness.url

    const measured = await Effect.runPromise(Effect.gen(function* () {
      const lane = yield* sessionLane()
      const first = yield* scripted(INFO.client_id)
      const second = yield* scripted(INFO.client_id + 1)
      const landedFirst = yield* landFacts(lane, first.facts, HOLDER)
      const landedSecond = yield* landFacts(lane, second.facts, HOLDER)
      const reads = yield* LaneReads
      const tail = yield* reads.tail(lane, {})
      const bounded = yield* reads.tail(lane, { limit: 2 })
      const onePartition = yield* reads.tail(lane, {
        partition: landedFirst[0]!.partition,
        limit: LANE_TAIL_LIMIT_DEFAULT,
      })
      return { lane, first, second, landedFirst, landedSecond, tail, bounded, onePartition }
    }).pipe(Effect.provide(carriers(servers)), Effect.scoped, Effect.orDie))

    const emitted = [...measured.landedFirst, ...measured.landedSecond]
    // Every landed fact comes back, and each row carries the coordinates the
    // emit acknowledgement reported — the same position on the same partition
    // under the same identity.
    expect(measured.tail.length).toBe(emitted.length)
    for (const acknowledged of emitted) {
      const row = measured.tail.find((fact) =>
        fact.partition === acknowledged.partition && fact.position === acknowledged.position
      )
      expect({ digest: row?.digest, holder: row?.holder })
        .toEqual({ digest: acknowledged.digest, holder: HOLDER })
    }
    // Grouped by partition, each group in its own position order, never
    // interleaved into one order by position.
    const parts = measured.tail.map((fact) => fact.partition)
    expect(parts).toEqual([...parts].sort((left, right) => left - right))
    for (const part of new Set(parts)) {
      const own = measured.tail.filter((fact) => fact.partition === part)
      expect(own.map((fact) => fact.position))
        .toEqual([...own.map((fact) => fact.position)].sort((left, right) => left - right))
    }
    // The bound clips each partition rather than the lane.
    for (const part of new Set(parts)) {
      expect(measured.bounded.filter((fact) => fact.partition === part).length)
        .toBeLessThanOrEqual(2)
    }
    expect(measured.onePartition.every((fact) =>
      fact.partition === measured.landedFirst[0]!.partition
    )).toBe(true)

    // And the decoded facts are the facts, so the fold over them answers about
    // the sessions that were scripted.
    const connections = await Effect.runPromise(
      connectionsOf(measured.tail as ReadonlyArray<LandedFact<SessionFact>>).pipe(Effect.orDie),
    )
    expect(connections.map((reading) => reading.session).sort())
      .toEqual([measured.first.session, measured.second.session].sort())
  }, 180_000)

  test("a lane nobody has spoken on reads empty, and the face answers rather than refuses", async () => {
    harness = await startNatsHarness()
    const servers = harness.url

    // Nothing is emitted here at all, so the partition streams the emit path
    // would declare do not exist. That is the state a fresh estate is in on its
    // first request, and it is the state this arm measures.
    const tail = await Effect.runPromise(Effect.gen(function* () {
      const reads = yield* LaneReads
      return yield* reads.tail(yield* sessionLane(), {})
    }).pipe(Effect.provide(carriers(servers)), Effect.scoped, Effect.orDie))
    expect(tail).toEqual([])

    const app = ApiFace.layer.pipe(
      HttpRouter.provideRequest(Layer.mergeAll(
        LaneReads.layer({ servers }),
        Cells.layer({ servers }),
        Registers.layer({ servers }),
      )),
      Layer.orDie,
    )
    const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
    try {
      const response = await handler(new Request(`${ORIGIN}/sessions`))
      // 200 with nothing to report, never 503: an absent stream is an absent
      // FACT, and a reader told the substrate was unavailable would read a fresh
      // estate as a broken one.
      expect(response.status).toBe(200)
      const snapshot = valueOf(new Uint8Array(await response.arrayBuffer()))
      expect(snapshot.connections).toEqual([])
      expect(snapshot.folded).toBe(0)
    } finally {
      await dispose()
    }
  }, 180_000)

  test("the live read carries an emission that landed after it started", async () => {
    harness = await startNatsHarness()
    const servers = harness.url

    const seen = await Effect.runPromise(Effect.gen(function* () {
      const lane = yield* sessionLane()
      const one = yield* scripted(INFO.client_id)
      // One landing before the follow, so every partition stream exists and the
      // live read is measured on arrival rather than on stream creation.
      yield* landFacts(lane, [one.facts[0]!], HOLDER)
      const reads = yield* LaneReads

      const following = yield* Effect.forkChild(
        Stream.runCollect(Stream.take(reads.follow(lane, {}), 1)),
      )
      // The consumer is established asynchronously, so the arm keeps landing
      // facts until one of them arrives rather than sleeping once and hoping.
      // Each landing carries its own attempt coordinate, so each is a distinct
      // body with a distinct identity: a repeated body would be absorbed by the
      // partition stream's own duplicate window and never reach the reader.
      let polled: Exit.Exit<ReadonlyArray<LandedFact<SessionFact>>, Refusal> | undefined
      const landed: Array<Digest> = []
      for (let attempt = 0; attempt < 40 && polled === undefined; attempt++) {
        const emitted = yield* landFacts(lane, [observationFact({
          session: one.session,
          event: READING,
          state: null,
          payload: { attempt },
        })], HOLDER)
        landed.push(emitted[0]!.digest)
        yield* Effect.sleep("150 millis")
        polled = following.pollUnsafe()
      }
      yield* Fiber.interrupt(following)
      return { polled, landed }
    }).pipe(Effect.provide(carriers(servers)), Effect.scoped, Effect.orDie))

    // A fact that landed AFTER the read started reached the reader, and it is
    // one of the facts this arm landed rather than an echo of the seed.
    expect(seen.polled).not.toBeUndefined()
    expect(Exit.isSuccess(seen.polled!)).toBe(true)
    if (!Exit.isSuccess(seen.polled!)) return
    const carried = seen.polled!.value
    expect(carried.length).toBe(1)
    expect(seen.landed).toContain(carried[0]!.digest)
    expect(carried[0]!.holder).toBe(HOLDER)
  }, 180_000)

  test("the face answers the planes over the same server", async () => {
    harness = await startNatsHarness()
    const servers = harness.url

    const scriptedSession = await Effect.runPromise(Effect.gen(function* () {
      const lane = yield* sessionLane()
      const one = yield* scripted(INFO.client_id)
      yield* landFacts(lane, one.facts, HOLDER)
      const cells = yield* Cells
      yield* cells.merge(yield* cellName("live-read-cell"), [{ holder: "seat-a", value: 1 }])
      return { lane, session: one.session }
    }).pipe(
      Effect.provide(Layer.mergeAll(carriers(servers), Cells.layer({ servers }))),
      Effect.scoped,
      Effect.orDie,
    ))

    const app = ApiFace.layer.pipe(
      HttpRouter.provideRequest(Layer.mergeAll(
        LaneReads.layer({ servers }),
        Cells.layer({ servers }),
        Registers.layer({ servers }),
      )),
      Layer.orDie,
    )
    const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
    try {
      const sessions = await handler(new Request(`${ORIGIN}/sessions`))
      expect(sessions.status).toBe(200)
      const snapshot = valueOf(new Uint8Array(await sessions.arrayBuffer()))
      expect(snapshot.lane).toBe(scriptedSession.lane.digest)
      const connections = snapshot.connections as ReadonlyArray<Record<string, WireValue>>
      expect(connections.map((row) => row.session)).toContain(scriptedSession.session)

      const cell = await handler(new Request(`${ORIGIN}/cells/live-read-cell`))
      expect(cell.status).toBe(200)
      const state = valueOf(new Uint8Array(await cell.arrayBuffer())).state as Record<
        string,
        WireValue
      >
      expect((state.observations as ReadonlyArray<unknown>).length).toBe(1)

      // A register nobody fenced reads as absent, which is a read and not a
      // refusal: absence at a key is a state the fold names.
      const key = await Effect.runPromise(workKey("live-read-work").pipe(Effect.orDie))
      const register = await handler(new Request(`${ORIGIN}/registers/${key}`))
      expect(register.status).toBe(200)
      const observed = valueOf(new Uint8Array(await register.arrayBuffer())).observed as Record<
        string,
        WireValue
      >
      expect(observed.state).toBe("absent")

      // And the write half is refused over the live carriers exactly as it is
      // over fixtures: the face has no write to reach whatever is underneath.
      const written = await handler(new Request(`${ORIGIN}/sessions`, { method: "POST" }))
      expect(written.status).toBe(405)
    } finally {
      await dispose()
    }
  }, 180_000)
})
