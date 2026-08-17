import type {
  Assert,
  IsRefusalEffect,
} from "../test/PublicEffects.typecheck.js"

/** Planted regression: a fallible public export returns a value union. */
export const plantedValueUnion = (admit: boolean) =>
  admit
    ? { ok: true as const, value: "admitted" }
    : { ok: false as const, refusal: "structural" }

export type PlantedValueUnionMustConform = Assert<
  IsRefusalEffect<typeof plantedValueUnion>
>
