import { resolve } from "node:path"

import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import { admit } from "../src/kernel/KernelDoor.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import { canonicalBytes } from "../src/truth/Canonical.js"
import { Digest, digestOf } from "../src/truth/Digest.js"
import { earnedLawsOf, lawSuite, rungLaws, type LawName } from "../src/truth/Algebra.js"
import { initial } from "../src/planes/Anchor.js"
import {
  attachHeartbeatSeat,
  claimedAt,
  clientHealth,
  declareSchedule,
  HEALTH_VALUES,
  HEARTBEAT_EVENT_FORM,
  occurrenceOf,
  occurrenceName,
  tickFact,
  type HealthReading,
  type HeartbeatTick,
} from "../src/internal/heartbeat.js"
import { heartbeatLane } from "../src/internal/heartbeatlane.js"
import { sessionLane } from "../src/internal/sessionlanes.js"
import { endedFact, observationFact, type SessionFact } from "../src/internal/sessionfacts.js"
import {
  currentMembers,
  joinPresence,
  membersOf,
  presenceAlgebra,
  presenceAt,
  presenceContribution,
  presenceFold,
  PRESENCE_BOTTOM,
  PRESENCE_RUNG,
  SILENCE_READING,
  stalenessOf,
  type PresenceState,
} from "../src/internal/presence.js"
import { replaySuccessors, type PositionedEvent } from "../src/internal/successors.js"
import { PLANTED_CONTEXT } from "./KernelDoor.fixtures.js"

/**
 * The heartbeat seat, the presence fold, and the staleness read, exercised over
 * constructed facts with no substrate behind them.
 *
 * Everything asserted here is a property of the values and the reductions: the
 * tick body is a function of its declared inputs, the presence reduction stands
 * at the rung it claims, and neither read consults a clock. The arms that need
 * a real server — a hard-killed holder, a racing second emitter landing on a
 * real stream — live in the wall beside this file, because those are properties
 * of the substrate and not of these functions.
 */

const SCHEDULE = { origin: "2026-08-19T00:00:00.000Z", period: 1_000 }
// Session names go through the digest door rather than being cast into it, so
// a constant that is not a digest fails here rather than folding.
const SESSION_A = Digest.make("a".repeat(64))
const SESSION_B = Digest.make("b".repeat(64))
const SESSION_C = Digest.make("c".repeat(64))
const OBSERVED: HealthReading = { health: "open", healthSource: "client-observed" }

const established = (session: string): SessionFact => ({
  v: 0,
  kind: "substrate-session-established",
  session,
  options: "0".repeat(64),
  roster: "1".repeat(64),
  predecessor: null,
})

const positioned = <Event>(
  events: ReadonlyArray<Event>,
): Effect.Effect<ReadonlyArray<PositionedEvent<Event>>, never> =>
  Effect.forEach(events, (event, index) =>
    Effect.map(
      digestOf(event as never).pipe(Effect.orDie),
      (digest) => ({ position: index + 1, event, digest }),
    ))

const foldPresence = (facts: ReadonlyArray<SessionFact>) =>
  Effect.gen(function* () {
    const algebra = yield* presenceAlgebra
    const deliveries = yield* positioned(facts)
    const anchor = yield* initial(PRESENCE_BOTTOM as never)
    return yield* replaySuccessors<SessionFact, PresenceState>({
      anchor,
      state: PRESENCE_BOTTOM,
      deliveries,
      step: (state, fact) => algebra.reducer.combine(state, presenceContribution.apply(fact)),
    })
  }).pipe(Effect.orDie)

const traced = async (name: string, line: string): Promise<void> => {
  expect(`${line}\n`).toBe(
    await Bun.file(resolve(import.meta.dir, `../negative-controls/${name}`)).text(),
  )
  console.info(line)
}

