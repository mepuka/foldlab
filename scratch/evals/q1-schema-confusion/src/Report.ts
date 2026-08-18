import { Effect } from "effect"

import type { RunRecord } from "./Domain.ts"
import {
  projectToolDocument,
  Variants,
  type ToolDocument,
  type Variant,
} from "./Projection.ts"
import {
  compileToolValidators,
  scoreRun,
  wilson95,
  type BatteryTask,
  type Observation,
} from "./Scoring.ts"

export interface ScoredObservation extends Observation {
  readonly model_alias: string
  readonly canonical_model: string
  readonly variant: Variant
  readonly sample: number
}

export interface Rate {
  readonly successes: number
  readonly total: number
  readonly rate: number
  readonly low: number
  readonly high: number
}

export interface Summary {
  readonly scope: "combined" | "model"
  readonly model_alias: string
  readonly canonical_model: string
  readonly variant: Variant
  readonly generations: number
  readonly calls: number
  readonly valid_call: Rate
  readonly field_confusion: Rate
  readonly digest_in_wrong_slot: Rate
  readonly missing: number
  readonly duplicate: number
  readonly wrong_tool: number
  readonly schema_invalid: number
  readonly omitted_expected_fields: number
}

export interface Analysis {
  readonly observations: readonly ScoredObservation[]
  readonly summaries: readonly Summary[]
  readonly runs: readonly RunRecord[]
  readonly base_sha256: string
}

const rate = (successes: number, total: number): Rate => {
  const interval = wilson95(successes, total)
  return {
    successes,
    total,
    rate: total === 0 ? 0 : successes / total,
    ...interval,
  }
}

const summarize = (options: {
  readonly scope: Summary["scope"]
  readonly model_alias: string
  readonly canonical_model: string
  readonly variant: Variant
  readonly observations: readonly ScoredObservation[]
}): Summary => {
  const rows = options.observations
  const count = (field: keyof Observation): number =>
    rows.filter((row) => row[field] === true).length
  const generations = new Set(
    rows.map((row) => `${row.model_alias}:${row.canonical_model}:${row.sample}`),
  ).size

  return {
    scope: options.scope,
    model_alias: options.model_alias,
    canonical_model: options.canonical_model,
    variant: options.variant,
    generations,
    calls: rows.length,
    valid_call: rate(count("valid_call"), rows.length),
    field_confusion: rate(count("field_confusion"), rows.length),
    digest_in_wrong_slot: rate(count("digest_in_wrong_slot"), rows.length),
    missing: count("missing"),
    duplicate: count("duplicate"),
    wrong_tool: count("wrong_tool"),
    schema_invalid: count("schema_invalid"),
    omitted_expected_fields: rows.reduce(
      (total, row) => total + row.omitted_expected_fields,
      0,
    ),
  }
}

export const analyzeRuns = Effect.fn("analyzeRuns")(
  function*(options: {
    readonly base: ToolDocument
    readonly tasks: readonly BatteryTask[]
    readonly plantedDigests: readonly string[]
    readonly runs: readonly RunRecord[]
  }) {
    const validatorEntries = yield* Effect.forEach(Variants, (variant) =>
      compileToolValidators(projectToolDocument(options.base, variant)).pipe(
        Effect.map((validators) => [variant, validators] as const),
      )
    )
    const validatorsByVariant = new Map(validatorEntries)

    const observations = options.runs.flatMap((run): readonly ScoredObservation[] => {
      const validators = validatorsByVariant.get(run.variant)
      if (validators === undefined) return []
      return scoreRun({
        tasks: options.tasks,
        variant: run.variant,
        base: options.base,
        validators,
        plantedDigests: options.plantedDigests,
        response: run.response,
      }).map((observation) => ({
        ...observation,
        model_alias: run.model_alias,
        canonical_model: run.canonical_model,
        variant: run.variant,
        sample: run.sample,
      }))
    })

    const combined = Variants.map((variant) => summarize({
      scope: "combined",
      model_alias: "all",
      canonical_model: "all",
      variant,
      observations: observations.filter((row) => row.variant === variant),
    }))
    const modelKeys = [...new Set(options.runs.map((run) =>
      `${run.model_alias}\u0000${run.canonical_model}`
    ))].sort()
    const byModel = modelKeys.flatMap((key) => {
      const [modelAlias = "", canonicalModel = ""] = key.split("\u0000")
      return Variants.map((variant) => summarize({
        scope: "model",
        model_alias: modelAlias,
        canonical_model: canonicalModel,
        variant,
        observations: observations.filter((row) =>
          row.model_alias === modelAlias &&
          row.canonical_model === canonicalModel &&
          row.variant === variant
        ),
      }))
    })

    return {
      observations,
      summaries: [...combined, ...byModel],
      runs: options.runs,
      base_sha256: options.runs[0]?.base_sha256 ?? "UNAVAILABLE",
    }
  },
)

