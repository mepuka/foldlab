/**
 * The declared fold algebra. Runtime behavior stays plain functions; identity
 * exists only when the same behavior has a canonical declaration.
 */

import { createHash } from "node:crypto"
import type { StreamEvent } from "./stream.ts"

export type FoldState =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<FoldState>
  | { readonly [key: string]: FoldState }

export type GeneratorSpec =
  | { readonly kind: "integer"; readonly minimum: number; readonly maximum: number }
  | { readonly kind: "optionalInteger"; readonly minimum: number; readonly maximum: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "stringSet" }
  | { readonly kind: "product"; readonly of: ReadonlyArray<GeneratorSpec> }

export interface ValueGenerator<A extends FoldState> {
  readonly spec: GeneratorSpec
  readonly _State?: A
}

type PrimitiveAlgebraSpec =
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "sum" | "count"
    readonly semantics: "u32-add-mod-2^32"
  }
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "max" | "min"
    readonly semantics: "nullable-finite-number"
  }
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "any" | "all"
    readonly semantics: "boolean"
  }
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "setUnion"
    readonly semantics: "sorted-unique-unicode-strings-utf16"
  }

export type AlgebraSpec =
  | PrimitiveAlgebraSpec
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "product"
    readonly of: ReadonlyArray<AlgebraSpec>
  }
  | {
    readonly v: "foldlab.algebra.v1"
    readonly op: "mapped"
    readonly hom: HomSpec
    readonly source: AlgebraSpec
    readonly target: AlgebraSpec
  }

export type StepSpec =
  | { readonly v: "foldlab.step.v1"; readonly op: "constOne" }
  | { readonly v: "foldlab.step.v1"; readonly op: "payloadLength" }
  | { readonly v: "foldlab.step.v1"; readonly op: "sequenceNumber" }
  | { readonly v: "foldlab.step.v1"; readonly op: "payloadNonEmpty" }
  | { readonly v: "foldlab.step.v1"; readonly op: "streamSet" }
  | {
    readonly v: "foldlab.step.v1"
    readonly op: "payloadNumber"
    readonly path: ReadonlyArray<string>
  }
  | {
    readonly v: "foldlab.step.v1"
    readonly op: "product"
    readonly of: ReadonlyArray<StepSpec>
  }
  | {
    readonly v: "foldlab.step.v1"
    readonly op: "mapped"
    readonly hom: HomSpec
    readonly source: StepSpec
  }

export type HomSpec = {
  readonly v: "foldlab.hom.v1"
  readonly op: "isPositiveFromMax"
}

const DeclarationTypeId: unique symbol = Symbol.for("@foldlab/core/Declaration")

export interface Declaration<S> {
  readonly [DeclarationTypeId]: true
  readonly spec: S
  readonly encoding: string
  readonly digest: string
}

/** Identity and associativity license every `combine` exposed by an Algebra. */
export interface Algebra<A extends FoldState> {
  readonly empty: A
  combine(left: A, right: A): A
  readonly generator?: ValueGenerator<A>
  readonly declaration?: Declaration<AlgebraSpec>
  readonly identityIssue?: string
}

/** A declared step is the generator map whose canonical name licenses fold identity. */
export interface Step<E, A extends FoldState> {
  readonly apply: (event: E) => A
  readonly eventGenerator?: EventGeneratorSpec
  readonly declaration?: Declaration<StepSpec>
  readonly identityIssue?: string
}

export type EventGeneratorSpec = { readonly kind: "streamEvent" }

const DeclaredHomTypeId: unique symbol = Symbol.for("@foldlab/core/DeclaredHom")

/** Homomorphism commutation licenses deriving a mapped fold without replay. */
export interface DeclaredHom<A extends FoldState, B extends FoldState> {
  readonly [DeclaredHomTypeId]: true
  readonly source: Algebra<A>
  readonly target: Algebra<B>
  readonly map: (value: A) => B
  readonly declaration: Declaration<HomSpec>
}

export type AlgebraState<M> = M extends Algebra<infer A> ? A : never
export type ProductState<Ms extends ReadonlyArray<Algebra<FoldState>>> = {
  readonly [K in keyof Ms]: AlgebraState<Ms[K]>
}

export type CanonicalEncoding =
  | { readonly ok: true; readonly bytes: string }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "NonCanonicalValue"
      readonly path: string
      readonly reason: string
    }
  }

const byCodeUnit = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      index++
      const next = value.charCodeAt(index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true
    }
  }
  return false
}

