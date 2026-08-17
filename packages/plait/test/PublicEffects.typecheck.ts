import type { Effect, Layer, Stream } from "effect"

import type { Refusal } from "../src/Refusal.js"

type PublicApi = typeof import("../src/index.js")
type PublicFunction = (...args: ReadonlyArray<never>) => unknown
type PublicConstructor = abstract new (...args: ReadonlyArray<any>) => unknown
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

type ObjectViolations<Value, Path extends string, Seen> = {
  [Key in keyof Value & string]: PublicValueViolation<
    Value[Key],
    Join<Path, Key>,
    Seen
  >
}[keyof Value & string]

type ServiceViolations<
  Value,
  Shape,
  Path extends string,
  Seen,
> =
  | ObjectViolations<Shape, `${Path}#service`, Seen>
  | {
    [Key in Exclude<keyof Value, ServiceBaseKey> & string]: PublicValueViolation<
      Value[Key],
      Join<Path, Key>,
      Seen
    >
  }[Exclude<keyof Value, ServiceBaseKey> & string]

type PublicValueViolation<
  Value,
  Path extends string,
  Seen = never,
> = [Value] extends [Seen]
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
      ? PublicValueViolation<ReturnType<Value>, Path, Seen | Value>
      : Value extends { readonly ast: unknown }
      ? never
      : Value extends PublicConstructor
      ? never
      : Value extends object
      ? ObjectViolations<Value, Path, Seen | Value>
      : never
  : ServiceViolations<Value, ServiceShape<Value>, Path, Seen | Value>

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

/** Derived compile-time assertion over the complete public slice-0 surface. */
export type PublicEffectErrorConformance = AssertNever<
  PublicSurfaceViolations<PublicApi>
>
