/**
 * Canonical Effect Schema identity.
 *
 * Effect's persistent `SchemaRepresentation.Document` is the schema-plane
 * carrier. The CAS adds only its versioned node envelope and the declaration
 * reviver for typed CAS references; it does not maintain a parallel AST.
 */
import {
  Effect,
  Option,
  Predicate,
  Result,
  Schema,
  SchemaAST,
  SchemaRepresentation,
} from "effect"
import {
  Byte,
  ContentId,
  CasNodeInput,
  UnknownKind,
  type CasError,
} from "./Node.ts"
import {
  CasLoader,
  CasSchemeVersion,
  CasStore,
  encodeCasNode,
  type CasAddress,
} from "./Store.ts"
import {
  canonicalJson,
  decodedVersionedEnvelope,
  ProjectionCodecFailure,
  referenceRepresentation,
  referenceRepresentationReviver,
  type ProjectionError,
} from "./Value.ts"
import { SchemaKindTag } from "../internal/kindTags.ts"
import type { StoreFailure } from "./Node.ts"

/** The current projection revision of schema nodes. */
export const Revision = 1

/** The legacy private-AST revision, retained for read compatibility. */
export const LegacyRevision = 0

/** The reserved kind tag schema nodes carry. */
export const KindTag = SchemaKindTag

/** The non-persistent annotation used to pin a carrier to an identity. */
export const AnnotationKey = Symbol.for("foldlab/cas/canonical")

const strictOptions = {
  onExcessProperty: "error",
} satisfies SchemaAST.ParseOptions

const utf8Encoder = new TextEncoder()

const deepFreeze = <A>(value: A): A => {
  if (!Predicate.isObject(value) || Object.isFrozen(value)) return value
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key))
  }
  return Object.freeze(value)
}

/** Canonicalize only order-insensitive object property declarations inside
 * Effect's representation. Union, tuple, check, and reference order remain
 * semantic and are never rearranged. */
const normalizeRepresentationJson = (input: Schema.Json): Schema.Json => {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeRepresentationJson(item))
  }
  if (!Predicate.isObject(input)) return input

  const normalized: Record<string, Schema.Json> = Object.fromEntries(
    Object.entries(input as Schema.JsonObject).map(([key, value]) => [
      key,
      normalizeRepresentationJson(value),
    ]),
  )
  if (
    normalized._tag === "Objects"
    && Array.isArray(normalized.propertySignatures)
  ) {
    normalized.propertySignatures = [...normalized.propertySignatures]
      .toSorted((left, right) => {
        const leftName = Predicate.isObject(left) ? left.name : null
        const rightName = Predicate.isObject(right) ? right.name : null
        const leftText = canonicalJson(leftName)
        const rightText = canonicalJson(rightName)
        return leftText < rightText ? -1 : leftText > rightText ? 1 : 0
      })
  }
  return normalized
}

/** Decode into fresh Effect-owned data, reject excess properties, normalize
 * Effect's order-insensitive object fields, and freeze the identity snapshot. */
const documentFromJson = (
  input: Schema.Json,
  requireCanonicalOrder = true,
): SchemaRepresentation.Document => {
  const document = SchemaRepresentation.fromJson(input)
  const encoded = SchemaRepresentation.toJson(document)
  if (canonicalJson(input) !== canonicalJson(encoded)) {
    throw new TypeError(
      "Canonical schema representation contains unsupported or excess properties",
    )
  }
  const normalized = normalizeRepresentationJson(encoded)
  if (
    requireCanonicalOrder
    && canonicalJson(encoded) !== canonicalJson(normalized)
  ) {
    throw new TypeError("Canonical schema object fields are not in canonical order")
  }
  return deepFreeze(SchemaRepresentation.fromJson(normalized))
}

const snapshotDocument = (
  document: SchemaRepresentation.Document,
): SchemaRepresentation.Document =>
  documentFromJson(SchemaRepresentation.toJson(document), false)

const nativeDocument = (schema: Schema.Top): SchemaRepresentation.Document =>
  snapshotDocument(SchemaRepresentation.toRepresentation(schema.ast))

const documentOf = (
  identity: Schema.Top | SchemaRepresentation.Document,
): SchemaRepresentation.Document =>
  Schema.isSchema(identity) ? representationOf(identity) : snapshotDocument(identity)

