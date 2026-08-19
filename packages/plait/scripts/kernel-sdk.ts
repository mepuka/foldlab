/**
 * The plain-TypeScript SDK generator.
 *
 * One corpus in, one import-free TypeScript module out: the kernel language
 * spelled as plain types and plain functions, with no Effect, no dependency,
 * and nothing a reader has to import in order to write a sentence. It is the
 * generated successor of the hand-derived reference sketch the projection
 * ruling adopted, and it differs from that sketch in the one way the sketch's
 * own census named as structural - the values this surface builds are exactly
 * the values the runtime door judges, so the door is reachable from the SDK
 * rather than named by it.
 *
 * What the generator transcribes, and what it decides.
 *
 * - **Transcribed.** Every closed inventory and its ranks, every taught
 *   refusal with its law, repair and applicability, every reviewed standing
 *   meaning, the whole candidate grammar (its constructors, their field names,
 *   their order and their model types), the eight generator names, and the
 *   docstring the model attaches to each type. None of it is retyped here.
 * - **Decided, mechanically and in one place.** How a model type reference
 *   becomes a surface parameter - {@link surfaceTypeOf} - and how each of the
 *   eight generators meets the candidate grammar - {@link GENERATOR_SURFACE}.
 *   Both are total over what the corpus carries today and refuse a reference
 *   or a constructor they have no rule for rather than defaulting.
 *
 * The projection table is checked against the corpus in both directions before
 * a byte is written: every generator of the model has exactly one row, every
 * row names a candidate constructor that exists, and a row's field list is
 * compared to that constructor's own field list name for name and in order. A
 * field added to the model therefore reddens the build here rather than
 * arriving as a silently dropped argument.
 *
 * Nothing generated here runs anything, and nothing here judges. The eight
 * constructors build candidates; the one admission function judges them.
 *
 * @module
 */
import type { KernelConstructorRecord, KernelTypeRecord } from "../src/kernel/KernelCorpusSchemas.js"
import { parseTypeReference, type KernelCorpus } from "./kernel-corpus.js"
import { KERNEL_REFUSAL_REASON_MEANINGS } from "./kernel-runtime-refusals.js"

/** The command a reader runs to reproduce the generated module. */
export const GENERATE_SDK_COMMAND = "bun run generate:kernel-sdk"

/** Where the generated module is committed, relative to the repository root. */
export const GENERATED_SDK_PATH = "packages/plait/src/kernel/KernelSdk.generated.ts"

/** The result of comparing committed bytes with a fresh rendering. */
export type KernelSdkCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel plain-TypeScript SDK: ${reason}`)
}

const quote = (value: string): string => JSON.stringify(value)

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

/** The column the generated file wraps at. */
const WIDTH = 96

/**
 * Greedy word wrap, keeping each run's trailing space so that concatenating
 * the runs reproduces the text exactly. Takes no input but the text and the
 * budget, so one sentence renders to one byte sequence on every run.
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
 * A doc comment carrying a model text. The model's own line breaks are kept
 * and a line still too wide is wrapped at a word boundary. Trailing spaces go:
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
 * One ratified meaning as doc-comment lines, opening on the sentence itself.
 * The operator's taste pass ruled on the corpus, so nothing stands above the
 * meaning; the vocabulary wall sweeps these bytes and refuses a draft marker
 * reappearing over one.
 */
const meaningComment = (
  meaning: string,
  indent: string,
  where: string,
): ReadonlyArray<string> => {
  const text = meaning.trim()
  if (text === "") return refuse(`${where} carries no meaning`)
  if (meaning.includes("\n")) return refuse(`${where}'s meaning carries a line break`)
  return [
    `${indent}/**`,
    ...wrapWords(text, (run) => run.length + indent.length + 3 - WIDTH)
      .map((run) => `${indent} * ${run}`.trimEnd()),
    `${indent} */`,
  ]
}

/**
 * What this projection does to a model sort that the model's own docstring
 * would otherwise describe wrongly here.
 *
 * Each note is appended to the model's text rather than replacing it, in the
 * same place and for the same reason the generated schemas append theirs: the
 * model says what the sort IS, and a projection that erased an index or
 * widened a grammar owes a reader the sentence saying so. A sort absent from
 * this table is projected without comment because nothing about it moved.
 */
const PROJECTION_NOTES: { readonly [type: string]: string } = {
  Digest:
    "Branded here by kind over the model's carrier, with a string-literal key rather than a"
    + " module-local symbol, so the brand can be named from anywhere and spelled without an"
    + " import.",
  Token:
    "The register is not a type index here: the constructor that takes a fence writes the"
    + " register from the one the caller commits at, so a cross-register claim has no spelling"
    + " through it.",
  AnchorFact:
    "The reduction and the partition are not type indices here: the constructor that takes an"
    + " anchor writes both from the coordinate the caller folds at, so a replay under another"
    + " reduction has no spelling through it.",
  Value:
    "Spelled here as the raw argument list a candidate carries, because a value IS the"
    + " canonicalization of that list and the raw list is what the door is handed.",
  KTriggerPredicate:
    "The surface takes the candidate grammar instead, which is this grammar widened by the"
    + " shapes it cannot carry, so the door refuses and TEACHES those shapes rather than this"
    + " projection preventing them in silence.",
}

