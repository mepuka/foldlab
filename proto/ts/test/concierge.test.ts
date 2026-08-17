import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { FastCheck } from "effect/testing"
import { ProtoClient } from "../src/client.ts"
import { toEffectSchema, toGoSource, toJsonSchema } from "../src/codegen.ts"
import type { Json } from "../src/jcs.ts"
import { Session } from "../src/session.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon
let client: ProtoClient

interface FocusedPartial {
  readonly partial: Json
  readonly path: ReadonlyArray<string>
}

type PartialWrapper =
  | { readonly kind: "list" }
  | { readonly kind: "brand"; readonly name: string }
  | { readonly kind: "check"; readonly name: string; readonly argKey: string; readonly arg: Json }
  | { readonly kind: "struct"; readonly field: string; readonly optional: boolean; readonly side: boolean }
  | { readonly kind: "union"; readonly before: number; readonly after: number }

const isWellFormedUnicode = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false
    }
  }
  return true
}

const unicodeStringArbitrary = FastCheck.string({ maxLength: 16 }).filter(isWellFormedUnicode)
const nonEmptyUnicodeStringArbitrary = FastCheck.string({ minLength: 1, maxLength: 16 })
  .filter(isWellFormedUnicode)
// The closure law (ruling 7): NO position in a v0 term admits a non-integral
// number — check args included, however deeply nested. Round 1 left this
// arbitrary holding Number.MIN_VALUE (5e-324) and Number.MAX_VALUE on the
// premise that args were unconstrained JSON; that premise is dead, and
// generating those values here would test the refusal path under the name of
// the admission path. One arbitrary now serves both scalar positions, because
// one law governs both.
const scalarArbitrary: FastCheck.Arbitrary<Json> = FastCheck.oneof(
  FastCheck.constant(null),
  FastCheck.boolean(),
  unicodeStringArbitrary,
  FastCheck.constantFrom(Number.MIN_SAFE_INTEGER, -1, 0, 1, Number.MAX_SAFE_INTEGER),
)
const jsonScalarArbitrary = scalarArbitrary
const literalScalarArbitrary = scalarArbitrary
const decidedLeafArbitrary: FastCheck.Arbitrary<Json> = FastCheck.oneof(
  FastCheck.constantFrom<Json>(
    { k: "string" },
    { k: "bool" },
    { k: "int" },
    { k: "null" },
    { k: "opaque" },
    { k: "struct", fields: {}, optional: [] },
    { k: "union", of: [{ k: "null" }] },
  ),
  literalScalarArbitrary.map((value): Json => ({ k: "literal", value })),
)
const partialWrapperArbitrary: FastCheck.Arbitrary<PartialWrapper> = FastCheck.oneof(
  FastCheck.constant({ kind: "list" } as const),
  nonEmptyUnicodeStringArbitrary.map((name) => ({ kind: "brand" as const, name })),
  FastCheck.record({
    name: nonEmptyUnicodeStringArbitrary,
    argKey: unicodeStringArbitrary,
    arg: jsonScalarArbitrary,
  }).map(({ name, argKey, arg }) => ({ kind: "check" as const, name, argKey, arg })),
  FastCheck.record({
    field: unicodeStringArbitrary,
    optional: FastCheck.boolean(),
    side: FastCheck.boolean(),
  }).map(({ field, optional, side }) => ({ kind: "struct" as const, field, optional, side })),
  FastCheck.record({
    before: FastCheck.integer({ min: 0, max: 2 }),
    after: FastCheck.integer({ min: 0, max: 2 }),
  }).map(({ before, after }) => ({ kind: "union" as const, before, after })),
)
const wrappersArbitrary = FastCheck.array(partialWrapperArbitrary, { maxLength: 5 })

const distinctUnionSibling = (label: string, focused: Json): Json => {
  let name = `foldlab.pbt.${label}`
  while (JSON.stringify({ k: "brand", name, of: { k: "opaque" } }) === JSON.stringify(focused)) {
    name += ".next"
  }
  return { k: "brand", name, of: { k: "opaque" } }
}

