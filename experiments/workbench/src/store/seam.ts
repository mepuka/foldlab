/**
 * The store seam — a hole, held open and typed, where the workbench will
 * meet the store language.
 *
 * This is NOT the API contract. Lane C owns the contract and is expected
 * to replace this module wholesale. What is load-bearing here is the
 * shape of the boundary, not its content:
 *
 *   - the workbench reaches the store through an Effect service, so the
 *     runtime binds one implementation once via `resources` and every
 *     Command that needs the store declares that need in its type;
 *   - the only operation is a liveness probe returning an opaque string,
 *     which deliberately names no domain vocabulary — no address, no
 *     node, no schema, no program;
 *   - the only failure is refusal. The store language's own `fail` has
 *     no continuation by type, and the seam keeps that shape: a refused
 *     probe carries a reason and nothing else.
 *
 * The only layer shipped is `layerUnwired`, which refuses. That is the
 * true state of this package: nothing is on the other side yet, and the
 * page says so rather than fabricating a value.
 */
import { Context, Effect, Layer, Schema } from "effect"

/** The seam has no implementation behind it. */
export class StoreUnwired extends Schema.TaggedError<StoreUnwired>()(
  "Workbench/StoreUnwired",
  { reason: Schema.String },
) {}

export interface StoreSeamShape {
  /** Ask whatever is on the other side to identify itself. The string is
   * opaque to the workbench: it is displayed, never parsed. Lane C
   * decides whether this operation survives at all. */
  readonly probe: Effect.Effect<string, StoreUnwired>
}

export class StoreSeam extends Context.Service<StoreSeam, StoreSeamShape>()(
  "foldlab/workbench/StoreSeam",
) {}

/** The seam with nothing behind it. Every probe refuses, with the reason
 * naming the lane that owns the gap. */
export const layerUnwired: Layer.Layer<StoreSeam> = Layer.succeed(StoreSeam, {
  probe: Effect.fail(
    new StoreUnwired({
      reason: "no store is wired to this build; the contract is not settled yet",
    }),
  ),
})
