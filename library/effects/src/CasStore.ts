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
import { Context, type Effect } from "effect"
import type { CasError, CasNodeInput, ContentId } from "./CasNode.ts"

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
