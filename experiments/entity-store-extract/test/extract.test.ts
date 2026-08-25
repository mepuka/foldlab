/*
 * Extractor gate tests — staged, pre-grade.
 *
 * The extractor is the one trusted component (KICKOFF §12), so these tests are its
 * self-checks made executable: pin verification, the four-way enumeration agreement,
 * the 23-tag count trap, and byte-identical determinism across runs.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"
import {
  crossCheck,
  emit,
  enumGuardTags,
  enumUnionAlias,
  extract,
  gitBlobSha1,
  PIN
} from "../src/extract.ts"

const SRC = new URL("../../../.staging/e2/src-cache", import.meta.url).pathname

describe("pin verification", () => {
  test("SchemaAST.ts and SchemaRepresentation.ts match the lock's git blobs", () => {
    for (const [file, want] of Object.entries(PIN.files)) {
      const got = gitBlobSha1(readFileSync(join(SRC, file)))
      expect(got).toBe(want)
    }
  })

  test("extract refuses tampered bytes", () => {
    // A copy with one byte flipped must be rejected loudly, not extracted.
    const tmp = join(import.meta.dir, "..", ".tmp-tamper")
    const { mkdirSync, writeFileSync, cpSync } = require("node:fs")
    mkdirSync(tmp, { recursive: true })
    cpSync(join(SRC, "SchemaRepresentation.ts"), join(tmp, "SchemaRepresentation.ts"))
    const text = readFileSync(join(SRC, "SchemaAST.ts"), "utf8")
    writeFileSync(join(tmp, "SchemaAST.ts"), text.replace("export type AST =", "export type AST  ="))
    expect(() => extract(tmp)).toThrow(/pin-mismatch/)
  })
})

describe("enumerations and cross-checks", () => {
  const { inventory, report } = extract(SRC) as { inventory: any; report: any }

  test("all four enumerations agree: 21 / 21 / 22 / 22, zero failures", () => {
    expect(report.failures).toEqual([])
    expect(report.unionAliasCount).toBe(21)
    expect(report.guardTagCount).toBe(21)
    expect(report.classCount).toBe(21)
    expect(report.representationUnionCount).toBe(22)
    expect(report.runtimeArrayCount).toBe(22)
  })

  test("the 23-tag count trap: Filter and FilterGroup carry _tags but are not variants", () => {
    const text = readFileSync(join(SRC, "SchemaAST.ts"), "utf8")
    const sf = ts.createSourceFile("SchemaAST.ts", text, ts.ScriptTarget.ES2022, true)
    let tagCount = 0
    const walk = (n: ts.Node): void => {
      if (
        ts.isPropertyDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === "_tag" &&
        n.initializer !== undefined &&
        ts.isStringLiteral(n.initializer)
      ) {
        tagCount++
      }
      n.forEachChild(walk)
    }
    walk(sf)
    expect(tagCount).toBe(23) // 21 variants + Filter + FilterGroup
    const variantNames = (inventory.variants as Array<any>).map((v) => v.variant)
    expect(variantNames).not.toContain("Filter")
    expect(variantNames).not.toContain("FilterGroup")
  })

  test("closure-bearing marking covers every escape hatch the census names", () => {
    const byName = Object.fromEntries(
      (inventory.variants as Array<any>).map((v) => [v.variant, v])
    )
    const field = (v: string, f: string) => byName[v].fields.find((x: any) => x.name === f)
    expect(field("Suspend", "thunk").kind).toBe("closure")
    expect(field("Declaration", "run").kind).toBe("closure-bearing")
    const base = Object.fromEntries((inventory.baseFields as Array<any>).map((f) => [f.name, f]))
    expect(base["encoding"].kind).toBe("closure-bearing")
    expect(base["checks"].kind).toBe("closure-bearing")
    expect(base["annotations"].kind).toBe("closure-bearing") // open bag, holds functions
    expect(field("TemplateLiteral", "encodedParts").kind).toBe("derived-cache")
  })

  test("a synthetic drifted enumeration fails the cross-check loudly", () => {
    const union = enumUnionAlias(
      ts.createSourceFile(
        "x.ts",
        "export type AST = | A | B",
        ts.ScriptTarget.ES2022,
        true
      )
    )
    const r = crossCheck(union, [], [], [], [])
    expect(r.failures.length).toBeGreaterThan(0)
  })
})

describe("determinism", () => {
  test("two extractions emit byte-identical inventories", () => {
    const a = emit(extract(SRC).inventory)
    const b = emit(extract(SRC).inventory)
    expect(a).toBe(b)
  })

  test("emitted bytes are LF-only, no timestamps, no host paths", () => {
    const text = emit(extract(SRC).inventory)
    expect(text.includes("\r")).toBe(false)
    expect(text.endsWith("\n")).toBe(true)
    expect(/20\d\d-\d\d-\d\dT/.test(text)).toBe(false) // no ISO timestamps
    expect(text.includes("/Users/")).toBe(false)
    expect(text.includes("\\\\")).toBe(false)
  })

  test("committed inventory.json matches a fresh extraction (drift gate shape)", () => {
    const committed = readFileSync(join(import.meta.dir, "..", "inventory.json"), "utf8")
    expect(committed).toBe(emit(extract(SRC).inventory))
  })
})
