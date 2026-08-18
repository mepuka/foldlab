import { Effect, Layer, Stream } from "effect"

import { Admission } from "../../src/kernel/Admission.js"
import { admissionContextOver } from "../../src/kernel/Candidates.js"
import { FabricClient } from "../../src/carriage/FabricClient.js"
import { factSubject } from "../../src/kernel/Subjects.js"

const [url, resultPath, countText] = process.argv.slice(2)
if (url === undefined || resultPath === undefined || countText === undefined) {
  throw new Error("consumer arguments are incomplete")
}
const count = Number(countText)

const program = Effect.gen(function* () {
  const subject = yield* factSubject("roundtrip")
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
  Effect.provide(Layer.provide(
    FabricClient.layer({ servers: url, stream: "PLAIT_SPINE" }),
    Admission.layer(admissionContextOver([])),
  )),
  Effect.scoped,
)

await Effect.runPromise(program)