/** The model's docstring for one type, with this projection's note where it owes one. */
const docOf = (
  docs: ReadonlyMap<string, string>,
  name: string,
): string | undefined => {
  const doc = docs.get(name)?.replace(/\s+$/, "")
  const note = PROJECTION_NOTES[name]
  if (doc === undefined || doc === "") return note
  return note === undefined ? doc : `${doc}\n\n${note}`
}

const typeRecord = (corpus: KernelCorpus, name: string): KernelTypeRecord => {
  const found = corpus.types.find((type) => type.name === name)
  return found ?? refuse(`the corpus declares no ${name} type`)
}

const constructorRecord = (
  type: KernelTypeRecord,
  name: string,
): KernelConstructorRecord => {
  const found = type.constructors.find((constructor) => constructor.name === name)
  return found ?? refuse(`${type.name} declares no ${name} constructor`)
}

/**
 * The sorts this projection brands, and the sorts it flattens to their
 * carrier. The rule is the one the runtime tables already state: a brand
 * parameter named after a record class the corpus enumerates is a CLOSED
 * domain and earns a branded alias with one member per name, and every other
 * brand domain is open - a register is a digest, a partition is a lane and a
 * shard - so a brand over it separates nothing this projection can name.
 *
 * A sort with an open brand domain therefore projects to its carrier. Nothing
 * is lost by that here: the two ties an open brand carried in the reference
 * sketch - a token fenced at its register, an anchor belonging to its own
 * reduction - are written by the constructors below out of a coordinate the
 * caller supplies once, so a crossed pair has no spelling at all rather than
 * no well-typed spelling.
 */
const CLOSED_BRAND_DOMAIN = "kind"

/**
 * The model's scalar carriers, projected onto TypeScript's.
 *
 * `Nat` is `bigint` and nothing else. The corpus, every generated schema, and
 * the admission function end to end already carry model integers at arbitrary
 * precision, and a pinned canon vector past the range a double holds exactly
 * is what makes that load-bearing: a surface that handed the door a `number`
 * would round an identity on the way in.
 */
const CARRIERS: { readonly [model: string]: string } = { Nat: "bigint", String: "string" }

const carrierOf = (model: string, where: string): string =>
  CARRIERS[model] ?? refuse(`${where} carries unmapped model type ${model}`)

/** The SDK's spelling of one branded digest alias for a declaration kind. */
const digestAlias = (kind: string): string => `${capitalize(kind)}Digest`

/**
 * How one model type reference becomes a type in the candidate layer of the
 * projection. Total over what the candidate grammar and the door context use,
 * and refusing anything else, so a new field type stops the build here rather
 * than arriving as a silently widened member.
 *
 * Every reference in this layer is the RAW spelling: identity labels, not
 * branded sorts. That is what "raw" means in the model's own docstring for the
 * argument atoms, and it is why the brands live one layer up, on the eight
 * generators, where the model's `Act` names a sort rather than a label.
 */
export const candidateTypeOf = (
  model: string,
  declared: ReadonlySet<string>,
  where: string,
): string => {
  const parsed = parseTypeReference(model, where)
  if (parsed.name === "List") {
    const inner = parsed.args[0]
    if (parsed.args.length !== 1 || inner === undefined) {
      return refuse(`${where}: List takes one argument, got ${parsed.args.length}`)
    }
    return `ReadonlyArray<${candidateTypeOf(inner, declared, where)}>`
  }
  if (parsed.name === "Option") {
    const inner = parsed.args[0]
    if (parsed.args.length !== 1 || inner === undefined) {
      return refuse(`${where}: Option takes one argument, got ${parsed.args.length}`)
    }
    return `${candidateTypeOf(inner, declared, where)} | undefined`
  }
  if (parsed.name === "Ref") return "Ref"
  if (parsed.args.length > 0) {
    return refuse(`${where}: ${parsed.name} carries brand arguments in the candidate layer`)
  }
  if (declared.has(parsed.name)) return parsed.name
  return carrierOf(parsed.name, where)
}

/**
 * How one model type reference of the model's own `Act` becomes a parameter of
 * the lawful surface.
 *
 * This is the projection's second judgement and its last one. It is total over
 * the references `Act` uses today and refuses anything else. Read it as the
 * statement of what each of the eight generators asks a caller for:
 *
 * - a declaration kind is the kind name itself, and it binds the brand of
 *   every later digest the same constructor names;
 * - a digest branded to a fixed kind is that kind's alias;
 * - a digest branded to an earlier field is that field's kind, with the
 *   binding refused on the field rather than inferred from the digest;
 * - a canonical value is the raw argument list the candidate carries, because
 *   the model's value IS the canonicalization of that list;
 * - a scalar whose brand domain is open is its carrier;
 * - a structure the candidate layer already names is that projection.
 */
