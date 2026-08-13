import { describe, expect, test } from "bun:test"
import { Effect, Stream } from "effect"
import { runFold } from "../src/foldBindings.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

describe("fold Stream binding", () => {
  test("rechunking at three sizes leaves fold state unchanged", () => {
    const expected = primitiveFolds.sum.fold(foldFixtureEvents)
    const states = [1, 2, 5].map((size) =>
      Effect.runSync(
        Stream.fromIterable(foldFixtureEvents).pipe(
          Stream.rechunk(size),
          runFold(primitiveFolds.sum),
        ),
      )
    )
    expect(states).toEqual([expected, expected, expected])
  })
})
