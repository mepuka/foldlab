/*
 * Stage-1 CONTRACT — the data every extractor leg reads, and nothing else.
 *
 * The lane runs more than one instrument over the same pinned bytes (census §7 item 6,
 * and TOOLS.md's cross-instrument gate). Those instruments are each other's check, so
 * they must share DATA and never share CODE: a shared walker would make the agreement
 * gate prove that one implementation agrees with itself.
 *
 * This module is the DATA half of that split — pins, the declared name tables, the
 * inventory's record shapes, the cross-check predicate, and the canonical emit. Every
 * leg imports it; no leg imports another leg. It carries no parser import, so an oxc
 * leg that reads it does not drag the TypeScript compiler API onto its hot path.
 *
 * Extracted from `extract.ts` 2026-08-29 when the oxc leg landed. Nothing was changed
 * in the move — `inventory.json` is byte-gated against a fresh extraction and would
 * have said otherwise.
 */

import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"

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

/**
 * The FULL pinned rc.111 schema surface — all six files, in sorted order.
 *
 * `PIN.files` is the two-file subset the inventory is derived from; this is the surface
 * an instrument is asked to READ. The tree-sitter twin cannot read `Schema.ts` or
 * `SchemaTransformation.ts` at any pin currently reachable (D1 variance annotations plus
 * the D1b newline-separated generic call-signature overloads — see
 * `.staging/operational-structure/D1-OPTION-A-SCOPING.md`), which is an instrument fact
 * about that instrument, not a property of the surface. Digests measured 2026-08-29 by
 * `gitBlobSha1` over `.staging/e2/src-cache`; the two shared with `PIN.files` agree with
 * it by construction and `oxc-check` asserts that they do.
 */
export const SURFACE_PINS = {
  "JsonSchema.ts": "054b8e6b650dd9149517557b744e566e2835b0fa",
  "Schema.ts": "2924d92fcd5b397ab1e0d0635bd661dfa453f11b",
  "SchemaAST.ts": "e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40",
  "SchemaParser.ts": "7cc35ebffe58a9a51476c238308c8aa34b2b4f42",
  "SchemaRepresentation.ts": "6282ab9cbf5c7a50b79580065881b5a6c5799aae",
  "SchemaTransformation.ts": "e90c1a653ca5362871e612e6e4569e6470be8218"
} as const

export type SurfaceFile = keyof typeof SURFACE_PINS

/** Sorted, so every leg walks the surface in one order. */
export const SURFACE_FILES: ReadonlyArray<SurfaceFile> = Object.keys(SURFACE_PINS).sort() as Array<SurfaceFile>

export const INVENTORY_SCHEMA_VERSION = 1

export const SURFACE_SCHEMA_VERSION = 1

// ---------- locating the pinned bytes ----------

/**
 * Find the pinned source cache, and REFUSE by name when it is absent.
 *
 * The lane's standing defect (INGESTION-HARNESS.md M1, grill item 1): every input lives
 * under `.staging/`, which `.gitignore` excludes, and no bootstrap script materializes
 * it. So this resolver does not make the gate portable — nothing in this module can —
 * it makes the gate HONEST about being host-local: it names the roots it tried instead
 * of dying on an ENOENT three frames deep, and it works from a git worktree, where the
 * package-relative `../../../.staging` of the original CLI does not resolve.
 *
 * Order: `E2_SRC_CACHE` if set, then `.staging/e2/src-cache` under each ancestor of the
 * package. Whether the six files should instead be vendored into this lane is an open
 * operator ruling and is deliberately not pre-empted here.
 */
export const resolveSrcDir = (fromDir: string): string => {
  const tried: Array<string> = []
  const env = process.env["E2_SRC_CACHE"]
  if (env !== undefined && env !== "") {
    tried.push(env)
    if (existsSync(env)) return env
  }
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, ".staging", "e2", "src-cache")
    tried.push(candidate)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(
    "src-cache-absent: the pinned Effect source cache was not found. Tried:\n  " +
      tried.join("\n  ") +
      "\nSet E2_SRC_CACHE to the directory holding the six pinned rc.111 files."
  )
}

// ---------- declared name tables ----------

/**
 * Closure-bearing type names (census §7 item 5): a field whose typeText references one
 * of these holds or reaches a JavaScript closure even though its own type node is not
 * a FunctionTypeNode. Declared, not resolved — the type checker is deliberately out of
 * the trusted seam. Receipts: DeclarationRun SchemaAST.ts:666; Filter.run :3209;
 * Checks = Check[] = (Filter|FilterGroup)[]; Encoding = Link[] with
 * Link.transformation : Transformation|Middleware :403-405.
 */
export const CLOSURE_BEARING_NAMES: ReadonlySet<string> = new Set([
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
export const DERIVED_CACHE_FIELDS: ReadonlySet<string> = new Set([
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

// ---------- inventory record shapes ----------

export interface FieldEntry {
  name: string
  typeText: string
  kind: "data" | "closure" | "closure-bearing" | "derived-cache"
  kindBy: "syntax" | "name-table"
  declLine: number
  optional: boolean
}

export interface CtorParam {
  name: string
  typeText: string
  optional: boolean
  hasDefault: boolean
}

export interface VariantEntry {
  variant: string
  tagLiteral: string
  unionIndex: number
  declLine: number
  tagDeclLine: number
  fields: Array<FieldEntry>
  ctorParams: Array<CtorParam>
}

// ---------- cross-checks (fail loudly; census §7 item 6) ----------

const setEq = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean =>
  a.length === new Set(a).size &&
  b.length === new Set(b).size &&
  a.length === b.length &&
  [...a].sort().join(" ") === [...b].sort().join(" ")

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

// ---------- deterministic emit ----------

export const emit = (inventory: unknown): string => JSON.stringify(inventory, null, 2) + "\n"

/**
 * The cross-instrument gate's normalization, in one place.
 *
 * Two legs must produce byte-identical inventories EXCEPT for the two fields in which
 * each declares its own identity — a leg that copied the other's would be impersonating
 * it (TOOLS.md, the lean4-tree-sitter row). Everything else moving is a gate failure.
 */
export const normalizeInstrument = (inventoryJson: string): string =>
  inventoryJson
    .replace(/"instrument": "[^"]*"/, '"instrument": "<normalized>"')
    .replace(/"instrumentVersion": "[^"]*"/, '"instrumentVersion": "<normalized>"')
