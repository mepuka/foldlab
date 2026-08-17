// Codegen: semantic folds over a digest-anchored flb.type.v0 structure.
// Three targets — effect-schema (a live Schema value), json-schema
// (draft 2020-12 object), go (source text). Derivation failures are
// data (the uniform refusal, local), never throws. The effect-schema
// target owes the round-trip wall: derive → compile → re-fold → same
// digest (test/codegen.test.ts, over the frozen fixture corpus).
import { Schema } from "effect"
import { ref } from "./author.ts"
import { SCHEME, structureDigest, type Json } from "./jcs.ts"
import { localRefusal, type Refusal } from "./wire.ts"

export type Derived<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly refusal: Refusal }

/** Resolves a ref digest to its cataloged structure — the read-side of
 * the catalog, supplied by the caller (e.g. from a verified catalog
 * read). Absence is `undefined`; the derivation turns it into a typed
 * refusal. */
export type Resolve = (digest: string) => Json | undefined

class Fail {
  constructor(readonly refusal: Refusal) {}
}

const underivable = (path: ReadonlyArray<string>, got: unknown, why: string): Fail =>
  new Fail(localRefusal("underivable", `codegen cannot derive this structure: ${why}`, {
    path,
    got: got === undefined ? "undefined" : (got as Json),
  }))

const node = (value: Json): Record<string, Json> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : undefined

// Law: evidence paths use identity's RFC 8785 UTF-16 code-unit key order;
// construction history never leaks.
const fieldNamesInIdentityOrder = (fields: Record<string, Json>): ReadonlyArray<string> =>
  Object.keys(fields).sort()

/** Pattern metadata is executable in one target, so every target validates it
 * before lowering and agrees on the same refusal instead of one throwing. */
const patternFor = (
  check: Record<string, Json> | undefined,
  path: ReadonlyArray<string>,
): RegExp | Fail | undefined => {
  if (check?.["name"] !== "pattern") return undefined
  const args = node(check["args"] as Json) ?? {}
  const source = args["source"]
  const flags = args["flags"] ?? ""
  if (typeof source !== "string") {
    return underivable(
      [...path, "check", "args", "source"],
      source,
      "pattern source must be a string",
    )
  }
  if (typeof flags !== "string") {
    return underivable(
      [...path, "check", "args", "flags"],
      flags,
      "pattern flags must be a string",
    )
  }
  try {
    return new RegExp(source, flags)
  } catch {
    return underivable(
      [...path, "check", "args", "source"],
      source,
      "pattern source and flags do not form a regular expression",
    )
  }
}

/** `readonly` types do not validate catalog bytes. Keep raw callers total and
 * give every target the same evidence path for malformed struct metadata. */
const optionalFields = (
  n: Record<string, Json>,
  path: ReadonlyArray<string>,
): ReadonlySet<string> | Fail => {
  const optional = n["optional"]
  if (optional === undefined) return new Set()
  if (!Array.isArray(optional)) {
    return underivable(
      [...path, "optional"],
      optional,
      "struct optional metadata must be an array",
    )
  }
  return new Set(optional.map(String))
}

// ——— effect-schema target ———

/** name → builder over (args). Inverse of the author fold's table. */
const CHECK_BUILDERS: Record<string, (args: Record<string, Json>) => any> = {
  minLength: (a) => Schema.isMinLength(a["min"] as number),
  maxLength: (a) => Schema.isMaxLength(a["max"] as number),
  greaterThan: (a) => Schema.isGreaterThan(a["exclusiveMin"] as number),
  min: (a) => Schema.isGreaterThanOrEqualTo(a["min"] as number),
  lessThan: (a) => Schema.isLessThan(a["exclusiveMax"] as number),
  max: (a) => Schema.isLessThanOrEqualTo(a["max"] as number),
}

