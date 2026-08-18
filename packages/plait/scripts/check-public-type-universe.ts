import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import { emitDeclarations } from "./public-effect-declarations.js"
import { inspectPublicTypeUniverse } from "./public-type-universe.js"

const packageRoot = resolve(import.meta.dir, "..")

export class CheckFailure extends Schema.TaggedError<CheckFailure>()(
  "PublicTypeUniverseCheckFailure",
  {
    exitCode: Schema.Int,
    message: Schema.String,
  },
) {}

export const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause)

export const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

export interface PublicTypeUniverseCheckInput {
  readonly cliArguments: ReadonlyArray<string>
  readonly project: string
  readonly entry: string
  /**
   * The committed ledger this run regenerates and byte-compares. The control
   * owns a separate one so its two arms fail apart: an accepted mutant is a
   * refused enforcement, never an incidental diff against the package ledger.
   */
  readonly inventoryPath: string
  /** The provenance line the ledger carries: the command that regenerates it. */
  readonly generationCommand: string
}

/**
 * Report mode and the negative control enter through this one check. Passing
 * the control declaration project exercises the production `--enforce` branch
 * without creating a second enforcement implementation.
 */
export const checkPublicTypeUniverse = Effect.fn("PublicTypeUniverse.check")(function* (
  input: PublicTypeUniverseCheckInput,
) {
  const arguments_ = input.cliArguments
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
      try: () => emitDeclarations(input.project),
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    }),
    (declarations) => Effect.sync(declarations.dispose),
  )
  const inspection = yield* Effect.try({
    try: () =>
      inspectPublicTypeUniverse(emitted.directory, input.entry, input.generationCommand),
    catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
  })

  if (enforce && inspection.violations !== "") {
    return yield* new CheckFailure({
      exitCode: 1,
      message: `${inspection.violations}PUBLIC TYPE UNIVERSE: FAIL — enforce mode refuses public type debt`,
    })
  }

  const actual = normalize(inspection.inventory)

  // Enforce mode answers one question — is there undischarged debt — and stops.
  // Letting it also byte-compare the ledger would give the negative control a
  // second way to go red, and the control could no longer name the law it drops.
  if (enforce) {
    yield* Console.log(
      `PUBLIC TYPE UNIVERSE: PASS (${inspection.classifications.length} public types classified; no debt-with-a-ticket types)`,
    )
    return
  }

  if (write) {
    yield* Effect.tryPromise({
      try: () => Bun.write(input.inventoryPath, actual),
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    })
    yield* Console.log("PUBLIC TYPE UNIVERSE: wrote generated debt ledger")
  } else {
    const inventory = Bun.file(input.inventoryPath)
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

  const generatedCoreDerived = inspection.classifications.filter(
    ({ classification }) => classification === "derives-from-the-generated-core",
  ).length
  const debt = inspection.classifications.length - generatedCoreDerived

  yield* Console.log(
    `PUBLIC TYPE UNIVERSE: REPORT (${inspection.classifications.length} public types classified: ${generatedCoreDerived} derives-from-the-generated-core, ${debt} debt-with-a-ticket)`,
  )
})

if (import.meta.main) {
  await Effect.runPromise(
    checkPublicTypeUniverse({
      cliArguments: process.argv.slice(2),
      project: "tsconfig.public-declarations.json",
      entry: "src/index.d.ts",
      inventoryPath: resolve(packageRoot, "test/PublicTypeUniverse.inventory.md"),
      generationCommand: "bun run generate:type-universe",
    }).pipe(
      Effect.scoped,
      Effect.catch((failure) =>
        Console.error(failure.message).pipe(
          Effect.andThen(Effect.sync(() => {
            process.exitCode = failure.exitCode
          })),
        )),
    ),
  )
}
