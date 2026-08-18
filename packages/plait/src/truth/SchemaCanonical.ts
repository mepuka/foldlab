/**
 * Plane: truth — the vocabulary every sentence speaks.
 *
 * Canonical JSON derived from a schema's own tree.
 *
 * An Effect schema is not only a validator; it carries a runtime tree
 * (`SchemaAST`) describing exactly the shape it admits. This module walks that
 * tree once and returns a canonical-JSON writer for the schema, so the
 * both-ways law - parse, then write, and get the same bytes - is earned once
 * for every schema rather than hand-written per record type. Add a record type
 * to the interchange and its writer arrives with its schema.
 *
 * What the walk buys beyond a structural canonicalizer: it refuses, at
 * derivation time and before any data exists, a schema that cannot have a
 * canonical form. A schema carrying a JavaScript `number` is refused because
 * the interchange's number rule admits only unbounded integers; a schema
 * carrying a decode/encode transformation is refused because the walked view
 * would then not be the view that reaches the wire. Those are compile-run
 * refusals of a *type*, which no amount of testing over values would give.
 *
 * The escape hatch is deliberate and narrow: `Schema.Unknown` (an "any JSON
 * value" position, which the interchange's canon vectors need) falls back to a
 * structural walk of the value itself. Everywhere else, the schema is the
 * authority on shape.
 *
 * @module
 */
import { Schema, SchemaAST, SchemaIssue } from "effect"

import {
  encodeCanonicalJson,
  parseCanonicalJson,
  type CanonicalJson,
} from "./CanonicalJson.js"

/** Raised when a schema has no canonical writer, or a value does not fit one. */
export class SchemaCanonicalError extends Error {
  override readonly name = "SchemaCanonicalError"
  constructor(message: string) {
    super(message)
  }
}

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (message: string) => never = (message) => {
  throw new SchemaCanonicalError(message)
}

/** A value writer derived from one schema node: value in, canonical value out. */
type Writer = (value: unknown, at: string) => CanonicalJson

/**
 * The structural fallback, used only where a schema says `unknown`. It accepts
 * exactly what the canonical domain carries and refuses the rest, so an "any
 * JSON value" position cannot smuggle in a float or a `Date`.
 */
const structural: Writer = (value, at) => {
  if (value === null) return null
  switch (typeof value) {
    case "boolean":
    case "string":
    case "bigint":
      return value
    case "object": {
      if (Array.isArray(value)) {
        return (value as ReadonlyArray<unknown>)
          .map((entry, index) => structural(entry, `${at}[${index}]`))
      }
      const out: { [key: string]: CanonicalJson } = {}
      for (const [key, member] of Object.entries(value as { [key: string]: unknown })) {
        out[key] = structural(member, `${at}.${key}`)
      }
      return out
    }
    default:
      return refuse(`${at}: a ${typeof value} has no canonical JSON form`)
  }
}

const expect = (condition: boolean, at: string, wanted: string, value: unknown): void => {
  if (!condition) refuse(`${at}: expected ${wanted}, got ${typeof value}`)
}

/**
 * The literal values a canonical writer can emit. A `number` literal is absent
 * on purpose: the interchange writes integers, and a JavaScript number cannot
 * promise to be one.
 */
const literalWriter = (literal: SchemaAST.LiteralValue): Writer => {
  if (typeof literal === "number") {
    return refuse(
      `the literal ${literal} is a JavaScript number; the interchange admits only unbounded` +
        ` integers, so write it as a bigint literal`,
    )
  }
  return (value, at) => {
    if (value !== literal) {
      refuse(`${at}: expected the literal ${String(literal)}, got ${String(value)}`)
    }
    return literal as CanonicalJson
  }
}

/**
 * The discriminant of a tagged union, if the members have one: a property name
 * every member carries as a distinct literal. Finding it in the tree is what
 * turns a union writer from try-each-in-turn into a single lookup, and it is
 * what lets a mismatched value name the tag it failed on.
 */
const discriminantOf = (
  members: ReadonlyArray<SchemaAST.AST>,
): { readonly key: string; readonly literals: ReadonlyArray<SchemaAST.LiteralValue> } | undefined => {
  const objects = members.filter(SchemaAST.isObjects)
  if (objects.length !== members.length || objects.length === 0) return undefined
  const first = objects[0]!
  for (const candidate of first.propertySignatures) {
    if (typeof candidate.name !== "string") continue
    const literals: Array<SchemaAST.LiteralValue> = []
    for (const member of objects) {
      const property = member.propertySignatures
        .find((signature) => signature.name === candidate.name)
      if (property === undefined || !SchemaAST.isLiteral(property.type)) break
      literals.push(property.type.literal)
    }
    if (literals.length !== objects.length) continue
    if (new Set(literals.map(String)).size !== literals.length) continue
    return { key: candidate.name, literals }
  }
  return undefined
}

