/**
 * The CAS plane, one front door — a content-addressed store as a data
 * structure. The `Cas` prefix of an internal module name drops here
 * because the namespace already carries it; everything else in
 * `src/cas/` and `src/internal/` is implementation.
 *
 * The shape is three layers: dumb byte-plane seams at the bottom
 * (`ByteReader`/`ByteWriter`/`RootStore`) with interchangeable
 * backends (memory, file, any path-addressed host); the typed-node
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
  RemoteFailure,
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
  makeFileBackend,
  StoreRoot,
} from "./cas/FileBackend.ts"

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
  CasLoader as Loader,
  CasSchemeVersion as SchemeVersion,
  CasStore as Store,
  decodeCasNode as decodeNode,
  encodeCasNode as encodeNode,
  layerCryptoWebCrypto,
  layerFile,
  layerMemory,
  layerMemoryLive,
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

// Streamed transfer above the store boundary.
export { CasTransfer as Transfer, oneShot, restartable } from "./cas/Transfer.ts"
export type {
  CasPresence as Presence,
  CasPushReport as PushReport,
  CasTransferShape as TransferShape,
  PutStreamOptions,
  UploadSource,
} from "./cas/Transfer.ts"

// The remote entry points stay on the front door; the policy,
// capability, and error machinery lives one level down at
// `Cas.Remote.*`.
export { CasRemoteConfig as RemoteConfig, remoteConfig } from "./cas/Remote.ts"
export type { RemoteConfigOptions } from "./cas/Remote.ts"
export * as Remote from "./cas/Remote.ts"

/**
 * Build the remote store and transfer views once over one shared adapter.
 * The transport owns the pinned FetchHttpClient realization so manual redirect
 * observation cannot be bypassed. Capability probing is eager by default;
 * `capabilityProbe: "lazy"` defers the probe until a wire-backed operation
 * first needs it — a successful probe is memoized for the layer's life,
 * while a retryable failure re-probes on the next call. Platform Crypto
 * remains a visible layer requirement.
 */
export { layerRemote } from "./internal/remote.ts"
