import { afterEach, describe, expect, test } from "bun:test"

import { jetstream, jetstreamManager } from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect } from "effect"

import { ANCHOR_BUCKET, type Anchor } from "../src/planes/Anchor.js"
import { evidenceSubject } from "../src/kernel/Subjects.js"
import { laneStreamName } from "../src/internal/lanes.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import { Holder } from "../src/kernel/Wire.js"
import { LaneHandle } from "../src/planes/Lane.js"
import { digestOf } from "../src/truth/Digest.js"
import { declareChaosCounter, type ChaosEvent } from "./ChaosFixture.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The shutdown posture, measured at the seam that performs it.
 *
 * Every scope-owned connection in this package is released by a CLOSE and never
 * by a drain, and that is a ruling rather than an accident. A drain unsubscribes,
 * waits for in-flight work, flushes, and only then closes; a close tears the
 * connection down at once. The ruling keeps the close, and it rests on two
 * premises that this file executes rather than asserts:
 *
 *   the awaited-request premise — every publish and every key-value write on
 *   these paths is a request whose acknowledgement the write's own Effect
 *   yields, so at the instant a scope closes there is no write in flight whose
 *   outcome a caller has been told;
 *
 *   the anchor-before-ack premise — an acknowledgement follows the covering
 *   anchor CAS, so an acknowledgement lost in an undrained close costs a
 *   redelivery the pump absorbs as stale, and no position is ever acknowledged
 *   that was not first anchored.
 *
 * Both arms below take the shutdown at the SCOPE, not at the process: the
 * program returns, the scope's finalizers run, and the connection is closed
 * undrained. That is deliberately weaker than the chaos suite's signal 9 — a
 * hard kill is an undrained close plus everything else the process was holding —
 * so a posture that survives the kill and not the close would be a contradiction,
 * and these arms measure the close on its own terms.
 *
 * What the second arm's second pin measures is exactly the invariant the
 * committed ack-before-anchor mutant violates: that mutant acknowledges a
 * position it never anchored and loses it, and it is executed in the chaos
 * suite against its own committed trace.
 */

const holder = Holder.make("shutdown-posture")

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

/** One tenant per partition, discovered through the lane's own routing. */
const tenantsByPartition = async (
  lane: Lane.DeclaredLane<ChaosEvent, 2>,
): Promise<readonly [string, string]> => {
  const tenants: Array<string | undefined> = [undefined, undefined]
  for (let index = 0; tenants.some((tenant) => tenant === undefined); index++) {
    const tenant = `tenant-${index}`
    const coordinate = await Effect.runPromise(
      Lane.partition(lane, { tenant, ordinal: index, delta: 1 }),
    )
    tenants[coordinate.partition] ??= tenant
  }
  return tenants as unknown as readonly [string, string]
}

