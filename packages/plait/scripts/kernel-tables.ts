/**
 * The kernel-conformance table generator.
 *
 * Reads the format-2 interchange file emitted from the Lean kernel model and
 * renders the runtime's derived type layer: the declaration-kind and hole-stage
 * registries with their ranks, the taught-refusal table, and the compile-time
 * brands of the sort system. Every model name, rank, and taught text is read
 * out of the corpus, so a model that moves reddens the regeneration check
 * instead of drifting quietly. The runtime refusal projection is a separate
 * reviewed input: rows absent from the model remain named staged debt.
 *
 * Reading and validating the corpus is not this module's job - `kernel-corpus`
 * owns that, schema decode and byte checks together, and hands over a value
 * whose integers are `bigint`. What is left here is the projection, and the
 * projection is where the two carriers part company: a rank is a small dense
 * index into a closed twelve-name table, so it lands as a TypeScript `number`,
 * while anything that rides the wire keeps its unbounded carrier. That split is
 * a decision, not an accident, and it is why the rank conversion below is
 * written out rather than implicit.
 *
 * The generator makes no runtime claim. It projects the model's names and
 * texts into constants a hand-written runtime consumes; conformance to the
 * model's verdicts is checked by the door harness, not asserted here.
 *
 * @module
 */
import type { KernelTypeRecord } from "../src/kernel/KernelCorpusSchemas.js"
import { CORPUS_PATH, type KernelCorpus } from "./kernel-corpus.js"
import {
  DRAFT_MEANING_MARKER,
  KERNEL_REFUSAL_REASON_MEANINGS,
  RUNTIME_REFUSAL_WAIVER_TICKET,
  RUNTIME_STRUCTURAL_REFUSAL_PROJECTION,
} from "./kernel-runtime-refusals.js"

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelTableCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/** The command a reader runs to reproduce the generated module. */
export const GENERATE_COMMAND = "bun run generate:kernel-tables"

/**
 * The corpus the committed tables are generated from, relative to the
 * repository root: the model-executed emission, never a hand-typed table.
 */
export const ARTIFACT_PATH = CORPUS_PATH

/** Where the generated module is committed, relative to the repository root. */
export const GENERATED_PATH = "packages/plait/src/kernel/KernelTables.generated.ts"

/**
 * Where the generated refusal vocabulary is committed, relative to the
 * repository root.
 *
 * The vocabulary lands in `truth/` rather than being imported up from
 * `kernel/`, because `truth/` is the deepest plane and root Law 4 permits it
 * to import only itself. A generated artifact carries no import-direction
 * debt: it is a corpus projection emitted into the plane that speaks it, and
 * its ancestry is the generator, not an edge in the module graph.
 */
export const REFUSAL_KINDS_PATH = "packages/plait/src/truth/RefusalKinds.generated.ts"

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel-conformance tables: ${reason}`)
}

/**
 * A rank as a TypeScript number. The corpus carries every integer at arbitrary
 * precision because an encoded sentence needs it; a rank does not, being a
 * dense index into a closed table the reader has already checked. The
 * conversion refuses rather than rounds, so if a rank ever grows past what a
 * number holds exactly the build stops here instead of shipping a wrong table.
 */
const rankOf = (rank: bigint, where: string): number =>
  rank <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(rank)
    : refuse(`${where} has rank ${rank}, past what a number holds exactly`)

const quote = (value: string): string => JSON.stringify(value)

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

/** A structure the sort system indexes by a brand, with its carrier field. */
interface BrandedSort {
  readonly name: string
  readonly params: ReadonlyArray<string>
  readonly carrier: string
}

/** A brand-indexed structure with no single carrier field to brand. */
interface UnbrandedSort {
  readonly name: string
  readonly params: ReadonlyArray<string>
}

/**
 * Selects the sorts that become branded aliases. The rule is mechanical: a
 * structure indexed by at least one brand parameter and carrying exactly one
 * field is a branded scalar, and the field's type is its carrier. A
 * brand-indexed structure with any other shape has no single value to brand,
 * so it is reported rather than invented.
 */
const brandedSorts = (
  types: ReadonlyArray<KernelTypeRecord>,
): { readonly branded: ReadonlyArray<BrandedSort>; readonly skipped: ReadonlyArray<UnbrandedSort> } => {
  const branded: Array<BrandedSort> = []
  const skipped: Array<UnbrandedSort> = []
  for (const type of types) {
    const brands = type.params.filter((param) => param.role === "brand").map((param) => param.name)
    if (type.form !== "structure" || brands.length === 0) continue
    const fields = type.constructors.at(0)?.fields ?? []
    const carrier = type.constructors.length === 1 && fields.length === 1 ? fields[0]! : undefined
    if (carrier === undefined) skipped.push({ name: type.name, params: brands })
    else branded.push({ name: type.name, params: brands, carrier: carrier.type })
  }
  return { branded, skipped }
}

// The model's scalar carriers, projected onto TypeScript's. A carrier this map
// does not name is a finding, not a guess: the generator refuses rather than
// pick a default that would type-check and mean nothing.
const carriers: { readonly [model: string]: string } = { Nat: "number", String: "string" }

const carrierOf = (sort: BrandedSort): string => {
  const carrier = carriers[sort.carrier]
  if (carrier === undefined) {
    return refuse(`sort ${sort.name} carries unmapped model type ${sort.carrier}`)
  }
  return carrier
}

const brandTag = (sort: BrandedSort): string =>
  `\`~foldlab/plait/kernel/${sort.name}/\${${sort.params.map(capitalize).join("}/${")}}\``

