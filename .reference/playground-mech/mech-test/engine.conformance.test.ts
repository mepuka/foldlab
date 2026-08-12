/**
 * MODEL-BASED CONFORMANCE FOR THE REAL GUARDED ENGINE — the TS analogue of
 * what go/effector/model's trace-conformance harness does to the real Go
 * effector, closing the loop the mech-library report named as the next rung.
 *
 * The subject is `layerJournalGuarded` from packages/kernel/src/
 * engine-guarded.ts — the ACTUAL engine code, unmodified and unaware. The
 * substrate under it is swapped: a virtual clock (so the 25ms poll sleeps
 * cost nothing and no lease can lapse — EF1's stated regime), an in-memory
 * journal (the kernel's own makeMemory), and a gated in-memory effector
 * implementing exactly the single-key register semantics of SPEC §6.1 — the
 * semantics the Go lane checked over 172,214 states and then conformed
 * against real NATS. The evidence chain composes:
 *
 *   real NATS  <=(Go trace conformance)=>  §6.1 register model
 *   §6.1 register model  <=(THIS FILE)=>  real engine-guarded protocol logic
 *
 * Every effector call an engine makes parks at a gate until the explorer
 * grants it, one at a time, awaiting quiescence between grants — so the
 * interleaving of linearization points is fully driver-chosen, and the
 * explorer enumerates ALL of them (stateless exploration: each schedule is a
 * fresh run; single-frontier stretches are extended greedily so runs are
 * spent on branch points, not on corridors). Checked per complete schedule:
 *
 *   - both racing engines return the SAME value;
 *   - the effect executed exactly once (no-lapse regime);
 *   - the journal holds exactly one ActivityOutcome fact;
 *   - the committed register value decodes to a success exit of that value;
 *   - each engine's op sequence is a word in the protocol automaton that
 *     P4 Part 2 pins (lookup/claim/poll/commit/adopt) — an engine emitting
 *     an op the protocol does not allow is a divergence even if the run
 *     ends well.
 *
 * A divergence is an implementation finding or a model finding — nothing
 * here edits the engine. Coverage is stated exactly; truncated branches
 * (poll loops make the schedule tree infinite) are counted, never hidden.
 */

import { describe, expect, test } from "bun:test"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Workflow from "effect/unstable/workflow/Workflow"
import * as Activity from "effect/unstable/workflow/Activity"
import { canonicalizeJcs } from "../../kernel/src/canonical.ts"
import {
  ActivityEffector,
  EffectorError,
  type EffectorClaim,
  type EffectorService,
} from "../../kernel/src/effector-live.ts"
import { layerJournalGuarded } from "../../kernel/src/engine-guarded.ts"
import { decodeJournalExit, encodeJournalExit } from "../../kernel/src/engine.ts"
import { initialCursor } from "../../kernel/src/chain.ts"
import {
  JournalStore,
  makeMemory,
  type JournalStoreService,
} from "../../kernel/src/store.ts"

// ---------- the virtual clock: sleeps are free, leases never lapse ----------

const virtualClock = (): Clock.Clock => {
  let millis = 0
  const nextMillis = (): number => ++millis
  const nextNanos = (): bigint => BigInt(++millis) * 1_000_000n
  return {
    currentTimeMillisUnsafe: nextMillis,
    currentTimeNanosUnsafe: nextNanos,
    monotonicTimeNanosUnsafe: nextNanos,
    currentTimeMillis: Effect.sync(nextMillis),
    currentTimeNanos: Effect.sync(nextNanos),
    monotonicTimeNanos: Effect.sync(nextNanos),
    // A sleep is an async hop and nothing else: the poll loop still yields
    // (so a parked rival can be granted), but no wall time passes and no
    // lease can lapse — the register below therefore never expires a claim.
    // (effect/testing/TestClock exists at this pin and is the richer tool —
    // sleeps suspend until adjust() — but that puts "advance time" into the
    // schedule alphabet for zero gain while no lease may lapse; it becomes
    // the right tool for a future lease-lapse conformance lane.)
    sleep: (_duration: Duration.Duration) =>
      Effect.promise(() => Promise.resolve()),
  }
}

// ---------- the §6.1 register, gated ----------

type RegisterState =
  | { readonly tag: "absent" }
  | { readonly tag: "claim"; readonly fence: number; readonly owner: string }
  | { readonly tag: "done"; readonly fence: number; readonly result: string }

interface OpRecord {
  readonly engine: number
  readonly op: "lookup" | "claim" | "commit"
  readonly outcome: string
}

