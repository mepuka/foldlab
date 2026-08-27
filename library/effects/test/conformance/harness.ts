import { expect } from "@effect/vitest"
import { Context, Effect, Equal, Layer, Schema, type SchemaIssue } from "effect"
import { readFile } from "node:fs/promises"
import type {
  MInput,
  MachineState,
  Params,
  StepOut,
} from "../../src/internal/remoteMachine.ts"

export const ManifestModel = "effects-model@0.1.0" as const

type ContextFreeSchema = Schema.Top & {
  readonly DecodingServices: never
  readonly EncodingServices: never
}

export type FamilyBinding<
  Family extends string,
  RowSchema extends ContextFreeSchema,
> = {
  readonly family: Family
  readonly model: typeof ManifestModel
  readonly row: RowSchema
} & (
  | { readonly hasOracle: false }
  | { readonly hasOracle: true; readonly oracle: string }
)

type RowWithExpectation = {
  readonly case: string
  readonly expect: unknown
}

export type LoadedFamily<Row> = {
  readonly family: string
  readonly meaning: string
  readonly model: typeof ManifestModel
  readonly rows: ReadonlyArray<Row>
  readonly oracle?: string
}

const manifestSchema = <
  Family extends string,
  RowSchema extends ContextFreeSchema,
>(
  binding: FamilyBinding<Family, RowSchema>,
): Schema.Decoder<LoadedFamily<RowSchema["Type"]>, never> => {
  if (binding.hasOracle) {
    return Schema.Struct({
      family: Schema.Literal(binding.family),
      meaning: Schema.String,
      model: Schema.Literal(binding.model),
      oracle: Schema.Literal(binding.oracle),
      rows: Schema.Array(binding.row),
    })
  }
  return Schema.Struct({
    family: Schema.Literal(binding.family),
    meaning: Schema.String,
    model: Schema.Literal(binding.model),
    rows: Schema.Array(binding.row),
  })
}

/** Load only a committed, model-pinned manifest through a closed envelope. */
export const loadFamily = <
  Family extends string,
  RowSchema extends ContextFreeSchema,
>(
  binding: FamilyBinding<Family, RowSchema>,
): Effect.Effect<
  LoadedFamily<RowSchema["Type"]>,
  Error | SchemaIssue.Issue
> => Effect.gen(function* () {
  const json = yield* Effect.tryPromise({
    try: async () => {
      const text = await readFile(
        new URL(`../../conformance/manifest/${binding.family}.json`, import.meta.url),
        "utf8",
      )
      return JSON.parse(text) as unknown
    },
    catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
  })
  const decoded = yield* Schema.decodeUnknownEffect(manifestSchema(binding))(json, {
    onExcessProperty: "error",
  })
  return {
    family: decoded.family,
    meaning: decoded.meaning,
    model: decoded.model,
    rows: decoded.rows,
    ...(binding.hasOracle ? { oracle: binding.oracle } : {}),
  }
})

export type RowEvaluator<Row, Actual> = (
  row: Row,
) => Effect.Effect<Actual>

/** Compare every row structurally; an empty vector family is a harness error. */
export const assertFamilyRows = <
  Family extends string,
  RowSchema extends ContextFreeSchema & { readonly Type: RowWithExpectation },
  Actual,
>(
  binding: FamilyBinding<Family, RowSchema>,
  evaluate: RowEvaluator<RowSchema["Type"], Actual>,
) => Effect.gen(function* () {
  const manifest = yield* loadFamily(binding)
  if (manifest.rows.length === 0) {
    return yield* Effect.die(new Error(`${binding.family}: manifest rows must be non-empty`))
  }
  for (const row of manifest.rows) {
    const actual = yield* evaluate(row)
    expect({ case: row.case, result: actual }).toEqual({
      case: row.case,
      result: row.expect,
    })
  }
})

/** Pure structural witness extraction, exported only for the harness self-test. */
export const findKillWitnesses = <Row extends RowWithExpectation, Actual>(
  rows: ReadonlyArray<Row>,
  evaluate: (row: Row) => Actual,
): ReadonlyArray<string> => rows
  .filter((row) => !Equal.equals(evaluate(row), row.expect))
  .map((row) => row.case)

/** Assert direction-2 red and return the case ids that kill the mutant. */
export const assertFamilyRed = <
  Family extends string,
  RowSchema extends ContextFreeSchema & { readonly Type: RowWithExpectation },
  Actual,
>(
  binding: FamilyBinding<Family, RowSchema>,
  mutant: RowEvaluator<RowSchema["Type"], Actual>,
) => Effect.gen(function* () {
  const manifest = yield* loadFamily(binding)
  if (manifest.rows.length === 0) {
    return yield* Effect.die(new Error(`${binding.family}: manifest rows must be non-empty`))
  }
  const witnesses: Array<string> = []
  for (const row of manifest.rows) {
    const actual = yield* mutant(row)
    if (!Equal.equals(actual, row.expect)) witnesses.push(row.case)
  }
  expect(
    witnesses.length,
    `${binding.family} kill witnesses: ${witnesses.join(", ")}`,
  ).toBeGreaterThan(0)
  return witnesses
})

export type RemoteKey = ReadonlyArray<number>
export type RemoteBytes = ReadonlyArray<number>

export interface RemoteStepShape {
  readonly step: (
    params: Params<RemoteKey, RemoteBytes>,
    state: MachineState<RemoteKey, RemoteBytes>,
    input: MInput<RemoteKey, RemoteBytes>,
  ) => StepOut<RemoteKey, RemoteBytes>
}

/** Lane-selected pure remote step used by direction-1 and direction-2 tests. */
export class RemoteStepSUT extends Context.Service<RemoteStepSUT, RemoteStepShape>()(
  "foldlab/effect-replay/test/RemoteStepSUT",
) {}

export const remoteStepLayer = (step: RemoteStepShape["step"]): Layer.Layer<RemoteStepSUT> =>
  Layer.succeed(RemoteStepSUT, { step })
