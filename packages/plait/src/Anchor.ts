import { Effect, Schema } from "effect"

import type { WireValue } from "./Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "./Digest.js"
import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

/** The checkpoint fact stored for one deployed fold partition. */
export const Anchor = Schema.Struct({
  floor: Schema.Natural,
  stateDigest: Digest,
  head: Digest,
})

/** The checkpoint fact stored for one deployed fold partition. */
export type Anchor = typeof Anchor.Type

/** The file-backed KV bucket containing fold checkpoint facts. */
export const ANCHOR_BUCKET = "flb-fab-anchor"

/** Per-key history retained for anchor auditing; no age or size eviction applies. */
export const ANCHOR_HISTORY = 64

const invalidAdvance = (floor: number, position: number): StructuralRefusal =>
  structuralRefusal({
    kind: "invalid-anchor-advance",
    law: "An anchor records only a contiguous successor frontier; its floor advances by exactly one applied position.",
    path: ["position"],
    got: position,
    expected: floor + 1,
    next: [{
      subject: "Folds.deploy",
      note: "Buffer this arrival by position and advance only when the next contiguous successor is present.",
    }],
  })

/** Creates the floor-zero checkpoint fact for a declared initial state. */
export const initial = Effect.fn("Anchor.initial")(function* (
  state: WireValue,
): Effect.fn.Return<Anchor, StructuralRefusal> {
  const [stateDigest, head] = yield* Effect.all([
    digestOf(state),
    digestOf({ v: 0, kind: "fold-head", events: [] }),
  ])
  return { floor: 0, stateDigest, head }
})

/**
 * Advances a checkpoint fact after the successor discipline applies one event.
 *
 * The floor is a derived resume coordinate. The position-addressed buffer in
 * the pump is the protection that decides when this constructor may be called.
 */
export const advance = Effect.fn("Anchor.advance")(function* (
  anchor: Anchor,
  state: WireValue,
  event: DigestValue,
  position: number,
): Effect.fn.Return<Anchor, StructuralRefusal> {
  if (!Number.isSafeInteger(position) || position !== anchor.floor + 1) {
    return yield* invalidAdvance(anchor.floor, position)
  }
  const [stateDigest, head] = yield* Effect.all([
    digestOf(state),
    digestOf({
      v: 0,
      kind: "fold-head",
      previous: anchor.head,
      event,
      position,
    }),
  ])
  return { floor: position, stateDigest, head }
})
