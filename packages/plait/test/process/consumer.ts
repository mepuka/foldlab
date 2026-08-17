import { Effect, Stream } from "effect"

import { FabricClient } from "../../src/FabricClient.js"
import { evidenceSubject } from "../../src/Subjects.js"

const [url, resultPath, countText] = process.argv.slice(2)
if (url === undefined || resultPath === undefined || countText === undefined) {
  throw new Error("consumer arguments are incomplete")
}
const count = Number(countText)

const program = Effect.gen(function* () {
  const subject = yield* evidenceSubject("roundtrip", 0)
  const client = yield* FabricClient
  const messages = yield* client.subscribe(subject)
  const received = yield* messages.pipe(
    Stream.take(count),
    Stream.runCollect,
    Effect.timeout("5 seconds"),
  )
  yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({
    digests: Array.from(received, (message) => message.digest),
  })))
}).pipe(
  Effect.provide(FabricClient.layer({ servers: url, stream: "PLAIT_SPINE" })),
  Effect.scoped,
)

await Effect.runPromise(program)
