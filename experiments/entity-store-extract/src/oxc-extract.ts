/*
 * The OXC leg — Stage-1 extraction over the FULL pinned rc.111 schema surface.
 *
 * Third instrument in this lane, beside the TypeScript-compiler-API leg (`extract.ts`)
 * and the lean4-tree-sitter twin (`twin/`). It exists because the surface is six files
 * and the twin can read four: `Schema.ts` and `SchemaTransformation.ts` are unparseable
 * at every tree-sitter pin currently reachable, for two independent grammar reasons
 * (D1 variance annotations, D1b newline-separated generic call-signature overloads —
 * `.staging/operational-structure/D1-OPTION-A-SCOPING.md`). Those are facts about that
 * instrument. This one parses all six with zero errors, and `oxc-check.ts` asserts it
 * rather than asking anyone to believe it.
 *
 * CHASSIS: `oxc-parser@0.147.0` — the already-admitted in-process parser surface the
 * lift harness uses (TOOLS.md), reached exactly as that harness reaches it: `parseSync`
 * over source text, ESTree out, no type checker, no project, one parse per file. No new
 * parser is admitted here. The recognition itself is a walk over the pattern table in
 * `oxc-patterns.ts`.
 *
 * INDEPENDENCE: this leg shares DATA with the compiler-API leg — the pins, the declared
 * name tables, the record shapes, the cross-check predicate, all in `contract.ts` — and
 * shares no walking code with it. That is the whole reason the agreement result below
 * means anything: two instruments reading the same bytes through different parsers into
 * the same inventory. It imports no TypeScript compiler API, so the hot path carries
 * one parser.
 *
 * DETERMINISM: same discipline as the compiler-API leg. Output is a pure function of
 * the pinned bytes — no timestamps, no host paths, fixed key order, variants sorted by
 * name — except `extractor.instrumentVersion`, which is this instrument's own declared
 * identity and is the one field the cross-instrument gate normalizes.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { parseSync } from "oxc-parser"
import {
  CLOSURE_BEARING_NAMES,
  crossCheck,
  DERIVED_CACHE_FIELDS,
  emit,
  gitBlobSha1,
  INVENTORY_SCHEMA_VERSION,
  PIN,
  resolveSrcDir,
  SURFACE_FILES,
  SURFACE_PINS,
  SURFACE_SCHEMA_VERSION
} from "./contract.ts"
import type { CrossCheckReport, CtorParam, FieldEntry, SurfaceFile, VariantEntry } from "./contract.ts"
import { at, collect, isNode, match, PATTERNS, SPELLINGS, topLevel, visit } from "./oxc-patterns.ts"
import type { OxcNode } from "./oxc-patterns.ts"

// ---------- the instrument's declared identity ----------

/**
 * Read from the installed package rather than hard-coded, so a lockfile drift shows up
 * in the inventory instead of hiding behind a stale constant. `createRequire` because
 * this module is ESM and the resolution must work under both bun and the node worker
 * vitest runs test bodies in — the same reason the lift harness reaches its own
 * non-ESM-resolvable data that way (`experiments/lift-harness/README.md`).
 */
const OXC_PARSER_VERSION: string = (() => {
  const req = createRequire(import.meta.url)
  return JSON.parse(readFileSync(req.resolve("oxc-parser/package.json"), "utf8")).version as string
})()

export const INSTRUMENT = {
  instrument: "oxc-parser",
  instrumentVersion: OXC_PARSER_VERSION
} as const

/** Fixed for every file: TypeScript syntax, module goal. No checker, no project. */
const PARSE_OPTIONS = { lang: "ts", sourceType: "module" } as const

// ---------- pinned read + parse ----------

export interface ParsedFile {
  readonly file: string
  readonly text: string
  readonly program: OxcNode
  readonly errors: ReadonlyArray<{ message: string; start: number }>
  /** Line-start offsets, so a byte position becomes a 1-based line in one binary search. */
  readonly lineStarts: ReadonlyArray<number>
}