const objectWriter = (ast: SchemaAST.Objects, derive: (node: SchemaAST.AST) => Writer): Writer => {
  const properties = ast.propertySignatures.map((signature) => {
    if (typeof signature.name !== "string") {
      return refuse("a canonical object member must have a string key")
    }
    return {
      name: signature.name,
      optional: signature.type.context?.isOptional === true,
      write: derive(signature.type),
    }
  })
  const named = new Set(properties.map((property) => property.name))
  // An index signature is how a schema says "further members, all of this
  // shape" - the interchange's counts block is exactly that, and the freeze's
  // add-only rule means a consumer must carry members it does not yet name.
  const rest = ast.indexSignatures.length === 0
    ? undefined
    : ast.indexSignatures.length === 1 && SchemaAST.isString(ast.indexSignatures[0]!.parameter)
    ? derive(ast.indexSignatures[0]!.type)
    : refuse("a canonical object admits at most one string index signature")

  return (value, at) => {
    expect(typeof value === "object" && value !== null && !Array.isArray(value), at, "an object", value)
    const source = value as { readonly [key: string]: unknown }
    const out: { [key: string]: CanonicalJson } = {}
    for (const property of properties) {
      const member = source[property.name]
      if (member === undefined) {
        if (property.optional) continue
        refuse(`${at}.${property.name}: the member is missing`)
      }
      out[property.name] = property.write(member, `${at}.${property.name}`)
    }
    for (const [key, member] of Object.entries(source)) {
      if (named.has(key) || member === undefined) continue
      if (rest === undefined) refuse(`${at}.${key}: the schema declares no such member`)
      out[key] = rest(member, `${at}.${key}`)
    }
    return out
  }
}

const arrayWriter = (ast: SchemaAST.Arrays, derive: (node: SchemaAST.AST) => Writer): Writer => {
  const elements = ast.elements.map(derive)
  if (ast.rest.length > 1) {
    return refuse("a canonical array admits at most one rest element")
  }
  const rest = ast.rest.length === 1 ? derive(ast.rest[0]!) : undefined
  return (value, at) => {
    expect(Array.isArray(value), at, "an array", value)
    const source = value as ReadonlyArray<unknown>
    if (source.length < elements.length || (rest === undefined && source.length !== elements.length)) {
      refuse(`${at}: expected ${elements.length}${rest === undefined ? "" : " or more"} entries,` +
        ` got ${source.length}`)
    }
    return source.map((entry, index) => {
      const write = elements[index] ?? rest!
      return write(entry, `${at}[${index}]`)
    })
  }
}

const unionWriter = (ast: SchemaAST.Union, derive: (node: SchemaAST.AST) => Writer): Writer => {
  const writers = ast.types.map(derive)
  const discriminant = discriminantOf(ast.types)
  if (discriminant !== undefined) {
    const byTag = new Map<string, Writer>()
    discriminant.literals.forEach((literal, index) => byTag.set(String(literal), writers[index]!))
    return (value, at) => {
      expect(typeof value === "object" && value !== null, at, "a tagged object", value)
      const tag = (value as { readonly [key: string]: unknown })[discriminant.key]
      const write = byTag.get(String(tag))
      if (write === undefined) {
        refuse(
          `${at}.${discriminant.key}: ${String(tag)} names no member of the union` +
            ` (${[...byTag.keys()].join(", ")})`,
        )
      }
      return write(value, at)
    }
  }
  return (value, at) => {
    const reasons: Array<string> = []
    for (const write of writers) {
      try {
        return write(value, at)
      } catch (error) {
        reasons.push(error instanceof Error ? error.message : String(error))
      }
    }
    return refuse(`${at}: no member of the union accepts the value\n  ${reasons.join("\n  ")}`)
  }
}

