/**
 * The declared fold algebra. In Effect v4 terms its behavior is a `Reducer`
 * (`initialValue` plus `combine`; classically a monoid instance), and a name is
 * carried by a separate canonical declaration; identity exists only where a
 * value has both.
 *
 * A value earns a declaration when its own description encodes canonically and
 * every part it was built from already carried one. Nothing here inspects a
 * function to decide whether it deserves a name, so a value that loses its
 * declaration still computes exactly what it computed before — it is anonymous,
 * not broken, and `identityIssue` says in plain words what it lacks.
 */

import { createHash } from "node:crypto"
import { decodeJson, encodeJsonValue, type CanonicalEncoding as JcsCanonicalEncoding } from "./jcs.ts"
import type { StreamEvent } from "./stream.ts"

/**
 * The values a fold may accumulate. The shape is exactly what canonical JSON
 * describes, so any state can be reduced to bytes and two states compared by
 * those bytes rather than by reference. Membership in the type is not the same
 * as being encodable: a number that is not finite, a string holding half a
 * surrogate pair, or a value that contains itself typechecks here and is
 * refused by `encodeFoldState`.
 */
export type FoldState =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<FoldState>
  | { readonly [key: string]: FoldState }

/**
 * A description of the random values a carrier admits, written as data rather
 * than as a function. Because the description travels with the algebra that
 * declares it, the property suites draw their inputs from what the algebra says
 * about itself; a hand-written generator kept beside the algebra could drift
 * from it without anything noticing.
 */
export type GeneratorSpec =
  | { readonly kind: "integer"; readonly minimum: number; readonly maximum: number }
  | { readonly kind: "optionalInteger"; readonly minimum: number; readonly maximum: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "stringSet" }
  | { readonly kind: "product"; readonly of: ReadonlyArray<GeneratorSpec> }

/**
 * A generator description tied to the carrier it produces. `_State` exists only
 * to hold that carrier type; it is never written and never read at runtime, so
 * the carrier is a compile-time claim that the values compiled from `spec`
 * belong to the algebra carrying it.
 */
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

/**
 * The canonical description of an algebra: which operation it is, the semantics
 * that pin how it behaves at the edges, and, for composed algebras, the
 * descriptions it was built from. This is the data a digest names, so two
 * algebras carry the same identity exactly when their descriptions encode to
 * the same bytes — the version field keeps a later grammar from silently
 * reusing an earlier name.
 */
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

/**
 * The canonical description of a step: which event reading it performs, plus
 * the descriptions of the steps it was composed from. A path-carrying step
 * names its path, so two steps reading different fields are different names.
 */
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

/**
 * The canonical description of a declared value map. The registry of such maps
 * is closed, so this grammar lists every map that exists rather than describing
 * an open family; adding one means adding a name here and proving its law.
 */
export type HomSpec = {
  readonly v: "foldlab.hom.v1"
  readonly op: "isPositiveFromMax"
}

// File-private brand: a fresh `Symbol()`, NOT `Symbol.for(...)`. The global
// symbol registry is reachable from any module, so a `Symbol.for` key lets
// outside code mint an object carrying the brand at runtime and impersonate a
// Declaration; a file-private symbol cannot be named or re-minted anywhere
// else, so a branded value was constructed by this module's own `declaration`.
const DeclarationTypeId: unique symbol = Symbol("@foldlab/core/Declaration")

/**
 * A name for a declared value: its description, that description's canonical
 * bytes, and their digest, under a brand that only this module can apply.
 *
 * The encoding is the canonical form of the description and the digest is the
 * hash of those bytes, so equal digests mean equal descriptions — canonical
 * form gives each description exactly one byte string, and nothing else in this
 * module compares descriptions any other way.
 *
 * The brand authenticates declaration data, not the behavior it is attached to;
 * `hasAdmittedDeclaration` states the limit that leaves standing.
 */
export interface Declaration<S> {
  readonly [DeclarationTypeId]: true
  readonly spec: S
  readonly encoding: string
  readonly digest: string
}

