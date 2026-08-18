/**
 * Plane: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { Effect, Schedule, Schema, SchemaParser } from "effect"
import { dual } from "effect/Function"

import { refusalOf } from "./internal/refusals.js"

/** One legal repair or inspection step attached to a refusal. */
export const Next = Schema.Struct({
  subject: Schema.String,
  note: Schema.String,
  body: Schema.optionalKey(Schema.Json),
})

/** One legal repair or inspection step attached to a refusal. */
export type Next = typeof Next.Type

const SharedRefusalFields = {
  law: Schema.String,
  path: Schema.Array(Schema.String),
  got: Schema.Json,
  expected: Schema.Json,
  next: Schema.Array(Next),
} as const

/** Every structural refusal kind the package can mint. */
export const StructuralRefusalKind = Schema.Literals([
  "non-canonical-value",
  "invalid-subject-token",
  "malformed-envelope",
  "malformed-blob-reference",
  "inline-body-too-large",
  "digest-mismatch",
  "substrate-shape",
  "invalid-lane-declaration",
  "invalid-partition-key",
  "lane-evidence-mismatch",
  "lane-substrate-shape",
  "invalid-algebra-declaration",
  "invalid-fold-declaration",
  "unearned-commutative-algebra",
  "invalid-anchor-advance",
  "anchor-substrate-shape",
  "malformed-anchor-state",
  "lost-anchor-cas",
  "consumer-substrate-shape",
  "fold-buffer-overflow",
  "invalid-chaos-request",
  "invalid-fold-state",
  "invalid-register-key",
  "malformed-register-state",
  "register-absent",
  "register-substrate-shape",
  "duplicate-grant",
  "outcome-already-landed",
  "stale-register-token",
  "concurrent-register-update",
  "malformed-value",
  "invalid-cell-key",
  "malformed-cell-state",
  "cell-substrate-shape",
])

/** Every structural refusal kind the package can mint. */
export type StructuralRefusalKind = typeof StructuralRefusalKind.Type

/** A permanent statement that input violated a pinned structural law. */
export class StructuralRefusal extends Schema.TaggedError<StructuralRefusal>()(
  "StructuralRefusal",
  {
    sort: Schema.Literal("structural"),
    kind: StructuralRefusalKind,
    ...SharedRefusalFields,
  },
) {}

/** A head-relative statement that required evidence is not present yet. */
export class AbsenceRefusal extends Schema.TaggedError<AbsenceRefusal>()(
  "AbsenceRefusal",
  {
    sort: Schema.Literal("absence"),
    kind: Schema.String,
    ...SharedRefusalFields,
  },
) {}

/** Every refusal on a Plait seam, discriminated by its persisted sort. */
export const Refusal = Schema.Union([StructuralRefusal, AbsenceRefusal])

/** Every refusal on a Plait seam, discriminated by its persisted sort. */
export type Refusal = typeof Refusal.Type

/** Fields common to every refusal sort. */
export interface RefusalFields {
  readonly kind: string
  readonly law: string
  readonly path: ReadonlyArray<string>
  readonly got: typeof Schema.Json.Type
  readonly expected: typeof Schema.Json.Type
  readonly next: ReadonlyArray<Next>
}

/** Fields accepted when constructing structural evidence. */
export interface StructuralRefusalFields extends RefusalFields {
  readonly kind: StructuralRefusalKind
}

/** Constructs structural evidence; shipped retry policies never retry it. */
export const structuralRefusal = (fields: StructuralRefusalFields): StructuralRefusal =>
  new StructuralRefusal({ sort: "structural", ...fields })

/** Constructs an absence observation, the only shipped retry class. */
export const absenceRefusal = (fields: RefusalFields): AbsenceRefusal =>
  new AbsenceRefusal({ sort: "absence", ...fields })

/** Returns whether new evidence could repeal the refusal. */
export const isRetryable = (refusal: Refusal): refusal is AbsenceRefusal =>
  refusal.sort === "absence"

/**
 * Retries only absence observations using either a count or temporal schedule.
 * Structural evidence passes through once. Supports data-first and pipeable use.
 *
 * The error channel stays `Refusal` on purpose, and the pin is why: both call
 * shapes below pass `while: isRetryable`, whose refinement would normally
 * narrow the residual error to `AbsenceRefusal`'s complement, but the pinned
 * `Retry.Return` conditional matches the `times` and `schedule` arms before it
 * reaches the `while`-refinement arm. `Refusal` is also the honest type:
 * exhausted retries surface the final `AbsenceRefusal` itself.
 */
export const retryAbsence: {
  (times: number): <A, R>(
    self: Effect.Effect<A, Refusal, R>,
  ) => Effect.Effect<A, Refusal, R>
  <Output, R2>(schedule: Schedule.Schedule<Output, Refusal, never, R2>): <A, R>(
    self: Effect.Effect<A, Refusal, R>,
  ) => Effect.Effect<A, Refusal, R | R2>
  <A, R>(
    self: Effect.Effect<A, Refusal, R>,
    times: number,
  ): Effect.Effect<A, Refusal, R>
  <A, R, Output, R2>(
    self: Effect.Effect<A, Refusal, R>,
    schedule: Schedule.Schedule<Output, Refusal, never, R2>,
  ): Effect.Effect<A, Refusal, R | R2>
} = dual(2, <A, R, Output, R2>(
  self: Effect.Effect<A, Refusal, R>,
  policy: number | Schedule.Schedule<Output, Refusal, never, R2>,
): Effect.Effect<A, Refusal, R | R2> =>
  typeof policy === "number"
    ? Effect.retry(self, { times: policy, while: isRetryable })
    : Effect.retry(self, { schedule: policy, while: isRetryable }))

/**
 * Decodes through a codec with `Refusal` — never `SchemaIssue` — on the error
 * channel. This is the package's only parse boundary, and its classification
 * seam (`internal/refusals.ts`) is the only place a schema issue becomes a
 * refusal. The bridge stays internal because `SchemaIssue.Issue` is a deep
 * recursive class union that diverges the public-surface type-level walk.
 *
 * The codec's encoding services are unconstrained: the pinned
 * `SchemaParser.decodeUnknownEffect` reads only `Type` and `DecodingServices`,
 * so pinning `EncodingServices` to `never` would close this seam against the
 * package's own emit path (`Resolved.PublishingOf`) for no reason the pin gives
 * — corrected 2026-08-17, DEV-727 finding F-3.
 *
 * @example
 * ```ts
 * import { Digest } from "@foldlab/plait/Digest"
 * import { decodeRefusing } from "@foldlab/plait/Refusal"
 * import { Effect } from "effect"
 *
 * Effect.runSync(Effect.flip(decodeRefusing(Digest)("not-a-digest")))
 * // StructuralRefusal { kind: "malformed-value" }
 * ```
 */
export const decodeRefusing = <T, E, RD, RE>(
  codec: Schema.Codec<T, E, RD, RE>,
): (input: unknown) => Effect.Effect<T, Refusal, RD> =>
  Effect.fn("Refusal.decodeRefusing")(function* (
    input: unknown,
  ): Effect.fn.Return<T, Refusal, RD> {
    return yield* Effect.catch(
      SchemaParser.decodeUnknownEffect(codec)(input),
      (issue) => Effect.fail(refusalOf(issue)),
    )
  })
