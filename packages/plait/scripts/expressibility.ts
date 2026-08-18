/**
 * The expressibility emitter: one declared term, four projected artifacts.
 *
 * Reads `expressibility-term.ts` — the one declaration — and renders the four
 * surfaces that term projects into: its canonical preimage, the fluent
 * TypeScript surface, the MCP tool entry, and the affordance row in both
 * registers. Nothing here is hand-typed from the declaration; every name,
 * sentence, type, and served field is read out of it, so a declaration that
 * moves reddens `check:expressibility` instead of drifting quietly.
 *
 * The module renders and compares; it does not read or write files. Writing is
 * `generate-expressibility.ts`, checking is `check-expressibility.ts`, and the
 * split is what lets the check regenerate into memory and byte-compare without
 * touching the committed artifacts.
 *
 * **The served schema derives from the declaration.** `servedSchema` below is
 * the ONLY renderer of the MCP callable's `required`, `pattern`, and
 * `items.type`; the wall re-derives the same object through a second rendering
 * written on its own side and byte-compares. Two renderings of one declaration
 * is served-equals-derived (standing estate law 3); one rendering compared
 * against itself is green by construction.
 *
 * @module
 */
import {
  algebraic,
  BOUND_TEXT,
  BOUNDED_SEMILATTICE,
  COMMUTATIVE_MONOID,
  DERIVED_ORDER,
  LAWS,
  LAWS_OF,
  type ParameterDecl,
  plainWords,
  REQUIRES,
  REWRITE,
  type RungRow,
  type Shared,
  SIGNATURE,
  TERM,
} from "./expressibility-term.js"

/** The result of comparing committed bytes with a fresh rendering. */
export type ExpressibilityCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/** The command a reader runs to reproduce the generated artifacts. */
export const GENERATE_COMMAND = "bun run generate:expressibility"

/** The declaration the committed artifacts are generated from. */
export const ARTIFACT_PATH = "packages/plait/scripts/expressibility-term.ts"

/** Where the generated artifacts are committed, relative to the repository root. */
export const GENERATED_DIR = "packages/plait/generated/expressibility"

/** The four artifacts, in the order the generator writes and the wall reads. */
export const GENERATED_FILES = [
  "denotation.json",
  "joinAll.generated.ts",
  "tool.schema.json",
  "registers.md",
] as const

export type GeneratedFile = (typeof GENERATED_FILES)[number]

// ── Artifact 2: the fluent TypeScript surface ────────────────────────────────

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

const jsdoc = (paragraphs: readonly string[]): string =>
  `/**\n${
    paragraphs
      .map((paragraph) => wrap(paragraph, 74).map((line) => ` * ${line}`).join("\n"))
      .join("\n *\n")
  }\n */`

const typeName = (word: string): string => word[0]!.toUpperCase() + word.slice(1)
const brandName = (word: string): string => word.toUpperCase()
const rungType = (rung: RungRow): string => rung.name.split("-").map(typeName).join("")

const rung = rungType(TERM.rung)
const controlRung = rungType(COMMUTATIVE_MONOID)

/**
 * Fills a declared type template's holes. `{State}` and `{Rung}` are the only
 * two; a template carrying any other is a refusal rather than a silent literal.
 */
const fillType = (template: string, rungName: string = rung): string => {
  const filled = template
    .replaceAll("{State}", SIGNATURE.type_parameter)
    .replaceAll("{Rung}", rungName)
  const stray = /\{(\w+)\}/.exec(filled)
  if (stray !== null) {
    throw new Error(`expressibility: the declared type \`${template}\` has an unfilled hole {${stray[1]}}`)
  }
  return filled
}

