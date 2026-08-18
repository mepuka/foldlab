/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The program builder: one authoring act, two artifacts.
 *
 * `program(name, spec, build)` runs the body once, accumulating a DAG of typed
 * nodes, and hands back the declaration, its canonical bytes, its content
 * address, an explicit publication act, and a typed stub of the effect the
 * declaration would compile to. The two artifacts are made by the same act and
 * cannot drift, which is the whole reason the builder exists rather than a
 * declaration writer and a compiler side by side.
 *
 * ## What is written here and what is generated
 *
 * The `$` constructors - their names, their argument names, the order those
 * arguments stand in, and the sort each accepts - are generated from the
 * model's own mini-AST into `KernelBuilder.generated.ts`. This module never
 * names a field. It walks `KERNEL_GENERATOR_FIELDS`, so a field renamed in the
 * model renames it here on the next generation rather than leaving a string
 * literal behind. What is hand-written is the accumulator, the local-name
 * discipline, the canonical serialization call, the digest, and the shapes
 * below.
 *
 * ## Encode is total; publication is a separate act
 *
 * Building always produces a declaration and its runtime identity, and building
 * never publishes. {@link toDeclareCandidate} is the catalog-publication
 * request, a method the caller has to reach for, and it demands the writ under
 * whose authority the declaration would be made. Despite its retained name,
 * that request is not a `KernelCandidateAct`: its hex digest and canonical JSON
 * are runtime evidence, while the admission door consumes the model-generated
 * language directly. This module invokes no door and admits nothing.
 *
 * ## Nothing here runs
 *
 * The `effect` field is a **typed stub**. It carries the three channels in its
 * type - what a run would land, the taught refusals it could fail with, and
 * the services and unfilled holes it would require - and it carries no
 * executable at all. There is no fiber, no scheduler, no clock, no retry, and
 * no replay in this module or downstream of it. A program's holes are its
 * requirements and filling them is providing them; that correspondence is
 * stated in the types and checked over the committed vectors, and it is not a
 * claim about any execution.
 *
 * ## Inside and outside
 *
 * A declaration is one canonical value. Everything inside it is named by a
 * name: a node by a local name, a declared parameter by a hole name. Anything
 * outside it is named by a digest that has to resolve. The two inside forms
 * are separate references because they mean separate things - a local is a
 * consumption and gets an edge, a hole is a requirement and gets none - and
 * the name allocator still keeps the two sets disjoint, so a reader never has
 * to hold two numbering schemes at once to follow a value.
 *
 * @module
 */
import { createHash } from "node:crypto"

import type { Effect } from "effect"

import { encodeCanonicalJson, type CanonicalJson } from "../truth/CanonicalJson.js"
import type {
  CasDaemon,
  CasHoleRequirement,
  CasProgramOutcome,
} from "../carriage/CasDaemon.js"
import type {
  KernelArgRef,
  KernelProgramDeclaration,
  KernelProgramEdge,
  KernelProgramHole,
  KernelProgramNode,
} from "./KernelCorpusSchemas.js"
import {
  KERNEL_GENERATOR_FIELDS,
  KERNEL_GENERATORS,
  type KernelAnyHandle,
  type KernelBuilderArg,
  type KernelBuilderArgs,
  type KernelBuilderField,
  type KernelDollar,
  type KernelGenerator,
  type KernelHandle,
} from "./KernelBuilder.generated.js"
import {
  KERNEL_DECL_KIND_RANK,
  type KernelDeclKind,
  type KernelRefusalRow,
} from "./KernelTables.generated.js"

/** Raised when a program body says something the declaration form cannot carry. */
export class KernelProgramError extends Error {
  override readonly name = "KernelProgramError"
  constructor(message: string) {
    super(`kernel program: ${message}`)
  }
}

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (message: string) => never = (message) => {
  throw new KernelProgramError(message)
}

/** One declared parameter of a program: a local name and the schema its filling must satisfy. */
export interface KernelHoleDeclaration {
  readonly name: bigint
  readonly schema: bigint
}

