/*
 * The oxc leg's suite — the 100% claim, and the agreement that makes it worth having.
 *
 * Two things are under test and they are not the same thing:
 *
 *   READABILITY — all six pinned rc.111 files parse with zero errors. This is the claim
 *   the lane was blocked on, because `Schema.ts` and `SchemaTransformation.ts` are
 *   unreadable to the tree-sitter twin at every pin currently reachable.
 *
 *   FIDELITY — reading them is worthless if this instrument reads them DIFFERENTLY. So
 *   the oxc inventory is byte-compared twice: against the committed `inventory.json`,
 *   and against a live extraction by the TypeScript compiler API leg. The second is the
 *   offline differential — the tsc leg is not on the hot path and is imported only here.
 *
 * Runner: vitest, per the estate's configured runner. `bun run test` / `bun x vitest
 * run`, never bare `bun test` (which would pick up the OTHER suite in this directory).
 */

import { describe, expect, it } from "vitest"
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  emit,
  gitBlobSha1,
  normalizeInstrument,
  PIN,
  resolveSrcDir,
  SURFACE_FILES,
  SURFACE_PINS
} from "../src/contract.ts"
import { extract } from "../src/extract.ts"
import { extractOxc, INSTRUMENT, parseVerified, surveyFile, surveySurface } from "../src/oxc-extract.ts"
import { collect, match, PATTERNS, topLevel } from "../src/oxc-patterns.ts"
import { runGates } from "../src/oxc-check.ts"

const LANE = new URL("..", import.meta.url).pathname
const SRC = resolveSrcDir(LANE)

describe("the surface is six files and this instrument reads all six", () => {
  it("every pinned file matches its recorded git blob", () => {
    for (const file of SURFACE_FILES) {
      expect(gitBlobSha1(readFileSync(join(SRC, file)))).toBe(SURFACE_PINS[file])
    }
  })

  it("the surface pins cover the inventory's own pins with equal digests", () => {
    for (const [file, sha] of Object.entries(PIN.files)) {
      expect(SURFACE_PINS[file as keyof typeof SURFACE_PINS]).toBe(sha)
    }
  })

  it("all six parse with ZERO errors — the claim", () => {
    const errors = SURFACE_FILES.map((f) => [f, parseVerified(SRC, f).errors] as const)
    expect(errors.map(([f, e]) => `${f}:${e.length}`)).toEqual([
      "JsonSchema.ts:0",
      "Schema.ts:0",
      "SchemaAST.ts:0",
      "SchemaParser.ts:0",
      "SchemaRepresentation.ts:0",
      "SchemaTransformation.ts:0"
    ])
  })

  it("refuses tampered bytes before parsing them", () => {
    const tmp = mkdtempSync(join(tmpdir(), "e2-oxc-tamper-"))
    mkdirSync(tmp, { recursive: true })
    cpSync(join(SRC, "SchemaRepresentation.ts"), join(tmp, "SchemaRepresentation.ts"))
    const text = readFileSync(join(SRC, "SchemaAST.ts"), "utf8")
    writeFileSync(join(tmp, "SchemaAST.ts"), text.replace("export type AST =", "export type AST  ="))
    expect(() => extractOxc(tmp)).toThrow(/pin-mismatch/)
  })
})

