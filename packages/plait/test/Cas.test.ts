import { describe, expect, test } from "bun:test"

import { Effect, Reducer, Result } from "effect"

import { absenceRefusal, type Refusal } from "../src/truth/Refusal.js"
import {
  CasWriteFailure,
  carries,
  casJoinLoop,
  joinOf,
  type MergeDiscipline,
  type Revisioned,
} from "../src/internal/cas.js"

/**
 * The extracted loop's mechanics, over a scripted in-memory substrate.
 *
 * `CellWall.test.ts` is the wall: it replays the fabric model's F1/F2 families
 * and the two T16 discriminating rows against a live NATS KV bucket, and it is
 * what proves this loop's behaviour did not move. This file is the fast gate
 * beneath it — the bounded-retry mechanics, the reconcile-before-classify
 * order, and the pre-CAS guard, each observed directly instead of through a
 * proxy tap.
 *
 * **The carrier here is a fixture, not a second consumer.** The bit-union
 * lattice below exists so the loop can be driven without a server, and it does
 * NOT discharge the extraction's honesty sentence: the second join consumers
 * (directory bind, admission facts, memory cells) are chartered by the ratified
 * G36/kernel rulings and are not shipped, so the license for extracting this
 * seam remains the kernel ratification, not a second adapter in this tree.
 */

/** Bit union: a genuine join semilattice, and one a pure `Reducer` can carry. */
const bits = Reducer.make<number>((left, right) => left | right, 0)
const identical = (left: number, right: number): Effect.Effect<boolean> =>
  Effect.succeed(left === right)
const join = joinOf(bits, identical)

const lawful: MergeDiscipline<number> = {
  next: (current, contribution) => join.combine(current, contribution),
  reconciled: (readBack, contribution) => carries(join, readBack, contribution),
}

const unavailable = absenceRefusal({
  kind: "probe-transport-unavailable",
  law: "Transport absence may be retried; lattice-law refusals may not.",
  path: ["probe.write"],
  got: "a refused write",
  expected: "the probe substrate to be available",
  next: [{ subject: "probe.write", note: "Retry this absence with retryAbsence." }],
})

const contended = (attempts: number): Refusal =>
  absenceRefusal({
    kind: "probe-update-contended",
    law: "A merge lands its contribution or reports contention.",
    path: ["probe"],
    got: attempts,
    expected: "one uncontended revision within the attempt bound",
    next: [{ subject: "probe.merge", note: "Re-attempt the merge; the join is idempotent." }],
  })

/** What a scripted write does before the substrate's own revision check runs. */
interface Interference {
  /** A rival state that lands first, moving the revision under this write. */
  readonly rival?: number
  /** Raise a non-CAS failure — the ambiguous class, outcome unknown. */
  readonly transport?: boolean
}

/**
 * A revision-CAS substrate with a scripted interference hook, counting the
 * three things the loop's contract is about: reads, writes, and refusal mints.
 */
const substrate = (initial?: number) => {
  let stored: Revisioned<number> | null = initial === undefined
    ? null
    : { value: initial, revision: 1 }
  let reads = 0
  let writes = 0
  let mints = 0
  let interfere: (write: number) => Interference = () => ({})
  const land = (value: number): number => {
    stored = { value, revision: (stored === null ? 0 : stored.revision) + 1 }
    return stored.revision
  }
  const refuse = (conflict: boolean) =>
    new CasWriteFailure(conflict, () => {
      mints += 1
      return unavailable
    })
  const write = (
    value: number,
    expectedRevision: number | null,
  ): Effect.Effect<number, CasWriteFailure> =>
    Effect.suspend(() => {
      writes += 1
      const scripted = interfere(writes)
      if (scripted.rival !== undefined) land(scripted.rival)
      if (scripted.transport === true) return Effect.fail(refuse(false))
      const observed = stored === null ? null : stored.revision
      if (observed !== expectedRevision) return Effect.fail(refuse(true))
      return Effect.succeed(land(value))
    })
  return {
    reads: () => reads,
    writes: () => writes,
    mints: () => mints,
    value: () => (stored === null ? null : stored.value),
    script: (next: (write: number) => Interference) => {
      interfere = next
    },
    read: Effect.sync((): Revisioned<number> | null => {
      reads += 1
      return stored
    }),
    create: (value: number) => write(value, null),
    update: (value: number, expectedRevision: number) => write(value, expectedRevision),
  }
}