const lineStartsOf = (text: string): Array<number> => {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
  return starts
}

/** 1-based line of a byte offset. */
export const lineOf = (f: ParsedFile, pos: number): number => {
  let lo = 0
  let hi = f.lineStarts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (f.lineStarts[mid]! <= pos) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

/**
 * Read a pinned file, verify its git blob, parse it.
 *
 * The pin check comes FIRST and refuses loudly — the extractor is the one trusted
 * component in the pipeline (KICKOFF §12), so it establishes what it is reading before
 * it reads it. Parse errors are RETURNED, not thrown: `oxc-check` turns them into the
 * parse-clean gate, and a leg that threw here could not report which file failed.
 */
export const parseVerified = (srcDir: string, file: SurfaceFile): ParsedFile => {
  const bytes = readFileSync(join(srcDir, file))
  const got = gitBlobSha1(bytes)
  const want = SURFACE_PINS[file]
  if (got !== want) {
    throw new Error(`pin-mismatch: ${file} git blob ${got}, lock says ${want} — refusing to extract`)
  }
  const text = bytes.toString("utf8")
  const parsed = parseSync(file, text, PARSE_OPTIONS)
  return {
    file,
    text,
    program: parsed.program as unknown as OxcNode,
    errors: parsed.errors.map((e) => ({ message: e.message, start: e.labels?.[0]?.start ?? 0 })),
    lineStarts: lineStartsOf(text)
  }
}

// ---------- reading through the patterns ----------

/**
 * The source slice a node spans.
 *
 * This is the compiler API's `node.getText(sourceFile)` by construction: TypeScript
 * returns `text.substring(node.getStart(sf), node.end)`, where `getStart` has already
 * skipped leading trivia — which is exactly where an oxc span begins. `typeText` is a
 * SLICE on both legs, never a re-print, so neither instrument's formatter can drift it.
 */
const textOf = (f: ParsedFile, n: OxcNode): string => f.text.slice(n.start, n.end)

/** The annotated type of a node that may carry `: T`, or undefined. */
const typeNodeOf = (n: OxcNode): OxcNode | undefined => {
  const ann = n["typeAnnotation"]
  if (!isNode(ann)) return undefined
  // `TSTypeAnnotation` is the `: T` wrapper; its span starts at the colon, so the type
  // itself is one level in. A node may also carry the type directly.
  const inner = ann.type === "TSTypeAnnotation" ? ann["typeAnnotation"] : ann
  return isNode(inner) ? inner : undefined
}

const typeTextOf = (f: ParsedFile, n: OxcNode): string => {
  const t = typeNodeOf(n)
  return t === undefined ? "<inferred>" : textOf(f, t)
}

/** The declared-name half of the closure classification (census §7 item 5). */
const referencesClosureName = (typeText: string): boolean => {
  for (const name of CLOSURE_BEARING_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(typeText)) return true
  }
  return false
}

/** The syntax half: an arrow type anywhere in the annotation, itself included. */
const containsFunctionType = (t: OxcNode): boolean => {
  let found = false
  visit(t, (n) => {
    if (match(n, PATTERNS.functionType)) found = true
  })
  return found
}

const stringValue = (n: unknown): string | undefined => {
  if (!isNode(n)) return undefined
  if (!SPELLINGS.stringLiteral.includes(n.type as never)) return undefined
  const v = n["value"]
  return typeof v === "string" ? v : undefined
}

/** A type reference's name; qualified names answer with their right-hand segment. */
const refName = (t: unknown): string | undefined => {
  if (!isNode(t) || t.type !== "TSTypeReference") return undefined
  const name = t["typeName"]
  if (!isNode(name)) return undefined
  if (name.type === "Identifier") return name["name"] as string
  if (name.type === "TSQualifiedName") {
    const right = name["right"]
    return isNode(right) ? (right["name"] as string) : undefined
  }
  return undefined
}