describe("the five enumerations (census §7)", () => {
  const { inventory, report } = extractOxc(SRC) as { inventory: any; report: any }

  it("A-E agree: 21 / 21 / 21 / 22 / 22, zero failures", () => {
    expect(report.failures).toEqual([])
    expect(report.unionAliasCount).toBe(21)
    expect(report.guardTagCount).toBe(21)
    expect(report.classCount).toBe(21)
    expect(report.representationUnionCount).toBe(22)
    expect(report.runtimeArrayCount).toBe(22)
  })

  it("the 23-tag count trap holds on this leg too", () => {
    const ast = parseVerified(SRC, "SchemaAST.ts")
    const tagged = collect(ast.program, PATTERNS.classProperty).filter(
      (m) => (m["key"] as { name: string }).name === "_tag" && m["value"] !== null && m["value"] !== undefined
    )
    expect(tagged.length).toBe(23) // 21 variants + Filter + FilterGroup
    const names = (inventory.variants as Array<any>).map((v) => v.variant)
    expect(names).not.toContain("Filter")
    expect(names).not.toContain("FilterGroup")
  })

  it("closure marking covers every escape hatch the census names", () => {
    const byName = Object.fromEntries((inventory.variants as Array<any>).map((v) => [v.variant, v]))
    const field = (v: string, f: string) => byName[v].fields.find((x: any) => x.name === f)
    expect(field("Suspend", "thunk").kind).toBe("closure")
    expect(field("Declaration", "run").kind).toBe("closure-bearing")
    expect(field("TemplateLiteral", "encodedParts").kind).toBe("derived-cache")
    const base = Object.fromEntries((inventory.baseFields as Array<any>).map((f) => [f.name, f]))
    expect(base["encoding"].kind).toBe("closure-bearing")
    expect(base["checks"].kind).toBe("closure-bearing")
    expect(base["annotations"].kind).toBe("closure-bearing")
  })

  it("declares its own instrument identity, never the other leg's", () => {
    expect(inventory.extractor.instrument).toBe("oxc-parser")
    expect(inventory.extractor.instrument).not.toBe("typescript-compiler-api")
    expect(inventory.extractor.instrumentVersion).toBe(INSTRUMENT.instrumentVersion)
    expect(inventory.extractor.instrumentVersion).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe("cross-instrument agreement", () => {
  it("is byte-identical to the committed inventory, normalizing only the instrument fields", () => {
    const ours = emit(extractOxc(SRC).inventory)
    const committed = readFileSync(join(LANE, "inventory.json"), "utf8")
    expect(normalizeInstrument(ours)).toBe(normalizeInstrument(committed))
  })

  it("is byte-identical to a LIVE compiler-API extraction (the offline differential)", () => {
    const oxc = emit(extractOxc(SRC).inventory)
    const tsc = emit(extract(SRC).inventory)
    expect(normalizeInstrument(oxc)).toBe(normalizeInstrument(tsc))
  })

  it("the two legs are not the same code path", () => {
    // A leg that copied the other's declared identity would impersonate it, which is
    // exactly what the normalization above would then hide.
    const oxc = JSON.parse(emit(extractOxc(SRC).inventory))
    const tsc = JSON.parse(emit(extract(SRC).inventory))
    expect(oxc.extractor.instrument).not.toBe(tsc.extractor.instrument)
    expect(oxc.extractor.instrumentVersion).not.toBe(tsc.extractor.instrumentVersion)
  })
})

describe("determinism", () => {
  it("two extractions emit byte-identical inventories", () => {
    expect(emit(extractOxc(SRC).inventory)).toBe(emit(extractOxc(SRC).inventory))
  })

  it("emitted bytes are LF-only, no timestamps, no host paths", () => {
    for (const text of [emit(extractOxc(SRC).inventory), emit(surveySurface(SRC))]) {
      expect(text.includes("\r")).toBe(false)
      expect(text.endsWith("\n")).toBe(true)
      expect(/20\d\d-\d\d-\d\dT/.test(text)).toBe(false)
      expect(text.includes("/Users/")).toBe(false)
    }
  })

  it("two surveys emit byte-identical censuses", () => {
    expect(emit(surveySurface(SRC))).toBe(emit(surveySurface(SRC)))
  })
})

describe("newly readable — the declarations the tree-sitter twin never saw", () => {
  const survey = surveySurface(SRC) as any
  const site = (file: string, name: string) =>
    survey.files
      .find((f: any) => f.file === file)
      .varianceSites.find((v: any) => v.declaration === name)

  it("SchemaTransformation.ts: both variance-annotated classes, at the lines D1 names", () => {
    expect(site("SchemaTransformation.ts", "Middleware")).toMatchObject({ declLine: 71 })
    expect(site("SchemaTransformation.ts", "Transformation")).toMatchObject({ declLine: 143 })
    expect(site("SchemaTransformation.ts", "Middleware").typeParameters).toEqual(["in out T", "in out E"])
  })

  it("Schema.ts: the eight out-variance interfaces D1 names, at their lines", () => {
    const named: Array<[string, number]> = [
      ["ConstraintCodec", 824],
      ["ConstraintDecoder", 848],
      ["ConstraintEncoder", 867],
      ["Schema", 941],
      ["Codec", 1041],
      ["Decoder", 1064],
      ["Encoder", 1087],
      ["Optic", 1141]
    ]
    for (const [name, line] of named) expect(site("Schema.ts", name)).toMatchObject({ declLine: line })
  })

  it("Schema.ts carries four MORE variance declarations than the harness table records", () => {
    // INGESTION-HARNESS.md:105 lists eight sites for Schema.ts. Measured here: twelve.
    // The four extra are the Bottom family, whose variance sits on a multi-line type
    // parameter list, which is presumably why a line-oriented count missed them.
    const extra = ["BottomWithoutNew", "Bottom", "BottomLazyWithoutNew", "BottomLazy"]
    for (const name of extra) {
      expect(site("Schema.ts", name), `${name} must be readable`).toBeDefined()
      expect(site("Schema.ts", name).typeParameters.join(" ")).toContain("in out TypeParameters")
    }
    const schemaTs = survey.files.find((f: any) => f.file === "Schema.ts")
    expect(schemaTs.varianceSites.length).toBe(12)
  })

  it("SchemaAST.ts: the two classes already held as ERROR nodes by the twin", () => {
    expect(site("SchemaAST.ts", "Filter")).toMatchObject({ declLine: 3207, typeParameters: ["in E"] })
    expect(site("SchemaAST.ts", "FilterGroup")).toMatchObject({ declLine: 3255, typeParameters: ["in E"] })
  })

  it("D1b: Schema.ts's newline-separated generic call-signature overloads are read", () => {
    const schemaTs = survey.files.find((f: any) => f.file === "Schema.ts")
    expect(schemaTs.genericOverloadSites.length).toBeGreaterThan(0)
    // The scoping report's own witnesses (`readonly match: {…}` and `matchOrElse`).
    const lines = schemaTs.genericOverloadSites.map((s: any) => s.declLine)
    expect(lines).toContain(6235)
    expect(lines).toContain(6250)
    for (const s of schemaTs.genericOverloadSites) expect(s.genericSignatures).toBeGreaterThan(0)
  })

  it("the clean four carry no variance and no overload sites", () => {
    for (const file of ["JsonSchema.ts", "SchemaParser.ts", "SchemaRepresentation.ts"]) {
      const f = survey.files.find((x: any) => x.file === file)
      expect(f.varianceSites).toEqual([])
      expect(f.genericOverloadSites).toEqual([])
    }
  })

  it("the census totals are what the gate reports", () => {
    expect(survey.totals).toMatchObject({ files: 6, parseErrors: 0, varianceSites: 16 })
  })
})

describe("the pattern table", () => {
  const ast = parseVerified(SRC, "SchemaAST.ts")

  it("matches on node type and dotted field paths", () => {
    const aliases = topLevel(ast.program).filter(({ decl }) => match(decl, PATTERNS.unionAliasAST))
    expect(aliases.length).toBe(1)
    expect(match(ast.program, PATTERNS.unionAliasAST)).toBe(false)
  })

  it("collects in source order", () => {
    const guards = collect(ast.program, PATTERNS.guardCall)
    expect(guards.length).toBe(21)
    const starts = guards.map((g) => g.start)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it("admits the abstract spelling of a class property", () => {
    const base = surveyFile(SRC, "SchemaAST.ts")
    expect(base.parseErrors).toBe(0)
    // `abstract readonly _tag: string` on Base is a TSAbstractPropertyDefinition; the
    // compiler API sees one PropertyDeclaration either way, so the leg must too.
    const fields = extractOxc(SRC).inventory as any
    expect(fields.baseFields.map((f: any) => f.name)).toContain("_tag")
  })
})

describe("the gate", () => {
  it("all six gates are green", () => {
    const results = runGates(SRC)
    expect(results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.detail}`)).toEqual([])
    expect(results.length).toBe(6)
  })
})
