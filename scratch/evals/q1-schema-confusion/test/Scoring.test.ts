import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import type { BatteryTask } from "../src/Battery.ts"
import { projectToolDocument, type ToolDocument } from "../src/Projection.ts"
import {
  compileToolValidators,
  scoreRun,
  wilson95,
  type CanonicalSlot,
} from "../src/Scoring.ts"

const parent = `sha256:${"d".repeat(64)}`
const request = `sha256:${"3".repeat(64)}`
const lane = `sha256:${"e".repeat(64)}`

const digest = { type: "string", pattern: "^sha256:[0-9a-f]+$" } as const

const base: ToolDocument = {
  tools: [
    {
      name: "kernel_spawn",
      description: "spawn",
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["parent_writ_digest", "request_writ_digest"],
        properties: {
          parent_writ_digest: digest,
          request_writ_digest: digest,
        },
      },
    },
    {
      name: "kernel_emit",
      description: "emit",
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["lane_digest", "body"],
        properties: { lane_digest: digest, body: { type: "string" } },
      },
    },
  ],
}

const spawnTask: BatteryTask = {
  id: "spawn",
  tool: "kernel_spawn",
  assignments: [
    { ledger_key: "spawn.parent_writ", role: "the authority being attenuated" },
    { ledger_key: "spawn.request_writ", role: "the requested authority" },
  ],
  literals: {},
  arguments: { parent_writ_digest: parent, request_writ_digest: request },
}

const emitTask: BatteryTask = {
  id: "emit",
  tool: "kernel_emit",
  assignments: [{ ledger_key: "emit.lane", role: "the declared evidence lane" }],
  literals: { body: '{"slot":"body"}' },
  arguments: { lane_digest: lane, body: '{"slot":"body"}' },
}

const canonicalSlots: ReadonlyMap<string, CanonicalSlot> = new Map([
  [parent, { tool: "kernel_spawn", field: "parent_writ_digest" }],
  [request, { tool: "kernel_spawn", field: "request_writ_digest" }],
  [lane, { tool: "kernel_emit", field: "lane_digest" }],
])

const plantedDigests = [parent, request, lane]

const score = (options: {
  readonly tasks: readonly BatteryTask[]
  readonly variant: "compound" | "bare" | "nested"
  readonly calls: readonly {
    readonly task_id: string
    readonly name: string
    readonly arguments: Readonly<Record<string, unknown>>
  }[]
}) =>
  scoreRun({
    tasks: options.tasks,
    variant: options.variant,
    base,
    validators: Effect.runSync(
      compileToolValidators(projectToolDocument(base, options.variant)),
    ),
    plantedDigests,
    canonicalSlots,
    response: { calls: options.calls },
  })

describe("scoreRun", () => {
  test("separates schema validity from semantic slot confusion", () => {
    const [observation] = score({
      tasks: [spawnTask],
      variant: "compound",
      calls: [{
        task_id: "spawn",
        name: "kernel_spawn",
        arguments: { parent_writ_digest: request, request_writ_digest: parent },
      }],
    })

    expect(observation).toMatchObject({
      valid_call: true,
      expected_candidate_missing: true,
      digest_in_wrong_slot: true,
      field_confusion: true,
      schema_invalid: false,
    })
  })

  test("counts an incorrect nested type as a wrong digest slot", () => {
    const [observation] = score({
      tasks: [spawnTask],
      variant: "nested",
      calls: [{
        task_id: "spawn",
        name: "kernel_spawn",
        arguments: {
          parent_writ: { type: "lane", value: parent },
          request_writ: { type: "writ", value: request },
        },
      }],
    })

    expect(observation?.digest_in_wrong_slot).toBe(true)
  })

  test("does not turn a wholly missing call into a placement error", () => {
    const [observation] = score({ tasks: [spawnTask], variant: "bare", calls: [] })

    expect(observation).toMatchObject({
      valid_call: false,
      expected_candidate_missing: true,
      digest_in_wrong_slot: false,
      missing: true,
    })
  })

  // The two primitive measures have to be able to disagree in both directions,
  // or the report is quoting one measure under two names. Round 1's pair never
  // disagreed once across 240 calls and nothing said so.
  test("omission fires without misplacement when a slot is left empty", () => {
    const [observation] = score({
      tasks: [spawnTask],
      variant: "compound",
      calls: [{
        task_id: "spawn",
        name: "kernel_spawn",
        arguments: { parent_writ_digest: parent },
      }],
    })

    expect(observation).toMatchObject({
      expected_candidate_missing: true,
      digest_in_wrong_slot: false,
    })
  })

  test("misplacement fires without omission when a foreign digest is added", () => {
    const [observation] = score({
      tasks: [emitTask],
      variant: "compound",
      calls: [{
        task_id: "emit",
        name: "kernel_emit",
        arguments: { lane_digest: lane, body: parent },
      }],
    })

    expect(observation).toMatchObject({
      expected_candidate_missing: false,
      digest_in_wrong_slot: true,
    })
  })

  // A planted digest the task never asked for, sitting in the slot it does
  // belong to, is helpfulness rather than confusion.
  test("a digest in its own optional slot is not misplacement", () => {
    const [observation] = score({
      tasks: [spawnTask],
      variant: "compound",
      calls: [{
        task_id: "spawn",
        name: "kernel_spawn",
        arguments: { parent_writ_digest: parent, request_writ_digest: request },
      }],
    })

    expect(observation).toMatchObject({
      expected_candidate_missing: false,
      digest_in_wrong_slot: false,
      field_confusion: false,
    })
  })
})

describe("wilson95", () => {
  test("matches known all-failure and all-success intervals", () => {
    expect(wilson95(0, 10)).toEqual({ low: 0, high: 0.2775 })
    expect(wilson95(10, 10)).toEqual({ low: 0.7225, high: 1 })
  })
})
