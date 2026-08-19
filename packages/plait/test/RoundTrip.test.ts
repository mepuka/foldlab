import { afterEach, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { jetstreamManager } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Option, Schema, Stream } from "effect"

import { Digest } from "../src/truth/Digest.js"
import { FabricClient } from "../src/carriage/FabricClient.js"
import { evidenceSubject, nodeSubject } from "../src/kernel/Subjects.js"
import { startNatsHarness, type NatsHarness, waitForFile } from "./NatsHarness.js"

const ResultFile = Schema.Struct({ digests: Schema.Array(Digest) })
const PublisherResultFile = Schema.Struct({
  digests: Schema.Array(Digest),
  duplicate: Schema.Struct({
    digest: Digest,
    sequence: Schema.Finite,
    duplicate: Schema.Boolean,
  }),
})
const corpus = resolve(import.meta.dir, "../fixtures/envelopes.ndjson")
const processes = new Set<ReturnType<typeof Bun.spawn>>()
let harness: NatsHarness | undefined

afterEach(async () => {
  for (const process of processes) {
    if (process.exitCode === null) process.kill()
    await process.exited
  }
  processes.clear()
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const stderr = async (process: ReturnType<typeof Bun.spawn>): Promise<string> =>
  process.stderr instanceof ReadableStream
    ? await new Response(process.stderr).text()
    : ""

describe("local NATS envelope round trip", () => {
  test("two processes agree on every publisher header and consumer digest", async () => {
    harness = await startNatsHarness()
    const consumedPath = join(harness.directory, "consumed.json")
    const publishedPath = join(harness.directory, "published.json")

    const publisher = Bun.spawn({
      cmd: ["bun", "run", "./test/process/publisher.ts", harness.url, corpus, publishedPath],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })
    processes.add(publisher)

    const publisherExit = await publisher.exited
    expect(publisherExit, await stderr(publisher)).toBe(0)

    const inspectionConnection = await connect({ servers: harness.url })
    try {
      const manager = await jetstreamManager(inspectionConnection)
      const stream = await manager.streams.info("PLAIT_SPINE")
      expect(stream.config.duplicate_window).toBe(120_000_000_000)
    } finally {
      await inspectionConnection.close()
    }

    const consumer = Bun.spawn({
      cmd: ["bun", "run", "./test/process/consumer.ts", harness.url, consumedPath, "4"],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })
    processes.add(consumer)
    await waitForFile(consumedPath)
    const consumerExit = await consumer.exited
    expect(consumerExit, await stderr(consumer)).toBe(0)

    const published = Schema.decodeUnknownSync(PublisherResultFile)(
      JSON.parse(await Bun.file(publishedPath).text()),
      { onExcessProperty: "error" },
    )
    const consumed = Schema.decodeUnknownSync(ResultFile)(
      JSON.parse(await Bun.file(consumedPath).text()),
      { onExcessProperty: "error" },
    )
    expect(consumed.digests).toEqual(published.digests)
    expect(consumed.digests).toHaveLength(4)
    expect(published.duplicate.duplicate).toBe(true)
    expect(published.duplicate.sequence).toBe(1)

    const idleResult = await Promise.race([
      Effect.runPromise(
        Effect.gen(function* () {
          const subject = yield* nodeSubject("idle")
          const client = yield* FabricClient
          const messages = yield* client.subscribe(subject)
          return yield* Stream.runHead(messages).pipe(
            Effect.timeoutOption("250 millis"),
          )
        }).pipe(
          Effect.provide(FabricClient.layer({ servers: harness.url, stream: "PLAIT_SPINE" })),
          Effect.scoped,
        ),
      ),
      Bun.sleep(5_000).then(() => {
        throw new Error("idle subscription did not respond to interruption")
      }),
    ])
    expect(Option.isNone(idleResult)).toBe(true)

    const unowned = await Effect.runPromise(
      Effect.gen(function* () {
        const subject = yield* evidenceSubject("unowned", 0)
        const client = yield* FabricClient
        return yield* Effect.flip(client.subscribe(subject))
      }).pipe(
        Effect.provide(FabricClient.layer({ servers: harness.url, stream: "PLAIT_SPINE" })),
        Effect.scoped,
      ),
    )
    expect(unowned.sort).toBe("absence")
    expect(unowned.path).toEqual(["subscribe.discover-stream"])
  }, 120_000)
})
