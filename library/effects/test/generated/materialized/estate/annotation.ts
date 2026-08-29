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
 *   - annotation — 11b64dec4388090a2153faf414b9105f586b0e64e3a00ea4ae13d4b84b3152f7
 */
import { Schema } from "effect"
import * as CanonicalSchema from "../../../../src/cas/CanonicalSchema.ts"

/** The canonical code stored at `11b64dec4388090a2153faf414b9105f586b0e64e3a00ea4ae13d4b84b3152f7`. */
export const annotation = Schema.Struct({
  key: Schema.String,
  subject: CanonicalSchema.ref(83),
  value: Schema.String,
})
