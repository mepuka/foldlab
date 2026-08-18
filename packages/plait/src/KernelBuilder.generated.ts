/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Corpus:  packages/plait/fixtures/kernel-conformance.ndjson
 * Command: bun run generate:kernel-builder
 * Source:  verify/kernel, emitted by "verify/unity emit"
 *          at interchange format 2.
 *
 * The program builder's surface: one constructor per kernel generator, with
 * the generator's own field names, in the generator's own declaration order,
 * accepting the sorts the generator's own grammar names. Every one of those
 * facts is read out of the Act record of the model's mini-AST, and the prose
 * below each field is the docstring the model attaches to that field's type.
 *
 * Two things this file is not.
 *
 * It is not an executor. A constructor here contributes a node to a
 * declaration; nothing in this module runs, schedules, retries, or replays,
 * and no constructor takes a clock, a seed, a secret, or a function value -
 * not because they are checked away, but because the grammar names no field
 * for them and this file is that grammar's transcription.
 *
 * It is not a runtime check of the brands it carries. TypeScript erases, so
 * a brand here separates two sorts at compile time and nothing more. The
 * emitter's own consistency law, checked over every committed vector, is
 * what stands behind the values.
 *
 * @module
 */
import type { KernelDeclKind } from "./KernelTables.generated.js"

/** Where this surface came from, carried as data for a consumer to assert. */
export const KERNEL_BUILDER_PROVENANCE = {
  command: "bun run generate:kernel-builder",
  corpus: "packages/plait/fixtures/kernel-conformance.ndjson",
  format: 2n,
  generator: "verify/unity emit",
  source: "verify/kernel",
} as const

/** The generator vocabulary, in the model's own declaration order. */
export const KERNEL_GENERATORS = [
  "declare",
  "resolve",
  "emit",
  "join",
  "fold",
  "decide",
  "trigger",
  "spawn",
] as const

/** One kernel generator. */
export type KernelGenerator = (typeof KERNEL_GENERATORS)[number]

// ---------------------------------------------------------------------------
// The argument-reference grammar. Three forms and no fourth: a reference to
// something outside the declaration is a digest, a reference to something
// inside it is a local name, and a bare identity label is a literal. There is
// no closure form, because a function value has no canonical bytes and so no
// identity to reference it by.
// ---------------------------------------------------------------------------

/** A reference to a declaration outside this one, branded by its kind. */
export interface KernelDigestRef<Kind extends KernelDeclKind> {
  readonly arg: "digest"
  readonly kind: Kind
  readonly id: bigint
}

/** A bare identity label. */
export interface KernelLiteralArg {
  readonly arg: "literal"
  readonly value: bigint
}

/**
 * A reference to a hole of this declaration: a declared parameter, not a
 * wildcard. A hole reads inside the declaration as a local does, and it is a
 * form of its own because it means something else - a requirement, not a
 * consumption, so it puts no edge in the edge list.
 */
export interface KernelHoleRef {
  readonly arg: "hole"
  readonly name: bigint
}

/**
 * A reference to an earlier node of this declaration - the value a `$`
 * constructor hands back. The brand carries the generator that produced it
 * and the declaration kind it names, so a handle cannot be spent where a
 * different sort is required.
 */
export interface KernelHandle<
  Generator extends KernelGenerator,
  Kind extends KernelDeclKind | null,
> {
  readonly arg: "local"
  readonly name: bigint
  readonly "~foldlab/plait/kernel/handle": readonly [Generator, Kind]
}

/** Any handle, whatever it produced. */
export type KernelAnyHandle = KernelHandle<KernelGenerator, KernelDeclKind | null>

/**
 * What a field branded to one declaration kind accepts: a digest of that
 * kind, or a handle that produced one. Not a hole: the surface cannot check
 * that a hole's schema is a declaration of this kind, and admitting it here
 * would be a claim the type system does not make.
 */
export type KernelDigestArg<Kind extends KernelDeclKind> =
  | KernelDigestRef<Kind>
  | KernelHandle<KernelGenerator, Kind>

/** What an arbitrary model value accepts: any reference at all. */
export type KernelValueArg =
  | KernelDigestRef<KernelDeclKind>
  | KernelAnyHandle
  | KernelLiteralArg
  | KernelHoleRef

/**
 * How one field of a generator meets the declaration form. `absent` is the
 * one that is easy to misread: the field is real and the declaration carries
 * no reference for it, so the surface offers nothing rather than accepting
 * an argument that would not survive the write.
 */
export type KernelFieldForm =
  | { readonly form: "kind" }
  | { readonly form: "digest"; readonly kind: KernelDeclKind }
  | { readonly form: "digestOf"; readonly field: string }
  | { readonly form: "value" }
  | { readonly form: "absent" }

/** One field of one generator, as the emitter reads it. */
export interface KernelBuilderField {
  readonly name: string
  /** The model's own type reference for this field, verbatim. */
  readonly model: string
  readonly form: KernelFieldForm
}