/**
 * The runtime admission check behind the brand: a caller-supplied declaration
 * is trusted only when it carries the file-private brand. The static type is
 * already nominal (the `unique symbol` key is unnameable outside this file), so
 * a forgery can reach a gate only through a deliberate `as` cast; this refuses
 * that forgery at runtime rather than trusting its copied digest.
 */
const isDeclaration = <S>(value: Declaration<S> | undefined): value is Declaration<S> =>
  value !== undefined &&
  (value as { readonly [DeclarationTypeId]?: unknown })[DeclarationTypeId] === true

/**
 * The two laws beyond the monoid that an algebra may claim about its combine,
 * each one a right that some caller wants and neither one free.
 *
 * `commutative` says the two arguments may be swapped, which is what licenses
 * folding a history whose order was never agreed — two hosts that never spoke
 * can each fold what they saw and combine. `idempotent` says a value combined
 * with itself is itself, which is what licenses re-delivery: an event or a
 * whole state may arrive twice without moving the answer. Together they turn a
 * monoid into a join-semilattice, and a join-semilattice is exactly the shape
 * that merges without coordination.
 *
 * A claim here is a claim, not a proof, and it is carried OUTSIDE the canonical
 * spec on purpose. Every algebra digest in `fixtures/fold-pin.json` is the hash
 * of the spec's canonical bytes, so a field added to `AlgebraSpec` would move
 * seven frozen digests to record something no consumer reads back. It rides
 * beside the spec instead, exactly as `generator` does — and like `generator`
 * it earns its keep by being read by the generated suites, which turn each
 * claim into a property test that can fail.
 */
export interface AlgebraLaws {
  readonly commutative: boolean
  readonly idempotent: boolean
}

/** No claim beyond the monoid: the conservative default for anything derived. */
const noExtraLaws: AlgebraLaws = Object.freeze({ commutative: false, idempotent: false })

/** Module-issued claims are immutable and never shared between algebras. */
const ownedLaws = (laws: AlgebraLaws): AlgebraLaws => Object.freeze({ ...laws })

/** Module-issued algebra records are process-wide descriptors, not work state. */
const ownedAlgebra = <A extends FoldState>(algebra: Algebra<A>): Algebra<A> =>
  Object.freeze(algebra)

/**
 * A carrier with a neutral value and a way to combine two values into one.
 *
 * Two laws are required of every algebra and neither can be shown by the type:
 * combining the neutral value with anything returns that thing unchanged, and
 * combining three values gives the same answer however the pair is grouped.
 * Those two are what let a history be split anywhere and folded in pieces, so
 * an algebra that breaks them silently breaks every fold built on it; the
 * generated suites check both against the declared generator.
 *
 * `laws` carries whatever the algebra claims beyond those two. An absent claim
 * is not a denial — it is the absence of a right, and the suites test exactly
 * what is claimed, so an algebra can never hold a right no property checked.
 *
 * A declaration is present only when this module minted one. When it is absent
 * the algebra is still usable and `identityIssue` states in plain words why no
 * name was earned.
 */
export interface Algebra<A extends FoldState> {
  readonly empty: A
  combine(left: A, right: A): A
  readonly generator?: ValueGenerator<A>
  readonly laws?: AlgebraLaws
  readonly declaration?: Declaration<AlgebraSpec>
  readonly identityIssue?: string
}

/**
 * The per-event half of a fold: it turns one event into one carrier value,
 * which the algebra then combines with what came before.
 *
 * A step must be total. It has no failure channel, so an event it cannot read
 * has to resolve to some carrier value — the declared numeric reader answers
 * with the neutral value rather than refusing — and a step that throws breaks
 * folds that the algebra's laws would otherwise have protected.
 *
 * A step reaching a fold as a plain function is behavior without a name: it
 * folds identically and carries no declaration, and `identityIssue` says so.
 */
export interface Step<E, A extends FoldState> {
  readonly apply: (event: E) => A
  readonly eventGenerator?: EventGeneratorSpec
  readonly declaration?: Declaration<StepSpec>
  readonly identityIssue?: string
}

