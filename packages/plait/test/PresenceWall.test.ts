import { join } from "node:path"

import { afterEach, describe, expect, test } from "bun:test"

import { jetstreamManager } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Schema } from "effect"

import { verifyEnvelopeDigest } from "../src/kernel/Wire.js"
import { initial } from "../src/planes/Anchor.js"
import type { DeclaredLane } from "../src/planes/Lane.js"
import { Lanes } from "../src/planes/Lane.js"
import { canonicalBytes } from "../src/truth/Canonical.js"
import { digestOf } from "../src/truth/Digest.js"
import {
  declareSchedule,
  HeartbeatFact,
  tickFact,
  type HealthReading,
} from "../src/internal/heartbeat.js"
import { heartbeatLane, landTick } from "../src/internal/heartbeatlane.js"
import { laneStreamName } from "../src/internal/lanes.js"
import {
  currentMembers,
  membersOf,
  presenceAlgebra,
  presenceAt,
  presenceContribution,
  PRESENCE_BOTTOM,
  SILENCE_READING,
  stalenessOf,
  type PresenceState,
} from "../src/internal/presence.js"
import { SessionFact } from "../src/internal/sessionfacts.js"
import { sessionLane } from "../src/internal/sessionlanes.js"
import { replaySuccessors, type PositionedEvent } from "../src/internal/successors.js"
import { startNatsHarness, waitForFile, type NatsHarness } from "./NatsHarness.js"

/**
 * Presence and staleness over a real substrate, with one holder taken away by
 * signal 9.
 *
 * The claim in every arm is the SHAPE. The counts and spans this file prints are
 * MEASUREMENTS — one host on one night, and the next host will produce its own —
 * and none of them is asserted as a bound. What is asserted is the pair the
 * commission called non-negotiable: no read reports the killed session as
 * connected-and-current, and no session lacking an established fact is ever a
 * member.
 *
 * The reads are taken over the lanes' own stored bytes, verified against the
 * message id the substrate carries, and folded through the declared reduction
 * from an anchor. Nothing here asks the broker who is connected: the connection
 * table is refused as an oracle, not merely unused, and at these pins it is not
 * reachable anyway.
 */

const SCHEDULE = { origin: "2026-08-19T00:00:00.000Z", period: 250 }
const TOLERANCE = 2
const OBSERVED: HealthReading = { health: "open", healthSource: "client-observed" }

let harness: NatsHarness | undefined
const holders: Array<{ kill: (signal?: number) => void; exited: Promise<number> }> = []

