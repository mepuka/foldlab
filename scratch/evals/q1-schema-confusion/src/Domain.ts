import { Schema } from "effect"

import type { JsonSchema, ToolDocument } from "./Projection.ts"
import type { ModelResponse } from "./Scoring.ts"
import type { Variant } from "./Projection.ts"

const JsonSchemaNode: Schema.Codec<JsonSchema, JsonSchema, never, never> = Schema.suspend(() =>
  Schema.Struct({
    $comment: Schema.optionalKey(Schema.String),
    type: Schema.optionalKey(Schema.String),
    pattern: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
    enum: Schema.optionalKey(Schema.Array(Schema.String)),
    minimum: Schema.optionalKey(Schema.Number),
    maximum: Schema.optionalKey(Schema.Number),
    additionalProperties: Schema.optionalKey(Schema.Boolean),
    required: Schema.optionalKey(Schema.Array(Schema.String)),
    properties: Schema.optionalKey(Schema.Record(Schema.String, JsonSchemaNode)),
  })
)

const InputSchema = Schema.Struct({
  type: Schema.Literal("object"),
  additionalProperties: Schema.Literal(false),
  required: Schema.Array(Schema.String),
  properties: Schema.Record(Schema.String, JsonSchemaNode),
})

const ToolSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  input_schema: InputSchema,
})

export const ToolDocumentSchema: Schema.Codec<
  ToolDocument,
  ToolDocument,
  never,
  never
> = Schema.Struct({
  $comment: Schema.optionalKey(Schema.String),
  digest_format: Schema.optionalKey(JsonSchemaNode),
  tools: Schema.Array(ToolSchema),
  refusal_result: Schema.optionalKey(JsonSchemaNode),
})

export const ModelCallSchema = Schema.Struct({
  task_id: Schema.String,
  name: Schema.String,
  arguments: Schema.Record(Schema.String, Schema.Json),
})

export const ModelResponseSchema: Schema.Codec<
  ModelResponse,
  ModelResponse,
  never,
  never
> = Schema.Struct({
  calls: Schema.Array(ModelCallSchema),
})

export const ModelUsageSchema = Schema.Struct({
  canonicalModel: Schema.String,
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheReadInputTokens: Schema.Number,
  cacheCreationInputTokens: Schema.Number,
  costUSD: Schema.Number,
})

export const ClaudeCliResponseSchema = Schema.Struct({
  is_error: Schema.Boolean,
  duration_api_ms: Schema.Number,
  total_cost_usd: Schema.Number,
  result: Schema.String,
  structured_output: ModelResponseSchema,
  modelUsage: Schema.Record(Schema.String, ModelUsageSchema),
})

export type ClaudeCliResponse = typeof ClaudeCliResponseSchema.Type

export interface RunRecord {
  readonly model_alias: string
  readonly canonical_model: string
  readonly variant: Variant
  readonly sample: number
  readonly base_sha256: string
  readonly prompt_sha256: string
  readonly duration_api_ms: number
  readonly total_cost_usd: number
  readonly model_usage: ClaudeCliResponse["modelUsage"]
  readonly response: ModelResponse
}

export const RunRecordSchema: Schema.Codec<
  RunRecord,
  RunRecord,
  never,
  never
> = Schema.Struct({
  model_alias: Schema.String,
  canonical_model: Schema.String,
  variant: Schema.Literals(["compound", "bare", "nested"]),
  sample: Schema.Number,
  base_sha256: Schema.String,
  prompt_sha256: Schema.String,
  duration_api_ms: Schema.Number,
  total_cost_usd: Schema.Number,
  model_usage: Schema.Record(Schema.String, ModelUsageSchema),
  response: ModelResponseSchema,
})
