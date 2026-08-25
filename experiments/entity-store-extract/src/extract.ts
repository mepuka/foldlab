/*
 * E2 extractor — Stage 1 of the KICKOFF §12 generation pipeline. Staged, pre-grade.
 *
 * Trust position (§12): the extractor is the ONE trusted component — nothing downstream
 * checks it, so it checks itself: pinned-byte verification (git blob SHA-1 against the
 * source lock) before reading, and four independent enumerations that must agree
 * (census §7 item 6) after extracting. Any mismatch is a loud, non-zero exit.
 *
 * Instrument: the TypeScript compiler API, pinned typescript@5.9.2 (the classic JS
 * compiler API — deliberately not the 7.x native port), SYNTAX ONLY: no type checker,
 * no program, one createSourceFile per input. Facts derived from a declared name table
 * rather than syntax are marked kindBy: "name-table" per field (census §7 items 1-4
 * are syntax; item 5 closure detection uses the table below).
 *
 * Determinism: output is a pure function of the pinned bytes — no timestamps, no host
 * paths, no iteration-order dependence (variants sorted by name; every object built
 * with fixed key order). Two runs must be byte-identical; `bun test` asserts it.
 *
 * inventory.json shape: see INVENTORY-SCHEMA.md (the frozen generator contract).
 */

import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

// ---------- pins ----------

export const PIN = {
  commit: "0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07",
  package: "effect@4.0.0-rc.111",
  files: {
    // verified against .reference/provenance/sources.lock.json (gitBlob only — the
    // lock's bytes/sha256 fields are known-wrong, CRLF defect, repair in flight)
    "SchemaAST.ts": "e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40",
    "SchemaRepresentation.ts": "6282ab9cbf5c7a50b79580065881b5a6c5799aae"
  }
} as const

export const INVENTORY_SCHEMA_VERSION = 1

/**
 * Closure-bearing type names (census §7 item 5): a field whose typeText references one
 * of these holds or reaches a JavaScript closure even though its own type node is not
 * a FunctionTypeNode. Declared, not resolved — the type checker is deliberately out of
 * the trusted seam. Receipts: DeclarationRun SchemaAST.ts:666; Filter.run :3209;
 * Checks = Check[] = (Filter|FilterGroup)[]; Encoding = Link[] with
 * Link.transformation : Transformation|Middleware :403-405.
 */
const CLOSURE_BEARING_NAMES = new Set([
  // The annotation bag is an open string-keyed record (census §7 hatch 2) and holds
  // function values in practice (e.g. toJsonSchema) — never pre-image-safe as a whole.
  "Annotations",
  "DeclarationRun",
  "Encoding",
  "Checks",
  "Check",
  "Filter",
  "FilterGroup",
  "Link",
  "Transformation",
  "Middleware",
  "Getter"
])

/**
 * Constructor-derived caches (census §1 TemplateLiteral): recomputed fields that must
 * never enter a pre-image. Keyed (variant, field). Declared, not inferred.
 */
const DERIVED_CACHE_FIELDS = new Set([
  "TemplateLiteral.encodedParts",
  "TemplateLiteral.literals",
  "TemplateLiteral.suffixLengths"
])

// ---------- git blob verification ----------

export const gitBlobSha1 = (bytes: Uint8Array): string => {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const h = createHash("sha1")
  h.update(header)
  h.update(bytes)
  return h.digest("hex")
}

const readVerified = (srcDir: string, file: keyof typeof PIN.files): string => {
  const bytes = readFileSync(join(srcDir, file))
  const got = gitBlobSha1(bytes)
  const want = PIN.files[file]
  if (got !== want) {
    throw new Error(`pin-mismatch: ${file} git blob ${got}, lock says ${want} — refusing to extract`)
  }
  return bytes.toString("utf8")
}

// ---------- syntax helpers ----------

const parse = (name: string, text: string): ts.SourceFile =>
  ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, /*setParentNodes*/ true)

