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

/** Decode into fresh Effect-owned data, reject excess properties, run the
 * admitted-subset gate on the door path, normalize Effect's
 * order-insensitive object fields, and freeze the identity snapshot.
 *
 * `requireCanonicalOrder` is what tells a DOOR from a LOWERING.
 * `fromJson`, `fromEnvelope`, and the annotation read are doors: they
 * take a spelling from outside and must answer exactly what Lean's
 * `Cas.Schema.ingest` answers, which is `admitDocument`'s job. The
 * lowering path (`snapshotDocument`, `nativeDocument`) is the estate
 * projecting a schema it already holds, where field order is Effect's
 * declaration order and nothing foreign has arrived; it keeps the
 * declaration allowlist and nothing more. */
const documentFromJson = (
  input: Schema.Json,
  requireCanonicalOrder = true,
): SchemaRepresentation.Document => {
  // Effect's own persistent decoder runs first, and its rejections are
  // renamed rather than left anonymous: a spelling `fromJson` will not
  // read is not a schema, which is the name Lean's decoder gives it.
  // Every refusal out of this door therefore carries a taxonomy name.
  const document = ((): SchemaRepresentation.Document => {
    try {
      return SchemaRepresentation.fromJson(input)
    } catch (issue) {
      return refuse(
        "notASchema",
        `Effect's persistent decoder does not read this spelling: ${String(issue)}`,
      )
    }
  })()
  const encoded = SchemaRepresentation.toJson(document)
  if (canonicalJson(input) !== canonicalJson(encoded)) {
    throw new SchemaRefusal(
      "notASchema",
      "canonical schema representation contains unsupported or excess properties",
    )
  }
  const normalized = normalizeRepresentationJson(encoded)
  refuseUnknownDeclarations(normalized)
  // On the spelling AS STORED, not on the normalized one: sortedness is
  // a property of the bytes that arrived, and normalizing first would
  // sort the very thing under test.
  if (requireCanonicalOrder) admitDocument(encoded)
  return deepFreeze(SchemaRepresentation.fromJson(normalized))
}

const snapshotDocument = (
  document: SchemaRepresentation.Document,
): SchemaRepresentation.Document =>
  documentFromJson(SchemaRepresentation.toJson(document), false)

/** THE refusal taxonomy, verbatim from Lean `Cas.Schema.IngestRefusal`.
 * The two doors name the same five refusals or they are not two doors
 * onto one language. */
export type Refusal =
  | "notASchema"
  | "illFormed"
  | "wrongRevision"
  | "nonEmptyReferences"
  | "unknownDeclaration"

/** A refusal BY NAME. The schema plane's doors are synchronous and
 * throw, so their callers can wrap them in one failure channel; what
 * this adds is the name, so a caller (and a differential gate) can tell
 * `illFormed` from `notASchema` instead of reading English. */
export class SchemaRefusal extends TypeError {
  readonly refusal: Refusal
  readonly detail: string
  constructor(refusal: Refusal, detail: string) {
    super(`${refusal}: ${detail}`)
    this.name = "SchemaRefusal"
    this.refusal = refusal
    this.detail = detail
  }
}

// A function DECLARATION, not an arrow: TypeScript only treats a call as
// unreachable-after (narrowing the code that follows) when the callee is
// declared this way, and every gate below leans on that.
function refuse(refusal: Refusal, detail: string): never {
  throw new SchemaRefusal(refusal, detail)
}

/** One row of the declaration registry: a persistence identity, the
 * number of type parameters the row takes, the payload its reviver
 * admits, and the reviver itself. */
export interface DeclarationRow {
  readonly id: string
  readonly arity: number
  /** The row's payload discipline, mirroring Lean
   * `DeclarationId.payloadWf`: `byte` is a natural number below 256 (a
   * kind tag), `null` is the null payload. */
  readonly payload: "byte" | "null"
  readonly reviver: SchemaRepresentation.AnyReviver
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
 * (SCHEMA-MATERIALIZATION.md ruling-queue item 7): rejecting a row is
 * deleting its one line.
 *
 * ONE LIST. The row carries its own reviver, so the declaration arm of
 * `Revivers` is derived from this table rather than hand-kept beside it
 * — the allowlist the door gates on and the reviver set revival runs
 * under cannot come apart, because they are the same rows. */
export const DeclarationRegistry: ReadonlyArray<DeclarationRow> = [
  {
    arity: 0,
    id: ReferenceRepresentationId,
    payload: "byte",
    reviver: referenceRepresentationReviver,
  },
  {
    arity: 0,
    id: "effect/schema/Date",
    payload: "null",
    reviver: Schema.DateReviver,
  },
  {
    arity: 0,
    id: "effect/schema/URL",
    payload: "null",
    reviver: Schema.URLReviver,
  },
  {
    arity: 1,
    id: "effect/schema/Option",
    payload: "null",
    reviver: Schema.OptionReviver,
  },
]

const declarationRow = (id: unknown): DeclarationRow | undefined =>
  typeof id === "string"
    ? DeclarationRegistry.find((row) => row.id === id)
    : undefined

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
      refuse(
        "unknownDeclaration",
        `unknown declaration ${canonicalJson(id ?? null)} — the canonical schema registry admits only ${
          DeclarationRegistry.map((row) => row.id).join(", ")
        }`,
      )
    }
  }
  for (const value of Object.values(node)) refuseUnknownDeclarations(value)
}

