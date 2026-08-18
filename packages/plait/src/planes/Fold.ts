/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Context, Effect, Layer, Scope } from "effect"

import type {
  Algebra,
  DeclaredAlgebra,
  LawsFor,
  LawSet,
} from "../truth/Algebra.js"
import { hasRung } from "../truth/Algebra.js"
import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import type { ConnectionBootstrap } from "../internal/transport.js"
import type { DeclaredLane } from "./Lane.js"
import { structuralRefusal, type StructuralRefusal } from "../truth/Refusal.js"
import type { Refusal } from "../truth/Refusal.js"
import type { Anchor } from "./Anchor.js"
import { makeFoldService } from "../internal/folds.js"

/** A per-event contribution whose declaration names its executable behavior. */
export interface Contribution<Event, State> {
  readonly declaration: WireValue
  readonly apply: (event: Event) => State
}

/** Canonical data that names one fold declaration. */
export interface FoldDeclaration {
  readonly v: 0
  readonly kind: "fold"
  readonly lane: Digest
  readonly algebra: Digest
  readonly step: Digest
}

/**
 * The quotient a lane's partitioning makes its fold read.
 *
 * One partition keeps arrival order, so the fold reads the positioned plane.
 * More than one erases the order across partitions, so the fold reads the
 * multiset presentation and its algebra must respect that erasure.
 *
 * The check sits in a tuple so the conditional does not distribute. A lane
 * whose partition count is only known as a union — `1 | 4` — would otherwise
 * yield a union of quotients, and a union of bounds is satisfied by its
 * weakest arm: an algebra that earned nothing would serve a lane that might
 * have four partitions. Undistributed, such a lane reads the multiset
 * presentation, which is the only answer that is true for every member.
 */
export type LaneQuotient<Partitions extends number> = [Partitions] extends [1] ? "positioned"
  : "multiset"

/**
 * A declared fold whose step factors through its algebra by construction.
 *
 * The handle carries the algebra's earned laws, so a right that demands a rung
 * reads it off the fold rather than re-deriving it. The brand is phantom and
 * the declaration bytes below it are unchanged, so a fold's digest is the same
 * value it was before any rung existed.
 */
export interface DeclaredFold<
  Event,
  State,
  Partitions extends number = number,
  Laws extends LawSet = LawSet,
> {
  readonly declaration: FoldDeclaration
  readonly digest: Digest
  readonly lane: DeclaredLane<Event, Partitions>
  readonly algebra: Algebra<State, Laws>
  readonly contribution: Contribution<Event, State>
  readonly step: (state: State, event: Event) => State
}

/**
 * Inputs accepted by the only fold-declaration door.
 *
 * The algebra's rung is bounded below by the quotient the lane makes the fold
 * read: this is the rung⇒carrier rule, and an algebra that has not earned the
 * laws its carrier erases does not type-check here.
 */
export interface DeclareOptions<
  Event,
  State,
  Partitions extends number,
  Laws extends LawsFor<LaneQuotient<Partitions>> = LawsFor<LaneQuotient<Partitions>>,
> {
  readonly lane: DeclaredLane<Event, Partitions>
  readonly algebra: DeclaredAlgebra<State> & Laws
  readonly contribution: Contribution<Event, State>
}

/** Connection bootstrap for deployed fold pumps. */
export interface FoldsOptions extends ConnectionBootstrap {}

/** Flow-control policy for one deployment; correctness does not depend on it. */
export interface DeployOptions {
  readonly checkpointEvery: number
}

/** Measured runtime counters for one deployment handle. */
export interface FoldScoreboard {
  readonly messages: number
  readonly redeliveriesAbsorbed: number
  readonly bufferedOutOfOrderArrivals: number
  readonly bufferedOutOfOrderDrained: number
  readonly anchorWrites: number
  readonly refusals: Readonly<Record<string, number>>
}

/** A scope-bound attachment to all partitions of one declared fold. */
export interface FoldHandle {
  readonly await: Effect.Effect<void, Refusal>
  readonly anchor: (partition: number) => Effect.Effect<Anchor, Refusal>
  readonly scoreboard: Effect.Effect<FoldScoreboard>
}

/** Transport-free deployed-fold operations. */
export interface FoldService {
  readonly deploy: <Event, State, const Partitions extends number>(
    fold: DeclaredFold<Event, State, Partitions>,
    options: DeployOptions,
  ) => Effect.Effect<FoldHandle, Refusal, Scope.Scope>
}

/** Scope-owned durable fold runtime; all NATS types remain internal. */
export class Folds extends Context.Service<Folds, FoldService>()(
  "@foldlab/plait/Folds",
) {
  /** Builds the live NATS/KV fold implementation. */
  static readonly layer = (options: FoldsOptions): Layer.Layer<Folds, Refusal> =>
    Layer.effect(Folds, makeFoldService(options))

  /** Supplies a fixture implementation through the production service tag. */
  static readonly testLayer = (service: FoldService): Layer.Layer<Folds> =>
    Layer.succeed(Folds, Folds.of(service))
}

const unearnedCommutativity = <Event, State> (
  lane: DeclaredLane<Event>,
  algebra: DeclaredAlgebra<State>,
): StructuralRefusal => structuralRefusal({
  kind: "unearned-commutative-algebra",
  law: "F4 licenses partitions > 1 only for an algebra whose digest-seeded ACI law suite earned the commutative brand.",
  path: ["algebra", "commutative"],
  got: {
    partitions: lane.partitions,
    algebra: algebra.digest,
    witness: "absent",
  },
  expected: "the runtime witness produced by Algebra.commutative after its derived law suite passes",
  next: [{
    subject: "Algebra.commutative",
    note: "Provide a seeded arbitrary for the derived associativity, commutativity, and identity properties, or declare one partition.",
  }],
})

/**
 * Declares a fold and derives its step from one per-event contribution.
 *
 * This construction is the F4 bridge: `step(state, event)` is always
 * `algebra.combine(state, contribution(event))`, so no incompatible step can
 * be smuggled beside an otherwise lawful algebra.
 */
export const declare = Effect.fn("Fold.declare")(function*<
  Event,
  State,
  const Partitions extends number,
  Laws extends LawsFor<LaneQuotient<Partitions>>,
>(
  options: DeclareOptions<Event, State, Partitions, Laws>,
): Effect.fn.Return<DeclaredFold<Event, State, Partitions, Laws>, StructuralRefusal> {
  if (options.lane.partitions > 1 && !hasRung(options.algebra, "commutative-monoid")) {
    return yield* unearnedCommutativity(options.lane, options.algebra)
  }
  const stepDigest = yield* digestOf({
    v: 0,
    kind: "contribution",
    definition: options.contribution.declaration,
  })
  const declaration: FoldDeclaration = {
    v: 0,
    kind: "fold",
    lane: options.lane.digest,
    algebra: options.algebra.digest,
    step: stepDigest,
  }
  const digest = yield* digestOf(declaration as unknown as WireValue)
  return {
    declaration,
    digest,
    lane: options.lane,
    algebra: options.algebra,
    contribution: options.contribution,
    step: (state, event) => options.algebra.reducer.combine(
      state,
      options.contribution.apply(event),
    ),
  }
})

/** Creates or resumes all partition pumps for one declared fold. */
export const deploy = Effect.fn("Folds.deploy")(function*<
  Event,
  State,
  const Partitions extends number,
>(
  fold: DeclaredFold<Event, State, Partitions>,
  options: DeployOptions,
): Effect.fn.Return<FoldHandle, Refusal, Folds | Scope.Scope> {
  const folds = yield* Folds
  return yield* folds.deploy(fold, options)
})