const runLoop = (
  probe: ReturnType<typeof substrate>,
  contribution: number,
  overrides?: {
    readonly attempts?: number
    readonly discipline?: MergeDiscipline<number>
  },
): Promise<Result.Result<number, Refusal>> =>
  Effect.runPromise(Effect.result(casJoinLoop({
    join,
    discipline: overrides?.discipline ?? lawful,
    attempts: overrides?.attempts,
    read: probe.read,
    create: probe.create,
    update: probe.update,
    contribution,
    contended,
  })) as Effect.Effect<Result.Result<number, Refusal>, never>)

describe("the extracted CAS join loop", () => {
  test("takes its join from a declared algebra's reducer", () => {
    expect(join.initialValue).toBe(bits.initialValue)
    expect(Effect.runSync(join.combine(0b010, 0b001))).toBe(bits.combine(0b010, 0b001))
    // The order test IS the lattice order: c ≤ x iff x ⊔ c = x.
    expect(Effect.runSync(carries(join, 0b011, 0b001))).toBe(true)
    expect(Effect.runSync(carries(join, 0b010, 0b001))).toBe(false)
  })

  test("a state that already carries the contribution costs one read and no write", async () => {
    const probe = substrate(0b011)
    const result = await runLoop(probe, 0b001)
    expect(Result.isSuccess(result) && result.success).toBe(0b011)
    expect(probe.reads()).toBe(1)
    expect(probe.writes()).toBe(0)
  })

  test("an unwritten key is created, not updated", async () => {
    const probe = substrate()
    const result = await runLoop(probe, 0b100)
    expect(Result.isSuccess(result) && result.success).toBe(0b100)
    expect(probe.writes()).toBe(1)
    expect(probe.value()).toBe(0b100)
  })

  test("a lost CAS re-reads and re-merges: no contribution is dropped", async () => {
    const probe = substrate(0b001)
    probe.script((write) => write === 1 ? { rival: 0b011 } : {})
    const result = await runLoop(probe, 0b100)
    // The rival's bit and this contribution are both present: convergence, not
    // last-writer-wins.
    expect(Result.isSuccess(result) && result.success).toBe(0b111)
    expect(probe.writes()).toBe(2)
  })

  test("reconcile before classify: an ambiguous failure whose read-back carries it is success", async () => {
    const probe = substrate(0b001)
    probe.script((write) => write === 1 ? { rival: 0b101, transport: true } : {})
    const result = await runLoop(probe, 0b100)
    expect(Result.isSuccess(result) && result.success).toBe(0b101)
    // The read-back answered the question, so the transport mint was never
    // reached — that ordering is the whole of seam rule 1.
    expect(probe.mints()).toBe(0)
    expect(probe.writes()).toBe(1)
  })

  test("an ambiguous failure whose read-back lacks it refuses the carrier's transport absence", async () => {
    const probe = substrate(0b001)
    probe.script(() => ({ transport: true }))
    const result = await runLoop(probe, 0b100)
    expect(Result.isFailure(result)).toBe(true)
    if (!Result.isFailure(result)) return
    expect(result.failure.kind).toBe("probe-transport-unavailable")
    expect(result.failure.sort).toBe("absence")
    expect(probe.mints()).toBe(1)
  })

  test("an exhausted bound refuses the carrier's own absence, and the count is the bound", async () => {
    const probe = substrate(0b001)
    probe.script((write) => ({ rival: 0b001 | (1 << (write + 2)) }))
    const result = await runLoop(probe, 0b010)
    expect(Result.isFailure(result)).toBe(true)
    if (!Result.isFailure(result)) return
    expect(result.failure.kind).toBe("probe-update-contended")
    expect(result.failure.sort).toBe("absence")
    // Default eight, and one CAS attempt each — flow control, no correctness
    // stake: the contribution is simply not landed yet.
    expect(result.failure.got).toBe(8)
    expect(probe.writes()).toBe(8)
    expect(probe.mints()).toBe(0)
  })

  test("the bound is a parameter, and a caller's bound is the one reported", async () => {
    const probe = substrate(0b001)
    probe.script((write) => ({ rival: 0b001 | (1 << (write + 2)) }))
    const result = await runLoop(probe, 0b010, { attempts: 3 })
    expect(Result.isFailure(result) && result.failure.got).toBe(3)
    expect(probe.writes()).toBe(3)
  })

  test("the discipline seam is the loop's: swapping `next` alone deletes the join", async () => {
    const probe = substrate(0b001)
    probe.script((write) => write === 1 ? { rival: 0b011 } : {})
    const result = await runLoop(probe, 0b100, {
      discipline: {
        next: (_current, contribution) => Effect.succeed(contribution),
        reconciled: lawful.reconciled,
      },
    })
    // Last-writer-wins: the rival's state is gone, which is exactly what the
    // committed cell control asserts against the live bucket.
    expect(Result.isSuccess(result) && result.success).toBe(0b100)
    expect(probe.value()).toBe(0b100)
  })
})
