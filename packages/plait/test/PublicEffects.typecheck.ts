import type { Effect, Layer } from "effect"

import type { Refusal } from "../src/Refusal.js"

type PublicApi = typeof import("../src/index.js")
type PublicFunction = (...args: ReadonlyArray<never>) => unknown
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

type ReturnViolation<Return, Path extends string> =
  Return extends Effect.Effect<any, infer Error, any>
    ? ErrorViolation<Error, Path>
    : Return extends Layer.Layer<any, infer Error, any>
    ? ErrorViolation<Error, Path>
    : never

type ObjectViolations<Value, Path extends string> = {
  [Key in keyof Value & string]: PublicValueViolation<
    Value[Key],
    Join<Path, Key>
  >
}[keyof Value & string]

type ServiceViolations<
  Value,
  Shape,
  Path extends string,
> =
  | ObjectViolations<Shape, `${Path}#service`>
  | {
    [Key in Exclude<keyof Value, ServiceBaseKey> & string]: PublicValueViolation<
      Value[Key],
      Join<Path, Key>
    >
  }[Exclude<keyof Value, ServiceBaseKey> & string]

type PublicValueViolation<Value, Path extends string> =
  [ServiceShape<Value>] extends [never]
    ? Value extends PublicFunction
      ? ReturnViolation<ReturnType<Value>, Path>
      : never
    : ServiceViolations<Value, ServiceShape<Value>, Path>

type RootEntryViolations<Value, Path extends string> =
  [ServiceShape<Value>] extends [never]
    ? Value extends PublicFunction
      ? ReturnViolation<ReturnType<Value>, Path>
      : Value extends object
      ? ObjectViolations<Value, Path>
      : never
    : ServiceViolations<Value, ServiceShape<Value>, Path>

/** Public Effect and Layer functions whose complete error type is not Refusal. */
export type PublicSurfaceViolations<Value> = {
  [Key in keyof Value & string]: RootEntryViolations<Value[Key], Key>
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
