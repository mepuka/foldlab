/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The admission contract over the model-generated kernel language. Candidate,
 * intrinsic-act, raw-argument, predicate, and context types below are
 * projections of `KernelSchemas.generated.ts`; this module does not restate
 * their fields or replace the model's bigint identities with runtime digests.
 *
 * `Door.ts` is the shipping implementation and `Admission.ts` is the one
 * Effect seam used by every host. The conformance harness replays the model's
 * emitted vectors against that shipping implementation.
 *
 * @module
 */
import type {
  KernelAct as KernelActSchema,
  KernelCandidateAct as KernelCandidateActSchema,
  KernelCandidateAnchor as KernelCandidateAnchorSchema,
  KernelCandidatePredicate as KernelCandidatePredicateSchema,
  KernelDoor as KernelDoorContextSchema,
  KernelKTriggerPredicate as KernelTriggerPredicateSchema,
  KernelMergeStrategy as KernelMergeStrategySchema,
  KernelRawArg as KernelRawArgSchema,
  KernelTokenClaim as KernelTokenClaimSchema,
} from "./KernelSchemas.generated.js"
import type { KernelRefusalReason } from "./KernelTables.generated.js"

/** The model-generated raw-argument language. */
export type KernelRawArg = typeof KernelRawArgSchema.Type

/** The model-generated candidate anchor. */
export type KernelCandidateAnchor = typeof KernelCandidateAnchorSchema.Type

/** The model-generated token claim. */
export type KernelTokenClaim = typeof KernelTokenClaimSchema.Type

/** The model-generated merge-strategy language. */
export type KernelMergeStrategy = typeof KernelMergeStrategySchema.Type

/** The model-generated candidate trigger language. */
export type KernelCandidatePredicate = typeof KernelCandidatePredicateSchema.Type

/** The model-generated raw candidate language. */
export type KernelCandidateAct = typeof KernelCandidateActSchema.Type

/** The model-generated intrinsic trigger language. */
export type KernelTriggerPredicate = typeof KernelTriggerPredicateSchema.Type

/** The model-generated intrinsic sentence language. */
export type KernelAct = typeof KernelActSchema.Type

/** The model-generated catalog and pinned-universe admission context. */
export type KernelDoorContext = typeof KernelDoorContextSchema.Type

/**
 * One door verdict. The admitted encoding uses the corpus's unbounded integer
 * carrier end to end; a refusal uses the generated wire vocabulary.
 */
export type KernelVerdict =
  | { readonly verdict: "admitted"; readonly encoded: ReadonlyArray<bigint> }
  | { readonly verdict: "refused"; readonly reason: KernelRefusalReason }

/** The single admission operation over the generated candidate language. */
export interface KernelDoor {
  readonly admit: (candidate: KernelCandidateAct) => KernelVerdict
}
