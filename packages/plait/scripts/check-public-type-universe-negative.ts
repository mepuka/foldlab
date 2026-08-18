import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import { emitDeclarations } from "./public-effect-declarations.js"
import { inspectPublicTypeUniverse } from "./public-type-universe.js"

const packageRoot = resolve(import.meta.dir, "..")
const tracePath = resolve(
  packageRoot,
  "negative-controls/PublicTypeUniverse.debt.trace.txt",
)

class ControlFailure extends Schema.TaggedError<ControlFailure>()(
  "PublicTypeUniverseControlFailure",
  { message: Schema.String },
) {}

const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause)

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const control = Effect.fn("PublicTypeUniverse.control")(function* () {
  const emitted = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => emitDeclarations("tsconfig.negative-type-universe.json"),
      catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
    }),
    (declarations) => Effect.sync(declarations.dispose),
  )

  const inspection = yield* Effect.try({
    try: () => inspectPublicTypeUniverse(
      emitted.directory,
      "negative-controls/PublicTypeUniverse.debt.mutant.d.ts",
    ),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })
  const expected = yield* Effect.tryPromise({
    try: () => Bun.file(tracePath).text(),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })
  const actual = normalize(inspection.violations)

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

  const anchored = inspection.classifications.find(
    ({ publicType }) => publicType === "GeneratedCoreControl",
  )
  if (anchored?.classification !== "derives-from-the-generated-core") {
    return yield* new ControlFailure({
      message: "PUBLIC TYPE UNIVERSE CONTROL: FAIL — anchored sibling did not derive from the generated core",
    })
  }

  yield* Console.log(
    "PUBLIC TYPE UNIVERSE CONTROL: PASS (planted ticketed debt refused; generated-core sibling admitted)",
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
