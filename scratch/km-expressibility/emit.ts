/**
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * Artifacts 1 and 2 of the slice: the denotation's canonical bytes, and the
 * fluent TypeScript surface the one declared term projects into — the rung
 * brands its carrier must have earned, the signature, and the docstring in the
 * order §7.3 fixes (algebraic sentence first, donor and evidence tier last).
 *
 * Nothing in the emitted file is hand-written. Its `@ts-expect-error` controls
 * are the only thing between a green type-check and a rung constraint that does
 * nothing, which is why `run.sh` mutates the emitted rung and demands they stop
 * failing.
 *
 * Run: `bun scratch/km-expressibility/emit.ts`
 */

import { resolve } from "node:path"

import {
  algebraic,
  BOUNDED_SEMILATTICE,
  canonicalBytes,
  COMMUTATIVE_MONOID,
  DERIVED_ORDER,
  LAWS,
  type RungRow,
  SHARED,
  TERM,
  TERM_DIGEST,
} from "./term.ts"

export const TERM_PATH = "scratch/km-expressibility/term.ts"
export const EMIT_COMMAND = "bun scratch/km-expressibility/emit.ts"

/** Greedy wrap at the estate's JSDoc width; breaks only at single spaces. */
export const wrap = (text: string, width: number): readonly string[] => {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    if (line === "") line = word
    else if (line.length + 1 + word.length <= width) line = `${line} ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line !== "") lines.push(line)
  return lines
}

/** A JSDoc block from paragraphs; `wall.ts` reflows these back to compare. */
const jsdoc = (paragraphs: readonly string[]): string =>
  `/**\n${
    paragraphs
      .map((paragraph) => wrap(paragraph, 74).map((line) => ` * ${line}`).join("\n"))
      .join("\n *\n")
  }\n */`

const typeName = (word: string): string => word[0]!.toUpperCase() + word.slice(1)
const brandName = (word: string): string => word.toUpperCase()
const rungType = (rung: RungRow): string => rung.name.split("-").map(typeName).join("")

const lawAtoms = LAWS.map((law) =>
  `declare const ${brandName(law.name)}: unique symbol\n` +
  `/** ${law.equation} — ${law.reading}. */\n` +
  `type ${typeName(law.name)} = { readonly [${brandName(law.name)}]: true }`
).join("\n\n")

const bundle = (rung: RungRow): string =>
  `/** ${rung.adjective}: ${rung.laws.join(", ")}. */\n` +
  `type ${rungType(rung)} = ${rung.laws.map(typeName).join(" & ")}`

const rung = rungType(TERM.rung)
const controlRung = rungType(COMMUTATIVE_MONOID)
const [cellParameter, batchParameter] = [TERM.parameters[0]!, TERM.parameters[1]!]

const header = [
  "/**",
  " * GENERATED FILE - DO NOT EDIT.",
  " *",
  ` * Artifact: ${TERM_PATH}`,
  ` * Command:  ${EMIT_COMMAND}`,
  ` * Term:     ${TERM_DIGEST}`,
  " *",
  " * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.",
  " *",
  " * The fluent surface one declared term projects into TypeScript. Zero imports",
  " * on purpose: it type-checks alone under `--strict` with no config, so the",
  " * must-not-compile controls at the foot are load-bearing rather than",
  " * decorative.",
  " *",
  " * @module",
  " */",
].join("\n")

const docstring = jsdoc([
  `${TERM.affordance}: ${SHARED.algebraic}. Derived order: ${algebraic(DERIVED_ORDER)}.`,
  `${SHARED.plain}.`,
  `${SHARED.inherited}.`,
  `Denotes the shipped composition: \`${TERM.runtime.entry}\` over` +
  ` \`${TERM.runtime.loop}\` (${TERM.runtime.loop_module}) at ${TERM.carrier}, join` +
  ` \`${TERM.runtime.carrier}\`, discipline \`${TERM.runtime.discipline}\`, attempt` +
  ` bound ${TERM.runtime.attempts}, contention refused as \`${TERM.runtime.contended}\`.`,
  `Bound: ${TERM.bound}.`,
  `Licensed by ${SHARED.donors} (${BOUNDED_SEMILATTICE.donor_source}), instantiated at` +
  ` ${TERM.carrier} by f1_cell_join_semilattice. rung: ${SHARED.rung}; evidence:` +
  ` ${SHARED.evidence}.`,
])

const surface = `${header}

// -- The law atoms, emitted from the corpus \`law\` rows ----------------------

${lawAtoms}

// -- The rung bundles, emitted from the corpus \`rung\` rows -------------------

${bundle(TERM.rung)}

${bundle(COMMUTATIVE_MONOID)}

type LawSet = Partial<${LAWS.map((law) => typeName(law.name)).join(" & ")}>

// -- The carrier ------------------------------------------------------------

declare const REFUSAL: unique symbol

/** The typed absence a carrier answers with; never a throw across the seam. */
interface Refusal {
  readonly [REFUSAL]: true
}

/** Stand-in for the pinned Effect's \`Effect<A, E>\`; this file imports nothing. */
interface Effect<out A, out E> {
  readonly _A?: () => A
  readonly _E?: () => E
}

interface CellCore<State> {
  readonly cell: string
  readonly read: () => State
}

/** A cell carries its algebra's earned law set in its own type. */
type Cell<State, Laws extends LawSet> = CellCore<State> & Laws

// -- The affordance ---------------------------------------------------------

${docstring}
declare function ${TERM.affordance}<State>(
  ${cellParameter}: Cell<State, ${rung}>,
  ${batchParameter}: ReadonlyArray<State>,
): Effect<Cell<State, ${rung}>, Refusal>

// -- Controls ---------------------------------------------------------------

declare const observationCell: Cell<ReadonlyArray<string>, ${rung}>
declare const observations: ReadonlyArray<ReadonlyArray<string>>
declare const countCell: Cell<number, ${controlRung}>
declare const counts: ReadonlyArray<number>

/** Positive: ${TERM.carrier} earned the rung, so the whole batch is one call. */
export const batched = ${TERM.affordance}(observationCell, observations)

// @ts-expect-error — ${TERM.affordance} demands idempotence and a bound; the count
// cell is only ${COMMUTATIVE_MONOID.adjective}, so a redelivered batch double-counts.
export const doubleCounted = ${TERM.affordance}(countCell, counts)

// @ts-expect-error — a contribution is a state of the cell's own carrier; a batch
// of another sort has no ${TERM.operator.name} with what is already known.
export const crossSort = ${TERM.affordance}(observationCell, counts)
`

const denotation = canonicalBytes(TERM)
const generated = resolve(import.meta.dir, "generated")

await Bun.write(resolve(generated, "denotation.json"), denotation)
await Bun.write(resolve(generated, "joinAll.generated.ts"), surface)

console.log(`EMIT: term   ${TERM_DIGEST}`)
console.log(`EMIT: wrote  generated/denotation.json (${denotation.length} canonical bytes)`)
console.log(`EMIT: wrote  generated/joinAll.generated.ts (${surface.split("\n").length} lines)`)
