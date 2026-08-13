/**
 * The wasm wall's divergence classifier — the gate that keeps a KNOWN red
 * wall from hiding a NEW one.
 *
 * `packages/core/test/wasm.wall.test.ts` is red today and stays red: issue
 * #27 is a finding, and findings-before-fixes says the red test is the
 * evidence, not the bug. But a permanently red wall is a wall nobody reads,
 * and the divergence it reports is a single digest — one scalar gaining an
 * uppercase mapping on either side moves that digest exactly as loudly as
 * twenty-seven do, which is to say not at all once the eye has learned to
 * skip the line.
 *
 * So this script does what the digest cannot: it attributes the divergence
 * to individual Unicode scalars and compares that SET against a committed
 * allowlist (`fixtures/wasm-wall-known-divergence.json`). The wall's answer
 * is a function of two independently-versioned external case tables (Bun's
 * ICU vs Go's `unicode` package, #27); the allowlist is the frozen record of
 * exactly where they disagreed when the finding was filed. A Go bump, a Bun
 * bump, or a change to `mapValueUpper` on either side moves the set, and the
 * set is what this gate reads.
 *
 * Verdicts:
 *   0  the observed divergence is EXACTLY the allowlist — known issue #27,
 *      still tracked, nothing new.
 *   1  drift. Either a scalar diverged that the allowlist does not carry (a
 *      NEW divergence — the case this gate exists for), or an allowlisted
 *      scalar converged (the allowlist is stale and must be re-frozen under
 *      docs/FREEZING.md). Both directions fail: an allowlist that only ever
 *      grows is a record of nothing.
 *   2  the wall could not run at all — dist/ missing, entry point never
 *      registered. NEVER a skip. The whole defect in #27 is that absence of
 *      the artifact read as absence of a problem.
 *
 * Usage:
 *   bun run scripts/build-wasm.ts && bun scripts/wasm-wall-divergence.ts
 *   bun scripts/wasm-wall-divergence.ts --self-test   # negative controls
 *   bun scripts/wasm-wall-divergence.ts --emit        # print a fresh allowlist
 *
 * The `--self-test` mode is not decoration. A comparison that cannot fail
 * proves nothing (AGENTS.md), and this comparison is the only thing standing
 * between "27 known" and "28, one of them new".
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { encodeEvent, parseFrames, type StreamEvent } from "../packages/core/src/stream.ts"
import {
  apply,
  compose,
  filterKeyPrefix,
  mapValueUpper,
  renameStream,
} from "../packages/core/src/xform.ts"

const root = join(import.meta.dir, "..")
const wasmPath = join(root, "dist/stream.wasm")
const loaderPath = join(root, "dist/wasm_exec.js")
const allowlistPath = join(root, "fixtures/wasm-wall-known-divergence.json")

type Allowlist = {
  readonly _provenance: string
  readonly issue: string
  readonly scalars: ReadonlyArray<string>
}

const fmt = (codepoint: number): string =>
  "U+" + codepoint.toString(16).toUpperCase().padStart(4, "0")

/** The comparison, isolated so --self-test can attack it directly. */
export const classify = (
  observed: ReadonlyArray<string>,
  allowed: ReadonlyArray<string>,
): { readonly novel: ReadonlyArray<string>; readonly converged: ReadonlyArray<string> } => {
  const allowedSet = new Set(allowed)
  const observedSet = new Set(observed)
  return {
    novel: observed.filter((s) => !allowedSet.has(s)),
    converged: allowed.filter((s) => !observedSet.has(s)),
  }
}

const die = (code: number, message: string): never => {
  console.error(message)
  process.exit(code)
}

// ---------------------------------------------------------------- self-test
if (process.argv.includes("--self-test")) {
  const base = ["U+019B", "U+0264", "U+1C8A"]
  let failures = 0
  const control = (name: string, ok: boolean) => {
    console.log(`${ok ? "  refuted as required" : "  CONTROL DID NOT FIRE"} — ${name}`)
    if (!ok) failures++
  }

  control(
    "a NEW divergent scalar must be reported as novel",
    classify([...base, "U+FFFF"], base).novel.length === 1,
  )
  control(
    "an allowlisted scalar that converged must be reported",
    classify(base.slice(1), base).converged.length === 1,
  )
  control(
    "a swapped scalar must be caught in BOTH directions",
    (() => {
      const r = classify([...base.slice(1), "U+ABCD"], base)
      return r.novel.length === 1 && r.converged.length === 1
    })(),
  )
  control(
    "an exact match must NOT be reported (the gate must be able to pass)",
    (() => {
      const r = classify(base, base)
      return r.novel.length === 0 && r.converged.length === 0
    })(),
  )

  if (failures > 0) {
    die(1, `SELF-TEST FAIL: ${failures} control(s) did not fire; this gate cannot fail, so it proves nothing.`)
  }
  console.log("SELF-TEST PASS: 4 controls, each refuted on its own case.")
  process.exit(0)
}

