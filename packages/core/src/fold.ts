/**
 * The fold: an algebra and a step lifted to run over a whole history.
 *
 * Nothing else goes into one. The step — the `f` in `foldMap` — decides what
 * each event contributes and the algebra decides how contributions combine,
 * so two folds built from the same declared pair compute the same answers and
 * answer to the same name. As
 * everywhere in this package, the declarations carry the name and the plain
 * functions carry the behavior — a fold missing a name still folds.
 */

import { createHash } from "node:crypto"
import {
  encodeFoldState,
  hasAdmittedDeclaration,
  mapped,
  mappedStep,
  product,
  productStep,
  type Algebra,
  type DeclaredHom,
  type FoldState,
  type Step,
} from "./algebra.ts"

/**
 * A fold's name: the canonical bytes describing it, and their digest.
 *
 * The bytes hold the algebra's full description together with the step's
 * digest, so folds differing in either half get different names and folds
 * agreeing in both get the same one. That is what makes the digest usable as a
 * key for a result: it identifies the computation, not the run.
 */
export interface FoldIdentity {
  readonly encoding: string
  readonly digest: string
}

/**
 * What a fold accepts as its per-event half: a declared step, or a bare
 * function. A bare function is behavior without a name — it folds identically
 * and the resulting fold has no identity, because nothing about a function can
 * be encoded, hashed, or compared with another module's claim.
 */
export type StepInput<E, A extends FoldState> = Step<E, A> | ((event: E) => A)
const foldsRegistry = new WeakSet<object>()

/**
 * Reports whether a fold was built by `defineFold` here.
 *
 * Membership is held outside the value, so an object that copies a real fold's
 * fields — digest included — is not a member and cannot become one. Callers
 * that turn a digest into a stored key check this first: a digest is only a
 * trustworthy name when the thing carrying it was assembled under the rules
 * that gave it that name.
 */
export const isAdmittedFold = <E, A extends FoldState>(fold: Fold<E, A>): boolean =>
  foldsRegistry.has(fold)

/**
 * A fold over a history, with four rights and the laws behind each.
 *
 * `extend` adds one event to an accumulated state in constant time and never
 * looks at earlier events again, which is the whole reason a long history costs
 * no more per event than a short one. `fold` is that same step applied left to
 * right from the neutral value, so folding a history and extending through it
 * one event at a time cannot disagree.
 *
 * Because combining is associative around a neutral value, a history may be cut
 * anywhere, the pieces folded independently, and their results combined: the
 * answer does not depend on where it was cut. That is what licenses folding a
 * history in parts, in any order of assembly.
 *
 * `zip` runs this fold beside another in a single pass and returns both
 * answers, which agrees with running each alone over the same history. `map`
 * sends the result through a declared map without folding again. Both are
 * available whether or not the inputs carry names; the derived fold has a
 * digest only when everything it was derived from did.
 */
export interface Fold<E, A extends FoldState> {
  readonly algebra: Algebra<A>
  readonly step: Step<E, A>
  readonly digest?: string
  readonly identity?: FoldIdentity
  readonly empty: A
  readonly extend: (state: A, event: E) => A
  readonly fold: (events: Iterable<E>) => A
  readonly zip: <B extends FoldState>(other: Fold<E, B>) => Fold<E, readonly [A, B]>
  readonly map: <B extends FoldState>(hom: DeclaredHom<A, B>) => Fold<E, B>
}

const normalizeStep = <E, A extends FoldState>(input: StepInput<E, A>): Step<E, A> =>
  typeof input === "function" ? { apply: input, identityIssue: "the step is anonymous" } : input

const foldIdentity = <E, A extends FoldState>(
  algebra: Algebra<A>,
  step: Step<E, A>,
): FoldIdentity | undefined => {
  if (!hasAdmittedDeclaration(algebra) || !hasAdmittedDeclaration(step)) return undefined
  const preimage = encodeFoldState({
    v: "foldlab.fold.v1",
    algebra: algebra.declaration.spec,
    stepDigest: step.declaration.digest,
  })
  if (!preimage.ok) return undefined
  return {
    encoding: preimage.bytes,
    digest: createHash("sha256").update(preimage.bytes, "utf8").digest("hex"),
  }
}

/**
 * Builds the one fold that an algebra and a step determine between them.
 *
 * There is exactly one: the pair fixes every answer the fold can give, so the
 * same declared algebra with the same declared step always yields the same
 * digest and the same results, and a digest is therefore safe to use elsewhere
 * as the name of a computation.
 *
 * A name appears only when both halves carry a declaration minted by this
 * package and the fold's own description encodes canonically. Without one the
 * fold computes exactly the same values with `digest` and `identity` absent —
 * losing a name never changes an answer. The returned fold is frozen and
 * recorded as issued here, so what it says about itself cannot later be edited
 * by a holder.
 */
export const defineFold = <E, A extends FoldState>(
  algebra: Algebra<A>,
  stepInput: StepInput<E, A>,
): Fold<E, A> => {
  const step = normalizeStep(stepInput)
  const identity = foldIdentity(algebra, step)
  const extend = (state: A, event: E): A => algebra.combine(state, step.apply(event))
  const fold = (events: Iterable<E>): A => {
    let state = algebra.empty
    for (const event of events) state = extend(state, event)
    return state
  }
  const self: Fold<E, A> = {
    algebra,
    step,
    ...(identity === undefined ? {} : { digest: identity.digest, identity }),
    empty: algebra.empty,
    extend,
    fold,
    zip: <B extends FoldState>(other: Fold<E, B>): Fold<E, readonly [A, B]> =>
      defineFold(
        product(algebra, other.algebra),
        productStep<E, readonly [A, B]>(step, other.step),
      ) as unknown as Fold<E, readonly [A, B]>,
    map: <B extends FoldState>(hom: DeclaredHom<A, B>): Fold<E, B> =>
      defineFold(mapped(hom, algebra), mappedStep(hom, step)),
  }
  foldsRegistry.add(self)
  return Object.freeze(self)
}
