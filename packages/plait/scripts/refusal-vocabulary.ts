/**
 * The refusal-vocabulary containment wall.
 *
 * The law is Law 1 ancestry for one vocabulary: every structural refusal kind
 * the package can mint is either a refusal reason the kernel model emitted, or
 * a spelling written down as staged debt under an owning ticket. Nothing may
 * be minted that is neither.
 *
 * What makes this a wall rather than a tautology is that its three inputs are
 * three artifacts, and no two of them are views of one value:
 *
 * 1. **The runtime union** is read out of the *bytes* of the shipped
 *    truth-plane module, through the TypeScript AST — not by importing the
 *    schema and asking it for its literals, which would only ask the generated
 *    value to agree with itself. `check:kernel-tables` separately holds those
 *    bytes to a byte-identical regeneration, so the source this reader parses
 *    is the source the projection produced.
 * 2. **The corpus reasons** are read out of the *bytes* of the model's
 *    interchange fixture, by parsing its NDJSON lines here — not through the
 *    corpus loader the generator itself runs, and not from any table rendered
 *    from it.
 * 3. **The staged-debt roster** is a reviewed pin, transcribed by hand, that
 *    is never an input to any generator. It is what stops the wall from being
 *    satisfiable by editing the generator's manifest: a new spelling that the
 *    corpus does not carry has to be written into the pin too, in a diff a
 *    reviewer reads, before the wall goes green again.
 *
 * The mutation arm is `check:refusal-control`: it plants a hand-minted kind
 * into the runtime-union source and requires this same law to refuse it for
 * the reason committed in the control's trace.
 *
 * ## The second law: every kind carries its meaning
 *
 * Ancestry says where a kind came from. It says nothing about what the kind
 * MEANS, and a vocabulary whose words are traceable but unexplained is still
 * not a language. So `checkRefusalMeanings` holds a second law over the same
 * artifacts: every runtime structural kind and every reason the model emits
 * carries one to two sentences of standing meaning, rendered behind the draft
 * marker until the operator's taste pass rules, and rendered identically by
 * the two projections that carry it — the generated modules and the prose
 * page, which are written by different renderers and are read here as bytes.
 *
 * The mutation arm is `check:refusal-meaning-control`, which plants a kind
 * with no meaning into the same runtime-union source.
 *
 * @module
 */
import * as ts from "typescript-five"

import { CORPUS_PATH } from "./kernel-corpus.js"
import {
  DRAFT_MEANING_MARKER,
  REFUSAL_MEANING_TASTE_TICKET,
  RUNTIME_REFUSAL_WAIVER_TICKET,
} from "./kernel-runtime-refusals.js"

/** The result of checking one refusal vocabulary against its ancestry. */
export type RefusalVocabularyCheck =
  | { readonly ok: true; readonly corpusBacked: number; readonly stagedDebt: number }
  | { readonly ok: false; readonly reason: string }

/** One runtime spelling the kernel corpus does not carry yet, and who owns it. */
export interface StagedDebtWaiver {
  readonly kind: string
  readonly ticket: string
}

/** The artifacts the wall reads, relative to the repository root. */
export const REFUSAL_VOCABULARY_PATHS = {
  /** The shipped truth-plane union, read as source bytes. */
  runtimeUnion: "packages/plait/src/truth/RefusalKinds.generated.ts",
  /** The module whose public spelling the minting sites import. */
  refusalModule: "packages/plait/src/truth/Refusal.ts",
  /** The model's own emission, read as fixture bytes. */
  corpusFixture: CORPUS_PATH,
  /** The reviewed staged-debt pin, never a generator input. */
  stagedDebtPin: "packages/plait/test/fixtures/refusal-staged-debt.pin.txt",
  /** The kernel-plane table, read as source bytes for the emitted reasons' meanings. */
  kernelTables: "packages/plait/src/kernel/KernelTables.generated.ts",
  /** The rendered prose page, read as page bytes for the third derivation. */
  prosePage: "docs/generated/kernel-language.generated.md",
} as const

/** The name the truth-plane module gives its literal roster. */
export const RUNTIME_UNION_BINDING = "STRUCTURAL_REFUSAL_KINDS"

/** The name the kernel table gives its taught-refusal table. */
export const KERNEL_REFUSALS_BINDING = "KERNEL_REFUSALS"

/** The name both the generated module and the public module give the schema. */
export const RUNTIME_UNION_SCHEMA_BINDING = "StructuralRefusalKind"