// ------------------------------------------------------------------- the run
if (!existsSync(wasmPath) || !existsSync(loaderPath)) {
  die(
    2,
    "WALL UNBUILT: dist/stream.wasm or dist/wasm_exec.js is missing.\n" +
      "Run `bun run build:wasm` first. This is an ERROR, not a skip — #27 is\n" +
      "exactly the defect of reading a missing artifact as a clean wall.",
  )
}

await import(pathToFileURL(loaderPath).href)
const Go = (globalThis as Record<string, any>)["Go"]
const go = new Go()
const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), go.importObject)
void go.run(instance)
for (let i = 0; i < 200 && !(globalThis as Record<string, any>)["foldlabWasmWall"]; i++) {
  await new Promise((r) => setTimeout(r, 10))
}
const entry = (globalThis as Record<string, any>)["foldlabWasmWall"] as (s: string) => string
if (typeof entry !== "function") die(2, "WALL UNBUILT: the wasmwall entry point never registered.")

// The same cased-scalar corpus the wall test builds, with the codepoint of
// each entry retained so a mismatch can be attributed rather than summed.
const encoder = new TextEncoder()
const corpus: Array<StreamEvent> = []
const codepoints: Array<number> = []
let seq = 1
for (let rune = 0; rune <= 0x10ffff; rune++) {
  if (rune >= 0xd800 && rune <= 0xdfff) continue
  const value = String.fromCodePoint(rune)
  if (value.toUpperCase() === value) continue
  codepoints.push(rune)
  corpus.push({ stream: "source", seq: seq++, payload: encoder.encode("a=" + value) })
}

const gzipEvents = (events: ReadonlyArray<StreamEvent>): string => {
  const frames = events.map(encodeEvent)
  const raw = new Uint8Array(frames.reduce((n, f) => n + f.length, 0))
  let off = 0
  for (const f of frames) {
    raw.set(f, off)
    off += f.length
  }
  return Buffer.from(Bun.gzipSync(raw)).toString("base64")
}

const pipeline = compose(renameStream("z"), filterKeyPrefix("a"), mapValueUpper())
const expected = apply(pipeline, corpus)
const res = JSON.parse(entry(gzipEvents(corpus))) as {
  head: string
  kept: number
  gzipBase64: string
  error?: string
}
if (res.error !== undefined) die(2, `WALL ERROR: the wasm side refused the corpus: ${res.error}`)
if (res.kept !== expected.length) {
  die(
    1,
    `KEPT COUNT DIVERGED: TS kept ${expected.length}, wasm kept ${res.kept}.\n` +
      "That is a filter divergence, not a case-table divergence; the allowlist\n" +
      "does not cover it and this gate will not launder it.",
  )
}

const returned = parseFrames(new Uint8Array(Bun.gunzipSync(Buffer.from(res.gzipBase64, "base64"))))
const hex = (e: StreamEvent) => Buffer.from(encodeEvent(e)).toString("hex")
const observed: Array<string> = []
for (let i = 0; i < expected.length; i++) {
  if (hex(expected[i]!) !== hex(returned[i]!)) observed.push(fmt(codepoints[i]!))
}

console.log(`cased corpus entries: ${corpus.length}`)
console.log(`observed divergent scalars: ${observed.length}`)

if (process.argv.includes("--emit")) {
  console.log(JSON.stringify(observed, null, 2))
  process.exit(0)
}

if (!existsSync(allowlistPath)) {
  die(2, `ALLOWLIST MISSING: ${allowlistPath}. It is a frozen fixture; see docs/FREEZING.md.`)
}
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8")) as Allowlist
const { novel, converged } = classify(observed, allowlist.scalars)

if (novel.length === 0 && converged.length === 0) {
  console.log(
    `WASM WALL DIVERGENCE: KNOWN (${observed.length} scalars, exactly the allowlist).\n` +
      `Tracked as ${allowlist.issue}. The wall test itself stays RED on purpose —\n` +
      "the finding is the evidence; this gate only certifies that nothing NEW joined it.",
  )
  process.exit(0)
}

console.error("WASM WALL DIVERGENCE: DRIFT — the case tables moved.")
if (novel.length > 0) {
  console.error(
    `\n  NEW divergent scalars (${novel.length}) — NOT covered by ${allowlist.issue}:\n    ` +
      novel.join(" "),
  )
  console.error(
    "  A scalar started disagreeing between Bun's case tables and Go's. This is\n" +
      "  a finding: report it with the scalar list, do not widen the allowlist to\n" +
      "  make the gate green.",
  )
}
if (converged.length > 0) {
  console.error(
    `\n  Allowlisted scalars that now AGREE (${converged.length}):\n    ` + converged.join(" "),
  )
  console.error(
    "  Good news that still fails the gate: the allowlist is now a claim about\n" +
      "  the past. Re-freeze it under docs/FREEZING.md with the stated reason.",
  )
}
process.exit(1)
