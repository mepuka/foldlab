/**
 * Typed values projected through the content-addressed store.
 *
 * The digest payload is canonical JSON of the Schema's Encoded form inside
 * the exact envelope `{ revision, value }`. Object keys are ordered by
 * Unicode codepoint (equal to UTF-8 byte order) at every depth, array order
 * is preserved, only safe integers are admitted as numbers, and the
 * resulting text is UTF-8 encoded.
 * The kind tag and revision together version this projection: the kind tag is
 * the CAS node tag and the revision is carried in the payload envelope.
 *
 * Typed references (CAS-005): a schema field built with `ref` holds a
 * `Root<B>` — a typed content id, decoded lazily, never a loaded
 * child. On the wire the field is a positional `{"$ref": k}` marker in
 * the payload and the k-th entry of the node's reference array, so the
 * store's admission law checks every typed edge (`WrongKindReference`)
 * with no projection-side machinery. Construction is leaf-up: putting
 * a value whose references are not yet admitted fails with the store's
 * `DanglingReference`.
 *
 * This is a runtime projection contract only. It makes no canonicality or
 * equivalence claim about the independent Lean printer.
 */
import { cast, Effect, Predicate, Result, Schema, SchemaGetter, SchemaIssue } from "effect"
import {
  Byte,
  CasNodeInput,
  ContentId,
  UnknownKind,
  type CasError,
  type ContentId as ContentIdType,
} from "./Node.ts"
import { CasLoader, CasSchemeVersion, CasStore } from "./Store.ts"
import { bytesEqual } from "../internal/bytes.ts"
import { ReservedKindTags } from "../internal/kindTags.ts"
import {
  markerize,
  RefSentinelKey,
  resolveMarkers,
  violationReason,
} from "../internal/refMarkers.ts"

declare const RootTypeId: unique symbol

/** A content root whose decoded value is tracked phantasmally. The runtime
 * descriptor still checks the resident node kind before decoding. */
export type Root<A> = ContentIdType & {
  readonly [RootTypeId]: {
    readonly value: (value: A) => A
    readonly expectedKindTag: Byte
  }
}

export class ProjectionCodecFailure
  extends Schema.TaggedError<ProjectionCodecFailure>()(
    "ProjectionCodecFailure",
    {
      direction: Schema.Literals(["encode", "decode"]),
      id: Schema.optionalKey(ContentId),
      issue: Schema.String,
    },
  ) {}

export type ProjectionError = CasError | ProjectionCodecFailure

/** A projection revision: a non-negative safe integer, validated by
 * schema at construction. */
export const Revision = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
)
export type Revision = typeof Revision.Type

export interface ValueOptions<A> {
  readonly kindTag: Byte
  readonly revision: Revision
  readonly schema: Schema.Codec<A, Schema.Json, never, never>
}

export interface CasValue<A> {
  /** The projection's CAS node tag — what a typed reference to this
   * projection expects at its target. */
  readonly kindTag: Byte
  readonly put: (value: A) => Effect.Effect<Root<A>, ProjectionError, CasStore>
  /** Reads require only the load law, so typed values decode over
   * read-only compositions — a path-reader host included. */
  readonly get: (root: Root<A>) => Effect.Effect<A, ProjectionError, CasLoader>
}

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true })

const isJsonObject = (value: Schema.Json): value is Schema.JsonObject =>
  Predicate.isObject(value) && !Array.isArray(value)

const projectionFailure = (
  direction: "encode" | "decode",
  issue: string,
  id?: ContentIdType,
): ProjectionCodecFailure =>
  new ProjectionCodecFailure(
    id === undefined ? { direction, issue } : { direction, issue, id },
  )

/** Codepoint order — equal to UTF-8 byte order, the language-neutral
 * key ordering CAS-004 pins. Default string comparison is UTF-16
 * code-unit order, which disagrees on astral-plane keys. */
const compareCodepoints = (left: string, right: string): number => {
  const a = Array.from(left)
  const b = Array.from(right)
  const shorter = Math.min(a.length, b.length)
  for (let index = 0; index < shorter; index += 1) {
    const delta = a[index]!.codePointAt(0)! - b[index]!.codePointAt(0)!
    if (delta !== 0) return delta
  }
  return a.length - b.length
}

