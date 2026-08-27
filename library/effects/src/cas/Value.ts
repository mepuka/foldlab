/**
 * Typed values projected through the content-addressed store.
 *
 * The digest payload is canonical JSON of the Schema's Encoded form inside
 * the exact envelope `{ revision, value }`. Object keys are ordered by
 * JavaScript code-unit order at every depth, array order is preserved, only
 * finite JSON numbers are admitted, and the resulting text is UTF-8 encoded.
 * The kind tag and revision together version this projection: the kind tag is
 * the CAS node tag and the revision is carried in the payload envelope.
 *
 * This is a runtime projection contract only. It makes no canonicality or
 * equivalence claim about the independent Lean printer.
 */
import { Effect, Schema } from "effect"
import {
  Byte,
  CasNodeInput,
  ContentId,
  UnknownKind,
  type CasError,
  type ContentId as ContentIdType,
} from "./Node.ts"
import { CasSchemeVersion, CasStore } from "./Store.ts"

declare const RootTypeId: unique symbol

/** A content root whose decoded value is tracked phantasmally. The runtime
 * descriptor still checks the resident node kind before decoding. */
export type Root<A> = ContentIdType & {
  readonly [RootTypeId]: {
    readonly value: (value: A) => A
    readonly expectedKindTag: typeof Byte.Type
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

export interface ValueOptions<A> {
  readonly kindTag: typeof Byte.Type
  readonly revision: number
  readonly schema: Schema.Codec<A, Schema.Json, never, never>
}

export interface CasValue<A> {
  readonly put: (value: A) => Effect.Effect<Root<A>, ProjectionError, CasStore>
  readonly get: (root: Root<A>) => Effect.Effect<A, ProjectionError, CasStore>
}

const HistoryKindTag = 0x48
const WitnessKindTag = 0x57
const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true })

const projectionFailure = (
  direction: "encode" | "decode",
  issue: unknown,
  id?: ContentIdType,
): ProjectionCodecFailure => new ProjectionCodecFailure({
  direction,
  issue: String(issue),
  ...(id === undefined ? {} : { id }),
})

const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Codepoint order — equal to UTF-8 byte order, the language-neutral
 * key ordering CAS-004 pins. Default string comparison is UTF-16
 * code-unit order, which disagrees on astral-plane keys. */
const compareCodepoints = (left: string, right: string): number => {
  const a = Array.from(left)
  const b = Array.from(right)
  const shorter = Math.min(a.length, b.length)
  for (let index = 0; index < shorter; index += 1) {
    const delta = (a[index] as string).codePointAt(0)! - (b[index] as string).codePointAt(0)!
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
      const nextAncestors = new Set(ancestors)
      nextAncestors.add(value)
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
      if (!isPlainObject(value)) {
        throw new TypeError("Canonical JSON objects must have a plain prototype")
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new TypeError("Canonical JSON objects cannot have symbol keys")
      }
      const fields = Object.keys(value).sort(compareCodepoints).map((key) =>
        `${JSON.stringify(key)}:${canonicalJson(
          (value as Record<string, unknown>)[key],
          nextAncestors,
        )}`)
      return `{${fields.join(",")}}`
    }
    default:
      throw new TypeError(`Canonical JSON cannot encode ${typeof value}`)
  }
}

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

const payloadFor = (
  revision: number,
  encoded: unknown,
): Effect.Effect<Uint8Array, ProjectionCodecFailure> =>
  Effect.try({
    try: () => utf8Encoder.encode(canonicalJson({ revision, value: encoded })),
    catch: (issue) => projectionFailure("encode", issue),
  })

const decodedEnvelope = (
  payload: Uint8Array,
  revision: number,
  id: ContentIdType,
): Effect.Effect<unknown, ProjectionCodecFailure> =>
  Effect.try({
    try: () => {
      const text = utf8Decoder.decode(payload)
      const parsed: unknown = JSON.parse(text)
      const canonical = utf8Encoder.encode(canonicalJson(parsed))
      if (!bytesEqual(canonical, payload)) {
        throw new TypeError("Projection payload is not canonical JSON")
      }
      if (
        typeof parsed !== "object"
        || parsed === null
        || Array.isArray(parsed)
        || Object.keys(parsed).length !== 2
        || !("revision" in parsed)
        || !("value" in parsed)
      ) {
        throw new TypeError("Projection payload must be the exact revision/value envelope")
      }
      if ((parsed as { readonly revision?: unknown }).revision !== revision) {
        throw new TypeError(`Projection revision does not match ${revision}`)
      }
      return (parsed as { readonly value: unknown }).value
    },
    catch: (issue) => projectionFailure("decode", issue, id),
  })

const makeRoot = <A>(id: ContentIdType): Root<A> => id as Root<A>

/** Construct a typed value projection over the in-memory CAS service. */
export const value = <A>(options: ValueOptions<A>): CasValue<A> => {
  const kindTag = Byte.make(options.kindTag)
  if (kindTag === HistoryKindTag || kindTag === WitnessKindTag) {
    throw new TypeError(`Projection kind tag 0x${kindTag.toString(16)} is reserved`)
  }
  if (!Number.isSafeInteger(options.revision) || options.revision < 0) {
    throw new TypeError("Projection revision must be a non-negative safe integer")
  }

  const put: CasValue<A>["put"] = (input) =>
    Effect.gen(function* () {
      const store = yield* CasStore
      const encoded = yield* Schema.encodeUnknownEffect(options.schema)(input).pipe(
        Effect.mapError((issue) => projectionFailure("encode", issue)),
      )
      const payload = yield* payloadFor(options.revision, encoded)
      const id = yield* store.put(CasNodeInput.make({
        kind: { version: CasSchemeVersion, tag: kindTag },
        payload,
        refs: [],
      }))
      return makeRoot<A>(id)
    })

  const get: CasValue<A>["get"] = (root) =>
    Effect.gen(function* () {
      const store = yield* CasStore
      const node = yield* store.load(root)
      if (node.kind.tag !== kindTag) {
        return yield* new UnknownKind(node.kind)
      }
      if (node.refs.length !== 0) {
        return yield* projectionFailure(
          "decode",
          "Projection values cannot carry CAS references",
          root,
        )
      }
      const encoded = yield* decodedEnvelope(node.payload, options.revision, root)
      return yield* Schema.decodeUnknownEffect(options.schema)(encoded).pipe(
        Effect.mapError((issue) => projectionFailure("decode", issue, root)),
      )
    })

  return { put, get }
}
