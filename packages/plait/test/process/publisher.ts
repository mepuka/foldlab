import { Effect, Schema } from "effect"

import { Digest } from "../../src/truth/Digest.js"
import { FabricClient, type PublishedEnvelope, StreamName } from "../../src/carriage/FabricClient.js"
import { factSubject } from "../../src/kernel/Subjects.js"
import { Envelope } from "../../src/kernel/Wire.js"

const CorpusRow = Schema.Struct({
  case: Schema.String,
  digest: Digest,
  envelope: Envelope,
})

const [url, corpusPath, resultPath] = process.argv.slice(2)
if (url === undefined || corpusPath === undefined || resultPath === undefined) {
  throw new Error("publisher arguments are incomplete")
}

const lines = (await Bun.file(corpusPath).text()).trimEnd().split("\n").slice(1)
const rows = lines.map((line) => Schema.decodeUnknownSync(CorpusRow)(JSON.parse(line), {
  onExcessProperty: "error",
}))

const program = Effect.gen(function* () {
  const subject = yield* factSubject("roundtrip")
  const client = yield* FabricClient
  const published: Array<PublishedEnvelope> = []
  for (const row of rows) {
    published.push(yield* client.publish(subject, row.envelope))
  }
  const first = rows[0]
  if (first === undefined) return yield* Effect.die("the generated corpus is empty")
  const duplicate = yield* client.publish(subject, first.envelope)
  yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({
    digests: published.map((ack) => ack.digest),
    duplicate,
  })))
}).pipe(
  Effect.provide(FabricClient.layer({ servers: url, stream: StreamName.make("PLAIT_SPINE") })),
)

await Effect.runPromise(program)
