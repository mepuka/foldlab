import { expect, test } from "bun:test"
import { Effect } from "effect"
import { applyKV, event, foldKV } from "../src/stream.ts"

type ApplyKVHasOkDiscriminant = ReturnType<typeof applyKV> extends {
  readonly ok: unknown
} ? true : false

test("applyKV is an Effect value, not the neighboring ok-union", () => {
  const compileTimeWitness: ApplyKVHasOkDiscriminant = false
  const initial = Effect.runSync(foldKV([]))
  const computation = applyKV(initial, event("s", 1, "key=value"))

  expect(compileTimeWitness).toBe(false)
  expect(Object.hasOwn(computation, "ok")).toBe(false)
  expect(Effect.runSync(computation).count).toBe(1)
})
