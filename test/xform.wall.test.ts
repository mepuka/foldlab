/**
 * The transform wall: a TS Xform pipeline must take the same input stream to
 * the same-head output stream as the Go pipeline that pinned the fixture
 * (XL-wall), and the algebra laws (fusion, associativity, identity, purity)
 * must hold on this side too. Transform equivalence across languages is by
 * DIGEST, never by trusting a port.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect } from "effect"
import {
  applyMerge,
  event,
  headFrom,
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

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../fixtures/stream-wall.json"), "utf8"),
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

// NOTE: the Go fixture applies the pipeline to the MERGED corpus, but the
// merge fact in streamfix picks alpha@2 = "b=2" — only "a"-prefixed
// payloads survive the filter.
const pipeline = compose(renameStream("z"), filterKeyPrefix("a"), mapValueUpper())

describe("the transform wall", () => {
  test("TS pipeline output head equals the frozen Go pin", () => {
    const merged = Effect.runSync(applyMerge(fact, sources))
    const out = apply(pipeline, merged)
    expect(out.length).toBe(fixture["xformPipelineKept"] as number)
    expect(headFrom(streamSeed("t"), out)).toBe(fixture["xformPipelineHead"] as string)
  })

  test("fusion and associativity hold in TS, witnessed by heads", () => {
    const merged = Effect.runSync(applyMerge(fact, sources))
    const [f, g, h] = [renameStream("z"), filterKeyPrefix("a"), mapValueUpper()]
    const fused = apply(compose(f, g, h), merged)
    const sequential = apply(h, apply(g, apply(f, merged)))
    expect(headFrom(streamSeed("t"), fused)).toBe(headFrom(streamSeed("t"), sequential))
    const left = apply(compose(compose(f, g), h), merged)
    const right = apply(compose(f, compose(g, h)), merged)
    expect(headFrom(streamSeed("t"), left)).toBe(headFrom(streamSeed("t"), right))
    expect(headFrom(streamSeed("t"), apply(compose(), merged))).toBe(
      headFrom(streamSeed("t"), merged),
    )
  })
})
