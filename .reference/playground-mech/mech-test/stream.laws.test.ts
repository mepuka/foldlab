/**
 * The stream lane's laws — the engineering concepts of the agent-streaming
 * conversation, each stated as a checked property rather than prose:
 *
 *   SL1  the chain remembers what the fold forgives: swapping adjacent
 *        CROSS-KEY merge picks preserves the fold state digest (meaning)
 *        and changes the merged head (history identity)
 *   SL2  same-key order IS meaning: the swap that crosses a=3 over a=5
 *        changes the fold state — this event class is why merges commit
 *   SL3  compaction preserves BOTH folds at every boundary
 *   SL4  a fork shares its prefix by structure and separates heads
 *   SL5  fork RESOLUTION is fenced commitment: racing the two fork heads
 *        through the proved single-key effector protocol yields at most one
 *        canonical head over EVERY schedule, and the loser adopts, never
 *        overwrites — the stream lane composed with the theorem lane
 *   SL6  replay of a merge fact is deterministic and gaps are typed errors
 */

import { describe, expect, test } from "bun:test"
import { Effect, Exit } from "effect"
import {
  applyMerge,
  compact,
  event,
  foldKV,
  headFrom,
  mergeSeed,
  put,
  replay,
  type Segment,
  stateDigest,
  streamSeed,
  type Head,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"
import {
  type ModelConfig,
  TagDone,
  effectorSystem,
  gateConfig,
} from "../src/effector.ts"
import { enumeratePaths } from "../src/system.ts"

const alpha = [event("alpha", 1, "a=1"), event("alpha", 2, "b=2"), event("alpha", 3, "a=3")]
const beta = [event("beta", 1, "c=4"), event("beta", 2, "a=5")]
const sources = new Map<string, ReadonlyArray<StreamEvent>>([
  ["alpha", alpha],
  ["beta", beta],
])
const merge = (picks: MergeFact["picks"]) =>
  Effect.runSync(applyMerge({ picks }, sources))

describe("stream laws", () => {
  test("SL1: cross-key swap — fold forgives, chain remembers", async () => {
    const base = merge([
      { stream: "alpha", seq: 1 },
      { stream: "beta", seq: 1 },
      { stream: "alpha", seq: 2 },
      { stream: "beta", seq: 2 },
      { stream: "alpha", seq: 3 },
    ])
    const swapped = merge([
      { stream: "alpha", seq: 1 },
      { stream: "alpha", seq: 2 },
      { stream: "beta", seq: 1 },
      { stream: "beta", seq: 2 },
      { stream: "alpha", seq: 3 },
    ])
    const [sBase, sSwapped] = await Promise.all([
      Effect.runPromise(foldKV(base)),
      Effect.runPromise(foldKV(swapped)),
    ])
    expect(stateDigest(sBase)).toBe(stateDigest(sSwapped))
    expect(headFrom(mergeSeed(), base)).not.toBe(headFrom(mergeSeed(), swapped))
  })

  test("SL2: same-key swap changes the fold — this class is why merges commit", () => {
    const last5 = merge([
      { stream: "alpha", seq: 1 },
      { stream: "alpha", seq: 2 },
      { stream: "alpha", seq: 3 },
      { stream: "beta", seq: 2 },
    ])
    const last3 = merge([
      { stream: "alpha", seq: 1 },
      { stream: "alpha", seq: 2 },
      { stream: "beta", seq: 2 },
      { stream: "alpha", seq: 3 },
    ])
    const s5 = Effect.runSync(foldKV(last5))
    const s3 = Effect.runSync(foldKV(last3))
    expect(stateDigest(s5)).not.toBe(stateDigest(s3))
    expect(s5.entries.get("a")).toBe("5")
    expect(s3.entries.get("a")).toBe("3")
  })

  test("SL3: compaction preserves both folds at every boundary", async () => {
    const merged = merge([
      { stream: "alpha", seq: 1 },
      { stream: "beta", seq: 1 },
      { stream: "alpha", seq: 2 },
      { stream: "beta", seq: 2 },
      { stream: "alpha", seq: 3 },
    ])
    const fullHead = headFrom(mergeSeed(), merged)
    const fullState = stateDigest(Effect.runSync(foldKV(merged)))
    for (let k = 0; k <= merged.length; k++) {
      const c = Effect.runSync(compact(mergeSeed(), merged, k))
      expect(headFrom(c.base, c.tail)).toBe(fullHead)
      const resumed = await Effect.runPromise(
        Effect.reduce(c.tail, () => c.state, (s, e) =>
          Effect.map(foldKV([e]), (one) => ({
            entries: new Map([...s.entries, ...one.entries]),
            count: s.count + one.count,
          })),
        ),
      )
      expect(stateDigest(resumed)).toBe(fullState)
    }
  })

  test("SL4: forks share the prefix by structure and separate heads", () => {
    const root = streamSeed("session")
    const store = new Map<Head, Segment>()
    const trunkSegment: Segment = {
      parent: root,
      events: [event("session", 1, "a=1"), event("session", 2, "b=2")],
    }
    const trunk = put(store, trunkSegment)
    const childA = put(store, { parent: trunk, events: [event("session", 3, "a=9")] })
    const childB = put(store, { parent: trunk, events: [event("session", 3, "b=7")] })
    expect(childA).not.toBe(childB)
    // Shared prefix is shared STRUCTURE: both branches resolve through the
    // one trunk segment object; creating the fork copied nothing.
    expect(store.size).toBe(3)
    const ra = Effect.runSync(replay(store, childA, root))
    const rb = Effect.runSync(replay(store, childB, root))
    expect(ra.slice(0, 2)).toEqual(rb.slice(0, 2))
    expect(headFrom(root, ra)).toBe(childA)
    expect(headFrom(root, rb)).toBe(childB)
    // Absence is detectable and NAMED.
    const gone = Effect.runSyncExit(replay(store, "00".repeat(32), root))
    expect(Exit.isFailure(gone)).toBe(true)
  })

  test("SL5: fork resolution is fenced commitment — at most one canonical head over every schedule", () => {
    // Two workers race to commit their fork head for the same digest
    // (d = the fork base). Owner o committing maps to head candidates[o].
    // The proved single-key protocol guarantees at most one Done per
    // history (SPEC 6.2, now an unbounded theorem), so whichever schedule
    // runs, the store ends with ONE canonical head and the loser ADOPTS.
    const root = streamSeed("session")
    const store = new Map<Head, Segment>()
    const trunk = put(store, {
      parent: root,
      events: [event("session", 1, "a=1"), event("session", 2, "b=2")],
    })
    const candidates = [
      put(store, { parent: trunk, events: [event("session", 3, "a=9")] }),
      put(store, { parent: trunk, events: [event("session", 3, "b=7")] }),
    ]
    const config: ModelConfig = {
      ...gateConfig("single-key"),
      owners: 2,
      allowCrash: false,
      adversarialSteal: false,
      maxFence: 0,
    }
    const sys = effectorSystem(config, 6)
    const paths = enumeratePaths(sys, 6, 0, null)
    expect(paths.capped).toBe(false)
    let resolved = 0
    for (const path of paths.paths) {
      const winners = path
        .filter((st) => st.label.kind === "first")
        .map((st) => st.action.owner)
      // SPEC 6.2 as fork-choice: never two canonical heads.
      expect(winners.length).toBeLessThanOrEqual(1)
      const final = path.at(-1)!.after
      if (final.key1.tag === TagDone) {
        resolved++
        const canonical = candidates[final.key1.result - 1]!
        // Both forks' owners now read the SAME canonical head from the
        // register (adoption): the losing branch stays in the store as a
        // counterfactual — data, not garbage — but is never the answer.
        expect(candidates).toContain(canonical)
        expect(Effect.runSync(replay(store, canonical, root)).length).toBe(3)
      }
    }
    expect(resolved).toBeGreaterThan(0)
  })

  test("SL6: merge replay is deterministic; a gap is a typed error", () => {
    const picks: MergeFact["picks"] = [
      { stream: "alpha", seq: 1 },
      { stream: "beta", seq: 2 },
    ]
    const once = merge(picks)
    const twice = merge(picks)
    expect(headFrom(mergeSeed(), once)).toBe(headFrom(mergeSeed(), twice))
    const gap = Effect.runSyncExit(applyMerge({ picks: [{ stream: "alpha", seq: 9 }] }, sources))
    expect(Exit.isFailure(gap)).toBe(true)
    expect(JSON.stringify(gap)).toContain("MergeGap")
  })
})
