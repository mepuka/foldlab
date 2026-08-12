/**
 * Core self-validation for the checker itself. The wall test proves the
 * checker agrees with an independent implementation on a large system; this
 * file pins the primitives (known FNV-1a vectors) and the Effect surface,
 * and proves on a toy system that the checker CAN fail — a checker whose
 * green has never been red proves nothing by being green.
 */

import { describe, expect, test } from "bun:test"
import * as Effect from "effect/Effect"
import {
  check,
  checkEffect,
  enumeratePaths,
  fnv1a64,
  formatFingerprint,
  type Invariant,
  type System,
} from "../src/system.ts"
import { defaultInvariants, effectorSystem, gateConfig } from "../src/effector.ts"

describe("primitives", () => {
  test("fnv1a64 matches the published test vectors", () => {
    // Offset basis (empty input) and the standard "a" vector.
    expect(fnv1a64("")).toBe(0xcbf29ce484222325n)
    expect(fnv1a64("a")).toBe(0xaf63dc4c8601ec8cn)
    expect(formatFingerprint(0xcbf29ce484222325n)).toBe("cbf29ce484222325")
  })
})

// A toy: a counter that two incrementers push toward 3, with a deliberately
// checkable ceiling.
const counterSystem = (buggy: boolean): System<number, string, number> => ({
  init: 0,
  actions: (n) => (n < 3 ? ["inc-a", "inc-b"] : []),
  step: (n, a) => [n + (buggy && a === "inc-b" ? 2 : 1), n],
  encode: (n) => String.fromCharCode(n),
  describeAction: (a) => a,
  describeState: (n) => `n=${n}`,
  describeLabel: (l) => `${l}`,
})

const ceiling: Invariant<number, string, number> = {
  name: "counter never exceeds 3",
  violated: (_pre, _a, _l, post) => (post <= 3 ? null : `counter reached ${post}`),
}

describe("the checker can fail, and fails minimally", () => {
  test("clean system: closure, 4 states", () => {
    const report = check(counterSystem(false), 0, [ceiling])
    expect(report.violation).toBeNull()
    expect(report.states).toBe(4)
  })

  test("buggy system: minimal counterexample found", () => {
    const report = check(counterSystem(true), 0, [ceiling])
    expect(report.violation).not.toBeNull()
    // BFS minimality: the shortest route to >3 is inc-b (0→2), inc-b (2→4).
    expect(report.violation!.trace.map((st) => st.action)).toEqual(["inc-b", "inc-b"])
  })

  test("path enumeration is exhaustive and reports caps honestly", () => {
    const all = enumeratePaths(counterSystem(false), 3, 0, null)
    expect(all.capped).toBe(false)
    expect(all.paths.length).toBe(8) // 2^3 schedules of length 3
    const capped = enumeratePaths(counterSystem(false), 3, 3, null)
    expect(capped.capped).toBe(true)
    expect(capped.paths.length).toBe(3)
  })
})

describe("the Effect surface", () => {
  test("checkEffect fails with a typed MechViolation carrying the trace", () => {
    const config = gateConfig("two-key")
    const sys = effectorSystem(config, 12)
    const error = Effect.runSync(
      Effect.flip(checkEffect(sys, 12, defaultInvariants(config))),
    )
    expect(error._tag).toBe("MechViolation")
    expect(error.invariant).toBe("fencing safety (SPEC 6.3)")
    expect(error.trace).toContain("finish(A)")
    expect(error.states).toBe(265)
  })

  test("checkEffect succeeds with the report on a clean system", () => {
    const report = Effect.runSync(checkEffect(counterSystem(false), 0, [ceiling]))
    expect(report.states).toBe(4)
  })
})
