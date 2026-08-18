import { describe, expect, test } from "bun:test"

import { Deferred, Effect, Fiber, Stream } from "effect"

import { join, replica, stateOf, type CellState, type Observation } from "../src/planes/Cell.js"
import type { Digest } from "../src/truth/Digest.js"

/**
 * The local replica's own suite: the two theorems A-8b cites by name, and the
 * honesty the interface promises.
 *
 * `cell_absorb_inflationary` — absorbing an observation never shrinks the local
 * join — and `cell_le_iff_subset` — the derived order IS observation-set
 * inclusion — are proven in the M3 join-semilattice package and rostered in
 * `VERIFICATION.md`. This file does not re-prove them; it checks that the
 * shipped replica is an instance of what they describe, which is an ordinary
 * test of contract prose and claims nothing about the model.
 */

const observation = (holder: unknown, value: unknown): Observation =>
  ({ holder, value }) as Observation

const alpha = observation(1, 10)
const beta = observation(2, 20)
const gamma = observation(3, 30)

const run = <A>(effect: Effect.Effect<A, unknown>): Promise<A> =>
  Effect.runPromise(effect as Effect.Effect<A, never>)

const digestOf = (observations: ReadonlyArray<Observation>): Digest =>
  Effect.runSync(stateOf(observations)).digest

/** `left ≤ right` in the derived order: joining the two adds nothing to `right`. */
const below = (left: CellState, right: CellState): boolean =>
  digestOf(Effect.runSync(join(left.observations, right.observations))) === right.digest

describe("the local replica", () => {
  test("a fresh replica is the empty join, and a seeded one is its seed", async () => {
    expect((await run(Effect.flatMap(replica(), (local) => local.current))).observations)
      .toEqual([])
    const seeded = await run(Effect.flatMap(replica([beta, alpha]), (local) => local.current))
    expect(seeded.digest).toBe(digestOf([alpha, beta]))
  })

  test("cell_absorb_inflationary: no absorb shrinks the local join", async () => {
    const states = await run(Effect.gen(function* () {
      const local = yield* replica()
      const seen: Array<CellState> = [yield* local.current]
      for (const delta of [[alpha], [beta], [alpha], [gamma]]) {
        yield* local.absorb(delta)
        seen.push(yield* local.current)
      }
      return seen
    }))
    for (let index = 1; index < states.length; index++) {
      expect(below(states[index - 1]!, states[index]!)).toBe(true)
    }
    // Absorbing a delta already carried is the identity, not a step: F1's
    // idempotence is what makes a polling feed harmless.
    expect(states[3]!.digest).toBe(states[2]!.digest)
    expect(states[4]!.digest).toBe(digestOf([alpha, beta, gamma]))
  })

  test("cell_le_iff_subset: the derived order is observation-set inclusion", async () => {
    const local = await run(replica([alpha]))
    await run(local.absorb([beta]))
    const state = await run(local.current)
    expect(state.observations).toEqual(Effect.runSync(join([alpha], [beta])))
    // Inclusion the other way is refuted, so "lower bound" is not vacuous.
    expect(below(state, Effect.runSync(stateOf([alpha])))).toBe(false)
  })

  test("two replicas that absorbed the same observations hold byte-identical state", async () => {
    const forward = await run(Effect.gen(function* () {
      const local = yield* replica()
      yield* local.absorb([alpha, beta])
      yield* local.absorb([gamma])
      return yield* local.current
    }))
    const backward = await run(Effect.gen(function* () {
      const local = yield* replica()
      yield* local.absorb([gamma, beta])
      yield* local.absorb([alpha, gamma])
      return yield* local.current
    }))
    expect(forward.digest).toBe(backward.digest)
  })

  test("changes emits the current join and every later one", async () => {
    const emitted = await run(Effect.gen(function* () {
      const local = yield* replica()
      const attached = yield* Deferred.make<void>()
      const collecting = yield* local.changes.pipe(
        Stream.tap(() => Deferred.succeed(attached, void 0)),
        Stream.take(3),
        Stream.runCollect,
        Effect.forkChild,
      )
      yield* Deferred.await(attached)
      yield* local.absorb([alpha])
      yield* local.absorb([beta])
      return yield* Fiber.join(collecting)
    }))
    expect(Array.from(emitted).map((state) => state.digest)).toEqual([
      digestOf([]),
      digestOf([alpha]),
      digestOf([alpha, beta]),
    ])
  })

  test("a value outside the RFC 8785 seam refuses, and the local join does not move", async () => {
    const local = await run(replica([alpha]))
    const refusal = await run(
      Effect.flip(local.absorb([observation("holder", Number.NaN)])),
    )
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("non-canonical-value")
    expect((await run(local.current)).digest).toBe(digestOf([alpha]))
  })
})
