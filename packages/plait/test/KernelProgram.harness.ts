/**
 * The program-group harness: where the vectors come from, how each one is
 * spelled through `$`, and how a node is offered to a door.
 *
 * **The swap happened.** This lane was built against an interim sample of the
 * ninth record group, in the shape the freeze described. The model end then
 * emitted the real group, and it is normative, so the sample and its renderer
 * are gone and everything below reads
 * `packages/plait/fixtures/kernel-conformance.ndjson` directly. Three places
 * where the emitted group differs from the freeze's sketch are worth naming,
 * because each one moved code here:
 *
 * 1. **There is a fourth argument form.** The freeze named three - digest,
 *    local, literal - and the corpus carries `{"arg":"hole","name":n}` as a
 *    fourth. It is the better shape: a hole is a requirement and a local is a
 *    consumption, and only one of the two puts an edge in the edge list, so
 *    they are different things and now say so.
 * 2. **The argument map is partial.** A node wires the slots it wires. The
 *    ground program's declare wires none at all, and a declaration kind is
 *    never wired by anything, because a kind is a tag and the grammar has no
 *    reference form for one. So the generated surface makes every wired field
 *    optional and does not offer the fields the declaration cannot carry.
 * 3. **Edges follow the node walk**, newest node first and, within a node, the
 *    model's field order - not an ascending sort. The four-node vector is the
 *    one that distinguishes the two conventions, and it settles it.
 *
 * The recipes below are the point of the exercise. Each is a program written
 * the way an author would write it, against the generated surface and nothing
 * else; the suite then compares what the builder made with the bytes the
 * vector pins. A recipe that reached the right bytes by reading the vector
 * would prove nothing, so no recipe here reads one.
 */
import { resolve } from "node:path"

import type { JsonValue } from "@foldlab/core/jcs"
import type {
  KernelArgRef,
  KernelProgramDeclaration,
  KernelProgramRecord,
} from "../src/kernel/KernelCorpusSchemas.js"
import type { KernelCandidateAct, KernelRawArg } from "../src/kernel/KernelDoor.js"
import { program, type KernelProgram } from "../src/kernel/KernelProgram.js"
import { KERNEL_DECL_KINDS, type KernelDeclKind } from "../src/kernel/KernelTables.generated.js"
import {
  CORPUS_PATH,
  readKernelCorpus,
  writeCanonicalValue,
  type KernelCorpus,
} from "../scripts/kernel-corpus.js"

const repository = resolve(import.meta.dir, "../../..")

/** A corpus reading, with the file text it was taken from. */
export interface ProgramReading {
  readonly corpus: KernelCorpus
  readonly source: string
}

/** Reads the interchange, program group and all. */
export const readPrograms = async (): Promise<ProgramReading> => {
  const source = await Bun.file(resolve(repository, CORPUS_PATH)).text()
  return { corpus: readKernelCorpus(source), source }
}

/** One vector's recipe: a program written against `$`, by name. */
export type ProgramRecipe = () => KernelProgram<bigint>

// The two-node ground program the bridge plants. Its declare wires nothing:
// the vector is the model's own node list lifted, and the model's elder node
// carries no arguments. The kind is still named, because it brands the handle
// - the declaration carries no reference for it and the author still has to
// say what is being declared.
const groundTwoNode: ProgramRecipe = () =>
  program("ground-two-node", {}, ($) => {
    const declared = $.declare({ kind: "schema" })
    return $.emit({ body: declared })
  })

// One declared parameter, read in the value position of a declare, with an
// emit consuming the declare. The hole and the consumption sit side by side on
// purpose: one becomes a requirement, the other an edge.
const holey: ProgramRecipe = () =>
  program("holey", { holes: [{ name: 7n, schema: 88n }] }, ($) => {
    const declared = $.declare({
      kind: "schema",
      value: $.hole(7n),
      writ: $.digest("policy", 4n),
    })
    return $.emit({ lane: $.digest("lane", 1n), body: declared })
  })

