import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { resolve, sep } from "node:path"

import { Console, Effect, Schema } from "effect"

import {
  checkPublicTypeUniverse,
  messageOf,
  normalize,
} from "./check-public-type-universe.js"
import { isEnforcementRefusal } from "./public-type-universe.js"

const packageRoot = resolve(import.meta.dir, "..")
const ledgerPath = resolve(
  packageRoot,
  "negative-controls/PublicTypeUniverse.debt.ledger.md",
)
const mutationCache = resolve(packageRoot, "node_modules/.cache")

const controlProject = "tsconfig.negative-type-universe.json"
const controlEntry = "negative-controls/PublicTypeUniverse.debt.mutant.d.ts"

class ControlFailure extends Schema.TaggedError<ControlFailure>()(
  "PublicTypeUniverseControlFailure",
  { message: Schema.String },
) {}

const run = (cliArguments: ReadonlyArray<string>, inventoryPath: string) =>
  checkPublicTypeUniverse({
    cliArguments,
    project: controlProject,
    entry: controlEntry,
    inventoryPath,
    generationCommand: "bun run generate:type-universe-control",
  }).pipe(Effect.scoped)

const rowIndex = (lines: ReadonlyArray<string>, publicType: string): number => {
  const index = lines.findIndex((line) => line.startsWith(`| \`${publicType}\` |`))
  if (index === -1) throw new Error(`planted ledger carries no row for ${publicType}`)
  return index
}

const replaceLine = (
  lines: ReadonlyArray<string>,
  index: number,
  line: string,
): ReadonlyArray<string> => [...lines.slice(0, index), line, ...lines.slice(index + 1)]

/**
 * The three ledger mutations, each aimed at one enforcement stage.
 *
 * The gate compares a declaration walk against a committed ledger, so a planted
 * NEW public type and a ledger that stopped naming an existing one are the same
 * edge approached from opposite sides — and the ledger side is the one that can
 * be mutated without invalidating the admission arm's committed artifact, which
 * report mode regenerates from the walk. Mutating the ledger is therefore how
 * the control plants: drop a waiver and the walk carries surface no waiver
 * covers; lower a pin and a prefix's walked count sits above it.
 */
const mutations: ReadonlyArray<{
  readonly name: string
  readonly trace: string
  readonly why: string
  readonly mutate: (lines: ReadonlyArray<string>) => ReadonlyArray<string>
}> = [
  {
    name: "unwaivered",
    trace: "negative-controls/PublicTypeUniverse.unwaivered.trace.txt",
    why: "a public type the ledger grants no waiver for",
    mutate: (lines) => {
      const index = rowIndex(lines, "LaunderedAlias")
      return [...lines.slice(0, index), ...lines.slice(index + 1)]
    },
  },
  {
    name: "ratchet",
    trace: "negative-controls/PublicTypeUniverse.ratchet.trace.txt",
    why: "a prefix whose walked debt count rose above its pin",
    mutate: (lines) => {
      const index = lines.findIndex((line) => line.startsWith("| `negative-controls` | "))
      if (index === -1) throw new Error("planted ledger carries no negative-controls pin")
      const line = lines[index] as string
      const pinned = Number.parseInt(line.slice("| `negative-controls` | ".length, -2), 10)
      if (!Number.isInteger(pinned) || pinned < 1) {
        throw new Error(`planted ledger pin is not a lowerable count: ${line}`)
      }
      return replaceLine(lines, index, `| \`negative-controls\` | ${pinned - 1} |`)
    },
  },
  {
    name: "liveness",
    trace: "negative-controls/PublicTypeUniverse.liveness.trace.txt",
    why: "a waiver citing DEV-763, the ticket that closed under the package's rows",
    mutate: (lines) => {
      const index = rowIndex(lines, "LaunderedAugmentation")
      return replaceLine(lines, index, (lines[index] as string).replace("`DEV-795`", "`DEV-763`"))
    },
  },
]

const readLedger = Effect.tryPromise({
  try: () => Bun.file(ledgerPath).text(),
  catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
})

/**
 * Applies one mutation to the committed planted ledger and runs the production
 * enforce branch against the result. A mutation that changes no bytes is a
 * control that proves nothing, so it is a failure in its own right.
 */