/** One shared register + gate; one facade per engine so ops carry identity. */
class SharedWorld {
  state: RegisterState = { tag: "absent" }
  maxFence = 0
  readonly ops: Array<OpRecord> = []
  digest: string | null = null

  private release: Array<(() => void) | null>
  private onPark: Array<(() => void) | null>

  constructor(
    readonly engines: number,
    /** Self-validation: a substrate whose mutual exclusion is broken — a
     * claim over a live claim is GRANTED at the same fence instead of
     * refused. The sweep's properties must catch this, or their silence on
     * the honest substrate is worth nothing. */
    readonly brokenMutex: boolean = false,
  ) {
    this.release = Array.from({ length: engines }, () => null)
    this.onPark = Array.from({ length: engines }, () => null)
  }

  /** Called by a facade: park until the driver grants this engine. */
  park(engine: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.release[engine] = resolve
      const signal = this.onPark[engine]
      this.onPark[engine] = null
      signal?.()
    })
  }

  parkedNow(engine: number): boolean {
    return this.release[engine] !== null
  }

  /** Resolve when the engine parks its next op or its run settles. */
  untilParkedOrSettled(
    engine: number,
    settled: Promise<unknown>,
  ): Promise<"parked" | "settled"> {
    if (this.parkedNow(engine)) return Promise.resolve("parked")
    return Promise.race([
      new Promise<"parked">((resolve) => {
        this.onPark[engine] = () => resolve("parked")
      }),
      settled.then(
        () => "settled" as const,
        () => "settled" as const,
      ),
    ])
  }

  grant(engine: number): void {
    const release = this.release[engine]
    if (release === null || release === undefined) {
      throw new Error(`grant to engine ${engine} with nothing parked`)
    }
    this.release[engine] = null
    release()
  }

  private noteDigest(digest: string): void {
    if (this.digest === null) this.digest = digest
    else if (this.digest !== digest) {
      throw new Error(
        `engines disagree on the work digest: ${this.digest} vs ${digest}`,
      )
    }
  }

  /** The EffectorService facade for one engine. Every method parks first. */
  facade(engine: number): EffectorService {
    const gated = <A, E>(body: () => Effect.Effect<A, E>): Effect.Effect<A, E> =>
      Effect.flatMap(
        Effect.promise(() => this.park(engine)),
        () => body(),
      )
    return {
      lookup: (digest) =>
        gated(() => {
          this.noteDigest(digest)
          const s = this.state
          const result =
            s.tag === "absent"
              ? { state: "unclaimed" as const, fence: 0, result: "" }
              : s.tag === "claim"
                ? { state: "held" as const, fence: s.fence, result: "" }
                : { state: "committed" as const, fence: s.fence, result: s.result }
          this.ops.push({ engine, op: "lookup", outcome: result.state })
          return Effect.succeed(result)
        }),
      claim: (digest, owner, _leaseMs) =>
        gated(() => {
          this.noteDigest(digest)
          const s = this.state
          if (s.tag === "done") {
            this.ops.push({ engine, op: "claim", outcome: "ErrCommitted" })
            return Effect.fail(
              new EffectorError({ reason: "committed", detail: digest }),
            )
          }
          if (s.tag === "claim") {
            if (this.brokenMutex) {
              this.ops.push({ engine, op: "claim", outcome: `claimed@${s.fence}` })
              const stolen: EffectorClaim = {
                digest,
                fence: s.fence,
                owner,
                expiryMs: 1e12,
              }
              return Effect.succeed(stolen)
            }
            // The virtual clock never advances, so a live claim never lapses:
            // the steal path is deliberately unreachable in this lane.
            this.ops.push({ engine, op: "claim", outcome: "ErrHeld" })
            return Effect.fail(new EffectorError({ reason: "held", detail: digest }))
          }
          const fence = this.maxFence + 1
          this.state = { tag: "claim", fence, owner }
          this.maxFence = fence
          this.ops.push({ engine, op: "claim", outcome: `claimed@${fence}` })
          const claim: EffectorClaim = { digest, fence, owner, expiryMs: 1e12 }
          return Effect.succeed(claim)
        }),
      commit: (claim, result) =>
        gated((): Effect.Effect<{ readonly first: boolean }, EffectorError> => {
          const s = this.state
          if (s.tag === "claim" && s.fence === claim.fence) {
            this.state = { tag: "done", fence: claim.fence, result }
            this.ops.push({ engine, op: "commit", outcome: "first" })
            return Effect.succeed({ first: true })
          }
          if (s.tag === "done" && s.fence === claim.fence) {
            if (s.result === result) {
              this.ops.push({ engine, op: "commit", outcome: "idempotent" })
              return Effect.succeed({ first: false })
            }
            this.ops.push({ engine, op: "commit", outcome: "ErrCommitted" })
            return Effect.fail(
              new EffectorError({ reason: "committed", detail: claim.digest }),
            )
          }
          this.ops.push({ engine, op: "commit", outcome: "ErrFenced" })
          return Effect.fail(
            new EffectorError({ reason: "fenced", detail: claim.digest }),
          )
        }),
    }
  }
}

