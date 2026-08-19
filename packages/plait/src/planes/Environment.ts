/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * Environments are directories: the provision algebra at its ruled minimal
 * surface. A provision is a positioned fact that accumulates rather than
 * overwrites; the value a name has is the provision standing at the greatest
 * position; nothing is deleted, and a later provision shadows an earlier one.
 * The model proves the collapse — the order-carrying provision fold IS the
 * positioned greatest-read — and this module carries that correspondence into
 * the runtime as executable data plus the suite that checks it over generated
 * cases. Nothing here re-proves the theorem; the suite confirms the carrier.
 *
 * Three shapes and no fourth:
 *
 * - `ProvisionFact` — one positioned provision: a hole name, the identity
 *   label provided, and the position it was provided at.
 * - `greatestAt` — the directory read: per hole, the value at the greatest
 *   position. Two facts at one position for one hole with different values
 *   have no arbitration here and refuse: arbitration is the fenced register's,
 *   never a read's.
 * - `provisionFold` — the order-carrying fold: later provisions in the list
 *   shadow earlier ones. The correspondence with `greatestAt` over
 *   list-position facts is the proven collapse, checked by the suite.
 *
 * Filling a program from an environment is `fillFrom`: the greatest-position
 * valuation handed to the program builder's own `fill`, which is the proven
 * substitution. A program filled from an environment is therefore the same
 * value as the program filled from the valuation directly — no second
 * substitution path exists.
 *
 * Multi-writer authoritative rebinding is deliberately absent: that is the
 * directory's fenced decision, exactly where the estate already put it. This
 * module carries process-local environment values only; a durable environment
 * carrier waits on its own ticket.
 *
 * @module
 */
import { Effect } from "effect"

import { structuralRefusal, type StructuralRefusal } from "../truth/Refusal.js"
import { fill, type KernelProgram } from "../kernel/KernelProgram.js"

/** One positioned provision: a hole, the label provided, and its position. */
export interface ProvisionFact {
  readonly hole: bigint
  readonly value: bigint
  readonly position: bigint
}

/** A valuation: what each covered hole is filled with. */
export type Valuation = ReadonlyMap<bigint, bigint>

const ambiguousProvision = (
  hole: bigint,
  position: bigint,
  values: ReadonlyArray<bigint>,
): StructuralRefusal =>
  structuralRefusal({
    kind: "ambiguous-binding",
    law: "One hole carries at most one provision per position; ties are the fenced register's to arbitrate, never a read's.",
    path: ["provisions", String(hole), String(position)],
    got: values.map(String),
    expected: "one provided value at this position",
    next: [{
      subject: "Environment.greatestAt",
      note: "Route the conflicting provisions through a fenced rebind, or provide at distinct positions.",
    }],
  })

/**
 * The directory read: per hole, the provision standing at the greatest
 * position. Duplicate identical facts are free — the fact plane is a set —
 * and a genuine tie (one hole, one position, two values) refuses, because a
 * read never arbitrates.
 *
 * @example
 * ```ts
 * import { greatestAt } from "@foldlab/plait/Environment"
 * import { Effect } from "effect"
 *
 * Effect.runSync(greatestAt([
 *   { hole: 7n, value: 1n, position: 0n },
 *   { hole: 7n, value: 2n, position: 3n },
 * ])).get(7n)
 * // 2n
 * ```
 */
export const greatestAt = Effect.fn("Environment.greatestAt")(function* (
  facts: ReadonlyArray<ProvisionFact>,
): Effect.fn.Return<Valuation, StructuralRefusal> {
  const greatest = new Map<bigint, ProvisionFact>()
  for (const fact of facts) {
    const standing = greatest.get(fact.hole)
    if (standing === undefined || fact.position > standing.position) {
      greatest.set(fact.hole, fact)
      continue
    }
    if (fact.position === standing.position && fact.value !== standing.value) {
      return yield* ambiguousProvision(fact.hole, fact.position, [standing.value, fact.value])
    }
  }
  const valuation = new Map<bigint, bigint>()
  for (const [hole, fact] of greatest) valuation.set(hole, fact.value)
  return valuation
})

/**
 * The order-carrying provision fold: later provisions shadow earlier ones.
 * This is the overlay-chain reading — the fold form the proven collapse
 * equates with the positioned greatest-read at list positions.
 */
export const provisionFold = (
  events: ReadonlyArray<{ readonly hole: bigint; readonly value: bigint }>,
): Valuation => {
  const valuation = new Map<bigint, bigint>()
  for (const event of events) valuation.set(event.hole, event.value)
  return valuation
}

/** Reads an ordered provision list as its positioned fact set. */
export const positionedOf = (
  events: ReadonlyArray<{ readonly hole: bigint; readonly value: bigint }>,
): ReadonlyArray<ProvisionFact> =>
  events.map((event, index) => ({
    hole: event.hole,
    value: event.value,
    position: BigInt(index),
  }))

/**
 * Fills a program from an environment: the greatest-position valuation handed
 * to the builder's own proven substitution. Requirements after the fill are
 * requirements minus what the environment provided — the exclusion law, at
 * the environment.
 */
export const fillFrom = Effect.fn("Environment.fillFrom")(function* (
  program: KernelProgram<bigint>,
  facts: ReadonlyArray<ProvisionFact>,
): Effect.fn.Return<KernelProgram<bigint>, StructuralRefusal> {
  const valuation = yield* greatestAt(facts)
  const covering = new Map<bigint, bigint>()
  for (const hole of program.requirements) {
    const provided = valuation.get(hole)
    if (provided !== undefined) covering.set(hole, provided)
  }
  return fill(program, covering)
})
