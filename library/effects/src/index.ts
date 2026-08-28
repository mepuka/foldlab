/**
 * @foldlab/cas — a content-addressed store as a data structure,
 * servable, with Effect-native record/replay built on it.
 *
 * Three planes, three namespaces, nothing else at the root:
 *
 * - `Cas` — the data structure: the byte-plane seams and their
 *   backends (memory, file, path-reader, remote), the typed-node
 *   store law, graph closure and verification, node vocabulary and
 *   typed errors, typed value projection, and verified blob reads.
 * - `Server` — the same seams, served: the closed cas-http/0 request
 *   algebra as data, the pure wire law, the semantic core, and the
 *   four-step HTTP shell.
 * - `Replay` — record/replay over the store: the session runtime, the
 *   pure reducer, operation description, and the replayable service
 *   kit.
 *
 * History/witness storage and live-handler binding remain internal
 * modules; their Schemas carry no public canonicality claim.
 * TypeScript observations and Lean model claims remain separate
 * surfaces.
 */
export * as Cas from "./Cas.ts"
export * as Replay from "./Replay.ts"
export * as Server from "./Server.ts"
