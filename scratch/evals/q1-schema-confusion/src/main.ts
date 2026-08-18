/**
 * The harness entrypoint: five commands over one rendering.
 *
 * `generate` writes the committed artifacts, `check` proves they are the
 * byte-identical regeneration of their declared source, `check-control` proves
 * that check can fail, `run` spends the model population, and `report` scores
 * committed raw records without spending anything.
 *
 * @module
 */
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect, Layer, Match, Path, Schema } from "effect"

import { canonicalSlots, plantedDigests } from "./Battery.ts"
import { BUILDER_MODULE_PATH, loadKernelCorpus } from "./Corpus.ts"
import type { RunRecord } from "./Domain.ts"
import {
  makeDirectory,
  readRunRecords,
  readTextIfPresent,
  readToolDocumentSource,
  writeRunRecords,
  writeText,
} from "./Files.ts"
import {
  BASE_PATH,
  compareGenerated,
  GENERATE_COMMAND,
  renderGenerated,
  type Rendered,
} from "./Generated.ts"
import { sha256 } from "./Hashing.ts"
import { ModelRunner, REASONING_EFFORT } from "./ModelRunner.ts"
import { Variants, type ToolDocument, type Variant } from "./Projection.ts"
import {
  analyzeRuns,
  renderFindings,
  renderObservationsCsv,
  renderSummariesCsv,
} from "./Report.ts"

/**
 * The population, preregistered. Ten generations per model/arm cell rather
 * than round 1's five: the discriminating denominator is what carries a
 * comparison, and round 1's was ten calls per arm against a quoted n of eighty.
 */
const ModelAliases = ["haiku", "sonnet"] as const
const Samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

const CONTROL_TRACE_PATH = "negative-controls/generated-check.trace.txt"

