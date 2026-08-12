/**
 * THE DEMO: the two-key refutation, rediscovered from code you can read.
 *
 * The formal audit refuted P4's original wire protocol with a hand-rolled
 * state enumerator (CEX-3, SPEC amendment A6). The Go model gate made that
 * search standing infrastructure. This file makes it LEGIBLE: the same bug,
 * found by exhaustive schedule exploration over workers written the way a
 * client would actually write them — claim, read the fence, write the
 * outcome — with the store as plain data and every round-trip an explicit
 * atomic step.
 *
 * Two workers, ~30 lines each. The ONLY difference between the refuted
 * protocol and the ratified one is the final write:
 *
 *   two-key    : create the outcome on a SEPARATE register (no binding to
 *                the fence read that justified it)
 *   single-key : compare-and-swap the SAME register at the revision the
 *                fence read observed
 *
 * The explorer finds the two-key violation in the first schedules it tries
 * and prints the interleaving; the single-key worker survives every
 * schedule. That pair of results — same worker shape, one changed write,
 * checked over identical schedule spaces — is the whole A6 story.
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

// ---------- the store, as plain data ----------

interface ClaimValue {
  readonly tag: "claim"
  readonly fence: number
  readonly owner: string
}
interface DoneValue {
  readonly tag: "done"
  readonly fence: number
  readonly result: string
}

interface Store {
  /** The authority register: revision-counted, CAS-able. */
  readonly work: { readonly rev: number; readonly value: ClaimValue | DoneValue | null }
  /** The two-key protocol's SEPARATE outcome register (create-only). */
  readonly outcome: DoneValue | null
  /** The greatest claim generation ever issued — the fencing yardstick. */
  readonly maxFence: number
  /**
   * Every successful outcome write, in linearization order, each stamped
   * with the max generation AT THE MOMENT IT LANDED. Fencing safety is a
   * property of the write itself — a commit legal when it linearized does
   * not become retroactively illegal because a later claim raised the bar.
   * (The first draft of this demo got that wrong and the explorer "refuted"
   * a legal schedule; the Go gate checks the transition, not the state, for
   * exactly this reason.)
   */
  readonly commits: ReadonlyArray<{
    readonly fence: number
    readonly by: string
    readonly maxAtCommit: number
  }>
}

const emptyStore: Store = {
  work: { rev: 0, value: null },
  outcome: null,
  maxFence: 0,
  commits: [],
}

// ---------- shared worker steps (identical in both protocols) ----------

/**
 * Take the claim. This demo lets a claim be taken over a live one — the
 * adversarial steal the Go gate also uses, because fencing safety must not
 * depend on the clock. A real client waits for the lease to lapse first;
 * nothing below changes if it does.
 */
function* takeClaim(name: string) {
  return yield* atomic(`claim`, (s: Store) => {
    const current = s.work.value
    if (current?.tag === "done") return [s, null] as const
    const fence = (current?.fence ?? 0) + 1
    const next: Store = {
      ...s,
      work: { rev: s.work.rev + 1, value: { tag: "claim", fence, owner: name } },
      maxFence: fence,
    }
    return [next, { fence, rev: next.work.rev }] as const
  })
}

/** Commit's first half: read the authority register — fence AND revision. */
function* readFence() {
  return yield* observe(`read-fence`, (s: Store) => ({
    rev: s.work.rev,
    value: s.work.value,
  }))
}

// ---------- the two protocols' second halves ----------

/**
 * THE WITHDRAWN PROTOCOL. The fence was validated against `work`; the write
 * goes to `outcome`. Nothing binds the write to the validation — a rival can
 * linearize a new generation between the two lines of this worker, and the
 * create still succeeds.
 */
const twoKeyWorker = (name: string): Worker<Store> => ({
  name,
  body: function* () {
    const claim = yield* takeClaim(name)
    if (claim === null) return
    const snap = yield* readFence()
    if (snap.value?.tag !== "claim" || snap.value.fence !== claim.fence) return
    yield* atomic(`create-outcome`, (s: Store) => {
      if (s.outcome !== null) return [s, "already-committed"] as const
      const next: Store = {
        ...s,
        outcome: { tag: "done", fence: claim.fence, result: name },
        commits: [...s.commits, { fence: claim.fence, by: name, maxAtCommit: s.maxFence }],
      }
      return [next, "first"] as const
    })
  },
})

