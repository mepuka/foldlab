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
export const StructuralRefusal = Schema.Struct({
  sort: Schema.Literal("structural"),
  ...RefusalFields,
})

/** A permanent statement that input violated a pinned structural law. */
export type StructuralRefusal = typeof StructuralRefusal.Type

/** A head-relative statement that required evidence is not present yet. */
export const AbsenceRefusal = Schema.Struct({
  sort: Schema.Literal("absence"),
  ...RefusalFields,
})

/** A head-relative statement that required evidence is not present yet. */
export type AbsenceRefusal = typeof AbsenceRefusal.Type

/** Every refusal on a Plait seam, discriminated by its persisted sort. */
export const Refusal = Schema.Union([StructuralRefusal, AbsenceRefusal])

/** Every refusal on a Plait seam, discriminated by its persisted sort. */
export type Refusal = typeof Refusal.Type

type RefusalFields = Omit<Refusal, "sort">

/** Constructs structural evidence; shipped retry policies never retry it. */
export const structuralRefusal = (fields: RefusalFields): StructuralRefusal =>
  StructuralRefusal.make({ sort: "structural", ...fields })

/** Constructs an absence observation, the only shipped retry class. */
export const absenceRefusal = (fields: RefusalFields): AbsenceRefusal =>
  AbsenceRefusal.make({ sort: "absence", ...fields })

/** Returns whether new evidence could repeal the refusal. */
export const isRetryable = (refusal: Refusal): refusal is AbsenceRefusal =>
  refusal.sort === "absence"

/** Retries absence observations up to `times`; structural evidence passes through once. */
export const retryAbsence = <A, R>(
  self: Effect.Effect<A, Refusal, R>,
  times: number,
): Effect.Effect<A, Refusal, R> =>
  Effect.retry(self, { times, while: isRetryable })
