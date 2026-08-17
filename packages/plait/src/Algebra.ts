import { Effect, Schema, type Reducer } from "effect"

import type { WireValue } from "./Canonical.js"
import { digestOf, type Digest } from "./Digest.js"
import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

/** Canonical data and executable behavior for one declared monoid. */
export interface DeclaredAlgebra<State> {
  readonly declaration: {
    readonly v: 0
    readonly kind: "algebra"
    readonly definition: WireValue
    readonly initial: WireValue
  }
  readonly digest: Digest
  readonly reducer: Reducer.Reducer<State>
}

declare const CommutativeTypeId: unique symbol

/** A declared algebra carrying the runtime witness that its CI law suite earned. */
export interface CommutativeAlgebra<State> extends DeclaredAlgebra<State> {
  readonly [CommutativeTypeId]: true
}

/** Inputs for declaring a content-addressed algebra. */
export interface DeclareOptions<State> {
  readonly declaration: WireValue
  readonly reducer: Reducer.Reducer<State>
}

/** Predicates consumed by generated property suites before branding an algebra. */
export interface CommutativeLaws<State> {
  readonly leftIdentity: (state: State) => boolean
  readonly rightIdentity: (state: State) => boolean
  readonly associative: (left: State, middle: State, right: State) => boolean
  readonly commutative: (left: State, right: State) => boolean
}

/** Generated property cases supplied by the CI law suite that earns F4. */
export interface CommutativeSuite<State> {
  readonly cases: ReadonlyArray<{
    readonly left: State
    readonly middle: State
    readonly right: State
  }>
  readonly equals: (left: State, right: State) => boolean
}

const commutativeWitness = Symbol("@foldlab/plait/Algebra/commutative")

const invalidAlgebra = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "invalid-algebra-declaration",
  law: "A declared algebra's definition and initial state are canonical wire-grammar values.",
  path,
  got,
  expected,
  next: [{
    subject: "Algebra.declare",
    note: "Declare the reducer with canonical data and a canonical initial state.",
  }],
})

const unearnedCommutativity = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "unearned-commutative-algebra",
  law: "F4's commutative brand is earned only when the generated identity, associativity, and commutativity cases pass.",
  path,
  got,
  expected,
  next: [{
    subject: "Algebra.commutative",
    note: "Generate at least 32 property cases with fast-check and run the suite before partitioned deployment.",
  }],
})

/** Declares a reducer whose identity commits its definition and initial state. */
export const declare = Effect.fn("Algebra.declare")(function*<State>(
  options: DeclareOptions<State>,
): Effect.fn.Return<DeclaredAlgebra<State>, StructuralRefusal> {
  if (!Schema.is(Schema.Json)(options.reducer.initialValue)) {
    return yield* invalidAlgebra(
      ["initial"],
      String(options.reducer.initialValue),
      "one RFC 8785 wire value",
    )
  }
  const declaration = {
    v: 0 as const,
    kind: "algebra" as const,
    definition: options.declaration,
    initial: options.reducer.initialValue,
  }
  const digest = yield* digestOf(declaration)
  return { declaration, digest, reducer: options.reducer }
})

/**
 * Returns the ACI predicates a generated fast-check suite must run in CI.
 *
 * Fold steps are derived from per-event contributions in `Fold.declare`, so
 * the step-to-algebra bridge holds by construction rather than as a fifth
 * independently asserted property.
 */
export const commutativeLaws = <State>(
  algebra: DeclaredAlgebra<State>,
  equals: (left: State, right: State) => boolean,
): CommutativeLaws<State> => {
  const { combine, initialValue } = algebra.reducer
  return {
    leftIdentity: (state) => equals(combine(initialValue, state), state),
    rightIdentity: (state) => equals(combine(state, initialValue), state),
    associative: (left, middle, right) =>
      equals(combine(combine(left, middle), right), combine(left, combine(middle, right))),
    commutative: (left, right) => equals(combine(left, right), combine(right, left)),
  }
}

/** Runs the generated law cases and attaches the witness only when they pass. */
export const commutative = Effect.fn("Algebra.commutative")(function*<State>(
  algebra: DeclaredAlgebra<State>,
  suite: CommutativeSuite<State>,
): Effect.fn.Return<CommutativeAlgebra<State>, StructuralRefusal> {
  if (suite.cases.length < 32) {
    return yield* unearnedCommutativity(
      ["suite", "cases"],
      suite.cases.length,
      "at least 32 generated property cases",
    )
  }
  const laws = commutativeLaws(algebra, suite.equals)
  const failed = yield* Effect.try({
    try: () => suite.cases.findIndex(({ left, middle, right }) =>
      !laws.leftIdentity(left) ||
      !laws.rightIdentity(left) ||
      !laws.associative(left, middle, right) ||
      !laws.commutative(left, middle)),
    catch: (cause) => unearnedCommutativity(
      ["suite", "evaluation"],
      String(cause),
      "total law predicates over every generated case",
    ),
  })
  if (failed !== -1) {
    return yield* unearnedCommutativity(
      ["suite", "cases", String(failed)],
      "law returned false",
      "left identity, right identity, associativity, and commutativity",
    )
  }
  const branded = { ...algebra }
  Object.defineProperty(branded, commutativeWitness, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  })
  return Object.freeze(branded) as CommutativeAlgebra<State>
})

/** Runtime half of the earned-brand check used by partitioned fold admission. */
export const hasCommutativeWitness = <State>(
  algebra: DeclaredAlgebra<State>,
): algebra is CommutativeAlgebra<State> =>
  Reflect.get(algebra, commutativeWitness) === true
