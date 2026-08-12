/**
 * The cross-language wall.
 *
 * `go/effector/model` and `packages/mech/src/effector.ts` are two independent
 * implementations of the same abstract protocol, in two languages, sharing
 * nothing but a written semantics and a byte-level encoding convention. The
 * constants below are PINNED from the Go checker's recorded runs
 * (docs/research/effector-model-gate.md; go test -v ./effector/model/). If
 * this suite is green, both implementations agree on every reachable state's
 * canonical bytes — a one-bit semantic divergence anywhere in 172,214 states
 * moves the summed FNV-1a fingerprint.
 *
 * These are fixtures in the P2a tradition: generated once from the Go side,
 * then frozen. Regenerating them requires a stated reason in the attempts
 * log — if this test fails, the DEFAULT reading is that one port drifted,
 * and which one is a finding to investigate, not a constant to update.
 */

import { describe, expect, test } from "bun:test"
import {
  defaultInvariants,
  describeAction,
  describeOutcome,
  effectorSystem,
  gateConfig,
  type ModelConfig,
} from "../src/effector.ts"
import { check, enumeratePaths, formatFingerprint, formatTrace } from "../src/system.ts"

const GATE_DEPTH = 12

// Pinned from the Go gate (model_test.go output, recorded 2026-08-11):
const GO = {
  singleKeyDepth12: {
    states: 172214,
    transitions: 708876,
    maxDepth: 12,
    fingerprint: "5cb6d2203cb19cce",
  },
  singleKeyTwoOwners: {
    states: 4612,
    transitions: 15170,
    fingerprint: "91ac83b6a0eea571",
  },
  singleKeyLeaseGated: {
    states: 13133,
    transitions: 55542,
    fingerprint: "a275416d936c396a",
  },
  singleKeyClosure: [
    { maxFence: 2, states: 584, transitions: 2436, fingerprint: "eb2cea9db6b2ad30" },
    { maxFence: 3, states: 2312, transitions: 11610, fingerprint: "813d304ac616be98" },
    { maxFence: 4, states: 6848, transitions: 37332, fingerprint: "d8f80ef5ae39eb90" },
  ],
  twoKeyViolation: {
    states: 265,
    transitions: 443,
    fingerprint: "c07c50b821dc2d9c",
    trace: ["claim(A)", "begin(A)", "claim(B)", "finish(A)"],
    lastOutcome: "first@f1",
  },
  twoKeySingleOwner: {
    states: 20,
    transitions: 25,
    fingerprint: "7515a3e540b66277",
    trace: ["claim(A)", "begin(A)", "claim(A)", "finish(A)"],
  },
  twoKeyUniqueOutcomeOnly: {
    states: 235184,
    transitions: 968562,
    fingerprint: "cddfc5667843e2de",
  },
  pathCensus: { depth: 5, ownersNoCrash: 1422 },
} as const

