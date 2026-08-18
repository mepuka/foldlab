/**
 * The kernel-conformance table generator.
 *
 * Reads a schema-v1 `kernel-conformance.ndjson` emitted from the Lean kernel
 * model and renders the runtime's derived type layer: the declaration-kind and
 * hole-stage registries with their ranks, the taught-refusal table, and the
 * compile-time brands of the sort system. Nothing here is hand-typed from the
 * model; every name, rank, and taught text is read out of the artifact, so a
 * model that moves reddens the regeneration check instead of drifting quietly.
 *
 * The generator makes no runtime claim. It projects the model's names and
 * texts into constants a hand-written runtime consumes; conformance to the
 * model's verdicts is checked by the door harness, not asserted here.
 *
 * @module
 */

/** The provenance line every schema-v1 artifact opens with. */
export interface KernelHeader {
  readonly record: "header"
  readonly format: number
  readonly generator: string
  readonly source: string
  readonly counts: { readonly [record: string]: number }
}

/** One declaration kind of the closed universe, with its rank. */
export interface KernelKindRecord {
  readonly record: "kind"
  readonly name: string
  readonly rank: number
}

/** One epistemic hole stage, with its rank. */
export interface KernelStageRecord {
  readonly record: "stage"
  readonly name: string
  readonly rank: number
}

/** One taught refusal: the wire reason, the law it defends, the repair. */
export interface KernelRefusalRecord {
  readonly record: "refusal"
  readonly reason: string
  readonly law: string
  readonly repair: string
  readonly applicability: "machine-applicable" | "advisory"
}

/** One field of a constructor in the emitted mini-AST. */
export interface KernelFieldRecord {
  readonly name: string
  readonly type: string
}

/** One constructor of a type in the emitted mini-AST. */
export interface KernelConstructorRecord {
  readonly name: string
  readonly fields: ReadonlyArray<KernelFieldRecord>
}

/** One type parameter, marked brand when it indexes the sort. */
export interface KernelParamRecord {
  readonly name: string
  readonly role: "brand" | "type"
}

/** One type of the emitted mini-AST. */
export interface KernelTypeRecord {
  readonly record: "type"
  readonly name: string
  readonly form: "inductive" | "structure"
  readonly params: ReadonlyArray<KernelParamRecord>
  readonly constructors: ReadonlyArray<KernelConstructorRecord>
}

/** One sentence-encoding vector, checked for round-trip at emit time. */
export interface KernelEncodingRecord {
  readonly record: "encoding"
  readonly name: string
  readonly act: ReadonlyArray<number>
}

/** One admission verdict for a planted candidate. */
export type KernelAdmissionRecord =
  | {
    readonly record: "admission"
    readonly name: string
    readonly verdict: "refused"
    readonly reason: string
  }
  | {
    readonly record: "admission"
    readonly name: string
    readonly verdict: "admitted"
    readonly encoded: ReadonlyArray<number>
  }

/** A parsed schema-v1 artifact, in file order per record class. */
export interface KernelArtifact {
  readonly header: KernelHeader
  readonly kinds: ReadonlyArray<KernelKindRecord>
  readonly stages: ReadonlyArray<KernelStageRecord>
  readonly refusals: ReadonlyArray<KernelRefusalRecord>
  readonly types: ReadonlyArray<KernelTypeRecord>
  readonly encodings: ReadonlyArray<KernelEncodingRecord>
  readonly admissions: ReadonlyArray<KernelAdmissionRecord>
}

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelTableCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/** The command a reader runs to reproduce the generated module. */
export const GENERATE_COMMAND = "bun run generate:kernel-tables"

/**
 * The artifact the committed tables are generated from, relative to the
 * repository root: the model-executed emission, never a hand-typed table.
 */
export const ARTIFACT_PATH = "packages/plait/fixtures/kernel-conformance.ndjson"

/**
 * A second artifact of the same schema, transcribed by hand from the model's
 * Lean sources rather than emitted by executing them. It is a control, never a
 * source: the wall asserts the two agree on every closed-vocabulary record, so
 * a transcription error on either side shows up as a divergence instead of as
 * confidence. Nothing is generated from it.
 */
export const SAMPLE_ARTIFACT_PATH =
  "packages/plait/test/fixtures/kernel-conformance.sample.ndjson"

/** Where the generated module is committed, relative to the repository root. */
export const GENERATED_PATH = "packages/plait/src/KernelTables.generated.ts"

const refuse = (reason: string): never => {
  throw new Error(`kernel-conformance artifact: ${reason}`)
}

