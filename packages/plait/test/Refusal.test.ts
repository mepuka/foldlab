import { describe, expect, test } from "bun:test"
import { Effect, Exit } from "effect"

import {
  absenceRefusal,
  isRetryable,
  retryAbsence,
  structuralRefusal,
} from "../src/Refusal.js"

describe("refusal retry class", () => {
  test("retries absence and never structural evidence", () => {
    const fields = {
      kind: "not-here-yet",
      law: "only missing evidence may be retried",
      path: ["body", "blob"],
      got: "missing",
      expected: "a present digest",
      next: [],
    } as const

    expect(isRetryable(absenceRefusal(fields))).toBe(true)
    expect(isRetryable(structuralRefusal(fields))).toBe(false)
  })

  test("the shipped policy retries only absence-sorted failures", async () => {
    const fields = {
      kind: "not-here-yet",
      law: "only missing evidence may be retried",
      path: [],
      got: "missing",
      expected: "present",
      next: [],
    } as const
    let absenceAttempts = 0
    const eventuallyPresent = Effect.suspend(() => {
      absenceAttempts++
      return absenceAttempts < 3
        ? Effect.fail(absenceRefusal(fields))
        : Effect.succeed("present")
    })
    let structuralAttempts = 0
    const permanentlyInvalid = Effect.suspend(() => {
      structuralAttempts++
      return Effect.fail(structuralRefusal(fields))
    })

    expect(await Effect.runPromise(retryAbsence(eventuallyPresent, 3))).toBe("present")
    const structuralExit = await Effect.runPromiseExit(retryAbsence(permanentlyInvalid, 3))

    expect(Exit.isFailure(structuralExit)).toBe(true)
    expect(absenceAttempts).toBe(3)
    expect(structuralAttempts).toBe(1)
  })
})
