/**
 * The kernel builder-surface generator.
 *
 * The eight `$` constructors an author writes a program with are not typed by
 * hand. Their names, their argument names, the order those arguments stand in,
 * and the sort each one accepts are read out of the `Act` record of the
 * interchange's mini-AST, and the prose on them is read out of the `doc`
 * records. A signature this generator could have produced but a human typed
 * instead is a fork of the model, so the wall that guards it is a byte diff
 * between the committed surface and a fresh rendering.
 *
 * What the generator decides, and what it only transcribes:
 *
 * - **Transcribed.** Generator names, field names, field order, and each
 *   field's model type reference. All of it is `Act`'s own declaration.
 * - **Decided, mechanically and in one place.** How a model type reference
 *   becomes an accepted argument shape - the four forms of {@link fieldForm}.
 *   That mapping is the only judgement in the file, it is total over the
 *   references `Act` uses, and it refuses a reference it has no rule for
 *   rather than defaulting.
 *
 * The argument-reference grammar itself (digest, local, literal) is the
 * freeze's, not the corpus's, so it is rendered from a fixed template here and
 * lives beside the transcription rather than being smuggled in as data.
 *
 * Nothing generated here runs anything. The surface builds a declaration and
 * its identity; declaring is a separate act the caller must choose.
 *
 * @module
 */
import type { KernelTypeRecord } from "../src/kernel/KernelCorpusSchemas.js"
import { generatorFields, parseTypeReference, type KernelCorpus } from "./kernel-corpus.js"

/** The command a reader runs to reproduce the generated module. */
export const GENERATE_BUILDER_COMMAND = "bun run generate:kernel-builder"

/** Where the generated module is committed, relative to the repository root. */
export const GENERATED_BUILDER_PATH = "packages/plait/src/kernel/KernelBuilder.generated.ts"

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelBuilderCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel builder surface: ${reason}`)
}

const quote = (value: string): string => JSON.stringify(value)

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

/** The column the generated file wraps at. */
const WIDTH = 96

/**
 * How one field of a generator meets the declaration form.
 *
 * - `kind` — the field *is* a declaration kind. The surface takes the kind
 *   name, because it is what brands the handle the constructor hands back, and
 *   the declaration carries no reference for it: a kind is a tag, not a thing
 *   an argument reference can point at.
 * - `digest` — the grammar pins the brand at the declaration site, so only a
 *   digest of that kind, or a handle producing one, is accepted.
 * - `digestOf` — the grammar binds the brand to an earlier field of the same
 *   constructor, so the accepted brand is whatever the caller passed there.
 * - `value` — an arbitrary model value: any reference at all, a hole included.
 * - `absent` — a model structure the argument grammar has no form for: a
 *   token, a lane partition, an anchor fact, a trigger predicate. The field
 *   exists in the sentence and the *declaration* does not carry it, so the
 *   surface does not offer it rather than accepting something that would
 *   silently vanish.
 */
export type KernelFieldForm =
  | { readonly form: "kind" }
  | { readonly form: "digest"; readonly kind: string }
  | { readonly form: "digestOf"; readonly field: string }
  | { readonly form: "value" }
  | { readonly form: "absent" }

/** One field of one generator, as the surface and the emitter both read it. */
export interface KernelBuilderField {
  readonly name: string
  /** The model's own type reference, verbatim from the mini-AST. */
  readonly model: string
  readonly form: KernelFieldForm
}

/** One generator's surface: its name and its fields in declaration order. */
export interface KernelBuilderGenerator {
  readonly name: string
  readonly fields: ReadonlyArray<KernelBuilderField>
  /** The kind field whose value brands the handle, when the constructor has one. */
  readonly kindField: string | undefined
}

/**
 * The one judgement in this generator: a model type reference becomes an
 * accepted argument shape. Total over what `Act` uses today and refusing
 * anything else, so a new field type stops the build here rather than
 * arriving as a silently-widened argument.
 */
export const fieldForm = (
  model: string,
  bound: ReadonlySet<string>,
  kinds: ReadonlySet<string>,
  where: string,
): KernelFieldForm => {
  const parsed = parseTypeReference(model, where)
  if (parsed.name === "DeclKind") return { form: "kind" }
  if (parsed.name === "Value") return { form: "value" }
  if (parsed.name === "Digest") {
    const argument = parsed.args[0]
    if (parsed.args.length !== 1 || argument === undefined) {
      return refuse(`${where}: Digest takes one brand argument, got ${parsed.args.length}`)
    }
    if (kinds.has(argument)) return { form: "digest", kind: argument }
    if (bound.has(argument)) return { form: "digestOf", field: argument }
    return refuse(`${where}: brand argument ${argument} names no kind and no earlier field`)
  }
  if (parsed.args.length === 0 || parsed.args.every((argument) => bound.has(argument))) {
    return { form: "absent" }
  }
  return refuse(`${where}: no argument rule for the model reference ${model}`)
}

/** Reads the eight generators off the `Act` record, in declaration order. */
export const builderGenerators = (
  corpus: KernelCorpus,
): ReadonlyArray<KernelBuilderGenerator> => {
  const act = corpus.types.find((type: KernelTypeRecord) => type.name === "Act")
  if (act === undefined) refuse("the corpus declares no Act type")
  const kinds = new Set(corpus.kinds.map((kind) => kind.name))
  return act.constructors.map((constructor) => {
    const bound = new Set<string>()
    let kindField: string | undefined
    const fields = constructor.fields.map((field) => {
      const where = `Act.${constructor.name}.${field.name}`
      const form = fieldForm(field.type, bound, kinds, where)
      bound.add(field.name)
      if (form.form === "kind") {
        if (kindField !== undefined) {
          refuse(`${where}: a second declaration-kind field; the handle's brand would be ambiguous`)
        }
        kindField = field.name
      }
      return { name: field.name, model: field.type, form }
    })
    return { name: constructor.name, fields, kindField }
  })
}

