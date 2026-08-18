/**
 * The kernel language, rendered as prose from the interchange.
 *
 * The taught table is not merely renderable as documentation - it *is* the
 * documentation, and writing a second copy by hand forks the model. So this
 * renderer reads the corpus and writes one Markdown page: the closed
 * vocabularies with their ranks, every taught refusal with the law it defends
 * and the repair it teaches, the type vocabulary with each type's own
 * docstring above its constructors, the encoding vectors, the door's verdicts,
 * and the canonical-form appendix.
 *
 * Two rules keep the rendering honest, and both are mechanical here rather
 * than aspirational. Law, repair, and docstring texts are reproduced verbatim:
 * nothing in this file paraphrases, reflows, or truncates them. And the page
 * carries the safety disclaimer, because a reader who meets conformance
 * vectors without it will read them as guarantees about a running system.
 *
 * Exactly two things are done to a model text, both stated here and in the
 * page itself so no reader has to wonder. Inside a table cell a line break
 * becomes a space and a pipe is escaped, because a cell holds neither. And
 * trailing spaces are trimmed from the end of each line: the model's
 * environment returns a docstring with one, Markdown discards it, and a
 * committed page guarded by byte-identical regeneration must not carry
 * invisible characters that any editor's save would silently remove. Neither
 * changes a word, and the untrimmed text is still what the generated schemas
 * carry as their descriptions, which is where machines read it.
 *
 * The rendering is a total function of the corpus, so two runs produce the same
 * bytes and the page is reviewable as a diff.
 *
 * @module
 */
import type {
  KernelCanonRecord,
  KernelConstructorRecord,
  KernelTypeRecord,
} from "../src/KernelCorpusSchemas.js"
import type { KernelCorpus } from "./kernel-corpus.js"

/** The command a reader runs to reproduce the page. */
export const RENDER_PROSE_COMMAND = "bun run generate:kernel-prose"

/** Where the rendered page is committed, relative to the repository root. */
export const PROSE_PATH = "docs/generated/kernel-language.generated.md"

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelProseCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/**
 * One model text, placed in a table cell. A cell cannot hold a line break or an
 * unescaped pipe, so both are neutralised - and nothing else is touched. Every
 * text that carries a line break worth keeping is rendered as a paragraph
 * instead of as a cell.
 */
const cell = (text: string): string => text.replaceAll("|", "\\|").replaceAll("\n", " ")

/**
 * One model text as page lines, with trailing spaces removed. Markdown
 * discards them; a byte-gated file must not carry them, because an editor that
 * trims on save would redden the gate for nothing. No word changes.
 */
const paragraph = (text: string): string =>
  text.split("\n").map((line) => line.replace(/[ \t]+$/, "")).join("\n")

/** One text as inline code, for a byte string a reader may need to copy. */
const code = (text: string): string => `\`${text}\``

const constructorLine = (constructor: KernelConstructorRecord): string => {
  const fields = constructor.fields
    .map((field) => `${field.name} : ${field.type}`)
    .join(", ")
  return fields === ""
    ? `- \`${constructor.name}\``
    : `- \`${constructor.name}\` — ${fields}`
}