/**
 * Reports whether the declaration attached to a value was minted here.
 *
 * Outside code can copy a real description, its real canonical bytes, and its
 * real digest onto an object of its own; it cannot copy the brand. So this
 * refuses a fabricated declaration whose every visible field is genuine, and it
 * is the check every gate in this module runs before treating a digest as a
 * name it may trust.
 *
 * The brand authenticates declaration data, not the behavior attached to it: a
 * genuine declaration re-hosted onto a foreign combine or a foreign step passes
 * both this check and every digest comparison downstream of it. No consumer yet
 * depends on the distinction.
 */
export const hasAdmittedDeclaration = <S>(
  value: { readonly declaration?: Declaration<S> },
): value is { readonly declaration: Declaration<S> } =>
  isDeclaration(value.declaration)

/**
 * The event shape a step declares it can read. A suite can only generate
 * histories for a step whose event shape is declared, which is why a step
 * without one is refused law inputs rather than checked against nothing.
 */
export type EventGeneratorSpec = { readonly kind: "streamEvent" }

// File-private brand, for the same reason as `DeclarationTypeId`: the closed
// registry of declared value maps is trustworthy only if such a map cannot be
// minted outside this module.
const DeclaredHomTypeId: unique symbol = Symbol("@foldlab/core/DeclaredHom")

/**
 * A declared map from one algebra's values to another's, carrying this module's
 * brand and naming both endpoints.
 *
 * The law it must satisfy is called a homomorphism, which in plain words means
 * two things: the source's neutral value maps to the target's, and mapping two
 * values and then combining them in the target gives the same answer as
 * combining them in the source and mapping once. That agreement is the whole
 * point — it is what allows the target's result to be read off an already
 * accumulated source state instead of folding the history a second time.
 */
export interface DeclaredHom<A extends FoldState, B extends FoldState> {
  readonly [DeclaredHomTypeId]: true
  readonly source: Algebra<A>
  readonly target: Algebra<B>
  readonly map: (value: A) => B
  readonly declaration: Declaration<HomSpec>
}

/** A declared map is admitted only if it carries this module's private brand. */
const isDeclaredHom = <A extends FoldState, B extends FoldState>(
  value: DeclaredHom<A, B>,
): boolean => (value as { readonly [DeclaredHomTypeId]?: unknown })[DeclaredHomTypeId] === true

/** Reads the carrier type back out of an algebra type. */
export type AlgebraState<M> = M extends Algebra<infer A> ? A : never

/**
 * The carrier of a product: one slot per member, in the order the members were
 * given. Position is the only thing that ties a value to its member, so the
 * order a product was built in is part of what it means.
 */
export type ProductState<Ms extends ReadonlyArray<Algebra<FoldState>>> = {
  readonly [K in keyof Ms]: AlgebraState<Ms[K]>
}

/**
 * The result of canonical encoding: bytes, or a refusal naming the path that
 * left the canonical domain. Re-exported so a caller handling a refusal from a
 * fold need not reach into the canonical-JSON module to name it.
 */
export type CanonicalEncoding = JcsCanonicalEncoding

const byCodeUnit = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

/**
 * Encodes a fold state as canonical JSON bytes.
 *
 * Canonical form gives each value exactly one byte string, which is what makes
 * the bytes usable as the equality witness: every comparison of fold states in
 * this package is a comparison of these bytes, so states that differ only in key
 * order or in how they were built compare equal, and nothing compares equal by
 * accident.
 *
 * Refuses, rather than throws, on anything outside that domain — a number that
 * is not finite, a string or member name holding half a surrogate pair, a value
 * that contains itself, an `undefined` member, or an object that is not plain —
 * as a `NonCanonicalValue` refusal naming the path where it stopped.
 */
