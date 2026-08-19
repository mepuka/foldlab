import { afterEach, describe, expect, test } from "bun:test"

import { Effect, Reducer, Schema } from "effect"

import * as Algebra from "../src/truth/Algebra.js"
import type { Anchor } from "../src/planes/Anchor.js"
import { Digest, digestOf } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import * as Session from "../src/planes/Session.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const CounterEvent = Schema.Struct({ tenant: Schema.String, delta: Schema.Finite })
const eventSchema = Digest.make("c".repeat(64))
let harness: NatsHarness | undefined

class FloorTimeout extends Schema.TaggedError<FloorTimeout>()("FloorTimeout", {
  floor: Schema.Natural,
}) {}

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const declareFold = (handle: string) => Effect.gen(function* () {
  const lane = yield* Lane.declare({
    handle,
    event: CounterEvent,
    eventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["tenant"] },
  })
  const algebra = yield* Algebra.declare({
    declaration: { name: `${handle}-sum`, version: 0 },
    reducer: Reducer.make<number>((left, right) => left + right, 0),
  })
  const fold = yield* Fold.declare({
    lane,
    algebra,
    contribution: {
      declaration: { name: `${handle}-delta`, version: 0 },
      apply: (event: typeof CounterEvent.Type) => event.delta,
    },
  })
  return { lane, fold }
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

describe("read sessions over a deployed fold", () => {
  test("a view is the image the pump checkpointed, read after the pump detached", async () => {
    harness = await startNatsHarness()
    const url = harness.url
    const { lane, fold } = await Effect.runPromise(declareFold("session-counter"))
    const other = await Effect.runPromise(declareFold("session-other"))
    const scope = await Effect.runPromise(Session.writ({
      holder: "reader-seat",
      views: [fold.digest],
    }))
    const lanes = Lane.Lanes.layer({ servers: url })
    const sessions = Session.Sessions.layer({ servers: url })

    for (const delta of [2, 3]) {
      await Effect.runPromise(Lane.emit(
        lane,
        { tenant: "north", delta },
        { holder: "test" },
      ).pipe(Effect.provide(lanes), Effect.scoped))
    }

    // The pump runs and detaches inside this scope. Everything below reads the
    // anchors it left behind, which is the whole point of the seam: a consumer
    // is not the process that folded.
    await Effect.runPromise(Effect.gen(function* () {
      const handle = yield* Fold.deploy(fold, { checkpointEvery: 1 })
      return yield* waitForFloor(handle, 0, 2)
    }).pipe(Effect.provide(Fold.Folds.layer({ servers: url })), Effect.scoped))

    const observed = await Effect.runPromise(Effect.gen(function* () {
      const replayed = yield* Session.subscribe(fold, {
        writ: scope,
        partition: 0,
        policy: "replay",
      })
      const first = yield* Session.read(replayed, fold)
      const second = yield* Session.read(first.session, fold)
      const resumed = yield* Session.subscribe(fold, {
        writ: scope,
        partition: 0,
        policy: "resume",
      })
      return { replayed, first, second, resumed }
    }).pipe(Effect.provide(sessions), Effect.scoped))

    const five = await Effect.runPromise(digestOf(5))
    expect(observed.replayed.position).toBe(0)
    expect(observed.first.view.state).toBe(5)
    expect(observed.first.view.anchor.floor).toBe(2)
    expect(observed.first.view.anchor.stateDigest).toBe(five)
    expect(observed.first.view.from).toBe(0)
    expect(observed.first.view.view).toBe(fold.digest)
    expect(observed.first.view.writ).toBe(scope.digest)
    expect(observed.first.session.position).toBe(2)

    // The second step covers nothing new: same coordinate, empty interval.
    expect(observed.second.view.from).toBe(2)
    expect(observed.second.view.anchor.floor).toBe(2)
    expect(observed.second.view.state).toBe(5)

    // `resume` opens already caught up with the pump's frontier.
    expect(observed.resumed.position).toBe(2)

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(other.fold, {
        writ: scope,
        partition: 0,
        policy: "resume",
      }).pipe(Effect.provide(sessions), Effect.scoped),
    ))
    expect(refusal.kind).toBe("undeclared-view")
    expect(refusal.sort).toBe("structural")
  }, 120_000)

  test("a view of a fold no pump has deployed is a retryable absence", async () => {
    harness = await startNatsHarness()
    const { fold } = await Effect.runPromise(declareFold("session-undeployed"))
    const scope = await Effect.runPromise(Session.writ({
      holder: "reader-seat",
      views: [fold.digest],
    }))

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(fold, { writ: scope, partition: 0, policy: "resume" }).pipe(
        Effect.provide(Session.Sessions.layer({ servers: harness.url })),
        Effect.scoped,
      ),
    ))

    expect(refusal.sort).toBe("absence")
    expect(refusal.kind).toBe("anchor-absent")
  }, 120_000)
})
