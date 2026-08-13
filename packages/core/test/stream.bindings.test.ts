/**
 * Stream-binding laws — the wall reaches through Effect Stream:
 *
 *   SB1 the Stream pipeline's output head equals the frozen GO pin
 *       (fixtures/stream-wall.json xformPipelineHead): batch algebra,
 *       stream algebra, and the Go implementation are one transform
 *   SB2 chunking is transport: rechunking at any size never moves a head
 *   SB3 collector ingestion via Stream equals batch ingestion, anchors and
 *       entity views alike
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Stream } from "effect"
import { makeCollector, memoryBacking } from "../src/entity.ts"
import {
  applyMerge,
  event,
  streamSeed,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"
import { runCollect, runHead, throughXform } from "../src/streamBindings.ts"
import { compose, filterKeyPrefix, mapValueUpper, renameStream } from "../src/xform.ts"

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/stream-wall.json"), "utf8"),
) as Record<string, string | number>

const alpha = [event("alpha", 1, "a=1"), event("alpha", 2, "b=2"), event("alpha", 3, "a=3")]
const beta = [event("beta", 1, "c=4"), event("beta", 2, "a=5")]
const sources = new Map<string, ReadonlyArray<StreamEvent>>([
  ["alpha", alpha],
  ["beta", beta],
])
const fact: MergeFact = {
  picks: [
    { stream: "alpha", seq: 1 },
    { stream: "beta", seq: 1 },
    { stream: "alpha", seq: 2 },
    { stream: "beta", seq: 2 },
    { stream: "alpha", seq: 3 },
  ],
}
const merged = () => Effect.runSync(applyMerge(fact, sources))
const pipeline = compose(renameStream("z"), filterKeyPrefix("a"), mapValueUpper())

describe("stream bindings", () => {
  test("SB1: Stream pipeline head equals the frozen Go pin", () => {
    const head = Effect.runSync(
      Stream.fromIterable(merged()).pipe(
        throughXform(pipeline),
        runHead(streamSeed("t")),
      ),
    )
    expect(head).toBe(fixture["xformPipelineHead"] as string)
  })

  test("SB2: rechunking at any size never moves the head", () => {
    const heads = [1, 2, 3, 5].map((size) =>
      Effect.runSync(
        Stream.fromIterable(merged()).pipe(
          Stream.rechunk(size),
          throughXform(pipeline),
          runHead(streamSeed("t")),
        ),
      ),
    )
    for (const h of heads) expect(h).toBe(fixture["xformPipelineHead"] as string)
  })

  test("SB3: collector via Stream equals batch ingestion", () => {
    const viaStream = makeCollector(memoryBacking(), (e) => e.stream)
    const views = Effect.runSync(
      Stream.fromIterable(merged()).pipe(runCollect(viaStream)),
    )
    const batch = makeCollector(memoryBacking(), (e) => e.stream)
    for (const e of merged()) Effect.runSync(batch.ingest(e))
    expect(viaStream.anchors()).toEqual(batch.anchors())
    expect(views.length).toBe(2)
  })
})
