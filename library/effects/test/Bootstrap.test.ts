// M1 bootstrap check: the pinned effect version resolves and its runtime
// executes. Sampled evidence only; never a claim about semantics.
import { expect, test } from "bun:test"
import { Effect } from "effect"

test("pinned effect@4.0.0-rc.111 resolves and runs", () => {
  expect(Effect.runSync(Effect.succeed(1))).toBe(1)
})
