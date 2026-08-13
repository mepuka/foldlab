/**
 * Generated property suites: every right a fold claims arrives with the law
 * that licenses it.
 *
 * The suites are derived from what a fold declares about itself rather than
 * written beside it, so a fold cannot claim a right whose law nobody checks,
 * and the inputs cannot drift away from the values the algebra actually
 * accumulates.
 */

import * as FastCheck from "fast-check"
import { encodeFoldState, type DeclaredHom, type FoldState } from "./algebra.ts"
import { arbitraryForEvent, arbitraryForHistory, arbitraryForValue } from "./foldArbitrary.ts"
import type { Fold } from "./fold.ts"

/**
 * One law, ready to run: its name, the seed its cases are drawn from, and a
 * check that throws on the first counterexample it finds, shrunk.
 *
 * The seed is fixed and reported, so a failure is reproducible rather than a
 * story about one unlucky run, and two runs of a green suite exercise the same
 * cases.
 */
export interface FoldLawCase {
  readonly name: string
  readonly seed: number
  readonly check: () => void
}

/**
 * Either the laws to run, or a refusal to pretend. `LawInputsUnavailable` names
 * the missing half — a fold with no way to generate values or no way to
 * generate events would otherwise yield a suite that passes by checking
 * nothing, which is worse than no suite at all.
 */
export type FoldLawSuite =
  | { readonly ok: true; readonly laws: ReadonlyArray<FoldLawCase> }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "LawInputsUnavailable"
      readonly reason: string
    }
  }

/**
 * What a suite needs besides the fold. The fixtures are real events from the
 * caller's own history: they are folded into the generated pool so the laws are
 * checked against states the fold genuinely reaches, not only against states
 * random generation happens to produce.
 *
 * The optional declared map and partner fold add the laws that exist only when
 * there is something to map into or pair with. Seeds and run count have fixed
 * defaults, so a suite left unconfigured is still reproducible.
 */
export interface FoldLawOptions<
  E,
  A extends FoldState,
  B extends FoldState,
  C extends FoldState,
> {
  readonly fixtures: ReadonlyArray<E>
  readonly map?: DeclaredHom<A, B>
  readonly zip?: Fold<E, C>
  readonly seed?: number
  readonly splitSeeds?: ReadonlyArray<number>
  readonly numRuns?: number
}

// States are judged only by their canonical bytes, never by reference or by
// field-wise comparison. A state that cannot be encoded equals nothing at all,
// itself included, so an unencodable result fails a law rather than slipping
// through as a match.
const equal = (left: FoldState, right: FoldState): boolean => {
  const leftBytes = encodeFoldState(left)
  const rightBytes = encodeFoldState(right)
  return leftBytes.ok && rightBytes.ok && leftBytes.bytes === rightBytes.bytes
}

const assertProperty = (
  property: FastCheck.IProperty<unknown>,
  seed: number,
  numRuns: number,
): void => FastCheck.assert(property, { seed, numRuns, endOnFailure: false, verbose: 1 })

/**
 * Builds the property suite for one fold: the laws that license what that fold
 * claims to be allowed to do.
 *
 * Combining with the neutral value must change nothing and grouping must not
 * matter — together these are what license using the algebra as an accumulator
 * at all. Cutting a history at a random point, folding both halves, and
 * combining them must agree with folding it whole, which is what licenses
 * folding a history in pieces; the cut is retried under several seeds so the
 * law is not judged on one lucky split. Pairing two folds must agree with
 * running each alone over the same events — the law recorded here as
 * banana-split, meaning simply that one pass returning two answers gives what
 * two passes would have. Where a declared map is supplied, it must carry the
 * neutral value across and survive combining, and the mapped fold must agree
 * with mapping the source's answer; that pair is what licenses reading a mapped
 * result without folding again.
 *
 * Two further laws appear only where the algebra claims them. Commutativity
 * licenses folding a history whose order was never agreed, and idempotence
 * licenses re-delivery; together they are what a fold needs to merge without
 * coordination, and neither follows from the monoid laws. They are generated
 * from the claim rather than assumed, so an algebra that claims a right it does
 * not have fails here instead of failing in a federation — and one that claims
 * nothing gets no law and no right, which is why the suite's own list of law
 * names is a faithful statement of what was checked.
 *
 * Refuses with `LawInputsUnavailable` when the algebra declares no way to
 * generate values or the step declares no way to generate events, rather than
 * returning a suite that would pass vacuously.
 *
 * Generated inputs are mixed with the caller's fixtures and with states the
 * fold actually reaches over them, so the laws are exercised on real histories
 * as well as random ones. With no partner fold given, the pairing law pairs the
 * fold with itself, which is still a genuine check that pairing preserves each
 * answer.
 */
export const makeFoldLawSuite = <
  E,
  A extends FoldState,
  B extends FoldState = A,
  C extends FoldState = A,
