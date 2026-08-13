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
import { fileURLToPath } from "node:url"
import { Cause, Effect, Exit } from "effect"
import { decodeFrame, encodeFrame, toStreamEvents } from "../src/schema.ts"
import { headFrom, streamSeed } from "../src/stream.ts"

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/stream-wall.json"), "utf8"),
) as Record<string, string>

interface GoFrameRow {
  readonly name: string
  readonly stream: string
  readonly seq: number
  readonly payloadText?: string
  readonly frameBase64: string
  readonly head: string
}

const goRoot = fileURLToPath(new URL("../../../go/", import.meta.url))

const goFrameCorpus = async (): Promise<ReadonlyArray<GoFrameRow>> => {
  const process = Bun.spawn(["go", "run", "./cmd/schemawallprobe"], {
    cwd: goRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  if (exitCode !== 0) throw new Error(`schema wall Go probe exited ${exitCode}: ${stderr.trim()}`)
  return JSON.parse(stdout) as ReadonlyArray<GoFrameRow>
}

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

  test("Go-origin non-ASCII rows preserve heads and malformed UTF-8 rows refuse losslessly", async () => {
    const rows = await goFrameCorpus()
    expect(rows.map((row) => row.name)).toEqual([
      "utf8-snow",
      "utf8-rocket",
      "utf8-bom",
      "utf8-empty",
      "invalid-ff",
      "invalid-fe",
    ])
    const malformedHeads: Array<string> = []
    for (const row of rows.filter((row) => row.name !== "utf8-bom")) {
      const exit = Effect.runSyncExit(decodeFrame(row.frameBase64))
      if (row.payloadText === undefined) {
        malformedHeads.push(row.head)
        expect(Exit.isFailure(exit)).toBe(true)
        if (!Exit.isFailure(exit)) throw new Error(`${row.name} unexpectedly decoded`)
        expect(Cause.pretty(exit.cause)).toContain("canonical event payload is not valid UTF-8 text")
      } else {
        expect(Exit.isSuccess(exit)).toBe(true)
        if (!Exit.isSuccess(exit)) throw new Error(`${row.name} unexpectedly refused`)
        expect(exit.value).toEqual([{ stream: row.stream, seq: row.seq, payload: row.payloadText }])
        expect(headFrom(streamSeed(row.stream), toStreamEvents(exit.value))).toBe(row.head)
      }
    }
    expect(new Set(malformedHeads).size).toBe(2)
  }, 30_000)

  test.skipIf(process.env.FOLDLAB_RUN_SCHEMA_BOM_FINDING !== "1")(
    "FINDING-SCHEMA-BOM-001: UTF-8 BOM payload bytes collapse onto an empty payload",
    async () => {
      const rows = await goFrameCorpus()
      const bom = rows.find((row) => row.name === "utf8-bom")
      const empty = rows.find((row) => row.name === "utf8-empty")
      if (bom === undefined || empty === undefined) throw new Error("Go probe omitted BOM controls")
      expect(bom.head).not.toBe(empty.head)
      const bomExit = Effect.runSyncExit(decodeFrame(bom.frameBase64))
      const emptyExit = Effect.runSyncExit(decodeFrame(empty.frameBase64))
      expect(Exit.isSuccess(bomExit)).toBe(true)
      expect(Exit.isSuccess(emptyExit)).toBe(true)
      if (!Exit.isSuccess(bomExit) || !Exit.isSuccess(emptyExit)) {
        throw new Error("valid UTF-8 BOM control unexpectedly refused")
      }
      expect(bomExit.value).not.toEqual(emptyExit.value)
      expect(bomExit.value[0]?.payload).toBe("\ufeff")
    },
    30_000,
  )

  test("inadmissible WireEvent strings fail inside the Effect, never at construction", () => {
    const cases = [
      { stream: "\ud800", seq: 0, payload: "ok" },
      { stream: "a".repeat(0x1_0000), seq: 0, payload: "ok" },
      { stream: "alpha", seq: 0, payload: "\udfff" },
    ]
    for (const event of cases) {
      const construct = () => encodeFrame([event])
      expect(construct).not.toThrow()
      const exit = Effect.runSyncExit(construct())
      expect(Exit.isFailure(exit)).toBe(true)
    }

    const boundary = [
      { stream: "a".repeat(0xffff), seq: 0, payload: "ok" },
      { stream: "雪".repeat(21_845), seq: 0, payload: "🚀" },
    ]
    for (const event of boundary) {
      expect(Exit.isSuccess(Effect.runSyncExit(encodeFrame([event])))).toBe(true)
    }
  })
})
