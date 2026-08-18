import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import { advance, initial } from "../src/planes/Anchor.js"
import { Digest } from "../src/truth/Digest.js"

const firstEvent = Digest.make("1".repeat(64))
const secondEvent = Digest.make("2".repeat(64))

describe("fold anchors", () => {
  test("the floor records the contiguous frontier and the head commits its order", async () => {
    const start = await Effect.runPromise(initial(0))
    const first = await Effect.runPromise(advance(start, 1, firstEvent, 1))
    const second = await Effect.runPromise(advance(first, 3, secondEvent, 2))

    expect(start.floor).toBe(0)
    expect(first.floor).toBe(1)
    expect(second.floor).toBe(2)
    expect(first.stateDigest).not.toBe(start.stateDigest)
    expect(second.head).not.toBe(first.head)

    const reversedStart = await Effect.runPromise(initial(0))
    const reversedFirst = await Effect.runPromise(advance(reversedStart, 2, secondEvent, 1))
    const reversedSecond = await Effect.runPromise(advance(reversedFirst, 3, firstEvent, 2))
    expect(reversedSecond.stateDigest).toBe(second.stateDigest)
    expect(reversedSecond.head).not.toBe(second.head)
  })
})
