/**
 * @foldlab/effect-replay — Effect-native content-addressed record/replay.
 *
 * Two planes, two namespaces, nothing else at the root:
 *
 * - `Cas` — content-addressed storage: the store and transfer service tags,
 *   node vocabulary and typed errors, typed value/service projection,
 *   verified blob reads, and the remote adapter with explicit policy.
 * - `Replay` — record/replay: the session runtime, the pure reducer, operation
 *   description, and the replayable service kit.
 *
 * History/witness storage and live-handler binding remain internal modules;
 * their Schemas carry no public canonicality claim. TypeScript observations
 * and Lean model claims remain separate surfaces.
 */
export * as Cas from "./Cas.ts"
export * as Replay from "./Replay.ts"
