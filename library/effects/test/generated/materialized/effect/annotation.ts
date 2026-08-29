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
 *   - annotation — 17a8133b96bbbc7879c229263e0314e806085094a5f1606ed05093619ae2a5d2
 */
import { Schema } from "effect"
import { Cas } from "@foldlab/cas"

export const annotation = Schema.Struct({ "key": Schema.String, "subject": Schema.Union([Schema.Struct({ "_tag": Schema.Literal("exchange"), "address": Cas.CanonicalSchema.ref(88) }), Schema.Struct({ "_tag": Schema.Literal("git"), "address": Cas.CanonicalSchema.ref(71) }), Schema.Struct({ "_tag": Schema.Literal("program"), "address": Cas.CanonicalSchema.ref(15) }), Schema.Struct({ "_tag": Schema.Literal("schema"), "address": Cas.CanonicalSchema.ref(83) }), Schema.Struct({ "_tag": Schema.Literal("system"), "address": Cas.CanonicalSchema.ref(84) })], { mode: "oneOf" }), "value": Schema.Union([Schema.Struct({ "_tag": Schema.Literal("ref"), "address": Schema.Union([Schema.Struct({ "_tag": Schema.Literal("exchange"), "address": Cas.CanonicalSchema.ref(88) }), Schema.Struct({ "_tag": Schema.Literal("git"), "address": Cas.CanonicalSchema.ref(71) }), Schema.Struct({ "_tag": Schema.Literal("program"), "address": Cas.CanonicalSchema.ref(15) }), Schema.Struct({ "_tag": Schema.Literal("schema"), "address": Cas.CanonicalSchema.ref(83) }), Schema.Struct({ "_tag": Schema.Literal("system"), "address": Cas.CanonicalSchema.ref(84) })], { mode: "oneOf" }) }), Schema.Struct({ "_tag": Schema.Literal("text"), "text": Schema.String })], { mode: "oneOf" }) })

export type annotation = { readonly "key": string, readonly "subject": { readonly "_tag": "exchange", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "git", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "program", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "schema", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "system", readonly "address": Cas.ReferenceSentinel }, readonly "value": { readonly "_tag": "ref", readonly "address": { readonly "_tag": "exchange", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "git", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "program", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "schema", readonly "address": Cas.ReferenceSentinel } | { readonly "_tag": "system", readonly "address": Cas.ReferenceSentinel } } | { readonly "_tag": "text", readonly "text": string } }
