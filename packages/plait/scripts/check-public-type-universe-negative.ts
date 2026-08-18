import { resolve } from "node:path"

import { Console, Effect, Schema } from "effect"

import {
  checkPublicTypeUniverse,
  messageOf,
  normalize,
} from "./check-public-type-universe.js"

const packageRoot = resolve(import.meta.dir, "..")
const tracePath = resolve(
  packageRoot,
  "negative-controls/PublicTypeUniverse.debt.trace.txt",
)

class ControlFailure extends Schema.TaggedError<ControlFailure>()(
  "PublicTypeUniverseControlFailure",
  { message: Schema.String },
) {}

const control = Effect.fn("PublicTypeUniverse.control")(function* () {
  const refusal = yield* checkPublicTypeUniverse({
    cliArguments: ["--enforce"],
    project: "tsconfig.negative-type-universe.json",
    entry: "negative-controls/PublicTypeUniverse.debt.mutant.d.ts",
  }).pipe(
    Effect.flip,
    Effect.mapError(() => new ControlFailure({
      message: "PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforce mode accepted the laundering mutant",
    })),
  )
  const expected = yield* Effect.tryPromise({
    try: () => Bun.file(tracePath).text(),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })
  const actual = normalize(`${refusal.message}\n`)

  if (actual !== normalize(expected)) {
    return yield* new ControlFailure({
      message: [
        "PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforcement trace moved",
        "--- expected ---",
        normalize(expected),
        "--- actual ---",
        actual,
      ].join("\n"),
    })
  }

  yield* Console.log(
    "PUBLIC TYPE UNIVERSE CONTROL: PASS (laundered widening refused by enforce mode; direct generated export admitted)",
  )
})

await Effect.runPromise(
  control().pipe(
    Effect.scoped,
    Effect.catch((failure) =>
      Console.error(failure.message).pipe(
        Effect.andThen(Effect.sync(() => {
          process.exitCode = 1
        })),
      )),
  ),
)