const wrapFocusedPartial = (
  focused: FocusedPartial,
  wrapper: PartialWrapper,
): FocusedPartial => {
  switch (wrapper.kind) {
    case "list":
      return { partial: { k: "list", of: focused.partial }, path: ["of", ...focused.path] }
    case "brand":
      return {
        partial: { k: "brand", name: wrapper.name, of: focused.partial },
        path: ["of", ...focused.path],
      }
    case "check":
      return {
        partial: {
          k: "check",
          base: focused.partial,
          check: { name: wrapper.name, args: { [wrapper.argKey]: wrapper.arg } },
        },
        path: ["base", ...focused.path],
      }
    case "struct": {
      const fields: Record<string, Json> = { [wrapper.field]: focused.partial }
      if (wrapper.side) fields[`${wrapper.field}\u0000side`] = { k: "string" }
      return {
        partial: {
          k: "struct",
          fields,
          optional: wrapper.optional ? [wrapper.field] : [],
        },
        path: ["fields", wrapper.field, ...focused.path],
      }
    }
    case "union": {
      const before = Array.from(
        { length: wrapper.before },
        (_, index) => distinctUnionSibling(`before.${index}`, focused.partial),
      )
      const after = Array.from(
        { length: wrapper.after },
        (_, index) => distinctUnionSibling(`after.${index}`, focused.partial),
      )
      return {
        partial: { k: "union", of: [...before, focused.partial, ...after] },
        path: ["of", String(before.length), ...focused.path],
      }
    }
  }
}

const focusWithin = (
  focus: Json,
  wrappers: ReadonlyArray<PartialWrapper>,
): FocusedPartial => wrappers.reduce(wrapFocusedPartial, { partial: focus, path: [] })

const hole: Json = { k: "hole" }
const holeCaseArbitrary: FastCheck.Arbitrary<FocusedPartial> = wrappersArbitrary
  .map((wrappers) => focusWithin(hole, wrappers))