const line1 = (sf: ts.SourceFile, node: ts.Node): number =>
  sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

const refName = (t: ts.TypeNode): string | undefined => {
  if (!ts.isTypeReferenceNode(t)) return undefined
  const e = t.typeName
  return ts.isIdentifier(e) ? e.text : e.right.text
}

const containsFunctionType = (t: ts.TypeNode): boolean => {
  if (ts.isFunctionTypeNode(t)) return true
  let found = false
  const walk = (n: ts.Node): void => {
    if (found) return
    if (ts.isFunctionTypeNode(n)) {
      found = true
      return
    }
    n.forEachChild(walk)
  }
  t.forEachChild(walk)
  return found
}

const referencesClosureName = (typeText: string): boolean => {
  for (const name of CLOSURE_BEARING_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(typeText)) return true
  }
  return false
}

// ---------- inventory types ----------

interface FieldEntry {
  name: string
  typeText: string
  kind: "data" | "closure" | "closure-bearing" | "derived-cache"
  kindBy: "syntax" | "name-table"
  declLine: number
  optional: boolean
}

interface CtorParam {
  name: string
  typeText: string
  optional: boolean
  hasDefault: boolean
}

interface VariantEntry {
  variant: string
  tagLiteral: string
  unionIndex: number
  declLine: number
  tagDeclLine: number
  fields: Array<FieldEntry>
  ctorParams: Array<CtorParam>
}

// ---------- enumerations (census §7) ----------

/** A: the union alias `export type AST = ...` (SchemaAST.ts:53). Source order kept. */
export const enumUnionAlias = (sf: ts.SourceFile): Array<string> => {
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) && st.name.text === "AST") {
      if (!ts.isUnionTypeNode(st.type)) throw new Error("cross-check: AST alias is not a union type")
      return st.type.types.map((t) => {
        const n = refName(t)
        if (n === undefined) throw new Error("cross-check: AST union member is not a type reference")
        return n
      })
    }
  }
  throw new Error("cross-check: type alias AST not found")
}

/** B: every `makeGuard("Tag")` call site (SchemaAST.ts:109-380). */
export const enumGuardTags = (sf: ts.SourceFile): Array<string> => {
  const tags: Array<string> = []
  const walk = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "makeGuard" &&
      n.arguments.length === 1 &&
      ts.isStringLiteral(n.arguments[0]!)
    ) {
      tags.push((n.arguments[0] as ts.StringLiteral).text)
    }
    n.forEachChild(walk)
  }
  walk(sf)
  return tags
}

/** C: exported classes `extends Base` with a readonly `_tag` string-literal property. */
export const enumClasses = (sf: ts.SourceFile): Array<VariantEntry> => {
  const out: Array<VariantEntry> = []
  for (const st of sf.statements) {
    if (!ts.isClassDeclaration(st) || st.name === undefined) continue
    const ext = st.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)
    const parent = ext?.types[0]?.expression
    if (!(parent && ts.isIdentifier(parent) && parent.text === "Base")) continue

    let tagLiteral: string | undefined
    let tagDeclLine = 0
    const fields: Array<FieldEntry> = []
    const ctorParams: Array<CtorParam> = []

    for (const m of st.members) {
      if (ts.isPropertyDeclaration(m) && ts.isIdentifier(m.name)) {
        const name = m.name.text
        if (name === "_tag") {
          if (m.initializer && ts.isStringLiteral(m.initializer)) {
            tagLiteral = m.initializer.text
            tagDeclLine = line1(sf, m)
          }
          continue
        }
        const typeText = m.type ? m.type.getText(sf) : "<inferred>"
        let kind: FieldEntry["kind"] = "data"
        let kindBy: FieldEntry["kindBy"] = "syntax"
        if (m.type && containsFunctionType(m.type)) {
          kind = "closure"
        } else if (DERIVED_CACHE_FIELDS.has(`${st.name.text}.${name}`)) {
          kind = "derived-cache"
          kindBy = "name-table"
        } else if (referencesClosureName(typeText)) {
          kind = "closure-bearing"
          kindBy = "name-table"
        }
        fields.push({
          name,
          typeText,
          kind,
          kindBy,
          declLine: line1(sf, m),
          optional: m.questionToken !== undefined || /\bundefined\b/.test(typeText)
        })
      }
      if (ts.isConstructorDeclaration(m)) {
        for (const p of m.parameters) {
          if (!ts.isIdentifier(p.name)) continue
          ctorParams.push({
            name: p.name.text,
            typeText: p.type ? p.type.getText(sf) : "<inferred>",
            optional: p.questionToken !== undefined,
            hasDefault: p.initializer !== undefined
          })
        }
      }
    }

    if (tagLiteral === undefined) {
      throw new Error(`cross-check: class ${st.name.text} extends Base without a string-literal _tag`)
    }
    out.push({
      variant: st.name.text,
      tagLiteral,
      unionIndex: -1, // filled after enumUnionAlias
      declLine: line1(sf, st),
      tagDeclLine,
      fields,
      ctorParams
    })
  }
  return out
}

