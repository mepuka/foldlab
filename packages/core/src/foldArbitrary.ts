/**
 * Random inputs for the law suites, compiled from what an algebra and a step
 * declare about themselves.
 *
 * Generation is derived, never hand-written beside the thing it tests: a
 * generator written separately can drift from the values its algebra actually
 * accumulates and leave a law passing over inputs the algebra never sees. Every
 * generator here is bounded, so a suite's cost stays fixed while the shapes it
 * explores stay the declared ones.
 */

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

/**
 * Compiles a carrier's declared generator description into random values of
 * that carrier.
 *
 * The values land inside the algebra's own domain by construction: bounds come
 * from the declaration, a product draws each slot from its member's
 * description, and set-valued carriers are sorted and de-duplicated so a
 * generated value is already in the form the algebra keeps. Feeding a law
 * anything outside that domain would be testing a different algebra.
 */
export const arbitraryForValue = <A extends FoldState>(
  generator: ValueGenerator<A>,
): FastCheck.Arbitrary<A> => compileGenerator(generator.spec) as FastCheck.Arbitrary<A>

/**
 * Compiles a step's declared event shape into random events.
 *
 * The events are drawn from the same structure a real stream event has, and
 * every part is bounded — a short stream name, a sequence number inside a small
 * range, a short payload of arbitrary bytes — so histories stay small enough to
 * shrink to a readable counterexample while payloads remain free to be
 * unreadable, which is the case a total step has to survive.
 */
export const arbitraryForEvent = <E>(
  spec: EventGeneratorSpec,
): FastCheck.Arbitrary<E> => {
  switch (spec.kind) {
    case "streamEvent":
      return streamEventArbitrary as FastCheck.Arbitrary<unknown> as FastCheck.Arbitrary<E>
  }
}