// ---------- one run: fresh everything, driven by a grant schedule ----------

interface RunOutcome {
  /** The complete grant sequence actually driven (prefix + greedy extension). */
  readonly path: ReadonlyArray<number>
  /** Engines parked at the first branch point past the prefix; empty = ran to completion. */
  readonly frontier: ReadonlyArray<number>
  readonly truncated: boolean
  readonly results: ReadonlyArray<string>
  readonly executions: number
  readonly register: RegisterState
  readonly journalFacts: number
  readonly ops: ReadonlyArray<OpRecord>
}

const MAX_GRANTS = 18

interface RunConfig {
  readonly engines: number
  readonly precommit: string | null
  readonly brokenMutex?: boolean
}

const runSchedule = async (
  config: RunConfig,
  prefix: ReadonlyArray<number>,
): Promise<RunOutcome> => {
  const store: JournalStoreService = await Effect.runPromise(makeMemory)
  const world = new SharedWorld(config.engines, config.brokenMutex ?? false)
  if (config.precommit !== null) {
    world.state = { tag: "done", fence: 7, result: config.precommit }
    world.maxFence = 7
  }
  let executions = 0
  let stamp = 0

  const Raced = Workflow.make("Raced", {
    payload: { key: Schema.String },
    idempotencyKey: (p) => `raced-${p.key}`,
    success: Schema.String,
  })
  const racedLayer = Raced.toLayer(
    Effect.fnUntraced(function* (_payload: { readonly key: string }) {
      return yield* Activity.make({
        name: "the-effect",
        success: Schema.String,
        execute: Effect.sync(() => {
          executions += 1
          return `v${++stamp}`
        }),
      })
    }),
  )

  const clock = virtualClock()
  const engineRun = (index: number): Promise<string> => {
    const engine = layerJournalGuarded.pipe(
      Layer.provide(Layer.succeed(JournalStore)(store)),
      Layer.provide(Layer.succeed(ActivityEffector)(world.facade(index))),
    )
    const full = racedLayer.pipe(Layer.provideMerge(engine))
    return Effect.runPromise(
      (Raced.execute({ key: "k" }) as Effect.Effect<string, never, never>).pipe(
        Effect.provide(full),
        Effect.provideService(Clock.Clock, clock),
      ),
    )
  }

  const settledFlags: Array<boolean> = Array.from(
    { length: config.engines },
    () => false,
  )
  const runs = Array.from({ length: config.engines }, (_v, i) => {
    const p = engineRun(i)
    p.then(
      () => {
        settledFlags[i] = true
      },
      () => {
        settledFlags[i] = true
      },
    )
    return p
  })

  const quiesce = async (): Promise<Array<number>> => {
    const parked: Array<number> = []
    for (let i = 0; i < config.engines; i++) {
      if (settledFlags[i]) continue
      const status = await world.untilParkedOrSettled(i, runs[i]!)
      if (status === "parked") parked.push(i)
    }
    return parked
  }

  const path: Array<number> = []
  let truncated = false
  let frontier: Array<number> = []

  // Consume the prescribed prefix, then extend greedily while only one
  // engine is runnable; stop at the first genuine branch point.
  let cursor = 0
  for (;;) {
    const parked = await quiesce()
    if (parked.length === 0) break // all engines settled: complete schedule
    let choice: number
    if (cursor < prefix.length) {
      choice = prefix[cursor]!
      cursor++
      if (!parked.includes(choice)) {
        throw new Error(
          `schedule prescribed engine ${choice} but parked set is [${parked.join()}]`,
        )
      }
    } else if (parked.length === 1) {
      choice = parked[0]!
    } else {
      frontier = parked
      break
    }
    if (path.length >= MAX_GRANTS) {
      truncated = true
      frontier = []
      break
    }
    world.grant(choice)
    path.push(choice)
  }

  // Settle any still-running engines deterministically (round-robin) so no
  // fiber outlives the run — including truncated and branch-point runs.
  let spin = 0
  for (;;) {
    const parked = await quiesce()
    if (parked.length === 0) break
    const choice = parked[spin % parked.length]!
    spin++
    world.grant(choice)
    if (spin > 500) throw new Error("drain did not settle; livelock in the drain")
  }

  const results = await Promise.all(
    runs.map((p) => p.then((v) => v, (e) => `DIED: ${String(e)}`)),
  )

  // Count ActivityOutcome facts in the shared journal slot.
  const executionId = await Effect.runPromise(
    Raced.executionId({ key: "k" }) as Effect.Effect<string, never, never>,
  )
  const facts = await Effect.runPromise(
    Effect.gen(function* () {
      const handle = yield* store.open(`wf-${executionId}`)
      const page = yield* handle.read(initialCursor, 10_000)
      return page.entries.filter((entry) => {
        const fact: unknown = JSON.parse(entry.payload)
        return (
          typeof fact === "object" &&
          fact !== null &&
          (fact as { _tag?: string })._tag === "ActivityOutcome"
        )
      }).length
    }).pipe(Effect.orDie),
  )

  return {
    path,
    frontier,
    truncated,
    results,
    executions,
    register: world.state,
    journalFacts: facts,
    ops: world.ops,
  }
}