>(
  fold: Fold<E, A>,
  options: FoldLawOptions<E, A, B, C>,
): FoldLawSuite => {
  if (fold.algebra.generator === undefined) {
    return {
      ok: false,
      refusal: { _tag: "LawInputsUnavailable", reason: "the algebra has no value generator" },
    }
  }
  if (fold.step.eventGenerator === undefined) {
    return {
      ok: false,
      refusal: { _tag: "LawInputsUnavailable", reason: "the step has no event generator" },
    }
  }

  const seed = options.seed ?? 0x14_06_01
  const splitSeeds = options.splitSeeds ?? [0x14_06_02, 0x14_06_03, 0x14_06_04]
  const numRuns = options.numRuns ?? 100
  const generatedState = arbitraryForValue(fold.algebra.generator)
  const fixtureStates = [
    fold.empty,
    ...options.fixtures.map((event) => fold.step.apply(event)),
    fold.fold(options.fixtures),
  ]
  const state = FastCheck.oneof(
    generatedState,
    FastCheck.constantFrom(...fixtureStates),
  )
  const generatedEvent = arbitraryForEvent<E>(fold.step.eventGenerator)
  const event = options.fixtures.length === 0
    ? generatedEvent
    : FastCheck.oneof(generatedEvent, FastCheck.constantFrom(...options.fixtures))
  const history = arbitraryForHistory(fold.step.eventGenerator, event, 24)
  const laws: Array<FoldLawCase> = [
    {
      name: "monoid identity",
      seed,
      check: () => assertProperty(
        FastCheck.property(state, (value) =>
          equal(fold.algebra.combine(fold.empty, value), value) &&
          equal(fold.algebra.combine(value, fold.empty), value)),
        seed,
        numRuns,
      ),
    },
    {
      name: "monoid associativity",
      seed: seed + 1,
      check: () => assertProperty(
        FastCheck.property(state, state, state, (left, middle, right) =>
          equal(
            fold.algebra.combine(fold.algebra.combine(left, middle), right),
            fold.algebra.combine(left, fold.algebra.combine(middle, right)),
          )),
        seed + 1,
        numRuns,
      ),
    },
    {
      name: "zip consistency (banana-split)",
      seed: seed + 2,
      check: () => {
        const checkZip = <Other extends FoldState>(other: Fold<E, Other>): void => {
          const zipped = fold.zip(other)
          assertProperty(
            FastCheck.property(history, (events) =>
              equal(zipped.fold(events), [fold.fold(events), other.fold(events)])),
            seed + 2,
            numRuns,
          )
        }
        options.zip === undefined ? checkZip(fold) : checkZip(options.zip)
      },
    },
  ]

  // The claimed laws are ADDED, never stubbed. A law case that returned early
  // for an algebra making no claim would put a green, empty test under a name
  // that reads like a proof; a suite that lists only what it checked cannot lie
  // by omission, and the absence of the name is the report.
  if (fold.algebra.laws?.commutative === true) {
    laws.push({
      name: "combine commutativity",
      seed: seed + 5,
      check: () => assertProperty(
        FastCheck.property(state, state, (left, right) =>
          equal(
            fold.algebra.combine(left, right),
            fold.algebra.combine(right, left),
          )),
        seed + 5,
        numRuns,
      ),
    })
  }

  if (fold.algebra.laws?.idempotent === true) {
    laws.push({
      name: "combine idempotence",
      seed: seed + 6,
      check: () => assertProperty(
        FastCheck.property(state, (value) => equal(fold.algebra.combine(value, value), value)),
        seed + 6,
        numRuns,
      ),
    })
  }

  for (const splitSeed of splitSeeds) {
    laws.push({
      name: `third-homomorphism split (${splitSeed})`,
      seed: splitSeed,
      check: () => assertProperty(
        FastCheck.property(history, FastCheck.nat(), (events, rawSplit) => {
          const split = rawSplit % (events.length + 1)
          const combined = fold.algebra.combine(
            fold.fold(events.slice(0, split)),
            fold.fold(events.slice(split)),
          )
          return equal(combined, fold.fold(events))
        }),
        splitSeed,
        numRuns,
      ),
    })
  }

  if (options.map !== undefined) {
    const hom = options.map
    laws.push({
      name: "homomorphism preservation",
      seed: seed + 3,
      check: () => assertProperty(
        FastCheck.property(state, state, (left, right) =>
          equal(hom.map(fold.empty), hom.target.empty) &&
          equal(
            hom.map(fold.algebra.combine(left, right)),
            hom.target.combine(hom.map(left), hom.map(right)),
          )),
        seed + 3,
        numRuns,
      ),
    })
    laws.push({
      name: "map commutation",
      seed: seed + 4,
      check: () => {
        const mapped = fold.map(hom)
        assertProperty(
          FastCheck.property(history, (events) =>
            equal(mapped.fold(events), hom.map(fold.fold(events)))),
          seed + 4,
          numRuns,
        )
      },
    })
  }

  return { ok: true, laws }
}