const refuseMutation = Effect.fn("PublicTypeUniverse.control.mutate")(function* (
  mutation: (typeof mutations)[number],
) {
  const committed = yield* readLedger
  const lines = normalize(committed).split("\n")
  const mutated = yield* Effect.try({
    try: () => mutation.mutate(lines).join("\n"),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })
  if (mutated === normalize(committed)) {
    return yield* new ControlFailure({
      message: `PUBLIC TYPE UNIVERSE CONTROL: FAIL — the ${mutation.name} mutation changed no bytes`,
    })
  }

  const directory = yield* Effect.acquireRelease(
    Effect.try({
      try: () => {
        mkdirSync(mutationCache, { recursive: true })
        return mkdtempSync(resolve(mutationCache, "plait-type-universe-control-"))
      },
      catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
    }),
    (directory) =>
      Effect.sync(() => {
        if (!resolve(directory).startsWith(`${resolve(mutationCache)}${sep}`)) return
        rmSync(directory, { recursive: true, force: true })
      }),
  )
  const mutatedPath = resolve(directory, "PublicTypeUniverse.mutated.ledger.md")
  yield* Effect.tryPromise({
    try: () => Bun.write(mutatedPath, mutated),
    catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
  })

  const refusal = yield* run(["--enforce"], mutatedPath).pipe(
    Effect.flip,
    Effect.mapError(() =>
      new ControlFailure({
        message: `PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforce mode accepted ${mutation.why}`,
      })),
  )
  // `Effect.flip` succeeds on ANY failure of the enforce run — an emission error
  // or a thrown walk would reach the trace comparison and be reported as a moved
  // trace. The refusal contract separates the two: enforcement speaks in its own
  // three violation vocabularies, so a failure that opens with anything else
  // means the walk died before enforcement refused.
  if (!isEnforcementRefusal(refusal.message)) {
    return yield* new ControlFailure({
      message: [
        `PUBLIC TYPE UNIVERSE CONTROL: FAIL — the walk died before the ${mutation.name} arm refused`,
        refusal.message,
      ].join("\n"),
    })
  }
  return normalize(`${refusal.message}\n`)
})

/**
 * Five arms over one planted pair, ordered so each fails for its own law.
 *
 * The waiver arm runs first and owns the admission question alone: the planted
 * ledger waivers every planted twin, so enforce mode must go GREEN on it. An
 * enforcement branch that started refusing waivered debt fails here, and the
 * three mutation arms then require it to refuse for each of its three reasons —
 * unwaivered surface, a dead ticket citation, and a risen prefix count. Because
 * every arm runs against a ledger of the control's own, an enforcement branch
 * that stopped refusing altogether is reported as an accepted mutant and never
 * as an unrelated diff against the package ledger. The admission arm runs last
 * and pins the classification itself — a laundering rule that blessed any of
 * the six hand-written twins moves the committed counts, and a rule that
 * stopped admitting the direct re-export moves them too.
 */
const control = Effect.fn("PublicTypeUniverse.control")(function* () {
  yield* run(["--enforce"], ledgerPath).pipe(
    Effect.mapError((failure) =>
      new ControlFailure({
        message: [
          "PUBLIC TYPE UNIVERSE CONTROL: FAIL — enforce mode refused the planted ledger's own waivers",
          failure.message,
        ].join("\n"),
      })),
  )

  for (const mutation of mutations) {
    const actual = yield* refuseMutation(mutation)
    const tracePath = resolve(packageRoot, mutation.trace)
    const expected = yield* Effect.tryPromise({
      try: () => Bun.file(tracePath).text(),
      catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
    })
    if (actual !== normalize(expected)) {
      return yield* new ControlFailure({
        message: [
          `PUBLIC TYPE UNIVERSE CONTROL: FAIL — the ${mutation.name} arm's trace moved`,
          "--- expected ---",
          normalize(expected),
          "--- actual ---",
          actual,
        ].join("\n"),
      })
    }
  }

  yield* run([], ledgerPath).pipe(
    Effect.mapError((failure) =>
      new ControlFailure({
        message: [
          "PUBLIC TYPE UNIVERSE CONTROL: FAIL — planted classification moved",
          failure.message,
        ].join("\n"),
      })),
  )

  yield* Console.log(
    "PUBLIC TYPE UNIVERSE CONTROL: PASS (planted waivers admitted by enforce mode; unwaivered, liveness, and ratchet mutations each refused for their own reason; direct generated export admitted)",
  )
})

/**
 * Every committed artifact comes from executing the control, never from a hand
 * typed transcription: the planted ledger from report mode, each enforcement
 * trace from the refusal that mutation actually raises.
 */
const regenerate = Effect.fn("PublicTypeUniverse.control.write")(function* () {
  yield* run(["--write"], ledgerPath).pipe(
    Effect.mapError((failure) => new ControlFailure({ message: failure.message })),
  )
  for (const mutation of mutations) {
    const trace = yield* refuseMutation(mutation)
    yield* Effect.tryPromise({
      try: () => Bun.write(resolve(packageRoot, mutation.trace), trace),
      catch: (cause) => new ControlFailure({ message: messageOf(cause) }),
    })
  }
  yield* Console.log(
    "PUBLIC TYPE UNIVERSE CONTROL: wrote planted ledger and three enforcement traces",
  )
})

await Effect.runPromise(
  (process.argv.slice(2).includes("--write") ? regenerate() : control()).pipe(
    Effect.scoped,
    Effect.catch((failure) =>
      Console.error(failure.message).pipe(
        Effect.andThen(Effect.sync(() => {
          process.exitCode = 1
        })),
      )),
  ),
)
