/**
 * Plane: truth — the vocabulary every sentence speaks.
 *
 * The rung ladder lives here because a law is vocabulary, not a carrier. An
 * algebra earns law atoms from a suite; a rung is a named bundle of atoms; and
 * the rights a rung licenses follow from the bundle mechanically — a fold may
 * read from the deepest quotient its algebra respects, and nothing weaker.
 *
 * Two fences ride every declaration below. A brand claims that a declared
 * reducer's equations held over the cases a suite drew; it claims nothing about
 * liveness, throughput, or a running deployment. And a brand is phantom in the
 * type and non-enumerable at runtime, so no algebra's digest moves because of
 * anything on this ladder.
 *
 * @module
 */
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

declare const TotalTypeId: unique symbol
declare const AssociativeTypeId: unique symbol
declare const IdentityTypeId: unique symbol
declare const CommutativeTypeId: unique symbol
declare const IdempotentTypeId: unique symbol
declare const BoundedTypeId: unique symbol
declare const InverseTypeId: unique symbol

/** `combine` returns a wire value of the carrier for every pair and never throws. */
export interface Total {
  readonly [TotalTypeId]: true
}

/** `(a ∘ b) ∘ c = a ∘ (b ∘ c)` — grouping does not matter. */
export interface Associative {
  readonly [AssociativeTypeId]: true
}

/** `e ∘ a = a = a ∘ e` — the initial state adds nothing. */
export interface Identity {
  readonly [IdentityTypeId]: true
}

/** `a ∘ b = b ∘ a` — order of arrival does not matter. */
export interface Commutative {
  readonly [CommutativeTypeId]: true
}

/** `a ∘ a = a` — hearing the same thing twice means what hearing it once means. */
export interface Idempotent {
  readonly [IdempotentTypeId]: true
}

/** `e ≤ a` under `a ≤ b ⟺ a ∘ b = b` — the initial state is the bottom. */
export interface Bounded {
  readonly [BoundedTypeId]: true
}

/** every `a` has an `a⁻¹` with `a ∘ a⁻¹ = e` — a folded state can be subtracted. */
export interface Inverse {
  readonly [InverseTypeId]: true
}

/**
 * Any set of earned laws. A brand carries laws rather than a rung name because
 * the ladder is a poset, not a chain: "at least this rung" is set inclusion,
 * which intersection assignability already decides without a lookup table.
 */
export type LawSet = Partial<
  Total & Associative & Identity & Commutative & Idempotent & Bounded & Inverse
>

/** Closure alone: `combine` lands in the carrier and nothing else is claimed. */
export type Magma = Total

/** Closure, grouping, and a unit — the rung a sequential fold needs. */
export type Monoid = Total & Associative & Identity

/** A monoid whose order of arrival does not matter — the rung partition merge needs. */
export type CommutativeMonoid = Monoid & Commutative

/** A commutative monoid where duplicates are free — the rung a set-plane read needs. */
export type BoundedSemilattice = CommutativeMonoid & Idempotent & Bounded

/** A monoid where every folded state can be subtracted; beside the chain, never above it. */
export type Group = Monoid & Inverse

/** A commutative monoid where every folded state can be subtracted. */
export type AbelianGroup = CommutativeMonoid & Inverse

/**
 * A declared algebra carrying exactly the laws its suite earned.
 *
 * Climbing the ladder adds laws, so an algebra branded at a higher rung is
 * assignable wherever a lower one is required and never the other way. The
 * brand is phantom: it rides the type and erases at encoding, so an algebra's
 * digest is unchanged by anything on this ladder.
 */
export type Algebra<State, Laws extends LawSet> = DeclaredAlgebra<State> & Laws

/** A declared algebra carrying the runtime witness that its CI law suite earned. */
export type CommutativeAlgebra<State> = Algebra<State, CommutativeMonoid>

/** One law atom, named as the runtime witness and the refusal both carry it. */
export type LawName =
  | "total"
  | "associative"
  | "identity"
  | "commutative"
  | "idempotent"
  | "bounded"
  | "inverse"

/** One rung of the ladder, looked up by name; a rung is never inside an encoding. */
export type RungName =
  | "magma"
  | "monoid"
  | "commutative-monoid"
  | "bounded-semilattice"
  | "group"
  | "abelian-group"

/** The law set one rung obligates, as data beside the type-level bundle above. */
export const rungLaws: {
  readonly [Rung in RungName]: ReadonlyArray<LawName>
} = {
  "magma": ["total"],
  "monoid": ["total", "associative", "identity"],
  "commutative-monoid": ["total", "associative", "identity", "commutative"],
  "bounded-semilattice": [
    "total",
    "associative",
    "identity",
    "commutative",
    "idempotent",
    "bounded",
  ],
  "group": ["total", "associative", "identity", "inverse"],
  "abelian-group": ["total", "associative", "identity", "commutative", "inverse"],
}

/** The type-level bundle a rung name denotes. */
export type RungLaws<Rung extends RungName> = Rung extends "abelian-group" ? AbelianGroup
  : Rung extends "group" ? Group
  : Rung extends "bounded-semilattice" ? BoundedSemilattice
  : Rung extends "commutative-monoid" ? CommutativeMonoid
  : Rung extends "monoid" ? Monoid
  : Magma