/** Base fields from `abstract class Base` (SchemaAST.ts:636). */
export const enumBaseFields = (sf: ts.SourceFile): Array<FieldEntry> => {
  for (const st of sf.statements) {
    if (ts.isClassDeclaration(st) && st.name?.text === "Base") {
      const fields: Array<FieldEntry> = []
      for (const m of st.members) {
        if (ts.isPropertyDeclaration(m) && ts.isIdentifier(m.name)) {
          const typeText = m.type ? m.type.getText(sf) : "<inferred>"
          const closure = referencesClosureName(typeText)
          fields.push({
            name: m.name.text,
            typeText,
            kind: closure ? "closure-bearing" : "data",
            kindBy: closure ? "name-table" : "syntax",
            declLine: line1(sf, m),
            optional: /\bundefined\b/.test(typeText)
          })
        }
      }
      return fields
    }
  }
  throw new Error("cross-check: abstract class Base not found")
}

/** D: `export type Representation = ...` (SchemaRepresentation.ts:406-428). */
export const enumRepresentationUnion = (sf: ts.SourceFile): Array<string> => {
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) && st.name.text === "Representation") {
      if (!ts.isUnionTypeNode(st.type)) throw new Error("cross-check: Representation alias is not a union")
      return st.type.types.map((t) => {
        const n = refName(t)
        if (n === undefined) throw new Error("cross-check: Representation member is not a type reference")
        return n
      })
    }
  }
  throw new Error("cross-check: type alias Representation not found")
}

/** E: the `RepresentationUnion` runtime array (SchemaRepresentation.ts:1071-1094). */
export const enumRuntimeArray = (sf: ts.SourceFile): Array<string> => {
  let result: Array<string> | undefined
  const walk = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === "RepresentationUnion" &&
      n.initializer &&
      ts.isCallExpression(n.initializer)
    ) {
      const arr = n.initializer.arguments[0]
      if (arr && ts.isArrayLiteralExpression(arr)) {
        result = arr.elements.map((e) => {
          if (
            ts.isCallExpression(e) &&
            ts.isIdentifier(e.expression) &&
            e.expression.text === "makeKeywordSchema" &&
            e.arguments[0] &&
            ts.isStringLiteral(e.arguments[0])
          ) {
            return (e.arguments[0] as ts.StringLiteral).text
          }
          if (ts.isIdentifier(e) && e.text.endsWith("Schema")) {
            return e.text.slice(0, -"Schema".length)
          }
          throw new Error(`cross-check: unrecognized RepresentationUnion element at pos ${e.pos}`)
        })
      }
    }
    n.forEachChild(walk)
  }
  walk(sf)
  if (result === undefined) throw new Error("cross-check: RepresentationUnion array not found")
  return result
}

// ---------- cross-checks (fail loudly; census §7 item 6) ----------