export const surfaceTypeOf = (
  model: string,
  kindParameter: string | undefined,
  kinds: ReadonlySet<string>,
  where: string,
): string => {
  const parsed = parseTypeReference(model, where)
  switch (parsed.name) {
    case "DeclKind":
      return "Kind"
    case "Value":
      return "ReadonlyArray<RawArg>"
    case "StateLabel":
      return carrierOf("Nat", where)
    case "LanePartition":
      return "LanePartition"
    case "AnchorFact":
      return "AnchorFact"
    case "KTriggerPredicate":
      // The lawful sentence names the closed five-production grammar; the
      // candidate names that grammar widened by the four shapes it cannot
      // carry. The surface takes the widened one so the door can refuse and
      // TEACH those four rather than this file preventing them silently.
      return "CandidatePredicate"
    case "Digest": {
      const argument = parsed.args[0]
      if (parsed.args.length !== 1 || argument === undefined) {
        return refuse(`${where}: Digest takes one brand argument, got ${parsed.args.length}`)
      }
      if (kinds.has(argument)) return digestAlias(argument)
      if (argument === kindParameter) return "Digest<NoInfer<Kind>>"
      return refuse(`${where}: brand argument ${argument} names no kind and no kind field`)
    }
    case "Token":
    case "Position":
      // Open brand domains. The tie the brand carried is written by the
      // constructor out of a coordinate the caller gives once.
      return carrierOf("Nat", where)
    default:
      return refuse(`${where}: no surface rule for the model reference ${model}`)
  }
}

/** One field of a candidate constructor, as the surface fills it. */
interface SurfaceField {
  /** The candidate constructor's own field name. */
  readonly name: string
  /** The expression that fills it, over this generator's parameter names. */
  readonly expression: string
}

/** One generator's row of the projection table. */
interface GeneratorSurface {
  /** The `Act` constructor this row projects. */
  readonly generator: string
  /** The `CandidateAct` constructor it builds. */
  readonly arm: string
  /**
   * Parameters the surface takes beyond the generator's own fields, with the
   * model reference each carries and the reason the lawful sentence has no
   * field for it.
   */
  readonly extra: ReadonlyArray<{
    readonly name: string
    readonly model: string
    readonly why: string
  }>
  /** How each field of the candidate constructor is filled, in its own order. */
  readonly fields: ReadonlyArray<SurfaceField>
  /** What this row's construction makes unspellable, and the tie that forbids it. */
  readonly ties: ReadonlyArray<string>
}

/**
 * The projection table: how each of the model's eight generators meets the
 * candidate grammar.
 *
 * Every parameter of every row is one of the generator's own fields, in the
 * generator's own order, with one stated exception - `join` gains the declared
 * algebra, because the candidate carries a merge strategy the lawful sentence
 * does not and a lawful join presupposes the algebra the strategy names.
 *
 * Four rows write a field rather than accepting one, and those four are the
 * dependent ties the model's constructors carry. They are enforced here by
 * CONSTRUCTION rather than by an inference guard: the caller supplies the
 * coordinate once and the constructor writes it into both positions, so a
 * cross-register token and a cross-reduction anchor have no spelling at all.
 * The crimes those ties prevent stay spellable as candidate values, which is
 * what lets the door refuse them and teach the repair.
 */
const GENERATOR_SURFACE: ReadonlyArray<GeneratorSurface> = [
  {
    generator: "declare",
    arm: "declare",
    extra: [],
    fields: [
      { name: "kind", expression: "kind" },
      { name: "payload", expression: "value" },
      { name: "writ", expression: "writ" },
    ],
    ties: [],
  },
  {
    generator: "resolve",
    arm: "resolveDigest",
    extra: [],
    fields: [
      { name: "kind", expression: "kind" },
      { name: "target", expression: "target" },
      { name: "anchor", expression: "undefined" },
    ],
    ties: [
      "a resolve at an anchor: a digest names one value forever, so the lawful"
      + " sentence carries no anchor and this constructor writes none",
    ],
  },
  {
    generator: "emit",
    arm: "emit",
    extra: [],
    fields: [
      { name: "lane", expression: "lane" },
      { name: "body", expression: "body" },
    ],
    ties: [],
  },
  {
    generator: "join",
    arm: "join",
    extra: [
      {
        name: "algebra",
        model: "Digest(algebra)",
        why:
          "the candidate carries the merge strategy and the lawful sentence does"
          + " not, because a lawful join presupposes the declared algebra",
      },
    ],
    fields: [
      { name: "cell", expression: "cell" },
      { name: "contribution", expression: "contribution" },
      { name: "strategy", expression: "{ _tag: \"declaredAlgebra\", algebra }" },
    ],
    ties: [
      "a join that asks arrival order to override the declared algebra: this"
      + " constructor writes the declared-algebra strategy and takes no other",
    ],
  },
  {
    generator: "fold",
    arm: "fold",
    extra: [],
    fields: [
      { name: "declared", expression: "declared" },
      {
        name: "anchor",
        expression:
          "{\n    foldId: declared,\n    lane: partition.lane,"
          + "\n    shard: partition.shard,\n    floor: anchor.floor,"
          + "\n    state: anchor.state,\n    head: anchor.head,\n  }",
      },
      { name: "query", expression: "query" },
    ],
    ties: [
      "a fold with no anchor: every head-relative read resumes at a coordinate,"
      + " so the anchor is a parameter and never absent",
      "an anchor replayed under a reduction that is not its own: the reduction"
      + " is written from the one the caller folds at",
    ],
  },
  {
    generator: "decide",
    arm: "decide",
    extra: [],
    fields: [
      { name: "register", expression: "register" },
      { name: "token", expression: "{ register, value: token }" },
      { name: "outcome", expression: "outcome" },
    ],
    ties: [
      "a decide with no token: only a fenced token commits, so the fence is a"
      + " parameter and never absent",
      "a token fenced at one register committing at another: the register is"
      + " written from the one the caller commits at",
    ],
  },
  {
    generator: "trigger",
    arm: "trigger",
    extra: [],
    fields: [
      { name: "predicate", expression: "predicate" },
      { name: "declaration", expression: "declaration" },
    ],
    ties: [],
  },
  {
    generator: "spawn",
    arm: "spawn",
    extra: [],
    fields: [
      { name: "parent", expression: "parent" },
      { name: "request", expression: "request" },
    ],
    ties: [],
  },
]

