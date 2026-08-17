import type { NatsConnection } from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"
import { Effect, Fiber, Scope } from "effect"

import type {
  FoldHandle,
  FoldScoreboard,
  FoldService,
  FoldsOptions,
} from "../Fold.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Refusal,
} from "../Refusal.js"
import { makeAnchorStore } from "./anchors.js"
import { ensureLaneStreams } from "./lanes.js"
import {
  preparePartitionPump,
  type MutableFoldScoreboard,
} from "./pump.js"

const transportRefusal = (operation: string, cause: unknown): Refusal =>
  absenceRefusal({
    kind: "fold-transport-unavailable",
    law: "Transport absence may be retried; declared fold laws may not.",
    path: [operation],
    got: String(cause),
    expected: "the pinned local NATS operation to be available",
    next: [],
  })

const closeConnection = (connection: NatsConnection): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => connection.close(),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void))

const snapshot = (scoreboard: MutableFoldScoreboard): FoldScoreboard => ({
  messages: scoreboard.messages,
  redeliveriesAbsorbed: scoreboard.redeliveriesAbsorbed,
  bufferedOutOfOrderArrivals: scoreboard.bufferedOutOfOrderArrivals,
  bufferedOutOfOrderDrained: scoreboard.bufferedOutOfOrderDrained,
  anchorWrites: scoreboard.anchorWrites,
  refusals: { ...scoreboard.refusals },
})

export const makeFoldService = Effect.fn("Folds.make")(function* (
  options: FoldsOptions,
): Effect.fn.Return<FoldService, Refusal, Scope.Scope> {
  const connection = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => connect({
        servers: typeof options.servers === "string" ? options.servers : [...options.servers],
        name: options.connectionName ?? "foldlab-plait-folds",
      }),
      catch: (cause) => transportRefusal("fold.connection.acquire", cause),
    }),
    closeConnection,
  )
  const anchors = yield* makeAnchorStore(connection)

  const deploy: FoldService["deploy"] = Effect.fn("Folds.deployLive")(
    function* (fold, deployOptions) {
      if (!Number.isSafeInteger(deployOptions.checkpointEvery) || deployOptions.checkpointEvery < 1) {
        return yield* structuralRefusal({
          kind: "invalid-fold-declaration",
          law: "Fold checkpoint flow control is a positive bounded batch size.",
          path: ["checkpointEvery"],
          got: deployOptions.checkpointEvery,
          expected: "a positive safe integer",
          next: [{
            subject: "Folds.deploy",
            note: "Choose checkpointEvery >= 1; it changes batching, not correctness.",
          }],
        })
      }
      yield* ensureLaneStreams(connection, fold.lane)
      const scoreboard: MutableFoldScoreboard = {
        messages: 0,
        redeliveriesAbsorbed: 0,
        bufferedOutOfOrderArrivals: 0,
        bufferedOutOfOrderDrained: 0,
        anchorWrites: 0,
        refusals: {},
      }
      const fibers: Array<Fiber.Fiber<void, Refusal>> = []
      for (let partition = 0; partition < fold.lane.partitions; partition++) {
        const loaded = yield* anchors.initialize(fold, partition)
        const pump = yield* preparePartitionPump(
          connection,
          anchors,
          fold,
          partition,
          loaded,
          deployOptions.checkpointEvery,
          scoreboard,
        )
        fibers.push(yield* Effect.forkScoped(pump.run))
      }

      const anchor: FoldHandle["anchor"] = (partition) => {
        if (!Number.isSafeInteger(partition) || partition < 0 || partition >= fold.lane.partitions) {
          return Effect.fail(structuralRefusal({
            kind: "invalid-partition-key",
            law: "A fold handle exposes only its declared partition anchors.",
            path: ["partition"],
            got: Number.isFinite(partition) ? partition : String(partition),
            expected: `an integer from 0 through ${fold.lane.partitions - 1}`,
            next: [{
              subject: "FoldHandle.anchor",
              note: "Inspect only a partition declared by this fold's lane.",
            }],
          }))
        }
        return anchors.read(anchors.key(fold, partition))
      }
      const awaitAll: Effect.Effect<void, Refusal> = Effect.forEach(fibers, Fiber.join, {
          concurrency: "unbounded",
          discard: true,
        })
      return {
        await: awaitAll,
        anchor,
        scoreboard: Effect.sync(() => snapshot(scoreboard)),
      }
    },
  )

  return { deploy }
})