const object = (value: unknown, where: string): { readonly [key: string]: unknown } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return refuse(`${where} is not a JSON object`)
  }
  return value as { readonly [key: string]: unknown }
}

const text = (value: unknown, where: string): string =>
  typeof value === "string" ? value : refuse(`${where} is not a string`)

const nat = (value: unknown, where: string): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : refuse(`${where} is not a safe non-negative integer`)

const natList = (value: unknown, where: string): ReadonlyArray<number> =>
  Array.isArray(value)
    ? value.map((entry, index) => nat(entry, `${where}[${index}]`))
    : refuse(`${where} is not an array`)

const keysInOrder = (
  row: { readonly [key: string]: unknown },
  expected: ReadonlyArray<string>,
  where: string,
): void => {
  const actual = Object.keys(row)
  if (actual.join(",") !== expected.join(",")) {
    refuse(`${where} keys are ${actual.join(",")}, want ${expected.join(",")}`)
  }
}

const oneOf = <A extends string>(
  value: unknown,
  admitted: ReadonlyArray<A>,
  where: string,
): A => {
  const spelling = text(value, where)
  return admitted.includes(spelling as A)
    ? spelling as A
    : refuse(`${where} is ${spelling}, want one of ${admitted.join("|")}`)
}

const parseHeader = (row: { readonly [key: string]: unknown }): KernelHeader => {
  keysInOrder(row, ["record", "format", "generator", "source", "counts"], "header")
  const counts = object(row.counts, "header.counts")
  const parsed: { [record: string]: number } = {}
  for (const [name, value] of Object.entries(counts)) {
    parsed[name] = nat(value, `header.counts.${name}`)
  }
  return {
    record: "header",
    format: nat(row.format, "header.format"),
    generator: text(row.generator, "header.generator"),
    source: text(row.source, "header.source"),
    counts: parsed,
  }
}

const parseField = (
  value: unknown,
  where: string,
): KernelFieldRecord => {
  const row = object(value, where)
  keysInOrder(row, ["name", "type"], where)
  return { name: text(row.name, `${where}.name`), type: text(row.type, `${where}.type`) }
}

const parseConstructor = (
  value: unknown,
  where: string,
): KernelConstructorRecord => {
  const row = object(value, where)
  keysInOrder(row, ["name", "fields"], where)
  const fields = row.fields
  if (!Array.isArray(fields)) return refuse(`${where}.fields is not an array`)
  return {
    name: text(row.name, `${where}.name`),
    fields: fields.map((field, index) => parseField(field, `${where}.fields[${index}]`)),
  }
}

const parseParam = (value: unknown, where: string): KernelParamRecord => {
  const row = object(value, where)
  keysInOrder(row, ["name", "role"], where)
  return {
    name: text(row.name, `${where}.name`),
    role: oneOf(row.role, ["brand", "type"] as const, `${where}.role`),
  }
}

/**
 * Parses and validates one schema-v1 artifact. Every violation refuses with
 * the reason: an artifact that half-parses is worse than one that refuses,
 * because the generated module would carry the half.
 */