/** THE admitted-subset gate — the TypeScript face of Lean's
 * `Ast.ofRepresentationJson` composed with `Ast.wf`, which together are
 * `Cas.Schema.ingest`.
 *
 * Before this gate the two doors disagreed (JIT-substrate survey B8,
 * SCHEMA-MATERIALIZATION.md ruling-queue item 19): the TypeScript door
 * ran Effect's shape decode and the declaration allowlist and nothing
 * else, so a stored node Lean refuses `illFormed` still materialized
 * into a live validator. The corpus in
 * `library/cas/conformance/schema-verdicts.json` is what holds the two
 * to one answer; this is the code that makes them agree.
 *
 * Two disciplines, one walk, because Lean applies both at one door:
 *
 * - WHICH NODES — the admitted subset. Nine representation nodes, one
 *   admitted check spelling, no tuple elements, no index signatures, no
 *   mutable properties, no reference table. Everything else is
 *   `notASchema`, the same name Lean's decoder gives it. The subset is
 *   a SLICE PLAN, not a limit of Effect: each refusal below names the
 *   slice that would admit it.
 * - THE DISCIPLINE — `Ast.wf`. Struct property names in strict
 *   ascending order (which subsumes no-duplicates), unions nonempty,
 *   and every declaration honouring its registry row's payload shape
 *   and type-parameter count. These are `illFormed`.
 *
 * It runs PRE-REVIVAL, on the spelling as stored, so a refusal is a
 * named refusal on the caller's own failure path rather than a throw
 * out of Effect's reviver — which is what three of the corpus rows used
 * to be. */
const isIntCheckSpelling = canonicalJson({
  _tag: "Filter",
  aborted: false,
  annotations: {
    arbitrary: { constraint: { integer: true } },
    expected: "an integer",
  },
  representation: { id: "effect/schema/isInt", payload: null },
})

const gateObject = (value: Schema.Json, path: string): Schema.JsonObject => {
  if (!Predicate.isObject(value) || Array.isArray(value)) {
    refuse("notASchema", `${path} is not an object`)
  }
  return value as Schema.JsonObject
}

const gateArray = (
  value: Schema.Json | undefined,
  path: string,
): ReadonlyArray<Schema.Json> => {
  if (!Array.isArray(value)) refuse("notASchema", `${path} is not an array`)
  return value
}

const gateNoChecks = (node: Schema.JsonObject, path: string): void => {
  if (gateArray(node.checks, `${path}.checks`).length !== 0) {
    refuse(
      "notASchema",
      `${path} carries checks: the admitted subset carries the isInt check on Number and no other (the checks layer is Slice C5)`,
    )
  }
}

/** The row's payload discipline, mirroring `DeclarationId.payloadWf`. */
const admitsPayload = (row: DeclarationRow, payload: Schema.Json): boolean =>
  row.payload === "null"
    ? payload === null
    : typeof payload === "number" && Number.isInteger(payload)
      && payload >= 0 && payload < 256

