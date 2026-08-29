/**
 * The CAS plane, one front door — a content-addressed store as a data
 * structure. The `Cas` prefix of an internal module name drops here
 * because the namespace already carries it; everything else in
 * `src/cas/` and `src/internal/` is implementation.
 *
 * The shape is three layers: dumb byte-plane seams at the bottom
 * (`ByteReader`/`ByteWriter`/`RootStore`) with interchangeable
 * backends (memory, file, key-value, any path-addressed host); the typed-node
 * store law over them (admission at put, re-verification at load);
 * and the typed laws above the store — value projections with typed
 * references, verified blob reads, graph closure and audit. The same
 * backend value serves embedded use or a server: hand it to the
 * `Server` namespace and nothing else changes.
 */
// Node vocabulary and the typed error family.
export {
  AddressMismatch,
  Byte,
  CasErrorTag as ErrorTag,
  CasNodeInput as NodeInput,
  CasReference as Reference,
  ContentId,
  ContentNotFound,
  DanglingReference,
  isCasError,
  matchCasError as matchError,
  NodeKind,
  NonCanonicalBytes,
  StoreFailure,
  UnknownKind,
  WrongKindReference,
} from "./cas/Node.ts"
export type { CasError as Error } from "./cas/Node.ts"

// The byte-plane seams: read, write, and roots capabilities as
// separate services — a read-only backend simply never provides the
// writer — plus the store-root layout contract path-shaped backends
// share.
export {
  BackendFailure,
  ByteReader,
  ByteWriter,
  layerMemoryBackend,
  makeMemoryBackend,
  objectRelativePath,
  RootStore,
  rootRelativePath,
} from "./cas/Backend.ts"
export type {
  ByteReaderShape,
  ByteWriterShape,
  MemoryBackend,
  PresenceStatus,
  RootStoreShape,
} from "./cas/Backend.ts"

// The file backend: a store root on any `FileSystem` realization.
export {
  layerFileBackend,
  layerFileBackendFromFileUrl,
  layerFileBackendWithPath,
  makeFileBackend,
  makeFileBackendFromFileUrl,
  makeFileBackendWithPath,
  normalizeStoreRoot,
  normalizeStoreRootWith,
  storeRootFromFileUrl,
  StoreRoot,
} from "./cas/FileBackend.ts"

// The key-value backend: the byte plane over any Effect
// `KeyValueStore` — memory, a directory, or SQL, which is the SQLite
// and therefore the Litestream route. It provides read and write and
// never roots: a key-value store carries no key enumeration, so
// `RootStore.list` cannot be written over it.
export { layerKvsBackend, makeKvsBackend } from "./cas/KvsBackend.ts"
export type { KvsBackend } from "./cas/KvsBackend.ts"

// The path-reader backend: a read-only byte plane over any host that
// serves bytes at a path — a git server's raw endpoint, an object
// store, a static file host. The caller supplies `ReadPath`.
export {
  layerPathReader,
  makePathReader,
  PathReadError,
} from "./cas/PathReader.ts"
export type { ReadPath } from "./cas/PathReader.ts"

// The whole-node store law over the seams, the scheme-0 canonical
// codec, and the composed conveniences (memory and file stores with
// their seams exposed).
export {
  AddressScheme,
  CasLoader as Loader,
  CasSchemeVersion as SchemeVersion,
  CasStore as Store,
  decodeCasNode as decodeNode,
  encodeCasNode as encodeNode,
  layerAddressSha256Live,
  layerCryptoWebCrypto,
  layerFile,
  layerFileFromFileUrl,
  layerFileWithPath,
  layerMemory,
  layerMemoryLive,
  layerMemoryWith,
  layerReadStore,
  layerStore,
  makeCasLoaderOver as makeLoaderOver,
  makeCasStore as makeStore,
  makeCasStoreOver as makeStoreOver,
  makeMemoryCasStore as makeMemoryStore,
  makeSha256Address,
  verifyNodeBytes,
} from "./cas/Store.ts"
export type {
  CasAddress as Address,
  CasLoaderShape as LoaderShape,
  CasStoreShape as StoreShape,
} from "./cas/Store.ts"

// Graph laws over the read seam alone: children-first closure and the
// untrusted-host audit.
export * as Graph from "./cas/Graph.ts"

// The library described in itself: the architecture as a value, its
// Schema, a service, and a layer — pinned against the Lean model's
// twin description through one shared canonical matrix.
export * as Architecture from "./cas/Architecture.ts"

// The schema plane's root: canonical schemas as content — identity by
// digest of canonical bytes — carried by Effect Schema through the
// annotation API. No schema stands above it.
export * as CanonicalSchema from "./cas/CanonicalSchema.ts"

// The registered replay surface: the Lean-emitted conformance vector
// as a first-class type, wire schemas hand-mirroring the emitter.
export * as ConformanceVector from "./cas/ConformanceVector.ts"

// Typed value projection, with typed references (CAS-005).
export { ProjectionCodecFailure, ref, value } from "./cas/Value.ts"
export type {
  CasValue as Value,
  ProjectionError,
  Root,
  ValueOptions,
} from "./cas/Value.ts"

// Verified blob reads and recipe-1 construction.
export { CasBlob as Blob } from "./cas/Blob.ts"