const typeSection = (
  type: KernelTypeRecord,
  doc: string | undefined,
  out: Array<string>,
): void => {
  out.push(`### ${type.name}`)
  out.push("")
  if (doc !== undefined) {
    out.push(paragraph(doc))
    out.push("")
  }
  const brands = type.params.filter((param) => param.role === "brand").map((param) => param.name)
  if (brands.length > 0) {
    out.push(
      `Branded by ${
        brands.map((brand) => `\`${brand}\``).join(" and ")
      }. A brand is carried in the type rather than in the data, so two values` +
        " that differ only by it do not compare.",
    )
    out.push("")
  }
  out.push(
    type.form === "structure"
      ? "A product type, with one constructor."
      : `A sum type, with ${type.constructors.length} constructors.`,
  )
  out.push("")
  for (const constructor of type.constructors) out.push(constructorLine(constructor))
  out.push("")
}

const canonRow = (canon: KernelCanonRecord): string =>
  `| ${canon.name} | ${code(canon.bytes)} |`

/**
 * Renders the page. Every heading, row, and paragraph below is corpus data or
 * a fixed sentence about the corpus; nothing restates a model text in other
 * words.
 */
export const renderKernelProse = (corpus: KernelCorpus, corpusPath: string): string => {
  const out: Array<string> = []
  const docs = new Map(corpus.docs.map((doc) => [doc.name, doc.doc] as const))
  const machineApplicable = corpus.refusals
    .filter((refusal) => refusal.applicability === "machine-applicable")

  out.push("# The kernel language")
  out.push("")
  out.push("<!-- GENERATED FILE - DO NOT EDIT. -->")
  out.push("")
  out.push(
    `Rendered from \`${corpusPath}\` by \`${RENDER_PROSE_COMMAND}\`, which reads the` +
      ` interchange emitted from \`${corpus.header.source}\` by \`${corpus.header.generator}\`` +
      ` at format ${corpus.header.format}. Every name, rank, law, repair, and docstring on` +
      " this page is the model's own text, reproduced verbatim - not paraphrased, not" +
      " reflowed, not truncated. Two mechanical exceptions, and no others: inside a table" +
      " cell a line break becomes a space and a pipe is escaped, because a cell holds" +
      " neither; and trailing spaces are trimmed from line ends, which Markdown discards" +
      " anyway. The untrimmed text is what the generated schemas carry.",
  )
  out.push("")
  out.push(
    "**What this page is not.** These are the model's verdicts, not guarantees about any" +
      " running system. A conforming implementation is one whose door refuses the same" +
      " candidates for the same reasons, encodes the same sentences the same way, and" +
      " serializes the same values to the same bytes. Nothing more is claimed, and nothing" +
      " more should be read into a green conformance run.",
  )
  out.push("")

  out.push("## Declaration kinds")
  out.push("")
  out.push(
    "The universe is closed: these are all of them, and a rank is what an encoded" +
      " sentence carries, so renumbering one changes the identity of every declaration" +
      " of that kind.",
  )
  out.push("")
  out.push("| Rank | Kind |")
  out.push("| --- | --- |")
  for (const kind of corpus.kinds) out.push(`| ${kind.rank} | ${kind.name} |`)
  out.push("")

  out.push("## Hole stages")
  out.push("")
  out.push(
    "A hole passes through these as it is filled, disputed, decided, and sealed. The" +
      " rank is ordinal and is read in the reached-at-least direction only: a sealed hole" +
      " has reached filled. The distance between two ranks means nothing.",
  )
  out.push("")
  out.push("| Rank | Stage |")
  out.push("| --- | --- |")
  for (const stage of corpus.stages) out.push(`| ${stage.rank} | ${stage.name} |`)
  out.push("")

  out.push("## Taught refusals")
  out.push("")
  out.push(
    "Each refusal carries the law it defends and the legal next move. The model's" +
      " teaching function is total, so a reason with no law and no repair cannot exist.",
  )
  out.push("")
  for (const refusal of corpus.refusals) {
    out.push(`### ${refusal.reason}`)
    out.push("")
    out.push(`**Law.** ${refusal.law}`)
    out.push("")
    out.push(`**Repair.** ${refusal.repair}`)
    out.push("")
    out.push(`**Applicability.** ${refusal.applicability}`)
    out.push("")
  }

  out.push("## The codemod catalog")
  out.push("")
  out.push(
    `${machineApplicable.length} of the ${corpus.refusals.length} repairs are` +
      " machine-applicable: the lawful rewrite is a function of the refused candidate" +
      " alone, so an agent may apply it with no new information. The rest need something" +
      " the candidate does not carry, and are advisory.",
  )
  out.push("")
  out.push("| Reason | Repair |")
  out.push("| --- | --- |")
  for (const refusal of machineApplicable) {
    out.push(`| ${refusal.reason} | ${cell(refusal.repair)} |`)
  }
  out.push("")

  out.push("## The type vocabulary")
  out.push("")
  out.push(
    `${corpus.types.length} types, in the model's declaration order. A field's type is a` +
      " small grammar: a leaf (`Nat`, `String`, `Ref`), a declared type, or a" +
      " one-argument container, optionally applied to brand arguments. A brand argument" +
      " is either one of the declaration kinds above or the name of an earlier field or" +
      " parameter of the same constructor.",
  )
  out.push("")
  for (const type of corpus.types) typeSection(type, docs.get(type.name), out)

  out.push("## Encoding vectors")
  out.push("")
  out.push(
    "A sentence's identity is its canonical framing. Element zero is the generator tag" +
      " and the arity is fixed per tag, so a decoder dispatches on length and tag alone." +
      " The emitter round-trips every vector before writing it.",
  )
  out.push("")
  out.push("| Vector | Encoding |")
  out.push("| --- | --- |")
  for (const encoding of corpus.encodings) {
    out.push(`| ${encoding.name} | ${code(`[${encoding.act.join(", ")}]`)} |`)
  }
  out.push("")

  out.push("## The door's verdicts")
  out.push("")
  out.push(
    "Every planted candidate and the verdict the model's door returns for it. The" +
      " admitted row is not optional: a suite of refusals alone cannot tell a correct" +
      " door from one that refuses everything.",
  )
  out.push("")
  out.push("| Candidate | Verdict | Reason or encoding |")
  out.push("| --- | --- | --- |")
  for (const admission of corpus.admissions) {
    const detail = admission.verdict === "admitted"
      ? code(`[${admission.encoded.join(", ")}]`)
      : admission.reason
    out.push(`| ${admission.name} | ${admission.verdict} | ${detail} |`)
  }
  out.push("")

  out.push("## Canonical form")
  out.push("")
  out.push(
    "The interchange is written in one canonical form, and these vectors are the" +
      " cross-implementation reference for it: an implementation agrees exactly when it" +
      " produces these bytes from these values. The bytes below are what the" +
      " canonicalizer writes for each vector's value, which is also what the corpus" +
      " carries for it.",
  )
  out.push("")
  out.push("| Vector | Bytes |")
  out.push("| --- | --- |")
  for (const canon of corpus.canons) out.push(canonRow(canon))
  out.push("")
  out.push(
    "Members sort by key, no whitespace anywhere, and every number is an unbounded" +
      " non-negative integer in minimal decimal - never a double, which is what the" +
      " big-integer vector exists to catch.",
  )
  out.push("")

  return `${out.join("\n")}`
}

/** Checks that committed page bytes equal a fresh rendering. */
export const checkKernelProse = (
  committed: string,
  corpus: KernelCorpus,
  corpusPath: string,
): KernelProseCheck =>
  committed === renderKernelProse(corpus, corpusPath)
    ? { ok: true }
    : { ok: false, reason: "the committed page failed byte-identical regeneration" }
