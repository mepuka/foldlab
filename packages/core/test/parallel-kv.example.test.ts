import { describe, expect, test } from "bun:test"
import {
  parallelKVChecks,
  parallelKVReport,
} from "../../../examples/rosetta/parallel-kv.ts"

describe("the parallel KV consumer story", () => {
  test("ordered replay and enriched projection reach the sequential answer", () => {
    expect(parallelKVChecks).toEqual({
      orderedReplayMatchesSequential: true,
      enrichedProjectionMatchesSequential: true,
      swappedPlainCombineDiffers: true,
      swappedEnrichedJoinAgrees: true,
    })
  })

  test("the example's exact digests are executable evidence", () => {
    expect(parallelKVReport).toEqual({
      sequential: "3dfe0a75607e4e3f45214337627fad81fa43d9bcc4f42eb5fdbcff070fcb2af4",
      ordered: "3dfe0a75607e4e3f45214337627fad81fa43d9bcc4f42eb5fdbcff070fcb2af4",
      swapped: "823c9f71d7bf6124babde2a9e852c613a27fa907d0f032df37b531c0bfd0f4f8",
      enrichedWhole: "3dfe0a75607e4e3f45214337627fad81fa43d9bcc4f42eb5fdbcff070fcb2af4",
      joined: "3dfe0a75607e4e3f45214337627fad81fa43d9bcc4f42eb5fdbcff070fcb2af4",
      joinedSwapped: "3dfe0a75607e4e3f45214337627fad81fa43d9bcc4f42eb5fdbcff070fcb2af4",
    })
  })
})
