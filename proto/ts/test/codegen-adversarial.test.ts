import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ProtoClient } from "../src/client.ts"
import {
  toEffectSchema,
  toGoSource,
  toJsonSchema,
  type Derived,
} from "../src/codegen.ts"
import { structureDigest, type Json } from "../src/jcs.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon
let client: ProtoClient

beforeAll(async () => {
  daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  client = connected.fact
}, 120_000)

afterAll(async () => {
  await client?.close()
  await daemon?.stop()
}, 60_000)

const digestOf = (structure: Json): string => {
  const identity = structureDigest(structure)
  if (!identity.ok) throw new Error(identity.refusal.reason)
  return identity.digest
}

const targetDerivations = (structure: Json): ReadonlyArray<readonly [string, () => Derived<unknown>]> => [
  ["effect-schema", () => toEffectSchema(structure)],
  ["json-schema", () => toJsonSchema(structure)],
  ["go", () => toGoSource(structure, "Generated", digestOf(structure))],
]

const deriveWithoutThrowing = (structure: Json): ReadonlyArray<Derived<unknown>> =>
  targetDerivations(structure).map(([name, derive]) => {
    let result: Derived<unknown> | undefined
    expect(() => {
      result = derive()
    }, `${name} threw instead of returning a refusal`).not.toThrow()
    if (result === undefined) throw new Error(`${name} returned no derivation result`)
    return result
  })

const gofmt = (source: string): ReturnType<typeof Bun.spawnSync> => {
  const dir = mkdtempSync(join(tmpdir(), "foldlab-codegen-adversarial-"))
  const file = join(dir, "derived.go")
  try {
    writeFileSync(file, source)
    return Bun.spawnSync(["gofmt", "-e", file])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

interface ObservedGoField {
  readonly goName: string
  readonly jsonName: string
}

const observeGoFields = (source: string): ReadonlyArray<ObservedGoField> => {
  const dir = mkdtempSync(join(tmpdir(), "foldlab-go-field-oracle-"))
  const file = join(dir, "derived.go")
  try {
    writeFileSync(file, source)
    const oracle = join(import.meta.dir, "../testdata/go-field-oracle.go")
    const observed = Bun.spawnSync(["go", "run", oracle, "--", file])
    expect(observed.exitCode, observed.stderr.toString()).toBe(0)
    return JSON.parse(observed.stdout.toString()) as ReadonlyArray<ObservedGoField>
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("codegen boundaries remain total by refusal", () => {
  test("an invalid pattern returns one uniform local refusal from every target", async () => {
    const structure: Json = {
      k: "check",
      base: { k: "string" },
      check: { name: "pattern", args: { source: "(" } },
    }
    const created = await client.createType(structure)
    expect(created.ok, created.ok ? undefined : JSON.stringify(created.refusal)).toBe(true)

    const results = deriveWithoutThrowing(structure)
    const refusals = results.map((result) => {
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("invalid pattern derived")
      return result.refusal
    })
    expect(new Set(refusals.map((refusal) => JSON.stringify(refusal))).size).toBe(1)
    expect(refusals[0]).toMatchObject({
      kind: "underivable",
      path: ["structure", "check", "args", "source"],
      got: "(",
      local: true,
    })
  }, 120_000)

  test("a non-array optional value returns one uniform local refusal from every target", async () => {
    const structure: Json = {
      k: "struct",
      fields: { a: { k: "string" } },
      optional: "a",
    }
    const created = await client.createType(structure)
    // #55's optional-admission premise is stale on the required 9d26415
    // base: the daemon already refuses this metadata. The raw public codegen
    // boundary remains total in case untrusted/cached JSON reaches it directly.
    expect(created.ok).toBe(false)
    if (created.ok) throw new Error("daemon admitted non-array optional metadata")
    expect(created.refusal).toMatchObject({
      kind: "invalid-structure",
      path: ["structure", "optional"],
      local: false,
    })

    const results = deriveWithoutThrowing(structure)
    const refusals = results.map((result) => {
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("non-array optional metadata derived")
      return result.refusal
    })
    expect(new Set(refusals.map((refusal) => JSON.stringify(refusal))).size).toBe(1)
    expect(refusals[0]).toMatchObject({
      kind: "underivable",
      path: ["structure", "optional"],
      got: "a",
      local: true,
    })
  }, 120_000)
})

describe("Go composite derivation preserves complete nested types", () => {
  test("a struct field whose type is another struct parses as Go", () => {
    const structure: Json = {
      k: "struct",
      fields: {
        outer: {
          k: "struct",
          fields: { inner: { k: "null" } },
          optional: [],
        },
      },
      optional: [],
    }
    const derived = toGoSource(structure, "Nested", digestOf(structure))
    expect(derived.ok).toBe(true)
    if (!derived.ok) throw new Error(JSON.stringify(derived.refusal))

    const parsed = gofmt(derived.value)
    expect(parsed.exitCode, parsed.stderr?.toString()).toBe(0)
  })

  test("a list whose element type is a struct parses as Go", () => {
    const structure: Json = {
      k: "list",
      of: {
        k: "struct",
        fields: { inner: { k: "null" } },
        optional: [],
      },
    }
    const derived = toGoSource(structure, "NestedList", digestOf(structure))
    expect(derived.ok).toBe(true)
    if (!derived.ok) throw new Error(JSON.stringify(derived.refusal))

    const parsed = gofmt(derived.value)
    expect(parsed.exitCode, parsed.stderr?.toString()).toBe(0)
  })
})

describe("Go field names preserve semantic fields", () => {
  test("Unicode, punctuation collisions, and the empty name stay distinct and non-blank", () => {
    // Negative control: Go parses `_`, but the AST oracle exposes that the
    // JSON field became a blank identifier. A gofmt-only gate misses this.
    expect(observeGoFields("package flbtypes\n\ntype Lost struct {\n\t_ string `json:\"é\"`\n}\n"))
      .toEqual([{ goName: "_", jsonName: "é" }])

    const names = ["é", "β", "a-b", "a_b", ""] as const
    const structure: Json = {
      k: "struct",
      fields: Object.fromEntries(names.map((name) => [name, { k: "string" }])),
      optional: [],
    }
    const derived = toGoSource(structure, "Names", digestOf(structure))
    expect(derived.ok).toBe(true)
    if (!derived.ok) throw new Error(JSON.stringify(derived.refusal))

    const observed = observeGoFields(derived.value)
    expect(new Set(observed.map((field) => field.jsonName))).toEqual(new Set(names))
    expect(observed.every((field) => field.goName !== "" && field.goName !== "_")).toBe(true)
    expect(new Set(observed.map((field) => field.goName)).size).toBe(names.length)
  })
})
