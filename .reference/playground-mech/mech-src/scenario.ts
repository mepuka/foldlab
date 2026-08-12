/**
 * The Scenario layer: model checking for code you can read.
 *
 * The System layer (system.ts) wants an explicit state machine — maximally
 * checkable, but you have to TRANSLATE your algorithm into it, and the
 * translation is where bugs hide. This layer removes the translation: you
 * write each concurrent worker as a generator function that looks like the
 * production code it models — sequential logic, local variables, early
 * returns — yielding at exactly the points where it touches shared state.
 * The explorer then runs EVERY interleaving of those yield points, checks an
 * invariant after every atomic step, and reports the first failing schedule
 * in deterministic order.
 *
 * The yields are the whole discipline. A `yield* atomic(...)` is one
 * linearization point — one store round-trip. Code between yields is
 * process-local and invisible to other workers, exactly like code between
 * store calls in a real client. If your worker reads a register in one
 * atomic op and writes it in another, the explorer WILL schedule a rival
 * between them; whether that matters is precisely what gets checked. The
 * two-key effector protocol died of that gap (SPEC §6 amendment A6); the
 * demo suite rediscovers its counterexample from worker code written this
 * way, then shows the single-key CAS repair surviving the same schedules.
 *
 * Determinism contract: worker bodies must be pure functions of their op
 * results — no Date, no Math.random, no ambient reads. Ops must not mutate
 * the shared state they are handed; they return the successor. The explorer
 * replays prefixes from scratch (generators cannot be forked), so impurity
 * would not just perturb results, it would make them unreproducible.
 */

// ---------- the op / worker vocabulary ----------

export interface AtomicOp<S> {
  readonly label: string
  readonly run: (shared: S) => readonly [S, unknown]
}

export type WorkerBody<S> = Generator<AtomicOp<S>, void, unknown>

export interface Worker<S> {
  readonly name: string
  readonly body: () => WorkerBody<S>
}

/**
 * One atomic step against the shared state: the yield point IS the
 * linearization point. Returns the op's result to the worker body.
 */
export function* atomic<S, R>(
  label: string,
  run: (shared: S) => readonly [S, R],
): Generator<AtomicOp<S>, R, unknown> {
  const result = yield { label, run: run as (shared: S) => readonly [S, unknown] }
  return result as R
}

/** A read-only atomic step. */
export function* observe<S, R>(
  label: string,
  read: (shared: S) => R,
): Generator<AtomicOp<S>, R, unknown> {
  return yield* atomic<S, R>(label, (shared) => [shared, read(shared)])
}

// ---------- exploration ----------

export interface ScheduleStep {
  readonly worker: string
  readonly label: string
  readonly result: unknown
}

export interface ScenarioViolation {
  readonly detail: string
  /** The failing schedule, one line per atomic step, in execution order. */
  readonly schedule: ReadonlyArray<ScheduleStep>
  /** True when the violation came from the end-of-schedule check. */
  readonly atEnd: boolean
}

export interface ScenarioReport {
  /** Schedules on which every worker ran to completion. */
  readonly completed: number
  /** Schedules cut off by `maxSteps` — coverage holes, never hidden. */
  readonly truncated: number
  /**
   * Distinct scheduled steps explored (tree nodes). Shared prefixes are
   * counted once; replay overhead is not counted.
   */
  readonly steps: number
  readonly violation: ScenarioViolation | null
}

export interface Scenario<S> {
  readonly initial: S
  readonly workers: ReadonlyArray<Worker<S>>
  /** Checked after EVERY atomic step. Return null when the state is legal. */
  readonly invariant?: (shared: S) => string | null
  /** Checked once per completed schedule. */
  readonly atEnd?: (shared: S) => string | null
  /**
   * Hard bound on schedule length, for workers with retry loops. A scenario
   * whose workers all terminate never needs it; when it triggers, the
   * truncated count says so out loud.
   */
  readonly maxSteps?: number
}

interface Replayed<S> {
  readonly shared: S
  /** Pending op per worker; null = worker finished. */
  readonly pending: ReadonlyArray<AtomicOp<S> | null>
  readonly log: ReadonlyArray<ScheduleStep>
  readonly invariantFailure: string | null
}

/**
 * Re-run all worker bodies from scratch, feeding the scheduled choices in
 * order. Generators cannot be forked, so branch exploration replays the
 * prefix — O(schedules × depth), the honest price of letting workers be
 * ordinary code.
 */
