/**
 * The guarded activity protocol (P4 Part 2), model-checked at the layer
 * where it is actually written.
 *
 * engine-guarded.ts runs a pinned protocol per activity: replay/memo first,
 * then lookup → adopt | claim → run the effect → commit → journal, with
 * losers polling until they can adopt. The TS law suite (EF1–EF3) checks it
 * end-to-end against the live sidecar — a handful of real schedules. This
 * demo checks the PROTOCOL SHAPE against every schedule the model can
 * produce: two engines written as generator code racing one activity over a
 * single-key effector and a create-only journal slot.
 *
 * What it establishes (and no more): the client-side protocol logic has no
 * interleaving, within these bounds, in which two engines journal different
 * results, execute the effect twice without a lease lapse, or return a value
 * that differs from the journaled fact. Lease expiry is deliberately absent:
 * with it, at-least-once execution is the honest contract (EL6); without it,
 * exactly-once execution is provable, and that is precisely EF1's premise
 * ("30s leases, instant effects").
 */

import { describe, expect, test } from "bun:test"
import {
  atomic,
  explore,
  formatViolation,
  observe,
  type Scenario,
  type Worker,
} from "../src/scenario.ts"

// ---------- the world ----------

interface Done {
  readonly fence: number
  readonly result: string
}

interface World {
  /** Single-key authority register (ratified protocol, no expiry). */
  readonly work:
    | { readonly tag: "absent" }
    | { readonly tag: "claim"; readonly fence: number; readonly owner: string }
    | { readonly tag: "done"; readonly done: Done }
  /** The journal slot for this activity: create-only, first writer wins. */
  readonly journal: string | null
  /** Total effect executions across all engines — the EF1 counter. */
  readonly executions: number
  /** What each completed engine returned to its workflow. */
  readonly returns: ReadonlyArray<{ readonly engine: string; readonly value: string }>
  /** Engines that exhausted their poll budget (a schedule artifact, counted). */
  readonly gaveUp: number
}

const initialWorld: World = {
  work: { tag: "absent" },
  journal: null,
  executions: 0,
  returns: [],
  gaveUp: 0,
}

const POLL_BUDGET = 4

// ---------- the engine, written the way engine-guarded.ts is written ----------

const engine = (name: string): Worker<World> => ({
  name,
  body: function* () {
    // 1. lookup — adopt if the work is already committed (protocol step 3).
    const seen = yield* observe(`lookup`, (w: World) => w.work)
    if (seen.tag === "done") {
      yield* adoptAndReturn(name, seen.done.result)
      return
    }

    // 2. claim (protocol step 4) — atomically: done ⇒ adopt; live ⇒ held.
    type ClaimResult =
      | { readonly kind: "committed"; readonly done: Done }
      | { readonly kind: "held" }
      | { readonly kind: "claimed"; readonly fence: number }
    const claim = yield* atomic(
      `claim`,
      (w: World): readonly [World, ClaimResult] => {
        if (w.work.tag === "done") return [w, { kind: "committed", done: w.work.done }]
        if (w.work.tag === "claim") return [w, { kind: "held" }]
        const fence = 1
        return [{ ...w, work: { tag: "claim", fence, owner: name } }, { kind: "claimed", fence }]
      },
    )

    if (claim.kind === "committed") {
      yield* adoptAndReturn(name, claim.done.result)
      return
    }

    if (claim.kind === "held") {
      // Loser path: poll until the winner commits (protocol step 4's loop),
      // bounded so the schedule space stays finite. Exhaustion is recorded,
      // never hidden.
      for (let round = 0; round < POLL_BUDGET; round++) {
        const now = yield* observe(`poll#${round + 1}`, (w: World) => w.work)
        if (now.tag === "done") {
          yield* adoptAndReturn(name, now.done.result)
          return
        }
      }
      yield* atomic(`give-up`, (w: World) => [{ ...w, gaveUp: w.gaveUp + 1 }, null] as const)
      return
    }

    // 3. winner path: run the effect (protocol step 5). The result is
    // engine-unique on purpose — if two engines both executed, the journal
    // would betray it.
    const result = yield* atomic(`run-effect`, (w: World) => {
      const value = `result-of-${name}`
      return [{ ...w, executions: w.executions + 1 }, value] as const
    })

    // 4. commit under the claim's fence — CAS on the same register.
    const committed = yield* atomic(`commit`, (w: World) => {
      if (w.work.tag !== "claim" || w.work.fence !== claim.fence) {
        // Superseded: adopt whatever won (protocol step 5's fenced branch).
        return [w, w.work.tag === "done" ? w.work.done.result : null] as const
      }
      const next: World = { ...w, work: { tag: "done", done: { fence: claim.fence, result } } }
      return [next, result] as const
    })
    if (committed === null) return
    yield* adoptAndReturn(name, committed)
  },
})