describe("the declared schedule", () => {
  test("a schedule is declared data whose digest is its name, and moving it moves the name", async () => {
    const every = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const again = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const slower = await Effect.runPromise(
      declareSchedule({ ...SCHEDULE, period: 2_000 }).pipe(Effect.orDie),
    )
    expect(again.digest).toBe(every.digest)
    expect(slower.digest).not.toBe(every.digest)
    // The name is the declaration's own bytes, computed with no I/O.
    expect(await Effect.runPromise(digestOf(every.value as never).pipe(Effect.orDie)))
      .toBe(every.digest)
  })

  test("a schedule with an unreadable origin or a non-positive period refuses, and teaches", async () => {
    const rows: ReadonlyArray<{
      readonly input: { readonly origin: string; readonly period: number }
      readonly path: ReadonlyArray<string>
    }> = [
      { input: { origin: "whenever", period: 1_000 }, path: ["origin"] },
      { input: { origin: SCHEDULE.origin, period: 0 }, path: ["period"] },
      { input: { origin: SCHEDULE.origin, period: -5 }, path: ["period"] },
    ]
    for (const { input, path } of rows) {
      const refusal = await Effect.runPromise(Effect.flip(declareSchedule(input)))
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual([...path])
      expect(refusal.next[0]!.note.length).toBeGreaterThan(0)
    }
  })

  test("the claimed time is arithmetic over the declaration and never a clock reading", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    // Firing n claims the origin advanced n periods, exactly.
    for (const firing of [0, 1, 2, 97]) {
      expect(Date.parse(claimedAt(declared.value, firing)) - Date.parse(SCHEDULE.origin))
        .toBe(firing * SCHEDULE.period)
    }
    // Computed twice a millisecond apart, the same value: nothing here reads a
    // clock, so the passage of time moves no field.
    const first = claimedAt(declared.value, 3)
    await Bun.sleep(5)
    expect(claimedAt(declared.value, 3)).toBe(first)
  })
})

describe("the tick fact", () => {
  test("the occurrence key is the triple, and the body is a function of its declared inputs", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const tick = tickFact(declared, { session: SESSION_A, firing: 4 }, OBSERVED)

    expect(occurrenceOf(tick)).toEqual({
      session: SESSION_A,
      schedule: declared.digest,
      firing: 4,
    })
    expect(Object.keys(tick).sort()).toEqual(
      ["claimed", "firing", "health", "healthSource", "kind", "schedule", "session", "v"],
    )
    // The declared form's field list is the fact's field list, less the two
    // words every declared value in this package carries.
    expect([...HEARTBEAT_EVENT_FORM.variants[0].fields].sort() as Array<string>)
      .toEqual(Object.keys(tick).filter((key) => key !== "v" && key !== "kind").sort())
    // The provenance field is mandatory and it is the field that keeps two
    // postures apart: at this posture the health is what the client saw.
    expect(tick.healthSource).toBe("client-observed")
    expect(HEALTH_VALUES).toContain(tick.health)
  })

  test("two emitters of one occurrence mint byte-identical bodies", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const first = tickFact(declared, { session: SESSION_A, firing: 7 }, OBSERVED)
    await Bun.sleep(5)
    const second = tickFact(declared, { session: SESSION_A, firing: 7 }, OBSERVED)

    const [left, right] = await Effect.runPromise(
      Effect.all([canonicalBytes(first as never), canonicalBytes(second as never)]).pipe(
        Effect.orDie,
      ),
    )
    // The assertion is digest equality over the canonical bytes, not a count.
    expect(Array.from(right)).toEqual(Array.from(left))
    expect(await Effect.runPromise(digestOf(second as never).pipe(Effect.orDie)))
      .toBe(await Effect.runPromise(digestOf(first as never).pipe(Effect.orDie)))

    // The bound, stated where it bites: health is a genuine observation, so two
    // emitters that saw DIFFERENT health are not making one claim twice, and
    // their bytes say so.
    const disagreeing = tickFact(declared, { session: SESSION_A, firing: 7 }, {
      health: "closed",
      healthSource: "client-observed",
    })
    expect(await Effect.runPromise(digestOf(disagreeing as never).pipe(Effect.orDie)))
      .not.toBe(await Effect.runPromise(digestOf(first as never).pipe(Effect.orDie)))
  })

  test("every component of the occurrence key separates two occurrences", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const slower = await Effect.runPromise(
      declareSchedule({ ...SCHEDULE, period: 2_000 }).pipe(Effect.orDie),
    )
    const base = occurrenceOf(tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED))
    const names = await Effect.runPromise(
      Effect.all([
        occurrenceName(base),
        occurrenceName({ ...base, session: SESSION_B }),
        occurrenceName({ ...base, schedule: slower.digest }),
        occurrenceName({ ...base, firing: 2 }),
      ]).pipe(Effect.orDie),
    )
    expect(new Set(names).size).toBe(4)
  })

  test("the seat's firing numbers come from its own successor, never from elapsed time", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const landed: Array<HeartbeatTick> = []
    const observed = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const seat = yield* attachHeartbeatSeat<never>({
        schedule: declared,
        session: Effect.succeed(SESSION_A),
        health: Effect.succeed(OBSERVED),
        land: (tick) => Effect.sync(() => void landed.push(tick)),
      })
      // Three firings taken back to back, with no period of wall time between
      // them: the sequence is 1, 2, 3 because the seat counts, not because an
      // interval elapsed.
      yield* seat.fire
      yield* seat.fire
      yield* seat.fire
      return yield* seat.firings
    })))

    expect(observed).toBe(3)
    expect(landed.map((tick) => tick.firing)).toEqual([1, 2, 3])
    expect(landed.map((tick) => tick.claimed)).toEqual(
      [1, 2, 3].map((firing) => claimedAt(declared.value, firing)),
    )
  })

  test("the health a client emits is what the client itself can answer", () => {
    const reading = clientHealth({
      isClosed: () => false,
      isDraining: () => true,
    } as never)
    expect(reading).toEqual({ health: "draining", healthSource: "client-observed" })
    expect(clientHealth({ isClosed: () => true, isDraining: () => false } as never).health)
      .toBe("closed")
  })
})

