import { Effect, Schema } from "effect"

/** One legal repair or inspection step attached to a refusal. */
export const Next = Schema.Struct({
  subject: Schema.String,
  note: Schema.String,
  body: Schema.optionalKey(Schema.Json),
})

/** One legal repair or inspection step attached to a refusal. */
export type Next = typeof Next.Type

const RefusalFields = {
  kind: Schema.String,
  law: Schema.String,
  path: Schema.Array(Schema.String),
  got: Schema.Json,
  expected: Schema.Json,
  next: Schema.Array(Next),
} as const

/** A permanent statement that input violated a pinned structural law. */
export class StructuralRefusal extends Schema.TaggedError<StructuralRefusal>()(
  "StructuralRefusal",
  {
    sort: Schema.Literal("structural"),
    ...RefusalFields,
  },
) {}

/** A head-relative statement that required evidence is not present yet. */
export class AbsenceRefusal extends Schema.TaggedError<AbsenceRefusal>()(
  "AbsenceRefusal",
  {
    sort: Schema.Literal("absence"),
    ...RefusalFields,
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

/** Constructs structural evidence; shipped retry policies never retry it. */
export const structuralRefusal = (fields: RefusalFields): StructuralRefusal =>
  new StructuralRefusal({ sort: "structural", ...fields })

/** Constructs an absence observation, the only shipped retry class. */
export const absenceRefusal = (fields: RefusalFields): AbsenceRefusal =>
  new AbsenceRefusal({ sort: "absence", ...fields })

/** Returns whether new evidence could repeal the refusal. */
export const isRetryable = (refusal: Refusal): refusal is AbsenceRefusal =>
  refusal.sort === "absence"

/** Retries absence observations up to `times`; structural evidence passes through once. */
export const retryAbsence = <A, R>(
  self: Effect.Effect<A, Refusal, R>,
  times: number,
): Effect.Effect<A, Refusal, R> =>
  Effect.retry(self, { times, while: isRetryable })
