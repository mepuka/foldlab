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

const surrogateAdjacent = FastCheck.constantFrom("\ud7ff", "\ue000", "\ufffd", "\ud83d\ude00")
const unicodeScalar = FastCheck.oneof(
  { weight: 7, arbitrary: FastCheck.string({ unit: "binary", minLength: 1, maxLength: 1 }) },
  { weight: 1, arbitrary: surrogateAdjacent },
)

/**
 * Strings for proof inputs. `Schema.String` currently compiles to fast-check's
 * ASCII-default string arbitrary, so the proof layer owns this explicit
 * Unicode-scalar generator instead. The weighted fixed values keep both sides
 * of the surrogate range and a supplementary scalar in every deterministic
 * sample campaign without ever generating an unpaired surrogate.
 */
export const arbitraryForUnicodeString = (
  constraints: { readonly minLength?: number; readonly maxLength: number },
): FastCheck.Arbitrary<string> => FastCheck.string({
  unit: unicodeScalar,
  ...(constraints.minLength === undefined ? {} : { minLength: constraints.minLength }),
  maxLength: constraints.maxLength,
})

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
      return FastCheck.array(arbitraryForUnicodeString({ maxLength: 12 }), { maxLength: 8 })
        .map(normalizeSet)
    case "product":
      return FastCheck.tuple(...spec.of.map(compileGenerator))
  }
}

const streamSequence = FastCheck.oneof(
  { weight: 7, arbitrary: FastCheck.integer({ min: 0, max: 1_000 }) },
  { weight: 1, arbitrary: FastCheck.constantFrom(0x7fff_ffff, 0xffff_fffe, 0xffff_ffff) },
)

const streamEventArbitrary: FastCheck.Arbitrary<StreamEvent> = FastCheck.record({
  stream: arbitraryForUnicodeString({ maxLength: 12 }),
  seq: streamSequence,
  payload: FastCheck.uint8Array({ maxLength: 32 }),
})

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
 * every part is bounded — a short Unicode stream name, a sequence number drawn
 * mostly from a small range plus the u32 edges, and a short payload of
 * arbitrary bytes. Histories therefore shrink to readable counterexamples
 * while still reaching modular wrap and unreadable payloads.
 */
export const arbitraryForEvent = <E>(
  spec: EventGeneratorSpec,
): FastCheck.Arbitrary<E> => {
  switch (spec.kind) {
    case "streamEvent":
      return streamEventArbitrary as FastCheck.Arbitrary<unknown> as FastCheck.Arbitrary<E>
  }
}

/**
 * Compiles the histories used by laws that claim something about replay.
 * Ordinary shrinking histories remain the dominant case, while one weighted
 * branch always crosses the u32 boundary through events. That makes modular
 * semantics reachable by the banana-split, split, and map-commutation gates
 * instead of only by carrier-value laws.
 */
export const arbitraryForHistory = <E>(
  spec: EventGeneratorSpec,
  event: FastCheck.Arbitrary<E>,
  maximumLength: number,
): FastCheck.Arbitrary<ReadonlyArray<E>> => {
  switch (spec.kind) {
    case "streamEvent": {
      const overflow = FastCheck.tuple(streamEventArbitrary, streamEventArbitrary)
        .map(([left, right]) => [
          { ...left, seq: 0xffff_ffff },
          { ...right, seq: 1 },
        ] as ReadonlyArray<StreamEvent>)
      return FastCheck.oneof(
        { weight: 7, arbitrary: FastCheck.array(event, { maxLength: maximumLength }) },
        { weight: 1, arbitrary: overflow as FastCheck.Arbitrary<ReadonlyArray<E>> },
      )
    }
  }
}