/** The frozen native representation carried by a runtime schema. */
export const representationOf = (
  schema: Schema.Top,
): SchemaRepresentation.Document => {
  const carried = Reflect.get(schema.ast.annotations ?? {}, AnnotationKey)
  if (carried === undefined) return nativeDocument(schema)
  const json = Schema.decodeUnknownSync(Schema.Json, strictOptions)(carried)
  return documentFromJson(json)
}

const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  Schema.isIntReviver,
  Schema.isBetweenReviver,
  Schema.isPatternReviver,
  referenceRepresentationReviver,
]

/** Reconstruct a runtime Effect Schema from a persisted identity. */
export const fromRepresentation = (
  document: SchemaRepresentation.Document,
): Schema.Top => {
  const snapshot = snapshotDocument(document)
  return SchemaRepresentation.fromRepresentation(snapshot, { revivers }).annotate({
    [AnnotationKey]: deepFreeze(SchemaRepresentation.toJson(snapshot)),
  })
}

/** Construct a carrier from Effect's own AST, snapshotting through Effect's
 * persistent representation so later caller mutation cannot alter identity. */
export const fromAst = (ast: SchemaAST.AST): Schema.Top => {
  const document = snapshotDocument(SchemaRepresentation.toRepresentation(ast))
  return fromRepresentation(document)
}

/** Strictly decode a persisted native representation document. */
export const fromJson = (input: Schema.Json): SchemaRepresentation.Document =>
  documentFromJson(input)

/** A typed-reference declaration pinned to its expected resident kind tag. */
export const ref = (tag: number) => referenceRepresentation(Byte.make(tag))

/** Pin a runtime carrier to a canonical native representation snapshot. */
export const annotate = (
  identity: Schema.Top | SchemaRepresentation.Document,
) => <S extends Schema.Top>(schema: S) => {
  const document = documentOf(identity)
  const encoded = deepFreeze(SchemaRepresentation.toJson(document))
  return schema.annotate({ [AnnotationKey]: encoded })
}

/** Direct access to the native Effect AST denoted by the carrier's canonical
 * representation. A malformed carried snapshot fails closed as `None`. */
export const astOf = (schema: Schema.Top): Option.Option<SchemaAST.AST> =>
  Result.getSuccess(Result.try(() =>
    deepFreeze(fromRepresentation(representationOf(schema)).ast)
  ))

/** The envelope payload of a schema node. */
export const payloadOf = (
  identity: Schema.Top | SchemaRepresentation.Document,
): Uint8Array =>
  utf8Encoder.encode(canonicalJson({
    revision: Revision,
    value: SchemaRepresentation.toJson(documentOf(identity)),
  }))

/** The schema node itself: reserved kind, envelope payload, no references. */
export const nodeOf = (
  identity: Schema.Top | SchemaRepresentation.Document,
): CasNodeInput =>
  CasNodeInput.make({
    kind: { version: CasSchemeVersion, tag: KindTag },
    payload: payloadOf(identity),
    refs: [],
  })

/** The scheme-0 digest pre-image of a canonical schema. */
export const bytesOf = (
  identity: Schema.Top | SchemaRepresentation.Document,
): Uint8Array => encodeCasNode(nodeOf(identity))

/** The content address under an explicit address implementation. */
export const addressWith = (address: CasAddress) => (
  identity: Schema.Top | SchemaRepresentation.Document,
): Effect.Effect<ContentId, StoreFailure> =>
  address.digest(bytesOf(identity))

/** The canonical bytes declared by a carrying schema. Malformed annotations
 * fail closed as `None`. */
export const bytesFor = (schema: Schema.Top): Option.Option<Uint8Array> =>
  Result.getSuccess(Result.try(() => bytesOf(representationOf(schema))))

/** Admit a canonical schema into the store; its address is its name. */
export const put = (
  identity: Schema.Top | SchemaRepresentation.Document,
): Effect.Effect<ContentId, CasError, CasStore> =>
  CasStore.use((store) => store.put(nodeOf(identity)))

