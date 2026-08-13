import { describe, expect, test } from "bun:test"
import { Effect, Stream } from "effect"
import * as FastCheck from "fast-check"
import { runFold } from "../src/foldBindings.ts"
import { arbitraryForEvent } from "../src/foldArbitrary.ts"
import type { StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

describe("fold Stream binding", () => {
  test("rechunking at three sizes leaves fold state unchanged", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.array(arbitraryForEvent<StreamEvent>({ kind: "streamEvent" }), { maxLength: 64 }),
        FastCheck.uniqueArray(FastCheck.integer({ min: 1, max: 64 }), {
          minLength: 3,
          maxLength: 3,
        }),
        (events, sizes) => {
          const expected = primitiveFolds.sum.fold(events)
          const states = sizes.map((size) =>
            Effect.runSync(
              Stream.fromIterable(events).pipe(
                Stream.rechunk(size),
                runFold(primitiveFolds.sum),
              ),
            )
          )
          expect(states).toEqual(sizes.map(() => expected))
        },
      ),
      {
        examples: [[foldFixtureEvents, [1, 2, 5]]],
        seed: 0x07fb_0001,
        numRuns: 250,
        endOnFailure: false,
      },
    )
  })
})
