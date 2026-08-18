import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import type { RunRecord } from "../src/Domain.ts"
import type { ToolDocument, Variant } from "../src/Projection.ts"
import { analyzeRuns, renderFindings } from "../src/Report.ts"

const parent = `sha256:${"d".repeat(64)}`
const request = `sha256:${"3".repeat(64)}`

const base: ToolDocument = {
  tools: [{
    name: "kernel_spawn",
    description: "spawn",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["parent_writ_digest", "request_writ_digest"],
      properties: {
        parent_writ_digest: {
          type: "string",
          pattern: "^sha256:[0-9a-f]+$",
        },
        request_writ_digest: {
          type: "string",
          pattern: "^sha256:[0-9a-f]+$",
        },
      },
    },
  }],
}

const task = {
  id: "spawn-child-writ",
  instruction: "spawn",
  tool: "kernel_spawn",
  arguments: {
    parent_writ_digest: parent,
    request_writ_digest: request,
  },
}

const argumentsByVariant: Record<Variant, Readonly<Record<string, unknown>>> = {
  compound: {
    parent_writ_digest: parent,
    request_writ_digest: request,
  },
  bare: {
    parent_writ: request,
    request_writ: parent,
  },
  nested: {
    parent_writ: { type: "writ", value: parent },
    request_writ: { type: "writ", value: request },
  },
}

const run = (variant: Variant): RunRecord => ({
  model_alias: "haiku",
  canonical_model: "claude-haiku-test",
  variant,
  sample: 1,
  base_sha256: "0".repeat(64),
  prompt_sha256: variant.padEnd(64, "0"),
  duration_api_ms: 10,
  total_cost_usd: 0.01,
  model_usage: {
    test: {
      canonicalModel: "claude-haiku-test",
      inputTokens: 10,
      outputTokens: 10,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      costUSD: 0.01,
    },
  },
  response: {
    calls: [{
      task_id: task.id,
      name: task.tool,
      arguments: argumentsByVariant[variant],
    }],
  },
})

describe("result reporting", () => {
  test("summarizes validity and confusion independently", async () => {
    const analysis = await Effect.runPromise(analyzeRuns({
      base,
      tasks: [task],
      plantedDigests: [parent, request],
      runs: [run("compound"), run("bare"), run("nested")],
    }))

    const compound = analysis.summaries.find((row) =>
      row.scope === "combined" && row.variant === "compound"
    )!
    const bare = analysis.summaries.find((row) =>
      row.scope === "combined" && row.variant === "bare"
    )!

    expect(compound.valid_call.successes).toBe(1)
    expect(compound.field_confusion.successes).toBe(0)
    expect(bare.valid_call.successes).toBe(1)
    expect(bare.field_confusion.successes).toBe(1)
    expect(bare.digest_in_wrong_slot.successes).toBe(1)
  })

  test("renders an honest measured-tier finding for an underpowered sample", async () => {
    const analysis = await Effect.runPromise(analyzeRuns({
      base,
      tasks: [task],
      plantedDigests: [parent, request],
      runs: [run("compound"), run("bare"), run("nested")],
    }))
    const report = renderFindings(analysis)

    expect(report).toContain("Status: **MEASURED**")
    expect(report).toContain("The evaluation is inconclusive")
    expect(report).toContain("1 independent generation per model/arm cell")
    expect(report).toContain(
      "1 returned call met the field-confusion definition (1 on `spawn-child-writ`); 1 of those remained syntactically valid",
    )
    expect(report).toContain(
      "aggregate arm rates primarily measure behavior on one synthetic task",
    )
  })
})
