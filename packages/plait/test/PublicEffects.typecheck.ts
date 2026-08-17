import type { Effect, Layer, Schema, Stream } from "effect"

import type { Refusal } from "../src/Refusal.js"

type PublicApi = typeof import("../src/index.js")
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

/** Supplemental compile-time tripwire; the emitted-declaration gate owns the surface claim. */
export type PublicEffectErrorConformance = AssertNever<
  PublicSurfaceViolations<PublicApi>
>
