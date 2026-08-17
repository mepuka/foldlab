import { afterEach, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { Schema } from "effect"

import { Digest } from "../src/Digest.js"
import { startNatsHarness, type NatsHarness, waitForFile } from "./NatsHarness.js"

const ResultFile = Schema.Struct({ digests: Schema.Array(Digest) })
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
    const ready = join(harness.directory, "consumer.ready")
    const consumedPath = join(harness.directory, "consumed.json")
    const publishedPath = join(harness.directory, "published.json")

    const consumer = Bun.spawn({
      cmd: ["bun", "run", "./test/process/consumer.ts", harness.url, ready, consumedPath, "4"],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })
    processes.add(consumer)
    await waitForFile(ready)

    const publisher = Bun.spawn({
      cmd: ["bun", "run", "./test/process/publisher.ts", harness.url, corpus, publishedPath],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })
    processes.add(publisher)

    const publisherExit = await publisher.exited
    expect(publisherExit, await stderr(publisher)).toBe(0)
    await waitForFile(consumedPath)
    const consumerExit = await consumer.exited
    expect(consumerExit, await stderr(consumer)).toBe(0)

    const published = Schema.decodeUnknownSync(ResultFile)(
      JSON.parse(await Bun.file(publishedPath).text()),
      { onExcessProperty: "error" },
    )
    const consumed = Schema.decodeUnknownSync(ResultFile)(
      JSON.parse(await Bun.file(consumedPath).text()),
      { onExcessProperty: "error" },
    )
    expect(consumed.digests).toEqual(published.digests)
    expect(consumed.digests).toHaveLength(4)
  }, 120_000)
})