const quote = (value: string): string => JSON.stringify(value)

// Annotated at the binding, not only at the arrow, so a bare `refuse(...)`
// reads as control flow that does not return.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`refusal vocabulary: ${reason}`)
}

const parse = (source: string, path: string): ts.SourceFile =>
  ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)

const exportedInitializer = (
  file: ts.SourceFile,
  binding: string,
): ts.Expression | undefined => {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
    if (exported !== true) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      if (declaration.name.text !== binding) continue
      return declaration.initializer
    }
  }
  return undefined
}

// `satisfies` is unwrapped beside the two assertion forms because the kernel
// table's rosters carry `as const satisfies ...`: the annotation constrains the
// literal and never replaces it, so a reader after the literal must see past
// all three or it would report a shape the file does not have.
const unwrapAssertions = (node: ts.Expression): ts.Expression =>
  ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node)
    ? unwrapAssertions(node.expression)
    : node

/**
 * Reads the runtime structural-refusal union out of the truth-plane module's
 * source. The read is over the committed bytes, so nothing here can agree with
 * the generator by construction; a roster that is missing, renamed, or built
 * from anything but string literals is a refusal, never an empty answer that
 * would let the containment law pass vacuously.
 */
export const readRuntimeRefusalKinds = (
  source: string,
  path: string,
): ReadonlyArray<string> => {
  const initializer = exportedInitializer(parse(source, path), RUNTIME_UNION_BINDING)
  if (initializer === undefined) {
    return refuse(`${path} exports no ${RUNTIME_UNION_BINDING} roster`)
  }
  const literal = unwrapAssertions(initializer)
  if (!ts.isArrayLiteralExpression(literal)) {
    return refuse(`${path}'s ${RUNTIME_UNION_BINDING} is not an array literal`)
  }
  const kinds: Array<string> = []
  for (const element of literal.elements) {
    if (!ts.isStringLiteral(element)) {
      return refuse(
        `${path}'s ${RUNTIME_UNION_BINDING} carries an element that is not a string literal`,
      )
    }
    kinds.push(element.text)
  }
  if (kinds.length === 0) return refuse(`${path}'s ${RUNTIME_UNION_BINDING} is empty`)
  return kinds
}

/**
 * Checks that the module the minting sites import takes its union from the
 * generated roster and mints no second one. Without this the wall would guard
 * a roster nothing speaks.
 *
 * The admitted shape is a value re-export straight from the generated module.
 * DEV-804 replaced the older `export const X: typeof Generated = Generated`
 * spelling with it, and the replacement was forced rather than chosen:
 * `StructuralRefusalKind` is a merged value-and-type name, TypeScript admits
 * one export declaration per exported name across both meanings, and only a
 * re-export gives the TYPE half a declaration the public-type census can trace
 * back to the generator. The clause is stronger for the move — an
 * `export ... from` cannot be a second roster wearing the name, so nothing here
 * has to chase an initializer back to an import alias and hope no later
 * statement rebound it.
 */
export const checkRuntimeUnionWiring = (
  source: string,
  path: string,
  generatedSpecifier: string,
): RefusalVocabularyCheck => {
  const file = parse(source, path)
  for (const statement of file.statements) {
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue
    const specifier = statement.moduleSpecifier
    if (specifier === undefined || !ts.isStringLiteral(specifier)) continue
    if (specifier.text !== generatedSpecifier) continue
    const clause = statement.exportClause
    if (clause === undefined || !ts.isNamedExports(clause)) continue
    for (const element of clause.elements) {
      if (element.isTypeOnly) continue
      if (element.name.text !== RUNTIME_UNION_SCHEMA_BINDING) continue
      const exported = element.propertyName?.text ?? element.name.text
      if (exported !== RUNTIME_UNION_SCHEMA_BINDING) {
        return {
          ok: false,
          reason:
            `${path} exports ${RUNTIME_UNION_SCHEMA_BINDING} as ${quote(exported)},`
            + " which is not the generated roster's schema",
        }
      }
      return { ok: true, corpusBacked: 0, stagedDebt: 0 }
    }
  }
  if (exportedInitializer(file, RUNTIME_UNION_SCHEMA_BINDING) !== undefined) {
    return {
      ok: false,
      reason:
        `${path} declares ${RUNTIME_UNION_SCHEMA_BINDING} of its own rather than re-exporting`
        + ` it from ${quote(generatedSpecifier)}`,
    }
  }
  return {
    ok: false,
    reason:
      `${path} does not re-export ${RUNTIME_UNION_SCHEMA_BINDING} from`
      + ` ${quote(generatedSpecifier)}`,
  }
}