export const parseKernelArtifact = (source: string): KernelArtifact => {
  const lines = source.split("\n")
  if (lines.at(-1) !== "") refuse("the file does not end with a newline")
  const rows = lines.slice(0, -1)
  if (rows.length === 0) refuse("the file is empty")
  if (source.includes("\r")) refuse("the file carries a carriage return")
  for (const [index, line] of rows.entries()) {
    if (/[^ -~]/.test(line)) refuse(`line ${index + 1} is not printable ASCII`)
  }

  const header = parseHeader(object(JSON.parse(rows[0]!), "header"))
  if (header.format !== 1) refuse(`format is ${header.format}, want 1`)

  const kinds: Array<KernelKindRecord> = []
  const stages: Array<KernelStageRecord> = []
  const refusals: Array<KernelRefusalRecord> = []
  const types: Array<KernelTypeRecord> = []
  const encodings: Array<KernelEncodingRecord> = []
  const admissions: Array<KernelAdmissionRecord> = []

  // Record order is part of the schema, so the parser walks a fixed ladder
  // rather than sorting: a reordered artifact is a moved artifact.
  const ladder = ["kind", "stage", "refusal", "type", "encoding", "admission"] as const
  let rung = 0
  for (const [offset, line] of rows.slice(1).entries()) {
    const where = `line ${offset + 2}`
    const row = object(JSON.parse(line), where)
    const record = text(row.record, `${where}.record`)
    const at = ladder.indexOf(record as (typeof ladder)[number])
    if (at < 0) refuse(`${where} carries unknown record ${record}`)
    if (at < rung) refuse(`${where} is a ${record} record after a ${ladder[rung]!} record`)
    rung = at
    switch (record) {
      case "kind": {
        keysInOrder(row, ["record", "name", "rank"], where)
        kinds.push({ record: "kind", name: text(row.name, where), rank: nat(row.rank, where) })
        break
      }
      case "stage": {
        keysInOrder(row, ["record", "name", "rank"], where)
        stages.push({ record: "stage", name: text(row.name, where), rank: nat(row.rank, where) })
        break
      }
      case "refusal": {
        keysInOrder(row, ["record", "reason", "law", "repair", "applicability"], where)
        refusals.push({
          record: "refusal",
          reason: text(row.reason, `${where}.reason`),
          law: text(row.law, `${where}.law`),
          repair: text(row.repair, `${where}.repair`),
          applicability: oneOf(
            row.applicability,
            ["machine-applicable", "advisory"] as const,
            `${where}.applicability`,
          ),
        })
        break
      }
      case "type": {
        keysInOrder(row, ["record", "name", "form", "params", "constructors"], where)
        const params = row.params
        const constructors = row.constructors
        if (!Array.isArray(params)) refuse(`${where}.params is not an array`)
        if (!Array.isArray(constructors)) refuse(`${where}.constructors is not an array`)
        types.push({
          record: "type",
          name: text(row.name, `${where}.name`),
          form: oneOf(row.form, ["inductive", "structure"] as const, `${where}.form`),
          params: (params as ReadonlyArray<unknown>)
            .map((param, index) => parseParam(param, `${where}.params[${index}]`)),
          constructors: (constructors as ReadonlyArray<unknown>)
            .map((entry, index) => parseConstructor(entry, `${where}.constructors[${index}]`)),
        })
        break
      }
      case "encoding": {
        keysInOrder(row, ["record", "name", "act"], where)
        encodings.push({
          record: "encoding",
          name: text(row.name, `${where}.name`),
          act: natList(row.act, `${where}.act`),
        })
        break
      }
      default: {
        const verdict = oneOf(row.verdict, ["refused", "admitted"] as const, `${where}.verdict`)
        if (verdict === "refused") {
          keysInOrder(row, ["record", "name", "verdict", "reason"], where)
          admissions.push({
            record: "admission",
            name: text(row.name, `${where}.name`),
            verdict: "refused",
            reason: text(row.reason, `${where}.reason`),
          })
        } else {
          keysInOrder(row, ["record", "name", "verdict", "encoded"], where)
          admissions.push({
            record: "admission",
            name: text(row.name, `${where}.name`),
            verdict: "admitted",
            encoded: natList(row.encoded, `${where}.encoded`),
          })
        }
        break
      }
    }
  }

  const counted: ReadonlyArray<readonly [string, number]> = [
    ["kind", kinds.length],
    ["stage", stages.length],
    ["refusal", refusals.length],
    ["type", types.length],
    ["encoding", encodings.length],
    ["admission", admissions.length],
  ]
  for (const [name, actual] of counted) {
    const pinned = header.counts[name]
    if (pinned === undefined) refuse(`header pins no ${name} count`)
    if (pinned !== actual) refuse(`header pins ${pinned} ${name} records, file carries ${actual}`)
  }
  for (const [name, pinned] of Object.entries(header.counts)) {
    if (!counted.some(([record]) => record === name)) {
      refuse(`header pins a ${name} count (${pinned}) that names no record class`)
    }
  }

  kinds.forEach((kind, rank) => {
    if (kind.rank !== rank) refuse(`kind ${kind.name} has rank ${kind.rank} at position ${rank}`)
  })
  stages.forEach((stage, rank) => {
    if (stage.rank !== rank) refuse(`stage ${stage.name} has rank ${stage.rank} at position ${rank}`)
  })

  const reasons = new Set(refusals.map((refusal) => refusal.reason))
  if (reasons.size !== refusals.length) refuse("a refusal reason is spelled twice")
  admissions.forEach((admission, index) => {
    if (admission.verdict === "refused" && !reasons.has(admission.reason)) {
      refuse(`admission ${admission.name} names unknown reason ${admission.reason}`)
    }
    if (admission.verdict === "admitted" && index !== admissions.length - 1) {
      refuse(`admitted verdict ${admission.name} is not the last admission record`)
    }
  })
  if (admissions.at(-1)?.verdict !== "admitted") {
    refuse("the admission block does not end with an admitted verdict")
  }

  return { header, kinds, stages, refusals, types, encodings, admissions }
}

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

