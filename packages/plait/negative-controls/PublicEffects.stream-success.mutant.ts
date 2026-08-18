import type { Effect, Stream } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/truth/Refusal.js"
import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class StreamChannelError extends Schema.TaggedError<StreamChannelError>()(
  "StreamChannelError",
  {},
) {}

/** A new operation hides a non-Refusal stream channel in Effect success. */
declare const plantedPublicApi: {
  readonly Feeds: {
    readonly follow: () => Effect.Effect<
      Stream.Stream<string, StreamChannelError>,
      Refusal
    >
  }
}

export type StreamSuccessMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