// ---------- the protocol automaton (P4 Part 2's pinned step list) ----------

/**
 * Accepts exactly the effector-op words engine-guarded.ts is specified to
 * emit for one activity. Returns null or the reason the word is illegal.
 */
const protocolIllegal = (ops: ReadonlyArray<OpRecord>): string | null => {
  type Mode = "acquire" | "run" | "await" | "settled"
  let mode: Mode = "acquire"
  for (const record of ops) {
    const at = `${record.op}:${record.outcome} in mode ${mode}`
    switch (mode) {
      case "acquire":
        if (record.op === "lookup" && record.outcome === "held") break
        if (record.op === "lookup" && record.outcome === "unclaimed") break
        if (record.op === "lookup" && record.outcome === "committed") {
          mode = "settled"
          break
        }
        if (record.op === "claim" && record.outcome.startsWith("claimed@")) {
          mode = "run"
          break
        }
        if (record.op === "claim" && record.outcome === "ErrHeld") break
        if (record.op === "claim" && record.outcome === "ErrCommitted") break
        return `unexpected ${at}`
      case "run":
        if (record.op === "commit" && record.outcome === "first") {
          mode = "settled"
          break
        }
        if (record.op === "commit" && record.outcome === "idempotent") {
          mode = "settled"
          break
        }
        if (
          record.op === "commit" &&
          (record.outcome === "ErrFenced" || record.outcome === "ErrCommitted")
        ) {
          mode = "await"
          break
        }
        return `unexpected ${at}`
      case "await":
        if (record.op === "lookup" && record.outcome === "committed") {
          mode = "settled"
          break
        }
        if (record.op === "lookup") break
        return `unexpected ${at}`
      case "settled":
        return `op after settlement: ${at}`
    }
  }
  return null
}

// ---------- the explorer ----------

interface SweepStats {
  complete: number
  truncated: number
  runs: number
  maxPathLength: number
}

const sweep = async (
  config: RunConfig,
  checkLeaf: (outcome: RunOutcome) => void,
): Promise<SweepStats> => {
  const stats: SweepStats = { complete: 0, truncated: 0, runs: 0, maxPathLength: 0 }
  const explore = async (prefix: ReadonlyArray<number>): Promise<void> => {
    const outcome = await runSchedule(config, prefix)
    stats.runs++
    if (outcome.path.length > stats.maxPathLength) {
      stats.maxPathLength = outcome.path.length
    }
    if (outcome.truncated) {
      stats.truncated++
      return
    }
    if (outcome.frontier.length === 0) {
      stats.complete++
      checkLeaf(outcome)
      return
    }
    for (const choice of outcome.frontier) {
      await explore([...outcome.path, choice])
    }
  }
  await explore([])
  return stats
}

const describeOps = (ops: ReadonlyArray<OpRecord>): string =>
  ops
    .map((o, i) => `  ${String(i + 1).padStart(2)}. E${o.engine} ${o.op} -> ${o.outcome}`)
    .join("\n")

// ---------- the laws ----------