export class CliArgumentError extends Schema.TaggedError<CliArgumentError>()(
  "CliArgumentError",
  {
    raw: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class CheckFailedError extends Schema.TaggedError<CheckFailedError>()(
  "CheckFailedError",
  {
    reason: Schema.String,
  },
) {}

const Command = Schema.Literals([
  "generate",
  "run",
  "report",
  "check",
  "check-control",
])
const decodeCommand = Schema.decodeUnknownEffect(Command)

interface Paths {
  readonly root: string
  readonly repository: string
  readonly base: string
  readonly corpus: string
  readonly results: string
  readonly runs: string
}

const resolvePaths = Effect.fn("resolvePaths")(function*() {
  const path = yield* Path.Path
  const root = path.resolve(import.meta.dir, "..")
  const repository = path.resolve(root, "../../..")
  const results = path.join(root, "results")
  return {
    root,
    repository,
    base: path.join(repository, BASE_PATH),
    corpus: path.resolve(root, BUILDER_MODULE_PATH),
    results,
    runs: path.join(results, "runs.ndjson"),
  } satisfies Paths
})

const render = Effect.fn("render")(function*(paths: Paths) {
  const source = yield* readToolDocumentSource(paths.base)
  const corpus = yield* loadKernelCorpus(paths.corpus)
  const baseSha256 = yield* sha256(source.raw)
  return {
    source,
    rendered: renderGenerated({ base: source.document, baseSha256, corpus }),
  }
})

const generateArtifacts = Effect.fn("generateArtifacts")(function*() {
  const paths = yield* resolvePaths()
  const path = yield* Path.Path
  const { rendered, source } = yield* render(paths)

  yield* makeDirectory(path.join(paths.root, "generated"))
  yield* makeDirectory(paths.results)
  for (const [relative, contents] of rendered.files) {
    yield* writeText(path.join(paths.root, relative), contents)
  }

  yield* Effect.logInfo(
    `Q1 GENERATED: wrote ${rendered.files.size} artifacts from ${BASE_PATH} ` +
      `(${rendered.ledger.length} ledger entries, ${rendered.battery.length} tasks)`,
  )
  return { paths, source, rendered }
})

/** Committed bytes for every path the renderer claims, absence included. */
const readCommitted = Effect.fn("readCommitted")(function*(
  paths: Paths,
  rendered: Rendered,
) {
  const path = yield* Path.Path
  const entries = yield* Effect.forEach([...rendered.files.keys()], (relative) =>
    readTextIfPresent(path.join(paths.root, relative)).pipe(
      Effect.map((contents) => [relative, contents] as const),
    ))
  return new Map(entries)
})

const checkGenerated = Effect.fn("checkGenerated")(function*() {
  const paths = yield* resolvePaths()
  const { rendered } = yield* render(paths)
  const committed = yield* readCommitted(paths, rendered)

  // The second rendering is its own arm: an emitter that is not a pure
  // function of its source would pass a one-shot comparison and still make the
  // committed artifacts unreproducible.
  const again = yield* render(paths)
  const deterministic = compareGenerated(again.rendered.files, rendered.files)
  if (!deterministic.ok) {
    return yield* new CheckFailedError({
      reason: `the emitter is not deterministic — ${deterministic.reason}`,
    })
  }

  const result = compareGenerated(committed, rendered.files)
  if (!result.ok) {
    return yield* new CheckFailedError({ reason: result.reason })
  }

  yield* Effect.logInfo(
    `Q1 GENERATED: PASS (byte-identical regeneration of ${result.checked} ` +
      `artifacts from ${BASE_PATH}, emitter deterministic over two runs)`,
  )
})

/**
 * The check, proved able to fail. Three mutations, each refuted on its own
 * named reason, plus the healthy control that shows the unmutated tree passes —
 * without it a red could be blaming the scaffolding rather than the plant.
 */
const checkControl = Effect.fn("checkControl")(function*(write: boolean) {
  const paths = yield* resolvePaths()
  const path = yield* Path.Path
  const { rendered } = yield* render(paths)
  const committed = yield* readCommitted(paths, rendered)

  const target = [...rendered.files.keys()].sort()[0]
  if (target === undefined) {
    return yield* new CheckFailedError({ reason: "the renderer claims no artifact" })
  }

  const mutate = (contents: string): string => `${contents} `
  const planted = new Map(committed)
  planted.set(target, mutate(committed.get(target) ?? ""))

  const dropped = new Map(committed)
  dropped.delete(target)

  const extra = new Map(committed)
  extra.set("generated/never-generated.json", "{}\n")

  const trace = [
    `healthy control: ${describe(compareGenerated(committed, rendered.files))}`,
    `byte mutation:   ${describe(compareGenerated(planted, rendered.files))}`,
    `dropped file:    ${describe(compareGenerated(dropped, rendered.files))}`,
    `extra file:      ${describe(compareGenerated(extra, rendered.files))}`,
    "",
  ].join("\n")

  const tracePath = path.join(paths.root, CONTROL_TRACE_PATH)
  if (write) {
    yield* makeDirectory(path.join(paths.root, "negative-controls"))
    yield* writeText(tracePath, trace)
    yield* Effect.logInfo(`Q1 GENERATED CONTROL: recorded ${CONTROL_TRACE_PATH}`)
    return
  }

  const expected = yield* readTextIfPresent(tracePath)
  if (expected === null) {
    return yield* new CheckFailedError({
      reason: `${CONTROL_TRACE_PATH} is missing; re-record with \`bun run check:generated-control -- --write\``,
    })
  }
  if (expected.replaceAll("\r\n", "\n") !== trace) {
    return yield* new CheckFailedError({
      reason: `the control trace moved\n--- committed ---\n${expected}--- observed ---\n${trace}`,
    })
  }

  yield* Effect.logInfo(
    "Q1 GENERATED CONTROL: PASS (healthy tree accepted; byte mutation, dropped " +
      "artifact, and extra artifact each refused on the committed trace)",
  )
})

const describe = (result: ReturnType<typeof compareGenerated>): string =>
  result.ok ? `PASS (${result.checked} artifacts)` : `FAIL - ${result.reason}`

const reportFrom = Effect.fn("reportFrom")(function*(
  paths: Paths,
  base: ToolDocument,
  rendered: Rendered,
  runs: readonly RunRecord[],
) {
  const analysis = yield* analyzeRuns({
    base,
    tasks: rendered.battery,
    ledger: rendered.ledger,
    plantedDigests: plantedDigests(rendered.ledger),
    canonicalSlots: canonicalSlots(rendered.ledger),
    runs,
  })
  yield* writeText(
    `${paths.results}/observations.csv`,
    renderObservationsCsv(analysis.observations),
  )
  yield* writeText(
    `${paths.results}/by-arm.csv`,
    renderSummariesCsv(analysis.summaries),
  )
  yield* writeText(`${paths.root}/RESULTS.md`, renderFindings(analysis))
  return analysis
})

const runEvaluation = Effect.fn("runEvaluation")(function*() {
  const generated = yield* generateArtifacts()
  const runner = yield* ModelRunner
  const baseSha256 = yield* sha256(generated.source.raw)
  const promptHashes = new Map<Variant, string>()
  for (const variant of Variants) {
    const prompt = generated.rendered.prompts.get(variant)
    if (prompt !== undefined) promptHashes.set(variant, yield* sha256(prompt))
  }

  const requests = ModelAliases.flatMap((modelAlias) =>
    Variants.flatMap((variant) =>
      Samples.map((sample) => ({ modelAlias, variant, sample }))
    )
  )

  const runs = yield* Effect.forEach(requests, ({ modelAlias, variant, sample }) => {
    const prompt = generated.rendered.prompts.get(variant) ?? ""
    return runner.run({
      model_alias: modelAlias,
      variant,
      sample,
      effort: REASONING_EFFORT,
      prompt,
    }).pipe(
      Effect.map((result): RunRecord => ({
        ...result,
        base_sha256: baseSha256,
        prompt_sha256: promptHashes.get(variant) ?? "UNAVAILABLE",
      })),
      Effect.tap((result) => Effect.logInfo(
        `completed model=${result.canonical_model} arm=${variant} sample=${sample}`,
      )),
    )
  }, { concurrency: 2 })

  yield* writeRunRecords(generated.paths.runs, runs)
  const analysis = yield* reportFrom(
    generated.paths,
    generated.source.document,
    generated.rendered,
    runs,
  )
  yield* Effect.logInfo(
    `scored ${analysis.observations.length} calls across ${runs.length} generations`,
  )
})

const reportExisting = Effect.fn("reportExisting")(function*() {
  const paths = yield* resolvePaths()
  const { rendered, source } = yield* render(paths)
  const runs = yield* readRunRecords(paths.runs)
  const analysis = yield* reportFrom(paths, source.document, rendered, runs)
  yield* Effect.logInfo(
    `scored ${analysis.observations.length} calls across ${runs.length} generations`,
  )
})

const program = Effect.gen(function*() {
  const raw = Bun.argv[2] ?? ""
  const command = yield* decodeCommand(raw).pipe(
    Effect.mapError((cause) => new CliArgumentError({ raw, cause })),
  )
  return yield* Match.value(command).pipe(
    Match.when("generate", () => generateArtifacts().pipe(Effect.asVoid)),
    Match.when("run", () => runEvaluation()),
    Match.when("report", () => reportExisting()),
    Match.when("check", () => checkGenerated()),
    Match.when(
      "check-control",
      () => checkControl(Bun.argv.includes("--write")),
    ),
    Match.exhaustive,
    Effect.tapError((error) =>
      error._tag === "CheckFailedError"
        ? Effect.logError(
          `Q1 GENERATED: FAIL - ${error.reason}\n  regenerate with: ${GENERATE_COMMAND}`,
        )
        : Effect.void
    ),
  )
})

const ModelRunnerLive = ModelRunner.layer.pipe(Layer.provide(BunServices.layer))
const AppLayer = Layer.mergeAll(BunServices.layer, ModelRunnerLive)

BunRuntime.runMain(program.pipe(Effect.provide(AppLayer)))
