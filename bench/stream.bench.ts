/**
 * TS-side benchmarks (mitata): the same corpus discipline as
 * go/stream/bench_test.go, plus the one measurement only this side can
 * make — the wasm boundary crossing cost, TS pipeline vs the identical Go
 * pipeline behind the data boundary.
 *
 *   bun run bench          # wasm benches auto-skip until `bun run build:wasm`
 *
 * Numbers are machine-specific: compare runs on one machine, never across.
 */

import { bench, group, run } from "mitata"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { encodeEvent, event, headFrom, streamSeed, type StreamEvent } from "@foldlab/core/stream"
import { apply, compose, filterKeyPrefix, mapValueUpper, renameStream } from "@foldlab/core/xform"

// The deterministic corpus: same discipline as go/stream/bench_test.go —
// no randomness; a benchmark corpus is a fixture like any other.
const benchEvents = (n: number, k: number): Array<StreamEvent> =>
  Array.from({ length: n }, (_, i) =>
    event("bench", i + 1, `${i % 3 === 0 ? "a" : "k"}${i % k}=v${i}`))

const corpus = benchEvents(10_000, 100)
const one = benchEvents(1, 1)
const pipeline = compose(renameStream("z"), filterKeyPrefix("a"), mapValueUpper())

const gzipBase64 = (events: ReadonlyArray<StreamEvent>): string => {
  const frames = events.map(encodeEvent)
  const raw = new Uint8Array(frames.reduce((s, f) => s + f.length, 0))
  let off = 0
  for (const f of frames) {
    raw.set(f, off)
    off += f.length
  }
  return Buffer.from(Bun.gzipSync(new Uint8Array(raw))).toString("base64")
}

group("encode + identity fold", () => {
  const e = event("bench", 1, "a1=v1")
  bench("encodeEvent (small)", () => encodeEvent(e))
  bench("headFrom n=10k", () => headFrom(streamSeed("bench"), corpus))
})

group("transform pipeline (TS, fused)", () => {
  bench("apply n=10k", () => apply(pipeline, corpus))
})

// The wasm boundary: same pipeline, same corpus, through the data boundary
// (gzip+base64 in, JSON out). "batch n=10k" is throughput including
// transport; "crossing n=1" is the fixed per-call boundary cost.
const wasmPath = join(import.meta.dir, "../dist/stream.wasm")
const loaderPath = join(import.meta.dir, "../dist/wasm_exec.js")
if (existsSync(wasmPath) && existsSync(loaderPath)) {
  await import(pathToFileURL(loaderPath).href)
  const go = new (globalThis as Record<string, any>)["Go"]()
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), go.importObject)
  void go.run(instance)
  while (!(globalThis as Record<string, any>)["foldlabWasmWall"]) {
    await new Promise((r) => setTimeout(r, 10))
  }
  const wall = (globalThis as Record<string, any>)["foldlabWasmWall"] as (s: string) => string

  const batchFrame = gzipBase64(corpus)
  const oneFrame = gzipBase64(one)
  group("transform pipeline (Go-in-wasm, data boundary)", () => {
    bench("batch n=10k (incl. gzip+base64 transport)", () => {
      wall(batchFrame)
    })
    bench("crossing n=1 (fixed boundary cost)", () => {
      wall(oneFrame)
    })
    bench("transport only: gzip+base64 n=10k (TS side)", () => gzipBase64(corpus))
  })
} else {
  console.log("wasm benches skipped — run `bun run build:wasm` first")
}

await run()