/** What a program declares before its body runs: its parameters and its lineage. */
export interface KernelProgramSpec<Holes extends ReadonlyArray<KernelHoleDeclaration>> {
  /** The declared parameters. A hole no node reads is refused, not tolerated. */
  readonly holes?: Holes
  /** The declarations this one descends from, by identity label. */
  readonly lineage?: ReadonlyArray<bigint>
}

/**
 * The effect a declaration would compile to, carried as a type and never as an
 * executable.
 *
 * The optional member is never present at runtime and is never meant to be
 * read. It exists so the three channels are written down in the type - the
 * outcome a run would land, the taught refusal it could fail with, and the
 * services and unfilled holes it would require - where a reader and the
 * compiler can both see them. Reaching for it gets `undefined`, which is the
 * honest answer: this slice compiles nothing.
 */
export interface KernelEffectStub<A, E, R> {
  readonly stub: "typed-stub"
  /** Phantom. Never present at runtime; the type is the whole content. */
  readonly channels?: Effect.Effect<A, E, R>
}

/**
 * The requirements a built program's stub carries: the daemon it would talk
 * to, and one requirement per unfilled hole under the hole's own name.
 */
export type KernelProgramRequirements<HoleName extends bigint> =
  | CasDaemon
  | CasHoleRequirement<HoleName>

/**
 * A declaration offered for publication under a writ.
 *
 * This is a catalog-publication request, not a `KernelCandidateAct`. It carries
 * the declaration value, the bytes that are its runtime identity, and the
 * authority the caller chose to publish under. The catalog slice owns its
 * eventual carriage; `KernelDoor` neither converts nor consults its hex digest.
 */
export interface KernelDeclareCandidate {
  readonly _tag: "declare"
  /** Always `program`: what is being declared is a program declaration. */
  readonly kind: "program"
  readonly declaration: KernelProgramDeclaration
  readonly bytes: string
  readonly digestHex: string
  /** The authority the declaration would be made under, named by digest. */
  readonly writ: bigint
}

/** One built program: the declaration, its identity, and the two acts it enables. */
export interface KernelProgram<HoleName extends bigint> {
  /** The vector name, for a corpus row and for a failure message. */
  readonly name: string
  /** The canonical value whose bytes are this program's identity. */
  readonly declaration: KernelProgramDeclaration
  /** The one canonical serialization of {@link declaration}. */
  readonly bytes: string
  /**
   * SHA-256 over {@link bytes}, lowercase hexadecimal.
   *
   * The hash is the runtime's **trusted base**: the model carries identity
   * labels and states nothing about any hash function, so this address is
   * believed because SHA-256 is believed, not because anything here was
   * proved.
   */
  readonly digestHex: string
  /** The unfilled holes, ascending. Empty exactly when the program is closed. */
  readonly requirements: ReadonlyArray<bigint>
  /**
   * The publication request, and the only one. Building never declares; a
   * caller who wants the declaration published hands this runtime material to
   * the catalog path under a named writ.
   */
  readonly toDeclareCandidate: (writ: bigint) => KernelDeclareCandidate
  /** The typed stub. Nothing runs; see {@link KernelEffectStub}. */
  readonly effect: KernelEffectStub<
    CasProgramOutcome,
    KernelRefusalRow,
    KernelProgramRequirements<HoleName>
  >
}

const HANDLE_BRAND = "~foldlab/plait/kernel/handle"

/**
 * One surface argument, as the argument reference the declaration carries.
 *
 * A handle is rewritten rather than passed through, so the brand it carries at
 * the type level never reaches the bytes: what the declaration says is the
 * local name, and nothing else. Everything else is already an argument
 * reference and is copied member by member so the written value is exactly the
 * four-form grammar and never whatever the caller's object happened to hold.
 */
const argRefOf = (
  argument: KernelBuilderArg,
  where: string,
): KernelArgRef => {
  if (typeof argument === "string") refuse(`${where}: a bare kind is not an argument reference`)
  switch (argument.arg) {
    case "digest":
      return { arg: "digest", id: argument.id, kind: argument.kind }
    case "hole":
      return { arg: "hole", name: argument.name }
    case "literal":
      return { arg: "literal", value: argument.value }
    case "local":
      return { arg: "local", name: argument.name }
  }
}

