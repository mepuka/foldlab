/**
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * Artifact 3 of the slice: the SIBLING projections. The same declared term the
 * TypeScript surface came from, formatted into two other media — the MCP tool
 * entry, in the record shape `verify/kernel/projections/tools.schema.json` uses,
 * and the §7.1 affordance row in both registers.
 *
 * Each projection renders the shared fields in its own idiom: a JSON tool
 * description is one labelled paragraph, a register row is table cells, and the
 * TypeScript surface is wrapped JSDoc. That is the whole point — if the three
 * agreed by carrying an identical block of JSON, the parity wall would be
 * checking a copy rather than a projection.
 *
 * Run: `bun scratch/km-expressibility/project.ts`
 */

import { resolve } from "node:path"

import {
  algebraic,
  DERIVED_ORDER,
  LAWS_OF,
  plainWords,
  REQUIRES,
  REWRITE,
  SHARED,
  TERM,
  TERM_DIGEST,
} from "./term.ts"

export const TERM_PATH = "scratch/km-expressibility/term.ts"
export const PROJECT_COMMAND = "bun scratch/km-expressibility/project.ts"

// -- The MCP tool entry -------------------------------------------------------

/**
 * The generated description's grammar, labelled so that `wall.ts` parses it
 * rather than guesses at it. Segment order is §7.3's: algebraic sentence first,
 * donor and evidence tier last, with the bound the loop actually carries in
 * between and the term digest closing.
 */
const description = [
  `${SHARED.affordance}.`,
  `Algebraic: ${SHARED.algebraic}.`,
  `Plain: ${SHARED.plain}.`,
  `Inherited: ${SHARED.inherited}.`,
  `License: ${SHARED.donors}; rung ${SHARED.rung}; evidence ${SHARED.evidence}.`,
  `Bound: ${TERM.bound}.`,
  `Term: ${SHARED.term}.`,
].join(" ")

const toolEntry = {
  $comment: "EXEMPLAR ONLY — wired into nothing, served by nothing, gated by nothing." +
    ` GENERATED from ${TERM_PATH} by \`${PROJECT_COMMAND}\`; nothing here is hand-written.` +
    " Record shape follows verify/kernel/projections/tools.schema.json: flat tools, no oneOf," +
    " compound self-descriptive field names, digests as prefixed opaque strings with pattern." +
    " There is no ordering parameter and no conflict strategy because the term declares none;" +
    " an unlawful call has no spelling here rather than a refusal at the door.",
  artifact: TERM_PATH,
  command: PROJECT_COMMAND,
  term_digest: TERM_DIGEST,
  tools: [
    {
      name: `kernel_${TERM.affordance.replace(/([A-Z])/g, "_$1").toLowerCase()}`,
      description,
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: [`${TERM.parameters[0]!}_digest`, TERM.parameters[1]!],
        properties: {
          [`${TERM.parameters[0]!}_digest`]: {
            type: "string",
            pattern: "^sha256:[0-9a-f]+$",
            description: `Digest of the declared cell resource whose ${SHARED.rung}` +
              " algebra governs the merge.",
          },
          [TERM.parameters[1]!]: {
            type: "array",
            items: { type: "string" },
            description: `The batch, canonical bytes per element — ${SHARED.inherited}.`,
          },
        },
      },
    },
  ],
}

// -- The §7.1 affordance row, in both registers -------------------------------

const row = (rungCell: string, sentence: string): string =>
  `| \`${SHARED.affordance}\` | ${rungCell} | ${
    TERM.donors.map((donor) => `\`${donor}\``).join(", ")
  } | ${SHARED.evidence} | ${sentence} |`

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

const registers = `<!-- GENERATED FILE - DO NOT EDIT. Artifact: ${TERM_PATH} | Command: ${PROJECT_COMMAND} | Term: ${TERM_DIGEST} -->

# ${TERM.affordance} — the affordance row, in both registers

**EXEMPLAR ONLY** — wired into nothing, published nowhere, gated by nothing.
Both rows below are projections of one declared term; neither is a second
text, and neither was written by a person. The rung is one datum rendered
twice: the algebraic register spells the rung name, the plain register leads
with its adjective. That adjective is a rendering, not a shared field, so the
parity wall does not pretend to compare it.

What the caller no longer has to know:

> ${SHARED.inherited}

## The algebraic register

${HEADER}
${row(`\`${SHARED.rung}\``, SHARED.algebraic)}

## The plain register

${HEADER}
${row(`${TERM.rung.adjective} (\`${SHARED.rung}\`)`, SHARED.plain)}

## The four statements, paired

One abstract statement type, two total renderings. The laws, derived-order,
and requires rows are the ${TERM.operator.name} operator's own and must come out
byte-identical to the ones committed in
\`docs/design/2026-08-18-km-algebraic-register.md\` §6.3 — that record is the
wall's outside oracle, written before this exemplar and by another hand. The
rewrite row is the one line that legitimately differs: §6.3 states the
single-contribution ${TERM.operator.name}, this term states the batched one.

| Statement | Plain register | Algebraic register |
| --- | --- | --- |
${paired.map(([label, stmt]) => `| ${label} | ${plainWords(stmt)} | ${algebraic(stmt)} |`).join("\n")}
`

const generated = resolve(import.meta.dir, "generated")
const tool = `${JSON.stringify(toolEntry, null, 2)}\n`

await Bun.write(resolve(generated, "tool.json"), tool)
await Bun.write(resolve(generated, "registers.md"), registers)

console.log(`PROJECT: term   ${TERM_DIGEST}`)
console.log(`PROJECT: wrote  generated/tool.json (${toolEntry.tools.length} tool entry)`)
console.log(`PROJECT: wrote  generated/registers.md (2 register rows, 4 paired statements)`)