/** One generator resolved against the corpus: its parameters and its arm. */
interface ResolvedGenerator {
  readonly row: GeneratorSurface
  readonly parameters: ReadonlyArray<{
    readonly name: string
    readonly model: string
    readonly type: string
  }>
  readonly kindParameter: string | undefined
}

/**
 * Resolves the projection table against the corpus, refusing every way the two
 * can disagree.
 *
 * The checks run in both directions on purpose. A generator the table has not
 * is a surface that silently lost a sentence; a table row for a generator the
 * model has not is a surface that invented one; a field list that has moved is
 * a constructor whose arguments would land in the wrong slots. None of those
 * is visible in the emitted bytes, so all of them are refused before a byte is
 * written.
 */
const resolveGenerators = (corpus: KernelCorpus): ReadonlyArray<ResolvedGenerator> => {
  const act = typeRecord(corpus, "Act")
  const candidate = typeRecord(corpus, "CandidateAct")
  const kinds = new Set(corpus.kinds.map((kind) => kind.name))
  const constructorNames = new Set(
    corpus.types.flatMap((type) => type.constructors.map((one) => one.name)),
  )

  if (GENERATOR_SURFACE.length !== act.constructors.length) {
    refuse(
      `the projection table has ${GENERATOR_SURFACE.length} rows and Act declares`
        + ` ${act.constructors.length} generators`,
    )
  }
  const armed = new Set<string>()

  return act.constructors.map((generator, index) => {
    const row = GENERATOR_SURFACE[index]
    if (row === undefined || row.generator !== generator.name) {
      return refuse(
        `projection row ${index} names ${row?.generator ?? "nothing"} where Act declares`
          + ` ${generator.name}; the table is not in the model's order`,
      )
    }
    if (armed.has(row.arm)) refuse(`two generators project onto candidate arm ${row.arm}`)
    armed.add(row.arm)
    const arm = constructorRecord(candidate, row.arm)

    // The row's field list is compared to the candidate constructor's own,
    // name for name and in order. This is the clause a moved model trips.
    const wanted = arm.fields.map((field) => field.name).join(",")
    const stated = row.fields.map((field) => field.name).join(",")
    if (wanted !== stated) {
      refuse(
        `generator ${generator.name} fills [${stated}] where candidate arm ${row.arm}`
          + ` declares [${wanted}]`,
      )
    }

    // Every tagged literal a row writes names a constructor the corpus has.
    for (const field of row.fields) {
      for (const found of field.expression.matchAll(/_tag: "([A-Za-z][A-Za-z0-9]*)"/g)) {
        const tag = found[1]!
        if (!constructorNames.has(tag)) {
          refuse(`generator ${generator.name} writes tag ${quote(tag)}, which the corpus has not`)
        }
      }
    }

    let kindParameter: string | undefined
    const parameters = [
      ...generator.fields.map((field) => ({ name: field.name, model: field.type })),
      ...row.extra.map((extra) => ({ name: extra.name, model: extra.model })),
    ].map((parameter) => {
      const where = `Act.${generator.name}.${parameter.name}`
      const parsed = parseTypeReference(parameter.model, where)
      if (parsed.name === "DeclKind") {
        if (kindParameter !== undefined) {
          refuse(`${where}: a second declaration-kind field; the brand binding would be ambiguous`)
        }
        kindParameter = parameter.name
      }
      return {
        ...parameter,
        type: surfaceTypeOf(parameter.model, kindParameter, kinds, where),
      }
    })

    // A parameter no field reads is an argument that vanishes at the call.
    for (const parameter of parameters) {
      const read = row.fields.some((field) =>
        new RegExp(`(^|[^A-Za-z0-9_.])${parameter.name}([^A-Za-z0-9_]|$)`).test(field.expression)
      )
      if (!read) refuse(`generator ${generator.name} takes ${parameter.name} and reads it nowhere`)
    }

    return { row, parameters, kindParameter }
  })
}

/**
 * The standing meaning of each model-emitted refusal reason, resolved against
 * the corpus's own rows. Both directions are refused rather than defaulted, as
 * they are wherever else the ledger is read: a reason the ledger does not
 * cover would render an unexplained row, and a ledger row naming no reason is
 * a meaning for a kind that no longer exists.
 */
const reasonMeanings = (corpus: KernelCorpus): ReadonlyMap<string, string> => {
  const ledger = new Map<string, string>()
  for (const row of KERNEL_REFUSAL_REASON_MEANINGS) {
    if (ledger.has(row.reason)) refuse(`the reason-meaning ledger names ${quote(row.reason)} twice`)
    ledger.set(row.reason, row.meaning)
  }
  const reasons = new Set(corpus.refusals.map((row) => row.reason))
  for (const reason of reasons) {
    if (!ledger.has(reason)) refuse(`corpus refusal reason ${quote(reason)} carries no meaning`)
  }
  for (const reason of ledger.keys()) {
    if (!reasons.has(reason)) {
      refuse(`the reason-meaning ledger names ${quote(reason)}, which the corpus does not emit`)
    }
  }
  return ledger
}

