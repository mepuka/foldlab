import { afterEach, describe, expect, test } from "bun:test"

import { jetstreamManager, StorageType } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Schema } from "effect"

import { Digest } from "../src/Digest.js"
import { declare, emit, Lanes } from "../src/Lane.js"
import { evidenceSubject } from "../src/Subjects.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const Event = Schema.Struct({ tenant: Schema.String, delta: Schema.Number })
const eventSchema = Digest.make("c".repeat(64))
let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("live evidence lanes", () => {
  test("emit ensures one file-backed stream per declared partition", async () => {
    harness = await startNatsHarness()
    const lane = await Effect.runPromise(declare({
      handle: "live-counter",
      event: Event,
      eventSchema,
      partitions: 2 as const,
      partitionKey: { path: ["tenant"] },
    }))

    const emitted = await Effect.runPromise(
      emit(lane, { tenant: "north", delta: 1 }, { holder: "seat-a" }).pipe(
        Effect.provide(Lanes.layer({ servers: harness.url })),
        Effect.scoped,
      ),
    )

    expect(emitted.position).toBe(1)
    expect(emitted.duplicate).toBe(false)

    const connection = await connect({ servers: harness.url })
    try {
      const manager = await jetstreamManager(connection)
      const streamNames = await manager.streams.names().next()
      expect(streamNames).toHaveLength(2)
      for (let part = 0; part < 2; part++) {
        const subject = await Effect.runPromise(evidenceSubject(lane.handle, part))
        const name = await manager.streams.find(subject)
        const info = await manager.streams.info(name)
        expect(info.config.subjects).toEqual([subject])
        expect(info.config.storage).toBe(StorageType.File)
        expect(info.config.num_replicas).toBe(1)
        expect(info.config.max_msgs).toBe(-1)
        expect(info.config.max_msgs_per_subject).toBe(-1)
        expect(info.config.max_bytes).toBe(-1)
        expect(info.config.max_age).toBe(0)
        expect(info.config.deny_delete).toBe(true)
        expect(info.config.deny_purge).toBe(true)
      }
    } finally {
      await connection.close()
    }
  }, 120_000)
})
