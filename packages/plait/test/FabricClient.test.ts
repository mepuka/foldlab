import { describe, expect, test } from "bun:test"

import { Effect, Stream } from "effect"

import { FabricClient } from "../src/FabricClient.js"
import { evidenceSubject } from "../src/Subjects.js"
import { decodeEnvelope } from "../src/Wire.js"

const utf8 = new TextEncoder()
const lane = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"

describe("FabricClient", () => {
  test("ships a fixture layer through the same service seam", async () => {
    const [subject, decoded] = await Effect.runPromise(Effect.all([
      evidenceSubject("fixture", 0),
      decodeEnvelope(utf8.encode(
        `{"v":0,"kind":"emit","lane":"${lane}","key":"k","holder":"h","body":1,"pins":[]}`,
      )),
    ]))

    const layer = FabricClient.testLayer({
      publish: Effect.fn("FabricClient.fixture.publish")(function* () {
        return { digest: decoded.digest, sequence: 1, duplicate: false }
      }),
      subscribe: Effect.fn("FabricClient.fixture.subscribe")(function* () {
        return Stream.empty
      }),
    })

    const published = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* FabricClient
        return yield* client.publish(subject, decoded.envelope)
      }).pipe(Effect.provide(layer)),
    )

    expect(String(published.digest)).toBe(String(decoded.digest))
    expect(published.sequence).toBe(1)
  })
})