const replay = <S>(scenario: Scenario<S>, choices: ReadonlyArray<number>): Replayed<S> => {
  const gens = scenario.workers.map((w) => w.body())
  const pending: Array<AtomicOp<S> | null> = gens.map((g) => {
    const first = g.next()
    return first.done === true ? null : first.value
  })
  let shared = scenario.initial
  const log: Array<ScheduleStep> = []
  for (const who of choices) {
    const op = pending[who]
    if (op === null || op === undefined) {
      throw new Error(`schedule chose finished worker #${who} — explorer bug`)
    }
    const [nextShared, result] = op.run(shared)
    shared = nextShared
    log.push({ worker: scenario.workers[who]!.name, label: op.label, result })
    const inv = scenario.invariant?.(shared) ?? null
    if (inv !== null) {
      return { shared, pending, log, invariantFailure: inv }
    }
    const next = gens[who]!.next(result)
    pending[who] = next.done === true ? null : next.value
  }
  return { shared, pending, log, invariantFailure: null }
}

const formatSchedule = (log: ReadonlyArray<ScheduleStep>): string =>
  log
    .map(
      (st, i) =>
        `  ${String(i + 1).padStart(2)}. ${st.worker.padEnd(8)} ${st.label.padEnd(24)} -> ${JSON.stringify(st.result)}`,
    )
    .join("\n")

/**
 * Explore every schedule of the scenario, depth-first in worker-index order
 * (deterministic; the reported violation is the first in that order). The
 * invariant is checked after every step, the end condition after every
 * completed schedule.
 */
export const explore = <S>(scenario: Scenario<S>): ScenarioReport => {
  const maxSteps = scenario.maxSteps ?? 10_000
  let completed = 0
  let truncated = 0
  let steps = 0
  let violation: ScenarioViolation | null = null

  const walk = (choices: Array<number>): void => {
    if (violation !== null) return
    const state = replay(scenario, choices)
    steps += choices.length > 0 ? 1 : 0
    if (state.invariantFailure !== null) {
      violation = {
        detail: state.invariantFailure,
        schedule: state.log,
        atEnd: false,
      }
      return
    }
    const runnable: Array<number> = []
    for (let i = 0; i < state.pending.length; i++) {
      if (state.pending[i] !== null) runnable.push(i)
    }
    if (runnable.length === 0) {
      completed++
      const end = scenario.atEnd?.(state.shared) ?? null
      if (end !== null) {
        violation = { detail: end, schedule: state.log, atEnd: true }
      }
      return
    }
    if (choices.length >= maxSteps) {
      truncated++
      return
    }
    for (const who of runnable) {
      choices.push(who)
      walk(choices)
      choices.pop()
      if (violation !== null) return
    }
  }
  walk([])
  return { completed, truncated, steps, violation }
}

/** Render a violation for assertion messages and demo output. */
export const formatViolation = (v: ScenarioViolation): string =>
  `${v.atEnd ? "at end of schedule" : "mid-schedule"}: ${v.detail}\n${formatSchedule(v.schedule)}`

// ---------- observational equivalence ----------

export interface Behavior {
  /** One line per step: "worker:label=result". */
  readonly steps: ReadonlyArray<string>
  /** Caller-serialized final shared state. */
  readonly final: string
}

/**
 * The complete behavior set of a scenario: every schedule, in deterministic
 * DFS order, with its full step log and serialized final state. Two
 * scenarios are OBSERVATIONALLY EQUIVALENT (relative to this environment and
 * these bounds) iff their behavior sets are structurally equal — the
 * equivalence the proc.ts monad laws are checked against. Truncated
 * schedules are recorded as behaviors ending in "TRUNCATED", so a bound can
 * never silently equate two scenarios it actually cut short.
 */
export const behaviors = <S>(
  scenario: Scenario<S>,
  serialize: (shared: S) => string,
): ReadonlyArray<Behavior> => {
  const maxSteps = scenario.maxSteps ?? 10_000
  const out: Array<Behavior> = []

  const walk = (choices: Array<number>): void => {
    const state = replay(scenario, choices)
    const runnable: Array<number> = []
    for (let i = 0; i < state.pending.length; i++) {
      if (state.pending[i] !== null) runnable.push(i)
    }
    const steps = state.log.map(
      (st) => `${st.worker}:${st.label}=${JSON.stringify(st.result)}`,
    )
    if (runnable.length === 0) {
      out.push({ steps, final: serialize(state.shared) })
      return
    }
    if (choices.length >= maxSteps) {
      out.push({ steps: [...steps, "TRUNCATED"], final: serialize(state.shared) })
      return
    }
    for (const who of runnable) {
      choices.push(who)
      walk(choices)
      choices.pop()
    }
  }
  walk([])
  return out
}