const projectionFailure = (
  id: ContentId,
  issue: unknown,
): ProjectionCodecFailure =>
  new ProjectionCodecFailure({
    direction: "decode",
    id,
    issue: String(issue),
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Predicate.isObject(value) && !Array.isArray(value)

const exactRecord = (
  value: unknown,
  keys: ReadonlyArray<string>,
  context: string,
): Record<string, unknown> => {
  if (!isRecord(value)) throw new TypeError(`${context} must be an object`)
  const actual = Object.keys(value).toSorted()
  const expected = [...keys].toSorted()
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new TypeError(`${context} has unsupported or excess properties`)
  }
  return value
}

/** Strict revision-0 compatibility decoder. It maps legacy data directly to
 * Effect Schema and deliberately exposes no replacement public AST. */
const legacySchema = (value: unknown): Schema.Top => {
  if (!isRecord(value) || typeof value._tag !== "string") {
    throw new TypeError("legacy canonical schema must be a tagged object")
  }
  switch (value._tag) {
    case "Null":
      exactRecord(value, ["_tag"], "Null schema")
      return Schema.Null
    case "Boolean":
      exactRecord(value, ["_tag"], "Boolean schema")
      return Schema.Boolean
    case "Integer":
      exactRecord(value, ["_tag"], "Integer schema")
      return Schema.Int.check(Schema.isBetween({
        minimum: Number.MIN_SAFE_INTEGER,
        maximum: Number.MAX_SAFE_INTEGER,
      }))
    case "String":
      exactRecord(value, ["_tag"], "String schema")
      return Schema.String
    case "Literal": {
      const literal = exactRecord(value, ["_tag", "value"], "Literal schema")
      const item = literal.value
      if (
        item !== null
        && typeof item !== "boolean"
        && typeof item !== "string"
        && !(typeof item === "number" && Number.isSafeInteger(item))
      ) {
        throw new TypeError("legacy literal must be a canonical JSON scalar")
      }
      return item === null ? Schema.Null : Schema.Literal(item)
    }
    case "Array": {
      const array = exactRecord(value, ["_tag", "item"], "Array schema")
      return Schema.Array(legacySchema(array.item))
    }
    case "Struct": {
      const struct = exactRecord(value, ["_tag", "fields"], "Struct schema")
      if (!isRecord(struct.fields)) {
        throw new TypeError("Struct fields must be an object")
      }
      const fields: Record<string, Schema.Top | Schema.optionalKey<Schema.Top>> = {}
      for (const [name, rawField] of Object.entries(struct.fields)) {
        const field = exactRecord(
          rawField,
          ["optional", "schema"],
          `Struct field ${canonicalJson(name)}`,
        )
        if (typeof field.optional !== "boolean") {
          throw new TypeError(`Struct field ${canonicalJson(name)} optional must be boolean`)
        }
        const member = legacySchema(field.schema)
        fields[name] = field.optional ? Schema.optionalKey(member) : member
      }
      return Schema.Struct(fields)
    }
    case "Ref": {
      const reference = exactRecord(value, ["_tag", "tag"], "Ref schema")
      return ref(Schema.decodeUnknownSync(Byte)(reference.tag))
    }
    default:
      throw new TypeError(`unknown legacy canonical schema tag ${value._tag}`)
  }
}

/** Load a canonical schema identity. Revision 1 returns Effect's persistent
 * representation; revision 0 is accepted and projected into that same form. */
export const get: (
  id: ContentId,
) => Effect.Effect<SchemaRepresentation.Document, ProjectionError, CasLoader> =
  Effect.fn("CanonicalSchema.get")(
    function* (id: ContentId) {
      const loader = yield* CasLoader
      const node = yield* loader.load(id)
      if (node.kind.tag !== KindTag) {
        return yield* new UnknownKind(node.kind)
      }
      if (node.refs.length > 0) {
        return yield* projectionFailure(id, "a schema node carries no references")
      }
      const envelope = yield* decodedVersionedEnvelope(node.payload, id)
      return yield* Effect.try({
        try: () => {
          switch (envelope.revision) {
            case Revision:
              return documentFromJson(envelope.value)
            case LegacyRevision:
              return nativeDocument(legacySchema(envelope.value))
            default:
              throw new TypeError(
                `unsupported canonical schema revision ${envelope.revision}`,
              )
          }
        },
        catch: (issue) => projectionFailure(id, issue),
      })
    },
  )