const refuseEncoding = (path: string, reason: string): CanonicalEncoding => ({
  ok: false,
  refusal: { _tag: "NonCanonicalValue", path, reason },
})

const encodeValue = (
  value: FoldState,
  path: string,
  ancestors: Set<object>,
): CanonicalEncoding => {
  if (value === null || typeof value === "boolean") {
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return refuseEncoding(path, "number is not finite")
    if (Object.is(value, -0)) return refuseEncoding(path, "negative zero is outside the canonical domain")
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (typeof value === "string") {
    if (hasUnpairedSurrogate(value)) return refuseEncoding(path, "string is not valid Unicode")
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return refuseEncoding(path, "cyclic values are outside the canonical domain")
    ancestors.add(value)
    const parts: Array<string> = []
    for (let index = 0; index < value.length; index++) {
      const member = value[index]
      if (member === undefined) return refuseEncoding(`${path}/${index}`, "undefined is outside the canonical domain")
      const encoded = encodeValue(member, `${path}/${index}`, ancestors)
      if (!encoded.ok) return encoded
      parts.push(encoded.bytes)
    }
    ancestors.delete(value)
    return { ok: true, bytes: `[${parts.join(",")}]` }
  }
  const record = value as { readonly [key: string]: FoldState }
  if (ancestors.has(record)) return refuseEncoding(path, "cyclic values are outside the canonical domain")
  ancestors.add(record)
  const keys = Object.keys(record).sort(byCodeUnit)
  const members: Array<string> = []
  for (const key of keys) {
    if (hasUnpairedSurrogate(key)) return refuseEncoding(`${path}/${key}`, "member name is not valid Unicode")
    const member = record[key]
    if (member === undefined) return refuseEncoding(`${path}/${key}`, "undefined is outside the canonical domain")
    const encoded = encodeValue(member, `${path}/${key}`, ancestors)
    if (!encoded.ok) return encoded
    members.push(`${JSON.stringify(key)}:${encoded.bytes}`)
  }
  ancestors.delete(record)
  return { ok: true, bytes: `{${members.join(",")}}` }
}

/** RFC 8785 uniqueness licenses canonical bytes as the equality witness for fold states. */
export const encodeFoldState = (value: FoldState): CanonicalEncoding =>
  encodeValue(value, "$", new Set())

const declaration = <S extends AlgebraSpec | StepSpec | HomSpec>(
  spec: S,
): Declaration<S> | undefined => {
  const encoded = encodeFoldState(spec)
  if (!encoded.ok) return undefined
  return {
    [DeclarationTypeId]: true,
    spec,
    encoding: encoded.bytes,
    digest: createHash("sha256").update(encoded.bytes, "utf8").digest("hex"),
  }
}

const valueGenerator = <A extends FoldState>(spec: GeneratorSpec): ValueGenerator<A> => ({ spec })

const declaredAlgebra = <A extends FoldState>(
  spec: AlgebraSpec,
  empty: A,
  combine: (left: A, right: A) => A,
  generator: ValueGenerator<A>,
): Algebra<A> => {
  const declared = declaration(spec)
  return declared === undefined
    ? { empty, combine, generator, identityIssue: "algebra spec is outside the RFC 8785 domain" }
    : { empty, combine, generator, declaration: declared }
}

const normalizeSet = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(values)].sort(byCodeUnit)

const maxU32 = 0xffff_ffff
const modulusU32 = 0x1_0000_0000
const u32Generator = valueGenerator<number>({ kind: "integer", minimum: 0, maximum: maxU32 })
const optionalIntegerGenerator = valueGenerator<number | null>({
  kind: "optionalInteger",
  minimum: -1_000,
  maximum: 1_000,
})
const booleanGenerator = valueGenerator<boolean>({ kind: "boolean" })
const stringSetGenerator = valueGenerator<ReadonlyArray<string>>({ kind: "stringSet" })

const sum = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "sum", semantics: "u32-add-mod-2^32" },
  0,
  (left, right) => (left + right) % modulusU32,
  u32Generator,
)
const count = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "count", semantics: "u32-add-mod-2^32" },
  0,
  (left, right) => (left + right) % modulusU32,
  u32Generator,
)
const max = declaredAlgebra<number | null>(
  { v: "foldlab.algebra.v1", op: "max", semantics: "nullable-finite-number" },
  null,
  (left, right) => left === null ? right : right === null ? left : Math.max(left, right),
  optionalIntegerGenerator,
)
const min = declaredAlgebra<number | null>(
  { v: "foldlab.algebra.v1", op: "min", semantics: "nullable-finite-number" },
  null,
  (left, right) => left === null ? right : right === null ? left : Math.min(left, right),
  optionalIntegerGenerator,
)
const any = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "any", semantics: "boolean" },
  false,
  (left, right) => left || right,
  booleanGenerator,
)
const all = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "all", semantics: "boolean" },
  true,
  (left, right) => left && right,
  booleanGenerator,
)
const setUnion = declaredAlgebra<ReadonlyArray<string>>(
  {
    v: "foldlab.algebra.v1",
    op: "setUnion",
    semantics: "sorted-unique-unicode-strings-utf16",
  },
  [],
  (left, right) => normalizeSet([...left, ...right]),
  stringSetGenerator,
)

