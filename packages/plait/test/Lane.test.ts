import { describe, expect, test } from "bun:test"

import { Effect, Schema } from "effect"

import { Digest } from "../src/truth/Digest.js"
import { declare, partition } from "../src/planes/Lane.js"

const Event = Schema.Struct({ tenant: Schema.String, delta: Schema.Finite })
const eventSchema = Digest.make("a".repeat(64))

describe("declared evidence lanes", () => {
  test("partition derivation is canonical data and moves lane identity", async () => {
    const [byTenant, byDelta] = await Effect.runPromise(Effect.all([
      declare({
        handle: "counter",
        event: Event,
        eventSchema,
        partitions: 4 as const,
        partitionKey: { path: ["tenant"] },
      }),
      declare({
        handle: "counter",
        event: Event,
        eventSchema,
        partitions: 4 as const,
        partitionKey: { path: ["delta"] },
      }),
    ]))

    expect(byTenant.digest).not.toBe(byDelta.digest)
    expect(byTenant.declaration.partitionKey).toEqual({ path: ["tenant"] })

    const first = await Effect.runPromise(partition(byTenant, { tenant: "north", delta: 1 }))
    const again = await Effect.runPromise(partition(byTenant, { delta: 1, tenant: "north" }))
    expect(first.key).toBe("north")
    expect(first.partition).toBe(again.partition)
    expect(first.partition).toBeGreaterThanOrEqual(0)
    expect(first.partition).toBeLessThan(4)
  })

  test("a missing declared key path is a structural refusal", async () => {
    const lane = await Effect.runPromise(declare({
      handle: "counter",
      event: Event,
      eventSchema,
      partitions: 2 as const,
      partitionKey: { path: ["missing"] },
    }))

    const refusal = await Effect.runPromise(Effect.flip(
      partition(lane, { tenant: "north", delta: 1 }),
    ))

    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("invalid-partition-key")
    expect(refusal.path).toEqual(["partitionKey", "missing"])
  })
})