describe("the presence fold", () => {
  test("the reduction stands at the rung it claims, earned by the ladder's own suite", async () => {
    const algebra = await Effect.runPromise(presenceAlgebra.pipe(Effect.orDie))
    const atoms = lawSuite(algebra, (left, right) =>
      left.established.join(",") === right.established.join(",") &&
      left.ended.join(",") === right.ended.join(","))
    const states: ReadonlyArray<PresenceState> = [
      PRESENCE_BOTTOM,
      { v: 0, kind: "substrate-presence", established: [SESSION_A], ended: [] },
      { v: 0, kind: "substrate-presence", established: [SESSION_A, SESSION_B], ended: [SESSION_A] },
      { v: 0, kind: "substrate-presence", established: [SESSION_B], ended: [SESSION_C] },
    ]

    // Every atom the claimed rung obligates, walked from the ladder's own table
    // rather than listed here, over every triple of the states above.
    const obligated: ReadonlyArray<LawName> = rungLaws[PRESENCE_RUNG]
    for (const left of states) {
      for (const middle of states) {
        for (const right of states) {
          for (const law of obligated) {
            const held = law === "total"
              ? atoms.total(left, right)
              : law === "associative"
              ? atoms.associative(left, middle, right)
              : law === "identity"
              ? atoms.identity(left)
              : law === "commutative"
              ? atoms.commutative(left, right)
              : law === "idempotent"
              ? atoms.idempotent(left)
              : atoms.bounded(left)
            expect(held, `${law} over the presence join`).toBe(true)
          }
        }
      }
    }
    // The rung the ladder's one branding door hands out is the rung the lane
    // demands, and it is earned rather than asserted.
    expect([...earnedLawsOf(algebra)].sort()).toEqual([...rungLaws["commutative-monoid"]].sort())
  })

  test("the fold declares over the session lane and its step factors through the algebra", async () => {
    const fold = await Effect.runPromise(
      sessionLane().pipe(Effect.flatMap(presenceFold), Effect.orDie),
    )
    expect(fold.declaration.kind).toBe("fold")
    expect(fold.declaration.algebra).toBe((await Effect.runPromise(presenceAlgebra.pipe(Effect.orDie))).digest)
    // The step is the algebra's combine over the contribution, by construction.
    const stepped = fold.step(PRESENCE_BOTTOM, established(SESSION_A))
    expect(stepped).toEqual(joinPresence(PRESENCE_BOTTOM, presenceContribution.apply(established(SESSION_A))))
  })

  test("established and not ended is the membership, and a teardown removes without editing", async () => {
    const replayed = await Effect.runPromise(foldPresence([
      established(SESSION_A),
      established(SESSION_B),
      endedFact(SESSION_A, "ConnectionError: closed"),
    ]))
    expect(replayed.applied).toBe(3)
    expect(membersOf(replayed.state)).toEqual([SESSION_B])
    // Nothing was edited: both halves accumulate, which is what makes hearing
    // the teardown twice mean what hearing it once meant.
    expect(replayed.state.established).toEqual([SESSION_A, SESSION_B].sort())
    expect(replayed.state.ended).toEqual([SESSION_A])
  })

  test("a transition and a reading contribute the bottom, so a lane of them moves nothing", async () => {
    const replayed = await Effect.runPromise(foldPresence([
      established(SESSION_A),
      {
        v: 0,
        kind: "substrate-session-transition",
        session: SESSION_A,
        event: "reconnecting",
        from: null,
        to: "reconnecting",
        payload: {},
      },
      observationFact({ session: SESSION_A, event: "ping", state: null, payload: {} }),
    ]))
    expect(membersOf(replayed.state)).toEqual([SESSION_A])
    expect(replayed.state.ended).toEqual([])
  })

  test("PLANT: a fold inferring membership from a heartbeat alone dies; reverting passes", async () => {
    // The named vector: one session that only ever emitted heartbeats and never
    // an establishment. The lawful contribution cannot see a tick at all — a
    // tick is not a session fact — so the mutant is spelled as a contribution
    // over a widened event that reads one.
    type Widened = SessionFact | HeartbeatTick
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const vector: ReadonlyArray<Widened> = [
      established(SESSION_A),
      tickFact(declared, { session: SESSION_B, firing: 1 }, OBSERVED),
    ]
    const mutant = (fact: Widened): PresenceState =>
      fact.kind === "substrate-heartbeat-tick"
        ? { v: 0, kind: "substrate-presence", established: [fact.session], ended: [] }
        : presenceContribution.apply(fact)
    const lawful = (fact: Widened): PresenceState =>
      fact.kind === "substrate-heartbeat-tick" ? PRESENCE_BOTTOM : presenceContribution.apply(fact)

    const fold = (apply: (fact: Widened) => PresenceState): PresenceState =>
      vector.reduce<PresenceState>((state, fact) => joinPresence(state, apply(fact)), PRESENCE_BOTTOM)

    // The mutant makes a member of a session with no established fact.
    expect(membersOf(fold(mutant))).toContain(SESSION_B)
    // The lawful reduction never does, and that is the non-negotiable half.
    expect(membersOf(fold(lawful))).toEqual([SESSION_A])

    await traced(
      "Presence.heartbeat-membership.trace.txt",
      "PRESENCE CONTROL: PASS component=presence-membership mutant=heartbeat-implies-member vector=tick-without-establishment law=established-and-not-ended",
    )
  })

  test("PLANT: a fold treating a missing ended fact as liveness dies; reverting passes", async () => {
    // The named vector: a session established and then hard-killed, so no ended
    // fact exists and the heartbeat lane stopped advancing. The mutant reads the
    // missing teardown as evidence of life.
    const replayed = await Effect.runPromise(foldPresence([established(SESSION_A)]))
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED),
    ]))
    // Head has moved well past that session's last firing: the lane advanced
    // for other sessions and stopped advancing for this one.
    const reading = presenceAt({
      anchor: replayed.anchor,
      state: replayed.state,
      head: replayed.anchor.floor,
      ticks,
      heartbeatHead: 40,
      tolerance: 4,
    })

    // The mutant: no ended fact, therefore alive.
    const mutantLive = replayed.state.ended.length === 0
    expect(mutantLive).toBe(true)
    // The lawful reading: a member, and not current, because the silence is a
    // number the read carries rather than an inference it makes.
    expect(reading.membership).toEqual([SESSION_A])
    expect(currentMembers(reading)).toEqual([])
    expect(reading.members[0]!.staleness.staleness).toBe(39)

    await traced(
      "Presence.missing-ended-liveness.trace.txt",
      "PRESENCE CONTROL: PASS component=absent-by-silence mutant=no-ended-fact-implies-live vector=killed-session-stopped-heartbeat law=silence-is-absence",
    )
  })
})