const toSchemaNode = (
  value: Json,
  path: ReadonlyArray<string>,
  resolve: Resolve,
): any | Fail => {
  const n = node(value)
  if (n === undefined) return underivable(path, value, "not an flb.type.v0 node")
  switch (n["k"]) {
    case "string":
      return Schema.String
    case "bool":
      return Schema.Boolean
    case "int":
      return Schema.Int
    case "null":
      return Schema.Null
    case "opaque":
      return Schema.Unknown
    case "hole":
      return underivable([...path, "k"], "hole", "holes are authoring-only and never derive from catalog data")
    case "literal":
      return Schema.Literal(n["value"] as any)
    case "list": {
      const of = toSchemaNode(n["of"] as Json, [...path, "of"], resolve)
      if (of instanceof Fail) return of
      return Schema.Array(of)
    }
    case "struct": {
      const fields = node(n["fields"] as Json) ?? {}
      const optional = optionalFields(n, path)
      if (optional instanceof Fail) return optional
      const built: Record<string, any> = {}
      for (const name of fieldNamesInIdentityOrder(fields)) {
        const field = toSchemaNode(fields[name] as Json, [...path, "fields", name], resolve)
        if (field instanceof Fail) return field
        built[name] = optional.has(name) ? Schema.optionalKey(field) : field
      }
      return Schema.Struct(built)
    }
    case "union": {
      const members: any[] = []
      const of = (n["of"] as Json[]) ?? []
      for (let index = 0; index < of.length; index++) {
        const member = toSchemaNode(of[index] as Json, [...path, "of", String(index)], resolve)
        if (member instanceof Fail) return member
        members.push(member)
      }
      return Schema.Union(members)
    }
    case "brand": {
      const of = toSchemaNode(n["of"] as Json, [...path, "of"], resolve)
      if (of instanceof Fail) return of
      return of.pipe(Schema.brand(String(n["name"])))
    }
    case "check": {
      const base = toSchemaNode(n["base"] as Json, [...path, "base"], resolve)
      if (base instanceof Fail) return base
      const check = node(n["check"] as Json)
      const name = String(check?.["name"])
      const pattern = patternFor(check, path)
      if (pattern instanceof Fail) return pattern
      if (pattern !== undefined) return base.check(Schema.isPattern(pattern))
      const builder = CHECK_BUILDERS[name]
      if (builder === undefined) {
        return underivable([...path, "check", "name"], name, "this check name has no v0 builder")
      }
      return base.check(builder(node(check?.["args"] as Json) ?? {}))
    }
    case "ref": {
      const digest = String(n["digest"])
      const target = resolve(digest)
      if (target === undefined) {
        return underivable([...path, "digest"], digest, "the ref does not resolve — supply a catalog read")
      }
      const compiled = toSchemaNode(target, [...path, "(ref)"], resolve)
      if (compiled instanceof Fail) return compiled
      return ref(digest, compiled)
    }
    default:
      return underivable([...path, "k"], n["k"], "unknown kind")
  }
}

export const toEffectSchema = (
  structure: Json,
  resolve: Resolve = () => undefined,
): Derived<Schema.Top> => {
  const built = toSchemaNode(structure, ["structure"], resolve)
  if (built instanceof Fail) return { ok: false, refusal: built.refusal }
  return { ok: true, value: built }
}

// ——— json-schema target (draft 2020-12) ———

