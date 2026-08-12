/**
 * The TLA+ model gate, in CI shape: `bun test` shells TLC (Temurin 21 via
 * mise, tools/tla2tools.jar — provenance in tools/README.md) and asserts
 * both directions of the modelcheck contract:
 *
 *   - zero violations on the ratified single-key spec, with the
 *     distinct-state count equal to the pinned Go/TS closure count, and
 *   - the fencing violation REDISCOVERED on the withdrawn two-key spec,
 *     with the minimal 4-step counterexample.
 *
 * Determinism: one TLC worker, pinned fingerprint function, -deadlock
 * (crash-stop makes all-crashed terminal states legal). The full pin table
 * runs under `bun run modelcheck`; this test keeps the cheapest pin of each
 * color so the whole-repo gate stays fast.
 */

import { describe, expect, test } from "bun:test"
import {
  distinctStates,
  foundNoError,
  runTlc,
  traceStates,
  violatedInvariant,
} from "../scripts/tlc.ts"

const TLC_TIMEOUT_MS = 120_000

describe("the TLA+ model gate (TLC over specs/)", () => {
  test(
    "single-key protocol: no violation, state count matches the Go/TS pin",
    () => {
      const run = runTlc("Effector", "Effector.cap2.cfg")
      expect(foundNoError(run)).toBe(true)
      expect(distinctStates(run)).toBe(584)
    },
    TLC_TIMEOUT_MS,
  )

  test(
    "two-key protocol: TLC rediscovers the fencing violation, minimally",
    () => {
      const run = runTlc("EffectorTwoKey", "EffectorTwoKey.cfg")
      expect(run.exitCode).not.toBe(0)
      expect(violatedInvariant(run)).toBe("TerminalFenceIsMaximal")
      const trace = traceStates(run)
      // Initial state + claim(1), begin(1), claim(2) steals, finish(1).
      expect(trace.length).toBe(5)
      const final = trace.at(-1)!
      expect(final).toContain('key2 = [tag |-> "done", fence |-> 1')
      expect(final).toContain("maxFence = 2")
    },
    TLC_TIMEOUT_MS,
  )
})
