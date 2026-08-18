import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { projectToolDocument } from "../src/Projection.ts"
import {
  compileToolValidators,
  scoreRun,
  wilson95,
  type BatteryTask,
} from "../src/Scoring.ts"

const parent = `sha256:${"d".repeat(64)}`
const request = `sha256:${"3".repeat(64)}`

const base = {
  version: "kernel-tools-v1",
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
} as const

const task: BatteryTask = {
  id: "spawn-child-writ",
  instruction: "Spawn the requested child writ under its parent.",
  tool: "kernel_spawn",
  arguments: {
    parent_writ_digest: parent,
    request_writ_digest: request,
  },
}

const digests = [parent, request]

describe("scoreRun", () => {
  test("separates schema validity from semantic slot confusion", () => {
    const tools = projectToolDocument(base, "compound")
    const [observation] = scoreRun({
      tasks: [task],
      variant: "compound",
      base,
      validators: Effect.runSync(compileToolValidators(tools)),
      plantedDigests: digests,
      response: {
        calls: [{
          task_id: task.id,
          name: task.tool,
          arguments: {
            parent_writ_digest: request,
            request_writ_digest: parent,
          },
        }],
      },
    })

    expect(observation).toMatchObject({
      valid_call: true,
      field_confusion: true,
      digest_in_wrong_slot: true,
      wrong_tool: false,
      schema_invalid: false,
    })
  })

  test("counts an incorrect nested type as a wrong digest slot", () => {
    const tools = projectToolDocument(base, "nested")
    const [observation] = scoreRun({
      tasks: [task],
      variant: "nested",
      base,
      validators: Effect.runSync(compileToolValidators(tools)),
      plantedDigests: digests,
      response: {
        calls: [{
          task_id: task.id,
          name: task.tool,
          arguments: {
            parent_writ: { type: "lane", value: parent },
            request_writ: { type: "writ", value: request },
          },
        }],
      },
    })

    expect(observation).toMatchObject({
      valid_call: false,
      field_confusion: true,
      digest_in_wrong_slot: true,
      schema_invalid: true,
    })
  })

  test("does not turn a wholly missing call into a placement error", () => {
    const tools = projectToolDocument(base, "bare")
    const [observation] = scoreRun({
      tasks: [task],
      variant: "bare",
      base,
      validators: Effect.runSync(compileToolValidators(tools)),
      plantedDigests: digests,
      response: { calls: [] },
    })

    expect(observation).toMatchObject({
      valid_call: false,
      field_confusion: true,
      digest_in_wrong_slot: false,
      missing: true,
    })
  })
})

describe("wilson95", () => {
  test("matches known all-failure and all-success intervals", () => {
    expect(wilson95(0, 10)).toEqual({ low: 0, high: 0.2775 })
    expect(wilson95(10, 10)).toEqual({ low: 0.7225, high: 1 })
  })
})