const toJsonSchemaNode = (
  value: Json,
  path: ReadonlyArray<string>,
): Record<string, Json> | Fail => {
  const n = node(value)
  if (n === undefined) return underivable(path, value, "not an flb.type.v0 node")
  switch (n["k"]) {
    case "string":
      return { type: "string" }
    case "bool":
      return { type: "boolean" }
    case "int":
      return { type: "integer" }
    case "null":
      return { type: "null" }
    case "opaque":
      return {}
    case "hole":
      return underivable([...path, "k"], "hole", "holes are authoring-only and never derive from catalog data")
    case "literal":
      return { const: n["value"] ?? null }
    case "list": {
      const items = toJsonSchemaNode(n["of"] as Json, [...path, "of"])
      if (items instanceof Fail) return items
      return { type: "array", items }
    }
    case "struct": {
      const fields = node(n["fields"] as Json) ?? {}
      const optional = optionalFields(n, path)
      if (optional instanceof Fail) return optional
      const properties: Record<string, Json> = {}
      const required: string[] = []
      for (const name of fieldNamesInIdentityOrder(fields)) {
        const property = toJsonSchemaNode(fields[name] as Json, [...path, "fields", name])
        if (property instanceof Fail) return property
        properties[name] = property
        if (!optional.has(name)) required.push(name)
      }
      return { type: "object", properties, required, additionalProperties: false }
    }
    case "union": {
      const members: Json[] = []
      for (const [index, member] of ((n["of"] as Json[]) ?? []).entries()) {
        const built = toJsonSchemaNode(member, [...path, "of", String(index)])
        if (built instanceof Fail) return built
        members.push(built)
      }
      return { anyOf: members }
    }
    case "brand": {
      const of = toJsonSchemaNode(n["of"] as Json, [...path, "of"])
      if (of instanceof Fail) return of
      return { ...of, "x-flb-brand": n["name"] ?? null }
    }
    case "check": {
      const base = toJsonSchemaNode(n["base"] as Json, [...path, "base"])
      if (base instanceof Fail) return base
      const check = node(n["check"] as Json)
      const pattern = patternFor(check, path)
      if (pattern instanceof Fail) return pattern
      const args = node(check?.["args"] as Json) ?? {}
      switch (check?.["name"]) {
        case "minLength":
          return { ...base, minLength: args["min"] ?? null }
        case "maxLength":
          return { ...base, maxLength: args["max"] ?? null }
        case "pattern":
          return { ...base, pattern: args["source"] ?? null }
        case "min":
          return { ...base, minimum: args["min"] ?? null }
        case "max":
          return { ...base, maximum: args["max"] ?? null }
        case "greaterThan":
          return { ...base, exclusiveMinimum: args["exclusiveMin"] ?? null }
        case "lessThan":
          return { ...base, exclusiveMaximum: args["exclusiveMax"] ?? null }
        default:
          // Declared checks the target cannot express ride along as
          // annotations — claims, not constraints.
          return { ...base, "x-flb-check": (n["check"] as Json) ?? null }
      }
    }
    case "ref":
      return { $ref: `flb:${n["digest"]}` }
    default:
      return underivable([...path, "k"], n["k"], "unknown kind")
  }
}

export const toJsonSchema = (structure: Json): Derived<Record<string, Json>> => {
  const built = toJsonSchemaNode(structure, ["structure"])
  if (built instanceof Fail) return { ok: false, refusal: built.refusal }
  return { ok: true, value: built }
}

// ——— go target (source text; verified by re-parse in the bullet) ———

const encodedGoIdent = (name: string): string => {
  // One fixed-width hex group per UTF-16 code unit is injective over every JS
  // string. X_ is reserved: readable names that would enter that prefix use
  // this encoding too, keeping the two ranges disjoint.
  let encoded = "X_"
  for (let index = 0; index < name.length; index++) {
    encoded += name.charCodeAt(index).toString(16).padStart(4, "0")
  }
  return encoded
}

const goFieldIdent = (name: string): string => {
  if (/^[a-z][A-Za-z0-9_]*$/.test(name)) {
    const readable = name.charAt(0).toUpperCase() + name.slice(1)
    if (!readable.startsWith("X_")) return readable
  }
  return encodedGoIdent(name)
}

const goTypeIdent = (name: string): string =>
  /^[A-Z][A-Za-z0-9_]*$/.test(name) && !name.startsWith("X_")
    ? name
    : encodedGoIdent(name)

const splitTrailingGoComment = (
  source: string,
): { readonly type: string; readonly comment?: string } => {
  const marker = source.lastIndexOf(" //")
  return marker > source.lastIndexOf("\n")
    ? { type: source.slice(0, marker), comment: source.slice(marker + 3).trimStart() }
    : { type: source }
}

