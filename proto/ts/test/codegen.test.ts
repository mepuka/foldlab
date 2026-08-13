// Codegen laws. The load-bearing one is the round-trip wall: for every
// frozen fixture structure, derive an Effect Schema, re-fold it through
// the author fold, and land on the SAME digest the Go side pinned. The
// wall certifies its corpus (ADR-0007): the fixture set.
import { describe, expect, test } from "bun:test"
import { foldSchema } from "../src/author.ts"
import { toEffectSchema, toGoSource, toJsonSchema, type Resolve } from "../src/codegen.ts"
import type { Json } from "../src/jcs.ts"

const vectors: Array<{ name: string; structure: Json; canonical: string; digest: string }> = (
  await import("../../wire/fixtures/types.json", { with: { type: "json" } })
).default

// Refs resolve inside the fixture corpus itself: digest → structure.
const resolve: Resolve = (digest) => vectors.find((v) => v.digest === digest)?.structure

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
        mode: { anyOf: [{ const: "on" }, { const: "off" }] },
        note: { type: "string" },
      },
    })
    expect(derived.value["required"]).toEqual(["celsius", "count", "id", "mode"])
  })

  test("checks land as constraints; the opaque brand renders permissively", () => {
    const check = vectors.find((v) => v.name === "check-min-length")!
    const derived = toJsonSchema(check.structure)
    expect(derived).toMatchObject({ ok: true, value: { type: "string", minLength: 1 } })

    const opaque = toJsonSchema({ k: "brand", name: "flb.v0.opaque", of: { k: "struct", fields: {}, optional: [] } })
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
