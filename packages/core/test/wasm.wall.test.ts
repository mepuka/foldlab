/**
 * The wasm wall: the SAME Go source as go/stream, compiled to
 * GOOS=js GOARCH=wasm and loaded into Bun, must reproduce the frozen
 * transform-wall digest (xformPipelineHead). Same Go source, three runtimes
 * (native Go, TS, wasm-in-Bun), one digest.
 *
 * The boundary is data, not FFI: one entry point, base64 gzip frames in,
 * JSON {head, kept, gzipBase64} out. Identity is judged on decoded values
 * and heads, never compressed bytes — Bun gzips the input, Go gunzips it,
 * and the head TS recomputes from the RETURNED frames must equal the head
 * Go computed inside the module, so the law survives both crossings.
 *
 * Local source-only runs skip until `bun run build:wasm` has produced dist/.
 * CI must build the artifact first and fails loudly if it is absent.
 */

import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { Effect } from "effect"
import {
  applyMerge,
  encodeEvent,
  event,
  headFrom,
  parseFrames,
  streamSeed,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"

import {
  apply,
  compose,
  filterKeyPrefix,
  mapValueUpper,
  renameStream,
} from "../src/xform.ts"

const wasmPath = join(import.meta.dir, "../../../dist/stream.wasm")
const loaderPath = join(import.meta.dir, "../../../dist/wasm_exec.js")
const built = existsSync(wasmPath) && existsSync(loaderPath)
const inCI = process.env["CI"] !== undefined

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/stream-wall.json"), "utf8"),
) as Record<string, string | number>

// The same corpus the fixture pinned: the merged log from stream-wall.
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

const gzipEvents = (events: ReadonlyArray<StreamEvent>): string => {
  const frames = events.map(encodeEvent)
  const raw = new Uint8Array(frames.reduce((n, f) => n + f.length, 0))
  let off = 0
  for (const f of frames) {
    raw.set(f, off)
    off += f.length
  }
  return Buffer.from(Bun.gzipSync(new Uint8Array(raw))).toString("base64")
}

type WallResult = { head: string; kept: number; gzipBase64: string; error?: string }

const loadWall = async (): Promise<(frameBase64: string) => WallResult> => {
  await import(pathToFileURL(loaderPath).href)
  const Go = (globalThis as Record<string, any>)["Go"]
  const go = new Go()
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), go.importObject)
  void go.run(instance) // main registers the entry point, then stays resident
  for (let i = 0; i < 100 && !(globalThis as Record<string, any>)["foldlabWasmWall"]; i++) {
    await new Promise((r) => setTimeout(r, 10))
  }
  const entry = (globalThis as Record<string, any>)["foldlabWasmWall"] as (s: string) => string
  if (typeof entry !== "function") throw new Error("wasmwall entry point never registered")
  return (frameBase64) => JSON.parse(entry(frameBase64)) as WallResult
}

if (built) {
  describe("the wasm wall", () => {
    test("Go-in-wasm reproduces the frozen pin, and the head survives both crossings", async () => {
      const run = await loadWall()
      const merged = Effect.runSync(applyMerge(fact, sources))
      const res = run(gzipEvents(merged))

      expect(res.error).toBeUndefined()
      expect(res.kept).toBe(fixture["xformPipelineKept"] as number)
      expect(res.head).toBe(fixture["xformPipelineHead"] as string)

      // Round trip: gunzip the RETURNED frames and recompute the head in TS.
      const returned = parseFrames(new Uint8Array(Bun.gunzipSync(Buffer.from(res.gzipBase64, "base64"))))
      expect(headFrom(streamSeed("t"), returned)).toBe(fixture["xformPipelineHead"] as string)
    })

    test("the 27 reported Unicode drifts and malformed UTF-8 agree byte-for-byte", async () => {
      const run = await loadWall()
      const encoder = new TextEncoder()
      const corpus: Array<StreamEvent> = []
      let seq = 1
      const unicode16Drifts = [
        0x019b,
        0x0264,
        0x1c8a,
        0xa7cd,
        0xa7db,
        ...Array.from({ length: 0x10d85 - 0x10d70 + 1 }, (_, i) => 0x10d70 + i),
      ]
      expect(unicode16Drifts).toHaveLength(27)
      for (const rune of [0x00b5, 0x00e9, 0x0250, 0x1f80, ...unicode16Drifts]) {
        corpus.push({
          stream: "source",
          seq: seq++,
          payload: encoder.encode(`a=${String.fromCodePoint(rune)}az`),
        })
      }
      for (const value of [
        [0xff],
        [0xc0, 0xaf],
        [0xe2, 0x82],
        [0xed, 0xa0, 0x80],
        [0xf4, 0x90, 0x80, 0x80],
      ]) {
        corpus.push({
          stream: "source",
          seq: seq++,
          payload: Uint8Array.from([0x61, 0x3d, ...value]),
        })
      }
      corpus.push({ stream: "source", seq: seq++, payload: encoder.encode("not-key-value") })
      corpus.push({ stream: "source", seq: seq++, payload: encoder.encode("=empty-key") })

      const pipeline = compose(
        renameStream("z"),
        filterKeyPrefix("a"),
        mapValueUpper(),
      )
      const expected = apply(pipeline, corpus)
      const res = run(gzipEvents(corpus))
      expect(res.error).toBeUndefined()
      expect(res.kept).toBe(expected.length)
      expect(res.head).toBe(headFrom(streamSeed("t"), expected))

      const returned = parseFrames(new Uint8Array(Bun.gunzipSync(Buffer.from(res.gzipBase64, "base64"))))
      expect(returned.map((e) => Buffer.from(encodeEvent(e)).toString("hex"))).toEqual(
        expected.map((e) => Buffer.from(encodeEvent(e)).toString("hex")),
      )
    })

    test("garbage refuses as data — no exception crosses the boundary", async () => {
      const run = await loadWall()
      expect(run("not base64!!").error).toBeDefined()
      expect(run(Buffer.from("not a gzip frame").toString("base64")).error).toBeDefined()
    })
  })
} else if (inCI) {
  test("CI cannot skip the wasm wall when its artifact is absent", () => {
    throw new Error("dist/stream.wasm and dist/wasm_exec.js must exist in CI")
  })
} else {
  describe("the wasm wall (skipped locally)", () => {
    test.skip("dist/ missing — run `bun run build:wasm` first", () => {})
  })
}
