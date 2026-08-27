/**
 * The CAS store service interface.
 *
 * Closure and kind-typing are checked at put; load verifies address
 * recomputation, canonical decode, and known kind, fail-closed with the
 * clause-named CAS errors (ruling GR-6). Renormalize-on-read is a named
 * defect. The in-memory adapter arrives at M2; a trusted fast path for a
 * future filesystem or remote adapter would be a NEW declared mode, never a
 * silent default.
 */
import {
  Context,
  Crypto,
  Effect,
  Encoding,
  Layer,
  PlatformError,
  SynchronizedRef,
} from "effect"
import { bytesEqual } from "../internal/bytes.ts"
import {
  AddressMismatch,
  CasNodeInput,
  ContentNotFound,
  ContentId,
  DanglingReference,
  NonCanonicalBytes,
  StoreFailure,
  UnknownKind,
  WrongKindReference,
  type CasError,
} from "./Node.ts"

export interface CasStoreShape {
  /** Admit and store a node. Every referenced address must already resolve
   * in the store, at its declared kind. */
  readonly put: (node: CasNodeInput) => Effect.Effect<ContentId, CasError>
  /** Load and re-verify a node: recomputed address, canonical decode, known
   * kind. Never renormalizes. */
  readonly load: (id: ContentId) => Effect.Effect<CasNodeInput, CasError>
}

export class CasStore extends Context.Service<CasStore, CasStoreShape>()(
  "foldlab/effect-replay/CasStore",
) {}

/** The only scheme version currently admitted by the runtime adapter. */
export const CasSchemeVersion = 0

/** Abstract address function. The model quantifies over this function; the
 * default runtime adapter below supplies SHA-256. */
export interface CasAddress {
  readonly digest: (
    canonicalBytes: Uint8Array,
  ) => Effect.Effect<ContentId, StoreFailure>
}

const writeNat32 = (target: Uint8Array, offset: number, value: number): void => {
  target[offset] = (value >>> 24) & 0xff
  target[offset + 1] = (value >>> 16) & 0xff
  target[offset + 2] = (value >>> 8) & 0xff
  target[offset + 3] = value & 0xff
}

const readNat32 = (source: Uint8Array, offset: number): number =>
  (source[offset] ?? 0) * 0x1000000
  + (source[offset + 1] ?? 0) * 0x10000
  + (source[offset + 2] ?? 0) * 0x100
  + (source[offset + 3] ?? 0)

/** Project-owned canonical encoder mirrored from `Effects/Cas/Codec.lean`.
 * Schema encoding is deliberately absent from this digest pre-image. */
export const encodeCasNode = (node: CasNodeInput): Uint8Array => {
  const size = 10 + node.payload.length + node.refs.length * 33
  const bytes = new Uint8Array(size)
  bytes[0] = node.kind.version
  bytes[1] = node.kind.tag
  writeNat32(bytes, 2, node.payload.length)
  bytes.set(node.payload, 6)

  let offset = 6 + node.payload.length
  writeNat32(bytes, offset, node.refs.length)
  offset += 4

  for (const ref of node.refs) {
    const address = ContentId.make(ref.id)
    const addressBytes = Encoding.decodeHex(address)
    if (addressBytes._tag === "Failure") {
      throw new Error("validated ContentId failed hex decoding")
    }
    bytes[offset] = ref.expectedTag
    bytes.set(addressBytes.success, offset + 1)
    offset += 33
  }

  return bytes
}

/** Closed decoder: parses exactly one canonical node and rejects every
 * truncation, malformed count, or trailing byte. */
export const decodeCasNode = (bytes: Uint8Array): CasNodeInput | undefined => {
  if (bytes.length < 10) return undefined

  const payloadLength = readNat32(bytes, 2)
  const countOffset = 6 + payloadLength
  if (countOffset + 4 > bytes.length) return undefined

  const refCount = readNat32(bytes, countOffset)
  const refsOffset = countOffset + 4
  if (refsOffset + refCount * 33 !== bytes.length) return undefined

  const refs: Array<{ readonly id: ContentId; readonly expectedTag: number }> = []
  let offset = refsOffset
  for (let index = 0; index < refCount; index += 1) {
    const expectedTag = bytes[offset] ?? 0
    const id = ContentId.make(Encoding.encodeHex(bytes.subarray(offset + 1, offset + 33)))
    refs.push({ id, expectedTag })
    offset += 33
  }

  return CasNodeInput.make({
    kind: { version: bytes[0] ?? 0, tag: bytes[1] ?? 0 },
    payload: bytes.slice(6, countOffset),
    refs,
  })
}

const cloneNode = (node: CasNodeInput): CasNodeInput =>
  CasNodeInput.make({
    kind: { ...node.kind },
    payload: node.payload.slice(),
    refs: node.refs.map((ref) => ({ ...ref })),
  })

const ensureKnownKind = (node: CasNodeInput): Effect.Effect<void, UnknownKind> =>
  node.kind.version === CasSchemeVersion
    ? Effect.void
    : Effect.fail(new UnknownKind(node.kind))

const validateNode = (
  input: CasNodeInput,
): Effect.Effect<CasNodeInput, StoreFailure> =>
  CasNodeInput.makeEffect(input).pipe(
    Effect.mapError((issue) => new StoreFailure({
      reason: `Invalid CAS node input: ${String(issue)}`,
    })),
  )

interface StoredNode {
  readonly canonicalBytes: Uint8Array
  readonly node: CasNodeInput
}

type MemoryState = ReadonlyMap<ContentId, StoredNode>