describe("the staleness read", () => {
  test("head minus the greatest firing citing the session, with the reader's tolerance", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED),
      tickFact(declared, { session: SESSION_B, firing: 1 }, OBSERVED),
      tickFact(declared, { session: SESSION_A, firing: 2 }, OBSERVED),
      tickFact(declared, { session: SESSION_B, firing: 2 }, OBSERVED),
    ]))

    const a = stalenessOf(ticks, 4, SESSION_A, 2)
    expect({ firing: a.firing, position: a.position, staleness: a.staleness, current: a.current })
      .toEqual({ firing: 2, position: 3, staleness: 1, current: true })

    // The same reading judged by a stricter reader is the same reading.
    expect(stalenessOf(ticks, 4, SESSION_A, 0).staleness).toBe(1)
    expect(stalenessOf(ticks, 4, SESSION_A, 0).current).toBe(false)
  })

  test("a session nothing was ever heard from reads as absent, never as fresh", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED),
    ]))
    const silent = stalenessOf(ticks, 1, SESSION_C, 1_000_000)
    // Honest absence: not a staleness of zero, and not current at any tolerance.
    expect(silent.staleness).toBe(null)
    expect(silent.firing).toBe(null)
    expect(silent.current).toBe(false)
  })

  test("PLANT: a fold reading the claimed-time field draws red; the positional read does not", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED),
      tickFact(declared, { session: SESSION_A, firing: 2 }, OBSERVED),
    ]))
    // The mutant: staleness as "now minus the claimed time". It is a different
    // number every time it is asked, which is precisely why replay is no longer
    // deterministic under it.
    const clockRead = (): number =>
      Date.now() - Date.parse(ticks[ticks.length - 1]!.event.claimed)
    const first = clockRead()
    await Bun.sleep(20)
    expect(clockRead()).toBeGreaterThan(first)

    // The lawful read is arithmetic over positions and moves for nobody.
    const lawful = stalenessOf(ticks, 2, SESSION_A, 0)
    await Bun.sleep(20)
    expect(stalenessOf(ticks, 2, SESSION_A, 0)).toEqual(lawful)

    await traced(
      "Presence.clock-reading-fold.trace.txt",
      "PRESENCE CONTROL: PASS component=staleness-read mutant=claimed-time-minus-now vector=two-firings-one-session law=no-clock-in-meaning",
    )
  })
})