/** The types this projection carries, in the order the emitted file declares them. */
/**
 * The door's answer, read off the `AdmitResult` record instead of written out.
 *
 * Until DEV-852 the two arms were three literal `line(...)` calls here — the
 * one shape in this generator that no type record grounded, so a model that
 * renamed an arm would have left this file saying the old name. The arm names
 * and the refused arm's payload now come from the record, and a record whose
 * shape moves refuses here rather than being rendered around.
 *
 * The admitted arm is the one place the SDK's projection is visible, so it is
 * named rather than assumed. The record's admitted arm carries `act : Act` —
 * the intrinsic sentence the door mints. This surface has no `Act` carrier and
 * is not getting one: the SDK's types are the CANDIDATE side, what a caller
 * builds and hands over, and a minted sentence is not something a caller can
 * spell. What the SDK gives back for it is that sentence's canonical framing,
 * `encoded` — the vector two implementations must agree on, which is exactly
 * what a caller can check. The generator asserts the field it is projecting is
 * still `Act`, so the projection cannot go on quietly standing for something
 * else.
 */
const renderVerdict = (
  corpus: KernelCorpus,
  digestCarrier: string,
  line: (value?: string) => void,
): void => {
  const admitResult = typeRecord(corpus, "AdmitResult")
  if (admitResult.constructors.length !== 2) {
    refuse(`AdmitResult carries ${admitResult.constructors.length} constructors, not two`)
  }
  const admitted = constructorRecord(admitResult, "admitted")
  const refused = constructorRecord(admitResult, "refused")
  const sole = (constructor: KernelConstructorRecord, expected: string): void => {
    const [field, ...rest] = constructor.fields
    if (field === undefined || rest.length !== 0) {
      refuse(`AdmitResult.${constructor.name} carries ${constructor.fields.length} fields, not one`)
    }
    if (field.type !== expected) {
      refuse(`AdmitResult.${constructor.name}.${field.name} carries ${field.type}, not ${expected}`)
    }
  }
  sole(admitted, "Act")
  sole(refused, "Refusal")

  line("/**")
  line(" * What the door answers. An admitted candidate becomes a sentence and carries")
  line(" * its canonical framing - the vector two implementations must agree on. A")
  line(" * refused one carries the whole taught row, so the reason, the law it defends")
  line(" * and the legal next move arrive together and a caller can repair.")
  line(" */")
  line("export type Verdict =")
  line(
    `  | { readonly verdict: ${
      JSON.stringify(admitted.name)
    }; readonly encoded: ReadonlyArray<${digestCarrier}> }`,
  )
  line(`  | ({ readonly verdict: ${JSON.stringify(refused.name)} } & Refusal)`)
  line()
}

const CANDIDATE_TYPES = [
  "RawArg",
  "CandidateAnchor",
  "TokenClaim",
  "MergeStrategy",
  "CandidatePredicate",
  "CandidateAct",
] as const

const isSum = (type: KernelTypeRecord): boolean => type.form === "inductive"

/**
 * Renders one model type as a plain TypeScript declaration plus one plain
 * constructor per non-empty arm. A sum becomes a tagged union keyed on the
 * discriminant the runtime already speaks; a product becomes an interface.
 */
const renderCandidateType = (
  type: KernelTypeRecord,
  docs: ReadonlyMap<string, string>,
  declared: ReadonlySet<string>,
  line: (value?: string) => void,
  lines: (values: ReadonlyArray<string>) => void,
): void => {
  const doc = docOf(docs, type.name)
  if (doc !== undefined) lines(docComment(doc))
  if (isSum(type)) {
    line(`export type ${type.name} =`)
    for (const constructor of type.constructors) {
      const members = constructor.fields.map((field) =>
        `readonly ${field.name}: ${
          candidateTypeOf(field.type, declared, `${type.name}.${constructor.name}.${field.name}`)
        }`
      )
      const flat = `  | { readonly _tag: ${quote(constructor.name)}${
        members.map((member) => `; ${member}`).join("")
      } }`
      if (flat.length <= WIDTH) {
        line(flat)
        continue
      }
      line("  | {")
      line(`    readonly _tag: ${quote(constructor.name)}`)
      for (const member of members) line(`    ${member}`)
      line("  }")
    }
    line()
    return
  }
  const constructor = type.constructors[0]
  if (type.constructors.length !== 1 || constructor === undefined) {
    return refuse(`structure ${type.name} carries ${type.constructors.length} constructors, want 1`)
  }
  line(`export interface ${type.name} {`)
  for (const field of constructor.fields) {
    line(
      `  readonly ${field.name}: ${
        candidateTypeOf(field.type, declared, `${type.name}.${constructor.name}.${field.name}`)
      }`,
    )
  }
  line("}")
  line()
}

/**
 * Renders the constructors of one sum type: one plain function per arm, with
 * the model's own constructor name, the model's own field names, and the
 * model's own field order.
 */