export const encodeFoldState = (value: FoldState): CanonicalEncoding =>
  encodeJsonValue(value)

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
  laws: AlgebraLaws,
): Algebra<A> => {
  const declared = declaration(spec)
  const claims = ownedLaws(laws)
  return ownedAlgebra(declared === undefined
    ? {
      empty,
      combine,
      generator,
      laws: claims,
      identityIssue: "algebra spec is outside the RFC 8785 domain",
    }
    : { empty, combine, generator, laws: claims, declaration: declared })
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

// Addition commutes and absorbs nothing: `sum` and `count` may be folded in any
// order but never over a re-delivered value, so they claim commutativity alone.
const addition: AlgebraLaws = { commutative: true, idempotent: false }
// A maximum, a minimum, a boolean connective and a set union are all joins: two
// arguments may be swapped and a value may arrive twice. These five are the
// federating half of the registry.
const join: AlgebraLaws = { commutative: true, idempotent: true }

const sum = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "sum", semantics: "u32-add-mod-2^32" },
  0,
  (left, right) => (left + right) % modulusU32,
  u32Generator,
  addition,
)
const count = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "count", semantics: "u32-add-mod-2^32" },
  0,
  (left, right) => (left + right) % modulusU32,
  u32Generator,
  addition,
)
const max = declaredAlgebra<number | null>(
  { v: "foldlab.algebra.v1", op: "max", semantics: "nullable-finite-number" },
  null,
  (left, right) => left === null ? right : right === null ? left : Math.max(left, right),
  optionalIntegerGenerator,
  join,
)
const min = declaredAlgebra<number | null>(
  { v: "foldlab.algebra.v1", op: "min", semantics: "nullable-finite-number" },
  null,
  (left, right) => left === null ? right : right === null ? left : Math.min(left, right),
  optionalIntegerGenerator,
  join,
)
const any = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "any", semantics: "boolean" },
  false,
  (left, right) => left || right,
  booleanGenerator,
  join,
)
const all = declaredAlgebra(
  { v: "foldlab.algebra.v1", op: "all", semantics: "boolean" },
  true,
  (left, right) => left && right,
  booleanGenerator,
  join,
)
const setUnion = declaredAlgebra<ReadonlyArray<string>>(
  {
    v: "foldlab.algebra.v1",
    op: "setUnion",
    semantics: "sorted-unique-unicode-strings-utf16",
  },
  Object.freeze([] as Array<string>),
  (left, right) => normalizeSet([...left, ...right]),
  stringSetGenerator,
  join,
)

/**
 * The seven declared primitives, each with a neutral value and an associative
 * way to combine.
 *
 * Each one is total by its declared semantics, and the semantics is the part a
 * name commits to: `sum` and `count` add with 32-bit wraparound, so they never
 * overflow out of the carrier; `max` and `min` take the absent value as
 * neutral, so an empty history has an answer; `any` is boolean or and `all` is
 * boolean and; `setUnion` keeps strings sorted and unique, so a set has one
 * representation and the same members always encode to the same bytes.
 *
 * Five of the seven claim to be joins — `max`, `min`, `any`, `all`, `setUnion`
 * — and are therefore the ones a federated fold may be built on. `sum` and
 * `count` claim commutativity only: they may be folded in any order, but a
 * value that arrives twice is counted twice, so neither may be handed a history
 * that can re-deliver. Every one of those claims is a generated property test,
 * not a remark.
 */
export const algebras = Object.freeze({ sum, count, max, min, any, all, setUnion } as const)

const algebraIssue = (members: ReadonlyArray<Algebra<FoldState>>): string | undefined => {
  const first = members.find((member) => !isDeclaration(member.declaration))
  return first === undefined
    ? undefined
    : first.identityIssue ?? "a product member has no declared spec, so no content address"
}

/**
 * Puts several algebras side by side as one algebra that works slot by slot,
 * each member seeing only its own slot and never its neighbours'.
 *
 * The result is itself an algebra whenever every member is: the neutral values
 * line up into one neutral tuple, and grouping does not matter in the whole
 * because it does not matter in any slot. That is what lets several folds share
 * one pass over a history without any of them being weakened.
 *
 * A name is earned only when every member carries an admitted declaration and
 * the combined description encodes canonically. Otherwise the product still
 * combines exactly as it would have, and `identityIssue` carries the first
 * unnamed member's own reason, or says a member was anonymous, or says the
 * combined description left the canonical domain. The random-value description
 * survives only if every member had one, since a missing slot would leave the
 * suites unable to generate a whole value.
 *
 * A claim beyond the monoid survives only if EVERY member makes it, which is
 * the honest reading of a slot-wise operation: swapping the arguments of a
 * product swaps them in every slot at once, so one non-commuting member is
 * enough to break the whole, and the same for absorption. A member that makes
 * no claim is read as making none, so a product is never more federated than
 * its least federated part.
 */
