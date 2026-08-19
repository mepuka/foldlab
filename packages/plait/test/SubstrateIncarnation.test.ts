import { describe, expect, test } from "bun:test"

import { Effect, Result } from "effect"

import { Registers, type RegisterService, type RegisterState } from "../src/planes/Register.js"
import { Digest } from "../src/truth/Digest.js"
import { structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import {
  decideIncarnation,
  establishedFact,
  incarnation,
  incarnationName,
  LAME_DUCK_EVENT,
  lameDuckFact,
  landedAt,
  RETIREMENT_CAUSES,
  retiredFact,
  roundKey,
  store,
  storeName,
  walkChain,
  type SubstrateIncarnation,
} from "../src/internal/incarnations.js"

/**
 * A fixture commitment register that keeps the five actions' laws.
 *
 * It is a carrier, not a second register: the laws it enforces are the live
 * adapter's own — a bucket-global revision counter, grant only on an absent
 * register, a landed outcome that never changes, and no stale token ever
 * landing. What it adds is a scheduling window: every action suspends between
 * its read and its write, so two decides in one runtime genuinely interleave
 * instead of running to completion one after the other. Without that window a
 * race arm proves only that the scheduler was polite.
 */
const fixtureRegisters = (): {
  readonly service: RegisterService
  readonly landings: () => number
} => {
  const stored = new Map<string, { holder: string; outcome: { token: number; value: string } | null }>()
  let revision = 0
  let landings = 0

  const refuse = (kind: "duplicate-grant" | "outcome-already-landed" | "stale-register-token" | "register-absent", law: string): Refusal =>
    structuralRefusal({
      kind,
      law,
      path: ["register"],
      got: "refused",
      expected: "admitted",
      next: [],
    })

  const window = Effect.yieldNow

  const service: RegisterService = {
    grant: (work, holder) =>
      Effect.gen(function* () {
        const present = stored.has(work)
        yield* window
        if (present || stored.has(work)) {
          return yield* refuse("duplicate-grant", "grant requires the register to be absent")
        }
        revision += 1
        stored.set(work, { holder, outcome: null })
        const token = revision
        tokens.set(work, token)
        return { token, holder, outcome: null } satisfies RegisterState
      }),
    renew: (work, token) =>
      Effect.gen(function* () {
        const entry = stored.get(work)
        yield* window
        if (entry === undefined) {
          return yield* refuse("register-absent", "Renew, commit, and expire-steal require a present register.")
        }
        if (entry.outcome !== null) {
          return yield* refuse("outcome-already-landed", "an outcome, once set, never changes")
        }
        if (tokens.get(work) !== token) {
          return yield* refuse("stale-register-token", "renew requires the current fencing token")
        }
        revision += 1
        tokens.set(work, revision)
        return { token: revision, holder: entry.holder, outcome: null } satisfies RegisterState
      }),
    commit: (work, token, outcome) =>
      Effect.gen(function* () {
        const entry = stored.get(work)
        yield* window
        const current = stored.get(work)
        if (entry === undefined || current === undefined) {
          return yield* refuse("register-absent", "Renew, commit, and expire-steal require a present register.")
        }
        if (current.outcome !== null) {
          return yield* refuse("outcome-already-landed", "an outcome, once set, never changes")
        }
        if (tokens.get(work) !== token) {
          return yield* refuse("stale-register-token", "no stale token ever lands")
        }
        const landed = { token, value: outcome }
        stored.set(work, { holder: current.holder, outcome: landed })
        landings += 1
        return { token, holder: current.holder, outcome: landed } satisfies RegisterState
      }),
    expireSteal: (work, holder) =>
      Effect.gen(function* () {
        const entry = stored.get(work)
        yield* window
        if (entry === undefined) {
          return yield* refuse("register-absent", "Renew, commit, and expire-steal require a present register.")
        }
        if (entry.outcome !== null) {
          return yield* refuse("outcome-already-landed", "an outcome, once set, never changes")
        }
        revision += 1
        tokens.set(work, revision)
        stored.set(work, { holder, outcome: null })
        return { token: revision, holder, outcome: null } satisfies RegisterState
      }),
    observe: (work) =>
      Effect.gen(function* () {
        yield* window
        const entry = stored.get(work)
        if (entry === undefined) return { token: 0, holder: null, outcome: null } satisfies RegisterState
        return {
          token: entry.outcome?.token ?? tokens.get(work) ?? 0,
          holder: entry.holder,
          outcome: entry.outcome,
        } satisfies RegisterState
      }),
  }
  const tokens = new Map<string, number>()
  return { service, landings: () => landings }
}

const STORE = Digest.make("5".repeat(64))
const OPTIONS = Digest.make("7".repeat(64))

const race = async (
  holders: ReadonlyArray<string>,
  predecessor: string | null,
) => {
  const fixture = fixtureRegisters()
  const outcomes = await Effect.runPromise(
    Effect.all(
      holders.map((holder) =>
        Effect.result(decideIncarnation({
          store: STORE,
          options: OPTIONS,
          predecessor: predecessor === null ? null : Digest.make(predecessor),
          holder,
        }))
      ),
      { concurrency: "unbounded" },
    ).pipe(Effect.provide(Registers.testLayer(fixture.service))),
  )
  return { outcomes, landings: fixture.landings() }
}

describe("the substrate-incarnation fence", () => {
  test("two racing decides land exactly one incarnation, and the loser is taught", async () => {
    for (let round = 0; round < 32; round++) {
      const { outcomes, landings } = await race(["supervisor-a", "supervisor-b"], null)
      const won = outcomes.filter(Result.isSuccess)
      const lost = outcomes.filter(Result.isFailure)
      expect(won).toHaveLength(1)
      expect(lost).toHaveLength(1)
      expect(landings).toBe(1)
      const refusal = lost[0]!.failure
      expect(refusal.sort).toBe("structural")
      expect(refusal.law.length).toBeGreaterThan(0)
      expect(["duplicate-grant", "outcome-already-landed", "stale-register-token"])
        .toContain(refusal.kind)
    }
  })

  test("five racing decides land exactly one, every round", async () => {
    const winners: Array<number> = []
    for (let round = 0; round < 16; round++) {
      const { outcomes, landings } = await race(
        ["a", "b", "c", "d", "e"],
        null,
      )
      winners.push(outcomes.filter(Result.isSuccess).length)
      expect(landings).toBe(1)
    }
    expect(winners).toEqual(Array.from({ length: 16 }, () => 1))
  })

  test("the arm can go red: with the fence's token guard deleted, two incarnations land", async () => {
    const fixture = fixtureRegisters()
    // The register's own commit, minus the comparison that makes a token a
    // fence. A control that cannot fail proves nothing about the one above.
    const unfenced: RegisterService = {
      ...fixture.service,
      commit: (work, token, outcome) =>
        Effect.gen(function* () {
          yield* Effect.yieldNow
          unfencedLandings += 1
          return {
            token,
            holder: work,
            outcome: { token, value: outcome },
          } satisfies RegisterState
        }),
      grant: (work, holder) =>
        Effect.gen(function* () {
          yield* Effect.yieldNow
          granted += 1
          return { token: granted, holder, outcome: null } satisfies RegisterState
        }),
    }
    let unfencedLandings = 0
    let granted = 0
    const outcomes = await Effect.runPromise(
      Effect.all(
        ["a", "b"].map((holder) =>
          Effect.result(decideIncarnation({
            store: STORE,
            options: OPTIONS,
            predecessor: null,
            holder,
          }))
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.provide(Registers.testLayer(unfenced))),
    )
    expect(outcomes.filter(Result.isSuccess)).toHaveLength(2)
    expect(unfencedLandings).toBe(2)
  })

  test("the landed incarnation cites its options digest and its predecessor", async () => {
    const fixture = fixtureRegisters()
    const layer = Registers.testLayer(fixture.service)

    const first = await Effect.runPromise(
      decideIncarnation({ store: STORE, options: OPTIONS, predecessor: null, holder: "one" })
        .pipe(Effect.provide(layer)),
    )
    expect(first.value.options).toBe(OPTIONS)
    expect(first.value.predecessor).toBe(null)

    const second = await Effect.runPromise(
      decideIncarnation({
        store: STORE,
        options: OPTIONS,
        predecessor: first.digest,
        holder: "two",
      }).pipe(Effect.provide(layer)),
    )
    expect(second.value.predecessor).toBe(first.digest)
    expect(second.digest).not.toBe(first.digest)
    expect(second.round).not.toBe(first.round)

    // Each chain position reads back the incarnation that landed there.
    const atFirst = await Effect.runPromise(landedAt(STORE, null).pipe(Effect.provide(layer)))
    const atSecond = await Effect.runPromise(
      landedAt(STORE, first.digest).pipe(Effect.provide(layer)),
    )
    expect(atFirst).toBe(first.digest)
    expect(atSecond).toBe(second.digest)
  })

  test("a round nobody decided reads as absence, never as a running server", async () => {
    const fixture = fixtureRegisters()
    const nothing = await Effect.runPromise(
      landedAt(STORE, null).pipe(Effect.provide(Registers.testLayer(fixture.service))),
    )
    expect(nothing).toBe(null)
  })

  test("the round key separates chain positions and store directories", async () => {
    const other = Digest.make("6".repeat(64))
    const [a, b, c] = await Effect.runPromise(Effect.all([
      roundKey(STORE, null),
      roundKey(STORE, OPTIONS),
      roundKey(other, null),
    ]))
    expect(new Set([a, b, c]).size).toBe(3)
  })
})

describe("the lifecycle facts", () => {
  test("the store's digest travels and the directory does not", async () => {
    const declared = store("/var/lib/foldlab/substrate")
    expect(declared.kind).toBe("substrate-store")
    const named = await Effect.runPromise(storeName("/var/lib/foldlab/substrate"))
    const elsewhere = await Effect.runPromise(storeName("/srv/foldlab/substrate"))
    expect(named).not.toBe(elsewhere)
    expect(named).not.toContain("/")
  })

  test("the established fact cites the options digest and the predecessor", async () => {
    const value = incarnation({ store: STORE, options: OPTIONS, predecessor: null })
    const digest = await Effect.runPromise(incarnationName(value))
    const head = establishedFact(digest, value)
    expect(head.incarnation).toBe(digest)
    expect(head.options).toBe(OPTIONS)
    expect(head.predecessor).toBe(null)

    const successor = incarnation({ store: STORE, options: OPTIONS, predecessor: digest })
    const next = establishedFact(
      await Effect.runPromise(incarnationName(successor)),
      successor,
    )
    expect(next.predecessor).toBe(digest)
  })

  test("the lame-duck fact carries the vendor's own event name", () => {
    const fact = lameDuckFact({
      incarnation: STORE,
      session: OPTIONS,
      server: "foldlab-substrate",
    })
    expect(fact.event).toBe("ldm")
    expect(LAME_DUCK_EVENT).toBe("ldm")
    // The server rides the fact, which is why the server name is a declared
    // row: an unset one aliases a fresh identity per run.
    expect(fact.server).toBe("foldlab-substrate")
    expect(fact.session).toBe(OPTIONS)
  })

  test("the retirement causes are two declared estate values, and neither names a crash", () => {
    expect([...RETIREMENT_CAUSES]).toEqual(["drained", "stopped"])
    for (const forged of ["crashed", "killed", "timed-out", "unreachable"]) {
      expect(RETIREMENT_CAUSES).not.toContain(forged)
    }
    expect(retiredFact(STORE, "drained").cause).toBe("drained")
  })
})

describe("the incarnation chain", () => {
  const seed = async (length: number) => {
    const history = new Map<string, SubstrateIncarnation>()
    let predecessor: Digest | null = null
    const names: Array<string> = []
    for (let index = 0; index < length; index++) {
      const value = incarnation({
        store: STORE,
        options: Digest.make(String(index % 10).repeat(64)),
        predecessor,
      })
      const name = await Effect.runPromise(incarnationName(value))
      history.set(name, value)
      names.push(name)
      predecessor = name
    }
    return { history, names }
  }

  test("the walk is total over a seeded history and returns it newest first", async () => {
    for (const length of [1, 2, 5, 17]) {
      const { history, names } = await seed(length)
      const walked = await Effect.runPromise(
        walkChain(history, names[names.length - 1]!),
      )
      expect(walked).toEqual([...names].reverse())
      expect(new Set(walked).size).toBe(length)
    }
  })

  test("a chain step the history does not carry refuses rather than ending early", async () => {
    const { history, names } = await seed(4)
    history.delete(names[1]!)
    const refusal = await Effect.runPromise(Effect.flip(
      walkChain(history, names[3]!),
    ))
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.path).toEqual(["chain", names[1]!])
  })

  test("a planted cycle refuses instead of looping", async () => {
    const { history, names } = await seed(3)
    // Honest digests cannot form a cycle — a value's name covers its
    // predecessor's — so the cycle has to be planted, and the walk has to
    // survive it rather than run forever.
    const oldest = history.get(names[0]!)!
    history.set(names[0]!, { ...oldest, predecessor: names[2]! })
    const refusal = await Effect.runPromise(Effect.flip(
      walkChain(history, names[2]!),
    ))
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.path).toEqual(["chain", names[2]!])
    expect(refusal.got).toBe("already walked")
  })
})