const deriveWriter = (
  ast: SchemaAST.AST,
  memo: Map<SchemaAST.AST, Writer>,
): Writer => {
  const found = memo.get(ast)
  if (found !== undefined) return found
  if (ast.encoding !== undefined) {
    return refuse(
      `a schema carrying an encoding transformation has two views and no single canonical` +
        ` form; canonicalize the encoded schema instead (at a ${ast._tag} node)`,
    )
  }
  const derive = (node: SchemaAST.AST): Writer => deriveWriter(node, memo)
  switch (ast._tag) {
    case "String":
    case "TemplateLiteral": {
      const writer: Writer = (value, at) => {
        expect(typeof value === "string", at, "a string", value)
        return value as string
      }
      memo.set(ast, writer)
      return writer
    }
    case "BigInt": {
      const writer: Writer = (value, at) => {
        expect(typeof value === "bigint", at, "a bigint", value)
        return value as bigint
      }
      memo.set(ast, writer)
      return writer
    }
    case "Boolean": {
      const writer: Writer = (value, at) => {
        expect(typeof value === "boolean", at, "a boolean", value)
        return value as boolean
      }
      memo.set(ast, writer)
      return writer
    }
    case "Null": {
      const writer: Writer = (value, at) => {
        expect(value === null, at, "null", value)
        return null
      }
      memo.set(ast, writer)
      return writer
    }
    case "Literal": {
      const writer = literalWriter(ast.literal)
      memo.set(ast, writer)
      return writer
    }
    case "Unknown":
    case "Any": {
      memo.set(ast, structural)
      return structural
    }
    case "Objects": {
      // Registered before the walk descends, so a self-referencing shape does
      // not recur forever.
      let inner: Writer | undefined
      const lazy: Writer = (value, at) => (inner ?? refuse("the writer is not built yet"))(value, at)
      memo.set(ast, lazy)
      inner = objectWriter(ast, derive)
      return lazy
    }
    case "Arrays": {
      let inner: Writer | undefined
      const lazy: Writer = (value, at) => (inner ?? refuse("the writer is not built yet"))(value, at)
      memo.set(ast, lazy)
      inner = arrayWriter(ast, derive)
      return lazy
    }
    case "Union": {
      let inner: Writer | undefined
      const lazy: Writer = (value, at) => (inner ?? refuse("the writer is not built yet"))(value, at)
      memo.set(ast, lazy)
      inner = unionWriter(ast, derive)
      return lazy
    }
    case "Suspend": {
      let inner: Writer | undefined
      const lazy: Writer = (value, at) => {
        inner ??= derive(ast.thunk())
        return inner(value, at)
      }
      memo.set(ast, lazy)
      return lazy
    }
    case "Number":
      return refuse(
        "a schema node of JavaScript numbers has no canonical form: the interchange writes" +
          " unbounded integers, so use the bigint carrier",
      )
    default:
      return refuse(`a ${ast._tag} schema node has no canonical JSON form`)
  }
}

/** A canonical writer derived from one schema: to a value, and to bytes. */
export interface CanonicalWriter<A> {
  /** The schema's value, as a canonical JSON value. */
  readonly toCanonical: (value: A) => CanonicalJson
  /** The schema's value, as its one canonical byte string. */
  readonly toText: (value: A) => string
}

/**
 * Derives the canonical writer for a schema by walking its tree.
 *
 * Throws {@link SchemaCanonicalError} at derivation time - not at first use -
 * when the schema admits something the canonical domain does not.
 */
export const canonicalWriter = <S extends Schema.Top>(schema: S): CanonicalWriter<S["Type"]> => {
  const write = deriveWriter(schema.ast, new Map<SchemaAST.AST, Writer>())
  const toCanonical = (value: S["Type"]): CanonicalJson => write(value, "$")
  return { toCanonical, toText: (value) => encodeCanonicalJson(toCanonical(value)) }
}

/** The result of reading one canonical record through a schema. */
export type CanonicalRead<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly reason: string }

/**
 * Reads canonical text through a schema: parse to the canonical domain, then
 * decode. A schema failure is reported with the annotated message the schema
 * itself carries, so an identifier or a description written on a field is what
 * a reader sees when that field is wrong.
 */
export const decodeCanonicalText = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  text: string,
): CanonicalRead<S["Type"]> => {
  let parsed: CanonicalJson
  try {
    parsed = parseCanonicalJson(text)
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
  const decoded = Schema.decodeUnknownResult(schema)(parsed)
  return decoded._tag === "Success"
    ? { ok: true, value: decoded.success }
    : { ok: false, reason: SchemaIssue.makeFormatterDefault()(decoded.failure.issue) }
}

/**
 * The both-ways law for one record and one schema: the text parses, decodes,
 * and writes back to the same bytes. A `false` here means the text was not
 * canonical, the schema does not describe it, or the schema's own writer
 * disagrees with the bytes - all three are the same defect from the wire's
 * point of view.
 */
export const roundTripsCanonically = <S extends Schema.Top & Schema.ConstraintDecoder<unknown>>(
  schema: S,
  text: string,
): CanonicalRead<string> => {
  const read = decodeCanonicalText(schema, text)
  if (!read.ok) return read
  let written: string
  try {
    written = canonicalWriter(schema).toText(read.value)
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
  return written === text
    ? { ok: true, value: written }
    : { ok: false, reason: `re-emission moved:\n  read  ${text}\n  wrote ${written}` }
}