// The same program with its parameter filled, written independently rather
// than derived, so that "filling the holey one reaches this" is an equality
// between two constructions and not a restatement of one.
const holeyFilled: ProgramRecipe = () =>
  program("holey-filled", {}, ($) => {
    const declared = $.declare({
      kind: "schema",
      value: $.literal(42n),
      writ: $.digest("policy", 4n),
    })
    return $.emit({ lane: $.digest("lane", 1n), body: declared })
  })

// The ratified record's four-node sketch at ground identities: resolve, then
// decide on what it resolved, then emit the decision, then join the emission.
// Four generators, three consumptions, and a lineage.
const distillShape: ProgramRecipe = () =>
  program("distill-shape", { lineage: [9n] }, ($) => {
    const resolved = $.resolve({ kind: "index", target: $.digest("index", 8n) })
    const decided = $.decide({ register: $.digest("program", 5n), outcome: resolved })
    const emitted = $.emit({ lane: $.digest("lane", 1n), body: decided })
    return $.join({ cell: $.digest("resource", 6n), contribution: emitted })
  })

/** Every vector this lane can build, keyed by the name its record carries. */
export const PROGRAM_RECIPES: { readonly [name: string]: ProgramRecipe } = {
  "ground-two-node": groundTwoNode,
  holey,
  "holey-filled": holeyFilled,
  "distill-shape": distillShape,
}

/**
 * A program built here and carried by no vector: one closed declare, wired
 * with a literal and a writ the reference door's catalog knows.
 *
 * It exists because of a measured fact about the emitted group, printed by the
 * suite rather than buried: **no node of any committed vector is a sentence.**
 * Every one of them either consumes a local, reads a hole, or is a declare or
 * resolve whose declaration kind the declaration form does not carry. A door
 * arm with nothing to admit proves nothing, so the arm is run on this witness,
 * whose kind the recipe knows because the recipe wrote it.
 */
export const doorWitness = (): KernelProgram<bigint> =>
  program("door-witness", {}, ($) =>
    $.declare({ kind: "schema", value: $.literal(5n), writ: $.digest("policy", 4n) }))

/** The witness with a writ no catalog admits: the door's refusing twin. */
export const doorWitnessOffCatalog = (): KernelProgram<bigint> =>
  program("door-witness-off-catalog", {}, ($) =>
    $.declare({ kind: "schema", value: $.literal(5n), writ: $.digest("policy", 404n) }))

/** One built vector compared with the record that pins it. */
export interface ProgramReplay {
  readonly name: string
  readonly built: string
  readonly pinned: string
  readonly agreed: boolean
}

/** Builds every vector the corpus names and compares bytes with the record. */
export const replayPrograms = (
  records: ReadonlyArray<KernelProgramRecord>,
): ReadonlyArray<ProgramReplay> =>
  records.map((record) => {
    const recipe = PROGRAM_RECIPES[record.name]
    if (recipe === undefined) {
      return {
        name: record.name,
        built: "no-recipe-in-table",
        pinned: record.bytes,
        agreed: false,
      }
    }
    const built = recipe()
    return {
      name: record.name,
      built: built.bytes,
      pinned: record.bytes,
      agreed: built.bytes === record.bytes,
    }
  })

/** The divergences of a replay, one per line, for a failure message. */
export const programDivergences = (replays: ReadonlyArray<ProgramReplay>): string =>
  replays
    .filter((replay) => !replay.agreed)
    .map((replay) => `  ${replay.name}\n    built  ${replay.built}\n    pinned ${replay.pinned}`)
    .join("\n")

const rawArg = (argument: KernelArgRef, where: string): KernelRawArg => {
  if (argument.arg === "digest") {
    const kind = KERNEL_DECL_KINDS.find((known) => known === argument.kind)
    if (kind === undefined) throw new Error(`${where}: ${argument.kind} names no kind`)
    return { _tag: "digestRef", kind, id: argument.id }
  }
  if (argument.arg === "literal") return { _tag: "literal", value: argument.value }
  throw new Error(`${where}: an inside reference is not an act-level argument`)
}

