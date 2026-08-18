import { afterEach, describe, expect, test } from "bun:test"

import { connect } from "@nats-io/transport-node"
import { Effect, Reducer, Schema } from "effect"

import * as Algebra from "../src/truth/Algebra.js"
import { advance } from "../src/planes/Anchor.js"
import { Digest } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import { makeAnchorStore } from "../src/internal/anchors.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("anchor revision ownership", () => {
  test("a lost CAS is a fatal structural detach, never reread-and-continue", async () => {
    harness = await startNatsHarness()
    const Event = Schema.Struct({ value: Schema.Number })
    const lane = await Effect.runPromise(Lane.declare({
      handle: "anchor-cas",
      event: Event,
      eventSchema: Digest.make("f".repeat(64)),
      partitions: 1 as const,
      partitionKey: { path: [] },
    }))
    const algebra = await Effect.runPromise(Algebra.declare({
      declaration: { name: "anchor-cas-sum", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, 0),
    }))
    const fold = await Effect.runPromise(Fold.declare({
      lane,
      algebra,
      contribution: {
        declaration: { name: "anchor-cas-value", version: 0 },
        apply: (event) => event.value,
      },
    }))
    const connection = await connect({ servers: harness.url })
    try {
      const store = await Effect.runPromise(makeAnchorStore(connection))
      const [left, right] = await Effect.runPromise(Effect.all([
        store.initialize(fold, 0),
        store.initialize(fold, 0),
      ]))
      const eventDigest = Digest.make("1".repeat(64))
      const leftNext = await Effect.runPromise(advance(left.anchor, 1, eventDigest, 1))
      const rightNext = await Effect.runPromise(advance(right.anchor, 1, eventDigest, 1))
      const key = store.key(fold, 0)
      await Effect.runPromise(store.commit(key, left.revision, leftNext, 1))

      const refusal = await Effect.runPromise(Effect.flip(
        store.commit(key, right.revision, rightNext, 1),
      ))
      expect(refusal.sort).toBe("structural")
      expect(refusal.kind).toBe("lost-anchor-cas")
      expect(refusal.law).toContain("fatal detach")
    } finally {
      await connection.close()
    }
  }, 120_000)
})
