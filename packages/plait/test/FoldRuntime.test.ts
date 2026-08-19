import { afterEach, describe, expect, test } from "bun:test"

import { Effect, Reducer, Schema } from "effect"

import * as Algebra from "../src/truth/Algebra.js"
import type { Anchor } from "../src/planes/Anchor.js"
import { digestOf, Digest } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"
import { Holder } from "../src/kernel/Wire.js"
import { LaneHandle } from "../src/planes/Lane.js"

const CounterEvent = Schema.Struct({ tenant: Schema.String, delta: Schema.Finite })
const eventSchema = Digest.make("d".repeat(64))
let harness: NatsHarness | undefined

class FloorTimeout extends Schema.TaggedError<FloorTimeout>()("FloorTimeout", {
  floor: Schema.Natural,
}) {}

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const waitForFloor = (
  handle: Fold.FoldHandle,
  partition: number,
  floor: number,
): Effect.Effect<Anchor, FloorTimeout> => Effect.gen(function* () {
  for (let attempt = 0; attempt < 500; attempt++) {
    const anchor = yield* handle.anchor(partition).pipe(Effect.orDie)
    if (anchor.floor >= floor) return anchor
    yield* Effect.sleep("10 millis")
  }
  return yield* new FloorTimeout({ floor })
})

describe("durable fold deployment", () => {
  test("restart resumes from the anchor and reaches the suffix digest", async () => {
    harness = await startNatsHarness()
    const lane = await Effect.runPromise(Lane.declare({
      handle: LaneHandle.make("durable-counter"),
      event: CounterEvent,
      eventSchema,
      partitions: 1 as const,
      partitionKey: { path: ["tenant"] },
    }))
    const algebra = await Effect.runPromise(Algebra.declare({
      declaration: { name: "durable-integer-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))
    const fold = await Effect.runPromise(Fold.declare({
      lane,
      algebra,
      contribution: {
        declaration: { name: "counter-delta", version: 0 },
        apply: (event) => event.delta,
      },
    }))
    const live = Lane.Lanes.layer({ servers: harness.url })

    await Effect.runPromise(Lane.emit(
      lane,
      { tenant: "north", delta: 2 },
      { holder: Holder.make("test") },
    ).pipe(Effect.provide(live), Effect.scoped))

    const first = await Effect.runPromise(Effect.gen(function* () {
      const handle = yield* Fold.deploy(fold, { checkpointEvery: 1 })
      return yield* waitForFloor(handle, 0, 1)
    }).pipe(
      Effect.provide(Fold.Folds.layer({ servers: harness!.url })),
      Effect.scoped,
    ))
    expect(first.stateDigest).toBe(await Effect.runPromise(digestOf(2)))

    await Effect.runPromise(Lane.emit(
      lane,
      { tenant: "north", delta: 3 },
      { holder: Holder.make("test") },
    ).pipe(Effect.provide(live), Effect.scoped))

    const resumed = await Effect.runPromise(Effect.gen(function* () {
      const handle = yield* Fold.deploy(fold, { checkpointEvery: 1 })
      return yield* waitForFloor(handle, 0, 2)
    }).pipe(
      Effect.provide(Fold.Folds.layer({ servers: harness!.url })),
      Effect.scoped,
    ))
    expect(resumed.stateDigest).toBe(await Effect.runPromise(digestOf(5)))
    expect(resumed.floor).toBe(2)
  }, 120_000)
})
