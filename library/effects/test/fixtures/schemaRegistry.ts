/**
 * The hand-mirrored schema registry: the TypeScript twin of
 * `library/cas/tools/Schemas.lean`, name for name and order for order.
 *
 * The mirrors are written by hand on purpose — they are the drift
 * tripwire against the Lean-emitted fixtures in `library/cas/schemas/`,
 * so nothing here may be derived from those fixtures. Two suites read
 * this registry (the byte pin and the materialization gate), which is why
 * it lives in one place instead of being copied.
 */
import { Schema } from "effect"
import { Cas } from "../../src/index.ts"

const { Annotations, CanonicalSchema, ConformanceVector } = Cas

/** Lean `SchemasMain.PinSample`, hand-mirrored in Effect Schema. */
export const pinSample = Schema.Struct({
  count: Schema.Int,
  flag: Schema.Boolean,
  items: Schema.Array(Schema.String),
  label: Schema.String,
  note: Schema.optionalKey(Schema.String),
  root: CanonicalSchema.ref(9),
  unit: Schema.Null,
})

/** Lean `SchemasMain.literalPin`, hand-mirrored in Effect Schema. */
export const literalPin = Schema.Struct({
  a: Schema.Null,
  b: Schema.Literal(true),
  c: Schema.optionalKey(Schema.Literal(-7)),
  d: Schema.Literal("pinned"),
})

/** Lean `SchemasMain.unionPin`, hand-mirrored in Effect Schema.
 *
 * ORDER IS IDENTITY: `exact` spells `"zebra"` before `"alpha"` on both
 * sides on purpose. Any sort of union members — here or in Lean — moves
 * the payload bytes and the address, and the pin goes red. `nested`
 * mirrors the no-flattening rule: it is a union whose second member is
 * a union, not a three-member union.
 *
 * `choice` and `nested` carry no `mode` option because Effect's own
 * constructor defaults it to `"anyOf"`, which is the mode the Lean code
 * spells; the estate's emitter always writes the mode out, which is a
 * lowering choice and not a representation difference. */
export const unionPin = Schema.Struct({
  choice: Schema.Union([Schema.String, Schema.Boolean, Schema.Int]),
  exact: Schema.Union([Schema.Literal("zebra"), Schema.Literal("alpha")], {
    mode: "oneOf",
  }),
  nested: Schema.optionalKey(Schema.Union([
    Schema.Null,
    Schema.Union([Schema.Array(Schema.String), Schema.Boolean], {
      mode: "oneOf",
    }),
  ])),
})

/** The registry, name-for-name with `library/cas/tools/Schemas.lean`.
 *
 * `annotation` mirrors Lean `Cas.Schema.Annotation` through the library's
 * own hand-written kind rather than a second copy of it: the sidecar
 * annotation kind is a public surface, so the surface itself is what the
 * Lean bytes are held to. It is hand-written like every other row, and
 * like every other row it is never derived from the fixtures. */
export const registry: ReadonlyArray<readonly [string, Schema.Top]> = [
  ["vector-document", ConformanceVector.vectorSchema],
  ["vector-index", ConformanceVector.indexSchema],
  ["pin-sample", pinSample],
  ["literal-pin", literalPin],
  ["annotation", Annotations.Annotation],
  ["union-pin", unionPin],
] as const
