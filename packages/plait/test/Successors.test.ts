import { describe, expect, test } from "bun:test"

import { Effect } from "effect"
import { resolve } from "node:path"

import { initial } from "../src/Anchor.js"
import type { WireValue } from "../src/Canonical.js"
import { digestOf } from "../src/Digest.js"
import {
  arrivalOrderReplay,
  replaySuccessors,
  type PositionedEvent,
} from "../src/internal/successors.js"

const positioned = async <Event extends WireValue>(
  position: number,
  event: Event,
): Promise<PositionedEvent<Event>> => ({
  position,
  event,
  digest: await Effect.runPromise(digestOf({ position, event })),
})

describe("the successor discipline", () => {
  test("buffers 6-before-5 and drains only the contiguous frontier", async () => {
    const start = await Effect.runPromise(initial([]))
    const deliveries = await Promise.all([
      positioned(6, 3),
      positioned(5, 2),
    ])

    const lawful = await Effect.runPromise(replaySuccessors({
      anchor: { ...start, floor: 4 },
      state: [] as ReadonlyArray<number>,
      deliveries,
      step: (state, event) => [...state, event],
    }))
    const mutant = await Effect.runPromise(arrivalOrderReplay({
      anchor: { ...start, floor: 4 },
      state: [] as ReadonlyArray<number>,
      deliveries,
      step: (state, event) => [...state, event],
    }))

    expect(lawful.state).toEqual([2, 3])
    expect(lawful.anchor.floor).toBe(6)
    expect(lawful.buffered).toBe(0)
    expect(mutant.state).toEqual([3, 2])
    const trace = "FOLD CONTROL: PASS component=successor-discipline mutant=arrival-order killed-by=duplicate-current-delivery,bounded-reordered-delivery lawful=[2,3] mutant=[3,2]"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.arrival-order.trace.txt",
    )).text())
    console.info(trace)
  })

  test("redelivery replaces only its position and stale arrivals are harmless", async () => {
    const start = await Effect.runPromise(initial(0))
    const deliveries = await Promise.all([
      positioned(9, 100),
      positioned(11, 2),
      positioned(11, 2),
      positioned(12, 3),
    ])

    const lawful = await Effect.runPromise(replaySuccessors({
      anchor: { ...start, floor: 10 },
      state: 0,
      deliveries,
      step: (state, event) => state + event,
    }))
    const mutant = await Effect.runPromise(arrivalOrderReplay({
      anchor: { ...start, floor: 10 },
      state: 0,
      deliveries,
      step: (state, event) => state + event,
    }))

    expect(lawful.state).toBe(5)
    expect(lawful.applied).toBe(2)
    expect(lawful.anchor.floor).toBe(12)
    expect(mutant.state).toBe(107)
  })
})
