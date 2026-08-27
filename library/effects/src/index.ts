/**
 * @foldlab/effect-replay — Effect-native content-addressed record/replay.
 *
 * Implemented through M5 plus the typed descriptor slice: CAS admission and
 * reverifying loads, pure replay reduction, session execution, replayable
 * service kits, transparent orchestration, and typed value/service projection.
 * History/witness storage and live-handler binding remain internal modules;
 * their Schemas carry no public canonicality claim. TypeScript observations
 * and Lean model claims remain separate surfaces.
 */
export * as Cas from "./Cas.ts"
export * from "./cas/Node.ts"
export * from "./cas/Store.ts"
export * from "./cas/Value.ts"
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