// A brand parameter named after a record class the artifact enumerates is
// constrained to that closed union, so a misspelled kind stops compiling. Every
// other brand domain is open (a register is a digest, a partition is a lane and
// a shard), and an open domain gets the widest honest constraint.
const brandDomains: { readonly [param: string]: string } = {
  kind: "KernelDeclKind",
  stage: "KernelHoleStage",
}

const brandConstraint = (param: string): string => brandDomains[param] ?? "string"

/**
 * Renders the generated module. The rendering is a total function of the
 * artifact and its repository-relative path, so two runs over one artifact
 * produce identical bytes.
 */
export const renderKernelTables = (
  artifact: KernelArtifact,
  artifactPath: string,
): string => {
  const { branded, skipped } = brandedSorts(artifact.types)
  const digests = branded.find((sort) => sort.name === "Digest")
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)

  line("/**")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Artifact: ${artifactPath}`)
  line(` * Command:  ${GENERATE_COMMAND}`)
  line(` * Source:   ${artifact.header.source}, emitted by ${quote(artifact.header.generator)}`)
  line(` *           at interchange format ${artifact.header.format}.`)
  line(" *")
  line(" * The kernel model's closed tables, projected into the runtime's type layer:")
  line(" * the declaration-kind and hole-stage registries with their ranks, the taught")
  line(" * refusals with the law each defends and the repair each teaches, and the")
  line(" * compile-time brands of the sort system.")
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
  line(`  artifact: ${quote(artifactPath)},`)
  line(`  command: ${quote(GENERATE_COMMAND)},`)
  line(`  format: ${artifact.header.format},`)
  line(`  generator: ${quote(artifact.header.generator)},`)
  line(`  source: ${quote(artifact.header.source)},`)
  line("} as const")
  line()

  line("/** The closed universe of declaration kinds, in rank order. */")
  line("export const KERNEL_DECL_KINDS = [")
  for (const kind of artifact.kinds) line(`  ${quote(kind.name)},`)
  line("] as const")
  line()
  line("/** One declaration kind of the closed universe. */")
  line("export type KernelDeclKind = (typeof KERNEL_DECL_KINDS)[number]")
  line()
  line("/** The numeric rank of each declaration kind. */")
  line("export const KERNEL_DECL_KIND_RANK = {")
  for (const kind of artifact.kinds) line(`  ${kind.name}: ${kind.rank},`)
  line("} as const satisfies { readonly [Kind in KernelDeclKind]: number }")
  line()

  line("/** The epistemic stages of a hole, in rising rank order. */")
  line("export const KERNEL_HOLE_STAGES = [")
  for (const stage of artifact.stages) line(`  ${quote(stage.name)},`)
  line("] as const")
  line()
  line("/** One epistemic stage of a hole. */")
  line("export type KernelHoleStage = (typeof KERNEL_HOLE_STAGES)[number]")
  line()
  line("/** The numeric rank of each hole stage. */")
  line("export const KERNEL_HOLE_STAGE_RANK = {")
  for (const stage of artifact.stages) line(`  ${stage.name}: ${stage.rank},`)
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
  for (const refusal of artifact.refusals) line(`  ${quote(refusal.reason)},`)
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
  for (const refusal of artifact.refusals) {
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
  artifact.refusals.forEach((refusal, index) => {
    line(`  ${quote(refusal.reason)}: KERNEL_REFUSALS[${index}],`)
  })
  line("} as const satisfies { readonly [Reason in KernelRefusalReason]: KernelRefusalRow }")
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
    for (const kind of artifact.kinds) {
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
 * The closed-vocabulary lines of an artifact: every record whose content is
 * the model's own closed table. The header is dropped because it counts the
 * encoding block, and encoding vectors are dropped because the schema fixes
 * only their floor (one per generator) and leaves the choice to the emitter.
 * Comparison is by raw line, which the compact-JSON-with-frozen-key-order
 * schema makes exact.
 */
export const closedTableLines = (source: string): ReadonlyArray<string> =>
  source
    .trimEnd()
    .split("\n")
    .filter((line) =>
      !line.startsWith("{\"record\":\"header\"") &&
      !line.startsWith("{\"record\":\"encoding\"")
    )

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelTables = (
  committed: string,
  artifact: KernelArtifact,
  artifactPath: string,
): KernelTableCheck =>
  committed === renderKernelTables(artifact, artifactPath)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed kernel tables failed byte-identical regeneration",
    }