const setEq = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean =>
  a.length === new Set(a).size &&
  b.length === new Set(b).size &&
  a.length === b.length &&
  [...a].sort().join(" ") === [...b].sort().join(" ")

export interface CrossCheckReport {
  unionAliasCount: number
  guardTagCount: number
  classCount: number
  representationUnionCount: number
  runtimeArrayCount: number
  failures: Array<string>
}

export const crossCheck = (
  union: ReadonlyArray<string>,
  guards: ReadonlyArray<string>,
  variants: ReadonlyArray<VariantEntry>,
  repUnion: ReadonlyArray<string>,
  runtimeArr: ReadonlyArray<string>
): CrossCheckReport => {
  const failures: Array<string> = []
  const classNames = variants.map((v) => v.variant)
  const classTags = variants.map((v) => v.tagLiteral)

  if (union.length !== 21) failures.push(`AST union alias has ${union.length} members, expected 21`)
  if (!setEq(union, classNames)) {
    failures.push(`union alias ≠ Base-extending classes: [${union}] vs [${classNames}]`)
  }
  // Count trap (brief): 23 _tags exist in the file (Filter, FilterGroup included);
  // the guard check is against the 21 Base-extending variants only.
  if (!setEq(guards, classTags)) {
    failures.push(`makeGuard tags ≠ class _tag literals: [${guards}] vs [${classTags}]`)
  }
  const expectedRep = [...union, "Reference"]
  if (!setEq(repUnion, expectedRep)) {
    failures.push(`Representation union ≠ AST union + Reference: [${repUnion.toSorted()}]`)
  }
  if (!setEq(runtimeArr, repUnion)) {
    failures.push(`RepresentationUnion runtime array ≠ Representation type union: [${runtimeArr.toSorted()}]`)
  }
  return {
    unionAliasCount: union.length,
    guardTagCount: guards.length,
    classCount: variants.length,
    representationUnionCount: repUnion.length,
    runtimeArrayCount: runtimeArr.length,
    failures
  }
}

// ---------- extraction + deterministic emit ----------

export const extract = (srcDir: string): { inventory: unknown; report: CrossCheckReport } => {
  const astText = readVerified(srcDir, "SchemaAST.ts")
  const repText = readVerified(srcDir, "SchemaRepresentation.ts")
  const astSf = parse("SchemaAST.ts", astText)
  const repSf = parse("SchemaRepresentation.ts", repText)

  const union = enumUnionAlias(astSf)
  const guards = enumGuardTags(astSf)
  const variants = enumClasses(astSf)
  const baseFields = enumBaseFields(astSf)
  const repUnion = enumRepresentationUnion(repSf)
  const runtimeArr = enumRuntimeArray(repSf)

  for (const v of variants) v.unionIndex = union.indexOf(v.variant)
  variants.sort((a, b) => (a.variant < b.variant ? -1 : a.variant > b.variant ? 1 : 0))

  const report = crossCheck(union, guards, variants, repUnion, runtimeArr)

  // Fixed key order throughout; no timestamps; no host paths.
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
      instrument: "typescript-compiler-api",
      instrumentVersion: ts.version,
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

export const emit = (inventory: unknown): string => JSON.stringify(inventory, null, 2) + "\n"

// ---------- CLI ----------

if (import.meta.main) {
  const srcDir = process.argv[2] ?? join(import.meta.dir, "..", "..", "..", ".staging", "e2", "src-cache")
  const outPath = process.argv[3] ?? join(import.meta.dir, "..", "inventory.json")
  const { inventory, report } = extract(srcDir)
  if (report.failures.length > 0) {
    console.error("CROSS-CHECK FAILURES:")
    for (const f of report.failures) console.error("  - " + f)
    process.exit(1)
  }
  writeFileSync(outPath, emit(inventory))
  console.log(
    `inventory written: ${report.classCount} variants; enumerations ` +
      `${report.unionAliasCount}/${report.guardTagCount}/${report.representationUnionCount}/${report.runtimeArrayCount} agree`
  )
}