const unionMembers = (alias: OxcNode, what: string): Array<string> => {
  const ann = alias["typeAnnotation"]
  if (!isNode(ann) || ann.type !== "TSUnionType") {
    throw new Error(`cross-check: ${what} alias is not a union type`)
  }
  return (ann["types"] as Array<unknown>).map((t) => {
    const n = refName(t)
    if (n === undefined) throw new Error(`cross-check: ${what} union member is not a type reference`)
    return n
  })
}

// ---------- the five enumerations (census §7) ----------

/** A: the union alias `export type AST = ...`. Source order kept. */
export const enumUnionAlias = (f: ParsedFile): Array<string> => {
  for (const { decl } of topLevel(f.program)) {
    if (match(decl, PATTERNS.unionAliasAST)) return unionMembers(decl, "AST")
  }
  throw new Error("cross-check: type alias AST not found")
}

/** B: every `makeGuard("Tag")` call site. */
export const enumGuardTags = (f: ParsedFile): Array<string> => {
  const tags: Array<string> = []
  for (const call of collect(f.program, PATTERNS.guardCall)) {
    const arg = stringValue((call["arguments"] as Array<unknown>)[0])
    if (arg !== undefined) tags.push(arg)
  }
  return tags
}

const classMembers = (cls: OxcNode): Array<OxcNode> => {
  const body = cls["body"]
  if (!isNode(body)) return []
  return ((body["body"] ?? []) as Array<unknown>).filter(isNode)
}

const fieldEntry = (f: ParsedFile, owner: string, m: OxcNode): FieldEntry => {
  const name = at(m, "key.name") as string
  const typeText = typeTextOf(f, m)
  const t = typeNodeOf(m)
  let kind: FieldEntry["kind"] = "data"
  let kindBy: FieldEntry["kindBy"] = "syntax"
  if (t !== undefined && containsFunctionType(t)) {
    kind = "closure"
  } else if (DERIVED_CACHE_FIELDS.has(`${owner}.${name}`)) {
    kind = "derived-cache"
    kindBy = "name-table"
  } else if (referencesClosureName(typeText)) {
    kind = "closure-bearing"
    kindBy = "name-table"
  }
  return {
    name,
    typeText,
    kind,
    kindBy,
    declLine: lineOf(f, m.start),
    optional: m["optional"] === true || /\bundefined\b/.test(typeText)
  }
}

/**
 * A constructor parameter, in the compiler API's terms.
 *
 * TypeScript sees ONE `ParameterDeclaration` carrying an optional token, an optional
 * initializer and optional modifiers. ESTree splits those three across three node types
 * — `Identifier`, `AssignmentPattern`, `TSParameterProperty` — so the split is undone
 * here. A destructured parameter has no identifier name and is skipped on both legs.
 */
const ctorParam = (f: ParsedFile, p: unknown): CtorParam | undefined => {
  if (!isNode(p)) return undefined
  if (p.type === "TSParameterProperty") return ctorParam(f, p["parameter"])
  if (p.type === "AssignmentPattern") {
    const left = p["left"]
    if (!isNode(left) || left.type !== "Identifier") return undefined
    return {
      name: left["name"] as string,
      typeText: typeTextOf(f, left),
      optional: left["optional"] === true,
      hasDefault: true
    }
  }
  if (p.type !== "Identifier") return undefined
  return {
    name: p["name"] as string,
    typeText: typeTextOf(f, p),
    optional: p["optional"] === true,
    hasDefault: false
  }
}