/**
 * Reads the model's refusal reasons out of the interchange fixture's bytes.
 * This deliberately does not go through the corpus loader the generator runs:
 * the wall's second derivation has to be a second read of the file, not a
 * second look at the generator's value.
 */
export const readCorpusRefusalReasons = (
  fixture: string,
  path: string,
): ReadonlyArray<string> => {
  const reasons: Array<string> = []
  const lines = fixture.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (line === "") continue
    let record: unknown
    try {
      record = JSON.parse(line)
    } catch {
      return refuse(`${path} line ${index + 1} is not JSON`)
    }
    if (typeof record !== "object" || record === null) continue
    const row = record as { readonly [key: string]: unknown }
    if (row["record"] !== "refusal") continue
    const reason = row["reason"]
    if (typeof reason !== "string") {
      return refuse(`${path} line ${index + 1} is a refusal row with no reason`)
    }
    reasons.push(reason)
  }
  if (reasons.length === 0) return refuse(`${path} carries no refusal rows`)
  return reasons
}

/**
 * Reads the reviewed staged-debt pin. Comment and blank lines are ignored; a
 * content line is `<kind> <ticket>`.
 */
export const readStagedDebtPin = (
  pin: string,
  path: string,
): ReadonlyArray<StagedDebtWaiver> => {
  const waivers: Array<StagedDebtWaiver> = []
  const lines = pin.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.trim()
    if (line === "" || line.startsWith("#")) continue
    const parts = line.split(" ").filter((part) => part !== "")
    if (parts.length !== 2) {
      return refuse(`${path} line ${index + 1} is not a "<kind> <ticket>" pair`)
    }
    waivers.push({ kind: parts[0]!, ticket: parts[1]! })
  }
  return waivers
}

/** The three independent derivations the containment law is evaluated over. */
export interface RefusalVocabularyEvidence {
  /** Read from the shipped truth-plane source bytes. */
  readonly runtimeKinds: ReadonlyArray<string>
  /** Read from the model interchange fixture's bytes. */
  readonly corpusReasons: ReadonlyArray<string>
  /** Read from the reviewed pin, which is nothing's input. */
  readonly waivers: ReadonlyArray<StagedDebtWaiver>
  /** The ticket a staged-debt waiver must cite. */
  readonly waiverTicket: string
}

/**
 * The containment law.
 *
 * Every runtime kind is corpus-backed or pinned staged debt; every pin is
 * live, owned, and actually minted. The five clauses are separate because a
 * red wall has to name which one moved.
 */
export const checkRefusalVocabulary = (
  evidence: RefusalVocabularyEvidence,
): RefusalVocabularyCheck => {
  const runtime = new Set<string>()
  for (const kind of evidence.runtimeKinds) {
    if (runtime.has(kind)) {
      return { ok: false, reason: `the runtime structural refusal union names ${quote(kind)} twice` }
    }
    runtime.add(kind)
  }

  const waived = new Map<string, string>()
  for (const waiver of evidence.waivers) {
    if (waived.has(waiver.kind)) {
      return { ok: false, reason: `the staged-debt pin names ${quote(waiver.kind)} twice` }
    }
    waived.set(waiver.kind, waiver.ticket)
  }

  const corpus = new Set(evidence.corpusReasons)

  for (const kind of evidence.runtimeKinds) {
    if (corpus.has(kind) || waived.has(kind)) continue
    return {
      ok: false,
      reason:
        `runtime structural refusal kind ${quote(kind)} is neither a kernel corpus refusal`
        + ` reason nor a pinned ${evidence.waiverTicket} staged-debt waiver`,
    }
  }

  for (const waiver of evidence.waivers) {
    if (waiver.ticket !== evidence.waiverTicket) {
      return {
        ok: false,
        reason:
          `staged-debt waiver for ${quote(waiver.kind)} cites ${quote(waiver.ticket)}`
          + ` rather than ${quote(evidence.waiverTicket)}`,
      }
    }
    if (corpus.has(waiver.kind)) {
      return {
        ok: false,
        reason:
          `staged-debt waiver for ${quote(waiver.kind)} is stale: the kernel corpus`
          + ` now carries that refusal reason`,
      }
    }
    if (!runtime.has(waiver.kind)) {
      return {
        ok: false,
        reason:
          `staged-debt waiver names ${quote(waiver.kind)}, which the runtime structural`
          + ` refusal union does not mint`,
      }
    }
  }

  return {
    ok: true,
    corpusBacked: evidence.runtimeKinds.filter((kind) => corpus.has(kind)).length,
    stagedDebt: evidence.waivers.length,
  }
}

