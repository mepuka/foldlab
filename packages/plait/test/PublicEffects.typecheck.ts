import type { Effect, Layer, Schema, Stream } from "effect"

import type { Refusal } from "../src/Refusal.js"

/** The public barrel this walk quantifies over. */
export type PublicApi = typeof import("../src/index.js")
type PublicFunction = (...args: ReadonlyArray<never>) => unknown
type SurfaceDepth = ReadonlyArray<unknown>
type NextDepth<Depth extends SurfaceDepth> = readonly [...Depth, unknown]
type SchemaSurface<Value> = Value extends Schema.Top
  ? Omit<Value, keyof Schema.Top>
  : Value
type ServiceBaseKey =
  | "prototype"
  | "key"
  | "Service"
  | "Identifier"
  | "of"
  | "context"
  | "use"
  | "useSync"
type ServiceShape<Value> = Value extends {
  readonly key: string
  readonly Service: infer Shape
} ? Shape : never

type Join<Prefix extends string, Key extends string> =
  Prefix extends "" ? Key : `${Prefix}.${Key}`

type ErrorViolation<Error, Path extends string> =
  [Error] extends [Refusal] ? never : Path

type ObjectViolations<
  Value,
  Path extends string,
  Seen,
  Depth extends SurfaceDepth,
> = {
  [Key in keyof Value & string]: PublicValueViolation<
    Value[Key],
    Join<Path, Key>,
    Seen,
    NextDepth<Depth>
  >
}[keyof Value & string]

type ServiceViolations<
  Value,
  Shape,
  Path extends string,
  Seen,
  Depth extends SurfaceDepth,
> =
  | ObjectViolations<Shape, `${Path}#service`, Seen, Depth>
  | {
    [Key in Exclude<keyof Value, ServiceBaseKey> & string]: PublicValueViolation<
      Value[Key],
      Join<Path, Key>,
      Seen,
      NextDepth<Depth>
    >
  }[Exclude<keyof Value, ServiceBaseKey> & string]

type PublicValueViolation<
  Value,
  Path extends string,
  Seen = never,
  Depth extends SurfaceDepth = readonly [],
> = Depth["length"] extends 8
  ? never
  : [Value] extends [Seen]
  ? never
  : [ServiceShape<Value>] extends [never]
  ? Value extends Effect.Effect<infer Success, infer Error, any>
    ? ErrorViolation<Error, Path>
      | (Success extends Stream.Stream<any, infer StreamError, any>
        ? ErrorViolation<StreamError, `${Path}#success`>
        : never)
    : Value extends Stream.Stream<any, infer Error, any>
    ? ErrorViolation<Error, Path>
    : Value extends Layer.Layer<any, infer Error, any>
    ? ErrorViolation<Error, Path>
    : Value extends PublicFunction
      ? PublicValueViolation<ReturnType<Value>, Path, Seen | Value, NextDepth<Depth>>
      : Value extends object
      ? ObjectViolations<SchemaSurface<Value>, Path, Seen | Value, Depth>
      : never
  : ServiceViolations<Value, ServiceShape<Value>, Path, Seen | Value, Depth>

/** Public Effect and Layer functions whose complete error type is not Refusal. */
export type PublicSurfaceViolations<Value> = {
  [Key in keyof Value & string]: PublicValueViolation<Value[Key], Key>
}[keyof Value & string]

/** Whether a public function returns an Effect whose complete error type is Refusal. */
export type IsRefusalEffect<F extends PublicFunction> =
  ReturnType<F> extends Effect.Effect<unknown, infer Error, unknown>
    ? [Error] extends [Refusal] ? true : false
    : false

/** Fails compilation unless its argument is literally true. */
export type Assert<T extends true> = T

/** Fails compilation unless the public-surface violation union is empty. */
export type AssertNever<T extends never> = T

/**
 * The barrel resolved a second time, independently of whatever a caller
 * quantifies over, so a narrowed quantifier cannot be compared against itself.
 */
type PublicApiWitness = typeof import("../src/index.js")

/**
 * The vacuity guard, in the declaration walk's own shape: refuse an empty
 * quantifier by name, then require a bound witness — the walked surface must
 * carry the whole barrel, not a narrowing of it. Without this, narrowing the
 * quantifier to `Pick<PublicApi, never>` left the battery green over a live
 * cross-package violation (DEV-722).
 */
type SurfaceQuantifierDefect<Surface> = [keyof Surface & string] extends [never]
  ? "the walked public surface is empty"
  : [Surface] extends [PublicApiWitness]
  ? never
  : "the walked public surface is not the whole public barrel"

/**
 * Every reason this walk refuses `Surface`: its quantifier defects first, then
 * each reachable carrier whose complete error type is not Refusal. The
 * quantifier is named once, so narrowing it reddens this same union.
 */
export type BoundSurfaceViolations<Surface> =
  | SurfaceQuantifierDefect<Surface>
  | PublicSurfaceViolations<Surface>

/**
 * Load-bearing for members authored outside this package's `src` — the class
 * the emitted-declaration walk's authorship filter cannot reach; that gate owns
 * every other public-surface class (DECISIONS T7).
 */
export type PublicEffectErrorConformance = AssertNever<
  BoundSurfaceViolations<PublicApi>
>