const renderCandidateConstructors = (
  type: KernelTypeRecord,
  declared: ReadonlySet<string>,
  line: (value?: string) => void,
  lines: (values: ReadonlyArray<string>) => void,
): void => {
  for (const constructor of type.constructors) {
    const where = `${type.name}.${constructor.name}`
    const parameters = constructor.fields.map((field) =>
      `${field.name}: ${candidateTypeOf(field.type, declared, `${where}.${field.name}`)}`
    )
    const members = constructor.fields.map((field) => `, ${field.name}`).join("")
    lines(docComment(
      `The ${constructor.name} arm of ${type.name}${
        constructor.fields.length === 0 ? ", which carries nothing" : ""
      }.`,
    ))
    const head = `export const ${constructor.name} = (${parameters.join(", ")}): ${type.name} =>`
    const body = `({ _tag: ${quote(constructor.name)}${members} })`
    if (`${head} ${body}`.length <= WIDTH) line(`${head} ${body}`)
    else if (head.length <= WIDTH) {
      line(head)
      line(`  ${body}`)
    } else {
      line(`export const ${constructor.name} = (`)
      for (const parameter of parameters) line(`  ${parameter},`)
      line(`): ${type.name} => ${body}`)
    }
    line()
  }
}

/**
 * Renders the generated module. The rendering is a total function of the read
 * corpus alone, so two runs over one corpus produce identical bytes - and it
 * takes no path, which is what makes rendering one structurally impossible.
 */