const percentage = (value: number): string => `${(value * 100).toFixed(1)}%`

const formatRate = (value: Rate): string =>
  `${value.successes}/${value.total} (${percentage(value.rate)}; 95% CI ${percentage(value.low)}–${percentage(value.high)})`

const intervalsOverlap = (left: Rate, right: Rate): boolean =>
  left.low <= right.high && right.low <= left.high

const verdict = (summaries: readonly Summary[]): string => {
  const find = (variant: Variant): Summary | undefined =>
    summaries.find((row) => row.scope === "combined" && row.variant === variant)
  const compound = find("compound")
  const alternatives = [find("bare"), find("nested")]

  if (compound === undefined || alternatives.some((row) => row === undefined)) {
    return "The evaluation is incomplete because one or more preregistered arms has no summary."
  }

  const completeAlternatives = alternatives.filter((row): row is Summary => row !== undefined)
  const directionHolds = completeAlternatives.every((row) =>
    compound.valid_call.rate >= row.valid_call.rate &&
    compound.field_confusion.rate <= row.field_confusion.rate &&
    compound.digest_in_wrong_slot.rate <= row.digest_in_wrong_slot.rate
  )
  const separated = completeAlternatives.every((row) =>
    !intervalsOverlap(compound.valid_call, row.valid_call) &&
    !intervalsOverlap(compound.field_confusion, row.field_confusion) &&
    !intervalsOverlap(compound.digest_in_wrong_slot, row.digest_in_wrong_slot)
  )

  if (directionHolds && separated) {
    return "The compound convention is supported for this measured population under the preregistered rule."
  }
  return "The evaluation is inconclusive under the preregistered rule; the observed differences do not separate all three call-level Wilson intervals."
}

const modelVersionLines = (runs: readonly RunRecord[]): readonly string[] => {
  const pairs = [...new Set(runs.map((run) =>
    `${run.model_alias}\u0000${run.canonical_model}`
  ))].sort()
  return pairs.map((pair) => {
    const [alias = "", canonical = ""] = pair.split("\u0000")
    return `- \`${alias}\` resolved to \`${canonical}\`.`
  })
}

