import Ajv, { type ValidateFunction } from "ajv"
import { Effect, Predicate, Schema } from "effect"

import {
  projectArguments,
  type ToolDocument,
  type Variant,
} from "./Projection.ts"

export interface BatteryTask {
  readonly id: string
  readonly instruction: string
  readonly tool: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export interface ModelCall {
  readonly task_id: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export interface ModelResponse {
  readonly calls: readonly ModelCall[]
}

export interface Observation {
  readonly task_id: string
  readonly valid_call: boolean
  readonly field_confusion: boolean
  readonly digest_in_wrong_slot: boolean
  readonly missing: boolean
  readonly duplicate: boolean
  readonly wrong_tool: boolean
  readonly schema_invalid: boolean
  readonly omitted_expected_fields: number
}

export type ToolValidators = ReadonlyMap<string, ValidateFunction>

export class SchemaCompileError extends Schema.TaggedError<SchemaCompileError>()(
  "SchemaCompileError",
  {
    tool: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export const compileToolValidators = Effect.fn("compileToolValidators")(
  function*(document: ToolDocument): Effect.fn.Return<
    ToolValidators,
    SchemaCompileError
  > {
    const ajv = new Ajv({ allErrors: true, strict: true })
    const entries = yield* Effect.forEach(document.tools, (tool) =>
      Effect.try({
        try: () => [tool.name, ajv.compile(tool.input_schema)] as const,
        catch: (cause) => new SchemaCompileError({ tool: tool.name, cause }),
      })
    )
    return new Map(entries)
  },
)

type JsonScalar = string | number | boolean | null

interface ScalarAtPath {
  readonly path: string
  readonly value: JsonScalar
}

const flattenScalars = (
  value: unknown,
  path = "",
): ReadonlyArray<ScalarAtPath> => {
  if (
    value === null ||
    Predicate.isString(value) ||
    Predicate.isNumber(value) ||
    Predicate.isBoolean(value)
  ) {
    return [{ path, value }]
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenScalars(item, path.length === 0 ? `${index}` : `${path}.${index}`)
    )
  }
  if (Predicate.isObject(value)) {
    return Object.entries(value).flatMap(([field, item]) =>
      flattenScalars(item, path.length === 0 ? field : `${path}.${field}`)
    )
  }
  return []
}

const scalarMap = (value: unknown): ReadonlyMap<string, JsonScalar> =>
  new Map(flattenScalars(value).map(({ path, value }) => [path, value]))

const expectedFieldsMissing = (
  expected: ReadonlyMap<string, JsonScalar>,
  actual: ReadonlyMap<string, JsonScalar>,
): number => {
  let missing = 0
  for (const [path, expectedValue] of expected) {
    if (!Object.is(actual.get(path), expectedValue)) missing += 1
  }
  return missing
}

const hasDigestInWrongSlot = (
  expected: ReadonlyMap<string, JsonScalar>,
  actual: ReadonlyMap<string, JsonScalar>,
  plantedDigests: readonly string[],
): boolean => {
  const planted = new Set(plantedDigests)
  const expectedPaths = new Map<string, ReadonlyArray<string>>()

  for (const [path, value] of expected) {
    if (!Predicate.isString(value) || !planted.has(value)) continue
    const paths = expectedPaths.get(value) ?? []
    expectedPaths.set(value, [...paths, path])
  }

  for (const [path, value] of actual) {
    if (!Predicate.isString(value) || !planted.has(value)) continue
    const paths = expectedPaths.get(value)
    if (paths === undefined || !paths.includes(path)) return true
    if (path.endsWith(".value")) {
      const typePath = `${path.slice(0, -".value".length)}.type`
      if (!Object.is(actual.get(typePath), expected.get(typePath))) return true
    }
  }

  return false
}

const scoreTask = (options: {
  readonly task: BatteryTask
  readonly calls: readonly ModelCall[]
  readonly variant: Variant
  readonly base: ToolDocument
  readonly validators: ToolValidators
  readonly plantedDigests: readonly string[]
}): Observation => {
  const matches = options.calls.filter((call) => call.task_id === options.task.id)
  const call = matches[0]
  const missing = call === undefined
  const duplicate = matches.length > 1
  const wrongTool = call !== undefined && call.name !== options.task.tool
  const baseTool = options.base.tools.find((tool) => tool.name === options.task.tool)
  const expectedArguments = baseTool === undefined
    ? options.task.arguments
    : projectArguments(baseTool, options.task.arguments, options.variant)
  const expected = scalarMap(expectedArguments)
  const actual = scalarMap(call?.arguments)
  const omittedExpectedFields = expectedFieldsMissing(expected, actual)
  const validator = call === undefined ? undefined : options.validators.get(call.name)
  const schemaInvalid = call !== undefined &&
    (validator === undefined || !validator(call.arguments))

  return {
    task_id: options.task.id,
    valid_call: !missing && !duplicate && !wrongTool && !schemaInvalid,
    field_confusion: missing || duplicate || wrongTool || omittedExpectedFields > 0,
    digest_in_wrong_slot: call === undefined
      ? false
      : hasDigestInWrongSlot(
        expected,
        actual,
        options.plantedDigests,
      ),
    missing,
    duplicate,
    wrong_tool: wrongTool,
    schema_invalid: schemaInvalid,
    omitted_expected_fields: omittedExpectedFields,
  }
}

export const scoreRun = (options: {
  readonly tasks: readonly BatteryTask[]
  readonly variant: Variant
  readonly base: ToolDocument
  readonly validators: ToolValidators
  readonly plantedDigests: readonly string[]
  readonly response: ModelResponse
}): ReadonlyArray<Observation> =>
  options.tasks.map((task) => scoreTask({ ...options, task, calls: options.response.calls }))

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000

export const wilson95 = (
  successes: number,
  total: number,
): { readonly low: number; readonly high: number } => {
  if (total === 0) return { low: 0, high: 0 }
  const z = 1.959963984540054
  const proportion = successes / total
  const denominator = 1 + (z * z) / total
  const center = (proportion + (z * z) / (2 * total)) / denominator
  const radius = z * Math.sqrt(
    (proportion * (1 - proportion) + (z * z) / (4 * total)) / total,
  ) / denominator
  return {
    low: round4(Math.max(0, center - radius)),
    high: round4(Math.min(1, center + radius)),
  }
}
