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
import { resolveAnnotation } from "./Annotations.ts"
import {
  canonicalJson,
  decodedVersionedEnvelope,
  ProjectionCodecFailure,
  referenceRepresentation,
  ReferenceRepresentationId,
  referenceRepresentationReviver,
  type DecodedEnvelope,
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
  refuseUnknownDeclarations(normalized)
  return deepFreeze(SchemaRepresentation.fromJson(normalized))
}

const snapshotDocument = (
  document: SchemaRepresentation.Document,
): SchemaRepresentation.Document =>
  documentFromJson(SchemaRepresentation.toJson(document), false)

/** One row of the declaration registry: a persistence identity and the
 * number of type parameters the row takes. */
export interface DeclarationRow {
  readonly id: string
  readonly arity: number
}

/** THE declaration registry, TypeScript side: every declaration id a
 * persisted canonical schema may carry, row zero first.
 *
 * This table is the hand mirror of `Cas.Schema.DeclarationId` in
 * `library/cas/Cas/Schema/Declarations.lean` — row for row, order for
 * order, wire spelling for wire spelling, arity for arity. The two
 * registries are checked against each other by eye (both are one small
 * table with the same shape) and by test
 * (`CanonicalSchemaDeclarations.test.ts` reads the Lean file and
 * compares). Growing the set is adding a row HERE and in Lean; nothing
 * else admits a declaration.
 *
 * | row | wire | arity | payload |
 * |---|---|---|---|
 * | row zero | `foldlab/cas/ref` | 0 | kind tag, `nat < 256` |
 * | Date | `effect/schema/Date` | 0 | `null` |
 * | URL | `effect/schema/URL` | 0 | `null` |
 * | Option | `effect/schema/Option` | 1 | `null` |
 *
 * The three Effect rows are ADOPTED, not minted (PLAN P3/P4): each is a
 * built-in already shipping the whole `{id, reviver, toCode,
 * toArbitrary}` contract, so admitting them costs the estate no new
 * identity and Effect's own revival and code generation apply
 * unchanged. Their adoption is pending operator ratification
 * (SCHEMA-MATERIALIZATION.md ruling-queue item 7), which is why they
 * are three adjacent rows here, three adjacent revivers in `Revivers`,
 * and nothing else: rejecting a row is deleting its two lines. */
export const DeclarationRegistry: ReadonlyArray<DeclarationRow> = [
  { arity: 0, id: ReferenceRepresentationId },
  { arity: 0, id: "effect/schema/Date" },
  { arity: 0, id: "effect/schema/URL" },
  { arity: 1, id: "effect/schema/Option" },
]

const admittedDeclarationIds: ReadonlySet<string> = new Set(
  DeclarationRegistry.map((row) => row.id),
)

/** The door's declaration gate, the counterpart of Lean
 * `IngestRefusal.unknownDeclaration`: a structural walk of the
 * normalized representation that refuses any `Declaration` node whose
 * `representation.id` is not a registry row. Fail-closed — a
 * declaration with no representation identity at all is refused too,
 * because there is nothing to admit it by. */
const refuseUnknownDeclarations = (input: Schema.Json): void => {
  if (Array.isArray(input)) {
    for (const item of input) refuseUnknownDeclarations(item)
    return
  }
  if (!Predicate.isObject(input)) return
  const node = input as Schema.JsonObject
  if (node._tag === "Declaration") {
    const representation = node.representation
    const id = Predicate.isObject(representation)
      ? (representation as Schema.JsonObject).id
      : undefined
    if (typeof id !== "string" || !admittedDeclarationIds.has(id)) {
      throw new TypeError(
        `unknown declaration ${canonicalJson(id ?? null)} — the canonical schema registry admits only ${
          DeclarationRegistry.map((row) => row.id).join(", ")
        }`,
      )
    }
  }
  for (const value of Object.values(node)) refuseUnknownDeclarations(value)
}

const nativeDocument = (schema: Schema.Top): SchemaRepresentation.Document =>
  snapshotDocument(SchemaRepresentation.toRepresentation(schema.ast))

const documentOf = (
  identity: Schema.Top | SchemaRepresentation.Document,
): SchemaRepresentation.Document =>
  Schema.isSchema(identity) ? representationOf(identity) : snapshotDocument(identity)

/** The frozen native representation carried by a runtime schema.
 *
 * The pin is read through `resolveAnnotation`, not off `ast.annotations`:
 * `annotate` lands on the last check when the carrier has checks, and
 * Effect's own resolution reads that slot, so a carrier pinned after a
 * `.check(...)` would otherwise lose its identity in silence and fall
 * back to its native representation. */
export const representationOf = (
  schema: Schema.Top,
): SchemaRepresentation.Document => {
  const carried = resolveAnnotation(schema.ast, AnnotationKey)
  if (carried === undefined) return nativeDocument(schema)
  const json = Schema.decodeUnknownSync(Schema.Json, strictOptions)(carried)
  return documentFromJson(json)
}

/** The estate's reviver registry: every declaration and check identity a
 * persisted canonical schema may carry. Built-in check ids and built-in
 * declaration revivers are reused VERBATIM — nothing is minted here — so
 * Effect's own revival, code generation, and instance generation apply
 * unchanged; only `foldlab/cas/ref` is ours.
 *
 * The declaration arm is `DeclarationRegistry` row for row: row zero's
 * reviver, then Effect's own `DateReviver`, `URLReviver`, and
 * `OptionReviver` for the three adopted rows. */
export const Revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  Schema.isIntReviver,
  Schema.isBetweenReviver,
  Schema.isPatternReviver,
  referenceRepresentationReviver,
  Schema.DateReviver,
  Schema.URLReviver,
  Schema.OptionReviver,
]

/** Reconstruct a runtime Effect Schema from a persisted identity. */
export const fromRepresentation = (
  document: SchemaRepresentation.Document,
): Schema.Top => {
  const snapshot = snapshotDocument(document)
  return SchemaRepresentation.fromRepresentation(snapshot, {
    revivers: Revivers,
  }).annotate({
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

/** Project one decoded `{revision, value}` schema envelope into the
 * canonical document. This is the SINGLE revision switch behind every
 * door on the schema plane — `get` reads it from a loaded node and
 * `Materialize` reads it from payload bytes in hand, so the two cannot
 * come to disagree about what a stored revision means. Throws, and is
 * therefore always called inside the caller's own failure channel. */
export const fromEnvelope = (
  envelope: DecodedEnvelope,
): SchemaRepresentation.Document => {
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
}

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
        try: () => fromEnvelope(envelope),
        catch: (issue) => projectionFailure(id, issue),
      })
    },
  )