const independentGenerationsPerCell = (runs: readonly RunRecord[]): string => {
  const counts = new Map<string, number>()
  for (const run of runs) {
    const key = `${run.model_alias}:${run.canonical_model}:${run.variant}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const values = [...counts.values()]
  if (values.length === 0) return "0"
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  return minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`
}

const plural = (count: number, singular: string): string =>
  count === 1 ? singular : `${singular}s`

const confusionDiagnostics = (
  observations: readonly ScoredObservation[],
): string => {
  const confused = observations.filter((row) => row.field_confusion)
  const validAndConfused = confused.filter((row) => row.valid_call).length
  const byTask = new Map<string, number>()
  for (const row of confused) {
    byTask.set(row.task_id, (byTask.get(row.task_id) ?? 0) + 1)
  }
  const taskCounts = [...byTask.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([task, count]) => `${count} on \`${task}\``)

  if (confused.length === 0) {
    return "No returned call met the preregistered field-confusion definition."
  }

  const [largest] = [...byTask.entries()].sort((left, right) => right[1] - left[1])
  const concentration = largest !== undefined && largest[1] > confused.length / 2
    ? ` The concentration on \`${largest[0]}\` means the aggregate arm rates primarily measure behavior on one synthetic task, not a broad cross-tool effect.`
    : ""

  return `${confused.length} returned ${plural(confused.length, "call")} met the field-confusion definition (${taskCounts.join(", ")}); ${validAndConfused} of those remained syntactically valid against the projected tool schema.${concentration}`
}

export const renderFindings = (analysis: Analysis): string => {
  const result = verdict(analysis.summaries)
  const combined = analysis.summaries.filter((row) => row.scope === "combined")
  const byModel = analysis.summaries.filter((row) => row.scope === "model")
  const totalCost = analysis.runs.reduce((sum, run) => sum + run.total_cost_usd, 0)
  const generations = independentGenerationsPerCell(analysis.runs)
  const callsPerGeneration = analysis.runs.length === 0
    ? 0
    : analysis.observations.length / analysis.runs.length

  const table = (rows: readonly Summary[]): string => [
    "| Model | Arm | Calls | Valid call | Field confusion | Digest in wrong slot |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...rows.map((row) =>
      `| ${row.canonical_model} | ${row.variant} | ${row.calls} | ${formatRate(row.valid_call)} | ${formatRate(row.field_confusion)} | ${formatRate(row.digest_in_wrong_slot)} |`
    ),
  ].join("\n")

  return `# Q1 kernel tool-schema confusion findings

Status: **MEASURED** — fixed local evaluation, not a durable model-independent claim.

${result} The run completed ${analysis.runs.length} independent generations and scored ${analysis.observations.length} calls against base SHA-256 \`${analysis.base_sha256}\`.

## Combined result

${table(combined)}

## Result by model version

${table(byModel)}

## Population

${modelVersionLines(analysis.runs).join("\n")}

The sample has ${generations} independent ${generations === "1" ? "generation" : "generations"} per model/arm cell, with ${callsPerGeneration} calls produced inside each generation. The call-level Wilson intervals do not adjust for that within-generation correlation. The provider path exposed no seed or temperature control. Total provider-reported cost was USD ${totalCost.toFixed(4)}.

## Diagnostics

${confusionDiagnostics(analysis.observations)}

The machine-readable tables retain missing rows, duplicate rows, wrong tools, schema-invalid arguments, and omitted expected fields. \`results/runs.ndjson\` preserves every structured model response and the full provider model-usage map; \`results/observations.csv\` carries every scored call; \`results/by-arm.csv\` carries these summaries.

## Bounds

This measures two model aliases at the canonical versions above on eight synthetic kernel tasks and three derived schema projections. It does not measure production agents, long-horizon sessions, provider-native tool selection, other prompts, or later model versions. The ${analysis.observations.length}-call design has only ${analysis.runs.length} independent generations; it can expose a large effect and cannot resolve a small one. Structured output constrained only the outer response envelope, while the projected kernel tool schemas were validated after generation.

## Reproduce

From \`scratch/evals/q1-schema-confusion\`:

\`bun install --frozen-lockfile\`

\`bun run test && bun run typecheck\`

\`bun run generate\`

\`bun run run\`
`
}

const csvCell = (value: string | number | boolean): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const renderObservationsCsv = (
  observations: readonly ScoredObservation[],
): string => {
  const headers = [
    "model_alias", "canonical_model", "variant", "sample", "task_id",
    "valid_call", "field_confusion", "digest_in_wrong_slot", "missing",
    "duplicate", "wrong_tool", "schema_invalid", "omitted_expected_fields",
  ] as const
  return [
    headers.join(","),
    ...observations.map((row) => headers.map((header) =>
      csvCell(row[header])
    ).join(",")),
    "",
  ].join("\n")
}

export const renderSummariesCsv = (summaries: readonly Summary[]): string => {
  const headers = [
    "scope", "model_alias", "canonical_model", "variant", "generations", "calls",
    "valid_count", "valid_rate", "valid_low", "valid_high",
    "field_confusion_count", "field_confusion_rate", "field_confusion_low", "field_confusion_high",
    "digest_wrong_slot_count", "digest_wrong_slot_rate", "digest_wrong_slot_low", "digest_wrong_slot_high",
    "missing", "duplicate", "wrong_tool", "schema_invalid", "omitted_expected_fields",
  ] as const
  const values = (row: Summary): readonly (string | number)[] => [
    row.scope, row.model_alias, row.canonical_model, row.variant, row.generations, row.calls,
    row.valid_call.successes, row.valid_call.rate, row.valid_call.low, row.valid_call.high,
    row.field_confusion.successes, row.field_confusion.rate, row.field_confusion.low, row.field_confusion.high,
    row.digest_in_wrong_slot.successes, row.digest_in_wrong_slot.rate, row.digest_in_wrong_slot.low, row.digest_in_wrong_slot.high,
    row.missing, row.duplicate, row.wrong_tool, row.schema_invalid, row.omitted_expected_fields,
  ]
  return [
    headers.join(","),
    ...summaries.map((row) => values(row).map(csvCell).join(",")),
    "",
  ].join("\n")
}
