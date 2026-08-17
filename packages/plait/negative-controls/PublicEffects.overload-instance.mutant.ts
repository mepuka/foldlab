import type { Context, Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/Refusal.js"

class OverloadInstanceError extends Schema.TaggedError<OverloadInstanceError>()(
  "OverloadInstanceError",
  {},
) {}

interface AddedServiceShape {
  read(input: string): Effect.Effect<string, OverloadInstanceError>
  read(input: number): Effect.Effect<string, Refusal>
  read(input: boolean): Effect.Effect<string, Refusal>
}

declare const AddedServiceBase: Context.ServiceClass<
  AddedService,
  "@foldlab/plait/AddedService",
  AddedServiceShape
>
declare class AddedService extends AddedServiceBase {}

/** A newly exported Context.Service hides a non-Refusal error in a non-final instance overload. */
export declare const plantedPublicApi: {
  readonly Services: {
    readonly Added: typeof AddedService
  }
}