/**
 * THE RATIFIED PROTOCOL (SPEC §6.1 as amended). Same worker, same fence
 * read — but the write is a CAS on the SAME register at the revision the
 * read observed. A rival's steal bumped the revision, so the stale write
 * cannot land: validation and mutation share one linearization point.
 */
const singleKeyWorker = (name: string): Worker<Store> => ({
  name,
  body: function* () {
    const claim = yield* takeClaim(name)
    if (claim === null) return
    const snap = yield* readFence()
    if (snap.value?.tag !== "claim" || snap.value.fence !== claim.fence) return
    yield* atomic(`cas-outcome`, (s: Store) => {
      if (s.work.rev !== snap.rev) return [s, "fenced"] as const
      const next: Store = {
        ...s,
        work: {
          rev: s.work.rev + 1,
          value: { tag: "done", fence: claim.fence, result: name },
        },
        commits: [...s.commits, { fence: claim.fence, by: name, maxAtCommit: s.maxFence }],
      }
      return [next, "first"] as const
    })
  },
})

// ---------- the property: SPEC §6.3, as one sentence of code ----------

/** No commit may ever land carrying a fence below the max issued generation. */
const fencingSafety = (s: Store): string | null => {
  for (const c of s.commits) {
    if (c.fence !== c.maxAtCommit) {
      return `${c.by} committed at fence ${c.fence} while generation ${c.maxAtCommit} had already linearized`
    }
  }
  return null
}

const scenarioFor = (make: (name: string) => Worker<Store>): Scenario<Store> => ({
  initial: emptyStore,
  workers: [make("alice"), make("bob")],
  invariant: fencingSafety,
})

// ---------- the verdicts ----------

describe("the A6 story, told by the schedule explorer", () => {
  test("two-key: the explorer rediscovers CEX-3 from readable worker code", () => {
    const report = explore(scenarioFor(twoKeyWorker))
    expect(report.violation).not.toBeNull()
    const v = report.violation!
    expect(v.detail).toContain("committed at fence 1 while generation 2")
    // The schedule is the CEX-3 shape: claim, read, rival steal, stale write.
    const labels = v.schedule.map((st) => `${st.worker}:${st.label}`)
    expect(labels).toEqual([
      "alice:claim",
      "alice:read-fence",
      "bob:claim",
      "alice:create-outcome",
    ])
    console.log(`two-key protocol refuted:\n${formatViolation(v)}`)
  })

  test("single-key: the CAS repair survives every schedule", () => {
    const report = explore(scenarioFor(singleKeyWorker))
    expect(report.violation).toBeNull()
    expect(report.truncated).toBe(0)
    // Both workers always terminate, so the schedule space is finite and
    // fully explored; say how big it was, because a coverage claim without a
    // number is not a claim.
    expect(report.completed).toBeGreaterThan(10)
    console.log(
      `single-key protocol: ${report.completed} complete schedules, ${report.steps} distinct steps, no violation`,
    )
  })

  test("single-key with three workers: still clean, larger schedule space", () => {
    const scenario: Scenario<Store> = {
      initial: emptyStore,
      workers: [singleKeyWorker("alice"), singleKeyWorker("bob"), singleKeyWorker("carol")],
      invariant: fencingSafety,
      atEnd: (s) => {
        // At quiescence exactly one terminal outcome exists and it carries
        // the maximal generation ever issued.
        const value = s.work.value
        if (value?.tag !== "done") return null
        return value.fence === s.maxFence
          ? null
          : `terminal outcome at fence ${value.fence}, max generation ${s.maxFence}`
      },
    }
    const report = explore(scenario)
    expect(report.violation).toBeNull()
    expect(report.truncated).toBe(0)
    console.log(
      `three single-key workers: ${report.completed} complete schedules, no violation`,
    )
  })

  test("self-validation: a sabotaged invariant is caught (the explorer can fail)", () => {
    // Same clean single-key scenario, but the property is corrupted to
    // demand the impossible: no commits at all. If the explorer cannot
    // report THIS, its silence on the real property is worth nothing.
    const report = explore({
      initial: emptyStore,
      workers: [singleKeyWorker("alice"), singleKeyWorker("bob")],
      invariant: (s: Store) => (s.commits.length === 0 ? null : "a commit happened"),
    })
    expect(report.violation).not.toBeNull()
  })
})