const focusedNodeCaseArbitrary: FastCheck.Arbitrary<FocusedPartial> = FastCheck.tuple(
  FastCheck.oneof(FastCheck.constant(hole), decidedLeafArbitrary),
  wrappersArbitrary,
).map(([focus, wrappers]) => focusWithin(focus, wrappers))
const partialTreeArbitrary: FastCheck.Arbitrary<Json> = focusedNodeCaseArbitrary
  .map(({ partial }) => partial)

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
    await FastCheck.assert(
      FastCheck.asyncProperty(holeCaseArbitrary, partialTreeArbitrary, async (generated, subtree) => {
        const first = await client.fillType(generated.partial, [...generated.path], subtree)
        const second = await client.fillType(generated.partial, [...generated.path], subtree)
        expect(first.ok && second.ok).toBe(true)
        expect(JSON.stringify(first)).toBe(JSON.stringify(second))
      }),
      {
        examples: [[{ partial: request.partial, path: request.path }, request.subtree]],
        seed: 0x07c1_0001,
        numRuns: 100,
        endOnFailure: false,
      },
    )
  })

  test("C1 unfill is pure: the same request returns byte-identical data", async () => {
    const request = { partial: { k: "string" } as const, path: [] as string[] }
    await FastCheck.assert(
      FastCheck.asyncProperty(focusedNodeCaseArbitrary, async (generated) => {
        const first = await client.unfillType(generated.partial, [...generated.path])
        const second = await client.unfillType(generated.partial, [...generated.path])
        expect(first.ok && second.ok).toBe(true)
        expect(JSON.stringify(first)).toBe(JSON.stringify(second))
      }),
      {
        examples: [[request]],
        seed: 0x07c1_0001,
        numRuns: 100,
        endOnFailure: false,
      },
    )
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
    const examples: Array<[FocusedPartial, Json]> = cases.flatMap((generated) =>
      subtrees.map((subtree) => [
        { partial: generated.partial, path: generated.path },
        subtree,
      ] as [FocusedPartial, Json]))

    await FastCheck.assert(
      FastCheck.asyncProperty(
        holeCaseArbitrary,
        partialTreeArbitrary,
        async (generated, subtree) => {
          const path = [...generated.path]
          const filled = await client.fillType(generated.partial, path, subtree)
          expect(filled.ok).toBe(true)
          if (!filled.ok) return
          const unfilled = await client.unfillType(asJson(filled.fact.partial), path)
          expect(unfilled.ok).toBe(true)
          if (unfilled.ok) expect(unfilled.fact.partial).toEqual(generated.partial)
        },
      ),
      { examples, seed: 0x07c2_0001, numRuns: 150, endOnFailure: false },
    )
  }, 120_000)

  test("C3 frontier-empty iff zero holes iff type.create accepts", async () => {
    await FastCheck.assert(
      FastCheck.asyncProperty(partialTreeArbitrary, async (partial) => {
        const described = await client.fillType(hole, [], partial)
        expect(described.ok).toBe(true)
        if (!described.ok) return
        const holes = countHoles(described.fact.partial)
        expect(described.fact.frontier.length).toBe(holes)
        const created = await client.createType(asJson(described.fact.partial))
        expect(created.ok).toBe(holes === 0)
      }),
      {
        examples: [
          [hole],
          [{ k: "list", of: hole }],
          [{ k: "list", of: { k: "string" } }],
        ],
        seed: 0x07c3_0001,
        numRuns: 100,
        endOnFailure: false,
      },
    )
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

    await FastCheck.assert(
      FastCheck.asyncProperty(holeCaseArbitrary, async (candidate) => {
        const described = await client.fillType(candidate.partial, [...candidate.path], hole)
        expect(described.ok).toBe(true)
        if (!described.ok) return
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
      }),
      {
        examples: generated.map(({ partial, probePath }) => [
          { partial, path: probePath },
        ] as [FocusedPartial]),
        seed: 0x07c4_0001,
        numRuns: 50,
        endOnFailure: false,
      },
    )
  }, 120_000)

  test("C5 holes never bear identity or enter catalog fixtures", async () => {
    const hole: Json = { k: "hole" }
    const partial: Json = {
      k: "struct",
      fields: { undecided: hole },
      optional: [],
    }
    await FastCheck.assert(
      FastCheck.asyncProperty(holeCaseArbitrary, async (generated) => {
        const refused = await client.createType(generated.partial)
        expect(refused.ok).toBe(false)
        if (!refused.ok) {
          expect(refused.refusal.kind).toBe("invalid-structure")
          expect(refused.refusal.path).toEqual(["structure", ...generated.path])
        }

        for (const derived of [
          toEffectSchema(generated.partial),
          toJsonSchema(generated.partial),
          toGoSource(generated.partial, "Hole", "0".repeat(64)),
        ]) {
          expect(derived.ok).toBe(false)
          if (!derived.ok) {
            expect(derived.refusal.kind).toBe("underivable")
          }
        }
      }),
      {
        examples: [
          [{ partial, path: ["fields", "undecided"] }],
          [{ partial: hole, path: [] }],
        ],
        seed: 0x07c5_0001,
        numRuns: 100,
        endOnFailure: false,
      },
    )

    const catalog = await client.read("catalog")
    expect(catalog.ok).toBe(true)
    if (catalog.ok) {
      for (const entry of catalog.fact.entries) {
        const fact = JSON.parse(entry.payload)
        if (fact.kind === undefined) {
          expect(JSON.stringify(fact.structure)).not.toContain('"k":"hole"')
        }
      }
    }

    for (const name of [
      "types.json",
      "owned-types-v1.json",
      "scheme-bridges.json",
      "chains.json",
      "frames.json",
    ]) {
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