/** C: classes `extends Base` with a readonly `_tag` string-literal property. */
export const enumClasses = (f: ParsedFile): Array<VariantEntry> => {
  const out: Array<VariantEntry> = []
  for (const { stmt, decl } of topLevel(f.program)) {
    if (!match(decl, PATTERNS.variantClass)) continue
    const variant = at(decl, "id.name") as string

    let tagLiteral: string | undefined
    let tagDeclLine = 0
    const fields: Array<FieldEntry> = []
    const ctorParams: Array<CtorParam> = []

    for (const m of classMembers(decl)) {
      if (match(m, PATTERNS.classProperty)) {
        const name = at(m, "key.name") as string
        if (name === "_tag") {
          const value = stringValue(m["value"])
          if (value !== undefined) {
            tagLiteral = value
            tagDeclLine = lineOf(f, m.start)
          }
          continue
        }
        fields.push(fieldEntry(f, variant, m))
      }
      if (match(m, PATTERNS.constructorMember)) {
        for (const p of at(m, "value.params") as Array<unknown>) {
          const cp = ctorParam(f, p)
          if (cp !== undefined) ctorParams.push(cp)
        }
      }
    }

    if (tagLiteral === undefined) {
      throw new Error(`cross-check: class ${variant} extends Base without a string-literal _tag`)
    }
    out.push({
      variant,
      tagLiteral,
      unionIndex: -1, // filled after enumUnionAlias
      // The STATEMENT's start, not the class's: TypeScript's node begins at `export`.
      declLine: lineOf(f, stmt.start),
      tagDeclLine,
      fields,
      ctorParams
    })
  }
  return out
}

/** Base fields from `abstract class Base`. */
export const enumBaseFields = (f: ParsedFile): Array<FieldEntry> => {
  for (const { decl } of topLevel(f.program)) {
    if (!match(decl, PATTERNS.baseClass)) continue
    const fields: Array<FieldEntry> = []
    for (const m of classMembers(decl)) {
      if (!match(m, PATTERNS.classProperty)) continue
      const typeText = typeTextOf(f, m)
      const closure = referencesClosureName(typeText)
      fields.push({
        name: at(m, "key.name") as string,
        typeText,
        kind: closure ? "closure-bearing" : "data",
        kindBy: closure ? "name-table" : "syntax",
        declLine: lineOf(f, m.start),
        optional: /\bundefined\b/.test(typeText)
      })
    }
    return fields
  }
  throw new Error("cross-check: abstract class Base not found")
}

/** D: `export type Representation = ...`. */
export const enumRepresentationUnion = (f: ParsedFile): Array<string> => {
  for (const { decl } of topLevel(f.program)) {
    if (match(decl, PATTERNS.representationAlias)) return unionMembers(decl, "Representation")
  }
  throw new Error("cross-check: type alias Representation not found")
}

/** E: the `RepresentationUnion` runtime array. */
export const enumRuntimeArray = (f: ParsedFile): Array<string> => {
  const decls = collect(f.program, PATTERNS.representationUnionDecl)
  for (const d of decls) {
    const arr = at(d, "init.arguments.0")
    if (!isNode(arr) || arr.type !== "ArrayExpression") continue
    return (arr["elements"] as Array<unknown>).map((e) => {
      if (match(e, PATTERNS.keywordSchemaCall)) {
        const tag = stringValue((e["arguments"] as Array<unknown>)[0])
        if (tag !== undefined) return tag
      }
      if (isNode(e) && e.type === "Identifier" && (e["name"] as string).endsWith("Schema")) {
        return (e["name"] as string).slice(0, -"Schema".length)
      }
      throw new Error(
        `cross-check: unrecognized RepresentationUnion element at pos ${isNode(e) ? e.start : "?"}`
      )
    })
  }
  throw new Error("cross-check: RepresentationUnion array not found")
}

// ---------- extraction ----------