const digestId = (argument: KernelArgRef | undefined, where: string): bigint => {
  if (argument === undefined || argument.arg !== "digest") {
    throw new Error(`${where}: the argument is not a digest reference`)
  }
  return argument.id
}

/** A node offered to a door, or the reason it cannot be. */
export type NodeProjection =
  | { readonly ok: true; readonly candidate: KernelCandidateAct }
  | { readonly ok: false; readonly reason: string }

/**
 * Projects one program node onto a door candidate.
 *
 * Only some nodes are sentences, and this returns the reason rather than a
 * guess for the rest. Three reasons occur over the committed group and all
 * three are real:
 *
 * - the node consumes a local, so its argument is a name inside a declaration
 *   and no door can resolve it;
 * - the node reads a hole, so the sentence has a parameter and is not yet one
 *   thing;
 * - the node is a declare or a resolve and the declaration form carries no
 *   declaration kind, so the sentence's own sort is not in the value.
 *
 * The `kind` argument is what the third reason needs. A caller who built the
 * program knows it, because it typed it; a caller reading the corpus does not,
 * and that asymmetry is the finding rather than a defect in this function.
 */
export const projectNode = (
  declaration: KernelProgramDeclaration,
  name: bigint,
  kind?: KernelDeclKind,
): NodeProjection => {
  const node = declaration.nodes.find((row) => row.name === name)
  if (node === undefined) return { ok: false, reason: `no node named ${name}` }
  const where = `node ${name}`
  for (const [field, argument] of Object.entries(node.args)) {
    if (argument.arg === "hole") {
      return {
        ok: false,
        reason: `${where}.${field} reads hole ${argument.name}, so the node is not yet a sentence`,
      }
    }
    if (argument.arg === "local") {
      return {
        ok: false,
        reason: `${where}.${field} consumes local ${argument.name}, which no door can resolve`,
      }
    }
  }
  const needsKind = node.generator === "declare" || node.generator === "resolve"
  if (needsKind && kind === undefined) {
    return {
      ok: false,
      reason:
        `${where}: a ${node.generator} is a sentence only with its declaration kind, and the` +
        " declaration form carries none",
    }
  }
  try {
    switch (node.generator) {
      case "declare": {
        const value = node.args.value
        if (value === undefined) {
          return { ok: false, reason: `${where}: a declare with no value wires no payload` }
        }
        return {
          ok: true,
          candidate: {
            _tag: "declare",
            kind: kind!,
            payload: [rawArg(value, `${where}.value`)],
            writ: digestId(node.args.writ, where),
          },
        }
      }
      case "resolve":
        return {
          ok: true,
          candidate: {
            _tag: "resolveDigest",
            kind: kind!,
            target: digestId(node.args.target, where),
            anchor: undefined,
          },
        }
      case "emit": {
        const body = node.args.body
        if (body === undefined) {
          return { ok: false, reason: `${where}: an emit with no body wires no payload` }
        }
        return {
          ok: true,
          candidate: {
            _tag: "emit",
            lane: digestId(node.args.lane, where),
            body: [rawArg(body, `${where}.body`)],
          },
        }
      }
      default:
        return {
          ok: false,
          reason: `${where}: ${node.generator} carries a candidate field the act layer has not`,
        }
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** A declaration with its consumption edges dropped: the flattening mutant. */
export const withoutEdges = (
  declaration: KernelProgramDeclaration,
): KernelProgramDeclaration => ({ ...declaration, edges: [] })

/** A declaration with its declared parameters dropped: the hole-flattening mutant. */
export const withoutHoles = (
  declaration: KernelProgramDeclaration,
): KernelProgramDeclaration => ({ ...declaration, holes: [] })

/** One declaration as the corpus record that would carry it. */
export const asProgramRecord = (
  name: string,
  declaration: KernelProgramDeclaration,
): string =>
  writeCanonicalValue({
    bytes: writeCanonicalValue(declaration as unknown as JsonValue),
    declaration: declaration as unknown as JsonValue,
    name,
    record: "program",
  })
