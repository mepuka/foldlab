/**
 * @foldlab/effect-replay — Effect-native content-addressed record/replay.
 *
 * Implemented through M5, the typed descriptor slice, and the R3 remote front
 * end: local and remote CAS admission with reverifying loads, streamed
 * transfer, capability-sized planning, ordered root publication and graph
 * push, pure replay reduction, session execution, replayable service kits,
 * transparent orchestration, and typed value/service projection.
 * History/witness storage and live-handler binding remain internal modules;
 * their Schemas carry no public canonicality claim. TypeScript observations
 * and Lean model claims remain separate surfaces.
 */
export * as Cas from "./Cas.ts"
export * from "./cas/Node.ts"
export * from "./cas/Store.ts"
export * from "./cas/Value.ts"
export {
  CasRemoteConfig,
  CasRemoteError,
  RemoteCapabilities,
  RedirectPolicy,
  RemoteAuthority,
  RemoteAuthorityMode,
  RemoteBudgetError,
  RemoteBudgetStage,
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
} from "./cas/Remote.ts"
export type { CasPresence, CasPushReport } from "./cas/Remote.ts"
export { CasTransfer } from "./cas/Transfer.ts"
export type {
  CasTransferShape,
  PutStreamOptions,
  UploadSource,
} from "./cas/Transfer.ts"
export * as Transfer from "./cas/Transfer.ts"
export type {
  CasService,
  EffectServiceOptions,
  SyncServiceOptions,
} from "./cas/Service.ts"
export * from "./replay/Decision.ts"
export * from "./replay/Operation.ts"
export * from "./replay/Session.ts"
export * from "./replay/Reducer.ts"
export * from "./replay/Replay.ts"
export * from "./replay/ServiceAdapter.ts"
