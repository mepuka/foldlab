/**
 * The MCP face wall: served equals derived, and every handler routes through
 * the engine's door.
 *
 * Served-equals-derived is checked at the object the serving layer reads:
 * each dynamic tool's name, description, and served input schema must be the
 * committed artifact's own values — for the schema, the very same parsed
 * object, because the pinned release passes a raw JSON schema through
 * untouched and this test pins that pass-through. The parity of the two
 * committed homes is `check:kernel-tools`'s wall; this suite walls the last
 * link, artifact to wire.
 *
 * The handler differentials execute both refusal registers: a lawful call
 * lands and answers in the wire's spelling; an unlawful sentence answers with
 * the taught row — exactly the artifact's four refusal fields; a malformed
 * wire value answers with the seam refusal's own fields. The two registers
 * never dress as each other.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Layer } from "effect"
import { Tool } from "effect/unstable/ai"

import { encodeJsonValue } from "@foldlab/core/jcs"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf } from "../src/truth/Digest.js"
import { Engine } from "../src/carriage/Engine.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { stateOf, Cells } from "../src/planes/Cell.js"
import { Lanes } from "../src/planes/Lane.js"
import { Registers } from "../src/planes/Register.js"
import {
  artifactBytes,
  kernelHandlers,
  kernelToolkit,
  servedTools,
} from "../src/surface/mcp.js"

const canonicalText = (value: WireValue): string => {
  const encoded = encodeJsonValue(value)
  if (!encoded.ok) throw new Error("test value is not canonical")
  return encoded.bytes
}

const rootWrit: WireValue = { v: 0, kind: "policy", name: "mcp-root" }
const rootWritDigest = Effect.runSync(digestOf(rootWrit))

const inertCarriers = Layer.mergeAll(
  Lanes.testLayer({
    emit: () => Effect.die("no lane carriage in this wall"),
  }),
  Cells.testLayer({
    read: (cell) => stateOf([]).pipe(Effect.map((state) => ({ ...state, cell }))),
    merge: () => Effect.die("no cell carriage in this wall"),
  }),
  Registers.testLayer({
    grant: () => Effect.die("no register carriage in this wall"),
    renew: () => Effect.die("no register carriage in this wall"),
    commit: () => Effect.die("no register carriage in this wall"),
    expireSteal: () => Effect.die("no register carriage in this wall"),
    observe: () => Effect.die("no register carriage in this wall"),
  }),
)

const engineLayer = Engine.layer({
  catalog: [{ kind: "policy", digest: rootWritDigest }],
}).pipe(Layer.provide(Layer.mergeAll(Catalog.layer, Payloads.layer, inertCarriers)))

const runHandler = (
  name: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const handler = kernelHandlers({ holder: "mcp-wall" })[name]
      if (handler === undefined) throw new Error(`no handler for ${name}`)
      return yield* handler(payload)
    }).pipe(Effect.provide(engineLayer)) as Effect.Effect<Record<string, unknown>, never>,
  )

describe("served equals derived", () => {
  test("every served tool is the artifact's own row, schema object included", () => {
    const rows = servedTools()
    const toolkit = kernelToolkit()
    const tools = Object.values(toolkit.tools)
    expect(tools.length).toBe(rows.length)
    expect(rows.length).toBe(8)
    for (const row of rows) {
      const tool = tools.find((candidate) => candidate.name === row.name)
      expect(tool).toBeDefined()
      if (tool === undefined) continue
      expect(Tool.getDescription(tool as Tool.Any)).toBe(row.description)
      // The served schema is the parsed artifact's OWN object — pass-through,
      // not agreement.
      expect(Tool.getJsonSchema(tool as Tool.Any)).toBe(row.input_schema)
    }
  })

  test("the artifact's bytes parse to exactly the served rows", () => {
    const parsed = JSON.parse(artifactBytes()) as {
      readonly tools: ReadonlyArray<{ readonly name: string }>
    }
    expect(parsed.tools.map((tool) => tool.name)).toEqual(
      servedTools().map((tool) => tool.name),
    )
  })

  test("the handler record names exactly the served tools", () => {
    const served = servedTools().map((row) => row.name).sort()
    const handled = Object.keys(kernelHandlers({ holder: "mcp-wall" })).sort()
    expect(handled).toEqual(served)
  })
})

describe("handlers route through the door", () => {
  test("a lawful declare lands and answers in the wire's spelling", async () => {
    const result = await runHandler("kernel_declare", {
      kind: "resource",
      value: canonicalText({ v: 0, kind: "resource", cell: "mcp-cell" }),
      writ_digest: `sha256:${rootWritDigest}`,
    })
    expect(String(result["digest"])).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(Array.isArray(result["sentence"])).toBe(true)
    expect(result["reason"]).toBeUndefined()
  })

  test("an unlawful sentence answers with the taught row — the artifact's four fields", async () => {
    const result = await runHandler("kernel_spawn", {
      parent_writ_digest: `sha256:${"a".repeat(64)}`,
      request_writ_digest: `sha256:${"b".repeat(64)}`,
    })
    expect(result).toEqual({
      reason: "forward-reference",
      law: expect.any(String),
      repair: expect.any(String),
      applicability: "advisory",
    })
  })

  test("a non-canonical value answers with the seam refusal's own fields", async () => {
    const result = await runHandler("kernel_declare", {
      kind: "resource",
      value: "{\"b\":1,\"a\":2}",
      writ_digest: `sha256:${rootWritDigest}`,
    })
    expect(result["kind"]).toBe("non-canonical-value")
    expect(result["sort"]).toBe("structural")
    expect(result["reason"]).toBeUndefined()
    expect(result["sentence"]).toBeUndefined()
  })

  test("a malformed wire digest refuses at the seam, naming the field", async () => {
    const result = await runHandler("kernel_resolve", {
      kind: "resource",
      digest: "not-a-digest",
    })
    expect(result["kind"]).toBe("malformed-value")
    expect(result["path"]).toEqual(["digest"])
  })

  test("declare-then-resolve round-trips the value through verify-on-read", async () => {
    const value: WireValue = { v: 0, kind: "resource", cell: "round-trip" }
    const text = canonicalText(value)
    const digest = Effect.runSync(digestOf(value))
    const { declared, resolved } = await Effect.runPromise(
      Effect.gen(function* () {
        const handlers = kernelHandlers({ holder: "mcp-wall" })
        const declared = yield* handlers["kernel_declare"]!({
          kind: "resource",
          value: text,
          writ_digest: `sha256:${rootWritDigest}`,
        })
        const resolved = yield* handlers["kernel_resolve"]!({
          kind: "resource",
          digest: `sha256:${digest}`,
        })
        return { declared, resolved }
      }).pipe(Effect.provide(engineLayer)) as Effect.Effect<
        { declared: Record<string, unknown>; resolved: Record<string, unknown> },
        never
      >,
    )
    expect(declared["digest"]).toBe(`sha256:${digest}`)
    expect(Array.isArray(resolved["sentence"])).toBe(true)
    expect(resolved["value"]).toBe(text)
  })

  test("the fold face answers with the verdict alone, and a missing anchor cannot be spelled", async () => {
    const result = await runHandler("kernel_fold", {
      reduction_digest: `sha256:${"c".repeat(64)}`,
      lane_digest: `sha256:${"d".repeat(64)}`,
      shard: 0,
      anchor_floor: 4,
      anchor_state: `sha256:${"e".repeat(64)}`,
      anchor_head: 6,
      query: canonicalText({ q: "latest" }),
    })
    // The referent is off this engine's catalog: the door teaches, the tool
    // carries the row.
    expect(result["reason"]).toBe("forward-reference")
    expect(result["sentence"]).toBeUndefined()
  })

  test("a trigger names its production or is refused naming the slot", async () => {
    const result = await runHandler("kernel_trigger", {
      production: "sometimes-maybe",
      declaration_digest: `sha256:${"f".repeat(64)}`,
    })
    expect(result["kind"]).toBe("malformed-value")
    expect(result["path"]).toEqual(["production"])
  })
})