describe("the replay-determinism arm", () => {
  test("the same facts from the same anchor land the same positions and the same fold value", async () => {
    const facts = [
      established(SESSION_A),
      established(SESSION_B),
      endedFact(SESSION_A, ""),
      established(SESSION_C),
    ]
    const first = await Effect.runPromise(foldPresence(facts))
    await Bun.sleep(20)
    const second = await Effect.runPromise(foldPresence(facts))

    expect(second.anchor).toEqual(first.anchor)
    expect(second.state).toEqual(first.state)
    expect(second.applied).toBe(first.applied)
    expect(membersOf(second.state)).toEqual([SESSION_B, SESSION_C].sort())

    // Replayed from a RECORDED anchor rather than from the bottom: the tail
    // lands at the same positions and the state digest the anchor carries is
    // the same value.
    const algebra = await Effect.runPromise(presenceAlgebra.pipe(Effect.orDie))
    const head = await Effect.runPromise(foldPresence(facts.slice(0, 2)))
    const tail = await Effect.runPromise(
      positioned(facts).pipe(Effect.map((all) => all.slice(2))),
    )
    const resumed = await Effect.runPromise(
      replaySuccessors<SessionFact, PresenceState>({
        anchor: head.anchor,
        state: head.state,
        deliveries: tail,
        step: (state, fact) => algebra.reducer.combine(state, presenceContribution.apply(fact)),
      }).pipe(Effect.orDie),
    )
    expect(resumed.anchor).toEqual(first.anchor)
    expect(resumed.state).toEqual(first.state)
  })

  test("the heartbeat lane replays the same ticks at the same positions", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const ticks = [1, 2, 3].map((firing) =>
      tickFact(declared, { session: SESSION_A, firing }, OBSERVED)
    )
    const first = await Effect.runPromise(positioned(ticks))
    await Bun.sleep(20)
    const second = await Effect.runPromise(positioned(ticks))
    expect(second).toEqual(first)
    expect(stalenessOf(second, 3, SESSION_A, 0)).toEqual(stalenessOf(first, 3, SESSION_A, 0))
  })
})

