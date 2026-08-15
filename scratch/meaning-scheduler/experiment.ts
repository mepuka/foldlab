/**
 * E2: the meaning-scheduler. One Effect program — three agent fibers
 * making epistemic moves against one CAS journal — run under many
 * deterministic schedules via a shared-queue scheduler (the technique
 * Effect's own Semaphore/Latch tests use). Claims under test are in
 * PREREGISTRATION.md; this file must be able to refute them.
 */

import { Effect, Fiber } from "effect"
import * as Scheduler from "effect/Scheduler"
import { Journal, verifyJournal, type Entry, type Move, type EpistemicState } from "./journal.ts"
import type { JsonValue } from "../../packages/core/src/jcs.ts"

// ------------------------------------------------- seeded scheduling

type Task = () => void

/** One shared queue for ALL fibers — interleaving becomes our choice. */
const makeDrivenScheduler = () => {
  const tasks: Task[] = []
  const scheduler: Scheduler.Scheduler = {
    executionMode: "sync",
    // One real op per resumption: the splice defers the CURRENT op behind
    // the yield and the op counter resets on re-entry, so an unconditional
    // true would defer the same op forever (internal/effect.ts:635,643-651).
    shouldYield: (fiber: { currentOpCount: number }) => fiber.currentOpCount >= 3,
    makeDispatcher: () => ({
      scheduleTask: (task: Task, _priority: number) => {
        tasks.push(task)
      },
      flush: () => {},
    }),
  } as Scheduler.Scheduler
  return { scheduler, tasks }
}

const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export type Schedule =
  | { readonly kind: "fifo" }
  | { readonly kind: "lifo" }
  | { readonly kind: "seeded"; readonly seed: number }

const pick = (tasks: Task[], schedule: Schedule, rand: () => number): Task => {
  switch (schedule.kind) {
    case "fifo":
      return tasks.shift()!
    case "lifo":
      return tasks.pop()!
    case "seeded":
      return tasks.splice(Math.floor(rand() * tasks.length), 1)[0]!
  }
}

// ----------------------------------------------------------- agents

/**
 * An agent: a fiber holding intended moves. Reading the head and
 * attempting the CAS append are separate ops, so schedules interleave
 * between them — stale-head conflicts are reachable, as in life.
 * Repair discipline on refusal: an idempotent fill converges silently;
 * a genuine conflict must surface as a dispute; the fence (decide) is
 * single-homed to the one agent holding decision authority.
 */
const agent = (
  name: string,
  journal: Journal,
  intents: readonly { hole: string; value: JsonValue }[],
) =>
  Effect.gen(function* () {
    for (const intent of intents) {
      let settled = false
      while (!settled) {
        const head = yield* Effect.sync(() => journal.head())
        yield* Effect.yieldNow // widen the race window on purpose
        const result = yield* Effect.sync(() =>
          journal.append(head, { kind: "fill", hole: intent.hole, value: intent.value, by: name }),
        )
        if (result.ok) {
          settled = true
        } else if (result.refusal === "cas-conflict") {
          continue // rebase: reread head, retry
        } else if (result.refusal.startsWith("conflict on")) {
          // Never clobber: surface the disagreement as data.
          const current = result.state.holes[intent.hole]!
          const other = current.status === "filled" ? current.value : null
          yield* casRetry(journal, {
            kind: "dispute",
            hole: intent.hole,
            candidates: other === null ? [intent.value] : [other, intent.value],
            by: name,
          })
          settled = true
        } else {
          settled = true // hole already disputed/decided elsewhere; intent is moot
        }
      }
    }
  })

/**
 * The fence: the single decision seat, run only after every agent has
 * settled — decisions do not race evidence. Deterministic rule over the
 * order-free candidate set (smallest digest wins) so the toy's decisions
 * cannot smuggle schedule-dependence in.
 */
const fence = (journal: Journal) =>
  Effect.gen(function* () {
    const disputed = yield* Effect.sync(() =>
      Object.entries(journal.state().holes).filter(([, h]) => h.status === "disputed"),
    )
    for (const [hole, h] of disputed) {
      if (h.status !== "disputed") continue
      yield* casRetry(journal, { kind: "decide", hole, value: h.candidates[0]!, by: "fence" })
    }
  })

const casRetry = (journal: Journal, move: Move) =>
  Effect.gen(function* () {
    let done = false
    while (!done) {
      const head = yield* Effect.sync(() => journal.head())
      yield* Effect.yieldNow
      const result = yield* Effect.sync(() => journal.append(head, move))
      done = result.ok || result.refusal !== "cas-conflict"
    }
  })

// ------------------------------------------------------ one run

export type RunReport = {
  readonly schedule: string
  readonly chainHead: string
  readonly stateDigest: string
  readonly moveOrder: readonly string[]
  readonly disputes: number
  readonly decisions: number
  readonly verified: boolean
  readonly verifyFailures: readonly string[]
  readonly legibleHeads: boolean
  readonly finalState: EpistemicState
  readonly entries: readonly Entry[]
}

export const runOnce = (
  holes: readonly string[],
  agents: readonly { name: string; intents: readonly { hole: string; value: JsonValue }[] }[],
  schedule: Schedule,
  mode: "lawful" | "clobber" = "lawful",
): RunReport => {
  const journal = new Journal(holes, mode)
  const { scheduler, tasks } = makeDrivenScheduler()
  const rand = mulberry32(schedule.kind === "seeded" ? schedule.seed : 0)

  const program = Effect.gen(function* () {
    const fibers = []
    for (const a of agents) {
      // v4: Effect.fork is Effect.forkChild (internal/effect.ts:5200)
      fibers.push(yield* Effect.forkChild(agent(a.name, journal, a.intents)))
    }
    for (const f of fibers) yield* Fiber.join(f)
    yield* fence(journal)
  })

  const root = Effect.runFork(program, { scheduler })
  let steps = 0
  while (tasks.length > 0) {
    pick(tasks, schedule, rand)()
    if (++steps > 100_000) throw new Error("driver runaway: program did not quiesce")
  }
  const exit = root.pollUnsafe()
  if (exit === undefined) throw new Error("root fiber did not complete under drained queue")
  if (exit._tag === "Failure") throw new Error(`program failed: ${String(exit.cause)}`)

  // Claim 3: every intermediate head must fold to a well-formed snapshot
  // whose digest matches what the entry recorded — verify-on-read.
  const verification = verifyJournal(journal, holes)

  const scheduleName =
    schedule.kind === "seeded" ? `seeded:${schedule.seed}` : schedule.kind
  return {
    schedule: scheduleName,
    chainHead: journal.head(),
    stateDigest: journal.stateDigest(),
    moveOrder: journal.entries.map((e) => `${e.move.by}:${e.move.kind}:${e.move.hole}`),
    disputes: journal.entries.filter((e) => e.move.kind === "dispute").length,
    decisions: journal.entries.filter((e) => e.move.kind === "decide").length,
    verified: verification.ok,
    verifyFailures: verification.failures,
    legibleHeads: verification.ok,
    finalState: journal.state(),
    entries: journal.entries,
  }
}
