/**
 * Plane: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { Effect, Match, Schedule, Schema, SchemaParser } from "effect"
import { dual } from "effect/Function"

import type { JsonValue } from "@foldlab/core/jcs"

import { refusalOf } from "../internal/refusals.js"
import { StructuralRefusalKind as GeneratedStructuralRefusalKind } from "./RefusalKinds.generated.js"

const isWireValue = (value: unknown): value is JsonValue => {
  if (
    value === null || typeof value === "boolean" || typeof value === "string"
    || typeof value === "bigint"
  ) return true
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isWireValue)
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== Object.prototype) return false
    return Object.values(value).every(isWireValue)
  }
  return false
}

/**
 * A refusal payload speaks the estate wire domain, not `Schema.Json`: the
 * estate number line carries exact integers as `bigint` (DEV-807), and a
 * refusal whose `got` quotes such a value must survive its own schema.
 */
export const WireValueSchema = Schema.declare<JsonValue>(isWireValue, {
  identifier: "WireValue",
})

/** One legal repair or inspection step attached to a refusal. */
export const Next = Schema.Struct({
  subject: Schema.String,
  note: Schema.String,
  body: Schema.optionalKey(WireValueSchema),
})

/** One legal repair or inspection step attached to a refusal. */
export type Next = typeof Next.Type

const SharedRefusalFields = {
  law: Schema.String,
  path: Schema.Array(Schema.String),
  got: WireValueSchema,
  expected: WireValueSchema,
  next: Schema.Array(Next),
} as const

/**
 * Every structural refusal kind the package can mint, projected from the
 * kernel corpus into this plane by the model's own emitter.
 *
 * The projection is emitted as `RefusalKinds.generated.ts` — a sibling in
 * `truth/` — rather than imported from `kernel/`, because `truth/` is the
 * deepest plane and imports only itself.
 *
 * One re-export, not a const beside a type alias. `StructuralRefusalKind` is a
 * merged value-and-type name, and TypeScript admits one export declaration per
 * exported NAME across both meanings (TS2323/TS2484), so the const and a
 * re-exported type cannot stand together under it. The re-export is the half
 * that had to win: it carries the schema and the type it admits, and both
 * resolve to `RefusalKinds.generated.d.ts`, where the public-type census can
 * read the ancestry back. A `typeof GeneratedStructuralRefusalKind.Type` alias
 * — the spelling this replaces — is this file's own declaration, and DEV-800
 * round 2 measured that the census credits it here rather than to the
 * generator.
 */
export { StructuralRefusalKind } from "./RefusalKinds.generated.js"

/** A permanent statement that input violated a pinned structural law. */
export class StructuralRefusal extends Schema.TaggedError<StructuralRefusal>()(
  "StructuralRefusal",
  {
    sort: Schema.Literal("structural"),
    kind: GeneratedStructuralRefusalKind,
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
  readonly got: JsonValue
  readonly expected: JsonValue
  readonly next: ReadonlyArray<Next>
}

/** Fields accepted when constructing structural evidence. */
export interface StructuralRefusalFields extends RefusalFields {
  readonly kind: GeneratedStructuralRefusalKind
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
 * Folds a refusal over its two sorts.
 *
 * The sort is the persisted discriminant and the tag carries it: a structural
 * refusal is a permanent statement about presented input, an absence
 * observation is head-relative and may be repealed by later evidence. A caller
 * that has to answer differently for the two — a surface that offers a retry on
 * one and a repair on the other — folds here instead of reading `sort` and
 * hoping the reading stays total.
 *
 * A third sort would be a third arm the compiler demands, which is the whole
 * reason this is a fold and not a conditional.
 *
 * @example
 * ```ts
 * import { match } from "@foldlab/plait/Refusal"
 *
 * const advice = match({
 *   StructuralRefusal: (refusal) => refusal.law,
 *   AbsenceRefusal: (refusal) => refusal.next[0]?.note ?? "wait and read again",
 * })
 * ```
 */
export const match: <Out>(cases: {
  readonly StructuralRefusal: (refusal: StructuralRefusal) => Out
  readonly AbsenceRefusal: (refusal: AbsenceRefusal) => Out
}) => (refusal: Refusal) => Out = <Out>(cases: {
  readonly StructuralRefusal: (refusal: StructuralRefusal) => Out
  readonly AbsenceRefusal: (refusal: AbsenceRefusal) => Out
}): ((refusal: Refusal) => Out) =>
  // The pin's matcher answers `Unify<Out>`, and `Unify` cannot reduce over a
  // type parameter no call site has resolved yet — it reduces to `Out` at every
  // real application and stays unreduced only here, inside the one function
  // that is generic in it. The declared signature above is the contract, the
  // exhaustiveness is the matcher's, and this narrowing is the seam between
  // them rather than a claim about any value.
  Match.type<Refusal>().pipe(Match.tagsExhaustive(cases)) as (refusal: Refusal) => Out

/**
 * Folds a structural refusal over every kind the vocabulary carries.
 *
 * The arm record's keys are the generated union's, so the closure contract is a
 * compile error rather than a convention: a kind emitted into the vocabulary
 * tomorrow is a key every caller is missing today, and no caller can spell an
 * arm for a kind the vocabulary does not carry. Nothing here enumerates the
 * kinds — enumerations that are listed drift, and this one is read off the
 * declaration the emitter owns.
 *
 * A plain record dispatch rather than a pattern matcher, deliberately. The kind
 * is a field of ONE class and not a discriminant between class types, so the
 * pin's discriminator matchers would narrow every arm's argument to the empty
 * type; the mapped record states the same totality and keeps the argument the
 * refusal itself.
 *
 * @example
 * ```ts
 * import { matchKind } from "@foldlab/plait/Refusal"
 *
 * const isIdentityFault = matchKind({ ...arms, "digest-mismatch": () => true })
 * ```
 */
export const matchKind: <Out>(cases: {
  readonly [K in GeneratedStructuralRefusalKind]: (refusal: StructuralRefusal) => Out
}) => (refusal: StructuralRefusal) => Out =
  <Out>(cases: {
    readonly [K in GeneratedStructuralRefusalKind]: (refusal: StructuralRefusal) => Out
  }) =>
  (refusal: StructuralRefusal): Out => cases[refusal.kind](refusal)

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
    return yield* Effect.mapError(
      SchemaParser.decodeUnknownEffect(codec)(input),
      (issue) => refusalOf(issue),
    )
  })
