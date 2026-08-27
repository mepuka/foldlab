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
export * from "./CasNode.ts"
export * from "./CasStore.ts"
export * from "./CasValue.ts"
export type {
  CasService,
  EffectServiceOptions,
  SyncServiceOptions,
} from "./CasService.ts"
export * from "./Decision.ts"
export * from "./Operation.ts"
export * from "./Replay.ts"
export * from "./ServiceAdapter.ts"
