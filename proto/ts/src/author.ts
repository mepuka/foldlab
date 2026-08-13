// The author fold: Effect Schema → flb.type.v0. Partial on purpose —
// v0 covers a slice of SchemaAST; anything beyond refuses with the same
// uniform refusal shape the daemon uses (marked local). The check-name
// table maps the pin's filter representation ids onto foldlab-owned
// names: alignment of meaning, independence of preimage — a pin bump
// that renames a representation breaks THIS table loudly, never a
// digest silently.
import type { Schema } from "effect"
import type { SchemaAST } from "effect"
import { canonicalize, structureDigest, type Json } from "./jcs.ts"
import { localRefusal, type Refusal } from "./wire.ts"

export type V0 = { [key: string]: Json }

export type FoldResult =
  | { readonly ok: true; readonly structure: V0; readonly digest: string; readonly canonical: string }
  | { readonly ok: false; readonly refusal: Refusal }

/** The authoring marker for refs: a compiled ref schema carries the
 * target digest as an annotation so re-folding recovers the ref instead
 * of the inlined target. The one annotation that is identity-bearing —
 * the carve-out is logged in DECISIONS.md. */
export const REF_ANNOTATION = "flb.ref"

interface CheckMapping {
  readonly name: string
  readonly args: (payload: any) => Record<string, Json>
}

/** representation id → foldlab-owned check name + args shape. */
const CHECK_TABLE: Record<string, CheckMapping> = {
  "effect/schema/isMinLength": { name: "minLength", args: (p) => ({ min: p.minLength }) },
  "effect/schema/isMaxLength": { name: "maxLength", args: (p) => ({ max: p.maxLength }) },
  "effect/schema/isPattern": {
    name: "pattern",
    args: (p) => ({ source: p.source, flags: p.flags ?? "" }),
  },
  "effect/schema/isGreaterThan": {
    name: "greaterThan",
    args: (p) => ({ exclusiveMin: p.exclusiveMinimum }),
  },
  "effect/schema/isGreaterThanOrEqualTo": { name: "min", args: (p) => ({ min: p.minimum }) },
  "effect/schema/isLessThan": {
    name: "lessThan",
    args: (p) => ({ exclusiveMax: p.exclusiveMaximum }),
  },
  "effect/schema/isLessThanOrEqualTo": { name: "max", args: (p) => ({ max: p.maximum }) },
}

const INT_REPRESENTATION = "effect/schema/isInt"

// The fold threads either a structure or a refusal; Fail wraps the
// refusal so the two cannot be confused structurally.
class Fail {
  constructor(readonly refusal: Refusal) {}
}

const beyond = (path: ReadonlyArray<string>, got: unknown, why: string): Fail =>
  new Fail(
    localRefusal(
      "beyond-v0",
      `flb.type.v0 cannot express this schema yet: ${why} — the grammar grows under ticket 004, never by a parallel encoding`,
      { path, got: String(got) },
    ),
  )

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

interface FlatCheck {
  readonly id: string | undefined
  readonly payload: unknown
}

/** Flatten Filter/FilterGroup checks into (representation id, payload)
 * pairs; a check with no representation has no canonical bytes. */
const flattenChecks = (checks: readonly unknown[] | undefined): FlatCheck[] => {
  const out: FlatCheck[] = []
  const visit = (check: any): void => {
    if (check._tag === "FilterGroup") {
      for (const inner of check.checks) visit(inner)
      return
    }
    const representation = check.annotations?.representation
    out.push({ id: representation?.id, payload: representation?.payload })
  }
  for (const check of checks ?? []) visit(check)
  return out
}

