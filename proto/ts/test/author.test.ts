// The author fold: Effect Schema → flb.type.v0, partial, refusing
// beyond v0 with the uniform refusal shape (as data, marked local).
import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { foldSchema, ref } from "../src/author.ts"
import { structureDigest } from "../src/jcs.ts"

describe("author fold maps the v0 slice", () => {
  test("leaves", () => {
    expect(foldSchema(Schema.String)).toMatchObject({ ok: true, structure: { k: "string" } })
    expect(foldSchema(Schema.Boolean)).toMatchObject({ ok: true, structure: { k: "bool" } })
    expect(foldSchema(Schema.Int)).toMatchObject({ ok: true, structure: { k: "int" } })
    expect(foldSchema(Schema.Null)).toMatchObject({ ok: true, structure: { k: "null" } })
    expect(foldSchema(Schema.Unknown)).toMatchObject({ ok: true, structure: { k: "opaque" } })
    expect(foldSchema(Schema.Literal("on"))).toMatchObject({
      ok: true,
      structure: { k: "literal", value: "on" },
    })
  })

  test("a realistic sensor schema folds to the fixture shape", () => {
    const Sensor = Schema.Struct({
      id: Schema.String.pipe(Schema.brand("SensorId")),
      reading: Schema.Unknown,
      count: Schema.Int,
      mode: Schema.Union([Schema.Literal("on"), Schema.Literal("off")]),
      note: Schema.optionalKey(Schema.String),
    })
    const folded = foldSchema(Sensor)
    expect(folded.ok).toBe(true)
    if (!folded.ok) return
    expect(folded.structure).toEqual({
      k: "struct",
      fields: {
        id: { k: "brand", name: "SensorId", of: { k: "string" } },
        reading: { k: "opaque" },
        count: { k: "int" },
        mode: {
          k: "union",
          of: [
            { k: "literal", value: "off" },
            { k: "literal", value: "on" },
          ],
        },
        note: { k: "string" },
      },
      optional: ["note"],
    })
    const identity = structureDigest(folded.structure)
    expect(identity.ok).toBe(true)
    if (identity.ok) expect(folded.digest).toBe(identity.digest)
  })

  test("declared checks enter identity through the owned name table", () => {
    const folded = foldSchema(Schema.String.check(Schema.isMinLength(1)))
    expect(folded).toMatchObject({
      ok: true,
      structure: {
        k: "check",
        base: { k: "string" },
        check: { name: "minLength", args: { min: 1 } },
      },
    })
  })

  test("brands stack outermost-last", () => {
    const folded = foldSchema(Schema.String.pipe(Schema.brand("A"), Schema.brand("B")))
    expect(folded).toMatchObject({
      ok: true,
      structure: { k: "brand", name: "B", of: { k: "brand", name: "A", of: { k: "string" } } },
    })
  })

  test("two schemas that differ only in formatting of authorship fold to one digest", () => {
    const a = foldSchema(Schema.Struct({ x: Schema.Int, y: Schema.String }))
    const b = foldSchema(Schema.Struct({ y: Schema.String, x: Schema.Int }))
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.digest).toBe(b.digest)
  })

  test("union member order never moves identity", () => {
    const a = foldSchema(Schema.Union([Schema.String, Schema.Null]))
    const b = foldSchema(Schema.Union([Schema.Null, Schema.String]))
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.structure).toEqual({ k: "union", of: [{ k: "null" }, { k: "string" }] })
      expect(a.digest).toBe(b.digest)
    }
  })

  test("duplicate union members refuse after canonical-byte sorting", () => {
    const folded = foldSchema(Schema.Union([Schema.String, Schema.String]))
    expect(folded.ok).toBe(false)
    if (folded.ok) return
    expect(folded.refusal.kind).toBe("invalid-structure")
    expect(folded.refusal.path).toEqual(["structure", "of", "1"])
  })

  test("a ref is a Declaration whose identifier is the digest", () => {
    const digest = "a".repeat(64)
    const schema = ref(digest, Schema.String)
    expect(schema.ast._tag).toBe("Declaration")
    expect(schema.ast.annotations?.identifier).toBe(digest)
    expect(foldSchema(schema)).toMatchObject({
      ok: true,
      structure: { k: "ref", digest },
    })
  })

  test("a schema literal outside the Unicode scalar domain refuses identity as data", () => {
    const folded = foldSchema(Schema.Literal("\ud800"))
    expect(folded.ok).toBe(false)
    if (folded.ok) throw new Error(`lone-surrogate literal minted ${folded.digest}`)
    expect(folded.refusal).toMatchObject({
      kind: "invalid-structure",
      local: true,
    })
    expect(folded.refusal.law).toContain("not valid Unicode")
  })
})

describe("beyond v0 refuses as data with the uniform shape", () => {
  const refusalShape = (folded: ReturnType<typeof foldSchema>) => {
    expect(folded.ok).toBe(false)
    if (folded.ok) throw new Error("unreachable")
    const refusal = folded.refusal
    expect(refusal.kind).toBe("beyond-v0")
    expect(refusal.law).toContain("flb.type.v0")
    expect(refusal.local).toBe(true)
    expect(Array.isArray(refusal.path)).toBe(true)
    return refusal
  }

  test("transformations (encoding links)", () => {
    refusalShape(foldSchema(Schema.FiniteFromString))
  })

  test("non-integer number schemas have no v0 leaf", () => {
    const refusal = refusalShape(foldSchema(Schema.Number))
    expect(refusal.path).toEqual(["structure"])
    expect(refusal.law).toContain("non-integer numbers have no v0 leaf")
  })

  // The Go certifier's integrality bound, mirrored: these are the exact
  // values that minted lawfully before the narrowing, and 5e-324 / 1e21 /
  // 1e-7 are ES2019 shortest-round-trip renderings.
  test.each([5e-324, 0.1, 1e21, 1e-7, -0.5, Number.MAX_VALUE, 2 ** 53])(
    "a non-integer literal %p has no v0 form",
    (value) => {
      const refusal = refusalShape(foldSchema(Schema.Literal(value)))
      expect(refusal.law).toContain("a literal number is integral")
      expect(refusal.got).toBe(String(value))
    },
  )

  test("integral literals inside the safe range still fold", () => {
    for (const value of [0, -1, 10, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]) {
      expect(foldSchema(Schema.Literal(value))).toMatchObject({
        ok: true,
        structure: { k: "literal", value },
      })
    }
  })

  test("records (index signatures)", () => {
    refusalShape(foldSchema(Schema.Record(Schema.String, Schema.Int)))
  })

  test("tuples", () => {
    refusalShape(foldSchema(Schema.Tuple([Schema.String, Schema.Int])))
  })

  test("anonymous checks have no canonical form", () => {
    const anonymous = Schema.String.check(Schema.makeFilter((s: string) => s.length > 0))
    const refusal = refusalShape(foldSchema(anonymous))
    expect(refusal.law).toContain("cannot claim identity")
  })

  test("suspend (recursion) is not in v0", () => {
    interface Tree {
      readonly children: ReadonlyArray<Tree>
    }
    const Tree = Schema.Struct({
      children: Schema.Array(Schema.suspend((): Schema.Codec<Tree> => Tree)),
    })
    refusalShape(foldSchema(Tree))
  })

  test("the refusal path locates the offending node", () => {
    const folded = foldSchema(
      Schema.Struct({ good: Schema.String, bad: Schema.Struct({ inner: Schema.Symbol }) }),
    )
    expect(folded.ok).toBe(false)
    if (folded.ok) return
    expect(folded.refusal.path).toEqual(["structure", "fields", "bad", "fields", "inner"])
  })
})
