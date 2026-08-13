/**
 * The stream lane's cross-language wall: every digest in
 * fixtures/stream-wall.json was generated ONCE by go/cmd/streamfix and
 * frozen. The TS implementation must reproduce each byte-identically — a
 * one-bit divergence in canonical encoding, chain seeding, fold-state
 * canonicalization, or frame layout moves a SHA-256 and fails here. If this
 * test fails, the DEFAULT reading is that one port drifted; which one is a
 * finding, not a constant to update.
 *
 * The gzip entry is the interop reality check: a frame compressed by Go's
 * stdlib is decompressed by Bun, parsed, and must carry the exact canonical
 * bytes — compression is transport, identity survives the round trip across
 * the language boundary.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect } from "effect"
import {
  compact,
  event,
  factDigest,
  foldKV,
  headFrom,
  mergeSeed,
  parseFrames,
  put,
  type Segment,
  applyMerge,
  stateDigest,
  streamSeed,
  type Head,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"

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

describe("the stream wall: TS digests vs frozen Go fixtures", () => {
  test("stream heads", () => {
    expect(headFrom(streamSeed("alpha"), alpha)).toBe(fixture["alphaHead"] as Head)
    expect(headFrom(streamSeed("beta"), beta)).toBe(fixture["betaHead"] as Head)
  })

  test("textual heads admit only the canonical lowercase spelling", () => {
    const head = streamSeed("alpha")
    expect(() => headFrom(head.toUpperCase(), alpha.slice(0, 1)))
      .toThrow("head must be exactly 32 lowercase hexadecimal bytes")
    expect(() => headFrom(head.toUpperCase(), []))
      .toThrow("head must be exactly 32 lowercase hexadecimal bytes")
  })

  test("merge fact digest, merged head, fold state", () => {
    expect(factDigest(fact)).toBe(fixture["mergeFactDigest"] as Head)
    const merged = Effect.runSync(applyMerge(fact, sources))
    expect(headFrom(mergeSeed(), merged)).toBe(fixture["mergedHead"] as Head)
    const state = Effect.runSync(foldKV(merged))
    expect(stateDigest(state)).toBe(fixture["foldStateDigest"] as Head)
  })

  test("compaction boundary state and base head", () => {
    const merged = Effect.runSync(applyMerge(fact, sources))
    const compacted = Effect.runSync(compact(mergeSeed(), merged, 2))
    expect(compacted.base).toBe(fixture["compactionBase"] as Head)
    expect(stateDigest(compacted.state)).toBe(fixture["compactionState"] as Head)
    expect(compacted.tail.length).toBe(fixture["compactionTail"] as number)
  })

  test("fork heads (trunk and both children)", () => {
    const root = streamSeed("session")
    const store = new Map<Head, Segment>()
    const trunk = put(store, {
      parent: root,
      events: [event("session", 1, "a=1"), event("session", 2, "b=2")],
    })
    const childA = put(store, { parent: trunk, events: [event("session", 3, "a=9")] })
    const childB = put(store, { parent: trunk, events: [event("session", 3, "b=7")] })
    expect(trunk).toBe(fixture["forkTrunkHead"] as Head)
    expect(childA).toBe(fixture["forkChildAHead"] as Head)
    expect(childB).toBe(fixture["forkChildBHead"] as Head)
  })

  test("a Go-gzipped frame decompresses in Bun to the exact canonical bytes", () => {
    const frame = Uint8Array.from(
      Buffer.from(fixture["gzipAlphaBase64"] as string, "base64"),
    )
    const events = parseFrames(Bun.gunzipSync(frame))
    expect(events.length).toBe(alpha.length)
    expect(headFrom(streamSeed("alpha"), events)).toBe(fixture["alphaHead"] as Head)
  })
})
