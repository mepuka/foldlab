import { Effect } from "effect"

import * as Fold from "../../src/planes/Fold.js"
import { declareChaosCounter } from "../ChaosFixture.js"

const [url, handleName, targetsJson, resultPath, markerPath, markerFloorText] =
  process.argv.slice(2)
if (url === undefined || handleName === undefined || targetsJson === undefined || resultPath === undefined) {
  throw new Error("fold-pump arguments are incomplete")
}
const targets = JSON.parse(targetsJson) as ReadonlyArray<number>
const markerFloor = markerFloorText === undefined ? Number.POSITIVE_INFINITY : Number(markerFloorText)

const program = Effect.gen(function* () {
  const { fold } = yield* declareChaosCounter(handleName)
  const deployed = yield* Fold.deploy(fold, { checkpointEvery: 16 })
  let markerWritten = false
  while (true) {
    const anchors = yield* Effect.forEach(
      targets,
      (_, partition) => deployed.anchor(partition),
      { concurrency: "unbounded" },
    )
    const applied = anchors.reduce((sum, anchor) => sum + anchor.floor, 0)
    if (!markerWritten && markerPath !== undefined && applied >= markerFloor) {
      markerWritten = true
      const scoreboard = yield* deployed.scoreboard
      yield* Effect.promise(() => Bun.write(markerPath, JSON.stringify({ anchors, applied, scoreboard })))
    }
    if (anchors.every((anchor, partition) => anchor.floor >= targets[partition]!)) {
      const scoreboard = yield* deployed.scoreboard
      yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({ anchors, scoreboard })))
      return
    }
    yield* Effect.sleep("5 millis")
  }
}).pipe(
  Effect.provide(Fold.Folds.layer({ servers: url })),
  Effect.scoped,
)

await Effect.runPromise(program)