afterEach(async () => {
  for (const holder of holders) {
    holder.kill(9)
    await holder.exited
  }
  holders.length = 0
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

interface Ready {
  readonly session: string
  readonly schedule: string
}

/** Starts one holder process and waits for the session it declared. */
const startHolder = async (url: string, directory: string, name: string): Promise<{
  readonly ready: Ready
  readonly process: { kill: (signal?: number) => void; exited: Promise<number> }
}> => {
  const readyPath = join(directory, `${name}.json`)
  const child = Bun.spawn({
    cmd: [
      "bun",
      "run",
      "./test/process/presence-holder.ts",
      url,
      readyPath,
      name,
      SCHEDULE.origin,
      String(SCHEDULE.period),
    ],
    stdout: "inherit",
    stderr: "inherit",
  })
  holders.push(child)
  await waitForFile(readyPath)
  return { ready: JSON.parse(await Bun.file(readyPath).text()) as Ready, process: child }
}

/**
 * Reads one lane partition back as positioned events, verified against the
 * message id the substrate stored beside the bytes.
 *
 * The oracle is outside the decode: the digest is re-derived from the fetched
 * octets and checked against the id the emit path derived from them, so a
 * repaired or substituted body fails here rather than folding quietly.
 */
const readLane = async <Event>(
  url: string,
  lane: DeclaredLane<Event, 1 | 8>,
  partition: number,
): Promise<{ readonly head: number; readonly events: ReadonlyArray<PositionedEvent<Event>> }> => {
  const connection = await connect({ servers: url })
  try {
    const manager = await jetstreamManager(connection)
    const stream = laneStreamName(lane, partition)
    const info = await manager.streams.info(stream)
    const head = info.state.last_seq
    const events: Array<PositionedEvent<Event>> = []
    for (let seq = Math.max(1, info.state.first_seq); head > 0 && seq <= head; seq++) {
      const stored = await manager.streams.getMessage(stream, { seq })
      if (stored === null) continue
      const messageId = stored.header.get("Nats-Msg-Id")
      const verified = await Effect.runPromise(
        verifyEnvelopeDigest(stored.data, messageId).pipe(Effect.orDie),
      )
      events.push({
        position: stored.seq,
        event: verified.envelope.body as Event,
        digest: verified.digest,
      })
    }
    return { head, events }
  } finally {
    await connection.close()
  }
}

/** Reads every partition of the session lane, in position order per partition. */
const readSessionFacts = async (
  url: string,
  lane: DeclaredLane<SessionFact, 8>,
): Promise<{ readonly head: number; readonly events: ReadonlyArray<PositionedEvent<SessionFact>> }> => {
  const connection = await connect({ servers: url })
  let partitions: ReadonlyArray<number>
  try {
    const manager = await jetstreamManager(connection)
    const names = await manager.streams.names().next()
    partitions = Array.from({ length: lane.partitions }, (_, part) => part).filter((part) =>
      names.includes(laneStreamName(lane, part))
    )
  } finally {
    await connection.close()
  }
  const collected: Array<PositionedEvent<SessionFact>> = []
  let head = 0
  for (const part of partitions) {
    const read = await readLane(url, lane, part)
    head += read.head
    collected.push(...read.events)
  }
  // The session lane is partitioned, so its fold reads the multiset
  // presentation and the order across partitions is not meaning. Positions are
  // re-issued densely here only so the successor discipline can replay them;
  // the reduction is commutative and idempotent, so the renumbering changes no
  // fold value — which is the erasure the rung licenses, executed.
  return {
    head,
    events: collected.map((event, index) => ({ ...event, position: index + 1 })),
  }
}

const foldPresence = (events: ReadonlyArray<PositionedEvent<SessionFact>>) =>
  Effect.gen(function* () {
    const algebra = yield* presenceAlgebra
    const anchor = yield* initial(PRESENCE_BOTTOM as never)
    return yield* replaySuccessors<SessionFact, PresenceState>({
      anchor,
      state: PRESENCE_BOTTOM,
      deliveries: events,
      step: (state, fact) => algebra.reducer.combine(state, presenceContribution.apply(fact)),
    })
  }).pipe(Effect.orDie)

describe("presence and staleness over a real substrate", () => {
  test(
    "a holder killed with signal 9 reads absent by silence, and never falsely connected",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url
      const directory = harness.directory

      const alive = await startHolder(url, directory, "presence-alive-one")
      const second = await startHolder(url, directory, "presence-alive-two")
      const doomed = await startHolder(url, directory, "presence-doomed")

      const sessions = await Effect.runPromise(sessionLane().pipe(Effect.orDie))
      const heartbeats = await Effect.runPromise(heartbeatLane().pipe(Effect.orDie))

      // Every holder is up and every one of them has landed a tick; let the two
      // survivors advance the heartbeat lane a few firings before the kill so
      // the arm has a head to subtract against.
      await Bun.sleep(SCHEDULE.period * 6)

      const firingsFor = (
        read: { readonly events: ReadonlyArray<{ readonly event: { readonly session: string } }> },
        session: string,
      ): number => read.events.filter((tick) => tick.event.session === session).length

      const before = await readLane(url, heartbeats, 0)

      // The kill. No finalizer runs, so no ended fact is written — by
      // construction, and that is the point of the arm.
      const killed = Date.now()
      doomed.process.kill(9)
      await doomed.process.exited

      // Two reads AFTER the kill, several periods apart. Comparing across the
      // kill instant would race a tick already in flight when the signal
      // arrived; comparing two post-kill reads cannot, because the process that
      // would have emitted between them is gone.
      await Bun.sleep(SCHEDULE.period * 4)
      const settled = await readLane(url, heartbeats, 0)
      await Bun.sleep(SCHEDULE.period * 8)
      const elapsed = Date.now() - killed

      const sessionRead = await readSessionFacts(url, sessions)
      const heartbeatRead = await readLane(url, heartbeats, 0)
      const replayed = await Effect.runPromise(foldPresence(sessionRead.events))

      // 1. Ticks landed with the occurrence key and the mandatory provenance.
      expect(heartbeatRead.events.length).toBeGreaterThan(0)
      for (const tick of heartbeatRead.events) {
        expect(tick.event.kind).toBe("substrate-heartbeat-tick")
        expect(tick.event.healthSource).toBe("client-observed")
        expect(Number.isSafeInteger(tick.event.firing) && tick.event.firing >= 1).toBe(true)
        expect(tick.event.schedule.length).toBe(64)
      }

      // 2. No ended fact exists for the killed session.
      const endedForDoomed = sessionRead.events.filter((fact) =>
        fact.event.kind === "substrate-session-ended" &&
        fact.event.session === doomed.ready.session
      )
      expect(endedForDoomed).toEqual([])

      // 3. Its heartbeat lane stopped advancing while the survivors' did not.
      const firingsSettled = firingsFor(settled, doomed.ready.session)
      const firingsAfter = firingsFor(heartbeatRead, doomed.ready.session)
      expect(firingsAfter).toBe(firingsSettled)
      expect(firingsFor(heartbeatRead, alive.ready.session))
        .toBeGreaterThan(firingsFor(settled, alive.ready.session))
      expect(firingsFor(heartbeatRead, second.ready.session))
        .toBeGreaterThan(firingsFor(settled, second.ready.session))

      // 4. The presence read at an anchor exhibits the silence.
      const reading = presenceAt({
        anchor: replayed.anchor,
        state: replayed.state,
        head: sessionRead.events.length,
        ticks: heartbeatRead.events,
        heartbeatHead: heartbeatRead.head,
        tolerance: TOLERANCE,
      })
      expect(reading.reading).toBe(SILENCE_READING)
      // Still a member — no ended fact was emitted, and the record is not
      // edited to pretend one was.
      expect(reading.membership).toContain(doomed.ready.session)
      // NEVER FALSELY CONNECTED: not among the sessions any read would call
      // connected-and-current.
      expect(currentMembers(reading)).not.toContain(doomed.ready.session)
      const doomedStaleness = reading.members.find(
        (member) => member.session === doomed.ready.session,
      )!.staleness
      expect(doomedStaleness.current).toBe(false)
      expect(doomedStaleness.staleness).toBeGreaterThan(TOLERANCE)
      // The survivors are current, so the arm is not vacuously "nobody is".
      expect(currentMembers(reading)).toContain(alive.ready.session)
      expect(currentMembers(reading)).toContain(second.ready.session)

      // 5. NEVER UNESTABLISHED: every member has an established fact on the
      // lane, and a session that only ever produced heartbeats is not one.
      const establishedSessions = new Set(
        sessionRead.events
          .filter((fact) => fact.event.kind === "substrate-session-established")
          .map((fact) => fact.event.session),
      )
      for (const member of reading.membership) expect(establishedSessions.has(member)).toBe(true)
      expect(membersOf(replayed.state)).toEqual([...reading.membership])

      console.log(
        `PRESENCE MEASUREMENT: ${heartbeatRead.events.length} ticks on the heartbeat lane over the arm` +
          ` (${firingsFor(before, doomed.ready.session)} for the killed session at the kill,` +
          ` ${firingsSettled} once settled, ${firingsAfter} eight periods later);` +
          ` head-minus-anchor staleness of the killed session at read time = ${
            String(doomedStaleness.staleness)
          } positions at heartbeat head ${heartbeatRead.head};` +
          ` ${elapsed}ms from the kill to the read; ${sessionRead.events.length} session facts,` +
          ` ${reading.membership.length} members, ${currentMembers(reading).length} current.`,
      )
    },
    240_000,
  )

  test(
    "two racing emitters of one occurrence land byte-identically, and the fold does not move",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url

      const measured = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const heartbeats = yield* heartbeatLane()
        const schedule = yield* declareSchedule(SCHEDULE)
        const session = yield* digestOf({ v: 0, kind: "wall-session", n: 1 } as never)
        const tick = tickFact(schedule, { session, firing: 11 }, OBSERVED)
        // A second emitter, minting the same occurrence independently rather
        // than re-sending the first emitter's value.
        const twin = tickFact(schedule, { session, firing: 11 }, OBSERVED)
        const [left, right] = yield* Effect.all([
          canonicalBytes(tick as never),
          canonicalBytes(twin as never),
        ])
        const [leftDigest, rightDigest] = yield* Effect.all([
          digestOf(tick as never),
          digestOf(twin as never),
        ])
        // Raced under one holder: both landings issued together, neither
        // waiting for the other, and both envelopes therefore identical.
        const [first, second] = yield* Effect.all(
          [
            landTick(heartbeats, tick, "wall.presence.emitter"),
            landTick(heartbeats, twin, "wall.presence.emitter"),
          ],
          { concurrency: 2 },
        )
        // And once more under a DIFFERENT holder, which is a different envelope
        // around the same body — the finding this arm reports below.
        const other = yield* landTick(heartbeats, twin, "wall.presence.other-holder")
        return {
          left,
          right,
          leftDigest,
          rightDigest,
          first,
          second,
          other,
          heartbeats,
          tick,
          session,
        }
      })).pipe(
        Effect.provide(Lanes.layer({ servers: url, connectionName: "wall-presence-duplicate" })),
        Effect.orDie,
      ))

      // The assertion is digest equality over the canonical bytes, not a count.
      expect(Array.from(measured.right)).toEqual(Array.from(measured.left))
      expect(measured.rightDigest).toBe(measured.leftDigest)

      // The substrate absorbs the racing twin: one position, and the landing
      // that arrived second is reported as the duplicate it is.
      expect(measured.second.position).toBe(measured.first.position)
      expect(measured.first.duplicate || measured.second.duplicate).toBe(true)

      // MEASURED, and reported rather than smoothed over: the lane's message id
      // is the ENVELOPE digest, and the envelope carries the holder. Two
      // different holders emitting one occurrence therefore land two messages,
      // because they are two envelopes around one body. The occurrence key is
      // what makes that harmless, and the next assertion is the proof: the read
      // over the lane does not move.
      expect(measured.other.position).toBeGreaterThan(measured.first.position)
      expect(measured.other.duplicate).toBe(false)

      const read = await readLane(url, measured.heartbeats, 0)
      // Two envelopes, one body: the stored bodies are byte-identical to the
      // one the first emitter minted, and only the envelopes around them differ.
      const bodies = new Set(
        await Promise.all(read.events.map((tick) =>
          Effect.runPromise(digestOf(tick.event as never).pipe(Effect.orDie))
        )),
      )
      expect([...bodies]).toEqual([measured.leftDigest])
      const envelopes = new Set(read.events.map((tick) => tick.digest))
      expect(envelopes.size).toBe(read.events.length)

      // The fold value is unchanged by the second landing. The occurrence is
      // the same occurrence, so the greatest firing citing the session is the
      // same firing, and the distance from the head is the distance to the
      // evidence rather than to a copy of it.
      const one = stalenessOf(
        read.events.slice(0, 1),
        read.events[0]!.position,
        measured.session,
        TOLERANCE,
      )
      const again = stalenessOf(read.events, read.head, measured.session, TOLERANCE)
      expect(again.firing).toBe(one.firing)
      expect(again.staleness).toBe(one.staleness)
      expect(again.current).toBe(one.current)

      console.log(
        `PRESENCE MEASUREMENT: duplicate absorption compared digests ${measured.leftDigest} and` +
          ` ${measured.rightDigest} over ${measured.left.byteLength} canonical bytes;` +
          ` the racing twin landed at position ${measured.second.position} beside` +
          ` ${measured.first.position} and was absorbed; a second holder's landing took position` +
          ` ${measured.other.position}; ${read.events.length} messages stored carrying` +
          ` ${bodies.size} distinct body digest; staleness unchanged at ${String(again.staleness)}.`,
      )
    },
    240_000,
  )

  test(
    "the recorded history replays from a recorded anchor to the same positions and the same fold value",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url
      const directory = harness.directory

      await startHolder(url, directory, "presence-replay-one")
      await startHolder(url, directory, "presence-replay-two")
      await Bun.sleep(SCHEDULE.period * 6)

      const sessions = await Effect.runPromise(sessionLane().pipe(Effect.orDie))
      const heartbeats = await Effect.runPromise(heartbeatLane().pipe(Effect.orDie))
      const recorded = await readSessionFacts(url, sessions)
      const ticks = await readLane(url, heartbeats, 0)

      const first = await Effect.runPromise(foldPresence(recorded.events))
      // Replayed from the SAME recorded history a second time, after time has
      // passed: the same positions, the same anchor, the same fold value. No
      // clock is consulted on either run, so elapsed time moves nothing.
      await Bun.sleep(SCHEDULE.period * 4)
      const second = await Effect.runPromise(foldPresence(recorded.events))
      expect(second.anchor).toEqual(first.anchor)
      expect(second.state).toEqual(first.state)

      // Resumed from a recorded anchor part-way through, the tail lands at the
      // same positions and reaches the same state.
      const algebra = await Effect.runPromise(presenceAlgebra.pipe(Effect.orDie))
      const cut = Math.max(1, Math.floor(recorded.events.length / 2))
      const head = await Effect.runPromise(foldPresence(recorded.events.slice(0, cut)))
      const resumed = await Effect.runPromise(
        replaySuccessors<SessionFact, PresenceState>({
          anchor: head.anchor,
          state: head.state,
          deliveries: recorded.events.slice(cut),
          step: (state, fact) => algebra.reducer.combine(state, presenceContribution.apply(fact)),
        }).pipe(Effect.orDie),
      )
      expect(resumed.anchor).toEqual(first.anchor)
      expect(resumed.state).toEqual(first.state)

      // The heartbeat lane replays the same ticks at the same positions, and the
      // staleness read over them is the same arithmetic twice.
      const replayedTicks = await readLane(url, heartbeats, 0)
      const shared = replayedTicks.events.slice(0, ticks.events.length)
      expect(shared.map((tick) => tick.position)).toEqual(ticks.events.map((tick) => tick.position))
      expect(shared.map((tick) => tick.digest)).toEqual(ticks.events.map((tick) => tick.digest))
      for (const session of membersOf(first.state)) {
        expect(stalenessOf(shared, ticks.head, session, TOLERANCE))
          .toEqual(stalenessOf(ticks.events, ticks.head, session, TOLERANCE))
      }

      // The bytes that replayed are bytes the lane's own event schema admits
      // again, so the replay is over the same vocabulary the emit went through.
      for (const tick of replayedTicks.events) {
        expect(Schema.is(HeartbeatFact)(tick.event)).toBe(true)
      }

      console.log(
        `PRESENCE MEASUREMENT: replayed ${recorded.events.length} session facts and` +
          ` ${ticks.events.length} ticks from a recorded anchor; ${membersOf(first.state).length} members;` +
          ` anchor floor ${first.anchor.floor}, state digest ${first.anchor.stateDigest}.`,
      )
    },
    240_000,
  )
})
