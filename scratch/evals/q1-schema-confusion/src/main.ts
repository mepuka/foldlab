import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect, Layer, Match, Path, Schema } from "effect"

import {
  Battery,
  CandidateDigests,
  PlantedDigestValues,
} from "./Battery.ts"
import type { RunRecord } from "./Domain.ts"
import {
  makeDirectory,
  readRunRecords,
  readToolDocumentSource,
  writeRunRecords,
  writeText,
} from "./Files.ts"
import { sha256 } from "./Hashing.ts"
import { ModelRunner } from "./ModelRunner.ts"
import { makePrompt } from "./Prompt.ts"
import { projectToolDocument, Variants, type ToolDocument, type Variant } from "./Projection.ts"
import {
  analyzeRuns,
  renderFindings,
  renderObservationsCsv,
  renderSummariesCsv,
} from "./Report.ts"

const ModelAliases = ["haiku", "sonnet"] as const
const Samples = [1, 2, 3, 4, 5] as const

export class CliArgumentError extends Schema.TaggedError<CliArgumentError>()(
  "CliArgumentError",
  {
    raw: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const Command = Schema.Literals(["generate", "run", "report"])
const decodeCommand = Schema.decodeUnknownEffect(Command)

interface Paths {
  readonly root: string
  readonly base: string
  readonly generated: string
  readonly results: string
  readonly runs: string
}

const resolvePaths = Effect.fn("resolvePaths")(function*() {
  const path = yield* Path.Path
  const root = path.resolve(import.meta.dir, "..")
  const results = path.join(root, "results")
  return {
    root,
    base: path.resolve(root, "../../../verify/kernel/projections/tools.schema.json"),
    generated: path.join(root, "generated"),
    results,
    runs: path.join(results, "runs.ndjson"),
  } satisfies Paths
})

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

const generatedSchemaPath = (paths: Paths, variant: Variant): string =>
  `${paths.generated}/tools.${variant}.schema.json`

const generatedPromptPath = (paths: Paths, variant: Variant): string =>
  `${paths.generated}/prompt.${variant}.json`

const generateArtifacts = Effect.fn("generateArtifacts")(function*() {
  const paths = yield* resolvePaths()
  const source = yield* readToolDocumentSource(paths.base)
  yield* makeDirectory(paths.generated)
  yield* makeDirectory(paths.results)

  const prompts = new Map<Variant, string>()
  for (const variant of Variants) {
    const tools = projectToolDocument(source.document, variant)
    const prompt = makePrompt({ tools, tasks: Battery, candidates: CandidateDigests })
    prompts.set(variant, prompt)
    yield* writeText(generatedSchemaPath(paths, variant), json(tools))
    yield* writeText(generatedPromptPath(paths, variant), `${prompt}\n`)
  }
  yield* writeText(`${paths.generated}/battery.json`, json({
    candidates: CandidateDigests,
    tasks: Battery,
  }))

  return { paths, source, prompts }
})

const reportFrom = Effect.fn("reportFrom")(function*(
  paths: Paths,
  base: ToolDocument,
  runs: readonly RunRecord[],
) {
  const analysis = yield* analyzeRuns({
    base,
    tasks: Battery,
    plantedDigests: PlantedDigestValues,
    runs,
  })
  yield* writeText(`${paths.results}/observations.csv`, renderObservationsCsv(analysis.observations))
  yield* writeText(`${paths.results}/by-arm.csv`, renderSummariesCsv(analysis.summaries))
  yield* writeText(`${paths.root}/RESULTS.md`, renderFindings(analysis))
  return analysis
})

const runEvaluation = Effect.fn("runEvaluation")(function*() {
  const generated = yield* generateArtifacts()
  const runner = yield* ModelRunner
  const baseSha256 = yield* sha256(generated.source.raw)
  const promptHashes = new Map<Variant, string>()
  for (const variant of Variants) {
    const prompt = generated.prompts.get(variant)
    if (prompt !== undefined) promptHashes.set(variant, yield* sha256(prompt))
  }

  const requests = ModelAliases.flatMap((modelAlias) =>
    Variants.flatMap((variant) =>
      Samples.map((sample) => ({ modelAlias, variant, sample }))
    )
  )

  const runs = yield* Effect.forEach(requests, ({ modelAlias, variant, sample }) => {
    const prompt = generated.prompts.get(variant) ?? ""
    return runner.run({
      model_alias: modelAlias,
      variant,
      sample,
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
    runs,
  )
  yield* Effect.logInfo(
    `scored ${analysis.observations.length} calls across ${runs.length} generations`,
  )
})

const reportExisting = Effect.fn("reportExisting")(function*() {
  const paths = yield* resolvePaths()
  const source = yield* readToolDocumentSource(paths.base)
  const runs = yield* readRunRecords(paths.runs)
  const analysis = yield* reportFrom(paths, source.document, runs)
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
    Match.exhaustive,
  )
})

const ModelRunnerLive = ModelRunner.layer.pipe(Layer.provide(BunServices.layer))
const AppLayer = Layer.mergeAll(BunServices.layer, ModelRunnerLive)

BunRuntime.runMain(program.pipe(Effect.provide(AppLayer)))
