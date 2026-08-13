/** Schema-derived fast-check inputs for the declared law grammar. */

import { Schema } from "effect"
import * as FastCheck from "fast-check"
import type {
  EventGeneratorSpec,
  FoldState,
  GeneratorSpec,
  ValueGenerator,
} from "./algebra.ts"
import type { StreamEvent } from "./stream.ts"

const boundedInteger = (minimum: number, maximum: number) =>
  Schema.Int.check(Schema.isBetween({ minimum, maximum }))

const normalizeSet = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)

const compileGenerator = (spec: GeneratorSpec): FastCheck.Arbitrary<FoldState> => {
  switch (spec.kind) {
    case "integer":
      return Schema.toArbitrary(boundedInteger(spec.minimum, spec.maximum))(FastCheck)
    case "optionalInteger":
      return Schema.toArbitrary(
        Schema.NullOr(boundedInteger(spec.minimum, spec.maximum)),
      )(FastCheck)
    case "boolean":
      return Schema.toArbitrary(Schema.Boolean)(FastCheck)
    case "stringSet":
      return Schema.toArbitrary(
        Schema.Array(Schema.String).check(Schema.isMaxLength(8)),
      )(FastCheck).map(normalizeSet)
    case "product":
      return FastCheck.tuple(...spec.of.map(compileGenerator))
  }
}

const streamEventSchema = Schema.Struct({
  stream: Schema.String.check(Schema.isMaxLength(12)),
  seq: Schema.Natural.check(Schema.isBetween({ minimum: 0, maximum: 1_000 })),
  payload: Schema.Uint8Array.check(Schema.isMaxLength(32)),
})

const streamEventArbitrary: FastCheck.Arbitrary<StreamEvent> =
  Schema.toArbitrary(streamEventSchema)(FastCheck)

/** Schema.toArbitrary licenses generators as derivatives of the declared carrier shape. */
export const arbitraryForValue = <A extends FoldState>(
  generator: ValueGenerator<A>,
): FastCheck.Arbitrary<A> => compileGenerator(generator.spec) as FastCheck.Arbitrary<A>

/** Schema.toArbitrary licenses generated events as values of the declared event structure. */
export const arbitraryForEvent = <E>(
  spec: EventGeneratorSpec,
): FastCheck.Arbitrary<E> => {
  switch (spec.kind) {
    case "streamEvent":
      return streamEventArbitrary as FastCheck.Arbitrary<unknown> as FastCheck.Arbitrary<E>
  }
}