export const product = <const Ms extends ReadonlyArray<Algebra<FoldState>>>(
  ...members: Ms
): Algebra<ProductState<Ms>> => {
  const empty = Object.freeze(members.map((member) => member.empty)) as ProductState<Ms>
  const combine = (left: ProductState<Ms>, right: ProductState<Ms>): ProductState<Ms> =>
    members.map((member, index) =>
      member.combine(left[index] as FoldState, right[index] as FoldState)
    ) as ProductState<Ms>
  const laws = ownedLaws({
    commutative: members.every((member) => member.laws?.commutative === true),
    idempotent: members.every((member) => member.laws?.idempotent === true),
  })
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
    return ownedAlgebra({
      empty,
      combine,
      ...(generator === undefined ? {} : { generator }),
      laws,
      identityIssue: issue,
    })
  }
  const spec: AlgebraSpec = {
    v: "foldlab.algebra.v1",
    op: "product",
    of: members.flatMap((member) => isDeclaration(member.declaration) ? [member.declaration.spec] : []),
  }
  const declared = declaration(spec)
  return ownedAlgebra(declared === undefined
    ? {
      empty,
      combine,
      ...(generator === undefined ? {} : { generator }),
      laws,
      identityIssue: "product spec is outside the RFC 8785 domain",
    }
    : {
      empty,
      combine,
      ...(generator === undefined ? {} : { generator }),
      laws,
      declaration: declared,
    })
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

/**
 * The closed registry of declared value maps. Membership is the license: a map
 * exists only by being written here with its source and target algebras fixed,
 * so there is no way to hand a fold an arbitrary function and have it treated
 * as preserving structure. Each entry's preservation law is checked by the
 * generated suites against the source algebra's declared generator.
 */
export const homomorphisms = Object.freeze({
  isPositiveFromMax: Object.freeze({
    [DeclaredHomTypeId]: true as const,
    source: max,
    target: any,
    map: (value: number | null): boolean => value !== null && value > 0,
    declaration: positiveDeclaration,
  }),
} as const)

/**
 * Names the target algebra as a view of the source through a declared map, so
 * the mapped answer can be read from an accumulated state rather than by
 * folding the history again.
 *
 * The view is named only when the map carries this module's brand and the source
 * algebra's declaration carries the same digest as the one the map declares as
 * its source, which for canonical bytes means the same description. The map's
 * preservation law is checked over that algebra and claims nothing about any
 * other, so a source that merely resembles it is refused. On refusal the
 * target's own neutral value and combine come back unnamed, with `identityIssue`
 * naming either the source's existing complaint or the mismatch.
 */