describe("the cross-language wall: TS checker vs pinned Go numbers", () => {
  test("single-key gate model at depth 12 matches Go exactly", () => {
    const config = gateConfig("single-key")
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, defaultInvariants(config))
    expect(report.violation).toBeNull()
    expect(report.states).toBe(GO.singleKeyDepth12.states)
    expect(report.transitions).toBe(GO.singleKeyDepth12.transitions)
    expect(report.maxDepth).toBe(GO.singleKeyDepth12.maxDepth)
    expect(formatFingerprint(report.fingerprint)).toBe(GO.singleKeyDepth12.fingerprint)
  })

  test("single-key with two owners matches Go", () => {
    const config: ModelConfig = { ...gateConfig("single-key"), owners: 2 }
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, defaultInvariants(config))
    expect(report.violation).toBeNull()
    expect(report.states).toBe(GO.singleKeyTwoOwners.states)
    expect(report.transitions).toBe(GO.singleKeyTwoOwners.transitions)
    expect(formatFingerprint(report.fingerprint)).toBe(GO.singleKeyTwoOwners.fingerprint)
  })

  test("single-key with lease-gated steals matches Go", () => {
    const config: ModelConfig = { ...gateConfig("single-key"), adversarialSteal: false }
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, defaultInvariants(config))
    expect(report.violation).toBeNull()
    expect(report.states).toBe(GO.singleKeyLeaseGated.states)
    expect(report.transitions).toBe(GO.singleKeyLeaseGated.transitions)
    expect(formatFingerprint(report.fingerprint)).toBe(GO.singleKeyLeaseGated.fingerprint)
  })

  test("single-key closure at generation caps 2/3/4 matches Go", () => {
    for (const pin of GO.singleKeyClosure) {
      const config: ModelConfig = { ...gateConfig("single-key"), maxFence: pin.maxFence }
      const sys = effectorSystem(config, 0)
      const report = check(sys, 0, defaultInvariants(config))
      expect(report.violation).toBeNull()
      expect(report.states).toBe(pin.states)
      expect(report.transitions).toBe(pin.transitions)
      expect(formatFingerprint(report.fingerprint)).toBe(pin.fingerprint)
    }
  })

  test("two-key rediscovers the fencing violation with the identical minimal trace", () => {
    const config = gateConfig("two-key")
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, defaultInvariants(config))
    expect(report.violation).not.toBeNull()
    const violation = report.violation!
    expect(violation.invariant).toBe("fencing safety (SPEC 6.3)")
    expect(report.states).toBe(GO.twoKeyViolation.states)
    expect(report.transitions).toBe(GO.twoKeyViolation.transitions)
    expect(formatFingerprint(report.fingerprint)).toBe(GO.twoKeyViolation.fingerprint)
    expect(violation.trace.map((st) => describeAction(st.action))).toEqual([
      ...GO.twoKeyViolation.trace,
    ])
    expect(describeOutcome(violation.trace.at(-1)!.label)).toBe(
      GO.twoKeyViolation.lastOutcome,
    )
    // The counterexample, for the reader of test output:
    console.log(
      `two-key minimal counterexample (TS checker):\n${formatTrace(sys, violation.trace)}`,
    )
  })

  test("two-key with one self-interleaving owner reproduces the audit's shape", () => {
    const config: ModelConfig = {
      owners: 1,
      protocol: "two-key",
      adversarialSteal: true,
      selfInterleave: true,
      allowCrash: false,
      maxFence: 0,
    }
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, defaultInvariants(config))
    expect(report.violation).not.toBeNull()
    expect(report.states).toBe(GO.twoKeySingleOwner.states)
    expect(report.transitions).toBe(GO.twoKeySingleOwner.transitions)
    expect(formatFingerprint(report.fingerprint)).toBe(GO.twoKeySingleOwner.fingerprint)
    expect(report.violation!.trace.map((st) => describeAction(st.action))).toEqual([
      ...GO.twoKeySingleOwner.trace,
    ])
  })

  test("two-key still holds unique terminal outcome (the model is not a strawman)", () => {
    const config = gateConfig("two-key")
    const sys = effectorSystem(config, GATE_DEPTH)
    const report = check(sys, GATE_DEPTH, [
      defaultInvariants(config).find((inv) => inv.name.startsWith("unique"))!,
    ])
    expect(report.violation).toBeNull()
    expect(report.states).toBe(GO.twoKeyUniqueOutcomeOnly.states)
    expect(report.transitions).toBe(GO.twoKeyUniqueOutcomeOnly.transitions)
    expect(formatFingerprint(report.fingerprint)).toBe(
      GO.twoKeyUniqueOutcomeOnly.fingerprint,
    )
  })

  test("path enumeration matches the Go conformance census", () => {
    const config: ModelConfig = {
      ...gateConfig("single-key"),
      adversarialSteal: false,
      allowCrash: false,
    }
    const sys = effectorSystem(config, GO.pathCensus.depth)
    const paths = enumeratePaths(sys, GO.pathCensus.depth, 0, null)
    expect(paths.capped).toBe(false)
    expect(paths.paths.length).toBe(GO.pathCensus.ownersNoCrash)
  })

  test("the checker is deterministic across repeated runs", () => {
    const config = gateConfig("single-key")
    const sys = effectorSystem(config, 8)
    const first = check(sys, 8, defaultInvariants(config))
    for (let i = 0; i < 3; i++) {
      const again = check(sys, 8, defaultInvariants(config))
      expect(again.states).toBe(first.states)
      expect(again.transitions).toBe(first.transitions)
      expect(again.fingerprint).toBe(first.fingerprint)
    }
  })
})
