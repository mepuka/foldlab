/**
 * CAS-004 binding: the canonical value encoding, bound to the model.
 *
 * The Lean model computes each structure's canonical bytes through its
 * compact renderer; this suite reproduces them through `canonicalJson`
 * byte-for-byte — codepoint key order, integer-only numbers, and the
 * exact `JSON.stringify` escape set are all model-pinned, so a second
 * writer cannot split a value's content identity. The refusals the
 * model makes unrepresentable (fractional and unsafe numbers) are
 * asserted TypeScript-side.
 */
import { expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { canonicalJson } from "../src/cas/Value.ts"
import {
  assertFamilyRows,
  ManifestModel,
  type FamilyBinding,
} from "./conformance/harness.ts"

const Cas004Row = Schema.Struct({
  case: Schema.String,
  expect: Schema.Struct({ bytes: Schema.Array(Schema.Natural) }),
  input: Schema.Struct({ value: Schema.Unknown }),
})

const binding: FamilyBinding<"CAS-004", typeof Cas004Row> = {
  family: "CAS-004",
  model: ManifestModel,
  row: Cas004Row,
  hasOracle: false,
}

it.effect("CAS-004 consumes every ratified canonical-encoding row structurally", () =>
  assertFamilyRows(binding, (row) => Effect.sync(() => ({
    bytes: Array.from(new TextEncoder().encode(canonicalJson(row.input.value))),
  }))))

it.effect("numbers outside the safe-integer domain are refused, not formatted", () =>
  Effect.sync(() => {
    expect(() => canonicalJson(1.5)).toThrow(TypeError)
    expect(() => canonicalJson(0.1)).toThrow(TypeError)
    expect(() => canonicalJson(Number.MAX_SAFE_INTEGER + 1)).toThrow(TypeError)
    expect(() => canonicalJson(Number.NaN)).toThrow(TypeError)
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow(TypeError)
    // The safe bounds themselves encode.
    expect(canonicalJson(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991")
    expect(canonicalJson(Number.MIN_SAFE_INTEGER)).toBe("-9007199254740991")
  }))