/** Monoid identity and associativity license the seven declared primitive values. */
export const algebras = { sum, count, max, min, any, all, setUnion } as const

const algebraIssue = (members: ReadonlyArray<Algebra<FoldState>>): string | undefined => {
  const first = members.find((member) => member.declaration === undefined)
  return first === undefined ? undefined : first.identityIssue ?? "a product member is anonymous"
}

/** The product universal property licenses one component-wise monoid over all members. */
export const product = <const Ms extends ReadonlyArray<Algebra<FoldState>>>(
  ...members: Ms
): Algebra<ProductState<Ms>> => {
  const empty = members.map((member) => member.empty) as ProductState<Ms>
  const combine = (left: ProductState<Ms>, right: ProductState<Ms>): ProductState<Ms> =>
    members.map((member, index) =>
      member.combine(left[index] as FoldState, right[index] as FoldState)
    ) as ProductState<Ms>
  const generators = members.map((member) => member.generator)
  const generatorSpecs: Array<GeneratorSpec> = []
  for (const candidate of generators) {
    if (candidate !== undefined) generatorSpecs.push(candidate.spec)
  }
  const generator = generatorSpecs.length === members.length
    ? valueGenerator<ProductState<Ms>>({ kind: "product", of: generatorSpecs })
    : undefined
  const issue = algebraIssue(members)
  if (issue !== undefined) {
    return {
      empty,
      combine,
      ...(generator === undefined ? {} : { generator }),
      identityIssue: issue,
    }
  }
  const spec: AlgebraSpec = {
    v: "foldlab.algebra.v1",
    op: "product",
    of: members.flatMap((member) => member.declaration === undefined ? [] : [member.declaration.spec]),
  }
  const declared = declaration(spec)
  return declared === undefined
    ? {
      empty,
      combine,
      ...(generator === undefined ? {} : { generator }),
      identityIssue: "product spec is outside the RFC 8785 domain",
    }
    : { empty, combine, ...(generator === undefined ? {} : { generator }), declaration: declared }
}

const positiveSpec: HomSpec = {
  v: "foldlab.hom.v1",
  op: "isPositiveFromMax",
}
const positiveEncoding = "{\"op\":\"isPositiveFromMax\",\"v\":\"foldlab.hom.v1\"}"
const positiveDeclaration: Declaration<HomSpec> = {
  [DeclarationTypeId]: true,
  spec: positiveSpec,
  encoding: positiveEncoding,
  digest: createHash("sha256").update(positiveEncoding, "utf8").digest("hex"),
}

/** Homomorphism commutation licenses every function admitted to this closed registry. */
export const homomorphisms = {
  isPositiveFromMax: {
    [DeclaredHomTypeId]: true,
    source: max,
    target: any,
    map: (value: number | null): boolean => value !== null && value > 0,
    declaration: positiveDeclaration,
  },
} as const

/** Homomorphism commutation licenses the target algebra as a replay-free mapped view. */
export const mapped = <A extends FoldState, B extends FoldState>(
  hom: DeclaredHom<A, B>,
  source: Algebra<A>,
): Algebra<B> => {
  const compatible = source.declaration !== undefined &&
    hom.source.declaration !== undefined &&
    source.declaration.digest === hom.source.declaration.digest
  if (!compatible || hom.target.declaration === undefined) {
    return {
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      identityIssue: source.identityIssue ?? "homomorphism source does not match the algebra declaration",
    }
  }
  const spec: AlgebraSpec = {
    v: "foldlab.algebra.v1",
    op: "mapped",
    hom: hom.declaration.spec,
    source: source.declaration.spec,
    target: hom.target.declaration.spec,
  }
  const declared = declaration(spec)
  return declared === undefined
    ? {
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      identityIssue: "mapped algebra spec is outside the RFC 8785 domain",
    }
    : {
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      declaration: declared,
    }
}