describe("the shutdown posture: an undrained close at the scope seam", () => {
  test("every emission an awaited write returned survives the close that follows it", async () => {
    harness = await startNatsHarness()
    const url = harness.url
    const declaration = await Effect.runPromise(
      declareChaosCounter(LaneHandle.make("shutdown-awaited")),
    )
    const tenants = await tenantsByPartition(declaration.lane)
    const events: Array<ChaosEvent> = []
    for (let index = 0; index < 12; index++) {
      events.push({ tenant: tenants[index % 2]!, ordinal: index, delta: 1 })
    }

    // One scope. The last emit's Effect returns, the program returns, and the
    // scope's finalizer closes the connection with no drain — which is the
    // exact instant the ruling is about.
    const emitted = await Effect.runPromise(
      Effect.gen(function* () {
        const acknowledged: Array<Lane.EmittedEvent> = []
        for (const event of events) {
          acknowledged.push(yield* Lane.emit(declaration.lane, event, { holder }))
        }
        return acknowledged
      }).pipe(
        Effect.provide(Lane.Lanes.layer({ servers: url })),
        Effect.scoped,
      ),
    )
    expect(emitted).toHaveLength(events.length)

    // A second party, on a connection the closed one knows nothing about, finds
    // every position an emit returned carrying the bytes that emit named — and
    // finds nothing beyond the last one, because nothing was in flight to be
    // lost or to arrive late.
    const reader = await connect({ servers: url, name: "shutdown-posture-reader" })
    try {
      const manager = await jetstreamManager(reader)
      const streams = jetstream(reader).streams
      for (let partition = 0; partition < 2; partition++) {
        const stream = laneStreamName(declaration.lane, partition)
        const positions = emitted
          .filter((event) => event.partition === partition)
          .map((event) => event.position)
        const info = await manager.streams.info(stream)
        expect(info.state.messages).toBe(positions.length)
        expect(info.state.last_seq).toBe(Math.max(...positions))
        for (const event of emitted.filter((one) => one.partition === partition)) {
          const stored = await (await streams.get(stream)).getMessage({ seq: event.position })
          if (stored === null) throw new Error(`position ${event.position} is not there`)
          const envelope = JSON.parse(new TextDecoder().decode(stored.data)) as unknown
          expect(await Effect.runPromise(digestOf(envelope as never))).toBe(event.digest)
        }
      }
    } finally {
      await reader.close()
    }

    // The refutation, executed on the same seam: one write that is NOT awaited,
    // and the same undrained close. What the premise buys is an
    // acknowledgement a caller may act on, and this is what its absence looks
    // like — the caller is told nothing at all, whatever the substrate did with
    // the bytes.
    const dropping = await connect({ servers: url, name: "shutdown-posture-unawaited" })
    const subject = await Effect.runPromise(evidenceSubject(declaration.lane.handle, 0))
    const dropped = jetstream(dropping).publish(
      subject,
      new TextEncoder().encode("{}"),
    )
    const settled = dropped.then(() => "acknowledged" as const).catch(() => "refused" as const)
    await dropping.close()
    const outcome = await Promise.race([
      settled,
      Bun.sleep(2_000).then(() => "unanswered" as const),
    ])
    expect(outcome).not.toBe("acknowledged")
    console.info(
      `SHUTDOWN POSTURE: PASS seam=scope-close drain=none awaited-emissions=${emitted.length} all-present=true unawaited-write=${outcome}`,
    )
  }, 120_000)

  test("a pump its own scope closed mid-tranche loses no anchored position and acknowledged none unanchored", async () => {
    harness = await startNatsHarness()
    const url = harness.url
    const interrupted = await Effect.runPromise(
      declareChaosCounter(LaneHandle.make("shutdown-interrupted")),
    )
    const reference = await Effect.runPromise(
      declareChaosCounter(LaneHandle.make("shutdown-reference")),
    )
    const interruptedTenants = await tenantsByPartition(interrupted.lane)
    const referenceTenants = await tenantsByPartition(reference.lane)
    const perPartition = 40
    const emit = async (
      declaration: typeof interrupted,
      tenants: readonly [string, string],
    ): Promise<ReadonlyArray<number>> =>
      Effect.runPromise(
        Effect.gen(function* () {
          const targets = [0, 0]
          for (let index = 0; index < perPartition; index++) {
            for (let partition = 0; partition < 2; partition++) {
              const acknowledged = yield* Lane.emit(
                declaration.lane,
                { tenant: tenants[partition]!, ordinal: index * 2 + partition, delta: 1 },
                { holder },
              )
              targets[acknowledged.partition] = acknowledged.position
            }
          }
          return targets as ReadonlyArray<number>
        }).pipe(
          Effect.provide(Lane.Lanes.layer({ servers: url })),
          Effect.scoped,
        ),
      )
    const interruptedTargets = await emit(interrupted, interruptedTenants)
    const referenceTargets = await emit(reference, referenceTenants)
    expect(interruptedTargets).toEqual([perPartition, perPartition])

    // The pump runs inside one scope and the scope closes MID-TRANCHE: the
    // program returns as soon as it has applied a few positions, which runs the
    // finalizers and closes the connection with no drain, with the consumer
    // still holding delivered messages.
    const applyFloor = 8
    const atInterruption = await Effect.runPromise(
      Effect.gen(function* () {
        const deployed = yield* Fold.deploy(interrupted.fold, { checkpointEvery: 4 })
        while (true) {
          const anchors = yield* Effect.forEach(
            [0, 1],
            (partition) => deployed.anchor(partition),
            { concurrency: "unbounded" },
          )
          const applied = anchors.reduce((sum, anchor) => sum + anchor.floor, 0)
          if (applied >= applyFloor) return anchors
          yield* Effect.sleep("5 millis")
        }
      }).pipe(
        Effect.provide(Fold.Folds.layer({ servers: url })),
        Effect.scoped,
      ),
    )
    expect(atInterruption.some((anchor, partition) => anchor.floor < interruptedTargets[partition]!))
      .toBe(true)

    // The two pins, read from a connection the closed scope never had.
    const inspection = await connect({ servers: url, name: "shutdown-posture-inspection" })
    let acknowledged: ReadonlyArray<number> = []
    let anchored: ReadonlyArray<number> = []
    try {
      const bucket = await new Kvm(inspection).open(ANCHOR_BUCKET)
      const manager = await jetstreamManager(inspection)
      const floors: Array<number> = []
      const acks: Array<number> = []
      for (let partition = 0; partition < 2; partition++) {
        const key =
          `anchor.${interrupted.fold.digest}.${interrupted.lane.digest}.${partition}`
        const entry = await bucket.get(key)
        if (entry === null) throw new Error(`the interrupted pump left no anchor at ${partition}`)
        floors.push((JSON.parse(entry.string()) as Anchor).floor)
        const info = await manager.consumers.info(
          laneStreamName(interrupted.lane, partition),
          `FLB_FOLD_${interrupted.fold.digest}`,
        )
        acks.push(info.ack_floor.stream_seq)
      }
      anchored = floors
      acknowledged = acks
    } finally {
      await inspection.close()
    }
    // No unanchored position is acknowledged. The pump acks behind the covering
    // anchor CAS, so an acknowledgement the close threw away costs a
    // redelivery and never a position.
    for (let partition = 0; partition < 2; partition++) {
      expect(acknowledged[partition]!).toBeLessThanOrEqual(anchored[partition]!)
    }

    // No anchored position is lost: a fresh scope resumes the same fold and
    // reaches the digests an uninterrupted run reaches.
    const drain = async (declaration: typeof interrupted, targets: ReadonlyArray<number>) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const deployed = yield* Fold.deploy(declaration.fold, { checkpointEvery: 4 })
          while (true) {
            const anchors = yield* Effect.forEach(
              [0, 1],
              (partition) => deployed.anchor(partition),
              { concurrency: "unbounded" },
            )
            if (anchors.every((anchor, partition) => anchor.floor >= targets[partition]!)) {
              return anchors
            }
            yield* Effect.sleep("5 millis")
          }
        }).pipe(
          Effect.provide(Fold.Folds.layer({ servers: url })),
          Effect.scoped,
        ),
      )
    const resumed = await drain(interrupted, interruptedTargets)
    const uninterrupted = await drain(reference, referenceTargets)
    const expected = await Effect.runPromise(digestOf(perPartition))
    expect(resumed.map((anchor) => anchor.stateDigest)).toEqual(
      uninterrupted.map((anchor) => anchor.stateDigest),
    )
    expect(resumed.every((anchor) => anchor.stateDigest === expected)).toBe(true)
    console.info(
      `SHUTDOWN POSTURE: PASS seam=scope-close drain=none interrupted-anchors=${anchored.join(",")} ack-floors=${acknowledged.join(",")} resumed-state-digest-equality=true`,
    )
  }, 180_000)
})
