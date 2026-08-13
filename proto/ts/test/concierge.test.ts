import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { toEffectSchema, toGoSource, toJsonSchema } from "../src/codegen.ts"
import type { Json } from "../src/jcs.ts"
import { Session } from "../src/session.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon
let client: ProtoClient

beforeAll(async () => {
  daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error("connect refused: " + JSON.stringify(connected.refusal))
  client = connected.fact
}, 120_000)

afterAll(async () => {
  await client?.close()
  await daemon?.stop()
}, 60_000)

describe("concierge laws", () => {
  test("C1 fill is pure: the same request returns byte-identical data", async () => {
    const request = {
      partial: { k: "hole" } as const,
      path: [] as string[],
      subtree: { k: "hole" } as const,
    }
    const first = await client.fillType(request.partial, request.path, request.subtree)
    const second = await client.fillType(request.partial, request.path, request.subtree)
    expect(first.ok && second.ok).toBe(true)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  test("C1 unfill is pure: the same request returns byte-identical data", async () => {
    const first = await client.unfillType({ k: "string" }, [])
    const second = await client.unfillType({ k: "string" }, [])
    expect(first.ok && second.ok).toBe(true)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  test("C2 unfill(fill(p, path, subtree), path) equals p over generated partials", async () => {
    const created = await client.createType({ k: "string" })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const hole: Json = { k: "hole" }
    const cases: Array<{ partial: Json; path: string[] }> = [
      { partial: hole, path: [] },
      { partial: { k: "list", of: hole }, path: ["of"] },
      {
        partial: { k: "struct", fields: { value: hole }, optional: [] },
        path: ["fields", "value"],
      },
      { partial: { k: "union", of: [hole] }, path: ["of", "0"] },
      { partial: { k: "brand", name: "Value", of: hole }, path: ["of"] },
      {
        partial: {
          k: "check",
          base: hole,
          check: { name: "check", args: {} },
        },
        path: ["base"],
      },
    ]
    const subtrees: Json[] = [
      { k: "string" },
      { k: "bool" },
      { k: "int" },
      { k: "float" },
      { k: "null" },
      { k: "opaque" },
      { k: "literal", value: null },
      { k: "list", of: { k: "string" } },
      { k: "struct", fields: {}, optional: [] },
      { k: "union", of: [{ k: "null" }, { k: "string" }] },
      { k: "brand", name: "Value", of: { k: "string" } },
      {
        k: "check",
        base: { k: "string" },
        check: { name: "check", args: {} },
      },
      { k: "ref", digest: created.fact.digest },
    ]

    for (const generated of cases) {
      for (const subtree of subtrees) {
        const filled = await client.fillType(generated.partial, generated.path, subtree)
        expect(filled.ok).toBe(true)
        if (!filled.ok) continue
        const unfilled = await client.unfillType(asJson(filled.fact.partial), generated.path)
        expect(unfilled.ok).toBe(true)
        if (unfilled.ok) expect(unfilled.fact.partial).toEqual(generated.partial)
      }
    }
  }, 120_000)

  test("C3 frontier-empty iff zero holes iff type.create accepts", async () => {
    const hole: Json = { k: "hole" }
    const started = await client.fillType(hole, [], hole)
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const list = started.fact.frontier[0]!.legal.find((choice) => choice.kind === "list")
    expect(list).toBeDefined()
    if (list === undefined) return
    const listed = await client.fillType(hole, [], asJson(list.example))
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(countHoles(listed.fact.partial)).toBe(1)
    expect(listed.fact.frontier.length).toBe(1)
    expect((await client.createType(asJson(listed.fact.partial))).ok).toBe(false)

    const string = listed.fact.frontier[0]!.legal.find((choice) => choice.kind === "string")
    expect(string).toBeDefined()
    if (string === undefined) return
    const complete = await client.fillType(
      asJson(listed.fact.partial),
      listed.fact.frontier[0]!.path,
      asJson(string.example),
    )
    expect(complete.ok).toBe(true)
    if (!complete.ok) return
    expect(countHoles(complete.fact.partial)).toBe(0)
    expect(complete.fact.frontier).toEqual([])
    expect((await client.createType(asJson(complete.fact.partial))).ok).toBe(true)
  })

  test("C4 generated reachable partials have no dead ends and every frontier example is accepted", async () => {
    const created = await client.createType({ k: "string" })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const hole: Json = { k: "hole" }
    const generated: Array<{ partial: Json; probePath: string[] }> = [
      { partial: hole, probePath: [] },
      { partial: { k: "list", of: hole }, probePath: ["of"] },
      {
        partial: {
          k: "struct",
          fields: { left: hole, right: hole },
          optional: [],
        },
        probePath: ["fields", "left"],
      },
      {
        partial: { k: "union", of: [hole, hole] },
        probePath: ["of", "0"],
      },
      {
        partial: { k: "brand", name: "Value", of: hole },
        probePath: ["of"],
      },
      {
        partial: {
          k: "check",
          base: hole,
          check: { name: "check", args: {} },
        },
        probePath: ["base"],
      },
    ]
    const allKinds = [
      "string",
      "bool",
      "int",
      "float",
      "null",
      "opaque",
      "literal",
      "list",
      "struct",
      "union",
      "brand",
      "check",
      "ref",
    ]

    for (const candidate of generated) {
      const described = await client.fillType(candidate.partial, candidate.probePath, hole)
      expect(described.ok).toBe(true)
      if (!described.ok) continue
      expect(described.fact.frontier.length).toBe(countHoles(candidate.partial))
      for (const entry of described.fact.frontier) {
        expect(entry.legal.map((choice) => choice.kind)).toEqual(allKinds)
        expect(entry.refs.length).toBeGreaterThan(0)
        expect(entry.refs.length).toBeLessThanOrEqual(16)
        expect([...entry.refs].sort()).toEqual([...entry.refs])
        for (const choice of entry.legal) {
          const filled = await client.fillType(candidate.partial, entry.path, asJson(choice.example))
          expect(filled.ok).toBe(true)
        }
      }
    }
  }, 120_000)

  test("C5 holes never bear identity or enter catalog fixtures", async () => {
    const hole: Json = { k: "hole" }
    const refused = await client.createType({
      k: "struct",
      fields: { undecided: hole },
      optional: [],
    })
    expect(refused.ok).toBe(false)
    if (!refused.ok) {
      expect(refused.refusal.kind).toBe("invalid-structure")
      expect(refused.refusal.path).toEqual(["structure", "fields", "undecided"])
    }

    for (const derived of [
      toEffectSchema(hole),
      toJsonSchema(hole),
      toGoSource(hole, "Hole", "0".repeat(64)),
    ]) {
      expect(derived.ok).toBe(false)
      if (!derived.ok) {
        expect(derived.refusal.kind).toBe("underivable")
        expect(derived.refusal.path).toEqual(["structure", "k"])
      }
    }

    const catalog = await client.read("catalog")
    expect(catalog.ok).toBe(true)
    if (catalog.ok) {
      for (const entry of catalog.fact.entries) {
        const fact = JSON.parse(entry.payload)
        expect(JSON.stringify(fact.structure)).not.toContain('"k":"hole"')
      }
    }

    for (const name of ["types.json", "chains.json", "frames.json"]) {
      const text = await Bun.file(new URL("../../wire/fixtures/" + name, import.meta.url)).text()
      expect(text).not.toContain('"k": "hole"')
    }
  })

  test("the Session concierge helper adds only request transcript entries", async () => {
    const session = new Session(client)
    const started = await session.startType()
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const string = started.fact.frontier[0]!.legal.find((choice) => choice.kind === "string")!
    const filled = await session.fillType(asJson(started.fact.partial), [], asJson(string.example))
    expect(filled.ok).toBe(true)
    if (!filled.ok) return
    const unfilled = await session.unfillType(asJson(filled.fact.partial), [])
    expect(unfilled.ok).toBe(true)
    expect(session.transcript.map((entry) => entry.subject)).toEqual([
      "flb.req.type.fill",
      "flb.req.type.fill",
      "flb.req.type.unfill",
    ])
    expect(session.transcript.every((entry) => entry.verb === "request")).toBe(true)
  })
})

const asJson = (value: unknown): Json => value as Json

const countHoles = (value: unknown): number => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return 0
  const record = value as Record<string, unknown>
  if (record["k"] === "hole") return 1
  switch (record["k"]) {
    case "list":
    case "brand":
      return countHoles(record["of"])
    case "check":
      return countHoles(record["base"])
    case "struct": {
      const fields = record["fields"]
      if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return 0
      return Object.values(fields).reduce<number>((sum, field) => sum + countHoles(field), 0)
    }
    case "union":
      return Array.isArray(record["of"])
        ? record["of"].reduce<number>((sum, member) => sum + countHoles(member), 0)
        : 0
    default:
      return 0
  }
}
