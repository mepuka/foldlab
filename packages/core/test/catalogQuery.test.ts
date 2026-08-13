import { describe, expect, test } from "bun:test"
import { algebras, steps, type FoldState } from "../src/algebra.ts"
import { defineFold } from "../src/fold.ts"
import { event, type StreamEvent } from "../src/stream.ts"

const digest = (digit: string): string => digit.repeat(64)
const catalogEvent = (seq: number, value: FoldState, id = digest(String(seq + 1))): StreamEvent =>
  event("catalog", seq, JSON.stringify({
    digest: id,
    scheme: "bytes-sha256-v1",
    structure: value,
    submitter: "catalog-query-test",
  }))

describe("the declared catalog query fold", () => {
  test("structureMatches carries the pattern as canonical declaration data", () => {
    const pattern: { k: string; of: FoldState } = { k: "list", of: { k: "hole" } }
    const step = steps.structureMatches(pattern)
    const before = step.declaration?.digest
    pattern.of = { k: "int" }

    expect(step.declaration?.spec).toEqual({
      v: "foldlab.step.v1",
      op: "structureMatches",
      pattern: { k: "list", of: { k: "hole" } },
    })
    expect(step.declaration?.digest).toBe(before)
    expect(step.apply(catalogEvent(0, { k: "list", of: { k: "string" } })))
      .toEqual([digest("1")])
  })

  test("an encodable value outside the partial grammar cannot name a query", () => {
    const invalid = steps.structureMatches({ k: "wat" })
    expect(invalid.declaration).toBeUndefined()
    expect(invalid.identityIssue).toContain("not a well-formed flb.type.v0 partial")
    expect(invalid.apply(catalogEvent(0, { k: "string" }))).toEqual([])
  })

  test("the grammar co-walk uses holes as the only wildcard", () => {
    const pattern: FoldState = {
      k: "struct",
      fields: {
        id: { k: "brand", name: "Id", of: { k: "hole" } },
        state: {
          k: "union",
          of: [{ k: "literal", value: "on" }, { k: "hole" }],
        },
      },
      optional: ["state"],
    }
    const matches = steps.structureMatches(pattern)
    const accepted: FoldState = {
      k: "struct",
      fields: {
        id: { k: "brand", name: "Id", of: { k: "string" } },
        state: {
          // Union matching is unordered; the wildcard cannot steal the member
          // required by the decided literal.
          k: "union",
          of: [{ k: "bool" }, { k: "literal", value: "on" }],
        },
      },
      optional: ["state"],
    }
    const wrongBrand: FoldState = {
      ...accepted,
      fields: {
        ...(accepted as { fields: Record<string, FoldState> }).fields,
        id: { k: "brand", name: "OtherId", of: { k: "string" } },
      },
    }
    expect(matches.apply(catalogEvent(0, accepted))).toEqual([digest("1")])
    expect(matches.apply(catalogEvent(1, wrongBrand))).toEqual([])
    expect(steps.structureMatches({ k: "struct", fields: { value: { k: "hole" } } }).apply(
      catalogEvent(2, { k: "struct", fields: { value: { k: "int" } } }, digest("3")),
    )).toEqual([digest("3")])
    expect(matches.apply(event("catalog", 2, "not-json"))).toEqual([])
    expect(steps.structureMatches({ k: "hole" }).apply(
      event("catalog", 3, JSON.stringify({ digest: digest("4"), structure: { k: "wat" } })),
    )).toEqual([])
  })

  test("setUnion's generated semilattice claim licenses order and duplicate independence", () => {
    const pattern: FoldState = { k: "list", of: { k: "hole" } }
    const fold = defineFold(algebras.setUnion, steps.structureMatches(pattern))
    const stringList = catalogEvent(0, { k: "list", of: { k: "string" } }, digest("a"))
    const boolList = catalogEvent(1, { k: "list", of: { k: "bool" } }, digest("b"))
    const leaf = catalogEvent(2, { k: "string" }, digest("c"))

    expect(algebras.setUnion.laws).toEqual({ commutative: true, idempotent: true })
    expect(fold.digest).toMatch(/^[0-9a-f]{64}$/)
    expect(fold.fold([stringList, boolList, leaf])).toEqual([digest("a"), digest("b")])
    expect(fold.fold([boolList, stringList, boolList])).toEqual([digest("a"), digest("b")])
  })

  test("negative control: an omitted matching row is detected by exact-set comparison", () => {
    const fold = defineFold(algebras.setUnion, steps.structureMatches({ k: "hole" }))
    const history = [
      catalogEvent(0, { k: "string" }, digest("a")),
      catalogEvent(1, { k: "bool" }, digest("b")),
    ]
    const honest = fold.fold(history)
    const incomplete = honest.slice(1)
    expect(incomplete).not.toEqual(honest)
  })
})