const toGoType = (value: Json, path: ReadonlyArray<string>): string | Fail => {
  const n = node(value)
  if (n === undefined) return underivable(path, value, "not an flb.type.v0 node")
  switch (n["k"]) {
    case "string":
      return "string"
    case "bool":
      return "bool"
    case "int":
      return "int64"
    case "null":
      return "any // null"
    case "opaque":
      return "any // opaque"
    case "hole":
      return underivable([...path, "k"], "hole", "holes are authoring-only and never derive from catalog data")
    case "literal":
      return `any // literal ${JSON.stringify(n["value"] ?? null)}`
    case "union": {
      const members = (n["of"] as Json[]) ?? []
      for (let index = 0; index < members.length; index++) {
        const member = toGoType(members[index] as Json, [...path, "of", String(index)])
        if (member instanceof Fail) return member
      }
      return "any // union"
    }
    case "list": {
      const of = toGoType(n["of"] as Json, [...path, "of"])
      if (of instanceof Fail) return of
      return `[]${splitTrailingGoComment(of).type}`
    }
    case "brand": {
      const of = toGoType(n["of"] as Json, [...path, "of"])
      if (of instanceof Fail) return of
      return `${of.split(" //")[0]} // brand ${n["name"]}`
    }
    case "check": {
      const base = toGoType(n["base"] as Json, [...path, "base"])
      if (base instanceof Fail) return base
      const check = node(n["check"] as Json)
      const pattern = patternFor(check, path)
      if (pattern instanceof Fail) return pattern
      return `${base.split(" //")[0]} // check ${check?.["name"]}`
    }
    case "ref":
      return `any // ref ${n["digest"]}`
    case "struct": {
      const fields = node(n["fields"] as Json) ?? {}
      const optional = optionalFields(n, path)
      if (optional instanceof Fail) return optional
      const lines: string[] = ["struct {"]
      for (const name of fieldNamesInIdentityOrder(fields)) {
        const field = toGoType(fields[name] as Json, [...path, "fields", name])
        if (field instanceof Fail) return field
        const parts = splitTrailingGoComment(field)
        const goType = optional.has(name) ? `*${parts.type}` : parts.type
        const omit = optional.has(name) ? ",omitempty" : ""
        const comment = parts.comment !== undefined ? ` // ${parts.comment}` : ""
        lines.push(`\t${goFieldIdent(name)} ${goType} \`json:"${name}${omit}"\`${comment}`)
      }
      lines.push("}")
      return lines.join("\n")
    }
    default:
      return underivable([...path, "k"], n["k"], "unknown kind")
  }
}

/** Go source for one cataloged structure. The bullet's verification is
 * re-parse (gofmt accepts it); the byte-level codec wall is a stated
 * future obligation (SPEC §6). */
export const toGoSource = (structure: Json, typeName: string, digest: string): Derived<string> => {
  const identity = structureDigest(structure)
  if (!identity.ok) {
    return { ok: false, refusal: underivable(["structure"], structure, identity.refusal.reason).refusal }
  }
  const goType = toGoType(structure, ["structure"])
  if (goType instanceof Fail) return { ok: false, refusal: goType.refusal }
  const actualDigest = identity.digest
  if (digest !== actualDigest) {
    return {
      ok: false,
      refusal: localRefusal(
        "digest-mismatch",
        "codegen refuses to emit a permanent artifact whose asserted digest it cannot re-derive",
        { got: digest, expected: actualDigest },
      ),
    }
  }
  const source = [
    "// Code derived from a cataloged flb.type.v0 structure. DO NOT EDIT.",
    `// digest: ${actualDigest} (${SCHEME})`,
    "package flbtypes",
    "",
    `type ${goTypeIdent(typeName)} ${goType}`,
    "",
  ].join("\n")
  return { ok: true, value: source }
}
