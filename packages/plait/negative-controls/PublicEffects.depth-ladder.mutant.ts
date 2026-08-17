import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/Refusal.js"

class AtDepthBoundError extends Schema.TaggedError<AtDepthBoundError>()(
  "AtDepthBoundError",
  {},
) {}

class PastDepthBoundError extends Schema.TaggedError<PastDepthBoundError>()(
  "PastDepthBoundError",
  {},
) {}

/** The declaration walk catches a carrier at edge eight and excludes edge nine. */
export declare const plantedPublicApi: {
  readonly atBound: {
    readonly n1: {
      readonly n2: {
        readonly n3: {
          readonly n4: {
            readonly n5: {
              readonly load: () => Effect.Effect<string, AtDepthBoundError>
            }
          }
        }
      }
    }
  }
  readonly pastBound: {
    readonly n1: {
      readonly n2: {
        readonly n3: {
          readonly n4: {
            readonly n5: {
              readonly n6: {
                readonly load: () => Effect.Effect<string, PastDepthBoundError>
              }
            }
          }
        }
      }
    }
  }
  readonly safe: () => Effect.Effect<void, Refusal>
}