const foldNode = (ast: SchemaAST.AST, path: ReadonlyArray<string>): V0 | Fail => {
  const node = ast as any

  if (node.encoding !== undefined) {
    return beyond(path, node._tag, "transformations (encoding links) are not in v0")
  }

  const checks = flattenChecks(node.checks)
  const isInt = node._tag === "Number" && checks.some((c) => c.id === INT_REPRESENTATION)
  const declaredChecks = isInt ? checks.filter((c) => c.id !== INT_REPRESENTATION) : checks

  // The ref marker wins over the structural tag: a compiled ref folds
  // back to the ref, not to the inlined target.
  const refDigest = node.annotations?.[REF_ANNOTATION]
  const base: V0 | Fail =
    typeof refDigest === "string"
      ? { k: "ref", digest: refDigest }
      : foldBase(node, path, isInt)
  if (base instanceof Fail) return base

  let structure: V0 = base
  for (const check of declaredChecks) {
    if (check.id === undefined) {
      return beyond(path, node._tag, "an anonymous check has no canonical form and cannot claim identity")
    }
    const mapping = CHECK_TABLE[check.id]
    if (mapping === undefined) {
      return beyond(path, check.id, "this check has no entry in the v0 check table")
    }
    structure = {
      k: "check",
      base: structure,
      check: { name: mapping.name, args: mapping.args(check.payload) },
    }
  }

  const brands = node.annotations?.brands
  if (Array.isArray(brands)) {
    for (const brand of brands) {
      structure = { k: "brand", name: String(brand), of: structure }
    }
  }
  return structure
}

const foldBase = (node: any, path: ReadonlyArray<string>, isInt: boolean): V0 | Fail => {
  switch (node._tag) {
    case "String":
      return { k: "string" }
    case "Boolean":
      return { k: "bool" }
    case "Number":
      return { k: isInt ? "int" : "float" }
    case "Null":
      return { k: "null" }
    case "Literal": {
      const literal = node.literal
      if (
        typeof literal === "string" ||
        typeof literal === "boolean" ||
        (typeof literal === "number" && Number.isFinite(literal)) ||
        literal === null
      ) {
        return { k: "literal", value: literal }
      }
      return beyond(path, String(literal), "only JSON-scalar literals exist in v0")
    }
    case "Arrays": {
      if (node.elements.length !== 0 || node.rest.length !== 1) {
        return beyond(path, node._tag, "tuples and rest-element mixes are not in v0 — only homogeneous lists")
      }
      const of = foldNode(node.rest[0], [...path, "of"])
      if (of instanceof Fail) return of
      return { k: "list", of }
    }
    case "Objects": {
      if (node.indexSignatures.length > 0) {
        return beyond(path, node._tag, "index signatures (records) are not in v0")
      }
      const fields: Record<string, Json> = {}
      const optional: string[] = []
      for (const ps of node.propertySignatures) {
        if (typeof ps.name !== "string") {
          return beyond(path, String(ps.name), "symbol-named fields have no canonical form")
        }
        const folded = foldNode(ps.type, [...path, "fields", ps.name])
        if (folded instanceof Fail) return folded
        fields[ps.name] = folded
        if (ps.type.context?.isOptional === true) optional.push(ps.name)
      }
      optional.sort(byCodeUnit)
      return { k: "struct", fields, optional }
    }
    case "Union": {
      if (node.mode !== "anyOf") return beyond(path, node.mode, 'only "anyOf" unions are in v0')
      const members: Json[] = []
      for (let index = 0; index < node.types.length; index++) {
        const folded = foldNode(node.types[index], [...path, "of", String(index)])
        if (folded instanceof Fail) return folded
        members.push(folded)
      }
      return { k: "union", of: members }
    }
    default:
      return beyond(path, node._tag, `the ${node._tag} node is beyond v0`)
  }
}

/** Fold an Effect Schema into its flb.type.v0 structure, canonical
 * bytes, and digest. Partial: refuses beyond v0 as data (W8 holds on
 * the authoring side too). */
export const foldSchema = (schema: Schema.Top): FoldResult => {
  const folded = foldNode(schema.ast, ["structure"])
  if (folded instanceof Fail) return { ok: false, refusal: folded.refusal }
  return {
    ok: true,
    structure: folded,
    digest: structureDigest(folded),
    canonical: canonicalize(folded),
  }
}
