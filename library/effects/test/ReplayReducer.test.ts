import { expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { readFile } from "node:fs/promises"
import type { Decision } from "../src/Decision.ts"
import {
  isWellFormed,
  reduce,
  type Input,
  type SessionState,
  type StepResult,
} from "../src/Replay.ts"

const OutcomeSchema = Schema.Union([
  Schema.TaggedStruct("Success", { value: Schema.String }),
  Schema.TaggedStruct("Failure", { error: Schema.String }),
])

const TerminalSchema = Schema.Union([
  Schema.TaggedStruct("Succeeded", { value: Schema.String }),
  Schema.TaggedStruct("Failed", { error: Schema.String }),
])

const InvocationSchema = Schema.Struct({
  op: Schema.String,
  request: Schema.String,
  revision: Schema.Natural,
})

const HistoryEntrySchema = Schema.Struct({
  op: Schema.String,
  outcome: OutcomeSchema,
  request: Schema.String,
  revision: Schema.Natural,
})

const SessionStateSchema = Schema.Struct({
  cursor: Schema.Natural,
  history: Schema.Array(HistoryEntrySchema),
  mode: Schema.Literals(["record", "replay"]),
  status: Schema.Literals(["active", "aborted"]),
})

const InputSchema = Schema.Union([
  Schema.TaggedStruct("Invoke", { invocation: InvocationSchema }),
  Schema.TaggedStruct("Recorded", {
    invocation: InvocationSchema,
    outcome: OutcomeSchema,
  }),
  Schema.TaggedStruct("AppendFailed", {}),
  Schema.TaggedStruct("Complete", { terminal: TerminalSchema }),
])

const MismatchCategorySchema = Schema.Literals([
  "OperationMismatch",
  "RevisionMismatch",
  "RequestMismatch",
  "HistoryExhausted",
  "UnconsumedSuffix",
  "OutcomeInadmissible",
])

const DecisionSchema = Schema.Union([
  Schema.TaggedStruct("LiveDelegation", {
    at: Schema.Natural,
    operation: Schema.String,
  }),
  Schema.TaggedStruct("OccurrenceAppended", {
    at: Schema.Natural,
    operation: Schema.String,
  }),
  Schema.TaggedStruct("RecordedSubstitution", {
    at: Schema.Natural,
    operation: Schema.String,
  }),
  Schema.TaggedStruct("HistoryConsumed", { at: Schema.Natural }),
  Schema.TaggedStruct("TypedRejection", {
    at: Schema.Natural,
    category: MismatchCategorySchema,
  }),
  Schema.TaggedStruct("Completed", { consumed: Schema.Natural }),
])

const SessionOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("Completed", { terminal: TerminalSchema }),
  Schema.TaggedStruct("Rejected", {
    at: Schema.Natural,
    category: MismatchCategorySchema,
    terminalSoFar: Schema.optionalKey(TerminalSchema),
  }),
  Schema.TaggedStruct("Violated", {
    violation: Schema.Struct({
      service: Schema.Literals(["Clock", "Random"]),
    }),
  }),
])

const StepResultSchema = Schema.Union([
  Schema.TaggedStruct("Substituted", { outcome: OutcomeSchema }),
  Schema.TaggedStruct("Delegated", {}),
  Schema.TaggedStruct("Appended", {}),
  Schema.TaggedStruct("Rejected", {
    at: Schema.Natural,
    category: MismatchCategorySchema,
  }),
  Schema.TaggedStruct("SessionOutcome", { outcome: SessionOutcomeSchema }),
  Schema.TaggedStruct("Aborted", {}),
  Schema.TaggedStruct("Absorbed", {}),
])

const StateSummarySchema = Schema.Struct({
  cursor: Schema.Natural,
  historyLength: Schema.Natural,
  status: Schema.Literals(["active", "aborted"]),
  wellFormed: Schema.Boolean,
})

const ReplayRowSchema = Schema.Struct({
  case: Schema.String,
  expect: Schema.Struct({
    decisions: Schema.Array(DecisionSchema),
    results: Schema.Array(StepResultSchema),
    state: StateSummarySchema,
  }),
  input: Schema.Struct({
    inputs: Schema.Array(InputSchema),
    state: SessionStateSchema,
  }),
})

type ReplayFamily =
  | "RPL-002"
  | "RPL-003"
  | "RPL-004"
  | "RPL-005"
  | "SES-001"
  | "SES-002"
  | "CMP-002"

const manifestSchema = <const Family extends ReplayFamily>(family: Family) =>
  Schema.Struct({
    family: Schema.Literal(family),
    meaning: Schema.String,
    model: Schema.Literal("effects-model@0.1.0"),
    rows: Schema.Array(ReplayRowSchema),
  })

const readJson = (url: URL): Effect.Effect<unknown> =>
  Effect.promise(async () => {
    const text = await readFile(url, "utf8")
    const json: unknown = JSON.parse(text)
    return json
  })

const runFixture = (
  initialState: SessionState,
  inputs: ReadonlyArray<Input>,
) => {
  let state = initialState
  const decisions: Array<Decision> = []
  const results: Array<StepResult> = []

  for (const input of inputs) {
    const step = reduce(state, input)
    state = step.state
    results.push(step.result)
    decisions.push(...step.decisions)
  }

  return {
    decisions,
    results,
    state: {
      cursor: state.cursor,
      historyLength: state.history.length,
      status: state.status,
      wellFormed: isWellFormed(state),
    },
  }
}

const assertFamily = (family: ReplayFamily) =>
  Effect.gen(function* () {
    const json = yield* readJson(
      new URL(`../conformance/manifest/${family}.json`, import.meta.url),
    )
    const manifest = yield* Schema.decodeUnknownEffect(manifestSchema(family))(json)

    for (const row of manifest.rows) {
      const actual = runFixture(row.input.state, row.input.inputs)
      expect({ case: row.case, result: actual }).toEqual({
        case: row.case,
        result: row.expect,
      })
    }
  })

it.effect("RPL-002 consumes every ratified replay-hermeticity row structurally", () =>
  assertFamily("RPL-002"))

it.effect("RPL-003 consumes every ratified exact-consumption row structurally", () =>
  assertFamily("RPL-003"))

it.effect("RPL-004 consumes every ratified fail-closed row structurally", () =>
  assertFamily("RPL-004"))

it.effect("RPL-005 consumes every ratified completion row structurally", () =>
  assertFamily("RPL-005"))

it.effect("SES-001 consumes every ratified structural-abort row structurally", () =>
  assertFamily("SES-001"))

it.effect("SES-002 consumes every ratified well-formedness row structurally", () =>
  assertFamily("SES-002"))

it.effect("CMP-002 consumes every ratified occurrence-distinctness row structurally", () =>
  assertFamily("CMP-002"))
