import { Effect, Stream } from "effect"

import { FabricClient } from "../../src/FabricClient.js"
import { evidenceSubject } from "../../src/Subjects.js"

const [url, readyPath, resultPath, countText] = process.argv.slice(2)
const subject = evidenceSubject("roundtrip", 0)
if (url === undefined || readyPath === undefined || resultPath === undefined ||
  countText === undefined || !subject.ok) {
  throw new Error("consumer arguments are incomplete")
}
const count = Number(countText)

const program = Effect.gen(function* () {
  const client = yield* FabricClient
  const messages = yield* client.subscribe(subject.subject)
  yield* Effect.promise(() => Bun.write(readyPath, "ready\n"))
  const received = yield* messages.pipe(
    Stream.take(count),
    Stream.runCollect,
  )
  yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({
    digests: Array.from(received, (message) => message.digest),
  })))
}).pipe(
  Effect.provide(FabricClient.layer({ servers: url, stream: "PLAIT_SPINE" })),
  Effect.scoped,
)

await Effect.runPromise(program)