export const renderSurface = (shared: Shared, digest: string): string => {
  const lawAtoms = LAWS.map((law) =>
    `declare const ${brandName(law.name)}: unique symbol\n` +
    `/** ${law.equation} — ${law.reading}. */\n` +
    `type ${typeName(law.name)} = { readonly [${brandName(law.name)}]: true }`
  ).join("\n\n")

  const bundle = (row: RungRow): string =>
    `/** ${row.adjective}: ${row.laws.join(", ")}. */\n` +
    `type ${rungType(row)} = ${row.laws.map(typeName).join(" & ")}`

  const header = [
    "/**",
    " * GENERATED FILE - DO NOT EDIT.",
    " *",
    ` * Artifact: ${ARTIFACT_PATH}`,
    ` * Command:  ${GENERATE_COMMAND}`,
    ` * Term:     ${digest}`,
    " *",
    " * The fluent surface one declared term projects into TypeScript. Zero imports",
    " * on purpose: it type-checks alone under `--strict` with no config, so the",
    " * must-not-compile controls at the foot are load-bearing rather than",
    " * decorative. It is a TYPE-LEVEL PROBE and not a shipped surface — `Effect`",
    " * below is a structural stand-in, and nothing imports this file.",
    " *",
    " * @module",
    " */",
  ].join("\n")

  const docstring = jsdoc([
    `${TERM.affordance}: ${shared.algebraic}. Derived order: ${algebraic(DERIVED_ORDER)}.`,
    `${shared.plain}.`,
    `${shared.inherited}.`,
    `Denotes the shipped composition: \`${TERM.runtime.entry}\` over` +
    ` \`${TERM.runtime.loop}\` (${TERM.runtime.loop_module}) at ${TERM.carrier}, join` +
    ` \`${TERM.runtime.carrier}\`, discipline \`${TERM.runtime.discipline}\`, attempt` +
    ` bound ${TERM.runtime.attempts}, contention refused as \`${TERM.runtime.contended}\`.`,
    `Bound: ${BOUND_TEXT}.`,
    `Licensed by ${shared.donors} (${BOUNDED_SEMILATTICE.donor_source}), instantiated at` +
    ` ${TERM.carrier} by f1_cell_join_semilattice. rung: ${shared.rung}; evidence:` +
    ` ${shared.evidence}.`,
  ])

  const parameterList = SIGNATURE.parameters
    .map((parameter) => `  ${parameter.name}: ${fillType(parameter.ts_type)},`)
    .join("\n")

  return `${header}

// -- The law atoms, emitted from the corpus \`law\` rows ----------------------

${lawAtoms}

// -- The rung bundles, emitted from the corpus \`rung\` rows -------------------

${bundle(TERM.rung)}

${bundle(COMMUTATIVE_MONOID)}

type LawSet = Partial<${LAWS.map((law) => typeName(law.name)).join(" & ")}>

// -- The carrier ------------------------------------------------------------

declare const REFUSAL: unique symbol

/** The typed absence a carrier answers with; never a throw across the seam. */
interface ${SIGNATURE.refusal} {
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
declare function ${TERM.affordance}<${SIGNATURE.type_parameter}>(
${parameterList}
): ${fillType(SIGNATURE.returns)}

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
}

// ── Artifact 3a: the MCP tool entry ──────────────────────────────────────────

/**
 * The served callable schema, derived from the declared signature.
 *
 * This is the one renderer. `check-expressibility.ts` carries a SECOND,
 * independent rendering and byte-compares the two against the committed file.
 */
export const servedSchema = (shared: Shared): Record<string, unknown> => {
  const property = (parameter: ParameterDecl): Record<string, unknown> => {
    const description = parameter.served_description
      .replaceAll("{rung}", shared.rung)
      .replaceAll("{inherited}", shared.inherited)
    switch (parameter.served.kind) {
      case "digest-string":
        return { type: "string", pattern: parameter.served.pattern, description }
      case "string-array":
        return { type: "array", items: { type: "string" }, description }
    }
  }
  return {
    type: "object",
    additionalProperties: false,
    required: SIGNATURE.parameters.filter((p) => p.required).map((p) => p.served_name),
    properties: Object.fromEntries(
      SIGNATURE.parameters.map((parameter) => [parameter.served_name, property(parameter)]),
    ),
  }
}

export const renderTool = (shared: Shared, digest: string): string => {
  const description = [
    `${shared.affordance}.`,
    `Algebraic: ${shared.algebraic}.`,
    `Plain: ${shared.plain}.`,
    `Inherited: ${shared.inherited}.`,
    `License: ${shared.donors}; rung ${shared.rung}; evidence ${shared.evidence}.`,
    `Bound: ${BOUND_TEXT}.`,
    `Term: ${shared.term}.`,
  ].join(" ")

  const entry = {
    $comment: "GENERATED FILE - DO NOT EDIT." +
      ` Generated from ${ARTIFACT_PATH} by \`${GENERATE_COMMAND}\`; nothing here is hand-written.` +
      " Record shape follows verify/kernel/projections/tools.schema.json: flat tools, no oneOf," +
      " compound self-descriptive field names, digests as prefixed opaque strings with pattern." +
      " There is no ordering parameter and no conflict strategy because the term declares none;" +
      " an unlawful call has no spelling here rather than a refusal at the door." +
      " NOT SERVED: no MCP surface reads this file; it is the projection under wall.",
    artifact: ARTIFACT_PATH,
    command: GENERATE_COMMAND,
    term_digest: digest,
    tools: [
      {
        name: `kernel_${TERM.affordance.replace(/([A-Z])/g, "_$1").toLowerCase()}`,
        description,
        input_schema: servedSchema(shared),
      },
    ],
  }
  return `${JSON.stringify(entry, null, 2)}\n`
}

