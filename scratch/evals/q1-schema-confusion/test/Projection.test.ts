import { describe, expect, test } from "bun:test"
import { projectToolDocument } from "../src/Projection.ts"

const base = {
  version: "kernel-tools-v1",
  tools: [
    {
      name: "kernel_emit",
      description: "emit",
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["lane_digest", "body"],
        properties: {
          lane_digest: {
            type: "string",
            pattern: "^sha256:[0-9a-f]+$",
            description: "lane",
          },
          body: { type: "string", description: "body" },
        },
      },
    },
    {
      name: "kernel_resolve",
      description: "resolve",
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "digest"],
        properties: {
          kind: { type: "string", enum: ["schema", "program"] },
          digest: {
            type: "string",
            pattern: "^sha256:[0-9a-f]+$",
          },
        },
      },
    },
  ],
} as const

describe("projectToolDocument", () => {
  test("keeps the base document unchanged for the compound arm", () => {
    expect(projectToolDocument(base, "compound")).toEqual(base)
  })

  test("removes only the terminal digest suffix for the bare arm", () => {
    const projected = projectToolDocument(base, "bare")
    const emit = projected.tools[0]!

    expect(emit.input_schema.required).toEqual(["lane", "body"])
    expect(emit.input_schema.properties).toEqual({
      lane: {
        type: "string",
        pattern: "^sha256:[0-9a-f]+$",
        description: "lane",
      },
      body: { type: "string", description: "body" },
    })
  })

  test("wraps digest slots with their semantic type for the nested arm", () => {
    const projected = projectToolDocument(base, "nested")
    const emit = projected.tools[0]!
    const resolve = projected.tools[1]!

    expect(emit.input_schema.properties.lane).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["lane"] },
        value: {
          type: "string",
          pattern: "^sha256:[0-9a-f]+$",
          description: "lane",
        },
      },
    })
    expect(resolve.input_schema.properties.digest).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["type", "value"],
      properties: {
        type: { type: "string", enum: ["schema", "program"] },
        value: {
          type: "string",
          pattern: "^sha256:[0-9a-f]+$",
        },
      },
    })
  })
})