export const mapped = <A extends FoldState, B extends FoldState>(
  hom: DeclaredHom<A, B>,
  source: Algebra<A>,
): Algebra<B> => {
  // A mapped view combines with the TARGET's combine, unchanged, so it holds
  // exactly the target's claims — nothing is inherited from the source, whose
  // combine no longer runs.
  const laws = ownedLaws(hom.target.laws ?? noExtraLaws)
  const compatible = isDeclaredHom(hom) &&
    isDeclaration(source.declaration) &&
    isDeclaration(hom.source.declaration) &&
    source.declaration.digest === hom.source.declaration.digest
  if (!compatible || !isDeclaration(hom.target.declaration)) {
    return ownedAlgebra({
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      laws,
      identityIssue: source.identityIssue ?? "homomorphism source does not match the algebra declaration",
    })
  }
  const spec: AlgebraSpec = {
    v: "foldlab.algebra.v1",
    op: "mapped",
    hom: hom.declaration.spec,
    source: source.declaration.spec,
    target: hom.target.declaration.spec,
  }
  const declared = declaration(spec)
  return ownedAlgebra(declared === undefined
    ? {
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      laws,
      identityIssue: "mapped algebra spec is outside the RFC 8785 domain",
    }
    : {
      empty: hom.target.empty,
      combine: hom.target.combine,
      ...(hom.target.generator === undefined ? {} : { generator: hom.target.generator }),
      laws,
      declaration: declared,
    })
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

const readPayloadNumber = (event: StreamEvent, path: ReadonlyArray<string>): number | null => {
  const decoded = decodeJson(event.payload)
  if (!decoded.ok) return null
  let value: unknown = decoded.value
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

/**
 * The declared readings of a stream event, each total over every event the
 * declared event shape can produce: a constant, the payload's byte length, the
 * sequence number, whether the payload is non-empty, the stream name as a
 * one-member set, and a numeric field read out of a JSON payload.
 */
export const steps = Object.freeze({
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
  /**
   * Total over arbitrary bytes: a payload that is not valid UTF-8 or not JSON,
   * a path that runs off the value, and anything that is not a finite number
   * all read as the absent value, which is the neutral value of `max` and
   * `min`, so an unreadable event contributes nothing instead of failing.
   * Negative zero is excluded with the rest, keeping two spellings of the same
   * quantity out of the carrier. The path is copied when the step is built, so
   * a caller mutating its array afterwards cannot change what the name means.
   */
  payloadNumber: (path: ReadonlyArray<string>): Step<StreamEvent, number | null> => {
    const fields = [...path]
    return declaredStep(
      { v: "foldlab.step.v1", op: "payloadNumber", path: fields },
      (event) => readPayloadNumber(event, fields),
    )
  },
} as const)

/**
 * Reads one event with several steps at once and returns their results in the
 * order the steps were given, which is the order the product algebra's slots
 * expect.
 *
 * This is what keeps a paired fold to a single pass: each event is presented
 * once and every member reads it there, so a history that can only be walked
 * once is still enough. Every member reads the same event, so the declared event
 * shape is taken from the first of them.
 *
 * A name is earned only when every member step carries an admitted declaration
 * and the combined description encodes canonically; otherwise the step reads
 * exactly the same values and `identityIssue` carries the first unnamed member's
 * reason.
 */
export const productStep = <E, const As extends ReadonlyArray<FoldState>>(
  ...members: { readonly [K in keyof As]: Step<E, As[K]> }
): Step<E, As> => {
  const apply = (event: E): As => members.map((member) => member.apply(event)) as unknown as As
  const declarations = members.map((member) => member.declaration)
  const eventGenerator = members[0]?.eventGenerator
  if (!declarations.every((candidate) => isDeclaration(candidate))) {
    return {
      apply,
      ...(eventGenerator === undefined ? {} : { eventGenerator }),
      identityIssue: members.find((member) => !isDeclaration(member.declaration))?.identityIssue ??
        "a product step has no declared spec, so no content address",
    }
  }
  const spec: StepSpec = {
    v: "foldlab.step.v1",
    op: "product",
    of: declarations.flatMap((candidate) => isDeclaration(candidate) ? [candidate.spec] : []),
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

/**
 * Applies the declared map to each event's reading before it is combined, so a
 * mapped fold takes its contributions already in the target's values.
 *
 * Mapping each contribution and mapping the accumulated result agree exactly
 * when the map preserves combination, which is the law every entry in the
 * closed registry carries; this step is where that agreement is spent. A name
 * is earned only when the map carries this module's brand and the source step
 * is named, and the source algebra is checked separately where the algebra is
 * present, since that is the only place preservation is a property at all.
 */
export const mappedStep = <E, A extends FoldState, B extends FoldState>(
  hom: DeclaredHom<A, B>,
  source: Step<E, A>,
): Step<E, B> => {
  const apply = (event: E): B => hom.map(source.apply(event))
  if (!isDeclaredHom(hom) || !isDeclaration(source.declaration)) {
    return {
      apply,
      ...(source.eventGenerator === undefined ? {} : { eventGenerator: source.eventGenerator }),
      identityIssue: source.identityIssue ?? "the source step has no declared spec, so no content address",
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
