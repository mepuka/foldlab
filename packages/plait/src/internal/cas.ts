/**
 * Plane: internal — private adapters serve any layer and reach back only to their own public seam.
 *
 * @module
 */
import { Effect, type Reducer } from "effect"

import type { Refusal } from "../truth/Refusal.js"

/**
 * The lawful class-(a) write path: read, join, CAS at the observed revision,
 * and reconcile a failed CAS by read-back.
 *
 * This is the cell adapter's merge loop, extracted unchanged in behaviour
 * (affordances A-7, the refereed G-2 extraction contract; friction card FH-2).
 * The loop was written inline before the contract landed and was written well;
 * what this module adds is the seam — its interface (read / create / update /
 * discipline / bound) had been implicit in one adapter's closure, so every
 * future lattice carrier would have restated bounded-retry mechanics,
 * reconciliation order, and revision plumbing. `Cells.merge` is its first
 * consumer and today its only one.
 *
 * **Whose license this is, stated rather than implied.** The second join
 * consumers — directory bind, admission facts, memory cells — are chartered by
 * the ratified G36/kernel rulings and are NOT shipped. The extraction's license
 * is therefore the kernel ratification, where `join`'s runtime carrier is named
 * as this combinator (`docs/design/2026-08-18-plait-kernel-algebra.md` §4.2),
 * not a second adapter in this tree. One adapter today would otherwise make
 * this a hypothetical seam.
 *
 * **What the loop claims and does not.** Convergence on success is F1's —
 * `f1_cell_merge_aci`, `f1_history_convergence` — never the loop's: a lost race
 * re-reads, re-merges, and re-CASes, and idempotence is what makes a repeated
 * contribution cost nothing. **Completion is not claimed.** The attempt bound
 * is flow control with no correctness stake, and exhaustion refuses the
 * adapter's own typed absence, which a caller composes with
 * `Refusal.retryAbsence` — an unbounded loop would hide contention inside an
 * invisible hang instead. The conflict classification lives in the adapter's
 * `create`/`update`, never here. Every claim is bounded to a fixed
 * backing-stream incarnation (DEV-704 seam rule 7): revisions are backing-stream
 * sequences, so a bucket delete+recreate resets the order underneath all of it.
 */

/**
 * The attempt bound a carrier that states none inherits.
 *
 * It equals the cell adapter's shipped bound, and the adapter still passes its
 * own `CELL_MERGE_ATTEMPTS`: that constant is public, and the cell wall reads it
 * to build a schedule that lands exactly at the boundary.
 */
const DEFAULT_ATTEMPTS = 8

/**
 * The lawful join (⊔) over a carrier, with the two things the loop needs
 * besides `combine`: the state of a key nothing has written, and carrier
 * identity.
 *
 * `combine` is effectful, which is the one amendment the shipped types force on
 * A-7's `Reducer.Reducer<A>` sketch: this package's join refuses values outside
 * the RFC 8785 wire grammar (`Cell.join` runs `canonicalize`), so a pure
 * `combine` would have to throw or lie. A pure reducer — the shape
 * `Algebra.declare` earns its commutative brand over — enters through
 * {@link joinOf}, so the ACI brand stays earned rather than asserted.
 */
export interface CasJoin<A> {
  /** The least upper bound of two states. */
  readonly combine: (left: A, right: A) => Effect.Effect<A, Refusal>
  /** The state of a key no writer has written — `Reducer.initialValue`, ⊥. */
  readonly initialValue: A
  /** Carrier identity; canonical-byte equality in every carrier shipped here. */
  readonly identical: (left: A, right: A) => Effect.Effect<boolean, Refusal>
}

/**
 * Lifts a declared algebra's reducer into the loop's join position.
 *
 * The reducer is the value `Algebra.declare` content-addresses and
 * `Algebra.commutative` brands, so a carrier whose join really is pure supplies
 * `algebra.reducer` here and inherits the earned-brand discipline with it.
 */
export const joinOf = <A>(
  reducer: Reducer.Reducer<A>,
  identical: (left: A, right: A) => Effect.Effect<boolean, Refusal>,
): CasJoin<A> => ({
  combine: (left, right) => Effect.succeed(reducer.combine(left, right)),
  initialValue: reducer.initialValue,
  identical,
})

/**
 * Whether a state already carries a contribution — the lattice order, `c ≤ x`
 * iff `x ⊔ c = x`.
 *
 * The loop asks this before every CAS, so a contribution already carried costs
 * one read and no CAS traffic at all: the idempotence dividend. It is
 * deliberately NOT routed through the discipline, because a control that swaps
 * reconciliation must leave this guard alone — that is exactly what makes the
 * retry boundary discriminate between the two disciplines.
 */
export const carries = Effect.fn("Cas.carries")(function*<A>(
  join: CasJoin<A>,
  state: A,
  contribution: A,
): Effect.fn.Return<boolean, Refusal> {
  return yield* join.identical(yield* join.combine(state, contribution), state)
})

