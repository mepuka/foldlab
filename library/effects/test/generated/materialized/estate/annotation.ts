/**
 * GENERATED — do not edit. The ESTATE-NATIVE materialization of the
 * canonical schema node `annotation`, lowered from its committed
 * payload (`library/cas/schemas/annotation.json`) by
 * `lake exe materialize` through the estate's own printer
 * (`Cas/Backend/EmitAst.lean`, `Cas/Backend/Ts.lean`); regeneration
 * is byte-identity-gated (`--check`, wired into `check:cas`).
 *
 * This is the SECOND REGISTER of the P6 differential:
 * `Cas.Materialize.source` prints the same node through Effect's own
 * `toCodeDocument`, and MaterializeDifferential asserts the two
 * modules EVALUATE to one schema. The two texts legitimately differ
 * in spelling; the denotation is the identity.
 *
 * Materialized from a schema node (kind tag 0x53):
 *   - annotation — 17a8133b96bbbc7879c229263e0314e806085094a5f1606ed05093619ae2a5d2
 *
 * emitted — schemaVersion 1, emitter `materialize`,
 * module `library/cas/tools/Materialize.lean`, toolchain Lean 4.33.1.
 */
import { Schema } from "effect"
import * as CanonicalSchema from "../../../../src/cas/CanonicalSchema.ts"

/** The canonical code stored at `17a8133b96bbbc7879c229263e0314e806085094a5f1606ed05093619ae2a5d2`. */
export const annotation = Schema.Struct({
  key: Schema.String,
  subject: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal("exchange"),
      address: CanonicalSchema.ref(88),
    }),
    Schema.Struct({
      _tag: Schema.Literal("git"),
      address: CanonicalSchema.ref(71),
    }),
    Schema.Struct({
      _tag: Schema.Literal("program"),
      address: CanonicalSchema.ref(15),
    }),
    Schema.Struct({
      _tag: Schema.Literal("schema"),
      address: CanonicalSchema.ref(83),
    }),
    Schema.Struct({
      _tag: Schema.Literal("system"),
      address: CanonicalSchema.ref(84),
    }),
  ], { mode: "oneOf" }),
  value: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal("ref"),
      address: Schema.Union([
        Schema.Struct({
          _tag: Schema.Literal("exchange"),
          address: CanonicalSchema.ref(88),
        }),
        Schema.Struct({
          _tag: Schema.Literal("git"),
          address: CanonicalSchema.ref(71),
        }),
        Schema.Struct({
          _tag: Schema.Literal("program"),
          address: CanonicalSchema.ref(15),
        }),
        Schema.Struct({
          _tag: Schema.Literal("schema"),
          address: CanonicalSchema.ref(83),
        }),
        Schema.Struct({
          _tag: Schema.Literal("system"),
          address: CanonicalSchema.ref(84),
        }),
      ], { mode: "oneOf" }),
    }),
    Schema.Struct({
      _tag: Schema.Literal("text"),
      text: Schema.String,
    }),
  ], { mode: "oneOf" }),
})
