/** Generated property suites: every right claimed by Fold has its licensing law. */

import * as FastCheck from "fast-check"
import { encodeFoldState, type DeclaredHom, type FoldState } from "./algebra.ts"
import { arbitraryForEvent, arbitraryForValue } from "./foldArbitrary.ts"
import type { Fold } from "./fold.ts"

export interface FoldLawCase {
  readonly name: string
  readonly seed: number
  readonly check: () => void
}

export type FoldLawSuite =
  | { readonly ok: true; readonly laws: ReadonlyArray<FoldLawCase> }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "LawInputsUnavailable"
      readonly reason: string
    }
  }

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
 * Identity/associativity grant monoid use; random split grants parallel replay;
 * banana-split grants zip; homomorphism commutation grants map without replay.
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
  const history = FastCheck.array(event, { maxLength: 24 })
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
