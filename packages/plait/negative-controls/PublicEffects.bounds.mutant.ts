import type { Effect, Layer, Stream } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/Refusal.js"

class StreamSuccessError extends Schema.TaggedError<StreamSuccessError>()(
  "StreamSuccessError",
  {},
) {}

class NestedEffectError extends Schema.TaggedError<NestedEffectError>()(
  "NestedEffectError",
  {},
) {}

class LayerSuccessError extends Schema.TaggedError<LayerSuccessError>()(
  "LayerSuccessError",
  {},
) {}

class CollectionElementError extends Schema.TaggedError<CollectionElementError>()(
  "CollectionElementError",
  {},
) {}

/** The direct Stream success is covered; the three named nested shapes remain excluded. */
export declare const plantedPublicApi: {
  readonly directStream: () => Effect.Effect<
    Stream.Stream<string, StreamSuccessError>,
    Refusal
  >
  readonly nestedEffect: () => Effect.Effect<
    Effect.Effect<string, NestedEffectError>,
    Refusal
  >
  readonly layerSuccess: () => Effect.Effect<
    Layer.Layer<string, LayerSuccessError>,
    Refusal
  >
  readonly collectionElement: () => Effect.Effect<
    ReadonlyArray<Stream.Stream<string, CollectionElementError>>,
    Refusal
  >
}