/** Journal the outcome (create-only: the first fact is authoritative — the
 * P2b retry rule) and return the AUTHORITATIVE value, not the local one. */
function* adoptAndReturn(name: string, result: string) {
  yield* atomic(`journal+return`, (w: World) => {
    const authoritative = w.journal ?? result
    const next: World = {
      ...w,
      journal: authoritative,
      returns: [...w.returns, { engine: name, value: authoritative }],
    }
    return [next, authoritative] as const
  })
}

// ---------- the properties (EF1's clauses, one per line) ----------

const invariant = (w: World): string | null => {
  if (w.executions > 1) {
    return `the effect executed ${w.executions} times with no lease lapse in the model`
  }
  for (const r of w.returns) {
    if (w.journal !== null && r.value !== w.journal) {
      return `${r.engine} returned ${JSON.stringify(r.value)} but the journal holds ${JSON.stringify(w.journal)}`
    }
  }
  return null
}

describe("the guarded activity protocol, over every schedule", () => {
  test("two racing engines: exactly-once effect, one journal fact, agreement", () => {
    const scenario: Scenario<World> = {
      initial: initialWorld,
      workers: [engine("engine-1"), engine("engine-2")],
      invariant,
      atEnd: (w) => {
        if (w.gaveUp === 0 && w.returns.length !== 2) {
          return `only ${w.returns.length} engines returned on a schedule where none gave up`
        }
        if (w.returns.length > 0 && w.journal === null) {
          return "an engine returned before any fact was journaled"
        }
        if (w.returns.length === 2 && w.executions !== 1) {
          return `both engines returned but the effect ran ${w.executions} times`
        }
        return null
      },
    }
    const report = explore(scenario)
    if (report.violation !== null) {
      throw new Error(formatViolation(report.violation))
    }
    expect(report.truncated).toBe(0)
    expect(report.completed).toBeGreaterThan(50)
    console.log(
      `guarded protocol: ${report.completed} complete schedules, ${report.steps} distinct steps, no violation`,
    )
  })

  test("a foreign outcome is adopted, never re-executed (EF3's shape)", () => {
    const preCommitted: World = {
      ...initialWorld,
      work: { tag: "done", done: { fence: 7, result: "foreign-result" } },
    }
    const scenario: Scenario<World> = {
      initial: preCommitted,
      workers: [engine("engine-1"), engine("engine-2")],
      invariant: (w) => {
        if (w.executions !== 0) return "the effect executed over a committed outcome"
        return invariant(w)
      },
      atEnd: (w) =>
        w.returns.length === 2 &&
        w.returns.every((r) => r.value === "foreign-result")
          ? null
          : `adoption failed: ${JSON.stringify(w.returns)}`,
    }
    const report = explore(scenario)
    if (report.violation !== null) {
      throw new Error(formatViolation(report.violation))
    }
    expect(report.truncated).toBe(0)
    console.log(`foreign-outcome adoption: ${report.completed} schedules, zero executions`)
  })

  test("self-validation: an engine that adopts its OWN value is caught", () => {
    // The protocol's subtlest clause is adoption: a loser takes the
    // AUTHORITATIVE value, not its own. Sabotage one engine so that when it
    // finds the work already committed, it journals a fabrication of its own
    // instead of the committed result — a one-line corruption of protocol
    // step 3. The explorer must find a schedule where somebody already
    // returned the honest value and the fabrication contradicts them.
    const sabotaged = (name: string): Worker<World> => ({
      name,
      body: function* () {
        const seen = yield* observe(`lookup`, (w: World) => w.work)
        if (seen.tag !== "done") return
        // BUG: "adopts" its own local invention, blind-overwriting the slot.
        yield* atomic(`journal-blind`, (w: World) => {
          const fabricated = `result-of-${name}`
          const next: World = {
            ...w,
            journal: fabricated,
            returns: [...w.returns, { engine: name, value: fabricated }],
          }
          return [next, fabricated] as const
        })
      },
    })
    const report = explore({
      initial: initialWorld,
      workers: [engine("engine-1"), sabotaged("evil-2")],
      invariant,
    })
    expect(report.violation).not.toBeNull()
    const v = report.violation!
    expect(v.detail).toContain("returned")
    console.log(`sabotaged engine caught:\n${formatViolation(v)}`)
  })
})
