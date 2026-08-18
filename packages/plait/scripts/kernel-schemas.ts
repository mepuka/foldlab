/**
 * The kernel-conformance schema generator.
 *
 * Reads a format-2 `kernel-conformance.ndjson` and renders one Effect schema
 * per interchange record type and one per kernel mini-AST type, each carrying
 * the annotations a reader, an error message, and a JSON Schema export all
 * draw on. Nothing here is hand-typed from the model: every identifier, title,
 * description, and example is read out of the corpus, so a docstring edited in
 * the model reddens the regeneration check instead of rotting in a comment.
 *
 * Two halves, for two reasons.
 *
 * The **record schemas** are the grammar of the file, and the grammar cannot be
 * generated from the file it reads without circularity. So they live
 * hand-written in `KernelCorpusSchemas.ts` and this generator re-exports them
 * with the one thing the corpus does supply: `examples` taken from real
 * records. A description written by hand describes the *schema of the file*, a
 * thing the file cannot describe about itself.
 *
 * The **mini-AST schemas** are the model's own type vocabulary, and every part
 * of them is corpus data: the shape from a `type` record, the description from
 * a `doc` record, the title from that docstring's first sentence. None of it is
 * retyped.
 *
 * Brand arguments are dropped at this layer, deliberately. TypeScript erases,
 * so `Digest(program)` and `Digest(policy)` have the same runtime shape and one
 * schema describes both; the compile-time separation is generated next door in
 * `KernelTables.generated.ts`, where the branded aliases live. A runtime schema
 * that pretended to carry the brand would be claiming a check it cannot make.
 *
 * The generator makes no runtime claim. It projects the model's names, texts,
 * and shapes into schemas a runtime consumes; conformance to the model's
 * verdicts is checked by the door harness, not asserted here.
 *
 * @module
 */
import type {
  KernelConstructorRecord,
  KernelTypeRecord,
} from "../src/kernel/KernelCorpusSchemas.js"
import { encodeCanonicalJson, type CanonicalJson } from "../src/truth/CanonicalJson.js"
import { parseTypeReference, type KernelCorpus } from "./kernel-corpus.js"

/** The command a reader runs to reproduce the generated module. */
export const GENERATE_SCHEMAS_COMMAND = "bun run generate:kernel-schemas"