/**
 * Checks that the kernel table's ancestry rows agree with the classification
 * the wall derived independently. The kernel table is a second emission of the
 * same projection; this is what keeps the two emissions from parting company.
 */
export const checkProjectionAncestry = (
  rows: ReadonlyArray<{ readonly kind: string; readonly source: string; readonly waiver?: string }>,
  evidence: RefusalVocabularyEvidence,
): RefusalVocabularyCheck => {
  const corpus = new Set(evidence.corpusReasons)
  if (rows.length !== evidence.runtimeKinds.length) {
    return {
      ok: false,
      reason:
        `the kernel table carries ${rows.length} runtime refusal rows while the`
        + ` truth-plane union mints ${evidence.runtimeKinds.length} kinds`,
    }
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    const kind = evidence.runtimeKinds[index]!
    if (row.kind !== kind) {
      return {
        ok: false,
        reason:
          `the kernel table's runtime refusal row ${index} spells ${quote(row.kind)}`
          + ` while the truth-plane union spells ${quote(kind)}`,
      }
    }
    const expected = corpus.has(kind) ? "kernel-corpus" : "staged-debt"
    if (row.source !== expected) {
      return {
        ok: false,
        reason:
          `the kernel table records ${quote(kind)} as ${quote(row.source)} while the`
          + ` corpus fixture says ${quote(expected)}`,
      }
    }
    if (expected === "staged-debt" && row.waiver !== evidence.waiverTicket) {
      return {
        ok: false,
        reason:
          `the kernel table's staged-debt row ${quote(kind)} does not cite`
          + ` ${evidence.waiverTicket}`,
      }
    }
  }
  return { ok: true, corpusBacked: 0, stagedDebt: 0 }
}

/** One kind's standing meaning, read out of a generated artifact's bytes. */
export interface ReadMeaning {
  /** The refusal kind or emitted reason the meaning belongs to. */
  readonly name: string
  /** The first line of the rendering, which the draft marker law is about. */
  readonly marker: string
  /** The meaning itself, line breaks rejoined as single spaces. */
  readonly meaning: string
}

const leadingDocBlock = (file: ts.SourceFile, node: ts.Node): string | undefined => {
  const text = file.getFullText()
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []
  const last = ranges.at(-1)
  if (last === undefined) return undefined
  const raw = text.slice(last.pos, last.end)
  return raw.startsWith("/**") && raw.endsWith("*/") ? raw : undefined
}

/**
 * One doc block as its content lines: the comment syntax removed, each line
 * trimmed, and the blank ends dropped. The rendering wraps a meaning at a
 * fixed column, so the sentence is rebuilt by rejoining the lines that follow
 * the marker with single spaces — the same text, read back out of the bytes.
 */
const docBlockLines = (raw: string): ReadonlyArray<string> => {
  const body = raw.slice("/**".length, raw.length - "*/".length)
  const lines = body.split("\n").map((line) => {
    const trimmed = line.trim()
    return (trimmed.startsWith("*") ? trimmed.slice(1) : trimmed).trim()
  })
  while (lines.length > 0 && lines[0] === "") lines.shift()
  while (lines.length > 0 && lines.at(-1) === "") lines.pop()
  return lines
}

const meaningOfDoc = (raw: string | undefined, name: string): ReadMeaning => {
  if (raw === undefined) return { name, marker: "", meaning: "" }
  const lines = docBlockLines(raw)
  return {
    name,
    marker: lines.at(0) ?? "",
    meaning: lines.slice(1).join(" ").trim(),
  }
}

/**
 * Reads each runtime kind's standing meaning out of the truth-plane module's
 * source bytes. The read is the same one the union roster gets: the committed
 * bytes through the TypeScript AST, with the doc comment taken from the
 * leading trivia of the literal it stands over. Nothing here consults the
 * reviewed roster the generator read, so a meaning that never reached the
 * shipped artifact reads as absent rather than as present-in-the-manifest.
 */