/** The nodes of one program body, in creation order: oldest first. */
interface Accumulated {
  readonly name: bigint
  readonly generator: KernelGenerator
  readonly args: { readonly [field: string]: KernelArgRef }
  /** The nodes this one consumes, in the model's field order. */
  readonly uses: ReadonlyArray<bigint>
}

const canonicalNode = (node: Accumulated): KernelProgramNode => ({
  args: node.args,
  generator: node.generator,
  name: node.name,
})

const ascending = (left: bigint, right: bigint): number =>
  left < right ? -1 : left > right ? 1 : 0

/**
 * Builds one program.
 *
 * The body runs exactly once, immediately, and its return value names the
 * terminal node. Everything the body says is accumulated in order, then the
 * declaration is written newest node first - the house ledger orientation, and
 * the orientation the model's admission relation reads, so that a node may
 * consume only names standing after it.
 *
 * Refuses rather than repairs. An undeclared local, a hole nobody reads, a
 * duplicate parameter, an out-of-order lineage: each stops the build naming
 * itself, because a declaration that quietly differs from what its author
 * wrote has an identity its author never chose.
 */
export const program = <
  const Holes extends ReadonlyArray<KernelHoleDeclaration> = readonly [],
>(
  name: string,
  spec: KernelProgramSpec<Holes>,
  build: ($: KernelDollar<Holes[number]["name"]>) => KernelAnyHandle,
): KernelProgram<Holes[number]["name"]> => {
  const declaredHoles: ReadonlyArray<KernelHoleDeclaration> = spec.holes ?? []
  const holeNames = new Set<bigint>()
  for (const hole of declaredHoles) {
    if (hole.name < 0n) refuse(`${name}: hole name ${hole.name} is negative`)
    if (holeNames.has(hole.name)) refuse(`${name}: hole ${hole.name} is declared twice`)
    holeNames.add(hole.name)
  }
  const holes: ReadonlyArray<KernelProgramHole> = [...declaredHoles]
    .sort((left, right) => ascending(left.name, right.name))
    .map((hole) => ({ name: hole.name, schema: hole.schema }))

  const nodes: Array<Accumulated> = []
  const nodeNames = new Set<bigint>()
  const read = new Set<bigint>()
  let next = 1n
  const freshName = (): bigint => {
    while (holeNames.has(next) || nodeNames.has(next)) next += 1n
    const minted = next
    next += 1n
    return minted
  }

  const contribute = (
    generator: KernelGenerator,
    supplied: KernelBuilderArgs,
  ): KernelHandle<KernelGenerator, KernelDeclKind | null> => {
    const fields: ReadonlyArray<KernelBuilderField> = KERNEL_GENERATOR_FIELDS[generator]
    const known = new Set(fields.map((field) => field.name))
    for (const field of Object.keys(supplied)) {
      if (!known.has(field)) refuse(`${name}: ${generator} has no argument ${field}`)
    }
    const args: { [field: string]: KernelArgRef } = {}
    const uses: Array<bigint> = []
    let branded: KernelDeclKind | null = null
    // Field order is the model's, so the walk decides the order arguments are
    // read in and, through the uses it collects, the order the edges stand in.
    for (const field of fields) {
      const where = `${name}: ${generator}.${field.name}`
      const argument = supplied[field.name]
      if (field.form.form === "kind") {
        if (typeof argument !== "string") refuse(`${where}: expected a declaration kind`)
        if (KERNEL_DECL_KIND_RANK[argument as KernelDeclKind] === undefined) {
          refuse(`${where}: ${argument} names no declaration kind`)
        }
        // The kind brands the handle and is not written: the declaration form
        // carries references, and a kind is a tag with nothing to reference.
        branded = argument as KernelDeclKind
        continue
      }
      if (field.form.form === "absent") {
        if (argument !== undefined) {
          refuse(`${where}: the declaration form carries no reference for a ${field.model}`)
        }
        continue
      }
      // A slot left unwired is absent from the map rather than filled with a
      // placeholder. That is different from a hole, which is a slot the
      // declaration names and therefore requires.
      if (argument === undefined) continue
      // Both inside forms are checked against this program's own namespace, and
      // the check is on the reference rather than on the brand: a handle from
      // another program, or a local a caller wrote out by hand, names nothing
      // here and must be refused rather than written as a dangling edge.
      if (typeof argument !== "string" && argument.arg === "hole") {
        if (!holeNames.has(argument.name)) {
          refuse(`${where}: hole ${argument.name} was never declared`)
        }
        read.add(argument.name)
      } else if (typeof argument !== "string" && argument.arg === "local") {
        if (!nodeNames.has(argument.name)) {
          refuse(`${where}: local ${argument.name} names no node of this program`)
        }
        uses.push(argument.name)
      }
      args[field.name] = argRefOf(argument, where)
    }
    const minted = freshName()
    nodeNames.add(minted)
    nodes.push({ name: minted, generator, args, uses })
    return {
      arg: "local",
      name: minted,
      [HANDLE_BRAND]: [generator, branded] as const,
    } as KernelHandle<KernelGenerator, KernelDeclKind | null>
  }

  const dollar = {
    digest: (kind: KernelDeclKind, id: bigint) => ({ arg: "digest", kind, id }) as const,
    hole: (holeName: bigint) => {
      if (!holeNames.has(holeName)) refuse(`${name}: hole ${holeName} was never declared`)
      return { arg: "hole", name: holeName } as const
    },
    literal: (value: bigint) => ({ arg: "literal", value }) as const,
    ...Object.fromEntries(
      KERNEL_GENERATORS.map((generator) =>
        [
          generator,
          (supplied: KernelBuilderArgs) =>
            contribute(generator, supplied),
        ] as const
      ),
    ),
  } as unknown as KernelDollar<Holes[number]["name"]>

  const terminal = build(dollar)
  if (nodes.length === 0) refuse(`${name}: the body contributed no node`)
  if (!nodeNames.has(terminal.name)) {
    refuse(`${name}: the body returned local ${terminal.name}, which names no node`)
  }
  for (const hole of holeNames) {
    if (!read.has(hole)) {
      refuse(
        `${name}: hole ${hole} is declared and never read; a parameter no node reads is not a` +
          " parameter, and it would leave a requirement nothing can discharge",
      )
    }
  }

  // Newest first, and the edges walked in that same order so the list is a
  // function of the walk rather than of a second convention.
  const newestFirst = [...nodes].reverse()
  const edges: ReadonlyArray<KernelProgramEdge> = newestFirst
    .flatMap((node) => node.uses.map((use) => ({ from: node.name, to: use })))

  const declaration: KernelProgramDeclaration = {
    edges,
    holes,
    lineage: spec.lineage ?? [],
    nodes: newestFirst.map(canonicalNode),
  }
  const bytes = encodeCanonicalJson(declaration as unknown as CanonicalJson)
  const digestHex = createHash("sha256").update(bytes, "utf8").digest("hex")

  return {
    name,
    declaration,
    bytes,
    digestHex,
    requirements: holes.map((hole) => hole.name),
    toDeclareCandidate: (writ: bigint): KernelDeclareCandidate => ({
      _tag: "declare",
      kind: "program",
      declaration,
      bytes,
      digestHex,
      writ,
    }),
    effect: { stub: "typed-stub" },
  }
}