/**
 * Greedy word wrap, keeping each run's trailing space so that concatenating
 * the runs reproduces the text exactly.
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
 * A doc comment carrying a model text. The model's line breaks are kept, and
 * a line still too wide is wrapped at a word boundary. Trailing spaces go:
 * the model's environment returns one, and a byte-gated file must not carry a
 * character an editor's save would remove.
 */
const docComment = (text: string, indent = ""): ReadonlyArray<string> => {
  const safe = text.replaceAll("*/", "*\\/")
  if (!safe.includes("\n") && `${indent}/** ${safe.trimEnd()} */`.length <= WIDTH) {
    return [`${indent}/** ${safe.trimEnd()} */`]
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
 * The member one field contributes to its generator's argument record, or
 * nothing at all when the declaration form carries no reference for it.
 *
 * The kind field is required and every wired field is optional. That is not a
 * convenience: a node may leave a slot unwired, and the emitted vectors do -
 * the ground program's declare wires nothing at all. An optional member is the
 * honest spelling of a slot the declaration can leave empty, and it is
 * different from a hole, which is a slot the declaration names.
 */
const argumentMember = (
  field: KernelBuilderField,
  kindField: string | undefined,
): { readonly optional: boolean; readonly type: string } | undefined => {
  switch (field.form.form) {
    case "kind":
      return { optional: false, type: capitalize(field.name) }
    case "digest":
      return { optional: true, type: `KernelDigestArg<${quote(field.form.kind)}>` }
    case "digestOf":
      return field.form.field === kindField
        ? { optional: true, type: `KernelDigestArg<${capitalize(field.form.field)}>` }
        : refuse(
          `Act argument ${field.name} brands on ${field.form.field}, which is not a kind field`,
        )
    case "value":
      return { optional: true, type: "KernelValueArg" }
    case "absent":
      return undefined
  }
}

const formLiteral = (form: KernelFieldForm): string => {
  switch (form.form) {
    case "digest":
      return `{ form: "digest", kind: ${quote(form.kind)} }`
    case "digestOf":
      return `{ form: "digestOf", field: ${quote(form.field)} }`
    default:
      return `{ form: ${quote(form.form)} }`
  }
}

const argsInterfaceName = (generator: string): string =>
  `Kernel${capitalize(generator)}Args`

/**
 * Renders the generated module. The rendering is a total function of the
 * corpus and its repository-relative path, so two runs over one corpus produce
 * identical bytes.
 */
export const renderKernelBuilder = (corpus: KernelCorpus, corpusPath: string): string => {
  const generators = builderGenerators(corpus)
  const docs = new Map(corpus.docs.map((doc) => [doc.name, doc.doc] as const))
  const out: Array<string> = []
  const line = (value = ""): void => void out.push(value)

  // The reader's own generator table and this one are read off the same record;
  // if they ever disagreed, one of them stopped transcribing.
  const reader = generatorFields(corpus.types)
  for (const generator of generators) {
    const declared = reader.get(generator.name)
    if (declared === undefined || declared.join(",") !== generator.fields.map((f) => f.name).join(",")) {
      refuse(`generator ${generator.name} reads differently in the corpus reader and here`)
    }
  }

  line("/**")
  line(" * Plane: kernel — the language: corpus, door, programs, and wire grammar.")
  line(" *")
  line(" * GENERATED FILE - DO NOT EDIT.")
  line(" *")
  line(` * Corpus:  ${corpusPath}`)
  line(` * Command: ${GENERATE_BUILDER_COMMAND}`)
  line(` * Source:  ${corpus.header.source}, emitted by ${quote(corpus.header.generator)}`)
  line(`  *          at interchange format ${corpus.header.format}.`.slice(1))
  line(" *")
  line(" * The program builder's surface: one constructor per kernel generator, with")
  line(" * the generator's own field names, in the generator's own declaration order,")
  line(" * accepting the sorts the generator's own grammar names. Every one of those")
  line(" * facts is read out of the Act record of the model's mini-AST, and the prose")
  line(" * below each field is the docstring the model attaches to that field's type.")
  line(" *")
  line(" * Two things this file is not.")
  line(" *")
  line(" * It is not an executor. A constructor here contributes a node to a")
  line(" * declaration; nothing in this module runs, schedules, retries, or replays,")
  line(" * and no constructor takes a clock, a seed, a secret, or a function value -")
  line(" * not because they are checked away, but because the grammar names no field")
  line(" * for them and this file is that grammar's transcription.")
  line(" *")
  line(" * It is not a runtime check of the brands it carries. TypeScript erases, so")
  line(" * a brand here separates two sorts at compile time and nothing more. The")
  line(" * emitter's own consistency law, checked over every committed vector, is")
  line(" * what stands behind the values.")
  line(" *")
  line(" * @module")
  line(" */")
  line("import type { KernelDeclKind } from \"./KernelTables.generated.js\"")
  line()

  line("/** Where this surface came from, carried as data for a consumer to assert. */")
  line("export const KERNEL_BUILDER_PROVENANCE = {")
  line(`  command: ${quote(GENERATE_BUILDER_COMMAND)},`)
  line(`  corpus: ${quote(corpusPath)},`)
  line(`  format: ${corpus.header.format.toString(10)}n,`)
  line(`  generator: ${quote(corpus.header.generator)},`)
  line(`  source: ${quote(corpus.header.source)},`)
  line("} as const")
  line()

  line("/** The generator vocabulary, in the model's own declaration order. */")
  line("export const KERNEL_GENERATORS = [")
  for (const generator of generators) line(`  ${quote(generator.name)},`)
  line("] as const")
  line()
  line("/** One kernel generator. */")
  line("export type KernelGenerator = (typeof KERNEL_GENERATORS)[number]")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The argument-reference grammar. Three forms and no fourth: a reference to")
  line("// something outside the declaration is a digest, a reference to something")
  line("// inside it is a local name, and a bare identity label is a literal. There is")
  line("// no closure form, because a function value has no canonical bytes and so no")
  line("// identity to reference it by.")
  line("// ---------------------------------------------------------------------------")
  line()
  line("/** A reference to a declaration outside this one, branded by its kind. */")
  line("export interface KernelDigestRef<Kind extends KernelDeclKind> {")
  line("  readonly arg: \"digest\"")
  line("  readonly kind: Kind")
  line("  readonly id: bigint")
  line("}")
  line()
  line("/** A bare identity label. */")
  line("export interface KernelLiteralArg {")
  line("  readonly arg: \"literal\"")
  line("  readonly value: bigint")
  line("}")
  line()
  line("/**")
  line(" * A reference to a hole of this declaration: a declared parameter, not a")
  line(" * wildcard. A hole reads inside the declaration as a local does, and it is a")
  line(" * form of its own because it means something else - a requirement, not a")
  line(" * consumption, so it puts no edge in the edge list.")
  line(" */")
  line("export interface KernelHoleRef {")
  line("  readonly arg: \"hole\"")
  line("  readonly name: bigint")
  line("}")
  line()
  line("/**")
  line(" * A reference to an earlier node of this declaration - the value a `$`")
  line(" * constructor hands back. The brand carries the generator that produced it")
  line(" * and the declaration kind it names, so a handle cannot be spent where a")
  line(" * different sort is required.")
  line(" */")
  line("export interface KernelHandle<")
  line("  Generator extends KernelGenerator,")
  line("  Kind extends KernelDeclKind | null,")
  line("> {")
  line("  readonly arg: \"local\"")
  line("  readonly name: bigint")
  line("  readonly \"~foldlab/plait/kernel/handle\": readonly [Generator, Kind]")
  line("}")
  line()
  line("/** Any handle, whatever it produced. */")
  line("export type KernelAnyHandle = KernelHandle<KernelGenerator, KernelDeclKind | null>")
  line()
  line("/**")
  line(" * What a field branded to one declaration kind accepts: a digest of that")
  line(" * kind, or a handle that produced one. Not a hole: the surface cannot check")
  line(" * that a hole's schema is a declaration of this kind, and admitting it here")
  line(" * would be a claim the type system does not make.")
  line(" */")
  line("export type KernelDigestArg<Kind extends KernelDeclKind> =")
  line("  | KernelDigestRef<Kind>")
  line("  | KernelHandle<KernelGenerator, Kind>")
  line()
  line("/** What an arbitrary model value accepts: any reference at all. */")
  line("export type KernelValueArg =")
  line("  | KernelDigestRef<KernelDeclKind>")
  line("  | KernelAnyHandle")
  line("  | KernelLiteralArg")
  line("  | KernelHoleRef")
  line()
  line("/**")
  line(" * How one field of a generator meets the declaration form. `absent` is the")
  line(" * one that is easy to misread: the field is real and the declaration carries")
  line(" * no reference for it, so the surface offers nothing rather than accepting")
  line(" * an argument that would not survive the write.")
  line(" */")
  line("export type KernelFieldForm =")
  line("  | { readonly form: \"kind\" }")
  line("  | { readonly form: \"digest\"; readonly kind: KernelDeclKind }")
  line("  | { readonly form: \"digestOf\"; readonly field: string }")
  line("  | { readonly form: \"value\" }")
  line("  | { readonly form: \"absent\" }")
  line()
  line("/** One field of one generator, as the emitter reads it. */")
  line("export interface KernelBuilderField {")
  line("  readonly name: string")
  line("  /** The model's own type reference for this field, verbatim. */")
  line("  readonly model: string")
  line("  readonly form: KernelFieldForm")
  line("}")
  line()
  line("/**")
  line(" * Each generator's fields, in the model's declaration order. The emitter")
  line(" * walks this table rather than knowing any field name of its own, so a")
  line(" * renamed field moves the emitter with it.")
  line(" */")
  line("export const KERNEL_GENERATOR_FIELDS = {")
  for (const generator of generators) {
    line(`  ${generator.name}: [`)
    for (const field of generator.fields) {
      line(
        `    { name: ${quote(field.name)}, model: ${quote(field.model)},` +
          ` form: ${formLiteral(field.form)} },`,
      )
    }
    line("  ],")
  }
  line("} as const satisfies {")
  line("  readonly [Generator in KernelGenerator]: ReadonlyArray<KernelBuilderField>")
  line("}")
  line()
  line("/**")
  line(" * The field whose declaration kind brands each generator's handle, where the")
  line(" * constructor names one. A generator that names no kind produces a handle")
  line(" * branded `null`, and such a handle is spendable only where a value is")
  line(" * wanted - which is the whole of the compile-time separation.")
  line(" */")
  line("export const KERNEL_GENERATOR_KIND_FIELD = {")
  for (const generator of generators) {
    line(
      `  ${generator.name}: ${
        generator.kindField === undefined ? "null" : quote(generator.kindField)
      },`,
    )
  }
  line("} as const satisfies { readonly [Generator in KernelGenerator]: string | null }")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// One argument record per generator. Member order is the model's field order.")
  line("// ---------------------------------------------------------------------------")
  line()
  for (const generator of generators) {
    const parameters = generator.kindField === undefined
      ? ""
      : `<${capitalize(generator.kindField)} extends KernelDeclKind>`
    const absent = generator.fields.filter((field) => field.form.form === "absent")
    for (
      const row of docComment(
        `The arguments \`${generator.name}\` takes, in the model's declaration order:` +
          ` ${generator.fields.map((field) => `${field.name} : ${field.model}`).join(", ")}.` +
          (absent.length === 0
            ? ""
            : ` The declaration form carries no reference for ${
              absent.map((field) => `\`${field.name}\``).join(" or ")
            }, so ${absent.length === 1 ? "it is" : "they are"} not offered here.`),
      )
    ) line(row)
    line(`export interface ${argsInterfaceName(generator.name)}${parameters} {`)
    let written = 0
    for (const field of generator.fields) {
      const member = argumentMember(field, generator.kindField)
      if (member === undefined) continue
      if (written > 0) line()
      written += 1
      const parsed = parseTypeReference(field.model, `Act.${generator.name}.${field.name}`)
      const doc = docs.get(parsed.name)
      const head = `\`${field.name} : ${field.model}\`.`
      for (const row of docComment(doc === undefined ? head : `${head} ${doc}`, "  ")) line(row)
      line(`  readonly ${field.name}${member.optional ? "?" : ""}: ${member.type}`)
    }
    line("}")
    line()
  }

  const actDoc = docs.get("Act")
  line("/**")
  line(" * The builder's constructor surface, handed to a program body as `$`.")
  line(" *")
  if (actDoc !== undefined) {
    for (const row of actDoc.split("\n")) line(` * ${row}`.trimEnd())
    line(" *")
  }
  line(" * Three reference helpers stand beside the eight generators. They are the")
  line(" * argument grammar, not the act grammar, which is why they carry no")
  line(" * generator name: `digest` reaches outside the declaration, `hole` names one")
  line(" * of the declaration's own parameters, and `literal` writes an identity")
  line(" * label directly.")
  line(" *")
  line(" * `Holes` is the set of parameter names the program declared. A hole that")
  line(" * was never declared is a type error at the call, not a validation failure")
  line(" * later: the surface has no wildcard.")
  line(" */")
  line("export interface KernelDollar<Holes extends bigint> {")
  line("  /** A reference to a declaration outside this one, branded by its kind. */")
  line("  readonly digest: <Kind extends KernelDeclKind>(")
  line("    kind: Kind,")
  line("    id: bigint,")
  line("  ) => KernelDigestRef<Kind>")
  line()
  line("  /** A reference to one of this declaration's declared parameters. */")
  line("  readonly hole: (name: Holes) => KernelHoleRef")
  line()
  line("  /** A bare identity label. */")
  line("  readonly literal: (value: bigint) => KernelLiteralArg")
  for (const generator of generators) {
    line()
    const parameters = generator.kindField === undefined
      ? ""
      : `<${capitalize(generator.kindField)} extends KernelDeclKind>`
    const argument = generator.kindField === undefined
      ? argsInterfaceName(generator.name)
      : `${argsInterfaceName(generator.name)}<${capitalize(generator.kindField)}>`
    const handle = generator.kindField === undefined
      ? `KernelHandle<${quote(generator.name)}, null>`
      : `KernelHandle<${quote(generator.name)}, ${capitalize(generator.kindField)}>`
    for (
      const row of docComment(
        `Contributes one \`${generator.name}\` node and hands back its local name.` +
          " Nothing is executed and nothing is published.",
        "  ",
      )
    ) line(row)
    line(`  readonly ${generator.name}: ${parameters}(`)
    line(`    args: ${argument},`)
    line(`  ) => ${handle}`)
  }
  line("}")
  line()
  line("/** Any argument a generator field can take, before the field narrows it. */")
  line("export type KernelBuilderArg =")
  line("  | KernelDeclKind")
  line("  | KernelDigestRef<KernelDeclKind>")
  line("  | KernelAnyHandle")
  line("  | KernelLiteralArg")
  line("  | KernelHoleRef")
  line()
  line("/** The wired arguments of one node, keyed by the model's field names. */")
  line("export type KernelBuilderArgs = { readonly [field: string]: KernelBuilderArg }")
  line()

  return out.join("\n")
}

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelBuilder = (
  committed: string,
  corpus: KernelCorpus,
  corpusPath: string,
): KernelBuilderCheck =>
  committed === renderKernelBuilder(corpus, corpusPath)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed kernel builder surface failed byte-identical regeneration",
    }
