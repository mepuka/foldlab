/**
 * The canonical schema — the root of the schema plane, carried by
 * Effect Schema.
 *
 * No schema stands above this one. A canonical schema is CONTENT: its
 * identity is the digest of its canonical bytes — the scheme-0
 * encoding of a schema node (reserved kind tag, the `{revision,
 * value}` canonical-JSON envelope as payload, no references) — so
 * schemas admit into the store, deduplicate, and are named by address
 * like every other value. Effect Schema is the runtime CARRIER, in two
 * senses: the AST below is itself defined as an Effect Schema codec
 * (the specific encoding of the schema plane), and the annotation API
 * lets any Effect Schema value declare the canonical schema it
 * carries. `fromAst` runs the generative direction — the canonical
 * AST produces its runtime carrier, fully typed through the `TypeOf`
 * interpreter and self-carrying by construction.
 *
 * Bytes are always DERIVED on read, never stored: the annotation
 * carries the AST, and `bytesFor`/`addressWith` recompute the
 * canonical form from it — a stored byte string would be a
 * hand-maintained derived file in disguise.
 *
 * Identity is structural everywhere: no constructor's meaning lives in
 * a function (the carrier-adequacy lesson from the SchemaAST census —
 * a closure-backed `Declaration` has no canonical form). The v0
 * constructor set covers what the value plane speaks today; `union`,
 * `mu`/`var` recursion, automatic derivation from `SchemaAST`, and the
 * Lean twin are the schema commission's, deferred by name.
 */
import { cast, Effect, Match, Option, pipe, Predicate, Schema } from "effect"
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
  decodedEnvelope,
  ProjectionCodecFailure,
  refWithTag,
  type ProjectionError,
  type Root,
} from "./Value.ts"
import { SchemaKindTag } from "../internal/kindTags.ts"
import type { StoreFailure } from "./Node.ts"

/** The projection revision of schema nodes. */
export const Revision = 0

/** The reserved kind tag schema nodes carry. */
export const KindTag = SchemaKindTag

/** A literal a canonical schema can pin: the canonical-JSON scalars. */
export type LiteralValue = null | boolean | number | string

export interface AstNull {
  readonly _tag: "Null"
}
export interface AstBoolean {
  readonly _tag: "Boolean"
}
/** Safe integers only — the one number form whose canonical rendering
 * is language-neutral (CAS-004). */
export interface AstInteger {
  readonly _tag: "Integer"
}
export interface AstString {
  readonly _tag: "String"
}
export interface AstLiteral<V extends LiteralValue = LiteralValue> {
  readonly _tag: "Literal"
  readonly value: V
}
export interface AstArray<I extends Ast = Ast> {
  readonly _tag: "Array"
  readonly item: I
}
export interface AstField<
  S extends Ast = Ast,
  Opt extends boolean = boolean,
> {
  readonly optional: Opt
  readonly schema: S
}
export interface AstStruct<
  F extends { readonly [name: string]: AstField } = {
    readonly [name: string]: AstField
  },
> {
  readonly _tag: "Struct"
  readonly fields: F
}
/** A typed reference: the kind tag expected at the target — the same
 * fact the store's admission law checks on the edge. */
export interface AstRef<T extends number = number> {
  readonly _tag: "Ref"
  readonly tag: T
}

/** The canonical schema AST: all structure, no functions. */
export type Ast =
  | AstNull
  | AstBoolean
  | AstInteger
  | AstString
  | AstLiteral
  | AstArray
  | AstStruct
  | AstRef

const SafeInt = Schema.Int.check(Schema.isBetween({
  minimum: Number.MIN_SAFE_INTEGER,
  maximum: Number.MAX_SAFE_INTEGER,
}))

const LiteralValueSchema = Schema.Union([
  Schema.Null,
  Schema.Boolean,
  SafeInt,
  Schema.String,
])

/** The AST as an Effect Schema codec — the specific encoding of the
 * schema plane in the primary runtime. Plain tagged data on both
 * sides; canonical key order arrives at encode through the canonical
 * JSON rendering, never from insertion order. */
