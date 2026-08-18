import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import type { BatteryTask, LedgerEntry } from "../src/Battery.ts"
import type { RunRecord } from "../src/Domain.ts"
import type { ToolDocument, Variant } from "../src/Projection.ts"
import { analyzeRuns, renderFindings } from "../src/Report.ts"
import type { CanonicalSlot } from "../src/Scoring.ts"

const parent = `sha256:${"d".repeat(64)}`
const request = `sha256:${"3".repeat(64)}`
const digest = { type: "string", pattern: "^sha256:[0-9a-f]+$" } as const

const base: ToolDocument = {
  tools: [{
    name: "kernel_spawn",
    description: "spawn",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["parent_writ_digest", "request_writ_digest"],
      properties: {
        parent_writ_digest: { ...digest, description: "the authority being attenuated" },
        request_writ_digest: { ...digest, description: "the requested authority" },
      },
    },
  }],
}

const ledger: readonly LedgerEntry[] = [
  {
    key: "spawn.parent_writ",
    tool: "kernel_spawn",
    field: "parent_writ_digest",
    role: "the authority being attenuated",
    digest: parent,
    corpus_field: "parent",
    corpus_kind: "policy",
    cross_walk: "position",
  },
  {
    key: "spawn.request_writ",
    tool: "kernel_spawn",
    field: "request_writ_digest",
    role: "the requested authority",
    digest: request,
    corpus_field: null,
    corpus_kind: null,
    cross_walk: "unresolved",
  },
]

const task: BatteryTask = {
  id: "spawn",
  tool: "kernel_spawn",
  assignments: [
    { ledger_key: "spawn.parent_writ", role: "the authority being attenuated" },
    { ledger_key: "spawn.request_writ", role: "the requested authority" },
  ],
  literals: {},
  arguments: { parent_writ_digest: parent, request_writ_digest: request },
}

const canonicalSlots: ReadonlyMap<string, CanonicalSlot> = new Map(
  ledger.map((entry) => [entry.digest, { tool: entry.tool, field: entry.field }]),
)

const argumentsByVariant: Record<Variant, Readonly<Record<string, unknown>>> = {
  compound: { parent_writ_digest: parent, request_writ_digest: request },
  bare: { parent_writ: request, request_writ: parent },
  nested: {
    parent_writ: { type: "policy", value: parent },
    request_writ: { type: "policy", value: request },
  },
}

const run = (variant: Variant): RunRecord => ({
  model_alias: "haiku",
  canonical_model: "claude-haiku-test",
  variant,
  sample: 1,
  effort: "low",
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
    calls: [{ task_id: task.id, name: task.tool, arguments: argumentsByVariant[variant] }],
  },
})

const analyze = () =>
  Effect.runPromise(analyzeRuns({
    base,
    tasks: [task],
    ledger,
    plantedDigests: [parent, request],
    canonicalSlots,
    runs: [run("compound"), run("bare"), run("nested")],
  }))

describe("result reporting", () => {
  test("summarizes validity and confusion independently", async () => {
    const analysis = await analyze()
    const find = (variant: Variant) =>
      analysis.summaries.find((row) => row.scope === "combined" && row.variant === variant)

    expect(find("compound")?.valid_call.successes).toBe(1)
    expect(find("compound")?.field_confusion.successes).toBe(0)
    expect(find("bare")?.field_confusion.successes).toBe(1)
    expect(find("bare")?.digest_in_wrong_slot.successes).toBe(1)
  })

  /**
   * Round 1's rule stated when a comparison was "supported" and when it was
   * "inconclusive" and named no consequence for either, so the decision was
   * left to be made after the data. Every branch names its action now.
   */
  test("the inconclusive branch reports the action it fixes", async () => {
    const report = renderFindings(await analyze())

    expect(report).toContain("Status: **MEASURED**")
    expect(report).toContain("The evaluation is inconclusive")
    expect(report).toContain("Preregistered action on this branch (`inconclusive`)")
    expect(report).toContain("No naming change is made")
    expect(report).toContain("Q1 stays open")
  })

  test("rates are reported against the discriminating denominator", async () => {
    const analysis = await analyze()
    const report = renderFindings(analysis)

    expect(analysis.discriminating).toEqual(["spawn"])
    expect(report).toContain("What the comparison actually rests on")
    expect(report).toContain("1 of 1 battery rows produced any confused call")
  })

  test("states whether the two primitive measures ever disagree", async () => {
    const report = renderFindings(await analyze())

    expect(report).toContain("Are the measures independent?")
    expect(report).toMatch(/one measure wearing two names|discriminate separately here/)
  })

  test("reports the reasoning effort the population ran at", async () => {
    const report = renderFindings(await analyze())

    expect(report).toContain("Reasoning effort: `low` on every generation.")
  })

  test("names the slots where the hand-derived base and the corpus diverge", async () => {
    const report = renderFindings(await analyze())

    expect(report).toContain("Base projection against the generated corpus")
    expect(report).toContain("`spawn.request_writ`")
    expect(report).toContain("EXPLORATORY, hand-derived")
  })
})