// ── Artifact 3b: the affordance row in both registers ────────────────────────

export const renderRegisters = (shared: Shared, digest: string): string => {
  const row = (rungCell: string, sentence: string): string =>
    `| \`${shared.affordance}\` | ${rungCell} | ${
      TERM.donors.map((donor) => `\`${donor}\``).join(", ")
    } | ${shared.evidence} | ${sentence} |`

  const HEADER = [
    "| Affordance | Rung | Inherited from | Evidence | Sentence |",
    "| --- | --- | --- | --- | --- |",
  ].join("\n")

  const paired = [
    ["rewrite", REWRITE],
    ["laws", LAWS_OF],
    ["derived order", DERIVED_ORDER],
    ["requires", REQUIRES],
  ] as const

  return `<!-- GENERATED FILE - DO NOT EDIT. Artifact: ${ARTIFACT_PATH} | Command: ${GENERATE_COMMAND} | Term: ${digest} -->

# ${TERM.affordance} — the affordance row, in both registers

Both rows below are projections of one declared term; neither is a second text,
and neither was written by a person. The rung is one datum rendered twice: the
algebraic register spells the rung name, the plain register leads with its
adjective. That adjective is a rendering, not a shared field, so the parity wall
does not pretend to compare it.

What the caller no longer has to know:

> ${shared.inherited}

## The algebraic register

${HEADER}
${row(`\`${shared.rung}\``, shared.algebraic)}

## The plain register

${HEADER}
${row(`${TERM.rung.adjective} (\`${shared.rung}\`)`, shared.plain)}

## The four statements, paired

One abstract statement type, two total renderings. The laws, derived-order, and
requires rows are the ${TERM.operator.name} operator's own and must come out
byte-identical to the ones committed in
\`docs/design/2026-08-18-km-algebraic-register.md\` §6.3 — that record is the
wall's outside oracle, written before this slice and by another hand. The
rewrite row is the one line that legitimately differs: §6.3 states the
single-contribution ${TERM.operator.name}, this term states the batched one.

| Statement | Plain register | Algebraic register |
| --- | --- | --- |
${paired.map(([label, stmt]) => `| ${label} | ${plainWords(stmt)} | ${algebraic(stmt)} |`).join("\n")}
`
}

// ── The whole rendering, and the comparison ──────────────────────────────────

/** Every generated artifact, rendered from the declaration. */
export const renderAll = (
  shared: Shared,
  digest: string,
  bytes: string,
): ReadonlyMap<GeneratedFile, string> =>
  new Map<GeneratedFile, string>([
    ["denotation.json", bytes],
    ["joinAll.generated.ts", renderSurface(shared, digest)],
    ["tool.schema.json", renderTool(shared, digest)],
    ["registers.md", renderRegisters(shared, digest)],
  ])

/**
 * Compares committed bytes with a fresh rendering, file by file.
 *
 * Reports the FIRST divergence with its file and offset rather than a diff, in
 * the shape the other kernel checks report: the repair is always the same
 * command, so the useful information is which artifact moved and where.
 */
export const checkExpressibility = (
  committed: ReadonlyMap<GeneratedFile, string>,
  rendered: ReadonlyMap<GeneratedFile, string>,
): ExpressibilityCheck => {
  for (const name of GENERATED_FILES) {
    const left = committed.get(name)
    const right = rendered.get(name)
    if (left === undefined) return { ok: false, reason: `${name} is missing from ${GENERATED_DIR}` }
    if (right === undefined) return { ok: false, reason: `${name} was not rendered` }
    if (left === right) continue
    let at = 0
    while (at < left.length && at < right.length && left[at] === right[at]) at += 1
    return {
      ok: false,
      reason: `${name} is not a byte-identical regeneration` +
        ` (first difference at byte ${at}; committed ${left.length} bytes, rendered ${right.length})`,
    }
  }
  return { ok: true }
}
