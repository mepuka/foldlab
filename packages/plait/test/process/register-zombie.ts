import { Effect, Result, Schema } from "effect"

import { Registers } from "../../src/planes/Register.js"

const [url, work, tokenText, outputPath] = process.argv.slice(2)
if (url === undefined || work === undefined || tokenText === undefined || outputPath === undefined) {
  throw new Error("usage: register-zombie URL WORK TOKEN OUTPUT_PATH")
}
const token = Schema.decodeUnknownSync(Schema.NumberFromString)(tokenText)

const result = await Effect.runPromise(Effect.gen(function* () {
  const registers = yield* Registers
  return yield* Effect.result(registers.commit(work, token, "zombie"))
}).pipe(
  Effect.provide(Registers.layer({ servers: url, connectionName: "ts-zombie" })),
  Effect.scoped,
))

if (Result.isSuccess(result)) throw new Error("zombie stale commit unexpectedly landed")
await Bun.write(outputPath, JSON.stringify({
  kind: result.failure.kind,
  law: result.failure.law,
}))