export const readRuntimeRefusalMeanings = (
  source: string,
  path: string,
): ReadonlyArray<ReadMeaning> => {
  const file = parse(source, path)
  const initializer = exportedInitializer(file, RUNTIME_UNION_BINDING)
  if (initializer === undefined) {
    return refuse(`${path} exports no ${RUNTIME_UNION_BINDING} roster`)
  }
  const literal = unwrapAssertions(initializer)
  if (!ts.isArrayLiteralExpression(literal)) {
    return refuse(`${path}'s ${RUNTIME_UNION_BINDING} is not an array literal`)
  }
  return literal.elements.map((element) => {
    if (!ts.isStringLiteral(element)) {
      return refuse(
        `${path}'s ${RUNTIME_UNION_BINDING} carries an element that is not a string literal`,
      )
    }
    return meaningOfDoc(leadingDocBlock(file, element), element.text)
  })
}

/**
 * Reads each emitted reason's standing meaning out of the kernel table's
 * source bytes. This is the second generated artifact and a second parse: the
 * reasons themselves come back from the corpus fixture's bytes, so the two
 * sides of the coverage law are never one value read twice.
 */
export const readKernelReasonMeanings = (
  source: string,
  path: string,
): ReadonlyArray<ReadMeaning> => {
  const file = parse(source, path)
  const initializer = exportedInitializer(file, KERNEL_REFUSALS_BINDING)
  if (initializer === undefined) {
    return refuse(`${path} exports no ${KERNEL_REFUSALS_BINDING} table`)
  }
  const literal = unwrapAssertions(initializer)
  if (!ts.isArrayLiteralExpression(literal)) {
    return refuse(`${path}'s ${KERNEL_REFUSALS_BINDING} is not an array literal`)
  }
  return literal.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      return refuse(`${path}'s ${KERNEL_REFUSALS_BINDING} carries a row that is not an object`)
    }
    let reason: string | undefined
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const key = property.name
      if (!ts.isIdentifier(key) || key.text !== "reason") continue
      if (!ts.isStringLiteral(property.initializer)) {
        return refuse(`${path}'s ${KERNEL_REFUSALS_BINDING} carries a non-literal reason`)
      }
      reason = property.initializer.text
    }
    if (reason === undefined) {
      return refuse(`${path}'s ${KERNEL_REFUSALS_BINDING} carries a row with no reason`)
    }
    return meaningOfDoc(leadingDocBlock(file, element), reason)
  })
}

/**
 * Reads the meanings out of the rendered prose page's bytes. A level-three
 * heading names the kind; a line equal to the draft marker opens its meaning,
 * and the next non-empty line is the sentence. Headings carrying no marker —
 * every type and program vector on the page — are not meanings and are not
 * read as empty ones.
 */
export const readProseMeanings = (
  page: string,
  path: string,
): ReadonlyArray<ReadMeaning> => {
  const lines = page.split("\n").map((line) => line.replace(/\r$/, ""))
  const found: Array<ReadMeaning> = []
  let heading: string | undefined
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (line.startsWith("### ")) {
      heading = line.slice("### ".length).trim()
      continue
    }
    if (line.trim() !== DRAFT_MEANING_MARKER) continue
    if (heading === undefined) {
      return refuse(`${path} line ${index + 1} carries a draft marker under no heading`)
    }
    let cursor = index + 1
    while (cursor < lines.length && lines[cursor]!.trim() === "") cursor++
    if (cursor >= lines.length) {
      return refuse(`${path} line ${index + 1} carries a draft marker with nothing after it`)
    }
    found.push({ name: heading, marker: line.trim(), meaning: lines[cursor]!.trim() })
  }
  return found
}

/** The meaning law's inputs: three reads of three artifacts' bytes. */
export interface RefusalMeaningEvidence {
  /** Read from the shipped truth-plane source bytes. */
  readonly runtimeMeanings: ReadonlyArray<ReadMeaning>
  /** Read from the kernel table's source bytes. */
  readonly reasonMeanings: ReadonlyArray<ReadMeaning>
  /** Read from the rendered page's bytes. */
  readonly proseMeanings: ReadonlyArray<ReadMeaning>
  /** Read from the model interchange fixture's bytes. */
  readonly corpusReasons: ReadonlyArray<string>
  /** The marker every unratified meaning must still carry. */
  readonly draftMarker: string
  /** The ticket whose taste pass may retire that marker. */
  readonly tasteTicket: string
}

/** The result of checking the standing meanings. */
export type RefusalMeaningCheck =
  | { readonly ok: true; readonly kinds: number; readonly reasons: number }
  | { readonly ok: false; readonly reason: string }