const admitNode = (value: Schema.Json, path: string): void => {
  const node = gateObject(value, path)
  switch (node._tag) {
    case "Null":
    case "Boolean":
    case "String": {
      gateNoChecks(node, path)
      return
    }
    case "Number": {
      const checks = gateArray(node.checks, `${path}.checks`)
      if (
        checks.length !== 1
        || canonicalJson(checks[0] ?? null) !== isIntCheckSpelling
      ) {
        refuse(
          "notASchema",
          `${path} is not the admitted integer: the subset carries Number under exactly the effect/schema/isInt check, and a bare Number would type a float the value plane has no term for (ruling 15, the float ceiling)`,
        )
      }
      return
    }
    case "Literal": {
      gateNoChecks(node, path)
      const literal = gateObject(node.literal as Schema.Json, `${path}.literal`)
      const value = literal.value
      const admitted = literal.type === "boolean"
        ? typeof value === "boolean"
        : literal.type === "string"
          ? typeof value === "string"
          : literal.type === "number"
            ? typeof value === "number" && Number.isSafeInteger(value)
            : false
      if (!admitted) {
        refuse(
          "notASchema",
          `${path}.literal is not an admitted literal: booleans, strings, and safe integers only (a null literal is the Null keyword, register R13)`,
        )
      }
      return
    }
    case "Arrays": {
      gateNoChecks(node, path)
      const elements = gateArray(node.elements, `${path}.elements`)
      const rest = gateArray(node.rest, `${path}.rest`)
      if (elements.length !== 0 || rest.length !== 1) {
        refuse(
          "notASchema",
          `${path} is not the admitted array: no positional elements and exactly one rest element (tuples are Slice C2)`,
        )
      }
      admitNode(rest[0]!, `${path}[]`)
      return
    }
    case "Objects": {
      gateNoChecks(node, path)
      if (gateArray(node.indexSignatures, `${path}.indexSignatures`).length !== 0) {
        refuse(
          "notASchema",
          `${path} carries index signatures, which the admitted subset does not reach (records are Slice C3)`,
        )
      }
      let previous: string | undefined
      for (
        const [index, property] of gateArray(
          node.propertySignatures,
          `${path}.propertySignatures`,
        ).entries()
      ) {
        const signature = gateObject(property, `${path}.propertySignatures[${index}]`)
        if (signature.isMutable !== false) {
          refuse(
            "notASchema",
            `${path}.propertySignatures[${index}] is mutable, which the admitted subset does not carry`,
          )
        }
        if (typeof signature.isOptional !== "boolean") {
          refuse(
            "notASchema",
            `${path}.propertySignatures[${index}].isOptional is not a boolean`,
          )
        }
        const name = gateObject(
          signature.name as Schema.Json,
          `${path}.propertySignatures[${index}].name`,
        )
        if (name.type !== "string" || typeof name.value !== "string") {
          refuse(
            "notASchema",
            `${path}.propertySignatures[${index}].name is not a string name (symbol keys have no reconstructable identity)`,
          )
        }
        const current = name.value as string
        if (previous !== undefined && !(previous < current)) {
          refuse(
            "illFormed",
            `${path} declares ${canonicalJson(current)} after ${
              canonicalJson(previous)
            }: struct field names are in strict ascending order, which is what makes the canonical spelling unique and forbids a duplicate name`,
          )
        }
        previous = current
        admitNode(signature.type as Schema.Json, `${path}.${current}`)
      }
      return
    }
    case "Declaration": {
      gateNoChecks(node, path)
      const representation = gateObject(
        node.representation as Schema.Json,
        `${path}.representation`,
      )
      const row = declarationRow(representation.id)
      if (row === undefined) {
        refuse(
          "unknownDeclaration",
          `unknown declaration ${canonicalJson(representation.id ?? null)} at ${path}`,
        )
      }
      if (!admitsPayload(row, representation.payload as Schema.Json)) {
        refuse(
          "illFormed",
          `${path}: ${row.id} admits a ${row.payload} payload, the node carries ${
            canonicalJson(representation.payload ?? null)
          }`,
        )
      }
      const parameters = gateArray(node.typeParameters, `${path}.typeParameters`)
      if (parameters.length !== row.arity) {
        refuse(
          "illFormed",
          `${path}: ${row.id} takes ${row.arity} type parameters, the node carries ${parameters.length}`,
        )
      }
      parameters.forEach((parameter, index) =>
        admitNode(parameter, `${path}<${index}>`)
      )
      return
    }
    case "Union": {
      gateNoChecks(node, path)
      if (node.mode !== "anyOf" && node.mode !== "oneOf") {
        refuse(
          "notASchema",
          `${path}.mode is ${
            canonicalJson(node.mode ?? null)
          }, which is no union mode`,
        )
      }
      const types = gateArray(node.types, `${path}.types`)
      if (types.length === 0) {
        refuse(
          "illFormed",
          `${path} is the empty union, which is Never — and Never is not admitted`,
        )
      }
      types.forEach((member, index) => admitNode(member, `${path}|${index}`))
      return
    }
    default: {
      refuse(
        "notASchema",
        `${path} is a ${
          canonicalJson(node._tag ?? null)
        } node, which the admitted subset does not carry`,
      )
    }
  }
}

/** The document gate: an empty reference table and one admitted root.
 * A non-empty table is recursion, which the carrier has no constructor
 * for (survey B3, open ruling 2), so it is refused by its own name
 * rather than admitted and then failing to re-emit. */
const admitDocument = (value: Schema.Json): void => {
  const document = gateObject(value, "document")
  const references = gateObject(
    document.references as Schema.Json,
    "document.references",
  )
  if (Object.keys(references).length > 0) {
    refuse(
      "nonEmptyReferences",
      `the document allocates a reference table (${
        Object.keys(references).join(", ")
      }), which the admitted subset does not reach`,
    )
  }
  admitNode(document.representation as Schema.Json, "representation")
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

/** The check revivers: built-in ids reused VERBATIM, nothing minted.
 * `isInt` is the one check the admitted subset carries; `isBetween` and
 * `isPattern` serve the legacy revision-0 projection and the estate's
 * own native lowerings, which do not travel through the door's gate. */
export const CheckRevivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  Schema.isIntReviver,
  Schema.isBetweenReviver,
  Schema.isPatternReviver,
]

/** The estate's reviver registry: every declaration and check identity a
 * persisted canonical schema may carry.
 *
 * The declaration arm is DERIVED from `DeclarationRegistry` — one row,
 * one reviver, no second list to keep in step. That is the allowlist
 * reconciliation the survey's B8 asked for: the set the door admits and
 * the set revival can rebuild are the same rows by construction, so an
 * id can no longer be admitted with no reviver behind it (or revived
 * without being admitted). */
export const Revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  ...CheckRevivers,
  ...DeclarationRegistry.map((row) => row.reviver),
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
      return refuse(
        "wrongRevision",
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