/**
 * One stage of the free-object chain, deepest last: sequences forget nothing,
 * multisets forget order, finite sets forget multiplicity too.
 */
export type Quotient = "positioned" | "multiset" | "set"

/**
 * The deepest quotient an algebra's earned laws respect.
 *
 * Idempotent and commutative reaches the set plane, because redelivery and
 * reordering are then both free. Commutative alone reaches the multiset
 * presentation. Anything weaker stays positional.
 */
export type DeepestQuotient<Laws extends LawSet> = Laws extends BoundedSemilattice ? "set"
  : Laws extends CommutativeMonoid ? "multiset"
  : "positioned"

/** Every quotient a fold at these laws may read — its deepest, and every shallower one. */
export type Reads<Laws extends LawSet> = DeepestQuotient<Laws> extends "set" ? Quotient
  : DeepestQuotient<Laws> extends "multiset" ? "positioned" | "multiset"
  : "positioned"

/** The laws a read at one quotient demands — the rung⇒carrier rule, as a type. */
export type LawsFor<Q extends Quotient> = Q extends "set" ? BoundedSemilattice
  : Q extends "multiset" ? CommutativeMonoid
  : LawSet

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

/**
 * One predicate per law atom a declared reducer can be checked against.
 *
 * `bounded` and the left half of `identity` are the same equation read two
 * ways: `e ∘ a = a` is exactly `e ≤ a` under the derived order. It is a row of
 * its own because the derived order is what a set-plane read reasons with, and
 * a brand that licenses that read must name the law it rests on.
 */
export interface LawPredicates<State> {
  readonly total: (left: State, right: State) => boolean
  readonly associative: (left: State, middle: State, right: State) => boolean
  readonly identity: (state: State) => boolean
  readonly commutative: (left: State, right: State) => boolean
  readonly idempotent: (state: State) => boolean
  readonly bounded: (state: State) => boolean
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

const earnedWitness = Symbol("@foldlab/plait/Algebra/earnedLaws")

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

/**
 * Returns one predicate per law atom, so a rung's suite is the union of its
 * atoms' predicates rather than a hand-listed bundle per rung.
 *
 * Six atoms and not seven: `inverse` needs a declared inversion, and a declared
 * algebra carries a reducer and nothing else. The group rungs are therefore
 * type-level only until an inversion is part of a declaration, and this suite
 * says so by having no row for them.
 *
 * Totality is the one obligation nothing else can carry. A Lean function into
 * the carrier is total by construction; a TypeScript reducer can throw, return
 * `undefined`, or leave the wire grammar, so the atom is checked here.
 */
export const lawSuite = <State>(
  algebra: DeclaredAlgebra<State>,
  equals: (left: State, right: State) => boolean,
): LawPredicates<State> => {
  const { combine, initialValue } = algebra.reducer
  return {
    total: (left, right) => {
      try {
        return Schema.is(Schema.Json)(combine(left, right))
      } catch {
        return false
      }
    },
    associative: (left, middle, right) =>
      equals(combine(combine(left, middle), right), combine(left, combine(middle, right))),
    identity: (state) =>
      equals(combine(initialValue, state), state) &&
      equals(combine(state, initialValue), state),
    commutative: (left, right) => equals(combine(left, right), combine(right, left)),
    idempotent: (state) => equals(combine(state, state), state),
    bounded: (state) => equals(combine(initialValue, state), state),
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
  return brand(algebra, rungLaws["commutative-monoid"])
})

/**
 * Attaches an earned law set non-enumerably, so the brand survives a structural
 * copy of the algebra and never reaches the wire.
 */
const brand = <State, Laws extends LawSet>(
  algebra: DeclaredAlgebra<State>,
  laws: ReadonlyArray<LawName>,
): Algebra<State, Laws> => {
  const branded = { ...algebra }
  Object.defineProperty(branded, earnedWitness, {
    configurable: false,
    enumerable: false,
    value: Object.freeze([...laws]),
    writable: false,
  })
  return Object.freeze(branded) as Algebra<State, Laws>
}

/** The law atoms this algebra's suites earned; empty for an unbranded declaration. */
export const earnedLawsOf = <State>(
  algebra: DeclaredAlgebra<State>,
): ReadonlyArray<LawName> => {
  const carried: unknown = Reflect.get(algebra, earnedWitness)
  return Array.isArray(carried) ? carried as ReadonlyArray<LawName> : []
}

/**
 * Runtime half of the earned-brand check: whether every law the rung obligates
 * was earned. Type-level routing is developer experience and a cast erases it;
 * this check is what a door consults regardless of what the type said.
 */
export const hasRung = <State, const Rung extends RungName>(
  algebra: DeclaredAlgebra<State>,
  rung: Rung,
): algebra is Algebra<State, RungLaws<Rung>> => {
  const earned = earnedLawsOf(algebra)
  return rungLaws[rung].every((law) => earned.includes(law))
}

/** Runtime half of the earned-brand check used by partitioned fold admission. */
export const hasCommutativeWitness = <State>(
  algebra: DeclaredAlgebra<State>,
): algebra is CommutativeAlgebra<State> => hasRung(algebra, "commutative-monoid")
