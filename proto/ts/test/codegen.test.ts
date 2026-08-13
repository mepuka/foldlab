// Codegen laws. The load-bearing one is the round-trip wall: for every
// frozen fixture structure, derive an Effect Schema, re-fold it through
// the author fold, and land on the SAME digest the Go side pinned. The
// wall certifies its corpus (ADR-0007): the fixture set.
import { describe, expect, test } from "bun:test"
import { FastCheck } from "effect/testing"
import { foldSchema } from "../src/author.ts"
import {
  toEffectSchema,
  toGoSource,
  toJsonSchema,
  type Derived,
  type Resolve,
} from "../src/codegen.ts"
import type { Json } from "../src/jcs.ts"

const vectors: Array<{ name: string; structure: Json; canonical: string; digest: string }> = (
  await import("../../wire/fixtures/types.json", { with: { type: "json" } })
).default

// Refs resolve inside the fixture corpus itself: digest → structure.
const resolve: Resolve = (digest) => vectors.find((v) => v.digest === digest)?.structure

interface DerivationTarget {
  readonly name: string
  readonly derive: (structure: Json) => Derived<unknown>
}

const derivationTargets: ReadonlyArray<DerivationTarget> = [
  { name: "effect-schema", derive: (structure) => toEffectSchema(structure, resolve) },
  { name: "json-schema", derive: toJsonSchema },
  {
    name: "go",
    derive: (structure) => toGoSource(structure, "Generated", "0".repeat(64)),
  },
]

const decidedLeafArbitrary: FastCheck.Arbitrary<Json> = FastCheck.oneof(
  FastCheck.constantFrom<Json>(
    { k: "string" },
    { k: "bool" },
    { k: "int" },
    { k: "float" },
    { k: "null" },
    { k: "opaque" },
    { k: "literal", value: null },
    { k: "literal", value: false },
    { k: "literal", value: Number.MAX_SAFE_INTEGER },
    { k: "ref", digest: vectors[0]!.digest },
  ),
  FastCheck.string({ maxLength: 16 }).map((value): Json => ({ k: "literal", value })),
)
const leafArbitrary: FastCheck.Arbitrary<Json> = FastCheck.oneof(
  FastCheck.constant<Json>({ k: "hole" }),
  decidedLeafArbitrary,
)
const fieldNameArbitrary = FastCheck.constantFrom("a", "z", "type", "9lead", "β", "𐀀")
const brandNameArbitrary = FastCheck.constantFrom("Value", "βBrand", "𐀀Brand")

type StructureArbitraries = {
  structure: Json
  recursive: Json
}

const structureArbitrary = FastCheck.letrec<StructureArbitraries>((tie) => ({
  structure: FastCheck.oneof(
    { depthSize: "small" },
    leafArbitrary,
    tie("recursive"),
  ),
  recursive: FastCheck.oneof(
    tie("structure").map((of): Json => ({ k: "list", of })),
    FastCheck.tuple(brandNameArbitrary, tie("structure"))
      .map(([name, of]): Json => ({ k: "brand", name, of })),
    tie("structure").map((base): Json => ({
      k: "check",
      base,
      check: { name: "minLength", args: { min: 0 } },
    })),
    FastCheck.tuple(
      fieldNameArbitrary,
      tie("structure"),
      fieldNameArbitrary,
      tie("structure"),
      FastCheck.boolean(),
      FastCheck.boolean(),
    ).map(([leftName, left, proposedRightName, right, reverse, optional]): Json => {
      const rightName = proposedRightName === leftName ? `${proposedRightName}_2` : proposedRightName
      const entries: Array<readonly [string, Json]> = reverse
        ? [[rightName, right], [leftName, left]]
        : [[leftName, left], [rightName, right]]
      return {
        k: "struct",
        fields: Object.fromEntries(entries),
        optional: optional ? [leftName] : [],
      }
    }),
    FastCheck.array(tie("structure"), { minLength: 1, maxLength: 3 })
      .map((of): Json => ({ k: "union", of })),
  ),
})).structure

const makeCrossTargetDerivabilityLaw = (
  targets: ReadonlyArray<DerivationTarget>,
): FastCheck.IPropertyWithHooks<[structure: Json]> =>
  FastCheck.property(structureArbitrary, (structure) => {
    const results = targets.map((target) => ({ target, result: target.derive(structure) }))
    for (let leftIndex = 0; leftIndex < results.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < results.length; rightIndex++) {
        const left = results[leftIndex]!
        const right = results[rightIndex]!
        if (left.result.ok !== right.result.ok) {
          throw new Error(`${left.target.name} and ${right.target.name} disagree on derivability`)
        }
        if (!left.result.ok && !right.result.ok) {
          const leftPath = JSON.stringify(left.result.refusal.path)
          const rightPath = JSON.stringify(right.result.refusal.path)
          if (leftPath !== rightPath) {
            throw new Error(
              `${left.target.name} refused at ${leftPath}; ${right.target.name} refused at ${rightPath}`,
            )
          }
        }
      }
    }
  })