/**
 * The meaning law.
 *
 * Every kind in the estate's refusal vocabulary carries a standing meaning:
 * one to two sentences saying what the kind means and what it implies, which
 * is a different act from the law and repair a refusal teaches when it fires.
 * Four clauses, separate so a red wall names which one moved.
 *
 * 1. **Presence.** Every runtime structural kind, and every reason the model
 *    emits, has a non-empty meaning in the generated artifact that ships it. A
 *    kind with no meaning refuses here — silently shipping an unexplained kind
 *    is exactly the drift the operator's requirement exists to stop.
 * 2. **The draft marker stands.** Every meaning is rendered behind the marker,
 *    verbatim, until the taste pass rules. An unmarked meaning reads as prose
 *    the operator has ratified, and nothing but that sitting may make it read
 *    that way — so the marker's PRESENCE is pinned exactly like the sentences'
 *    bytes are.
 * 3. **One kind, one meaning.** A name carried by both registers carries the
 *    same sentence in both.
 * 4. **The projections agree.** The prose page carries a meaning for exactly
 *    the names the generated modules do, with the same bytes. The page is
 *    rendered by a different module than the tables are, so this is what stops
 *    one projection from dropping, truncating, or paraphrasing a meaning the
 *    other renders in full.
 */
export const checkRefusalMeanings = (
  evidence: RefusalMeaningEvidence,
): RefusalMeaningCheck => {
  const expected = new Map<string, string>()
  const register = (
    read: ReadonlyArray<ReadMeaning>,
    what: string,
  ): RefusalMeaningCheck | undefined => {
    for (const row of read) {
      if (row.meaning === "") {
        return {
          ok: false,
          reason:
            `${what} ${quote(row.name)} carries no standing meaning; every refusal kind`
            + ` states what it means and what that implies`,
        }
      }
      if (row.marker !== evidence.draftMarker) {
        return {
          ok: false,
          reason:
            `${what} ${quote(row.name)} renders its meaning behind ${quote(row.marker)}`
            + ` rather than ${quote(evidence.draftMarker)}; only the`
            + ` ${evidence.tasteTicket} taste pass retires that marker`,
        }
      }
      const already = expected.get(row.name)
      if (already !== undefined && already !== row.meaning) {
        return {
          ok: false,
          reason: `${quote(row.name)} carries two different standing meanings`,
        }
      }
      expected.set(row.name, row.meaning)
    }
    return undefined
  }

  const runtimeFailure = register(evidence.runtimeMeanings, "runtime structural refusal kind")
  if (runtimeFailure !== undefined) return runtimeFailure
  const reasonFailure = register(evidence.reasonMeanings, "emitted refusal reason")
  if (reasonFailure !== undefined) return reasonFailure

  const covered = new Set(evidence.reasonMeanings.map((row) => row.name))
  for (const reason of evidence.corpusReasons) {
    if (covered.has(reason)) continue
    return {
      ok: false,
      reason:
        `the model emits refusal reason ${quote(reason)}, which the kernel table renders`
        + ` no standing meaning for`,
    }
  }

  const rendered = new Set<string>()
  for (const row of evidence.proseMeanings) {
    const wanted = expected.get(row.name)
    if (wanted === undefined) {
      return {
        ok: false,
        reason:
          `the prose page renders a standing meaning for ${quote(row.name)}, which is`
          + ` neither a runtime structural kind nor an emitted refusal reason`,
      }
    }
    if (row.marker !== evidence.draftMarker) {
      return {
        ok: false,
        reason:
          `the prose page renders ${quote(row.name)}'s meaning behind ${quote(row.marker)}`
          + ` rather than ${quote(evidence.draftMarker)}`,
      }
    }
    if (row.meaning !== wanted) {
      return {
        ok: false,
        reason:
          `the prose page's standing meaning for ${quote(row.name)} is not the one the`
          + ` generated modules carry`,
      }
    }
    rendered.add(row.name)
  }
  for (const name of expected.keys()) {
    if (rendered.has(name)) continue
    return {
      ok: false,
      reason: `the prose page renders no standing meaning for ${quote(name)}`,
    }
  }

  return {
    ok: true,
    kinds: evidence.runtimeMeanings.length,
    reasons: evidence.reasonMeanings.length,
  }
}

/** The ticket a staged-debt waiver must cite, re-exported for the control. */
export { DRAFT_MEANING_MARKER, REFUSAL_MEANING_TASTE_TICKET, RUNTIME_REFUSAL_WAIVER_TICKET }
