/**
 * The Schema boundary proof: the compressed stream as a type, folded over.
 *
 * The frame under test is the FROZEN Go fixture (go stdlib gzip over the
 * canonical event encoding, generated once by go/cmd/streamfix). Decoding it
 * through GzipEventFrame is Go->TS ingestion typed by a schema; recomputing
 * the chain head over the decoded values must reproduce the frozen Go
 * digest — the binding point verified by the identity fold. The round trip
 * is judged by decoded VALUES and heads, never compressed bytes:
 * compression is transport, identity is of canonical bytes.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Exit } from "effect"
import { decodeFrame, encodeFrame, toStreamEvents } from "../src/schema.ts"
import { headFrom, streamSeed } from "../src/stream.ts"

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/stream-wall.json"), "utf8"),
) as Record<string, string>

describe("schema as the Go boundary", () => {
  test("decoding the Go frame yields typed events whose chain head is the frozen Go digest", () => {
    const events = Effect.runSync(decodeFrame(fixture["gzipAlphaBase64"]!))
    expect(events.length).toBe(3)
    expect(events[0]).toEqual({ stream: "alpha", seq: 1, payload: "a=1" })
    expect(headFrom(streamSeed("alpha"), toStreamEvents(events))).toBe(
      fixture["alphaHead"]!,
    )
  })

  test("encode then decode round-trips values and head (bytes are transport)", () => {
    const events = Effect.runSync(decodeFrame(fixture["gzipAlphaBase64"]!))
    const reFramed = Effect.runSync(encodeFrame(events))
    const back = Effect.runSync(decodeFrame(reFramed))
    expect(back).toEqual(events)
    expect(headFrom(streamSeed("alpha"), toStreamEvents(back))).toBe(
      fixture["alphaHead"]!,
    )
  })

  test("a corrupt frame fails with a typed schema issue, not a crash", () => {
    const exit = Effect.runSyncExit(decodeFrame("bm90IGd6aXA="))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
