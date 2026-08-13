/** The free-monoid lift: declarations name identity; functions carry behavior. */

import { createHash } from "node:crypto"
import {
  encodeFoldState,
  mapped,
  mappedStep,
  product,
  productStep,
  type Algebra,
  type DeclaredHom,
  type FoldState,
  type Step,
} from "./algebra.ts"

export interface FoldIdentity {
  readonly encoding: string
  readonly digest: string
}

export type StepInput<E, A extends FoldState> = Step<E, A> | ((event: E) => A)

/**
 * FreeMonoid.lift licenses `fold`; the monoid action licenses O(1) `extend`;
 * banana-split and homomorphism commutation license `zip` and `map`.
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
  if (algebra.declaration === undefined || step.declaration === undefined) return undefined
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

/** The free-monoid uniqueness clause licenses the one fold induced by `algebra` and `step`. */
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
  return self
}
