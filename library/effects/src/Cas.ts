/**
 * The CAS plane, one front door. Service tags, node vocabulary, typed
 * projections, streamed transfer, and remote policy re-exported under one
 * namespace; the `Cas` prefix of an internal module name drops here because
 * the namespace already carries it. Everything else in `src/cas/` and
 * `src/internal/` is implementation.
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

// The whole-node store boundary and the scheme-0 canonical codec.
export {
  CasSchemeVersion as SchemeVersion,
  CasStore as Store,
  decodeCasNode as decodeNode,
  encodeCasNode as encodeNode,
  layerCryptoWebCrypto,
  layerMemory,
  layerMemoryLive,
  makeMemoryCasStore as makeMemoryStore,
  makeSha256Address,
} from "./cas/Store.ts"
export type { CasAddress as Address, CasStoreShape as StoreShape } from "./cas/Store.ts"

// Typed value projection.
export { ProjectionCodecFailure, value } from "./cas/Value.ts"
export type {
  CasValue as Value,
  ProjectionError,
  Root,
  ValueOptions,
} from "./cas/Value.ts"

// Typed service projection.
export { service } from "./cas/Service.ts"
export type {
  CasService as Service,
  EffectServiceOptions,
  SyncServiceOptions,
} from "./cas/Service.ts"

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

// Remote policy, capabilities, and the typed remote error family.
export {
  CasRemoteConfig as RemoteConfig,
  CasRemoteError as RemoteError,
  CapabilityProbeMode,
  DefaultDecisionTranscriptCapacity,
  RedirectPolicy,
  RemoteAuthority,
  RemoteAuthorityMode,
  RemoteBudgetError,
  RemoteBudgetStage,
  RemoteCapabilities,
  RemoteCompletion,
  RemoteIntegrityCode,
  RemoteIntegrityError,
  RemotePolicyCode,
  RemotePolicyError,
  RemoteProtocolCode,
  RemoteProtocolError,
  RemoteStage,
  RemoteUnavailableCode,
  RemoteUnavailableError,
  remoteConfig,
} from "./cas/Remote.ts"
export type { RemoteConfigOptions } from "./cas/Remote.ts"

/**
 * Build the remote store and transfer views once over one shared adapter.
 * The transport owns the pinned FetchHttpClient realization so manual redirect
 * observation cannot be bypassed. Capability probing is eager by default;
 * `capabilityProbe: "lazy"` defers its one memoized probe until a wire-backed
 * operation first needs it. Platform Crypto remains a visible layer requirement.
 */
export { layerRemote } from "./internal/remote.ts"