/**
 * Fills holes: the valuation correspondence, at the declaration.
 *
 * Substitution is simultaneous, exactly as the model's `fillProgram` is: every
 * covered hole becomes its value in one pass, and an uncovered one is
 * untouched. Filling every hole of a program yields the closed program, and
 * the two ways of reaching that program - filling the parameterized one, and
 * writing the closed one directly - produce the same bytes and therefore the
 * same identity. That equality is the correspondence, and the coherence suite
 * checks it over the committed vectors rather than asserting it here.
 *
 * The result's type says `bigint` for its remaining holes because the runtime
 * valuation is data and the surface cannot narrow a type by it. The runtime
 * `requirements` array is exact.
 */
export const fill = (
  built: KernelProgram<bigint>,
  valuation: ReadonlyMap<bigint, bigint>,
): KernelProgram<bigint> => {
  const holeNames = new Set(built.declaration.holes.map((hole) => hole.name))
  for (const covered of valuation.keys()) {
    if (!holeNames.has(covered)) {
      refuse(`${built.name}: the valuation covers ${covered}, which is not a declared hole`)
    }
  }
  const substitute = (argument: KernelArgRef): KernelArgRef => {
    if (argument.arg !== "hole" || !holeNames.has(argument.name)) return argument
    const value = valuation.get(argument.name)
    return value === undefined ? argument : { arg: "literal", value }
  }
  const declaration: KernelProgramDeclaration = {
    edges: built.declaration.edges,
    holes: built.declaration.holes.filter((hole) => !valuation.has(hole.name)),
    lineage: built.declaration.lineage,
    nodes: built.declaration.nodes.map((node) => ({
      args: Object.fromEntries(
        Object.entries(node.args).map(([field, argument]) => [field, substitute(argument)]),
      ),
      generator: node.generator,
      name: node.name,
    })),
  }
  const bytes = encodeCanonicalJson(declaration as unknown as CanonicalJson)
  const digestHex = createHash("sha256").update(bytes, "utf8").digest("hex")
  return {
    name: built.name,
    declaration,
    bytes,
    digestHex,
    requirements: declaration.holes.map((hole) => hole.name),
    toDeclareCandidate: (writ: bigint): KernelDeclareCandidate => ({
      _tag: "declare",
      kind: "program",
      declaration,
      bytes,
      digestHex,
      writ,
    }),
    effect: { stub: "typed-stub" },
  }
}

