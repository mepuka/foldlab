import { Context, type Effect, type Layer, Schema } from "effect"

import type { Refusal } from "../src/truth/Refusal.js"
import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class FabricClientLayerError extends Schema.TaggedError<FabricClientLayerError>()(
  "FabricClientLayerError",
  {},
) {}

interface PlantedFabricClientService {
  readonly publish: () => Effect.Effect<void, Refusal>
}

class PlantedFabricClient extends Context.Service<
  PlantedFabricClient,
  PlantedFabricClientService
>()("@foldlab/plait/negative-control/FabricClient") {
  static readonly layer = null as unknown as () => Layer.Layer<
    PlantedFabricClient,
    Refusal | FabricClientLayerError
  >
}

/** Plant C: a Context.Service class layer carries a non-Refusal error. */
declare const plantedPublicApi: {
  readonly FabricClient: {
    readonly FabricClient: typeof PlantedFabricClient
  }
}

export type FabricClientClassMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
