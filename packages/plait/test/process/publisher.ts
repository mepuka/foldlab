import { Effect, Schema } from "effect"

import { Digest } from "../../src/Digest.js"
import { FabricClient, type PublishedEnvelope } from "../../src/FabricClient.js"
import { evidenceSubject } from "../../src/Subjects.js"
import { Envelope } from "../../src/Wire.js"

const CorpusRow = Schema.Struct({
  case: Schema.String,
  digest: Digest,
  envelope: Envelope,
})

const [url, corpusPath, resultPath] = process.argv.slice(2)
const subject = evidenceSubject("roundtrip", 0)
if (url === undefined || corpusPath === undefined || resultPath === undefined || !subject.ok) {
  throw new Error("publisher arguments are incomplete")
}

const lines = (await Bun.file(corpusPath).text()).trimEnd().split("\n").slice(1)
const rows = lines.map((line) => Schema.decodeUnknownSync(CorpusRow)(JSON.parse(line), {
  onExcessProperty: "error",
}))

const program = Effect.gen(function* () {
  const client = yield* FabricClient
  const published: Array<PublishedEnvelope> = []
  for (const row of rows) {
    published.push(yield* client.publish(subject.subject, row.envelope))
  }
  yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({
    digests: published.map((ack) => ack.digest),
  })))
}).pipe(
  Effect.provide(FabricClient.layer({ servers: url, stream: "PLAIT_SPINE" })),
)

await Effect.runPromise(program)