/** Where the generated module is committed, relative to the repository root. */
export const GENERATED_SCHEMAS_PATH = "packages/plait/src/kernel/KernelSchemas.generated.ts"

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelSchemaCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel-conformance schemas: ${reason}`)
}

/**
 * The first sentence of a docstring, which becomes the schema's `title`: text
 * up to the first sentence break or the first newline, whichever comes first.
 * The rule is mechanical so that a docstring edit moves the title with it.
 */
export const firstSentence = (doc: string): string => {
  const breaks = [doc.indexOf(". "), doc.indexOf("\n")].filter((at) => at >= 0)
  if (breaks.length === 0) return doc
  const at = Math.min(...breaks)
  return doc[at] === "." ? doc.slice(0, at + 1) : doc.slice(0, at)
}

const identifierLike = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const quote = (value: string): string => JSON.stringify(value)

const key = (name: string): string => identifierLike.test(name) ? name : quote(name)

/** The column the generated file wraps at. */
const WIDTH = 96

/**
 * Greedy word wrap: the text split at spaces into runs that fit the budget,
 * with each run's trailing space kept so that concatenating the runs
 * reproduces the text exactly. A word longer than the budget takes its own
 * line rather than being cut.
 */
const wrapWords = (text: string, budget: (run: string) => number): ReadonlyArray<string> => {
  const words = text.split(" ")
  const runs: Array<string> = []
  let current = ""
  for (const [index, word] of words.entries()) {
    const candidate = index === 0 ? word : `${current} ${word}`
    if (current !== "" && budget(candidate) > 0) {
      runs.push(`${current} `)
      current = word
    } else current = candidate
  }
  runs.push(current)
  return runs
}

/**
 * A string literal spread across source lines, so a long description reads as
 * a paragraph in the generated file instead of as one runaway line. The
 * concatenation is the original text, character for character.
 */
const stringExpression = (text: string, indent: string): string =>
  wrapWords(text, (run) => quote(run).length + indent.length - WIDTH)
    .map(quote)
    .join(`\n${indent}+ `)

/** One corpus value, as the TypeScript literal that denotes it. */
const literal = (value: CanonicalJson, indent: string): string => {
  if (value === null) return "null"
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false"
    case "string":
      return quote(value)
    case "bigint":
      return `${value.toString(10)}n`
    default: {
      const inner = `${indent}  `
      if (Array.isArray(value)) {
        if (value.length === 0) return "[]"
        const entries = value.map((entry) => literal(entry, inner))
        const flat = `[${entries.join(", ")}]`
        return flat.length + indent.length <= 96
          ? flat
          : `[\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${indent}]`
      }
      const source = value as { readonly [name: string]: CanonicalJson }
      const names = Object.keys(source).sort()
      if (names.length === 0) return "{}"
      const members = names.map((name) => `${key(name)}: ${literal(source[name]!, inner)}`)
      const flat = `{ ${members.join(", ")} }`
      return flat.length + indent.length <= 96
        ? flat
        : `{\n${members.map((member) => `${inner}${member},`).join(",\n").replaceAll(",,", ",")}\n${indent}}`
    }
  }
}

/** A record group's schema, and the corpus records that exemplify it. */
interface RecordBinding {
  /** The name the grammar module exports, and the generated module re-exports. */
  readonly name: string
  /** What the schema is for, in one line, for the generated doc comment. */
  readonly gloss: string
  /** The exemplifying records, already canonical values. */
  readonly examples: ReadonlyArray<CanonicalJson>
}

const asValue = (record: unknown): CanonicalJson => record as CanonicalJson

/**
 * Chooses which corpus records exemplify which record schema. One example per
 * shape, except where the whole set *is* the reference - the twelve encoding
 * vectors and the ten canonical-form vectors are named, closed sets, and a
 * reader who sees three of them has to go looking for the rest.
 */
const recordBindings = (corpus: KernelCorpus): ReadonlyArray<RecordBinding> => {
  const first = <A>(rows: ReadonlyArray<A>, group: string): ReadonlyArray<CanonicalJson> =>
    rows.length === 0 ? refuse(`the corpus carries no ${group} record`) : [asValue(rows[0])]
  const refused = corpus.admissions.filter((row) => row.verdict === "refused")
  const admitted = corpus.admissions.filter((row) => row.verdict === "admitted")
  return [
    {
      name: "KernelHeaderRecord",
      gloss: "The provenance line, with the counts it pins",
      examples: [asValue(corpus.header)],
    },
    {
      name: "KernelKindRecord",
      gloss: "One declaration kind of the closed universe",
      examples: first(corpus.kinds, "kind"),
    },
    {
      name: "KernelStageRecord",
      gloss: "One epistemic stage of a hole",
      examples: first(corpus.stages, "stage"),
    },
    {
      name: "KernelRefusalRecord",
      gloss: "One taught refusal: the law it defends, the repair it teaches",
      examples: first(corpus.refusals, "refusal"),
    },
    {
      name: "KernelTypeRecord",
      gloss: "One type of the model's emitted vocabulary",
      examples: first(corpus.types, "type"),
    },
    {
      name: "KernelEncodingRecord",
      gloss: "One sentence in its canonical framing",
      examples: corpus.encodings.map(asValue),
    },
    {
      name: "KernelAdmissionRefusedRecord",
      gloss: "A planted candidate the door refused",
      examples: first(refused, "refused admission"),
    },
    {
      name: "KernelAdmissionAdmittedRecord",
      gloss: "The lawful twin the door admitted",
      examples: first(admitted, "admitted admission"),
    },
    {
      name: "KernelDocRecord",
      gloss: "One type's docstring, read out of the model's environment",
      examples: first(corpus.docs, "doc"),
    },
    {
      name: "KernelCanonRecord",
      gloss: "One canonical-form vector: a value and the bytes it must produce",
      examples: corpus.canons.map(asValue),
    },
    // The ninth group arrived under the add-only rule, so a corpus emitted
    // before it exists is still a corpus this generator can read. One example
    // rather than all of them: a program declaration is large, and the whole
    // set is not a closed reference the way the canon vectors are.
    ...(corpus.programs.length === 0
      ? []
      : [
        {
          name: "KernelProgramRecord",
          gloss: "One program declaration and the bytes that are its identity",
          examples: first(corpus.programs, "program"),
        },
      ]),
  ]
}

/** A mini-AST type reference resolved into the two expressions a schema needs. */
interface Resolution {
  /** The schema expression, e.g. `Schema.Array(KernelRawArg)`. */
  readonly schema: string
  /** The TypeScript value type, e.g. `ReadonlyArray<typeof KernelRawArg.Type>`. */
  readonly type: string
}

/** What the resolver needs to know about the closed type list as a whole. */
interface TypeContext {
  /** Declaration index of each closed-list type name. */
  readonly order: ReadonlyMap<string, number>
  /** Types that are referenced before they are declared, so need a value type alias. */
  readonly suspended: ReadonlySet<string>
  /** Whether the corpus uses the `Ref` leaf anywhere. */
  readonly usesRef: boolean
}

const schemaName = (type: string): string => `Kernel${type}`

const valueTypeName = (type: string): string => `Kernel${type}Value`

const referenceOf = (context: TypeContext, name: string): Resolution => ({
  schema: schemaName(name),
  type: context.suspended.has(name)
    ? valueTypeName(name)
    : `typeof ${schemaName(name)}.Type`,
})

/**
 * Resolves one field's type reference into a schema expression and a value
 * type. A reference to a type not yet declared - the model's one recursion,
 * `CandidatePredicate` inside its own negation - becomes a suspended schema,
 * which is the only place the walk needs a thunk.
 */
const resolve = (
  reference: string,
  context: TypeContext,
  at: number,
  where: string,
): Resolution => {
  const parsed = parseTypeReference(reference, where)
  switch (parsed.name) {
    case "Nat":
      return { schema: "KernelNat", type: "bigint" }
    case "String":
      return { schema: "Schema.String", type: "string" }
    case "Ref":
      return { schema: "KernelRef", type: "typeof KernelRef.Type" }
    case "List":
    case "Option": {
      const argument = parsed.args[0]
      if (parsed.args.length !== 1 || argument === undefined) {
        return refuse(`${where}: ${parsed.name} takes one argument`)
      }
      const inner = resolve(argument, context, at, where)
      return parsed.name === "List"
        ? { schema: `Schema.Array(${inner.schema})`, type: `ReadonlyArray<${inner.type}>` }
        : {
          schema: `Schema.UndefinedOr(${inner.schema})`,
          type: `${inner.type} | undefined`,
        }
    }
    default: {
      const declared = context.order.get(parsed.name)
      if (declared === undefined) {
        return refuse(`${where}: ${parsed.name} is neither a leaf nor a declared type`)
      }
      const target = referenceOf(context, parsed.name)
      return declared > at
        ? refuse(`${where}: ${parsed.name} is declared after ${where.split(".")[0]}`)
        : declared === at
        ? {
          schema: `Schema.suspend((): Schema.Codec<${target.type}> => ${target.schema})`,
          type: target.type,
        }
        : target
    }
  }
}

const fieldsOf = (
  constructor: KernelConstructorRecord,
  type: KernelTypeRecord,
  context: TypeContext,
  at: number,
): ReadonlyArray<{ readonly name: string; readonly resolved: Resolution }> =>
  constructor.fields.map((field) => ({
    name: field.name,
    resolved: resolve(
      field.type,
      context,
      at,
      `${type.name}.${constructor.name}.${field.name}`,
    ),
  }))

const structExpression = (
  members: ReadonlyArray<readonly [string, string]>,
  indent: string,
  prefix = 0,
): string => {
  if (members.length === 0) return "Schema.Struct({})"
  const flat = `Schema.Struct({ ${members.map(([name, value]) => `${name}: ${value}`).join(", ")} })`
  if (flat.length + indent.length + prefix <= WIDTH) return flat
  const inner = `${indent}  `
  return `Schema.Struct({\n${
    members.map(([name, value]) => `${inner}${name}: ${value},`).join("\n")
  }\n${indent}})`
}

/**
 * One constructor of a sum type. `TaggedStruct` rather than a `Struct` with a
 * literal `_tag` member: the two build the same tree, and the estate's own
 * language service asks for this spelling, so the generated file should not be
 * the one place that ignores it.
 */
const taggedStructExpression = (
  tag: string,
  members: ReadonlyArray<readonly [string, string]>,
  indent: string,
): string => {
  const head = `Schema.TaggedStruct(${quote(tag)}, {`
  if (members.length === 0) return `${head}})`
  const flat = `${head} ${members.map(([name, value]) => `${name}: ${value}`).join(", ")} })`
  if (flat.length + indent.length <= WIDTH) return flat
  const inner = `${indent}  `
  return `${head}\n${
    members.map(([name, value]) => `${inner}${name}: ${value},`).join("\n")
  }\n${indent}})`
}

const objectTypeExpression = (
  members: ReadonlyArray<readonly [string, string]>,
  indent: string,
): string => {
  if (members.length === 0) return "{}"
  const written = members.map(([name, value]) => `readonly ${name}: ${value}`)
  const flat = `{ ${written.join("; ")} }`
  if (flat.length + indent.length <= WIDTH) return flat
  const inner = `${indent}  `
  return `{\n${written.map((member) => `${inner}${member}`).join("\n")}\n${indent}}`
}

/** One rendered mini-AST type: its schema expression and its value type. */
interface RenderedType {
  readonly schema: string
  readonly type: string
}

const renderType = (
  type: KernelTypeRecord,
  context: TypeContext,
  at: number,
  prefix: number,
): RenderedType => {
  if (type.form === "structure") {
    const constructor = type.constructors[0]
    if (type.constructors.length !== 1 || constructor === undefined) {
      return refuse(`structure ${type.name} carries ${type.constructors.length} constructors`)
    }
    const fields = fieldsOf(constructor, type, context, at)
    return {
      schema: structExpression(
        fields.map((field) => [key(field.name), field.resolved.schema] as const),
        "",
        prefix,
      ),
      type: objectTypeExpression(
        fields.map((field) => [field.name, field.resolved.type] as const),
        "",
      ),
    }
  }
  // A sum whose constructors are all nullary is a closed set of names, so it
  // becomes a literal union rather than a union of empty tagged objects: the
  // wire never carries anything else, and the literal union is what a caller
  // can switch on exhaustively.
  const nullary = type.constructors.every((constructor) => constructor.fields.length === 0)
  if (nullary) {
    const names = type.constructors.map((constructor) => quote(constructor.name))
    const flat = `Schema.Literals([${names.join(", ")}])`
    return {
      schema: flat.length + prefix <= WIDTH
        ? flat
        : `Schema.Literals([\n${names.map((name) => `  ${name},`).join("\n")}\n])`,
      type: names.length === 1 ? names[0]! : names.map((name) => `\n  | ${name}`).join(""),
    }
  }
  const members = type.constructors.map((constructor) => {
    const fields = fieldsOf(constructor, type, context, at)
    return {
      schema: taggedStructExpression(
        constructor.name,
        fields.map((field) => [key(field.name), field.resolved.schema] as const),
        "  ",
      ),
      type: objectTypeExpression(
        [
          ["_tag", quote(constructor.name)] as const,
          ...fields.map((field) => [field.name, field.resolved.type] as const),
        ],
        "  ",
      ),
    }
  })
  return {
    schema: `Schema.Union([\n${members.map((member) => `  ${member.schema},`).join("\n")}\n])`,
    type: members.map((member) => `\n  | ${member.type}`).join(""),
  }
}

/**
 * The declaration order of the closed type list, plus the one fact the
 * renderer cannot read off a single record: which types are referenced at or
 * before their own declaration and therefore need a value type alias the
 * suspended schema can be annotated with.
 */
const typeContext = (types: ReadonlyArray<KernelTypeRecord>): TypeContext => {
  const order = new Map(types.map((type, at) => [type.name, at] as const))
  const suspended = new Set<string>()
  let usesRef = false
  types.forEach((type, at) => {
    for (const constructor of type.constructors) {
      for (const field of constructor.fields) {
        const parsed = parseTypeReference(field.type, `${type.name}.${field.name}`)
        const heads = parsed.name === "List" || parsed.name === "Option"
          ? [parseTypeReference(parsed.args[0] ?? "", `${type.name}.${field.name}`).name]
          : [parsed.name]
        for (const head of heads) {
          if (head === "Ref") usesRef = true
          const declared = order.get(head)
          if (declared !== undefined && declared >= at) suspended.add(head)
        }
      }
    }
  })
  return { order, suspended, usesRef }
}

/**
 * A doc comment carrying the model's own text. The model's line breaks are
 * kept - a docstring is prose the model author laid out - and any line still
 * too wide for the file is wrapped at a word boundary rather than left to run.
 */
const docComment = (text: string, indent = ""): ReadonlyArray<string> => {
  const safe = text.replaceAll("*/", "*\\/")
  if (!safe.includes("\n") && `${indent}/** ${safe} */`.length <= WIDTH) {
    return [`${indent}/** ${safe} */`]
  }
  const body = safe
    .split("\n")
    .flatMap((paragraph) =>
      wrapWords(paragraph, (run) => run.length + indent.length + 3 - WIDTH)
        .map((run) => `${indent} * ${run}`.trimEnd())
    )
  return [`${indent}/**`, ...body, `${indent} */`]
}

/**
 * Renders the generated module. The rendering is a total function of the
 * corpus and its repository-relative path, so two runs over one corpus produce
 * identical bytes.
 */
export const renderKernelSchemas = (corpus: KernelCorpus, corpusPath: string): string => {
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)
  const context = typeContext(corpus.types)
  const docs = new Map(corpus.docs.map((doc) => [doc.name, doc.doc] as const))

  line("/**")
  line(" * Plane: kernel — the language: corpus, door, programs, and wire grammar.")
  line(" *")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Corpus:  ${corpusPath}`)
  line(` * Command: ${GENERATE_SCHEMAS_COMMAND}`)
  line(` * Source:  ${corpus.header.source}, emitted by ${quote(corpus.header.generator)}`)
  line(`  *          at interchange format ${corpus.header.format}.`.slice(1))
  line(" *")
  line(" * The interchange as schemas, in two halves.")
  line(" *")
  line(" * The record schemas re-export the hand-written grammar of the file with the")
  line(" * examples the corpus supplies. The grammar itself cannot be generated from")
  line(" * the file it reads, so it stays hand-written next door; what is generated is")
  line(" * every example, taken from a real record rather than invented.")
  line(" *")
  line(" * The mini-AST schemas are the model's own type vocabulary. Their shape comes")
  line(" * from the type records, their description from the docstring the model")
  line(" * carries, their title from that docstring's first sentence. A sentence")
  line(" * written once in the model reaches an agent's tool description with no human")
  line(" * in the path, and a drifted description is a failing check rather than a")
  line(" * rotting comment.")
  line(" *")
  line(" * Numbers are bigint everywhere. The interchange's integers are unbounded and")
  line(" * an encoded sentence already exceeds what a JavaScript number holds exactly.")
  line(" *")
  line(" * Brand arguments are dropped here. TypeScript erases, so one schema describes")
  line(" * every brand of a shape; the compile-time separation is generated into")
  line(" * KernelTables.generated.ts, where the branded aliases live.")
  line(" *")
  line(" * These are safety-side shapes and texts, never runtime guarantees. A model")
  line(" * theorem stays in the model.")
  line(" *")
  line(" * @module")
  line(" */")
  line("import { Schema } from \"effect\"")
  line()
  line("import * as Grammar from \"./KernelCorpusSchemas.js\"")
  line("import { KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS } from \"./KernelTables.generated.js\"")
  line()
  line("/** Where these schemas came from, carried as data for a consumer to assert. */")
  line("export const KERNEL_SCHEMA_PROVENANCE = {")
  line(`  command: ${quote(GENERATE_SCHEMAS_COMMAND)},`)
  line(`  corpus: ${quote(corpusPath)},`)
  line(`  format: ${corpus.header.format.toString(10)}n,`)
  line(`  generator: ${quote(corpus.header.generator)},`)
  line(`  source: ${quote(corpus.header.source)},`)
  line("} as const")
  line()
  line("/**")
  line(" * An unbounded non-negative integer, the interchange's one numeric shape.")
  line(" * Re-exported so a generated schema and the grammar it extends cannot drift")
  line(" * onto two different carriers.")
  line(" */")
  line("export const KernelNat = Grammar.KernelNat")
  line()
  line("/**")
  line(" * The annotation key carrying each schema's examples as canonical byte")
  line(" * strings, beside the `examples` key carrying them as values.")
  line(" *")
  line(" * It exists because of a measured gap. A JSON Schema export describes the")
  line(" * encoded view, JSON has no unbounded integer, and Effect drops the whole")
  line(" * `examples` key - silently, not partially - when any example holds a")
  line(" * bigint. Nearly every record here holds one, so the examples that matter")
  line(" * most would never reach a reader of the export. The canonical bytes are")
  line(" * strings, they survive the export, and they are the exact bytes the")
  line(" * interchange carries, so nothing is approximated to make them fit.")
  line(" *")
  line(" * Read them with:")
  line(" * `Schema.toJsonSchemaDocument(schema, { includeAnnotationKey: (key) =>`")
  line(" * `key === KERNEL_CANONICAL_EXAMPLES_KEY })`.")
  line(" */")
  line("export const KERNEL_CANONICAL_EXAMPLES_KEY = \"canonicalExamples\"")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The interchange records, annotated with the corpus's own examples.")
  line("// ---------------------------------------------------------------------------")
  line()
  const exampleAnnotations = (examples: ReadonlyArray<CanonicalJson>): void => {
    line("  canonicalExamples: [")
    for (const example of examples) line(`    ${quote(encodeCanonicalJson(example))},`)
    line("  ],")
    line("  examples: [")
    for (const example of examples) line(`    ${literal(example, "    ")},`)
    line("  ],")
  }

  const bindings = recordBindings(corpus)
  for (const binding of bindings) {
    for (const row of docComment(`${binding.gloss}. Examples are real records from the corpus.`)) {
      line(row)
    }
    line(`export const ${binding.name} = Grammar.${binding.name}.annotate({`)
    exampleAnnotations(binding.examples)
    line("})")
    line()
  }
  line("/** One admission verdict, refused or admitted, with both shapes exemplified. */")
  line("export const KernelAdmissionRecord = Schema.Union([")
  line("  KernelAdmissionRefusedRecord,")
  line("  KernelAdmissionAdmittedRecord,")
  line("]).annotate({")
  line("  identifier: \"KernelAdmissionRecord\",")
  line("  title: \"Admission record\",")
  line("  description: \"One door verdict for one planted candidate. The verdict selects the shape.\",")
  exampleAnnotations(
    bindings
      .filter((binding) => binding.name.startsWith("KernelAdmission"))
      .flatMap((binding) => binding.examples),
  )
  line("})")
  line()
  line("/** Every interchange record schema, keyed by its record group. */")
  line("export const KERNEL_RECORD_SCHEMA = {")
  line("  kind: KernelKindRecord,")
  line("  stage: KernelStageRecord,")
  line("  refusal: KernelRefusalRecord,")
  line("  type: KernelTypeRecord,")
  line("  encoding: KernelEncodingRecord,")
  line("  admission: KernelAdmissionRecord,")
  line("  doc: KernelDocRecord,")
  line("  canon: KernelCanonRecord,")
  if (corpus.programs.length > 0) line("  program: KernelProgramRecord,")
  line("} as const")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The model's type vocabulary. Shapes from the type records, prose from the")
  line("// doc records; the closed list, in the model's declaration order.")
  line("// ---------------------------------------------------------------------------")
  line()
  const declarationOf = (name: string): string =>
    context.suspended.has(name)
      ? `export const ${schemaName(name)}: Schema.Codec<${valueTypeName(name)}> =`
      : `export const ${schemaName(name)} =`
  const rendered = corpus.types.map((type, at) => ({
    type,
    at,
    // The declaration prefix and the `.annotate({` that follows both share the
    // line with the schema expression, so both count against its width budget.
    body: renderType(type, context, at, declarationOf(type.name).length + 1 + ".annotate({".length),
  }))

  for (const entry of rendered) {
    if (!context.suspended.has(entry.type.name)) continue
    for (
      const row of docComment(
        `The value ${entry.type.name} carries. Written out because ${entry.type.name} refers to` +
          " itself, and a suspended schema needs a type to be annotated with.",
      )
    ) line(row)
    line(`export type ${valueTypeName(entry.type.name)} =${entry.body.type}`)
    line()
  }

  const declKind = rendered.find((entry) => entry.type.name === "DeclKind")
  for (const entry of rendered) {
    const doc = docs.get(entry.type.name)
    const parameters = entry.type.params.map((param) => param.name)
    const brands = parameters.length === 0
      ? ""
      : `Branded in the model by ${parameters.join(" and ")}; the brand is erased here and` +
        " carried by the generated aliases instead."
    // The docstring goes in verbatim, whatever edge whitespace the model's
    // environment hands over, and the derived sentence is joined without
    // adding a second space to whatever the docstring already ended with.
    const separator = doc === undefined || doc.endsWith(" ") || brands === "" ? "" : " "
    const description = `${doc ?? ""}${separator}${brands}`
    if (doc !== undefined) for (const row of docComment(doc)) line(row)
    line(`${declarationOf(entry.type.name)} ${entry.body.schema}.annotate({`)
    line(`  identifier: ${quote(schemaName(entry.type.name))},`)
    if (doc !== undefined) line(`  title: ${quote(firstSentence(doc))},`)
    if (description !== "") {
      line("  description:")
      line(`    ${stringExpression(description, "    ")},`)
    }
    line("})")
    line()
    if (context.usesRef && declKind !== undefined && entry.type.name === declKind.type.name) {
      line("/**")
      line(" * A kind-tagged reference: the one lawful way a heterogeneous collection of")
      line(" * digests is carried. The model spells it as an abbreviation rather than a")
      line(" * declaration, so it has no type record of its own and is expanded here.")
      line(" */")
      line("export const KernelRef = Schema.Struct({")
      line("  id: KernelNat,")
      line("  kind: KernelDeclKind,")
      line("}).annotate({")
      line("  identifier: \"KernelRef\",")
      line("  title: \"A kind-tagged reference.\",")
      line("  description:")
      line(
        `    ${
          stringExpression(
            "The pair of a declaration kind and an identifier. It appears wherever a" +
              " collection holds digests of several kinds at once, so that the kind travels" +
              " with the identifier instead of being inferred from context.",
            "    ",
          )
        },`,
      )
      line("})")
      line()
    }
  }

  line("/**")
  line(" * The existing structural-refusal kinds the runtime may mint. The literals")
  line(" * come from the generated kernel table; missing model rows carry DEV-804")
  line(" * waivers there rather than becoming a second schema vocabulary here.")
  line(" */")
  line("export const KernelRuntimeStructuralRefusalKind = Schema.Literals(")
  line("  KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS,")
  line(").annotate({")
  line("  identifier: \"KernelRuntimeStructuralRefusalKind\",")
  line("  title: \"The structural refusal kinds the runtime may mint.\",")
  line("})")
  line()

  line("/** Every mini-AST schema, keyed by the model's short name for the type. */")
  line("export const KERNEL_TYPE_SCHEMA = {")
  for (const entry of rendered) line(`  ${key(entry.type.name)}: ${schemaName(entry.type.name)},`)
  line("} as const")
  line()
  line("/**")
  line(" * A sentence in its canonical framing: the generator tag, then that")
  line(" * generator's arguments. The examples are the model's own vectors, so an")
  line(" * example can never drift from what the door admits.")
  line(" *")
  line(" * This, and not the act schema, is what the encoding vectors exemplify: a")
  line(" * vector is the encoding of an act, not an act.")
  line(" */")
  line("export const KernelActEncoding = Schema.Array(KernelNat).annotate({")
  line("  identifier: \"KernelActEncoding\",")
  line("  title: \"An encoded sentence.\",")
  line("  description:")
  line(
    `    ${
      stringExpression(
        "The output of the model's encoder as an array of unbounded integers. Element" +
          " zero is the generator tag and the arity is fixed per tag, so a decoder can" +
          " dispatch on length and tag alone.",
        "    ",
      )
    },`,
  )
  exampleAnnotations(corpus.encodings.map((encoding) => asValue(encoding.act)))
  line("})")

  return out.join("\n")
}

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelSchemas = (
  committed: string,
  corpus: KernelCorpus,
  corpusPath: string,
): KernelSchemaCheck =>
  committed === renderKernelSchemas(corpus, corpusPath)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed kernel schemas failed byte-identical regeneration",
    }
