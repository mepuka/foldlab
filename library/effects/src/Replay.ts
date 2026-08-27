/**
 * The replay service: modes, the ratified mismatch taxonomy, the recorded
 * outcome envelope, the tagged session outcome, and the session-owning
 * service interface.
 *
 * Transport ruling (GR-1b): caller-facing method types are byte-identical
 * across live, record, and replay modes. Replay rejections and violations
 * travel from wrapped methods to the session boundary through a named
 * defect-class seam — they never widen a method's error union — and land in
 * the tagged session outcome. The internal defect is plumbing, never
 * modeled defect semantics.
 */
import { Context, type Effect, Schema } from "effect"
import type { CasError, ContentId } from "./CasNode.ts"
import type { AnyOperationDescription } from "./Operation.ts"

/** Record invokes live adapters and appends history; replay is hermetic. */
export const ReplayMode = Schema.Literals(["record", "replay"])
export type ReplayMode = typeof ReplayMode.Type

/** The six ratified mismatch categories (GR-2). Request-side, checked at
 * the cursor: operation, revision, request, history exhausted.
 * Completion-side: unconsumed suffix. Outcome-side, checked at consumption:
 * outcome inadmissible. "Order mismatch" is deliberately not a category;
 * CAS storage failures are a distinct typed family. */
export const MismatchCategory = Schema.Literals([
  "OperationMismatch",
  "RevisionMismatch",
  "RequestMismatch",
  "HistoryExhausted",
  "UnconsumedSuffix",
  "OutcomeInadmissible",
])
export type MismatchCategory = typeof MismatchCategory.Type

/** Channel-preserving recorded outcome envelope (GR-9): success of the
 * declared success Schema or failure of the declared typed-failure Schema.
 * Substitution re-injects through the native Effect channels so recovery
 * combinators fire exactly as they did live. */
export const RecordedOutcome = <S extends Schema.Top, F extends Schema.Top>(
  success: S,
  failure: F,
) =>
  Schema.Union([
    Schema.TaggedStruct("Success", { value: success }),
    Schema.TaggedStruct("Failure", { error: failure }),
  ])

/** A program terminal: success or declared typed failure. */
export type Terminal<A, E> =
  | { readonly _tag: "Succeeded"; readonly value: A }
  | { readonly _tag: "Failed"; readonly error: E }

/** An ambient-service violation caught by the replay-mode tripwire
 * Clock/Random defaults (ruling D7). */
export interface AmbientServiceViolation {
  readonly service: "Clock" | "Random"
}

/** The tagged session outcome (GR-5, GR-8). UnconsumedSuffix is the
 * Rejected case that populates terminalSoFar — the program terminated, but
 * a recorded action was never re-emitted; request-side mismatches leave it
 * empty. The durable witness Schema is internal until the M3 re-freeze. */
export type SessionOutcome<A, E> =
  | { readonly _tag: "Completed"; readonly terminal: Terminal<A, E> }
  | {
      readonly _tag: "Rejected"
      readonly category: MismatchCategory
      readonly at: number
      readonly terminalSoFar?: Terminal<A, E>
    }
  | { readonly _tag: "Violated"; readonly violation: AmbientServiceViolation }

export interface ReplayShape {
  /** Adapter-facing: route one described invocation through the session.
   * The error channel is exactly the operation's declared failure type.
   * Mismatch, inadmissibility, AND record-mode append failure all travel
   * the defect-class transport seam (GR-1b) — orchestration cannot catch
   * what is not in the channel, so a store failure aborts the session and
   * history stays a truthful prefix structurally (GR-7's poisoning intent,
   * realized without a mutable poisoned flag; the failure surfaces as the
   * session's typed CasError). */
  readonly invoke: <D extends AnyOperationDescription>(
    operation: D,
    request: D["request"]["Type"],
  ) => Effect.Effect<D["success"]["Type"], D["failure"]["Type"]>
}

export class Replay extends Context.Service<Replay, ReplayShape>()(
  "foldlab/effect-replay/Replay",
) {}

/** Run a program under a session. Signature frozen at M1; implementation
 * arrives at M4. The history root names a ratified recorded history for
 * replay mode; record mode produces one. */
export declare const session: <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options: { readonly mode: ReplayMode; readonly history?: ContentId },
) => Effect.Effect<SessionOutcome<A, E>, CasError, R | Replay>
