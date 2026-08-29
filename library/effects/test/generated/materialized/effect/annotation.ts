/**
 * GENERATED — do not edit. Materialized from canonical schema nodes
 * by `Cas.Materialize.source`: every binding below is what Effect's
 * own `SchemaRepresentation.toCodeDocument` prints for the schema
 * revived out of the addressed node. The addresses are the stamp
 * that makes this file a projection of store content and parity a
 * digest check (R7, the served-equals-derived wall) — regenerate,
 * never edit.
 *
 * Materialized from schema nodes (kind tag 0x53):
 *   - annotation — 11b64dec4388090a2153faf414b9105f586b0e64e3a00ea4ae13d4b84b3152f7
 */
import { Schema } from "effect"
import { Cas } from "@foldlab/cas"

export const annotation = Schema.Struct({ "key": Schema.String, "subject": Cas.CanonicalSchema.ref(83), "value": Schema.String })

export type annotation = { readonly "key": string, readonly "subject": Cas.ReferenceSentinel, readonly "value": string }