export const extractOxc = (srcDir: string): { inventory: unknown; report: CrossCheckReport } => {
  const ast = parseVerified(srcDir, "SchemaAST.ts")
  const rep = parseVerified(srcDir, "SchemaRepresentation.ts")
  for (const f of [ast, rep]) {
    if (f.errors.length > 0) throw new Error(`parse-error: ${f.file} did not parse cleanly`)
  }

  const union = enumUnionAlias(ast)
  const guards = enumGuardTags(ast)
  const variants = enumClasses(ast)
  const baseFields = enumBaseFields(ast)
  const repUnion = enumRepresentationUnion(rep)
  const runtimeArr = enumRuntimeArray(rep)

  for (const v of variants) v.unionIndex = union.indexOf(v.variant)
  variants.sort((a, b) => (a.variant < b.variant ? -1 : a.variant > b.variant ? 1 : 0))

  const report = crossCheck(union, guards, variants, repUnion, runtimeArr)

  // Key order matches the compiler-API leg's exactly; the gate is byte equality.
  const inventory = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    source: {
      repository: "Effect-TS/effect",
      commit: PIN.commit,
      package: PIN.package,
      files: [
        { path: "packages/effect/src/SchemaAST.ts", gitBlobSha1: PIN.files["SchemaAST.ts"] },
        {
          path: "packages/effect/src/SchemaRepresentation.ts",
          gitBlobSha1: PIN.files["SchemaRepresentation.ts"]
        }
      ]
    },
    extractor: {
      name: "e2-extract",
      instrument: INSTRUMENT.instrument,
      instrumentVersion: INSTRUMENT.instrumentVersion,
      mode: "syntax-only",
      nameTables: {
        closureBearing: [...CLOSURE_BEARING_NAMES].sort(),
        derivedCache: [...DERIVED_CACHE_FIELDS].sort()
      }
    },
    counts: {
      variants: variants.length,
      unionAlias: report.unionAliasCount,
      guardTags: report.guardTagCount,
      representationUnion: report.representationUnionCount,
      runtimeArray: report.runtimeArrayCount
    },
    baseFields,
    variants
  }
  return { inventory, report }
}

// ---------- the surface census: what this instrument can read ----------

export interface VarianceSite {
  file: string
  declaration: string
  declarationKind: string
  declLine: number
  typeParameters: Array<string>
}

export interface OverloadSite {
  file: string
  declaration: string
  declLine: number
  signatures: number
  genericSignatures: number
}

export interface FileSurvey {
  file: string
  gitBlobSha1: string
  bytes: number
  lines: number
  parseErrors: number
  topLevelStatements: number
  declarations: Record<string, number>
  varianceSites: Array<VarianceSite>
  genericOverloadSites: Array<OverloadSite>
}

/** The nearest enclosing NAMED declaration of a node, for census reporting. */
const namedOwners = (f: ParsedFile): Array<{ start: number; end: number; name: string; kind: string }> => {
  const owners: Array<{ start: number; end: number; name: string; kind: string }> = []
  for (const { stmt, decl } of topLevel(f.program)) {
    const id = decl["id"]
    const name = isNode(id) ? (id["name"] as string) : undefined
    if (name !== undefined) {
      owners.push({ start: stmt.start, end: stmt.end, name, kind: decl.type })
      continue
    }
    // `export const x = ...` / `const x = ...`: name each declarator separately.
    if (decl.type === "VariableDeclaration") {
      for (const d of (decl["declarations"] ?? []) as Array<unknown>) {
        if (!isNode(d)) continue
        const did = d["id"]
        if (isNode(did) && did.type === "Identifier") {
          owners.push({ start: d.start, end: d.end, name: did["name"] as string, kind: "VariableDeclarator" })
        }
      }
    }
  }
  return owners.sort((a, b) => a.start - b.start)
}

interface Owner {
  start: number
  end: number
  name: string
  kind: string
}

const ownerOf = (owners: ReadonlyArray<Owner>, pos: number): Owner => {
  for (const o of owners) if (o.start <= pos && pos < o.end) return o
  return { start: pos, end: pos, name: "<top-level>", kind: "<none>" }
}

/**
 * Survey one file: parse cleanliness, the declaration histogram, and the two shapes the
 * tree-sitter twin cannot read. This is the evidence for "newly readable" — it names the
 * declarations, it does not assert a count and leave the reader to trust it.
 */
