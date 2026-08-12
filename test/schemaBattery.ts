/**
 * The schema-identity battery: the corpus of fixtures/schema-wall.json.
 *
 * One definition, two consumers — scripts/schemafix.ts generated the frozen
 * fixture from these ONCE; test/schema.identity.wall.test.ts recomputes them
 * forever after. The rows are chosen adversarially: registered
 * symbols, recursion, declarations, and the deliberate-forgiveness set
 * (brands, getters, defaults) whose collisions are LAW, not accident.
 * Symbols use Symbol.for exclusively — a local symbol has no persistent
 * identity and must REFUSE (that law lives in the test, not the corpus).
 */

import { Effect, Schema, SchemaGetter } from "effect"
import { GzipEventFrame, WireEvent } from "../src/schema.ts"

const TreeSchema = Schema.Struct({
  v: Schema.String,
  kids: Schema.Array(Schema.suspend((): Schema.Top => TreeSchema)),
})

const stringGetter = (f: (s: string) => string) =>
  Schema.String.pipe(
    Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transform(f),
      encode: SchemaGetter.transform((s: string) => s),
    }),
  )

/** Every row lands in the fixture under its key. */
export const battery: Record<string, Schema.Top> = {
  wireEvent: WireEvent,
  gzipEventFrame: GzipEventFrame,
  plainStruct: Schema.Struct({ a: Schema.String }),
  registeredSymKeyA: Schema.Struct({ [Symbol.for("foldlab/a")]: Schema.String }),
  registeredSymKeyB: Schema.Struct({ [Symbol.for("foldlab/b")]: Schema.String }),
  uniqueSymbolA: Schema.UniqueSymbol(Symbol.for("foldlab/u1")),
  uniqueSymbolB: Schema.UniqueSymbol(Symbol.for("foldlab/u2")),
  symbolKeyword: Schema.Symbol,
  recursiveTree: TreeSchema,
  dateDeclaration: Schema.Date,
  bytesDeclaration: Schema.Uint8Array,
  bareString: Schema.String,
  checkedString: Schema.String.check(Schema.isPattern(/^[a-z]+$/)),
  brandA: Schema.String.pipe(Schema.brand("A")),
  brandB: Schema.String.pipe(Schema.brand("B")),
  getterUpper: stringGetter((s) => s.toUpperCase()),
  getterLower: stringGetter((s) => s.toLowerCase()),
  defaultlessStruct: Schema.Struct({ n: Schema.Number }),
  defaultedStruct: Schema.Struct({
    n: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(42))),
  }),
}

/** The forgiveness set: identical by LAW to bareString — brands, getter
 * behavior, and (for structs) constructor defaults are claims, never shape. */
export const forgivenAsBareString = [
  "brandA",
  "brandB",
  "getterUpper",
  "getterLower",
] as const
