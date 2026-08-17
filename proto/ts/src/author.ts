// The author fold: Effect Schema → flb.type.v0. Partial on purpose —
// v0 covers a slice of SchemaAST; anything beyond refuses with the same
// uniform refusal shape the daemon uses (marked local). The check-name
// table maps the pin's filter representation ids onto foldlab-owned
// names: alignment of meaning, independence of preimage — a pin bump
// that renames a representation breaks THIS table loudly, never a
// digest silently.
import type { SchemaAST } from "effect"
import { Schema } from "effect"
import {
  canonicalize,
  canonicalizeStructure,
  compareCanonicalBytes,
  findNonIntegralNumber,
  INTEGRAL_NUMBER_LAW,
  structureDigest,
  type CanonicalRefusal,
  type Json,
  type StructureRefusal,
} from "./jcs.ts"
import { localRefusal, type Refusal } from "./wire.ts"

export type V0 = { [key: string]: Json }

export type FoldResult =
  | { readonly ok: true; readonly structure: V0; readonly digest: string; readonly canonical: string }
  | { readonly ok: false; readonly refusal: Refusal }

const HEX_DIGEST = /^[0-9a-f]{64}$/

/** Author a cross-type reference as an opaque Effect Declaration. The
 * optional target supplies runtime validation without entering the AST;
 * the Declaration's required identifier is the reference digest. */
export const ref = (
  digest: string,
  target: Schema.Top = Schema.Unknown,
): Schema.declare<unknown> => {
  const isTarget = Schema.is(target)
  return Schema.declare<unknown>((input): input is unknown => isTarget(input), {
    identifier: digest,
  })
}

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

const nonCanonical = (path: ReadonlyArray<string>, refusal: CanonicalRefusal): Fail =>
  new Fail(
    localRefusal(
      "invalid-structure",
      `flb.type.v0 cannot claim identity outside the RFC 8785 domain: ${refusal.reason}`,
      {
        path: [...path, refusal.path],
        got: refusal.reason,
        expected: "a finite, acyclic plain JSON value containing only Unicode scalar strings",
      },
    ),
  )

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** A structure identity can fail for two reasons and the fold reports each in
 * its own words. The non-integral branch is unreachable from `foldSchema`, which
 * sweeps the folded term before it mints, and it is written out rather than cast
 * away because "unreachable" is a claim the next edit can silently break. */
const noIdentity = (path: ReadonlyArray<string>, refusal: StructureRefusal): Fail =>
  refusal._tag === "NonIntegralNumber"
    ? beyond(path, refusal.path, refusal.reason)
    : nonCanonical(path, refusal)

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

  const base = foldBase(node, path, isInt)
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
      return isInt
        ? { k: "int" }
        : beyond(path, node._tag, "non-integer numbers have no v0 leaf; use int, a literal, or opaque")
    case "Null":
      return { k: "null" }
    case "Unknown":
      return { k: "opaque" }
    case "Declaration": {
      // Law: an annotation is identity-bearing exactly when it is the
      // node's only canonicalizable substance. A ref is a Declaration
      // whose required identifier is the referenced digest.
      if (node.typeParameters.length !== 0) {
        return beyond(path, node._tag, "only non-parametric Declarations can represent refs in v0")
      }
      const identifier = node.annotations?.identifier
      if (typeof identifier !== "string" || !HEX_DIGEST.test(identifier)) {
        return beyond(
          path,
          identifier,
          "a Declaration ref requires a 64-char lowercase hex digest as its identifier",
        )
      }
      return { k: "ref", digest: identifier }
    }
    case "Literal": {
      const literal = node.literal
      if (
        typeof literal === "string" ||
        typeof literal === "boolean" ||
        literal === null
      ) {
        return { k: "literal", value: literal }
      }
      // Shape only. The number bound is NOT restated here: the closure law in
      // foldSchema passes every number in the finished term, this one included.
      if (typeof literal === "number") return { k: "literal", value: literal }
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
      const members: Array<{ readonly value: Json; readonly canonical: string }> = []
      for (let index = 0; index < node.types.length; index++) {
        const folded = foldNode(node.types[index], [...path, "of", String(index)])
        if (folded instanceof Fail) return folded
        const encoded = canonicalize(folded)
        if (!encoded.ok) return nonCanonical([...path, "of", String(index)], encoded.refusal)
        members.push({ value: folded, canonical: encoded.bytes })
      }
      // Law: order never moves identity in an unordered collection.
      members.sort((left, right) => compareCanonicalBytes(left.canonical, right.canonical))
      for (let index = 1; index < members.length; index++) {
        if (members[index - 1]!.canonical === members[index]!.canonical) {
          return new Fail(
            localRefusal(
              "invalid-structure",
              "flb.type.v0: union members must be unique after canonical-byte sorting",
              {
                path: [...path, "of", String(index)],
                got: members[index]!.value,
                expected: "a member with distinct canonical bytes",
                example: {
                  k: "union",
                  of: [{ k: "null" }, { k: "string" }],
                },
              },
            ),
          )
        }
      }
      return { k: "union", of: members.map((member) => member.value) }
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
  // The closure law runs over the finished term, after the shape fold, so a
  // shape v0 cannot express still teaches its own reason. Coordinates are the
  // term's, matching the certifier's refusal paths exactly. The traversal is
  // jcs.ts's, shared with the identity mint; only the refusal wording is the
  // fold's, because a fold refusal and a mint refusal are uttered to different
  // callers.
  const nonIntegral = findNonIntegralNumber(folded as Json, ["structure"])
  if (nonIntegral !== undefined) {
    return {
      ok: false,
      refusal: beyond(nonIntegral.path, String(nonIntegral.value), INTEGRAL_NUMBER_LAW).refusal,
    }
  }
  const canonical = canonicalizeStructure(folded)
  if (!canonical.ok) return { ok: false, refusal: nonCanonical(["structure"], canonical.refusal).refusal }
  const identity = structureDigest(folded)
  if (!identity.ok) return { ok: false, refusal: noIdentity(["structure"], identity.refusal).refusal }
  return {
    ok: true,
    structure: folded,
    digest: identity.digest,
    canonical: canonical.bytes,
  }
}
