import { Context, Effect, Layer, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"

import {
  ClaudeCliResponseSchema,
  type ClaudeCliResponse,
} from "./Domain.ts"
import type { ModelResponse } from "./Scoring.ts"
import type { Variant } from "./Projection.ts"

/**
 * The reasoning-effort setting every generation runs at. Stated here as a
 * named constant, carried on each run record, and declared in the
 * preregistration's population: it changes the quantity being counted, so
 * leaving it implicit in a spawn argument put it outside the stated population
 * in round 1.
 */
export const REASONING_EFFORT = "low"

export interface ModelRequest {
  readonly model_alias: string
  readonly variant: Variant
  readonly sample: number
  readonly effort: string
  readonly prompt: string
}

export interface ModelResult {
  readonly model_alias: string
  readonly canonical_model: string
  readonly variant: Variant
  readonly sample: number
  readonly effort: string
  readonly duration_api_ms: number
  readonly total_cost_usd: number
  readonly model_usage: ClaudeCliResponse["modelUsage"]
  readonly response: ModelResponse
}

export class ModelInvocationError extends Schema.TaggedError<ModelInvocationError>()(
  "ModelInvocationError",
  {
    model_alias: Schema.String,
    variant: Schema.String,
    sample: Schema.Finite,
    cause: Schema.Defect(),
  },
) {}

export class ModelOutputError extends Schema.TaggedError<ModelOutputError>()(
  "ModelOutputError",
  {
    model_alias: Schema.String,
    raw_head: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class ModelProviderError extends Schema.TaggedError<ModelProviderError>()(
  "ModelProviderError",
  {
    model_alias: Schema.String,
    message: Schema.String,
  },
) {}

export type ModelRunnerError =
  | ModelInvocationError
  | ModelOutputError
  | ModelProviderError

export interface ModelRunnerService {
  readonly run: (
    request: ModelRequest,
  ) => Effect.Effect<ModelResult, ModelRunnerError>
}

const StructuredOutputSchema = JSON.stringify({
  type: "object",
  additionalProperties: false,
  required: ["calls"],
  properties: {
    calls: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task_id", "name", "arguments"],
        properties: {
          task_id: { type: "string" },
          name: { type: "string" },
          arguments: { type: "object" },
        },
      },
    },
  },
})

const decodeCliResponse = Schema.decodeUnknownEffect(
  Schema.fromJsonString(ClaudeCliResponseSchema),
)

const primaryCanonicalModel = (
  response: ClaudeCliResponse,
): string | undefined => Object.values(response.modelUsage).reduce<
  ClaudeCliResponse["modelUsage"][string] | undefined
>((primary, usage) =>
  primary === undefined || usage.costUSD > primary.costUSD ? usage : primary
, undefined)?.canonicalModel

export class ModelRunner extends Context.Service<
  ModelRunner,
  ModelRunnerService
>()("@foldlab/q1-schema-confusion/ModelRunner") {
  static readonly layer: Layer.Layer<
    ModelRunner,
    never,
    ChildProcessSpawner.ChildProcessSpawner
  > = Layer.effect(
    ModelRunner,
    Effect.gen(function*() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

      const run = Effect.fn("ModelRunner.run")(function*(request: ModelRequest) {
        const command = ChildProcess.make("claude", [
          "-p",
          "--no-session-persistence",
          "--tools",
          "",
          "--system-prompt",
          "Return only data matching the requested JSON schema. Do not use tools.",
          "--model",
          request.model_alias,
          "--effort",
          request.effort,
          "--output-format",
          "json",
          "--json-schema",
          StructuredOutputSchema,
          request.prompt,
        ])

        const raw = yield* spawner.string(command).pipe(
          Effect.mapError((cause) => new ModelInvocationError({
            model_alias: request.model_alias,
            variant: request.variant,
            sample: request.sample,
            cause,
          })),
        )
        const response = yield* decodeCliResponse(raw).pipe(
          Effect.mapError((cause) => new ModelOutputError({
            model_alias: request.model_alias,
            raw_head: raw.slice(0, 512),
            cause,
          })),
        )

        if (response.is_error) {
          return yield* new ModelProviderError({
            model_alias: request.model_alias,
            message: response.result,
          })
        }

        const canonicalModel = primaryCanonicalModel(response)
        if (canonicalModel === undefined) {
          return yield* new ModelProviderError({
            model_alias: request.model_alias,
            message: "Provider response contained no model usage entry.",
          })
        }

        return {
          model_alias: request.model_alias,
          canonical_model: canonicalModel,
          variant: request.variant,
          sample: request.sample,
          effort: request.effort,
          duration_api_ms: response.duration_api_ms,
          total_cost_usd: response.total_cost_usd,
          model_usage: response.modelUsage,
          response: response.structured_output,
        }
      })

      return ModelRunner.of({ run })
    }),
  )

  static fixtureLayer(
    run: ModelRunnerService["run"],
  ): Layer.Layer<ModelRunner> {
    return Layer.succeed(ModelRunner, ModelRunner.of({ run }))
  }
}
