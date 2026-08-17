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

/** A seeded state generator and equality used to earn F4 at the declaration door. */
export interface CommutativeSuite<State> {
  readonly arbitrary: (seed: number) => State
  readonly equals: (left: State, right: State) => boolean
}

interface CommutativeCase<State> {
  readonly left: State
  readonly middle: State
  readonly right: State
}

const MINIMUM_COMMUTATIVE_CASES = 32
const MAXIMUM_CASE_ATTEMPTS = MINIMUM_COMMUTATIVE_CASES * 32

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
  law: "F4's commutative brand is earned only when digest-seeded, distinct identity, associativity, and commutativity cases pass.",
  path,
  got,
  expected,
  next: [{
    subject: "Algebra.commutative",
    note: "Provide a seeded arbitrary that can derive at least 32 distinct triples before partitioned deployment.",
  }],
})

const seedFromDigest = (digest: Digest): number => {
  let seed = 0x811c9dc5
  for (let index = 0; index < digest.length; index++) {
    seed = Math.imul(seed ^ digest.charCodeAt(index), 0x01000193) >>> 0
  }
  return seed
}

const seededSequence = (digest: Digest): (() => number) => {
  let state = seedFromDigest(digest)
  return () => {
    state = (state + 0x9e3779b9) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad)
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97)
    return (mixed ^ (mixed >>> 15)) | 0
  }
}

const sameCase = <State>(
  equals: (left: State, right: State) => boolean,
  left: CommutativeCase<State>,
  right: CommutativeCase<State>,
): boolean =>
  equals(left.left, right.left) &&
  equals(left.middle, right.middle) &&
  equals(left.right, right.right)

const deriveCases = <State>(
  algebra: DeclaredAlgebra<State>,
  suite: CommutativeSuite<State>,
): ReadonlyArray<CommutativeCase<State>> => {
  const nextSeed = seededSequence(algebra.digest)
  const cases: Array<CommutativeCase<State>> = []
  for (
    let attempt = 0;
    attempt < MAXIMUM_CASE_ATTEMPTS && cases.length < MINIMUM_COMMUTATIVE_CASES;
    attempt++
  ) {
    const candidate = {
      left: suite.arbitrary(nextSeed()),
      middle: suite.arbitrary(nextSeed()),
      right: suite.arbitrary(nextSeed()),
    }
    if (!cases.some((existing) => sameCase(suite.equals, existing, candidate))) {
      cases.push(candidate)
    }
  }
  return cases
}

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

/** Derives distinct law cases from the algebra digest and witnesses only a passing algebra. */
export const commutative = Effect.fn("Algebra.commutative")(function*<State>(
  algebra: DeclaredAlgebra<State>,
  suite: CommutativeSuite<State>,
): Effect.fn.Return<CommutativeAlgebra<State>, StructuralRefusal> {
  const cases = yield* Effect.try({
    try: () => deriveCases(algebra, suite),
    catch: (cause) => unearnedCommutativity(
      ["suite", "arbitrary"],
      String(cause),
      "a total seeded arbitrary and equality over generated states",
    ),
  })
  if (cases.length < MINIMUM_COMMUTATIVE_CASES) {
    return yield* unearnedCommutativity(
      ["suite", "arbitrary"],
      cases.length,
      `at least ${MINIMUM_COMMUTATIVE_CASES} distinct generated triples`,
    )
  }
  const laws = commutativeLaws(algebra, suite.equals)
  const failed = yield* Effect.try({
    try: () => cases.findIndex(({ left, middle, right }) =>
      !laws.leftIdentity(left) ||
      !laws.rightIdentity(left) ||
      !laws.leftIdentity(middle) ||
      !laws.rightIdentity(middle) ||
      !laws.leftIdentity(right) ||
      !laws.rightIdentity(right) ||
      !laws.associative(left, middle, right) ||
      !laws.commutative(left, middle) ||
      !laws.commutative(middle, right) ||
      !laws.commutative(left, right)),
    catch: (cause) => unearnedCommutativity(
      ["suite", "evaluation"],
      String(cause),
      "total law predicates over every generated case",
    ),
  })
  if (failed !== -1) {
    return yield* unearnedCommutativity(
      ["suite", "generated", String(failed)],
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
