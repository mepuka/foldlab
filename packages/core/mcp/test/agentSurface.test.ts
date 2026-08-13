/**
 * The agent surface's laws: an agent can only declare (unknown primitives
 * refuse as data), a mint through the surface is a real mint (digests
 * resolve, probe heads recompute), auto-annotation claims ride the
 * ontology without ever moving a digest, and the toolkit exposes exactly
 * the intended tool names.
 */

import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { makeAgentSurface } from "../src/agentSurface.ts"
import { probeCorpus } from "@foldlab/core/mint"
import { headFrom, streamSeed } from "@foldlab/core/stream"
import { apply, compose, filterKeyPrefix, mapValueUpper, renameStream } from "@foldlab/core/xform"

const run = <A, E>(e: Effect.Effect<A, E>) => Effect.runSync(e)
const flip = <A, E>(e: Effect.Effect<A, E>) => Effect.runSync(Effect.flip(e))

describe("the agent surface", () => {
  test("mint by declaration: the tool call is the type, and it resolves", () => {
    const s = makeAgentSurface()
    const minted = run(s.ops.mint({ primitive: "filterKeyPrefix", param: "a", seed: null }))
    expect(run(s.ops.resolve({ digest: minted.digest })).kind).toBe("mint")
    expect(run(s.ops.resolve({ digest: minted.schemaDigest })).kind).toBe("schema")
  })

  test("an undeclarable transform refuses as data, naming the catalog", () => {
    const s = makeAgentSurface()
    const err = flip(s.ops.mint({ primitive: "evalArbitraryCode", param: null, seed: null }))
    expect(err.law).toBe("declaration")
    expect(err.detail).toContain("filterKeyPrefix")
    const missing = flip(s.ops.mint({ primitive: "renameStream", param: null, seed: null }))
    expect(missing.law).toBe("declaration")
  })

  test("probe heads recompute: the tool result is verifiable, not asserted", () => {
    const s = makeAgentSurface()
    const minted = run(s.ops.mint({ primitive: "mapValueUpper", param: null, seed: null }))
    const probed = run(s.ops.probe({ digest: minted.digest, events: null }))
    const seed = streamSeed("agent.probe.v1")
    const expected = apply(mapValueUpper(), probeCorpus())
    expect(probed.outputHead).toBe(headFrom(seed, expected))
    expect(probed.kept).toBe(expected.length)
    expect(probed.inputHead).toBe(headFrom(seed, probeCorpus()))
  })

  test("compose by digest equals the hand-fused pipeline; forged digests refuse first", () => {
    const s = makeAgentSurface()
    const a = run(s.ops.mint({ primitive: "renameStream", param: "z", seed: null }))
    const b = run(s.ops.mint({ primitive: "filterKeyPrefix", param: "a", seed: null }))
    const composed = run(s.ops.compose({ digests: [a.digest, b.digest], seed: null }))
    const probed = run(s.ops.probe({ digest: composed.digest, events: null }))
    const seed = streamSeed("agent.probe.v1")
    expect(probed.outputHead).toBe(
      headFrom(seed, apply(compose(renameStream("z"), filterKeyPrefix("a")), probeCorpus())),
    )
    expect(flip(s.ops.compose({ digests: [a.digest, "ef".repeat(32)], seed: null })).law).toBe(
      "unknown-digest",
    )
  })

  test("auto-annotation claims ride the ontology and never move a digest", () => {
    const bare = makeAgentSurface()
    const claimed = makeAgentSurface({
      annotate: (ctx) => ({ "x-agent": "test-agent", "x-via": ctx.tool }),
    })
    const m1 = run(bare.ops.mint({ primitive: "mapValueUpper", param: null, seed: null }))
    const m2 = run(claimed.ops.mint({ primitive: "mapValueUpper", param: null, seed: null }))
    // claims never move identity
    expect(m2.digest).toBe(m1.digest)
    // but they ride the ontology read
    const graph = JSON.parse(run(claimed.ops.ontology()).graph) as Array<{
      digest: string
      claims: Record<string, string> | null
    }>
    const node = graph.find((n) => n.digest === m2.digest)
    expect(node?.claims?.["x-agent"]).toBe("test-agent")
  })

  test("the toolkit exposes exactly the agent-first tool set", () => {
    const s = makeAgentSurface()
    expect(Object.keys(s.toolkit.tools).sort()).toEqual([
      "compose_mints",
      "example_records",
      "mint_transform",
      "ontology",
      "probe_transform",
      "resolve_digest",
    ])
  })
})