describe("the round-trip wall: derive → compile → re-fold → same digest", () => {
  for (const vector of vectors) {
    test(vector.name, () => {
      const derived = toEffectSchema(vector.structure, resolve)
      expect(derived.ok).toBe(true)
      if (!derived.ok) return
      const refolded = foldSchema(derived.value)
      expect(refolded.ok).toBe(true)
      if (!refolded.ok) return
      expect(refolded.canonical).toBe(vector.canonical)
      expect(refolded.digest).toBe(vector.digest)
    })
  }
})

describe("cross-target codegen laws", () => {
  test("CROSS-TARGET DERIVABILITY CONSISTENCY", () => {
    FastCheck.assert(makeCrossTargetDerivabilityLaw(derivationTargets), {
      examples: [[{ k: "union", of: [{ k: "hole" }] }]],
      seed: 0x14d4_6001,
      numRuns: 1_000,
      endOnFailure: false,
    })
  })
})

describe("json-schema target", () => {
  test("sensor-reading renders draft-2020-12 shapes", () => {
    const sensor = vectors.find((v) => v.name === "sensor-reading")!
    const derived = toJsonSchema(sensor.structure)
    expect(derived.ok).toBe(true)
    if (!derived.ok) return
    expect(derived.value).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        celsius: { type: "number" },
        count: { type: "integer" },
        id: { type: "string", "x-flb-brand": "SensorId" },
        mode: { anyOf: [{ const: "off" }, { const: "on" }] },
        note: { type: "string" },
      },
    })
    expect(derived.value["required"]).toEqual(["celsius", "count", "id", "mode"])
  })

  test("checks land as constraints; the opaque node renders permissively", () => {
    const check = vectors.find((v) => v.name === "check-min-length")!
    const derived = toJsonSchema(check.structure)
    expect(derived).toMatchObject({ ok: true, value: { type: "string", minLength: 1 } })

    const opaque = toJsonSchema({ k: "opaque" })
    expect(opaque).toMatchObject({ ok: true, value: {} })
  })

  test("derivation failure is a refusal value, not a throw", () => {
    const derived = toJsonSchema({ k: "wat" })
    expect(derived.ok).toBe(false)
    if (derived.ok) return
    expect(derived.refusal.kind).toBe("underivable")
    expect(derived.refusal.local).toBe(true)
  })
})

describe("go target", () => {
  test("D46: a hole nested under a union refuses identically in every target", () => {
    const structure: Json = { k: "union", of: [{ k: "hole" }] }
    const results = [
      toEffectSchema(structure),
      toJsonSchema(structure),
      toGoSource(structure, "Hole", "0".repeat(64)),
    ]
    const refusals = results.map((result) => {
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("a hole-bearing structure derived")
      return result.refusal
    })

    expect(new Set(refusals.map((refusal) => JSON.stringify(refusal))).size).toBe(1)
    expect(refusals[0]).toEqual({
      kind: "underivable",
      law: "codegen cannot derive this structure: holes are authoring-only and never derive from catalog data",
      path: ["structure", "of", "0", "k"],
      got: "hole",
      next: [],
      local: true,
    })
  })

  test("every fixture structure derives Go source that gofmt re-parses", async () => {
    const pieces: string[] = []
    for (const vector of vectors) {
      const derived = toGoSource(vector.structure, vector.name.replace(/-/g, "_"), vector.digest)
      expect(derived.ok).toBe(true)
      if (derived.ok) pieces.push(derived.value)
    }
    // One file, one package clause: re-parseability is the bullet's
    // verification for this target (the codec wall is future work).
    const source = pieces
      .map((piece, index) => (index === 0 ? piece : piece.split("\n").filter((l) => l !== "package flbtypes").join("\n")))
      .join("\n")
    const dir = `${process.env["TEMP"] ?? "/tmp"}/flb-go-target-${process.pid}`
    const { mkdirSync, writeFileSync, rmSync } = await import("node:fs")
    mkdirSync(dir, { recursive: true })
    const file = `${dir}/derived.go`
    writeFileSync(file, source)
    const proc = Bun.spawnSync(["gofmt", "-e", file])
    rmSync(dir, { recursive: true, force: true })
    expect(proc.exitCode).toBe(0)
    expect(proc.stdout.toString().length).toBeGreaterThan(0)
  })
})
