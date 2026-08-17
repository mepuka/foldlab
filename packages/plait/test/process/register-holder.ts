import { Effect } from "effect"

import { Registers } from "../../src/Register.js"

const [url, work, readyPath] = process.argv.slice(2)
if (url === undefined || work === undefined || readyPath === undefined) {
  throw new Error("usage: register-holder URL WORK READY_PATH")
}

await Effect.runPromise(Effect.gen(function* () {
  const registers = yield* Registers
  const state = yield* registers.grant(work, "ts-holder")
  yield* Effect.promise(() => Bun.write(readyPath, JSON.stringify({ token: state.token })))
  return yield* Effect.never
}).pipe(
  Effect.provide(Registers.layer({ servers: url, connectionName: "ts-crash-holder" })),
  Effect.scoped,
))