describe("real layerJournalGuarded vs the §6.1 register model, all schedules", () => {
  test("two racing engines: agreement, exactly-once, one fact — every interleaving", async () => {
    const config: RunConfig = { engines: 2, precommit: null }
    const stats = await sweep(config, (leaf) => {
      const blame = () =>
        `schedule [${leaf.path.join(",")}]\n${describeOps(leaf.ops)}`
      // Agreement: both engines returned the same value.
      expect(leaf.results[0], blame()).toBe(leaf.results[1]!)
      expect(leaf.results[0]!.startsWith("DIED"), blame()).toBe(false)
      // Exactly-once in the no-lapse regime.
      expect(leaf.executions, blame()).toBe(1)
      // One journal fact for the one activity.
      expect(leaf.journalFacts, blame()).toBe(1)
      // The register is terminal at fence 1 (no lapse => no steal => no f=2),
      // and its value decodes to a success exit of the agreed value.
      expect(leaf.register.tag, blame()).toBe("done")
      const done = leaf.register as Extract<RegisterState, { tag: "done" }>
      expect(done.fence, blame()).toBe(1)
      const exit = decodeJournalExit(JSON.parse(done.result))
      expect(Exit.isSuccess(exit), blame()).toBe(true)
      expect((exit as Extract<typeof exit, { _tag: "Success" }>).value, blame()).toBe(
        leaf.results[0]!,
      )
      // Per-engine op words are in the protocol language.
      for (let e = 0; e < config.engines; e++) {
        const word = leaf.ops.filter((o) => o.engine === e)
        const illegal = protocolIllegal(word)
        if (illegal !== null) {
          throw new Error(`engine ${e} left the protocol: ${illegal}\n${blame()}`)
        }
      }
    })
    console.log(
      `conformance sweep: ${stats.complete} complete schedules, ${stats.truncated} truncated at ${MAX_GRANTS} grants, ${stats.runs} runs, longest path ${stats.maxPathLength}`,
    )
    expect(stats.complete).toBeGreaterThan(20)
    // Truncation is a stated coverage hole (infinite poll tails), not a pass.
    expect(stats.truncated).toBeLessThan(stats.complete)
  }, 120_000)

  test("a pre-committed foreign outcome is adopted by ALL engines, zero executions", async () => {
    const foreign = canonicalizeJcs(encodeJournalExit(Exit.succeed("foreign-value")))
    const config: RunConfig = { engines: 2, precommit: foreign }
    const stats = await sweep(config, (leaf) => {
      const blame = () =>
        `schedule [${leaf.path.join(",")}]\n${describeOps(leaf.ops)}`
      expect(leaf.executions, blame()).toBe(0)
      for (const r of leaf.results) expect(r, blame()).toBe("foreign-value")
      expect(leaf.journalFacts, blame()).toBe(1)
      expect(leaf.register.tag, blame()).toBe("done")
      expect((leaf.register as { fence?: number }).fence, blame()).toBe(7)
    })
    console.log(
      `foreign-outcome sweep: ${stats.complete} complete schedules, ${stats.truncated} truncated`,
    )
    expect(stats.complete).toBeGreaterThan(0)
    expect(stats.truncated).toBe(0)
  }, 60_000)

  test("self-validation: a substrate with broken mutual exclusion is caught", async () => {
    // The engine code is honest; the REGISTER is sabotaged (a live claim is
    // granted again at the same fence). Some schedule must now run the
    // effect twice or break agreement, and the sweep must say so.
    const config: RunConfig = { engines: 2, precommit: null, brokenMutex: true }
    let caught: unknown = null
    try {
      await sweep(config, (leaf) => {
        if (leaf.executions !== 1) {
          throw new Error(
            `broken mutex escaped: executions=${leaf.executions} on [${leaf.path.join(",")}]`,
          )
        }
        if (leaf.results[0] !== leaf.results[1]) {
          throw new Error(`broken mutex escaped: disagreement on [${leaf.path.join(",")}]`)
        }
      })
    } catch (error) {
      caught = error
    }
    expect(caught).not.toBeNull()
    expect(String(caught)).toContain("broken mutex escaped")
    console.log(`sabotaged substrate caught: ${String(caught).split("\n")[0]}`)
  }, 60_000)

  test("the harness is deterministic: one schedule, three runs, identical op logs", async () => {
    const config: RunConfig = { engines: 2, precommit: null }
    const first = await runSchedule(config, [])
    for (let i = 0; i < 2; i++) {
      const again = await runSchedule(config, [])
      expect(again.path).toEqual(first.path)
      expect(again.ops).toEqual(first.ops)
      expect(again.results).toEqual(first.results)
      expect(again.register).toEqual(first.register)
    }
  }, 30_000)
})