/**
 * Each generator's fields, in the model's declaration order. The emitter
 * walks this table rather than knowing any field name of its own, so a
 * renamed field moves the emitter with it.
 */
export const KERNEL_GENERATOR_FIELDS = {
  declare: [
    { name: "kind", model: "DeclKind", form: { form: "kind" } },
    { name: "value", model: "Value", form: { form: "value" } },
    { name: "writ", model: "Digest(policy)", form: { form: "digest", kind: "policy" } },
  ],
  resolve: [
    { name: "kind", model: "DeclKind", form: { form: "kind" } },
    { name: "target", model: "Digest(kind)", form: { form: "digestOf", field: "kind" } },
  ],
  emit: [
    { name: "lane", model: "Digest(lane)", form: { form: "digest", kind: "lane" } },
    { name: "body", model: "Value", form: { form: "value" } },
  ],
  join: [
    { name: "cell", model: "Digest(resource)", form: { form: "digest", kind: "resource" } },
    { name: "contribution", model: "Value", form: { form: "value" } },
  ],
  fold: [
    { name: "declared", model: "Digest(index)", form: { form: "digest", kind: "index" } },
    { name: "partition", model: "LanePartition", form: { form: "absent" } },
    { name: "anchor", model: "AnchorFact(declared,partition)", form: { form: "absent" } },
    { name: "query", model: "Value", form: { form: "value" } },
  ],
  decide: [
    { name: "register", model: "Digest(program)", form: { form: "digest", kind: "program" } },
    { name: "token", model: "Token(register)", form: { form: "absent" } },
    { name: "outcome", model: "Value", form: { form: "value" } },
  ],
  trigger: [
    { name: "predicate", model: "KTriggerPredicate", form: { form: "absent" } },
    { name: "declaration", model: "Digest(program)", form: { form: "digest", kind: "program" } },
  ],
  spawn: [
    { name: "parent", model: "Digest(policy)", form: { form: "digest", kind: "policy" } },
    { name: "request", model: "Digest(policy)", form: { form: "digest", kind: "policy" } },
  ],
} as const satisfies {
  readonly [Generator in KernelGenerator]: ReadonlyArray<KernelBuilderField>
}

/**
 * The field whose declaration kind brands each generator's handle, where the
 * constructor names one. A generator that names no kind produces a handle
 * branded `null`, and such a handle is spendable only where a value is
 * wanted - which is the whole of the compile-time separation.
 */
export const KERNEL_GENERATOR_KIND_FIELD = {
  declare: "kind",
  resolve: "kind",
  emit: null,
  join: null,
  fold: null,
  decide: null,
  trigger: null,
  spawn: null,
} as const satisfies { readonly [Generator in KernelGenerator]: string | null }

// ---------------------------------------------------------------------------
// One argument record per generator. Member order is the model's field order.
// ---------------------------------------------------------------------------

/**
 * The arguments `declare` takes, in the model's declaration order: kind : DeclKind, value :
 * Value, writ : Digest(policy).
 */
export interface KernelDeclareArgs<Kind extends KernelDeclKind> {
  /**
   * `kind : DeclKind`. The closed universe of declaration kinds. One brand per kind: a
   * digest is always the digest of a declaration of a known kind.
   */
  readonly kind: Kind

  /**
   * `value : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   */
  readonly value?: KernelValueArg

  /**
   * `writ : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly writ?: KernelDigestArg<"policy">
}

/**
 * The arguments `resolve` takes, in the model's declaration order: kind : DeclKind, target :
 * Digest(kind).
 */
export interface KernelResolveArgs<Kind extends KernelDeclKind> {
  /**
   * `kind : DeclKind`. The closed universe of declaration kinds. One brand per kind: a
   * digest is always the digest of a declaration of a known kind.
   */
  readonly kind: Kind