/**
 * The erasure the model's laws travel over: a declaration read as the model's
 * own node list.
 *
 * Field-keyed arguments flatten to the model's positional list, and the
 * consumption edges become each node's `uses`. Once erased, the bridge's
 * transport theorems apply to a built program unchanged, which is the reason
 * the declaration form is richer than the model's and the erasure is written
 * down rather than assumed.
 */
export interface KernelErasedNode {
  readonly name: bigint
  readonly generator: KernelGenerator
  /** The wired arguments, flattened into the model's field order. */
  readonly args: ReadonlyArray<KernelArgRef>
  readonly uses: ReadonlyArray<bigint>
  /** The holes this node reads, which are the requirements it contributes. */
  readonly requires: ReadonlyArray<bigint>
}

/** Erases a declaration to the model's node list, newest first. */
export const erase = (
  declaration: KernelProgramDeclaration,
): ReadonlyArray<KernelErasedNode> =>
  declaration.nodes.map((node) => {
    const fields: ReadonlyArray<KernelBuilderField> | undefined =
      KERNEL_GENERATOR_FIELDS[node.generator as KernelGenerator]
    if (fields === undefined) refuse(`node ${node.name} names generator ${node.generator}`)
    const wired = new Set(Object.keys(node.args))
    for (const field of wired) {
      if (!fields.some((known) => known.name === field)) {
        refuse(`node ${node.name} wires ${field}, which ${node.generator} has not`)
      }
    }
    const args = fields
      .filter((field) => wired.has(field.name))
      .map((field) => node.args[field.name]!)
    const named = (argument: KernelArgRef): bigint => (argument as { readonly name: bigint }).name
    return {
      name: node.name,
      generator: node.generator as KernelGenerator,
      args,
      uses: args.filter((argument) => argument.arg === "local").map(named),
      requires: args.filter((argument) => argument.arg === "hole").map(named),
    }
  })

/**
 * Whether an erased node list satisfies the model's admission relation:
 * newest first, every consumed name already admitted, every name minted once.
 *
 * The check is the reader's reading of `Kernel.ProgramAdmission`, not a proof
 * of it. What it buys is that a vector this returns `null` for is one the
 * model's transport theorems have something to say about.
 */
export const admissionFault = (
  erased: ReadonlyArray<KernelErasedNode>,
): string | null => {
  const seen = new Set<bigint>()
  for (let index = erased.length - 1; index >= 0; index--) {
    const node = erased[index]!
    if (seen.has(node.name)) return `name ${node.name} is admitted twice`
    for (const use of node.uses) {
      if (!seen.has(use)) return `node ${node.name} consumes ${use}, which is not yet admitted`
    }
    seen.add(node.name)
  }
  return null
}