export const renderKernelSdk = (corpus: KernelCorpus): string => {
  const generators = resolveGenerators(corpus)
  const meanings = reasonMeanings(corpus)
  const docs = new Map(corpus.docs.map((doc) => [doc.name, doc.doc] as const))
  const triggers = typeRecord(corpus, "KTriggerPredicate")
  const digest = typeRecord(corpus, "Digest")
  const digestBrand = digest.params.filter((param) => param.role === "brand").map((p) => p.name)
  if (digestBrand.length !== 1 || digestBrand[0] !== CLOSED_BRAND_DOMAIN) {
    refuse(
      `Digest is branded by [${digestBrand.join(", ")}], and this projection's closed brand`
        + ` domain is ${CLOSED_BRAND_DOMAIN}`,
    )
  }
  const digestCarrier = carrierOf(
    digest.constructors[0]?.fields[0]?.type ?? refuse("Digest carries no field"),
    "Digest",
  )
  const declared = new Set<string>([...CANDIDATE_TYPES, "DeclKind", "Ref"])

  // One flat namespace, so a model that grew two constructors of one name would
  // silently shadow one of them. The names are the model's own, so the refusal
  // names the model's collision rather than this file's.
  const taken = new Set<string>(["digestOf"])
  for (const name of [
    ...CANDIDATE_TYPES
      .map((one) => typeRecord(corpus, one))
      .filter((type) => isSum(type) && type.name !== "CandidateAct")
      .flatMap((type) => type.constructors.map((made) => made.name)),
    ...generators.map((resolved) => resolved.row.generator),
  ]) {
    if (taken.has(name)) refuse(`two constructors of this projection are both named ${name}`)
    taken.add(name)
  }

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
  line(" * The kernel language as plain TypeScript: things as functions and arguments.")
  line(" *")
  line(" * Zero imports and zero dependencies. Every type here is spellable with the")
  line(" * language's own syntax, every constructor is a plain function, and every")
  line(" * closed inventory is a literal array a reader can enumerate. Nothing here is")
  line(" * an effect system, a service, or a client: the eight generators build")
  line(" * CANDIDATE values, and a candidate becomes a sentence only by being judged.")
  line(" *")
  line(" * The values this module builds are exactly the values the one admission")
  line(" * function accepts. That is the property the whole surface is arranged")
  line(" * around: a projection that could describe the language but could not hand it")
  line(" * to the door would be a description of a door rather than a way through one.")
  line(" *")
  line(" * Three layers, from the outside in.")
  line(" *")
  line(" * The **inventories and the taught refusals** are the vocabulary: what a")
  line(" * declaration kind may be, what stages a hole passes through, what the door")
  line(" * can refuse, and for every refusal the law it defends and the legal next")
  line(" * move. Each refusal row carries its reason's standing MEANING as a doc")
  line(" * comment, distinct from the law and the repair a refusal teaches when it")
  line(" * fires. The operator's taste pass ratified those sentences, so each one")
  line(" * stands as written rather than as a draft awaiting a ruling.")
  line(" *")
  line(" * The **candidate grammar** is the raw spelling: every shape a caller can")
  line(" * present, lawful and unlawful alike. The unlawful shapes are here on")
  line(" * purpose. A surface that made them unspellable would PREVENT rather than")
  line(" * teach, and the taught repair for a refused candidate is only meaningful if")
  line(" * the candidate can be written down.")
  line(" *")
  line(" * The **eight generators** are the lawful half: one plain function per")
  line(" * generator of the model, taking that generator's own fields, in that")
  line(" * generator's own order. Four of them write a field rather than accepting")
  line(" * one, and those four are the model's dependent ties - a token is fenced at")
  line(" * the register it commits to, an anchor belongs to the reduction it resumes,")
  line(" * a resolve carries no anchor, a join carries the declared algebra. The tie")
  line(" * is carried by construction, so a crossed pair has no spelling here at all;")
  line(" * the crime remains spellable as a candidate value, where the door teaches.")
  line(" *")
  line(" * Integers are `bigint` throughout, because the model's integers are")
  line(" * unbounded and an encoded sentence already exceeds what a double holds")
  line(" * exactly. Brand identities are string literals rather than unique symbols,")
  line(" * because that is how the estate's pinned release spells a type identity and")
  line(" * because a module-local symbol cannot be named from anywhere else.")
  line(" *")
  line(" * These are safety-side names and texts, never runtime guarantees. A model")
  line(" * theorem stays in the model; what crosses the seam is the vocabulary the")
  line(" * door harness then checks the runtime against, verdict for verdict.")
  line(" *")
  line(" * @module")
  line(" */")
  line()

  line("/**")
  line(" * What this surface came from, carried as data for a consumer to assert: the")
  line(" * identity of the corpus, and the interchange format it was read at. A")
  line(" * consumer that wants to know whether it holds this surface's source hashes")
  line(" * the bytes it has and compares - which is a check, where a path would have")
  line(" * been a hope.")
  line(" */")
  line("export const KERNEL_SDK_PROVENANCE = {")
  line(`  corpus: ${quote(corpus.digest)},`)
  line(`  format: ${corpus.header.format}n,`)
  line("} as const")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The vocabulary: the closed inventories, and what the door teaches.")
  line("// ---------------------------------------------------------------------------")
  line()

  lines(docComment(docOf(docs, "DeclKind") ?? "The closed universe of declaration kinds."))
  line("export const DECL_KINDS = [")
  for (const kind of corpus.kinds) line(`  ${quote(kind.name)},`)
  line("] as const")
  line()
  line("/** One declaration kind of the closed universe. */")
  line("export type DeclKind = (typeof DECL_KINDS)[number]")
  line()
  line("/** The wire-stable rank of each declaration kind. An encoded sentence writes it. */")
  line("export const DECL_KIND_RANK = {")
  for (const kind of corpus.kinds) line(`  ${kind.name}: ${kind.rank}n,`)
  line("} as const satisfies { readonly [Kind in DeclKind]: bigint }")
  line()

  lines(docComment(docOf(docs, "HoleStage") ?? "The epistemic stages of a hole."))
  line("export const HOLE_STAGES = [")
  for (const stage of corpus.stages) line(`  ${quote(stage.name)},`)
  line("] as const")
  line()
  line("/** One epistemic stage of a hole. */")
  line("export type HoleStage = (typeof HOLE_STAGES)[number]")
  line()
  line("/**")
  line(" * The rank of each hole stage. Ranks compare in the reached-at-least direction")
  line(" * only; the gap between two of them means nothing.")
  line(" */")
  line("export const HOLE_STAGE_RANK = {")
  for (const stage of corpus.stages) line(`  ${stage.name}: ${stage.rank}n,`)
  line("} as const satisfies { readonly [Stage in HoleStage]: bigint }")
  line()

  line("/** The generator vocabulary, in the model's own declaration order. */")
  line("export const GENERATORS = [")
  for (const resolved of generators) line(`  ${quote(resolved.row.generator)},`)
  line("] as const")
  line()
  line("/** One kernel generator: one way to say something. */")
  line("export type Generator = (typeof GENERATORS)[number]")
  line()

  line("/**")
  line(" * The closed trigger grammar: exactly the monotone productions the model")
  line(" * names. Every production reads its component upward, so stability under")
  line(" * growth is a property of the grammar's shape rather than of a check.")
  line(" */")
  line("export const TRIGGER_PRODUCTIONS = [")
  for (const production of triggers.constructors) line(`  ${quote(production.name)},`)
  line("] as const")
  line()
  line("/** One lawful trigger production. */")
  line("export type TriggerProduction = (typeof TRIGGER_PRODUCTIONS)[number]")
  line()

  line("/** The wire spelling of every refusal reason, in the model's order. */")
  line("export const REFUSAL_REASONS = [")
  for (const refusal of corpus.refusals) line(`  ${quote(refusal.reason)},`)
  line("] as const")
  line()
  line("/** One refusal reason the door can carry. */")
  line("export type RefusalReason = (typeof REFUSAL_REASONS)[number]")
  line()
  lines(docComment(
    docOf(docs, "Applicability")
      ?? "How a taught repair may be applied.",
  ))
  line("export type Applicability = \"machine-applicable\" | \"advisory\"")
  line()
  line("/** One taught refusal: the law it defends and the legal next move. */")
  line("export interface Refusal {")
  line("  readonly reason: RefusalReason")
  line("  readonly law: string")
  line("  readonly repair: string")
  line("  readonly applicability: Applicability")
  line("}")
  line()
  line("/**")
  line(" * The taught-refusal table - total: a reason without its law, its repair and")
  line(" * its marking cannot exist here, because it cannot exist in the model.")
  line(" */")
  line("export const TAUGHT = [")
  for (const refusal of corpus.refusals) {
    lines(meaningComment(
      meanings.get(refusal.reason)!,
      "  ",
      `refusal reason ${quote(refusal.reason)}`,
    ))
    line("  {")
    line(`    reason: ${quote(refusal.reason)},`)
    line(`    law: ${quote(refusal.law)},`)
    line(`    repair: ${quote(refusal.repair)},`)
    line(`    applicability: ${quote(refusal.applicability)},`)
    line("  },")
  }
  line("] as const satisfies ReadonlyArray<Refusal>")
  line()
  line("/** The taught refusal each reason carries, keyed by its wire spelling. */")
  line("export const TAUGHT_BY_REASON = {")
  corpus.refusals.forEach((refusal, index) => {
    line(`  ${quote(refusal.reason)}: TAUGHT[${index}],`)
  })
  line("} as const satisfies { readonly [Reason in RefusalReason]: Refusal }")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The sort system: one brand per declaration kind, over the model's carrier.")
  line("// ---------------------------------------------------------------------------")
  line()
  line("/**")
  line(" * The compile-time brand carrier. The property never exists at runtime; it")
  line(" * exists so two sorts with the same representation refuse to unify. It is a")
  line(" * string-literal key rather than a unique symbol, so it can be named from")
  line(" * anywhere and spelled without importing anything.")
  line(" */")
  line("export interface Brand<Tag extends string> {")
  line("  readonly \"~foldlab/plait/kernel/Brand\": Tag")
  line("}")
  line()
  lines(docComment(docOf(docs, "Digest") ?? "A content address branded by the declaration kind it names."))
  line(`export type Digest<Kind extends DeclKind, Carrier = ${digestCarrier}> =`)
  line("  Carrier & Brand<`~foldlab/plait/kernel/Digest/${Kind}`>")
  line()
  line("/**")
  line(" * The per-kind digest aliases. The declaration kinds are the one brand domain")
  line(" * the model closes, so they enumerate; a register and a partition are open, so")
  line(" * the sorts branded by them are carried here as their carrier and the tie a")
  line(" * brand would have made is written by the constructor instead.")
  line(" */")
  for (const kind of corpus.kinds) {
    line(`/** A content address branded to the ${kind.name} declaration kind. */`)
    line(
      `export type ${digestAlias(kind.name)}<Carrier = ${digestCarrier}> =`
        + ` Digest<${quote(kind.name)}, Carrier>`,
    )
  }
  line()
  line("/**")
  line(" * Names a digest at its kind. It does not MINT one: every identifier is the")
  line(" * digest of a declaration or a derivation from one, and minting a name is")
  line(" * itself one of the taught refusals - the atom that spells that crime is")
  line(" * below, under the raw arguments, where the door can refuse it and teach.")
  line(" */")
  line("export const digestOf = <Kind extends DeclKind>(")
  line("  kind: Kind,")
  line(`  id: ${digestCarrier},`)
  line("): Digest<Kind> => {")
  line("  void kind")
  line("  return id as Digest<Kind>")
  line("}")
  line()
  lines(docComment(docOf(docs, "LanePartition") ?? "A lane partition."))
  line("export interface LanePartition {")
  line("  readonly lane: LaneDigest")
  line(`  readonly shard: ${digestCarrier}`)
  line("}")
  line()
  lines(docComment(docOf(docs, "AnchorFact") ?? "An anchor fact."))
  line("export interface AnchorFact {")
  line(`  readonly floor: ${digestCarrier}`)
  line(`  readonly state: ${digestCarrier}`)
  line(`  readonly head: ${digestCarrier}`)
  line("}")
  line()

  line("// ---------------------------------------------------------------------------")
  line("// The candidate grammar: every shape a caller can present to the door.")
  line("// ---------------------------------------------------------------------------")
  line()
  line("/**")
  line(" * A kind-tagged reference: the one lawful way a heterogeneous collection of")
  line(" * digests is carried, so the kind travels with the identifier instead of")
  line(" * being inferred from context.")
  line(" */")
  line("export interface Ref {")
  line(`  readonly id: ${digestCarrier}`)
  line("  readonly kind: DeclKind")
  line("}")
  line()
  for (const name of CANDIDATE_TYPES) {
    const type = typeRecord(corpus, name)
    renderCandidateType(type, docs, declared, line, lines)
    if (isSum(type) && name !== "CandidateAct") {
      renderCandidateConstructors(type, declared, line, lines)
    }
  }
  const door = typeRecord(corpus, "Door")
  renderCandidateType(door, docs, declared, line, lines)
  renderVerdict(corpus, digestCarrier, line)

  line("// ---------------------------------------------------------------------------")
  line("// The eight generators: the lawful half, one plain function each.")
  line("// ---------------------------------------------------------------------------")
  line()
  for (const resolved of generators) {
    const { row, parameters, kindParameter } = resolved
    const generic = kindParameter === undefined ? "" : "<Kind extends DeclKind>"
    const doc = [
      `Builds one \`${row.generator}\` candidate.`,
      ...row.extra.map((extra) => `It also takes \`${extra.name}\`, because ${extra.why}.`),
      ...row.ties.map((tie) => `This constructor cannot spell ${tie}.`),
      "Nothing is executed and nothing is published: only the door judges.",
    ].join(" ")
    lines(docComment(doc))
    line(`export const ${row.generator} = ${generic}(`)
    for (const parameter of parameters) {
      const text = docOf(docs, parseTypeReference(parameter.model, parameter.name).name)
      const head = `\`${parameter.name} : ${parameter.model}\`.`
      lines(docComment(text === undefined ? head : `${head} ${text}`, "  "))
      line(`  ${parameter.name}: ${parameter.type},`)
    }
    line("): CandidateAct => ({")
    line(`  _tag: ${quote(row.arm)},`)
    for (const field of row.fields) {
      line(
        field.name === field.expression
          ? `  ${field.name},`
          : `  ${field.name}: ${field.expression},`,
      )
    }
    line("})")
    line()
  }

  return out.join("\n")
}

/** Checks that committed generated bytes equal a fresh rendering. */
export const checkKernelSdk = (
  committed: string,
  corpus: KernelCorpus,
): KernelSdkCheck =>
  committed === renderKernelSdk(corpus)
    ? { ok: true }
    : {
      ok: false,
      reason: "committed plain-TypeScript SDK failed byte-identical regeneration",
    }