describe("the closed trigger grammar", () => {
  test("PLANT: a deadline or absence trigger is refused by the door with a taught repair", () => {
    const taught = KERNEL_REFUSAL_BY_REASON["absence-trigger"]
    for (
      const predicate of [
        { _tag: "deadline", tick: 5n },
        { _tag: "onAbsence", subject: 6n },
        { _tag: "negation", inner: { _tag: "evidenceAppears", lane: 1n, pattern: 17n } },
      ] as const
    ) {
      const verdict = admit(PLANTED_CONTEXT, {
        _tag: "trigger",
        predicate: predicate as never,
        declaration: 3n,
      })
      expect(verdict.verdict).toBe("refused")
      expect(verdict).toMatchObject({
        reason: "absence-trigger",
        law: taught.law,
        repair: taught.repair,
      })
      // The repair teaches where acting on silence belongs, rather than saying
      // to delete the field.
      expect(taught.repair).toContain("deadline seat")
    }
  })

  test("a trigger that reacts to the existence of a fact is admitted, so the door is not a blanket no", () => {
    const verdict = admit(PLANTED_CONTEXT, {
      _tag: "trigger",
      predicate: { _tag: "evidenceAppears", lane: 1n, pattern: 17n },
      declaration: 3n,
    })
    expect(verdict.verdict).toBe("admitted")
  })

  test("the executed control is traced", async () => {
    await traced(
      "Presence.absence-trigger.trace.txt",
      "PRESENCE CONTROL: PASS component=trigger-grammar mutant=deadline-and-absence-predicates refusal=absence-trigger law=f10_stability",
    )
  })
})

describe("the open pin, and the half that is not open", () => {
  test("the reading is one declaration and both shapes are constructed", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const replayed = await Effect.runPromise(foldPresence([
      established(SESSION_A),
      established(SESSION_B),
    ]))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_A, firing: 1 }, OBSERVED),
      tickFact(declared, { session: SESSION_B, firing: 1 }, OBSERVED),
      tickFact(declared, { session: SESSION_B, firing: 2 }, OBSERVED),
    ]))
    const reading = presenceAt({
      anchor: replayed.anchor,
      state: replayed.state,
      head: replayed.anchor.floor + 3,
      ticks,
      heartbeatHead: 3,
      tolerance: 1,
    })

    // Reading (i): membership, for a reader that composes it with staleness.
    expect(reading.membership).toEqual([SESSION_A, SESSION_B].sort() as Array<string>)
    // Reading (ii): the same membership with each member's silence beside it.
    expect(reading.members.map((member) => member.session)).toEqual([...reading.membership])
    expect(reading.reading).toBe(SILENCE_READING)
    // The read's OWN staleness is head minus the anchor it was taken at.
    expect(reading.staleness).toBe(3)
    // A is two positions behind at a tolerance of one, so it is a member and it
    // is not current; B is at the head.
    expect(currentMembers(reading)).toEqual([SESSION_B])
  })

  test("no session without an established fact is ever a member, under either reading", async () => {
    const declared = await Effect.runPromise(declareSchedule(SCHEDULE).pipe(Effect.orDie))
    const replayed = await Effect.runPromise(foldPresence([
      endedFact(SESSION_C, "ConnectionError: closed"),
      observationFact({ session: SESSION_C, event: "ping", state: null, payload: {} }),
    ]))
    const ticks = await Effect.runPromise(positioned([
      tickFact(declared, { session: SESSION_C, firing: 1 }, OBSERVED),
    ]))
    const reading = presenceAt({
      anchor: replayed.anchor,
      state: replayed.state,
      head: replayed.anchor.floor,
      ticks,
      heartbeatHead: 1,
      tolerance: 1_000,
    })
    // A teardown, a reading and a live heartbeat, and no establishment: not a
    // member under either reading, and not current under either.
    expect(reading.membership).toEqual([])
    expect(reading.members).toEqual([])
    expect(currentMembers(reading)).toEqual([])
  })

  test("the heartbeat lane is declared positioned, which is what the staleness rung licenses", async () => {
    const lane = await Effect.runPromise(heartbeatLane().pipe(Effect.orDie))
    expect(lane.partitions).toBe(1)
    expect(String(lane.handle)).toBe(String(lane.declaration.eventSchema))
  })
})
