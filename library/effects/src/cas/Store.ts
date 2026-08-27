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
  Option,
  PlatformError,
  SynchronizedRef,
} from "effect"
import { judgeAdmission, type AdmissionFacts } from "../internal/admission.ts"
import { bytesEqual } from "../internal/bytes.ts"
import {
  CasSchemeVersion,
  decodeCasNode,
  encodeCasNode,
} from "../internal/casCodec.ts"
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

/** Abstract address function. The model quantifies over this function; the
 * default runtime adapter below supplies SHA-256. */
export interface CasAddress {
  readonly digest: (
    canonicalBytes: Uint8Array,
  ) => Effect.Effect<ContentId, StoreFailure>
}

export { CasSchemeVersion, decodeCasNode, encodeCasNode } from "../internal/casCodec.ts"

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

/** Answer the admission core's facts from the in-memory map: the actual
 * kind tag per reference, and any bytes resident at the candidate id. */
const memoryFacts = (
  state: MemoryState,
  node: CasNodeInput,
  id: ContentId,
): AdmissionFacts => ({
  refTags: node.refs.map((ref) => {
    const resident = state.get(ref.id)
    return resident === undefined
      ? Option.none()
      : Option.some(resident.node.kind.tag)
  }),
  resident: ((resident) => resident === undefined
    ? Option.none()
    : Option.some(resident.canonicalBytes))(state.get(id)),
})

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
        // One admission law for every backend: the shared pure judge
        // over facts this map answers.
        const verdict = judgeAdmission(canonicalBytes, memoryFacts(current, node, id))
        switch (verdict._tag) {
          case "DanglingReference":
            return Effect.fail(new DanglingReference({ missing: verdict.missing }))
          case "WrongKindReference":
            return Effect.fail(new WrongKindReference({
              ref: verdict.ref,
              expectedTag: verdict.expectedTag,
              actualTag: verdict.actualTag,
            }))
          case "Collision":
            return Effect.fail(new StoreFailure({
              reason: `Content identifier collision at ${id}`,
            }))
          case "AlreadyResident":
            return Effect.succeed([id, current] as const)
          case "NonCanonical":
          case "UnknownKind":
            // Unreachable for a validated, freshly encoded node; kept
            // typed so a codec regression cannot admit silently.
            return Effect.fail(new StoreFailure({
              reason: `Admission refused own encoding: ${verdict._tag}`,
            }))
          case "Admit": {
            const next = new Map(current)
            next.set(id, {
              canonicalBytes: canonicalBytes.slice(),
              node: cloneNode(node),
            })
            return Effect.succeed([id, next] as const)
          }
        }
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
      const decodedNode = decodeCasNode(canonicalBytes)
      if (Option.isNone(decodedNode)
        || !bytesEqual(encodeCasNode(decodedNode.value), canonicalBytes)) {
        return yield* new NonCanonicalBytes({ id })
      }
      const decoded = decodedNode.value

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