/**
 * The two steps of the merge loop a negative control may replace, named so a
 * control deletes exactly one behaviour and provably shares everything else —
 * connection, key law, attempt loop, CAS mechanics, canonical encoding, the
 * pre-CAS guard, and the step it does not touch.
 */
export interface MergeDiscipline<A> {
  /** The state a contribution writes over the current state. The lawful step is the join (⊔). */
  readonly next: (current: A, contribution: A) => Effect.Effect<A, Refusal>
  /** Whether a read-back after a failed CAS already carries the contribution. */
  readonly reconciled: (
    readBack: A,
    contribution: A,
    intended: A,
  ) => Effect.Effect<boolean, Refusal>
}

/** One state and the substrate revision it was observed at. */
export interface Revisioned<A> {
  readonly value: A
  readonly revision: number
}

/**
 * A write the substrate refused, carried past the read-back unclassified.
 *
 * Reconcile-before-classify (seam rule 1) is an ORDER, not a preference, so the
 * carrier keeps both halves of the adapter's answer and the loop consults them
 * only after re-reading: `conflict` is the adapter's CAS classification
 * (operation context plus the substrate's code — never an error name), and
 * `refuse` mints the adapter's transport absence, cause preserved. `refuse` is a
 * thunk because minting is the seam where a cause the pinned client never raised
 * is rethrown as the defect it is; a read-back that already carries the
 * contribution must reach success without passing through that mint.
 */
export class CasWriteFailure {
  readonly _tag = "CasWriteFailure"
  constructor(
    readonly conflict: boolean,
    readonly refuse: () => Refusal,
  ) {}
}

/** Everything one carrier binds into the loop; nothing else reaches it. */
export interface CasJoinOptions<A> {
  /** The lawful join, and with it the empty state and carrier identity. */
  readonly join: CasJoin<A>
  /** The two steps a negative control may replace. */
  readonly discipline: MergeDiscipline<A>
  /** Flow control, no correctness stake; defaults to eight. */
  readonly attempts?: number | undefined
  /** The current state with its revision, or `null` where nothing is written. */
  readonly read: Effect.Effect<Revisioned<A> | null, Refusal>
  /** Writes a first state; fails `CasWriteFailure` when the key appeared meanwhile. */
  readonly create: (value: A) => Effect.Effect<number, CasWriteFailure | Refusal>
  /** Writes at an observed revision; fails `CasWriteFailure` when the revision moved. */
  readonly update: (
    value: A,
    expectedRevision: number,
  ) => Effect.Effect<number, CasWriteFailure | Refusal>
  /** The state this call is trying to land, canonical before it arrives. */
  readonly contribution: A
  /** The carrier's own absence for an exhausted bound; the loop never names a kind. */
  readonly contended: (attempts: number) => Refusal
}

/**
 * Joins a contribution into a CAS-guarded carrier and answers with the state
 * that carries it.
 *
 * The loop, in the order that matters: read; return immediately if the state
 * already carries the contribution; join; CAS at the observed revision; and on a
 * refused write read back FIRST — a read-back that carries the contribution is
 * success whether this write landed or a rival's join subsumed it — then, and
 * only then, consult the adapter's CAS classification to decide between another
 * attempt and a transport absence. On an exhausted bound the carrier's own
 * absence is refused; see this module's header for what that does and does not
 * claim.
 */
export const casJoinLoop = Effect.fn("Cas.casJoinLoop")(function*<A>(
  options: CasJoinOptions<A>,
): Effect.fn.Return<A, Refusal> {
  const { contribution, discipline, join, read } = options
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const stateOf = (observed: Revisioned<A> | null): A =>
    observed === null ? join.initialValue : observed.value
  for (let attempt = 0; attempt < attempts; attempt++) {
    const observed = yield* read
    const current = stateOf(observed)
    // The join is idempotent: a contribution already carried is not re-written,
    // so a settled key costs one read and no CAS traffic at all.
    if (yield* carries(join, current, contribution)) return current
    const merged = yield* discipline.next(current, contribution)
    const write = observed === null
      ? options.create(merged)
      : options.update(merged, observed.revision)
    const landed = yield* write.pipe(
      Effect.map(() => true),
      // Reconcile the ambiguous CAS outcome by read-back (seam rule 1), never
      // by expecting the substrate to acknowledge a duplicate.
      Effect.catch((failure) =>
        failure instanceof CasWriteFailure
          ? Effect.gen(function* () {
            const readBack = stateOf(yield* read)
            if (yield* discipline.reconciled(readBack, contribution, merged)) return true
            if (failure.conflict) return false
            return yield* failure.refuse()
          })
          : Effect.fail(failure)),
    )
    if (landed) return stateOf(yield* read)
  }
  return yield* options.contended(attempts)
})