/** The canonical value encoding (CAS-004): compact JSON with
 * codepoint-sorted keys, integer-only numbers, and the exact
 * `JSON.stringify` escape set. The UTF-8 bytes of this string are what
 * a value node's content identity is computed over; integers-only is
 * the ruling that keeps those bytes language-neutral. Exported for the
 * conformance binding — the model's vectors are the authority. */
export const canonicalJson = (
  value: unknown,
  ancestors: ReadonlySet<object> = new Set(),
): string => {
  if (value === null) return "null"
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false"
    case "string":
      return JSON.stringify(value)
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new TypeError(
          "Canonical JSON numbers must be safe integers — fractional and unsafe values have no language-neutral encoding",
        )
      }
      return JSON.stringify(value)
    case "object": {
      if (ancestors.has(value)) throw new TypeError("Canonical JSON cannot encode cycles")
      const nextAncestors = new Set([...ancestors, value])
      if (Array.isArray(value)) {
        if (
          Object.getOwnPropertySymbols(value).length > 0
          || Object.keys(value).length !== value.length
        ) {
          throw new TypeError("Canonical JSON arrays must be dense and unadorned")
        }
        const items: Array<string> = []
        for (let index = 0; index < value.length; index += 1) {
          items.push(canonicalJson(value[index], nextAncestors))
        }
        return `[${items.join(",")}]`
      }
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError("Canonical JSON objects must have a plain prototype")
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new TypeError("Canonical JSON objects cannot have symbol keys")
      }
      const fields = Object.entries(value)
        .toSorted(([left], [right]) => compareCodepoints(left, right))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item, nextAncestors)}`)
      return `{${fields.join(",")}}`
    }
    default:
      throw new TypeError(`Canonical JSON cannot encode ${typeof value}`)
  }
}

const payloadFor = (
  revision: number,
  encoded: Schema.Json,
): Effect.Effect<Uint8Array, ProjectionCodecFailure> =>
  Effect.try({
    try: () => utf8Encoder.encode(canonicalJson({ revision, value: encoded })),
    catch: (issue) => projectionFailure("encode", String(issue)),
  })

/** Decode and re-verify one canonical `{revision, value}` envelope —
 * shared with the schema plane; not part of the front door. */
export const decodedEnvelope = (
  payload: Uint8Array,
  revision: number,
  id: ContentIdType,
): Effect.Effect<Schema.Json, ProjectionCodecFailure> =>
  Effect.try({
    try: () => {
      const text = utf8Decoder.decode(payload)
      // The one unparsed boundary: JSON.parse's output is exactly the
      // closed JSON union, canonicality re-checked on the next line.
      const parsed = JSON.parse(text) as Schema.Json
      const canonical = utf8Encoder.encode(canonicalJson(parsed))
      if (!bytesEqual(canonical, payload)) {
        throw new TypeError("Projection payload is not canonical JSON")
      }
      if (
        !isJsonObject(parsed)
        || Object.keys(parsed).length !== 2
        || !("revision" in parsed)
        || !("value" in parsed)
      ) {
        throw new TypeError("Projection payload must be the exact revision/value envelope")
      }
      if (parsed["revision"] !== revision) {
        throw new TypeError(`Projection revision does not match ${revision}`)
      }
      return parsed["value"]
    },
    catch: (issue) => projectionFailure("decode", String(issue), id),
  })

const makeRoot = <A>(id: ContentIdType): Root<A> => cast(id)

/** The wire shape of a typed reference before marker assignment. */
const sentinelSchema = Schema.Struct({
  [RefSentinelKey]: Schema.Struct({ id: ContentId, tag: Byte }),
})

/** The one reference-codec law: sentinel on the wire, `Root` in the
 * value, the expected kind tag stamped at encode and demanded at
 * decode. The tag arrives as a thunk so both entry points below share
 * it. */
const refCodec = <B>(
  expectedTag: () => Byte,
): Schema.Codec<Root<B>, typeof sentinelSchema.Encoded> =>
  sentinelSchema.pipe(Schema.decodeTo(
    Schema.declare<Root<B>>(
      (candidate): candidate is Root<B> => Predicate.isString(candidate),
    ),
    {
      decode: SchemaGetter.transformOrFail((sentinel, options) => {
        const expected = expectedTag()
        return sentinel[RefSentinelKey].tag === expected
          ? Effect.succeed(makeRoot<B>(sentinel[RefSentinelKey].id))
          : Effect.fail(new SchemaIssue.InvalidValue(
              { message: `reference expects kind tag ${expected}, node carries ${sentinel[RefSentinelKey].tag}` },
              sentinel,
              options,
            ))
      }),
      encode: SchemaGetter.transform((root: Root<B>) => ({
        [RefSentinelKey]: { id: ContentId.make(root), tag: expectedTag() },
      })),
    },
  ))

/** A typed-reference field: `Root<B>` in the decoded value, a
 * positional marker plus a reference-array entry on the wire. The
 * target projection arrives as a thunk so self- and mutual reference
 * elaborate; its kind tag is stamped into the reference at encode and
 * demanded of it at decode. */
export const ref = <B>(
  target: () => CasValue<B>,
): Schema.Codec<Root<B>, typeof sentinelSchema.Encoded> =>
  refCodec<B>(() => target().kindTag)

/** A typed-reference field pinned to a kind tag directly — the form a
 * canonical schema's `Ref` compiles to, where the tag is data and no
 * target projection exists yet. The decoded root's value type stays
 * `unknown` until references carry their target schema's address (a
 * schema-commission item). */
export const refWithTag = (
  tag: Byte,
): Schema.Codec<Root<unknown>, typeof sentinelSchema.Encoded> =>
  refCodec<unknown>(() => tag)

/** Construct a typed value projection over the in-memory CAS service. */
export const value = <A>(options: ValueOptions<A>): CasValue<A> => {
  const kindTag = Byte.make(options.kindTag)
  const revision = Revision.make(options.revision)
  // The whole library-owned registry is refused, not just the replay
  // tags — a projection aliasing a blob tag would give one kind plane
  // two public interpretations.
  if (ReservedKindTags.has(kindTag)) {
    throw new TypeError(`Projection kind tag 0x${kindTag.toString(16)} is reserved`)
  }

  const put: CasValue<A>["put"] = Effect.fn("CasValue.put")(
    function* (input) {
      const store = yield* CasStore
      const encoded = yield* Schema.encodeUnknownEffect(options.schema)(input).pipe(
        Effect.mapError((issue) => projectionFailure("encode", String(issue))),
      )
      // Reference sentinels become positional markers (CAS-005): the
      // k-th marker in canonical byte order carries index k, and the
      // references ride the node, where admission checks their kinds.
      const markerized = markerize(encoded)
      if (Result.isFailure(markerized)) {
        return yield* projectionFailure(
          "encode",
          violationReason(markerized.failure),
        )
      }
      const payload = yield* payloadFor(
        revision,
        markerized.success.payload,
      )
      const id = yield* store.put(CasNodeInput.make({
        kind: { version: CasSchemeVersion, tag: kindTag },
        payload,
        refs: markerized.success.refs,
      }))
      return makeRoot<A>(id)
    },
  )

  const get: CasValue<A>["get"] = Effect.fn("CasValue.get")(
    function* (root) {
      const loader = yield* CasLoader
      const node = yield* loader.load(root)
      if (node.kind.tag !== kindTag) {
        return yield* new UnknownKind(node.kind)
      }
      const encoded = yield* decodedEnvelope(node.payload, revision, root)
      // The exact inverse walk: forced marker indexes verified against
      // the node's reference array, markers restored to sentinels.
      const resolved = resolveMarkers(encoded, node.refs)
      if (Result.isFailure(resolved)) {
        return yield* projectionFailure(
          "decode",
          violationReason(resolved.failure),
          root,
        )
      }
      return yield* Schema.decodeEffect(options.schema)(resolved.success).pipe(
        Effect.mapError((issue) => projectionFailure("decode", String(issue), root)),
      )
    },
  )

  return { get, kindTag, put }
}
