import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import { emitDeclarations } from "./public-effect-declarations.js"
import {
  debtPins,
  enforceAgainstLedger,
  inspectPublicTypeUniverse,
  parseRatchetPins,
} from "./public-type-universe.js"

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
   * The committed waiver ledger. Report mode regenerates and byte-compares it;
   * enforce mode reads it as the committed side of a comparison whose other
   * side is the declaration walk. The control owns a separate one so its arms
   * fail apart: an accepted mutant is a refused enforcement, never an incidental
   * diff against the package ledger.
   */
  readonly inventoryPath: string
  /** The provenance line the ledger carries: the command that regenerates it. */
  readonly generationCommand: string
}

const readLedger = (
  path: string,
): Effect.Effect<string | undefined, CheckFailure> =>
  Effect.tryPromise({
    try: async () => {
      const file = Bun.file(path)
      return (await file.exists()) ? normalize(await file.text()) : undefined
    },
    catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
  })

/**
 * Report mode, enforce mode, and the negative control enter through this one
 * check. Passing the control declaration project exercises the production
 * `--enforce` branch without creating a second enforcement implementation.
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
  const walked = debtPins(inspection.classifications)

  // Enforce mode answers enforcement alone — waiver coverage, liveness, and the
  // ratchet — and never byte-compares the ledger. Letting it also diff would
  // give the negative control a second way to go red, and the control could no
  // longer name the law it drops (T2). `test:fast` therefore runs BOTH modes.
  if (enforce) {
    const committed = yield* readLedger(input.inventoryPath)
    if (committed === undefined) {
      return yield* new CheckFailure({
        exitCode: 1,
        message: [
          `PUBLIC TYPE UNIVERSE PRECONDITION: the committed waiver ledger is absent: ${input.inventoryPath}`,
          "PUBLIC TYPE UNIVERSE: FAIL — enforce mode has no committed waiver ledger to judge against",
        ].join("\n"),
      })
    }
    const violation = enforceAgainstLedger(inspection.classifications, committed)
    if (violation !== "") {
      return yield* new CheckFailure({ exitCode: 1, message: violation })
    }
    const pins = [...walked.entries()]
      .map(([prefix, count]) => `${prefix} ${count}`)
      .join(", ")
    yield* Console.log(
      `PUBLIC TYPE UNIVERSE: PASS — enforce (${inspection.classifications.length} public types classified; ${
        [...walked.values()].reduce((total, count) => total + count, 0)
      } waivered by the committed ledger, 0 unwaivered; ratchet held at ${pins})`,
    )
    return
  }

  const actual = normalize(inspection.inventory)

  if (write) {
    const committed = yield* readLedger(input.inventoryPath)
    // The ratchet binds regeneration, not only the check. Without this, adding
    // public surface would be a `--write` away from a raised pin and a green
    // gate, and the pin would record whatever the last run happened to walk.
    // Pins bootstrap only when there is no committed ledger at all; raising one
    // afterwards is a hand edit of this file — the operator's act, in a diff.
    if (committed !== undefined) {
      const pins = yield* Effect.try({
        try: () => parseRatchetPins(committed),
        catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
      })
      if (pins === undefined) {
        return yield* new CheckFailure({
          exitCode: 1,
          message: [
            `PUBLIC TYPE UNIVERSE PRECONDITION: the committed ledger carries no ratchet pins: ${input.inventoryPath}`,
            "PUBLIC TYPE UNIVERSE: FAIL — --write refuses to bootstrap pins over an existing ledger",
          ].join("\n"),
        })
      }
      const risen = [...walked.entries()]
        .filter(([prefix, count]) => count > (pins.get(prefix) ?? 0))
        .map(([prefix, count]) =>
          `PUBLIC TYPE UNIVERSE RATCHET: owning prefix=${prefix} walked=${count} pinned=${
            pins.get(prefix) ?? 0
          } — raising a pin is the operator's act, not a regeneration side effect`)
      if (risen.length > 0) {
        return yield* new CheckFailure({
          exitCode: 1,
          message: [
            ...risen,
            "PUBLIC TYPE UNIVERSE: FAIL — --write refuses to raise a ratchet pin",
          ].join("\n"),
        })
      }
    }
    yield* Effect.tryPromise({
      try: () => Bun.write(input.inventoryPath, actual),
      catch: (cause) => new CheckFailure({ exitCode: 1, message: messageOf(cause) }),
    })
    yield* Console.log(
      committed === undefined
        ? "PUBLIC TYPE UNIVERSE: wrote generated waiver ledger and bootstrapped its ratchet pins"
        : "PUBLIC TYPE UNIVERSE: wrote generated waiver ledger",
    )
  } else {
    const expected = yield* readLedger(input.inventoryPath)
    if (actual !== (expected ?? "")) {
      return yield* new CheckFailure({
        exitCode: 1,
        message: [
          "PUBLIC TYPE UNIVERSE: FAIL — committed waiver ledger moved",
          "--- expected ---",
          expected ?? "",
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