export const AstSchema: Schema.Codec<Ast, Ast> = Schema.Union([
  Schema.TaggedStruct("Null", {}),
  Schema.TaggedStruct("Boolean", {}),
  Schema.TaggedStruct("Integer", {}),
  Schema.TaggedStruct("String", {}),
  Schema.TaggedStruct("Literal", { value: LiteralValueSchema }),
  Schema.TaggedStruct("Array", {
    item: Schema.suspend((): Schema.Codec<Ast, Ast> => AstSchema),
  }),
  Schema.TaggedStruct("Struct", {
    fields: Schema.Record(
      Schema.String,
      Schema.Struct({
        optional: Schema.Boolean,
        schema: Schema.suspend((): Schema.Codec<Ast, Ast> => AstSchema),
      }),
    ),
  }),
  Schema.TaggedStruct("Ref", { tag: Byte }),
])

/* ── Constructors — narrow return types, so a constructor-built AST
 * keeps the precise shape `TypeOf` interprets ─────────────────────── */

export const nullAst: AstNull = { _tag: "Null" }
export const booleanAst: AstBoolean = { _tag: "Boolean" }
export const integerAst: AstInteger = { _tag: "Integer" }
export const stringAst: AstString = { _tag: "String" }

export const literal = <const V extends LiteralValue>(
  value: V,
): AstLiteral<V> => {
  if (Predicate.isNumber(value) && !Number.isSafeInteger(value)) {
    throw new TypeError(
      "Canonical literals admit safe integers only — fractional and unsafe numbers have no language-neutral encoding",
    )
  }
  return { _tag: "Literal", value }
}

export const array = <const I extends Ast>(item: I): AstArray<I> => ({
  _tag: "Array",
  item,
})

/** A required field. */
export const field = <const S extends Ast>(schema: S): AstField<S, false> => ({
  optional: false,
  schema,
})

/** An optional field. */
export const optionalField = <const S extends Ast>(
  schema: S,
): AstField<S, true> => ({
  optional: true,
  schema,
})

export const struct = <const F extends { readonly [name: string]: AstField }>(
  fields: F,
): AstStruct<F> => ({
  _tag: "Struct",
  fields,
})

export const ref = <const T extends number>(tag: T): AstRef<T> => {
  Byte.make(tag)
  return { _tag: "Ref", tag }
}

/* ── The generative direction: canonical AST → Effect Schema ────── */

type StructTypeOf<F extends { readonly [name: string]: AstField }> =
  & {
    readonly [K in keyof F as F[K]["optional"] extends false ? K : never]:
      TypeOf<F[K]["schema"]>
  }
  & {
    readonly [K in keyof F as F[K]["optional"] extends true ? K : never]?:
      TypeOf<F[K]["schema"]>
  }

/** The type a canonical schema denotes — the type-level interpreter.
 * Author ASTs through the constructors (or `as const`) so the shape
 * stays precise; a widened `Ast` denotes the union of everything. */
export type TypeOf<A extends Ast> = A extends AstNull ? null
  : A extends AstBoolean ? boolean
  : A extends AstInteger ? number
  : A extends AstString ? string
  : A extends AstLiteral ? A["value"]
  : A extends AstArray ? ReadonlyArray<TypeOf<A["item"]>>
  : A extends AstStruct ? StructTypeOf<A["fields"]>
  : A extends AstRef ? Root<unknown>
  : never

const compile: (ast: Ast) => Schema.Top = pipe(
  Match.type<Ast>(),
  Match.withReturnType<Schema.Top>(),
  Match.tagsExhaustive({
    Array: ({ item }) => Schema.Array(compile(item)),
    Boolean: () => Schema.Boolean,
    Integer: () => SafeInt,
    Literal: ({ value }) =>
      value === null ? Schema.Null : Schema.Literal(value),
    Null: () => Schema.Null,
    Ref: ({ tag }) => refWithTag(Byte.make(tag)),
    String: () => Schema.String,
    Struct: ({ fields: astFields }) => {
      const fields: Record<
        string,
        Schema.Top | Schema.optionalKey<Schema.Top>
      > = {}
      for (const [name, f] of Object.entries(astFields)) {
        fields[name] = f.optional
          ? Schema.optionalKey(compile(f.schema))
          : compile(f.schema)
      }
      return Schema.Struct(fields)
    },
  }),
)