// A brand parameter named after a record class the corpus enumerates is
// constrained to that closed union, so a misspelled kind stops compiling. Every
// other brand domain is open (a register is a digest, a partition is a lane and
// a shard), and an open domain gets the widest honest constraint.
const brandDomains: { readonly [param: string]: string } = {
  kind: "KernelDeclKind",
  stage: "KernelHoleStage",
}

const brandConstraint = (param: string): string => brandDomains[param] ?? "string"

/**
 * The column a drafted meaning's comment lines are wrapped at, counting the
 * indent and the ` * ` gutter. Wrapping is greedy over single spaces and takes
 * no other input, so the same sentence renders to the same bytes every run.
 */
const MEANING_COMMENT_WIDTH = 88

/**
 * One drafted meaning as doc-comment lines.
 *
 * The marker is its own first line and is reproduced verbatim: the vocabulary
 * wall reads it back out of these bytes and refuses a meaning that lost it,
 * because a meaning without the marker reads as ratified prose and only the
 * operator's taste pass may make it read that way. The sentence itself is
 * reproduced word for word; only the line breaks are this renderer's.
 */
const meaningComment = (
  meaning: string,
  indent: string,
  where: string,
): ReadonlyArray<string> => {
  const text = meaning.trim()
  if (text === "") return refuse(`${where} carries no meaning`)
  if (meaning.includes("\n")) return refuse(`${where}'s meaning carries a line break`)
  const gutter = `${indent} * `
  const lines: Array<string> = [`${indent}/**`, `${gutter}${DRAFT_MEANING_MARKER}`]
  let current = ""
  for (const word of text.split(" ")) {
    if (word === "") continue
    if (current === "") {
      current = word
    } else if (gutter.length + current.length + 1 + word.length > MEANING_COMMENT_WIDTH) {
      lines.push(`${gutter}${current}`)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  lines.push(`${gutter}${current}`)
  lines.push(`${indent} */`)
  return lines
}

interface RuntimeRefusalProjectionRow {
  readonly kind: string
  readonly meaning: string
  readonly source: "kernel-corpus" | "staged-debt"
  readonly waiver?: typeof RUNTIME_REFUSAL_WAIVER_TICKET
}

const runtimeRefusalRows = (corpus: KernelCorpus): ReadonlyArray<RuntimeRefusalProjectionRow> => {
  const projected = new Set<string>(RUNTIME_STRUCTURAL_REFUSAL_PROJECTION.map((row) => row.kind))
  if (projected.size !== RUNTIME_STRUCTURAL_REFUSAL_PROJECTION.length) {
    return refuse("the runtime structural-refusal projection names a kind twice")
  }
  const corpusReasons = new Set(corpus.refusals.map((row) => row.reason))
  return RUNTIME_STRUCTURAL_REFUSAL_PROJECTION.map(({ kind, meaning }) =>
    corpusReasons.has(kind)
      ? { kind, meaning, source: "kernel-corpus" }
      : { kind, meaning, source: "staged-debt", waiver: RUNTIME_REFUSAL_WAIVER_TICKET })
}

/**
 * The drafted meaning of each model-emitted refusal reason, resolved against
 * the corpus's own rows. Both directions are refused rather than defaulted: a
 * reason the ledger does not cover would render an unexplained kind, and a
 * ledger row naming no reason is a meaning for a kind that no longer exists.
 */
const reasonMeanings = (corpus: KernelCorpus): ReadonlyMap<string, string> => {
  const ledger = new Map<string, string>()
  for (const row of KERNEL_REFUSAL_REASON_MEANINGS) {
    if (ledger.has(row.reason)) {
      return refuse(`the reason-meaning ledger names ${quote(row.reason)} twice`)
    }
    ledger.set(row.reason, row.meaning)
  }
  const reasons = new Set(corpus.refusals.map((row) => row.reason))
  for (const reason of reasons) {
    if (!ledger.has(reason)) {
      return refuse(`corpus refusal reason ${quote(reason)} carries no reviewed meaning`)
    }
  }
  for (const reason of ledger.keys()) {
    if (!reasons.has(reason)) {
      return refuse(`the reason-meaning ledger names ${quote(reason)}, which the corpus does not emit`)
    }
  }
  return ledger
}

/**
 * Renders the generated module. The rendering is a total function of the read
 * corpus alone, so two runs over one corpus produce identical bytes - and it
 * takes no path, which is what makes rendering one structurally impossible.
 */
export const renderKernelTables = (corpus: KernelCorpus): string => {
  const { branded, skipped } = brandedSorts(corpus.types)
  const digests = branded.find((sort) => sort.name === "Digest")
  const runtimeRows = runtimeRefusalRows(corpus)
  const meanings = reasonMeanings(corpus)
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)
  const lines = (values: ReadonlyArray<string>): void => {
    for (const value of values) line(value)
  }

  line("/**")
  line(" * Plane: kernel — the language: corpus, door, programs, and wire grammar.")
  line(" *")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Corpus:  ${corpus.digest}`)
  line(` * Format:  interchange format ${corpus.header.format}`)
  line(" *")
  line(" * That digest is this module's whole provenance, and it is a digest rather")
  line(" * than a location because a plait item refers only to digests: a path names")
  line(" * wherever a reader happens to be standing, which is the ambient reference the")
  line(" * algebra refuses. It is SHA-256 over the corpus's canonical bytes.")
  line(" *")
  line(" * The kernel model's closed tables, projected into the runtime's type layer:")
  line(" * the declaration-kind and hole-stage registries with their ranks, the taught")
  line(" * refusals with the law each defends and the repair each teaches, and the")
  line(" * compile-time brands of the sort system. The existing runtime refusal")
  line(" * projection is also generated here; a spelling the corpus does not carry is")
  line(" * marked staged debt, and the ticket owning it stays in the reviewed roster.")
  line(" *")
  line(" * Every refusal row carries its kind's standing MEANING as a doc comment: one")
  line(" * to two sentences saying what fact the kind names and what that implies,")
  line(" * distinct from the law and repair a refusal teaches at the moment it fires.")
  line(" * The meanings are drafts until the operator's taste pass rules, which is what")
  line(" * the marker line above each of them says.")
  line(" *")
  line(" * These are safety-side names and texts, never runtime guarantees. A model")
  line(" * theorem stays in the model; what crosses the seam is the vocabulary the")
  line(" * door harness then checks the runtime against, verdict for verdict.")
  line(" *")
  line(" * Brand identities are string literals, not unique symbols, because that is")
  line(" * how the estate's pinned Effect release spells a type identity.")
  line(" *")
  line(" * @module")
  line(" */")
  line()

  line("/**")
  line(" * What these tables came from, carried as data for a consumer to assert: the")
  line(" * identity of the corpus, and the interchange format it was read at. A")
  line(" * consumer that wants to know whether it holds these tables' source hashes")
  line(" * the bytes it has and compares - which is a check, where a path would have")
  line(" * been a hope.")
  line(" */")
  line("export const KERNEL_TABLE_PROVENANCE = {")
  line(`  corpus: ${quote(corpus.digest)},`)
  line(`  format: ${corpus.header.format}n,`)
  line("} as const")
  line()

  line("/** The closed universe of declaration kinds, in rank order. */")
  line("export const KERNEL_DECL_KINDS = [")
  for (const kind of corpus.kinds) line(`  ${quote(kind.name)},`)
  line("] as const")
  line()
  line("/** One declaration kind of the closed universe. */")
  line("export type KernelDeclKind = (typeof KERNEL_DECL_KINDS)[number]")
  line()
  line("/** The numeric rank of each declaration kind. */")
  line("export const KERNEL_DECL_KIND_RANK = {")
  for (const kind of corpus.kinds) line(`  ${kind.name}: ${rankOf(kind.rank, kind.name)},`)
  line("} as const satisfies { readonly [Kind in KernelDeclKind]: number }")
  line()

  line("/** The epistemic stages of a hole, in rising rank order. */")
  line("export const KERNEL_HOLE_STAGES = [")
  for (const stage of corpus.stages) line(`  ${quote(stage.name)},`)
  line("] as const")
  line()
  line("/** One epistemic stage of a hole. */")
  line("export type KernelHoleStage = (typeof KERNEL_HOLE_STAGES)[number]")
  line()
  line("/** The numeric rank of each hole stage. */")
  line("export const KERNEL_HOLE_STAGE_RANK = {")
  for (const stage of corpus.stages) line(`  ${stage.name}: ${rankOf(stage.rank, stage.name)},`)
  line("} as const satisfies { readonly [Stage in KernelHoleStage]: number }")
  line()

  line("/**")
  line(" * How a taught repair may be applied: machine-applicable exactly when the")
  line(" * lawful rewrite is a function of the refused candidate alone, advisory when")
  line(" * the repair needs something the candidate does not carry.")
  line(" */")
  line("export type KernelApplicability = \"machine-applicable\" | \"advisory\"")
  line()
  line("/** The wire spelling of every refusal reason, in the model's order. */")
  line("export const KERNEL_REFUSAL_REASONS = [")
  for (const refusal of corpus.refusals) line(`  ${quote(refusal.reason)},`)
  line("] as const")
  line()
  line("/** One refusal reason the kernel door can carry. */")
  line("export type KernelRefusalReason = (typeof KERNEL_REFUSAL_REASONS)[number]")
  line()
  line("/** One taught refusal: the law it defends and the legal next move. */")
  line("export interface KernelRefusalRow {")
  line("  readonly reason: KernelRefusalReason")
  line("  readonly law: string")
  line("  readonly repair: string")
  line("  readonly applicability: KernelApplicability")
  line("}")
  line()
  line("/** The taught-refusal table. A reason without its law and repair cannot exist. */")
  line("export const KERNEL_REFUSALS = [")
  for (const refusal of corpus.refusals) {
    lines(meaningComment(meanings.get(refusal.reason)!, "  ", `refusal reason ${quote(refusal.reason)}`))
    line("  {")
    line(`    reason: ${quote(refusal.reason)},`)
    line(`    law: ${quote(refusal.law)},`)
    line(`    repair: ${quote(refusal.repair)},`)
    line(`    applicability: ${quote(refusal.applicability)},`)
    line("  },")
  }
  line("] as const satisfies ReadonlyArray<KernelRefusalRow>")
  line()
  line("/** The taught refusal each reason carries, keyed by its wire spelling. */")
  line("export const KERNEL_REFUSAL_BY_REASON = {")
  corpus.refusals.forEach((refusal, index) => {
    line(`  ${quote(refusal.reason)}: KERNEL_REFUSALS[${index}],`)
  })
  line("} as const satisfies { readonly [Reason in KernelRefusalReason]: KernelRefusalRow }")
  line()

  line("/** The existing runtime structural-refusal spellings, generated from the projection manifest. */")
  line("export const KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS = [")
  for (const row of runtimeRows) line(`  ${quote(row.kind)},`)
  line("] as const")
  line()
  line("/** One structural-refusal kind the runtime can mint. */")
  line("export type KernelRuntimeStructuralRefusalKind =")
  line("  (typeof KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS)[number]")
  line()
  line("/** How one runtime spelling traces to the generated kernel vocabulary. */")
  line("export interface KernelRuntimeStructuralRefusalRow {")
  line("  readonly kind: KernelRuntimeStructuralRefusalKind")
  line("  readonly source: \"kernel-corpus\" | \"staged-debt\"")
  line("}")
  line()
  line("/**")
  line(" * The runtime projection with derivation ancestry on every row. A spelling the")
  line(" * corpus does not carry is marked staged debt, never a silent twin. Which")
  line(" * ticket owns closing that debt is a tracking fact and stays in the reviewed")
  line(" * roster, where a reviewer reads it; it is not part of the language.")
  line(" */")
  line("export const KERNEL_RUNTIME_STRUCTURAL_REFUSALS = [")
  for (const row of runtimeRows) {
    lines(meaningComment(row.meaning, "  ", `runtime refusal kind ${quote(row.kind)}`))
    line("  {")
    line(`    kind: ${quote(row.kind)},`)
    line(`    source: ${quote(row.source)},`)
    line("  },")
  }
  line("] as const satisfies ReadonlyArray<KernelRuntimeStructuralRefusalRow>")
  line()

  line("/**")
  line(" * The compile-time brand carrier. The property never exists at runtime; it")
  line(" * exists so two sorts with the same representation refuse to unify.")
  line(" */")
  line("export interface KernelBrand<Tag extends string> {")
  line("  readonly \"~foldlab/plait/kernel/Brand\": Tag")
  line("}")
  line()
  line("/**")
  line(" * The sorts this module brands, and the parameters that index each. The")
  line(" * carrier is the model's own scalar; a call site migrating a real runtime")
  line(" * value substitutes its carrier through the alias's second parameter.")
  line(" */")
  line("export const KERNEL_BRANDED_SORTS = [")
  for (const sort of branded) {
    const params = sort.params.map(quote).join(", ")
    line(`  { name: ${quote(sort.name)}, params: [${params}], carrier: ${quote(sort.carrier)} },`)
  }
  line("] as const")
  line()
  if (skipped.length > 0) {
    line("/**")
    line(" * Brand-indexed sorts with no single carrier field, so no scalar alias is")
    line(" * generated for them. They are reported rather than invented: a structure")
    line(" * with several fields has no one value a brand could ride on.")
    line(" */")
    line("export const KERNEL_UNBRANDED_INDEXED_SORTS = [")
    for (const sort of skipped) {
      line(`  { name: ${quote(sort.name)}, params: [${sort.params.map(quote).join(", ")}] },`)
    }
    line("] as const")
    line()
  }
  for (const sort of branded) {
    const params = sort.params
      .map((param) => `${capitalize(param)} extends ${brandConstraint(param)}`)
      .join(", ")
    line(`/** The branded ${sort.name} sort, indexed by ${sort.params.join(" and ")}. */`)
    line(`export type Kernel${sort.name}<${params}, Carrier = ${carrierOf(sort)}> =`)
    line(`  Carrier & KernelBrand<${brandTag(sort)}>`)
    line()
  }
  if (digests !== undefined) {
    line("/**")
    line(" * The per-kind digest aliases. The declaration kinds are the one brand")
    line(" * domain the model closes, so they enumerate; a register and a partition")
    line(" * are open, so their brands stay parameters.")
    line(" */")
    for (const kind of corpus.kinds) {
      line(`/** A content address branded to the ${kind.name} declaration kind. */`)
      line(
        `export type ${capitalize(kind.name)}Digest<Carrier = ${carrierOf(digests)}> =` +
          ` Kernel${digests.name}<${quote(kind.name)}, Carrier>`,
      )
    }
    line()
  }

  return out.join("\n")
}

/**
 * Renders the truth-plane refusal vocabulary.
 *
 * The same projection the kernel table records ancestry for is emitted a
 * second time, as the module the minting sites actually speak. Two emissions
 * of one projection are not two vocabularies: both are total functions of the
 * corpus and the reviewed manifest, and `check:kernel-tables` byte-compares
 * both, so they cannot part company without reddening.
 *
 * No identifier annotation rides the emitted schema. An identifier replaces
 * the admitted-literal list in a failed decode's `got` text with a type name,
 * which is wire-visible behaviour at every site that decodes a refusal kind —
 * a change this projection has no licence to make.
 */
export const renderRefusalKinds = (corpus: KernelCorpus): string => {
  const runtimeRows = runtimeRefusalRows(corpus)
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)
  const lines = (values: ReadonlyArray<string>): void => {
    for (const value of values) line(value)
  }

  line("/**")
  line(" * Plane: truth — the vocabulary every sentence speaks.")
  line(" *")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Corpus:  ${corpus.digest}`)
  line(` * Format:  interchange format ${corpus.header.format}`)
  line(" *")
  line(" * The structural refusal kinds this package can mint, emitted into the plane")
  line(" * that speaks them. The truth plane is the deepest and imports only itself, so")
  line(" * the vocabulary lands here rather than being imported up from the kernel")
  line(" * plane; the kernel table carries the same rows with their derivation ancestry")
  line(" * in `KERNEL_RUNTIME_STRUCTURAL_REFUSALS`, where a spelling the model corpus")
  line(" * does not yet carry is marked staged debt.")
  line(" *")
  line(" * Each kind carries its standing MEANING as a doc comment: one to two sentences")
  line(" * saying what fact the kind names and what that implies, which is a different")
  line(" * act from the law and repair a refusal teaches when it fires. The meanings are")
  line(" * drafts until the operator's taste pass rules, which is what the marker line")
  line(" * above each of them says.")
  line(" *")
  line(" * @module")
  line(" */")
  line("import { Schema } from \"effect\"")
  line()
  line("/**")
  line(" * What this vocabulary came from, carried as data for a consumer to assert:")
  line(" * the identity of the corpus, and the interchange format it was read at. The")
  line(" * corpus is named by its digest and never by a location - a plait item refers")
  line(" * only to digests, so a consumer checks by hashing rather than by looking.")
  line(" */")
  line("export const REFUSAL_KIND_PROVENANCE = {")
  line(`  corpus: ${quote(corpus.digest)},`)
  line(`  format: ${corpus.header.format}n,`)
  line("} as const")
  line()
  line("/** Every structural refusal kind the package can mint, in its persisted order. */")
  line("export const STRUCTURAL_REFUSAL_KINDS = [")
  for (const row of runtimeRows) {
    lines(meaningComment(row.meaning, "  ", `runtime refusal kind ${quote(row.kind)}`))
    line(`  ${quote(row.kind)},`)
  }
  line("] as const")
  line()
  line("/**")
  line(" * Every structural refusal kind the package can mint.")
  line(" *")
  line(" * Deliberately unannotated: an `identifier` would replace the admitted")
  line(" * literals in a failed decode's reported expectation with this schema's name.")
  line(" */")
  line("export const StructuralRefusalKind = Schema.Literals(STRUCTURAL_REFUSAL_KINDS)")
  line()
  line("/**")
  line(" * One structural refusal kind, named here so a consumer re-exports this")
  line(" * declaration instead of restating the type as one of its own. A consumer-side")
  line(" * `typeof StructuralRefusalKind.Type` reads as derivation and is not: it is the")
  line(" * consumer's own declaration, and no checker can read its ancestry back.")
  line(" */")
  line("export type StructuralRefusalKind = typeof StructuralRefusalKind.Type")
  line()

  return out.join("\n")
}

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelTables = (
  committed: string,
  corpus: KernelCorpus,
): KernelTableCheck =>
  committed === renderKernelTables(corpus)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed kernel tables failed byte-identical regeneration",
    }

/** Checks that the committed truth-plane vocabulary equals a fresh rendering. */
export const checkRefusalKinds = (
  committed: string,
  corpus: KernelCorpus,
): KernelTableCheck =>
  committed === renderRefusalKinds(corpus)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed truth-plane refusal vocabulary failed byte-identical regeneration",
    }