const checkReferences = (
  state: MemoryState,
  node: CasNodeInput,
): DanglingReference | WrongKindReference | undefined => {
  for (const ref of node.refs) {
    const resident = state.get(ref.id)
    if (resident === undefined) {
      return new DanglingReference({ missing: ref.id })
    }
    if (resident.node.kind.tag !== ref.expectedTag) {
      return new WrongKindReference({
        ref: ref.id,
        expectedTag: ref.expectedTag,
        actualTag: resident.node.kind.tag,
      })
    }
  }
  return undefined
}

/** Resolve SHA-256 through Effect's platform-independent Crypto service. The
 * host runtime supplies the native implementation; this module never reaches
 * through an ambient global. */
export const makeSha256Address: Effect.Effect<CasAddress, never, Crypto.Crypto> =
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    return {
      digest: Effect.fn("CasAddress.sha256")(function* (canonicalBytes) {
        const digest = yield* crypto.digest("SHA-256", canonicalBytes).pipe(
          Effect.mapError((cause) => new StoreFailure({
            reason: `SHA-256 failed: ${String(cause)}`,
          })),
        )
        // A wrong-width digest is a broken host crypto service: fail typed
        // before the branded hex constructor turns it into a defect.
        if (digest.byteLength !== 32) {
          return yield* new StoreFailure({
            reason: `SHA-256 digest was ${digest.byteLength} bytes, expected 32`,
          })
        }
        return ContentId.make(Encoding.encodeHex(digest))
      }),
    }
  })

/** Construct an isolated in-memory store. The map contains admitted nodes
 * only and is updated atomically after closure and kind checks succeed. */
export const makeMemoryCasStore = (
  address: CasAddress,
): Effect.Effect<CasStoreShape> =>
  Effect.gen(function* () {
    const state = yield* SynchronizedRef.make<MemoryState>(new Map())

    const put = Effect.fn("CasStore.put")(function* (input: CasNodeInput) {
      const node = yield* validateNode(input)
      yield* ensureKnownKind(node)
      const canonicalBytes = encodeCasNode(node)
      // Hashing needs no store state, so it runs before the atomic
      // section — a slow digest must not serialize every other put.
      const id = yield* address.digest(canonicalBytes.slice())

      const update = (
        current: MemoryState,
      ): Effect.Effect<
        readonly [ContentId, MemoryState],
        StoreFailure | DanglingReference | WrongKindReference
      > => {
        const admissionError = checkReferences(current, node)
        if (admissionError !== undefined) return Effect.fail(admissionError)

        const resident = current.get(id)
        if (resident !== undefined) {
          if (bytesEqual(resident.canonicalBytes, canonicalBytes)) {
            return Effect.succeed([id, current] as const)
          }
          return Effect.fail(new StoreFailure({
            reason: `Content identifier collision at ${id}`,
          }))
        }

        const next = new Map(current)
        next.set(id, {
          canonicalBytes: canonicalBytes.slice(),
          node: cloneNode(node),
        })
        return Effect.succeed([id, next] as const)
      }

      return yield* SynchronizedRef.modifyEffect(state, update)
    })

    const load = Effect.fn("CasStore.load")(function* (id: ContentId) {
      const current = yield* SynchronizedRef.get(state)
      const resident = current.get(id)
      if (resident === undefined) {
        return yield* new ContentNotFound({ id })
      }

      const canonicalBytes = resident.canonicalBytes.slice()
      const decoded = decodeCasNode(canonicalBytes)
      if (decoded === undefined || !bytesEqual(encodeCasNode(decoded), canonicalBytes)) {
        return yield* new NonCanonicalBytes({ id })
      }

      yield* ensureKnownKind(decoded)
      const actual = yield* address.digest(canonicalBytes.slice())
      if (actual !== id) {
        return yield* new AddressMismatch({ expected: id, actual })
      }

      return cloneNode(decoded)
    })

    return CasStore.of({ put, load })
  })

/** Layer for one isolated in-memory CAS adapter. Without an override, the
 * layer requires the runtime's native `Crypto` service for SHA-256. */
export function layerMemory(): Layer.Layer<CasStore, never, Crypto.Crypto>
export function layerMemory(address: CasAddress): Layer.Layer<CasStore>
export function layerMemory(
  address?: CasAddress,
): Layer.Layer<CasStore, never, Crypto.Crypto> {
  return Layer.effect(
    CasStore,
    address === undefined
      ? makeSha256Address.pipe(Effect.flatMap(makeMemoryCasStore))
      : makeMemoryCasStore(address),
  )
}

/** The WebCrypto-backed `Crypto` layer: SHA-256 through the platform's
 * `crypto.subtle`, which every target runtime provides. The package ships
 * no other Crypto implementation, so this is the production digest path a
 * local composition supplies — proved against the scheme-0 known-answer
 * vectors by the conformance gate. */
export const layerCryptoWebCrypto: Layer.Layer<Crypto.Crypto> = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    randomBytes: (size) => crypto.getRandomValues(new Uint8Array(size)),
    digest: (algorithm, data) =>
      Effect.tryPromise({
        // The pre-image is copied into a plain buffer: a shared or resizable
        // backing store must not change under an in-flight digest.
        try: () => crypto.subtle.digest(algorithm, Uint8Array.from(data)),
        catch: (cause) =>
          new PlatformError.PlatformError(
            new PlatformError.BadArgument({
              module: "Crypto",
              method: "digest",
              description: `${algorithm} failed: ${String(cause)}`,
            }),
          ),
      }).pipe(Effect.map((digest) => new Uint8Array(digest))),
  }),
)

/** The zero-configuration local runtime: one isolated in-memory store over
 * scheme-0 SHA-256 through WebCrypto. */
export const layerMemoryLive: Layer.Layer<CasStore> =
  layerMemory().pipe(Layer.provide(layerCryptoWebCrypto))
