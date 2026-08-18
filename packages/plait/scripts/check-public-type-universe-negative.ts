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
const ledgerPath = resolve(
  packageRoot,
  "negative-controls/PublicTypeUniverse.debt.ledger.md",
)

const controlProject = "tsconfig.negative-type-universe.json"
const controlEntry = "negative-controls/PublicTypeUniverse.debt.mutant.d.ts"

class ControlFailure extends Schema.TaggedError<ControlFailure>()(
  "PublicTypeUniverseControlFailure",
  { message: Schema.String },
) {}

const run = (cliArguments: ReadonlyArray<string>) =>
  checkPublicTypeUniverse({
    cliArguments,
    project: controlProject,
    entry: controlEntry,
    inventoryPath: ledgerPath,
    generationCommand: "bun run generate:type-universe-control",
  }).pipe(Effect.scoped)

/**
 * Two arms over one planted pair, ordered so each fails for its own law.
 *
 * The refusal arm runs first and owns the enforcement question alone: because
 * the control byte-compares its own ledger rather than the package's, an
 * enforcement branch that stopped refusing falls through to a ledger that still
 * matches, and the arm reports the accepted mutant instead of an unrelated
 * diff. The admission arm then pins the classification itself — a laundering
 * rule that blessed any of the six hand-written twins moves the committed
 * counts, and a rule that stopped admitting the direct re-export moves them too.
 */
const control = Effect.fn("PublicTypeUniverse.control")(function* () {
  const refusal = yield* run(["--enforce"]).pipe(
    Effect.flip,
    Effect.mapError(() =>
      new ControlFailure({
        message:
          "PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforce mode accepted the laundering mutant",
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

  yield* run([]).pipe(
    Effect.mapError((failure) =>
      new ControlFailure({
        message: [
          "PUBLIC TYPE UNIVERSE CONTROL: FAIL — planted classification moved",
          failure.message,
        ].join("\n"),
      })),
  )

  yield* Console.log(
    "PUBLIC TYPE UNIVERSE CONTROL: PASS (six hand-written twins refused by enforce mode, augmentation among them; direct generated export admitted)",
  )
})

/**
 * Both committed artifacts come from executing the control, never from a hand
 * typed transcription: the planted ledger from report mode, the enforcement
 * trace from the refusal enforce mode actually raises.
 */
const regenerate = Effect.fn("PublicTypeUniverse.control.write")(function* () {
  yield* run(["--write"]).pipe(
    Effect.mapError((failure) => new ControlFailure({ message: failure.message })),
  )
  const refusal = yield* run(["--enforce"]).pipe(
    Effect.flip,
    Effect.mapError(() =>
      new ControlFailure({
        message:
          "PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforce mode accepted the laundering mutant, so there is no trace to record",
      })),
  )
  yield* Effect.tryPromise({
    try: () => Bun.write(tracePath, normalize(`${refusal.message}\n`)),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })
  yield* Console.log("PUBLIC TYPE UNIVERSE CONTROL: wrote planted ledger and enforcement trace")
})

await Effect.runPromise(
  (process.argv.slice(2).includes("--write") ? regenerate() : control()).pipe(
    Effect.catch((failure) =>
      Console.error(failure.message).pipe(
        Effect.andThen(Effect.sync(() => {
          process.exitCode = 1
        })),
      )),
  ),
)
