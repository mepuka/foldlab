/**
 * The CAS store service: the typed-node law over the byte-plane seams.
 *
 * Closure and kind-typing are checked at put; load verifies address
 * recomputation, canonical decode, and known kind, fail-closed with the
 * clause-named CAS errors (ruling GR-6). Renormalize-on-read is a named
 * defect. The store owns no storage: it is one law over whichever
 * `ByteReader`/`ByteWriter` backend the composition supplies, so a
 * corrupt, concurrent, or hostile backend surfaces as a typed refusal
 * on read, never as silently served bytes. Check-then-insert is sound
 * without a lock because the byte plane only grows.
 */
import {
  Context,
  Crypto,
  Effect,
  Encoding,
  Layer,
  Option,
  PlatformError,
} from "effect"
import type { FileSystem } from "effect"
import {
  ByteReader,
  ByteWriter,
  layerMemoryBackend,
  type BackendFailure,
  type ByteReaderShape,
  type ByteWriterShape,
  type RootStore,
} from "./Backend.ts"
import { layerFileBackend } from "./FileBackend.ts"
import {
  judgeAdmission,
  kindTagOfCanonical,
  type AdmissionFacts,
} from "../internal/admission.ts"
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

export interface CasLoaderShape {
  /** Load and re-verify a node: recomputed address, canonical decode, known
   * kind. Never renormalizes. */
  readonly load: (id: ContentId) => Effect.Effect<CasNodeInput, CasError>
}

/** The load-only law: everything a typed read needs, requiring only the
 * read seam — so a read-only composition (a path-reader host) serves
 * typed values and graphs with no writer anywhere. Every store
 * composition provides it alongside `CasStore`. */
export class CasLoader extends Context.Service<CasLoader, CasLoaderShape>()(
  "foldlab/cas/CasLoader",
) {}

export interface CasStoreShape extends CasLoaderShape {
  /** Admit and store a node. Every referenced address must already resolve
   * in the store, at its declared kind. */
  readonly put: (node: CasNodeInput) => Effect.Effect<ContentId, CasError>
}

