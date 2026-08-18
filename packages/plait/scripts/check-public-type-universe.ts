import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import { emitDeclarations } from "./public-effect-declarations.js"
import { inspectPublicTypeUniverse } from "./public-type-universe.js"

const packageRoot = resolve(import.meta.dir, "..")
const inventoryPath = resolve(packageRoot, "test/PublicTypeUniverse.inventory.md")

class CheckFailure extends Schema.TaggedError<CheckFailure>()(
  "PublicTypeUniverseCheckFailure",
  {
    exitCode: Schema.Int,
    message: Schema.String,
  },
) {}

const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause)

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const check = Effect.fn("PublicTypeUniverse.check")(function* () {
  const arguments_ = process.argv.slice(2)
  const unknown = arguments_.find((argument) =>
    argument !== "--write" && argument !== "--enforce")
  if (unknown !== undefined) {
    return yield* new CheckFailure({
      exitCode: 2,
      message: `usage: bun scripts/check-public-type-universe.ts [--write] [--enforce]\nunknown argument: ${unknown}`,
    })
  }
  const write = arguments_.includes("--write")
  const enforce = arguments_.includes("--enforce")

  const emitted = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => emitDeclarations("tsconfig.public-declarations.json"),
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    }),
    (declarations) => Effect.sync(declarations.dispose),
  )
  const inspection = yield* Effect.try({
    try: () => inspectPublicTypeUniverse(emitted.directory, "src/index.d.ts"),
    catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
  })
  const actual = normalize(inspection.inventory)

  if (write) {
    yield* Effect.tryPromise({
      try: () => Bun.write(inventoryPath, actual),
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    })
    yield* Console.log("PUBLIC TYPE UNIVERSE: wrote generated debt ledger")
  } else {
    const inventory = Bun.file(inventoryPath)
    const expected = yield* Effect.tryPromise({
      try: async () => {
        const exists = await inventory.exists()
        return exists ? normalize(await inventory.text()) : ""
      },
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    })
    if (actual !== expected) {
      return yield* new CheckFailure({
        exitCode: 1,
        message: [
          "PUBLIC TYPE UNIVERSE: FAIL — committed debt ledger moved",
          "--- expected ---",
          expected,
          "--- actual ---",
          actual,
        ].join("\n"),
      })
    }
  }

  const corpusDerived = inspection.classifications.filter(
    ({ classification }) => classification === "corpus-derived",
  ).length
  const truthFloor = inspection.classifications.filter(
    ({ classification }) => classification === "truth-floor",
  ).length
  const untraced = inspection.classifications.length - corpusDerived - truthFloor

  if (enforce && inspection.violations !== "") {
    return yield* new CheckFailure({
      exitCode: 1,
      message: `${inspection.violations}PUBLIC TYPE UNIVERSE: FAIL — enforce mode refuses UNTRACED public types`,
    })
  }

  yield* Console.log(
    enforce
      ? `PUBLIC TYPE UNIVERSE: PASS (${inspection.classifications.length} public types classified; no UNTRACED types)`
      : `PUBLIC TYPE UNIVERSE: REPORT (${inspection.classifications.length} public types classified: ${corpusDerived} corpus-derived, ${truthFloor} truth-floor, ${untraced} UNTRACED)`,
  )
})

await Effect.runPromise(
  check().pipe(
    Effect.scoped,
    Effect.catch((failure) =>
      Console.error(failure.message).pipe(
        Effect.andThen(Effect.sync(() => {
          process.exitCode = failure.exitCode
        })),
      )),
  ),
)
