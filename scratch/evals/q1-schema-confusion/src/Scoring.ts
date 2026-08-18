/**
 * Mechanical scoring: Ajv compilation and exact scalar comparison. No judge
 * and no rubric decides anything here.
 *
 * Round 1 reported three measures that never once disagreed across 240 calls,
 * because `field_confusion` was defined over every expected scalar path — free
 * text bodies included — while `digest_in_wrong_slot` was defined over planted
 * digests, and on that population every omission happened to coincide with a
 * misplacement. Two of the three were one measure wearing two names.
 *
 * The two primitive measures below are disjoint by construction: omission is
 * an expected candidate absent from its own slot, misplacement is a planted
 * digest present in a slot that is not its own. A call can do either without
 * the other. `field_confusion` is retained as the preregistered union of the
 * two and is documented as a union everywhere it is quoted, never as a third
 * independent line of evidence.
 *
 * @module
 */
import Ajv, { type ValidateFunction } from "ajv"
import { Effect, Predicate, Schema } from "effect"

import type { BatteryTask } from "./Battery.ts"
import {
  bareDigestFieldName,
  projectArguments,
  type ToolDocument,
  type Variant,
} from "./Projection.ts"

export interface ModelCall {
  readonly task_id: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export interface ModelResponse {
  readonly calls: readonly ModelCall[]
}

/** Where a planted digest legitimately sits, in base coordinates. */
export interface CanonicalSlot {
  readonly tool: string
  readonly field: string
}

export interface Observation {
  readonly task_id: string
  readonly valid_call: boolean
  /** An expected planted candidate is absent from its own slot. */
  readonly expected_candidate_missing: boolean
  /** A planted digest sits in a slot that is not its own. */
  readonly digest_in_wrong_slot: boolean
  /** The preregistered union of the two above. Not independent evidence. */
  readonly field_confusion: boolean
  readonly missing: boolean
  readonly duplicate: boolean
  readonly wrong_tool: boolean
  readonly schema_invalid: boolean
  /** Diagnostic only: every expected scalar absent, free-text slots included. */
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

const omittedScalars = (
  expected: ReadonlyMap<string, JsonScalar>,
  actual: ReadonlyMap<string, JsonScalar>,
): number => {
  let missing = 0
  for (const [path, expectedValue] of expected) {
    if (!Object.is(actual.get(path), expectedValue)) missing += 1
  }
  return missing
}

/**
 * The path a planted digest occupies once its arm's transformation is applied.
 * Compound keeps the property name; bare drops the terminal `_digest`; nested
 * uses the bare name and puts the digest under `value`.
 */
const canonicalPath = (field: string, variant: Variant): string => {
  if (variant === "compound") return field
  const bare = bareDigestFieldName(field)
  return variant === "nested" ? `${bare}.value` : bare
}

/**
 * An expected candidate absent from its own slot. Restricted to planted
 * digests, which is what the preregistered definition says and what the round-1
 * implementation quietly widened to every expected scalar.
 */
const hasMissingCandidate = (
  expected: ReadonlyMap<string, JsonScalar>,
  actual: ReadonlyMap<string, JsonScalar>,
  planted: ReadonlySet<string>,
): boolean => {
  for (const [path, value] of expected) {
    if (!Predicate.isString(value) || !planted.has(value)) continue
    if (!Object.is(actual.get(path), value)) return true
  }
  return false
}

/**
 * A planted digest in a slot that is not its own. A digest the task never asked
 * for, placed in the slot it does belong to, is not misplacement — scoring that
 * as confusion would measure helpfulness rather than slot discrimination.
 */
const hasDigestInWrongSlot = (
  call: ModelCall,
  actual: ReadonlyMap<string, JsonScalar>,
  expected: ReadonlyMap<string, JsonScalar>,
  canonicalSlots: ReadonlyMap<string, CanonicalSlot>,
  variant: Variant,
): boolean => {
  for (const [path, value] of actual) {
    if (!Predicate.isString(value)) continue
    const slot = canonicalSlots.get(value)
    if (slot === undefined) continue

    if (slot.tool !== call.name) return true
    if (path !== canonicalPath(slot.field, variant)) return true

    // A nested reference in the right slot still carries a sort label, and a
    // wrong label there is the nested arm's own way of confusing the two.
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
  readonly canonicalSlots: ReadonlyMap<string, CanonicalSlot>
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
  const planted = new Set(options.plantedDigests)
  const validator = call === undefined ? undefined : options.validators.get(call.name)
  const schemaInvalid = call !== undefined &&
    (validator === undefined || !validator(call.arguments))

  // A row the model never answered, answered twice, or answered with the wrong
  // tool has not populated its slots; that is an omission, and it is counted as
  // one rather than being left out of the denominator.
  const unanswered = missing || duplicate || wrongTool
  const expectedCandidateMissing = unanswered ||
    hasMissingCandidate(expected, actual, planted)
  const digestInWrongSlot = call === undefined
    ? false
    : hasDigestInWrongSlot(call, actual, expected, options.canonicalSlots, options.variant)

  return {
    task_id: options.task.id,
    valid_call: !missing && !duplicate && !wrongTool && !schemaInvalid,
    expected_candidate_missing: expectedCandidateMissing,
    digest_in_wrong_slot: digestInWrongSlot,
    field_confusion: expectedCandidateMissing || digestInWrongSlot,
    missing,
    duplicate,
    wrong_tool: wrongTool,
    schema_invalid: schemaInvalid,
    omitted_expected_fields: omittedScalars(expected, actual),
  }
}

export const scoreRun = (options: {
  readonly tasks: readonly BatteryTask[]
  readonly variant: Variant
  readonly base: ToolDocument
  readonly validators: ToolValidators
  readonly plantedDigests: readonly string[]
  readonly canonicalSlots: ReadonlyMap<string, CanonicalSlot>
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
