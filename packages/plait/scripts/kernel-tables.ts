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
  RUNTIME_REFUSAL_PROJECTION_PATH,
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

interface RuntimeRefusalProjectionRow {
  readonly kind: string
  readonly source: "kernel-corpus" | "staged-debt"
  readonly waiver?: typeof RUNTIME_REFUSAL_WAIVER_TICKET
}

const runtimeRefusalRows = (corpus: KernelCorpus): ReadonlyArray<RuntimeRefusalProjectionRow> => {
  const projected = new Set<string>(RUNTIME_STRUCTURAL_REFUSAL_PROJECTION)
  if (projected.size !== RUNTIME_STRUCTURAL_REFUSAL_PROJECTION.length) {
    return refuse("the runtime structural-refusal projection names a kind twice")
  }
  const corpusReasons = new Set(corpus.refusals.map((row) => row.reason))
  return RUNTIME_STRUCTURAL_REFUSAL_PROJECTION.map((kind) =>
    corpusReasons.has(kind)
      ? { kind, source: "kernel-corpus" }
      : { kind, source: "staged-debt", waiver: RUNTIME_REFUSAL_WAIVER_TICKET })
}

const refusalVocabulary = (
  corpus: KernelCorpus,
  runtimeRows: ReadonlyArray<RuntimeRefusalProjectionRow>,
): ReadonlyArray<string> => {
  const vocabulary = corpus.refusals.map((row) => row.reason)
  const seen = new Set(vocabulary)
  for (const row of runtimeRows) {
    if (!seen.has(row.kind)) vocabulary.push(row.kind)
    seen.add(row.kind)
  }
  return vocabulary
}

/**
 * Renders the generated module. The rendering is a total function of the
 * corpus and its repository-relative path, so two runs over one corpus produce
 * identical bytes.
 */
export const renderKernelTables = (
  corpus: KernelCorpus,
  corpusPath: string,
): string => {
  const { branded, skipped } = brandedSorts(corpus.types)
  const digests = branded.find((sort) => sort.name === "Digest")
  const runtimeRows = runtimeRefusalRows(corpus)
  const allRefusalReasons = refusalVocabulary(corpus, runtimeRows)
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)

  line("/**")
  line(" * Plane: kernel — the language: corpus, door, programs, and wire grammar.")
  line(" *")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Artifact: ${corpusPath}`)
  line(` * Command:  ${GENERATE_COMMAND}`)
  line(` * Source:   ${corpus.header.source}, emitted by ${quote(corpus.header.generator)}`)
  line(` *           at interchange format ${corpus.header.format}.`)
  line(" *")
  line(" * The kernel model's closed tables, projected into the runtime's type layer:")
  line(" * the declaration-kind and hole-stage registries with their ranks, the taught")
  line(" * refusals with the law each defends and the repair each teaches, and the")
  line(" * compile-time brands of the sort system. The existing runtime refusal")
  line(" * projection is also generated here; corpus gaps wear an owned waiver.")
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

  line("/** Where these tables came from, carried as data for a consumer to assert. */")
  line("export const KERNEL_TABLE_PROVENANCE = {")
  line(`  artifact: ${quote(corpusPath)},`)
  line(`  command: ${quote(GENERATE_COMMAND)},`)
  line(`  format: ${corpus.header.format}n,`)
  line(`  generator: ${quote(corpus.header.generator)},`)
  line(`  runtimeProjection: ${quote(RUNTIME_REFUSAL_PROJECTION_PATH)},`)
  line(`  runtimeWaiverTicket: ${quote(RUNTIME_REFUSAL_WAIVER_TICKET)},`)
  line(`  source: ${quote(corpus.header.source)},`)
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
  line("export type KernelRuntimeStructuralRefusalRow =")
  line("  | { readonly kind: KernelRuntimeStructuralRefusalKind; readonly source: \"kernel-corpus\" }")
  line(`  | { readonly kind: KernelRuntimeStructuralRefusalKind; readonly source: "staged-debt"; readonly waiver: ${quote(RUNTIME_REFUSAL_WAIVER_TICKET)} }`)
  line()
  line("/**")
  line(" * The runtime projection with derivation ancestry on every row. Missing corpus")
  line(" * rows are explicit Law 1 staged debt owned by DEV-804, never silent twins.")
  line(" */")
  line("export const KERNEL_RUNTIME_STRUCTURAL_REFUSALS = [")
  for (const row of runtimeRows) {
    line("  {")
    line(`    kind: ${quote(row.kind)},`)
    line(`    source: ${quote(row.source)},`)
    if (row.waiver !== undefined) line(`    waiver: ${quote(row.waiver)},`)
    line("  },")
  }
  line("] as const satisfies ReadonlyArray<KernelRuntimeStructuralRefusalRow>")
  line()
  line("/** Every structural refusal spelling known to the generated kernel table. */")
  line("export const KERNEL_REFUSAL_VOCABULARY = [")
  for (const reason of allRefusalReasons) line(`  ${quote(reason)},`)
  line("] as const")
  line()
  line("/** One structural refusal spelling known to the generated kernel table. */")
  line("export type KernelRefusalVocabulary = (typeof KERNEL_REFUSAL_VOCABULARY)[number]")
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

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelTables = (
  committed: string,
  corpus: KernelCorpus,
  corpusPath: string,
): KernelTableCheck =>
  committed === renderKernelTables(corpus, corpusPath)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed kernel tables failed byte-identical regeneration",
    }