  /**
   * `target : Digest(kind)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly target?: KernelDigestArg<Kind>
}

/**
 * The arguments `emit` takes, in the model's declaration order: lane : Digest(lane), body :
 * Value.
 */
export interface KernelEmitArgs {
  /**
   * `lane : Digest(lane)`. A content address branded by the declaration kind it names. Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly lane?: KernelDigestArg<"lane">

  /**
   * `body : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   */
  readonly body?: KernelValueArg
}

/**
 * The arguments `join` takes, in the model's declaration order: cell : Digest(resource),
 * contribution : Value.
 */
export interface KernelJoinArgs {
  /**
   * `cell : Digest(resource)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly cell?: KernelDigestArg<"resource">

  /**
   * `contribution : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   */
  readonly contribution?: KernelValueArg
}

/**
 * The arguments `fold` takes, in the model's declaration order: declared : Digest(index),
 * partition : LanePartition, anchor : AnchorFact(declared,partition), query : Value. The
 * declaration form carries no reference for `partition` or `anchor`, so they are not offered
 * here.
 */
export interface KernelFoldArgs {
  /**
   * `declared : Digest(index)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly declared?: KernelDigestArg<"index">

  /**
   * `query : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   */
  readonly query?: KernelValueArg
}

/**
 * The arguments `decide` takes, in the model's declaration order: register : Digest(program),
 * token : Token(register), outcome : Value. The declaration form carries no reference for
 * `token`, so it is not offered here.
 */
export interface KernelDecideArgs {
  /**
   * `register : Digest(program)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly register?: KernelDigestArg<"program">

  /**
   * `outcome : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   */
  readonly outcome?: KernelValueArg
}

/**
 * The arguments `trigger` takes, in the model's declaration order: predicate :
 * KTriggerPredicate, declaration : Digest(program). The declaration form carries no reference
 * for `predicate`, so it is not offered here.
 */
export interface KernelTriggerArgs {
  /**
   * `declaration : Digest(program)`. A content address branded by the declaration kind it
   * names. Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly declaration?: KernelDigestArg<"program">
}

/**
 * The arguments `spawn` takes, in the model's declaration order: parent : Digest(policy),
 * request : Digest(policy).
 */
export interface KernelSpawnArgs {
  /**
   * `parent : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly parent?: KernelDigestArg<"policy">

  /**
   * `request : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   */
  readonly request?: KernelDigestArg<"policy">
}

/**
 * The builder's constructor surface, handed to a program body as `$`.
 *
 * One lawful kernel sentence: the eight generators, each constructor
 * demanding exactly the sorts its licensing law names.
 * `resolve` is anchor-free because a digest names one value forever;
 * every head-relative read is `fold` at an anchor -- the
 * immutable/head-relative split carried by the constructors
 * themselves. `decide` is commit-with-token: the token's type pins
 * the register, so an unfenced or cross-register commit has no
 * derivation.
 *
 * Three reference helpers stand beside the eight generators. They are the
 * argument grammar, not the act grammar, which is why they carry no
 * generator name: `digest` reaches outside the declaration, `hole` names one
 * of the declaration's own parameters, and `literal` writes an identity
 * label directly.
 *
 * `Holes` is the set of parameter names the program declared. A hole that
 * was never declared is a type error at the call, not a validation failure
 * later: the surface has no wildcard.
 */
export interface KernelDollar<Holes extends bigint> {
  /** A reference to a declaration outside this one, branded by its kind. */
  readonly digest: <Kind extends KernelDeclKind>(
    kind: Kind,
    id: bigint,
  ) => KernelDigestRef<Kind>

  /** A reference to one of this declaration's declared parameters. */
  readonly hole: (name: Holes) => KernelHoleRef

  /** A bare identity label. */
  readonly literal: (value: bigint) => KernelLiteralArg

  /**
   * Contributes one `declare` node and hands back its local name. Nothing is executed and
   * nothing is published.
   */
  readonly declare: <Kind extends KernelDeclKind>(
    args: KernelDeclareArgs<Kind>,
  ) => KernelHandle<"declare", Kind>

  /**
   * Contributes one `resolve` node and hands back its local name. Nothing is executed and
   * nothing is published.
   */
  readonly resolve: <Kind extends KernelDeclKind>(
    args: KernelResolveArgs<Kind>,
  ) => KernelHandle<"resolve", Kind>

  /**
   * Contributes one `emit` node and hands back its local name. Nothing is executed and nothing
   * is published.
   */
  readonly emit: (
    args: KernelEmitArgs,
  ) => KernelHandle<"emit", null>

  /**
   * Contributes one `join` node and hands back its local name. Nothing is executed and nothing
   * is published.
   */
  readonly join: (
    args: KernelJoinArgs,
  ) => KernelHandle<"join", null>

  /**
   * Contributes one `fold` node and hands back its local name. Nothing is executed and nothing
   * is published.
   */
  readonly fold: (
    args: KernelFoldArgs,
  ) => KernelHandle<"fold", null>

  /**
   * Contributes one `decide` node and hands back its local name. Nothing is executed and
   * nothing is published.
   */
  readonly decide: (
    args: KernelDecideArgs,
  ) => KernelHandle<"decide", null>

  /**
   * Contributes one `trigger` node and hands back its local name. Nothing is executed and
   * nothing is published.
   */
  readonly trigger: (
    args: KernelTriggerArgs,
  ) => KernelHandle<"trigger", null>

  /**
   * Contributes one `spawn` node and hands back its local name. Nothing is executed and nothing
   * is published.
   */
  readonly spawn: (
    args: KernelSpawnArgs,
  ) => KernelHandle<"spawn", null>
}

/** Any argument a generator field can take, before the field narrows it. */
export type KernelBuilderArg =
  | KernelDeclKind
  | KernelDigestRef<KernelDeclKind>
  | KernelAnyHandle
  | KernelLiteralArg
  | KernelHoleRef

/** The wired arguments of one node, keyed by the model's field names. */
export type KernelBuilderArgs = { readonly [field: string]: KernelBuilderArg }
