import { describe, expect, test } from "bun:test"
import { Clock, Effect, Exit, Fiber, Schedule } from "effect"
import { TestClock } from "effect/testing"

import {
  absenceRefusal,
  isRetryable,
  retryAbsence,
  structuralRefusal,
} from "../src/truth/Refusal.js"

describe("refusal retry class", () => {
  test("retries absence and never structural evidence", () => {
    const fields = {
      kind: "malformed-envelope",
      law: "only missing evidence may be retried",
      path: ["body", "blob"],
      got: "missing",
      expected: "a present digest",
      next: [],
    } as const

    const absence = absenceRefusal(fields)
    const structural = structuralRefusal(fields)

    expect(absence._tag).toBe("AbsenceRefusal")
    expect(structural._tag).toBe("StructuralRefusal")
    expect(isRetryable(absence)).toBe(true)
    expect(isRetryable(structural)).toBe(false)
  })

  test("the shipped policy retries only absence-sorted failures", async () => {
    const fields = {
      kind: "malformed-envelope",
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

  test("honors a supplied temporal schedule through the pipeable form", async () => {
    const fields = {
      kind: "not-here-yet",
      law: "only missing evidence may be retried",
      path: [],
      got: "missing",
      expected: "present",
      next: [],
    } as const
    const attempts: Array<number> = []
    const eventuallyPresent = Effect.gen(function* () {
      attempts.push(yield* Clock.currentTimeMillis)
      if (attempts.length < 3) return yield* absenceRefusal(fields)
      return "present"
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* eventuallyPresent.pipe(
          retryAbsence(Schedule.spaced("1 second")),
          Effect.forkChild,
        )
        yield* TestClock.adjust("2 seconds")
        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestClock.layer())),
    )

    expect(result).toBe("present")
    expect(attempts).toEqual([0, 1_000, 2_000])
  })
})