export class CasStore extends Context.Service<CasStore, CasStoreShape>()(
  "foldlab/cas/CasStore",
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

const backendFailure = (failure: BackendFailure): StoreFailure =>
  new StoreFailure({ reason: `Backend failed: ${failure.reason}` })

/** The read-verification law, shared by `load` and the graph walks:
 * canonical decode, byte-identical re-encoding, known kind, recomputed
 * address. Never renormalizes; a failing byte plane surfaces typed. */
export const verifyNodeBytes = (
  address: CasAddress,
  id: ContentId,
  bytes: Uint8Array,
): Effect.Effect<CasNodeInput, CasError> =>
  Effect.gen(function* () {
    const canonicalBytes = bytes.slice()
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

/** Resolve SHA-256 through Effect's platform-independent Crypto service. The
 * host runtime supplies the native implementation; this module never reaches
 * through an ambient global. */
export const makeSha256Address: Effect.Effect<CasAddress, never, Crypto.Crypto> =
    Crypto.Crypto.pipe(
      Effect.map((crypto) => ({
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
    })))

/** Construct the load-only law over an explicit read seam. */
export const makeCasLoaderOver = (
  address: CasAddress,
  reader: ByteReaderShape,
): CasLoaderShape => ({
  load: Effect.fn("CasStore.load")(function* (id: ContentId) {
    const resident = yield* reader.loadBytes(id).pipe(
      Effect.mapError(backendFailure),
    )
    if (Option.isNone(resident)) {
      return yield* new ContentNotFound({ id })
    }
    return yield* verifyNodeBytes(address, id, resident.value)
  }),
})

/** Construct the store law over explicit seam shapes — the constructor
 * for embeddings that hold a backend directly, without Layer wiring. */
export const makeCasStoreOver = (
  address: CasAddress,
  reader: ByteReaderShape,
  writer: ByteWriterShape,
): CasStoreShape => {
  /** Answer the admission judgment's facts from the byte plane: the
   * actual kind tag per reference (the second canonical byte), and any
   * bytes resident at the candidate id. */
  const admissionFacts = Effect.fn("CasStore.admissionFacts")(function* (
    node: CasNodeInput,
    id: ContentId,
  ) {
    const refTags: Array<Option.Option<number>> = []
    for (const ref of node.refs) {
      const resident = yield* reader.loadBytes(ref.id)
      refTags.push(Option.map(resident, kindTagOfCanonical))
    }
    const resident = yield* reader.loadBytes(id)
    const facts: AdmissionFacts = { refTags, resident }
    return facts
  })

  const put = Effect.fn("CasStore.put")(function* (input: CasNodeInput) {
    const node = yield* validateNode(input)
    yield* ensureKnownKind(node)
    const canonicalBytes = encodeCasNode(node)
    const id = yield* address.digest(canonicalBytes.slice())

    // One admission law for every backend: the shared pure judge over
    // facts the byte plane answers. Grow-only monotonicity makes
    // check-then-insert sound without a lock.
    const verdict = judgeAdmission(
      canonicalBytes,
      yield* admissionFacts(node, id).pipe(Effect.mapError(backendFailure)),
    )
    switch (verdict._tag) {
      case "DanglingReference":
        return yield* new DanglingReference({ missing: verdict.missing })
      case "WrongKindReference":
        return yield* new WrongKindReference({
          ref: verdict.ref,
          expectedTag: verdict.expectedTag,
          actualTag: verdict.actualTag,
        })
      case "Collision":
        return yield* new StoreFailure({
          reason: `Content identifier collision at ${id}`,
        })
      case "AlreadyResident":
        return id
      case "NonCanonical":
      case "UnknownKind":
        // Unreachable for a validated, freshly encoded node; kept
        // typed so a codec regression cannot admit silently.
        return yield* new StoreFailure({
          reason: `Admission refused own encoding: ${verdict._tag}`,
        })
      case "Admit": {
        yield* writer.putBytes(id, canonicalBytes).pipe(
          Effect.mapError(backendFailure),
        )
        return id
      }
    }
  })

  return CasStore.of({ put, ...makeCasLoaderOver(address, reader) })
}

/** Construct the store law over the seams in context. */
export const makeCasStore = (
  address: CasAddress,
): Effect.Effect<CasStoreShape, never, ByteReader | ByteWriter> =>
  Effect.gen(function* () {
    const reader = yield* ByteReader
    const writer = yield* ByteWriter
    return makeCasStoreOver(address, reader, writer)
  })

/** Construct an isolated in-memory store: the law over one fresh memory
 * backend, for callers that need a store value rather than a Layer. */
export const makeMemoryCasStore = (
  address: CasAddress,
): Effect.Effect<CasStoreShape> =>
  Effect.sync(() => {
    const backend = (() => {
      const nodes = new Map<ContentId, Uint8Array>()
      return {
        reader: {
          loadBytes: (id: ContentId) => Effect.sync(() => {
            const resident = nodes.get(id)
            return resident === undefined
              ? Option.none<Uint8Array>()
              : Option.some(resident.slice())
          }),
          presence: (ids: ReadonlyArray<ContentId>) => Effect.sync(() =>
            ids.map((id) => nodes.has(id) ? "present" as const : "missing" as const)),
        },
        writer: {
          putBytes: (id: ContentId, bytes: Uint8Array) => Effect.sync(() => {
            if (!nodes.has(id)) nodes.set(id, bytes.slice())
          }),
        },
      }
    })()
    return makeCasStoreOver(address, backend.reader, backend.writer)
  })

/** The store-law Layer over whichever backend the composition supplies,
 * the load-only law provided beside it. Without an explicit address,
 * SHA-256 through the runtime's `Crypto`. */
export function layerStore(): Layer.Layer<
  CasStore | CasLoader,
  never,
  ByteReader | ByteWriter | Crypto.Crypto
>
export function layerStore(
  address: CasAddress,
): Layer.Layer<CasStore | CasLoader, never, ByteReader | ByteWriter>
export function layerStore(
  address?: CasAddress,
): Layer.Layer<CasStore | CasLoader, never, ByteReader | ByteWriter | Crypto.Crypto> {
  return Layer.effectContext(
    (address === undefined
      ? makeSha256Address.pipe(Effect.flatMap(makeCasStore))
      : makeCasStore(address)).pipe(
        Effect.map((store) => Context.make(CasStore, store).pipe(
          Context.add(CasLoader, { load: store.load }),
        )),
      ),
  )
}

/** The load-only law over the read seam alone — what a read-only
 * composition (a path-reader host) provides so typed reads work with
 * no writer anywhere. Without an explicit address, SHA-256 through the
 * runtime's `Crypto`. */
export function layerReadStore(): Layer.Layer<
  CasLoader,
  never,
  ByteReader | Crypto.Crypto
>
export function layerReadStore(
  address: CasAddress,
): Layer.Layer<CasLoader, never, ByteReader>
export function layerReadStore(
  address?: CasAddress,
): Layer.Layer<CasLoader, never, ByteReader | Crypto.Crypto> {
  const loader = Effect.gen(function* () {
    const reader = yield* ByteReader
    const resolved = address === undefined ? yield* makeSha256Address : address
    return makeCasLoaderOver(resolved, reader)
  })
  return Layer.effect(CasLoader, loader)
}

/** One isolated in-memory CAS: the store law over a fresh memory
 * backend, with the seams exposed for further composition — the same
 * backend value can stand under a server. Without an override, the
 * layer requires the runtime's native `Crypto` service for SHA-256. */
export function layerMemory(): Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore,
  never,
  Crypto.Crypto
>
export function layerMemory(
  address: CasAddress,
): Layer.Layer<CasStore | CasLoader | ByteReader | ByteWriter | RootStore>
export function layerMemory(
  address?: CasAddress,
): Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore,
  never,
  Crypto.Crypto
> {
  return (address === undefined ? layerStore() : layerStore(address)).pipe(
    Layer.provideMerge(layerMemoryBackend),
  )
}

/** One file-backed CAS: the store law over a store root, seams exposed
 * for further composition — the same backend value can stand under a
 * server. The `FileSystem` realization stays a visible layer
 * requirement; without an address override, so does `Crypto`. */
export function layerFile(storeRoot: string): Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore,
  never,
  FileSystem.FileSystem | Crypto.Crypto
>
export function layerFile(
  storeRoot: string,
  address: CasAddress,
): Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore,
  never,
  FileSystem.FileSystem
>
export function layerFile(
  storeRoot: string,
  address?: CasAddress,
): Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore,
  never,
  FileSystem.FileSystem | Crypto.Crypto
> {
  return (address === undefined ? layerStore() : layerStore(address)).pipe(
    Layer.provideMerge(layerFileBackend(storeRoot)),
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
 * scheme-0 SHA-256 through WebCrypto, seams exposed. */
export const layerMemoryLive: Layer.Layer<
  CasStore | CasLoader | ByteReader | ByteWriter | RootStore
> = layerMemory().pipe(Layer.provide(layerCryptoWebCrypto))