export const surveyFile = (srcDir: string, file: SurfaceFile): FileSurvey => {
  const f = parseVerified(srcDir, file)
  const owners = namedOwners(f)

  const declarations: Record<string, number> = {}
  for (const { decl } of topLevel(f.program)) {
    declarations[decl.type] = (declarations[decl.type] ?? 0) + 1
  }

  // D1 — variance-annotated type parameters, grouped by the declaration that owns them.
  const byOwner = new Map<string, VarianceSite>()
  for (const tp of collect(f.program, PATTERNS.varianceTypeParameter)) {
    if (tp["in"] !== true && tp["out"] !== true) continue
    const o = ownerOf(owners, tp.start)
    const key = `${o.name}@${o.kind}`
    const existing = byOwner.get(key)
    const spelling = textOf(f, tp).replace(/\s+/g, " ")
    if (existing === undefined) {
      byOwner.set(key, {
        file,
        declaration: o.name,
        declarationKind: o.kind,
        // The DECLARATION's line, not the type parameter's: a multi-line parameter list
        // would otherwise report a site the D1 scoping table does not name.
        declLine: lineOf(f, o.start),
        typeParameters: [spelling]
      })
    } else {
      existing.typeParameters.push(spelling)
    }
  }

  // D1b — object types holding two or more call signatures, at least one generic.
  const genericOverloadSites: Array<OverloadSite> = []
  for (const lit of collect(f.program, PATTERNS.objectTypeLiteral)) {
    const members = ((lit["members"] ?? []) as Array<unknown>).filter(isNode)
    const sigs = members.filter((m) => match(m, PATTERNS.callSignature))
    if (sigs.length < 2) continue
    const generic = sigs.filter((m) => isNode(m["typeParameters"]))
    if (generic.length === 0) continue
    const o = ownerOf(owners, lit.start)
    genericOverloadSites.push({
      file,
      declaration: o.name,
      declLine: lineOf(f, lit.start),
      signatures: sigs.length,
      genericSignatures: generic.length
    })
  }

  return {
    file,
    gitBlobSha1: SURFACE_PINS[file],
    bytes: Buffer.byteLength(f.text, "utf8"),
    lines: f.lineStarts.length,
    parseErrors: f.errors.length,
    topLevelStatements: ((f.program["body"] ?? []) as Array<unknown>).length,
    declarations: Object.fromEntries(Object.entries(declarations).sort(([a], [b]) => (a < b ? -1 : 1))),
    varianceSites: [...byOwner.values()].sort((a, b) => a.declLine - b.declLine),
    genericOverloadSites: genericOverloadSites.sort((a, b) => a.declLine - b.declLine)
  }
}

export const surveySurface = (srcDir: string): unknown => {
  const files = SURFACE_FILES.map((f) => surveyFile(srcDir, f))
  return {
    schemaVersion: SURFACE_SCHEMA_VERSION,
    source: {
      repository: "Effect-TS/effect",
      commit: PIN.commit,
      package: PIN.package
    },
    extractor: {
      name: "e2-extract-oxc",
      instrument: INSTRUMENT.instrument,
      instrumentVersion: INSTRUMENT.instrumentVersion,
      mode: "syntax-only"
    },
    totals: {
      files: files.length,
      parseErrors: files.reduce((n, f) => n + f.parseErrors, 0),
      varianceSites: files.reduce((n, f) => n + f.varianceSites.length, 0),
      genericOverloadSites: files.reduce((n, f) => n + f.genericOverloadSites.length, 0)
    },
    files
  }
}

// ---------- CLI ----------

if (import.meta.main) {
  const srcDir = process.argv[2] ?? resolveSrcDir(import.meta.dirname)
  const outPath = process.argv[3] ?? join(import.meta.dirname, "..", "oxc-surface.json")
  const { report } = extractOxc(srcDir)
  if (report.failures.length > 0) {
    console.error("CROSS-CHECK FAILURES:")
    for (const f of report.failures) console.error("  - " + f)
    process.exit(1)
  }
  writeFileSync(outPath, emit(surveySurface(srcDir)))
  console.log(
    `oxc surface written: ${SURFACE_FILES.length} files; enumerations ` +
      `${report.unionAliasCount}/${report.guardTagCount}/${report.classCount}/` +
      `${report.representationUnionCount}/${report.runtimeArrayCount} agree`
  )
}