const streamEvents: EventGeneratorSpec = { kind: "streamEvent" }

const declaredStep = <A extends FoldState>(
  spec: StepSpec,
  apply: (event: StreamEvent) => A,
): Step<StreamEvent, A> => {
  const declared = declaration(spec)
  return declared === undefined
    ? {
      apply,
      eventGenerator: streamEvents,
      identityIssue: "step spec is outside the RFC 8785 domain",
    }
    : { apply, eventGenerator: streamEvents, declaration: declared }
}

const decoder = new TextDecoder("utf-8", { fatal: true })

const readPayloadNumber = (event: StreamEvent, path: ReadonlyArray<string>): number | null => {
  let value: unknown
  try {
    value = JSON.parse(decoder.decode(event.payload))
  } catch {
    return null
  }
  for (const field of path) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null
    value = Object.prototype.hasOwnProperty.call(value, field)
      ? (value as Record<string, unknown>)[field]
      : undefined
  }
  return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)
    ? value
    : null
}

/** The generator-map law licenses these declared event-to-carrier steps. */
export const steps = {
  constOne: declaredStep({ v: "foldlab.step.v1", op: "constOne" }, () => 1),
  payloadLength: declaredStep(
    { v: "foldlab.step.v1", op: "payloadLength" },
    (event) => event.payload.length,
  ),
  sequenceNumber: declaredStep(
    { v: "foldlab.step.v1", op: "sequenceNumber" },
    (event) => event.seq,
  ),
  payloadNonEmpty: declaredStep(
    { v: "foldlab.step.v1", op: "payloadNonEmpty" },
    (event) => event.payload.length > 0,
  ),
  streamSet: declaredStep(
    { v: "foldlab.step.v1", op: "streamSet" },
    (event) => [event.stream],
  ),
  /** Total generator-map law: invalid numeric paths map to the max/min identity. */
  payloadNumber: (path: ReadonlyArray<string>): Step<StreamEvent, number | null> => {
    const fields = [...path]
    return declaredStep(
      { v: "foldlab.step.v1", op: "payloadNumber", path: fields },
      (event) => readPayloadNumber(event, fields),
    )
  },
} as const

/** Product uniqueness licenses a single event step that computes all component steps once. */
export const productStep = <E, const As extends ReadonlyArray<FoldState>>(
  ...members: { readonly [K in keyof As]: Step<E, As[K]> }
): Step<E, As> => {
  const apply = (event: E): As => members.map((member) => member.apply(event)) as unknown as As
  const declarations = members.map((member) => member.declaration)
  const eventGenerator = members[0]?.eventGenerator
  if (!declarations.every((candidate) => candidate !== undefined)) {
    return {
      apply,
      ...(eventGenerator === undefined ? {} : { eventGenerator }),
      identityIssue: members.find((member) => member.declaration === undefined)?.identityIssue ??
        "a product step is anonymous",
    }
  }
  const spec: StepSpec = {
    v: "foldlab.step.v1",
    op: "product",
    of: declarations.flatMap((candidate) => candidate === undefined ? [] : [candidate.spec]),
  }
  const declared = declaration(spec)
  return declared === undefined
    ? {
      apply,
      ...(eventGenerator === undefined ? {} : { eventGenerator }),
      identityIssue: "product step spec is outside the RFC 8785 domain",
    }
    : { apply, ...(eventGenerator === undefined ? {} : { eventGenerator }), declaration: declared }
}

/** Homomorphism commutation licenses mapping each generator contribution before combination. */
export const mappedStep = <E, A extends FoldState, B extends FoldState>(
  hom: DeclaredHom<A, B>,
  source: Step<E, A>,
): Step<E, B> => {
  const apply = (event: E): B => hom.map(source.apply(event))
  if (source.declaration === undefined) {
    return {
      apply,
      ...(source.eventGenerator === undefined ? {} : { eventGenerator: source.eventGenerator }),
      identityIssue: source.identityIssue ?? "the source step is anonymous",
    }
  }
  const spec: StepSpec = {
    v: "foldlab.step.v1",
    op: "mapped",
    hom: hom.declaration.spec,
    source: source.declaration.spec,
  }
  const declared = declaration(spec)
  return declared === undefined
    ? {
      apply,
      ...(source.eventGenerator === undefined ? {} : { eventGenerator: source.eventGenerator }),
      identityIssue: "mapped step spec is outside the RFC 8785 domain",
    }
    : {
      apply,
      ...(source.eventGenerator === undefined ? {} : { eventGenerator: source.eventGenerator }),
      declaration: declared,
    }
}