/**
 * Derive the runtime Effect Schema a canonical schema denotes — the
 * root generating its carrier. The derived schema automatically
 * carries its source through the annotation, so `astOf`, `bytesFor`,
 * and the address all answer on it; authoring the AST through the
 * constructors keeps `TypeOf` precise, so the codec is fully typed.
 */
export const fromAst = <const A extends Ast>(
  ast: A,
): Schema.Codec<TypeOf<A>, Schema.Json> =>
  cast(compile(ast).annotate({ [AnnotationKey]: ast }))

/* ── The canonical form — always derived, never stored ─────────── */

const utf8Encoder = new TextEncoder()

/** The envelope payload of a schema node. */
export const payloadOf = (ast: Ast): Uint8Array =>
  utf8Encoder.encode(canonicalJson({ revision: Revision, value: ast }))

/** The schema node itself: reserved kind, envelope payload, no
 * references. */
export const nodeOf = (ast: Ast): CasNodeInput =>
  CasNodeInput.make({
    kind: { version: CasSchemeVersion, tag: KindTag },
    payload: payloadOf(ast),
    refs: [],
  })

/** THE canonical bytes: the scheme-0 encoding of the schema node —
 * the digest pre-image, hence the identity. */
export const bytesOf = (ast: Ast): Uint8Array => encodeCasNode(nodeOf(ast))

/** The content address of a canonical schema under an explicit
 * address function — the model quantifies over the digest, and so
 * does the schema plane. */
export const addressWith = (address: CasAddress) =>
(ast: Ast): Effect.Effect<ContentId, StoreFailure> =>
  address.digest(bytesOf(ast))

/* ── The annotation API — Effect Schema as the carrier ─────────── */

/** The annotation key a carrying Effect Schema uses. */
export const AnnotationKey = "foldlab/cas/canonical"

/** Declare the canonical schema an Effect Schema value carries. */
export const annotate = (ast: Ast) => <S extends Schema.Top>(schema: S) =>
  schema.annotate({ [AnnotationKey]: ast })

/** The canonical schema a value carries, if it declares one — read
 * through the codec, so a malformed annotation answers `None`, never
 * an unchecked value. */
export const astOf = (schema: Schema.Top): Option.Option<Ast> => {
  const raw = schema.ast.annotations?.[AnnotationKey]
  if (raw === undefined) return Option.none()
  return Schema.decodeUnknownOption(AstSchema)(raw)
}

/** The canonical bytes a carrying schema declares — derived from the
 * annotation on every read. */
export const bytesFor = (schema: Schema.Top): Option.Option<Uint8Array> =>
  Option.map(astOf(schema), bytesOf)

/* ── The store round trip — schemas are content ────────────────── */

/** Admit a canonical schema into the store; its address is its name. */
export const put = (ast: Ast): Effect.Effect<ContentId, CasError, CasStore> =>
  CasStore.use((store) => store.put(nodeOf(ast)))

/** Load a canonical schema back from its address, fail-closed: kind
 * checked, no references tolerated, envelope re-verified, AST decoded
 * through the codec. */
export const get: (
  id: ContentId,
) => Effect.Effect<Ast, ProjectionError, CasLoader> = Effect.fn(
  "CanonicalSchema.get",
)(
  function* (id: ContentId) {
    const loader = yield* CasLoader
    const node = yield* loader.load(id)
    if (node.kind.tag !== KindTag) {
      return yield* new UnknownKind(node.kind)
    }
    if (node.refs.length > 0) {
      return yield* new ProjectionCodecFailure({
        direction: "decode",
        id,
        issue: "a schema node carries no references",
      })
    }
    const value = yield* decodedEnvelope(node.payload, Revision, id)
    return yield* Schema.decodeUnknownEffect(AstSchema)(value).pipe(
      Effect.mapError((issue) =>
        new ProjectionCodecFailure({
          direction: "decode",
          id,
          issue: String(issue),
        })
      ),
    )
  },
)
