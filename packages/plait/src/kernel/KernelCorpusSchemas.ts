/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The kernel-conformance interchange, as schemas.
 *
 * The interchange is a newline-delimited file the Lean kernel model emits so
 * that implementations which are not Lean can derive the same vocabulary
 * instead of retyping it. This module is the grammar of format 2 of that file,
 * written as Effect schemas: one schema per record type, each annotated with
 * the identifier, title, and description a reader (or a JSON Schema export, or
 * an error message) needs.
 *
 * Two rules shape every schema here.
 *
 * First, **every number is an unbounded non-negative integer** and its carrier
 * is `bigint`. An encoding vector is a product of multiplications, so it
 * leaves the range a JavaScript number can hold exactly; a schema that decoded
 * it to `number` would be silently wrong for large payloads rather than
 * loudly wrong.
 *
 * Second, **this module knows the grammar, not the corpus**. It is the floor
 * the corpus reader stands on, so it cannot be generated from the corpus it
 * reads. Everything the corpus itself supplies - the taught descriptions, the
 * example vectors, the kernel's own type vocabulary - lands in the generated
 * companion module instead.
 *
 * Nothing here promotes a model theorem into a runtime guarantee. These
 * schemas describe a file; conformance to the model's verdicts is checked by
 * replaying the model's own vectors against a runtime door.
 *
 * @module
 */
import { Schema } from "effect"

/** The interchange format this module reads. A consumer refuses any other. */
export const KERNEL_CORPUS_FORMAT = 2n

/**
 * The record groups, in the order the file carries them. Group order is part
 * of the grammar: a file that interleaves groups is a moved file.
 */
export const KERNEL_RECORD_GROUPS = [
  "kind",
  "stage",
  "refusal",
  "type",
  "encoding",
  "admission",
  "doc",
  "canon",
  "program",
  "run",
] as const

/** One record group of the interchange, after the header. */
export type KernelRecordGroup = (typeof KERNEL_RECORD_GROUPS)[number]

const nonNegative = Schema.makeFilter<bigint>(
  (value) => value >= 0n ? undefined : "expected a non-negative integer",
  { expected: "a non-negative integer" },
)

/**
 * An unbounded non-negative integer. The interchange's one numeric shape: no
 * fraction, no exponent, no sign, no width. Consumers parse it at arbitrary
 * precision, which on this side means `bigint`.
 */
export const KernelNat = Schema.BigInt.check(nonNegative).annotate({
  identifier: "KernelNat",
  title: "Nat",
  description:
    "An unbounded non-negative integer, written as minimal decimal. Carried as bigint because" +
    " encoded sentences exceed the range a JavaScript number holds exactly.",
})

/**
 * The header's per-group counts. Read as an open map rather than a closed
 * struct on purpose: the interchange's add-only rule lets a later format carry
 * a group this consumer does not know, and a count for an unknown group is
 * skipped with it rather than refused.
 */
export const KernelCounts = Schema.Record(Schema.String, KernelNat).annotate({
  identifier: "KernelCounts",
  title: "Record counts",
  description:
    "How many records of each group the file carries. A self-check, not a hint: a reader" +
    " compares each count it understands against the records it actually read.",
})

/** The provenance line every file opens with, and the counts it pins. */
export const KernelHeaderRecord = Schema.Struct({
  counts: KernelCounts,
  format: Schema.Literal(KERNEL_CORPUS_FORMAT),
  generator: Schema.String,
  record: Schema.Literal("header"),
  source: Schema.String,
}).annotate({
  identifier: "KernelHeaderRecord",
  title: "Header record",
  description:
    "Line one. Names the model the tables describe, the command that emitted them, the" +
    " interchange format, and the count of every record group.",
})

/** One declaration kind of the closed universe, with its wire-stable rank. */
export const KernelKindRecord = Schema.Struct({
  name: Schema.String,
  rank: KernelNat,
  record: Schema.Literal("kind"),
}).annotate({
  identifier: "KernelKindRecord",
  title: "Declaration kind record",
  description:
    "One category a name can refer to, with its rank. The rank is written into an encoded" +
    " sentence, so two systems disagreeing about it disagree about every declaration.",
})

/** One epistemic stage of a hole, with its ordinal rank. */
export const KernelStageRecord = Schema.Struct({
  name: Schema.String,
  rank: KernelNat,
  record: Schema.Literal("stage"),
}).annotate({
  identifier: "KernelStageRecord",
  title: "Hole stage record",
  description:
    "One stage a declared parameter passes through, with its rank. Ranks compare in the" +
    " reached-at-least direction only; the gap between two of them means nothing.",
})

/** How a taught repair may be applied. */
export const KernelApplicability = Schema.Literals([
  "machine-applicable",
  "advisory",
]).annotate({
  identifier: "KernelApplicability",
  title: "Applicability",
  description:
    "machine-applicable when the lawful rewrite is a function of the refused candidate alone;" +
    " advisory when the repair needs something the candidate does not carry.",
})

/** One taught refusal: the wire reason, the law it defends, the repair it teaches. */
export const KernelRefusalRecord = Schema.Struct({
  applicability: KernelApplicability,
  law: Schema.String,
  reason: Schema.String,
  record: Schema.Literal("refusal"),
  repair: Schema.String,
}).annotate({
  identifier: "KernelRefusalRecord",
  title: "Taught refusal record",
  description:
    "A reason the door rejects a sentence, carried with the rule it defends and the legal next" +
    " move. A reason without a law and a repair cannot exist in the model, so it cannot exist" +
    " here.",
})

/** One field of a constructor in the emitted type vocabulary. */
export const KernelFieldRecord = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
}).annotate({
  identifier: "KernelFieldRecord",
  title: "Constructor field",
  description:
    "A field name and a type reference. The reference is a small grammar: a leaf, a declared" +
    " type, or a one-argument container, optionally applied to brand arguments.",
})

/** One constructor of a type in the emitted type vocabulary. */
export const KernelConstructorRecord = Schema.Struct({
  fields: Schema.Array(KernelFieldRecord),
  name: Schema.String,
}).annotate({
  identifier: "KernelConstructorRecord",
  title: "Constructor",
  description:
    "One way to build a value of a type, and the fields it takes in declaration order. A" +
    " product type has exactly one, conventionally named mk.",
})

/** One parameter of a type, marked brand when it exists to keep values apart. */
export const KernelParamRecord = Schema.Struct({
  name: Schema.String,
  role: Schema.Literals(["brand", "type"]),
}).annotate({
  identifier: "KernelParamRecord",
  title: "Type parameter",
  description:
    "brand when the parameter exists to keep values apart rather than to carry data - the kind" +
    " of a digest, the register of a token. type is reserved for a genuine type parameter.",
})

/** One type of the model's emitted vocabulary. */
export const KernelTypeRecord = Schema.Struct({
  constructors: Schema.Array(KernelConstructorRecord),
  form: Schema.Literals(["inductive", "structure"]),
  name: Schema.String,
  params: Schema.Array(KernelParamRecord),
  record: Schema.Literal("type"),
}).annotate({
  identifier: "KernelTypeRecord",
  title: "Type record",
  description:
    "One type of the closed vocabulary: a sum type with several constructors, or a product" +
    " type with one. This is the shape an implementation mirrors in its own type system.",
})

/** One sentence-encoding vector, round-tripped by the emitter before it is written. */
export const KernelEncodingRecord = Schema.Struct({
  act: Schema.Array(KernelNat),
  name: Schema.String,
  record: Schema.Literal("encoding"),
}).annotate({
  identifier: "KernelEncodingRecord",
  title: "Encoding vector",
  description:
    "A lawful sentence in its canonical framing: a generator tag followed by that generator's" +
    " arguments. An act's identity is this framing, which is why the vector is the thing two" +
    " implementations must agree on.",
})

/** A planted candidate the door refused, and the reason it taught. */
export const KernelAdmissionRefusedRecord = Schema.Struct({
  name: Schema.String,
  reason: Schema.String,
  record: Schema.Literal("admission"),
  verdict: Schema.Literal("refused"),
}).annotate({
  identifier: "KernelAdmissionRefusedRecord",
  title: "Refused admission",
  description:
    "A committed unlawful candidate and the wire reason the door gave. One per taught refusal," +
    " so the refusal table is demonstrated rather than asserted.",
})

/** The lawful twin: a candidate the door admitted, and the sentence it became. */
export const KernelAdmissionAdmittedRecord = Schema.Struct({
  encoded: Schema.Array(KernelNat),
  name: Schema.String,
  record: Schema.Literal("admission"),
  verdict: Schema.Literal("admitted"),
}).annotate({
  identifier: "KernelAdmissionAdmittedRecord",
  title: "Admitted admission",
  description:
    "The lawful candidate and the encoding of the sentence it was admitted to. It exists to" +
    " refute the door that refuses everything: a suite of refusals alone proves nothing.",
})

/** One admission verdict, refused or admitted. */
export const KernelAdmissionRecord = Schema.Union([
  KernelAdmissionRefusedRecord,
  KernelAdmissionAdmittedRecord,
]).annotate({
  identifier: "KernelAdmissionRecord",
  title: "Admission record",
  description: "One door verdict for one planted candidate. The verdict selects the shape.",
})

/** One type's documentation, taken from the model's own source. */
export const KernelDocRecord = Schema.Struct({
  doc: Schema.String,
  name: Schema.String,
  record: Schema.Literal("doc"),
  target: Schema.Literal("type"),
}).annotate({
  identifier: "KernelDocRecord",
  title: "Documentation record",
  description:
    "The docstring the model attaches to one type, read out of the model's environment rather" +
    " than retyped. It is the description a generated schema, a rendered page, and an error" +
    " message all share.",
})

/** One canonical-form vector: a value, and the bytes it must serialize to. */
export const KernelCanonRecord = Schema.Struct({
  bytes: Schema.String,
  name: Schema.String,
  record: Schema.Literal("canon"),
  value: Schema.Unknown,
}).annotate({
  identifier: "KernelCanonRecord",
  title: "Canonical form vector",
  description:
    "A value paired with its one canonical serialization. Together the vectors pin member" +
    " order, escaping, the empty cases, and an integer past the range a double holds exactly.",
})

/**
 * One argument of a program node, as a tagged reference.
 *
 * Four forms and no fifth. A `digest` reaches outside the declaration and
 * carries the kind it is branded to, so the reference cannot be read without
 * its sort. A `local` names a prior node of this declaration, which makes the
 * reference a consumption and puts an edge in the edge list. A `hole` names
 * one of the declaration's own declared parameters, which makes the reference
 * a requirement and puts no edge anywhere. A `literal` carries an identity
 * label directly.
 *
 * There is deliberately no closure form. A computation is referenced by
 * digest; a function value has no canonical bytes and therefore no identity,
 * so it cannot be an argument here.
 */
export const KernelArgRef = Schema.Union([
  Schema.Struct({
    arg: Schema.Literal("digest"),
    id: KernelNat,
    kind: Schema.String,
  }),
  Schema.Struct({
    arg: Schema.Literal("hole"),
    name: KernelNat,
  }),
  Schema.Struct({
    arg: Schema.Literal("local"),
    name: KernelNat,
  }),
  Schema.Struct({
    arg: Schema.Literal("literal"),
    value: KernelNat,
  }),
]).annotate({
  identifier: "KernelArgRef",
  title: "Program argument reference",
  description:
    "A digest reference outside the declaration, a local name inside it, a declared parameter," +
    " or a literal identity label. The inside/outside discipline is the whole of it: a local" +
    " and a hole are meaningful only within the one canonical value.",
})

/** One declared parameter of a program: its local name and its schema. */
export const KernelProgramHole = Schema.Struct({
  name: KernelNat,
  schema: KernelNat,
}).annotate({
  identifier: "KernelProgramHole",
  title: "Program hole",
  description:
    "A declared parameter, not a wildcard: a local name and the identity of the schema its" +
    " filling must satisfy. Holes ascend by name, so the list is a set with a canonical order.",
})

/** One consumption edge of a program: the younger node and the older one it reads. */
export const KernelProgramEdge = Schema.Struct({
  from: KernelNat,
  to: KernelNat,
}).annotate({
  identifier: "KernelProgramEdge",
  title: "Program edge",
  description:
    "One consumption, made explicit: `from` is the consuming node, `to` is the consumed one." +
    " The edge list is redundant with the local argument references by construction, which is" +
    " what makes a producer that drops one detectable.",
})

/** One node of a program declaration: a local name, a generator, and its arguments. */
export const KernelProgramNode = Schema.Struct({
  args: Schema.Record(Schema.String, KernelArgRef),
  generator: Schema.String,
  name: KernelNat,
}).annotate({
  identifier: "KernelProgramNode",
  title: "Program node",
  description:
    "One generator application: the generator's name, the local name the node answers to, and" +
    " its wired arguments, keyed by the model's own field names rather than by position. The" +
    " map is partial - a field the declaration form carries no reference for, or one the node" +
    " leaves unwired, is absent rather than filled with a placeholder.",
})

/**
 * A program declaration: the canonical value whose bytes are its identity.
 *
 * Nodes are newest first, which is the house ledger orientation and the
 * orientation the model's admission relation reads: a node may consume only
 * names that appear after it, because those are the ones already admitted.
 */
export const KernelProgramDeclaration = Schema.Struct({
  edges: Schema.Array(KernelProgramEdge),
  holes: Schema.Array(KernelProgramHole),
  lineage: Schema.Array(KernelNat),
  nodes: Schema.Array(KernelProgramNode),
}).annotate({
  identifier: "KernelProgramDeclaration",
  title: "Program declaration",
  description:
    "The DAG of generator applications a program declares, newest node first, with its" +
    " consumption edges, its declared parameters, and its lineage. This value's canonical" +
    " bytes are the program's identity; nothing here describes a run.",
})

/** One program vector: a declaration and the bytes it must serialize to. */
export const KernelProgramRecord = Schema.Struct({
  bytes: Schema.String,
  declaration: KernelProgramDeclaration,
  name: Schema.String,
  record: Schema.Literal("program"),
}).annotate({
  identifier: "KernelProgramRecord",
  title: "Program vector",
  description:
    "A named program declaration paired with its canonical serialization. As with a canonical" +
    " form vector, the pairing self-tests every consumer: canonicalizing the declaration must" +
    " reproduce the bytes exactly.",
})

/**
 * One catalogued reference of a run's door: an identity label and the kind it
 * is branded by. The pair is the model's own `Ref`, written out rather than
 * abbreviated, because a label without its brand names nothing.
 */
export const KernelRunRef = Schema.Struct({
  id: KernelNat,
  kind: Schema.String,
}).annotate({
  identifier: "KernelRunRef",
  title: "Run door reference",
  description:
    "One already-admitted referent the run's door held, as an identity label and a declaration" +
    " kind.",
})

/** The admission context one run was judged at. */
export const KernelRunContext = Schema.Struct({
  catalog: Schema.Array(KernelRunRef),
  pinned: Schema.Array(KernelRunRef),
}).annotate({
  identifier: "KernelRunContext",
  title: "Run door",
  description:
    "The door the run was judged at: the already-admitted catalog and the universe the acting" +
    " writ pins. It rides with the run so every verdict in the row is reproducible from the row.",
})

/**
 * The value a `predicate` supply carries. Written out because the grammar
 * refers to itself through negation, and a suspended schema needs a type to be
 * annotated with.
 */
export type KernelRunPredicateValue =
  | { readonly production: "evidenceAppears"; readonly lane: bigint; readonly pattern: bigint }
  | { readonly production: "cellReaches"; readonly cell: bigint; readonly threshold: bigint }
  | { readonly production: "holeReaches"; readonly hole: bigint; readonly stage: bigint }
  | { readonly production: "outcomeLanded"; readonly register: bigint }
  | {
    readonly production: "headAdvancedPast"
    readonly lane: bigint
    readonly shard: bigint
    readonly position: bigint
  }
  | { readonly production: "onAbsence"; readonly subject: bigint }
  | { readonly production: "negation"; readonly inner: KernelRunPredicateValue }
  | { readonly production: "deadline"; readonly tick: bigint }
  | { readonly production: "absentEverywhere"; readonly cell: bigint }

/**
 * The candidate trigger grammar at the interchange's spelling: the production
 * names the shape, and the unlawful productions are spellable here for the same
 * reason they are spellable in the model — a grammar that cannot say the
 * refused thing cannot demonstrate the refusal.
 */
export const KernelRunPredicate: Schema.Codec<KernelRunPredicateValue> = Schema.Union([
  Schema.Struct({
    production: Schema.Literal("evidenceAppears"),
    lane: KernelNat,
    pattern: KernelNat,
  }),
  Schema.Struct({
    production: Schema.Literal("cellReaches"),
    cell: KernelNat,
    threshold: KernelNat,
  }),
  Schema.Struct({
    production: Schema.Literal("holeReaches"),
    hole: KernelNat,
    stage: KernelNat,
  }),
  Schema.Struct({ production: Schema.Literal("outcomeLanded"), register: KernelNat }),
  Schema.Struct({
    production: Schema.Literal("headAdvancedPast"),
    lane: KernelNat,
    shard: KernelNat,
    position: KernelNat,
  }),
  Schema.Struct({ production: Schema.Literal("onAbsence"), subject: KernelNat }),
  Schema.Struct({
    production: Schema.Literal("negation"),
    inner: Schema.suspend((): Schema.Codec<KernelRunPredicateValue> => KernelRunPredicate),
  }),
  Schema.Struct({ production: Schema.Literal("deadline"), tick: KernelNat }),
  Schema.Struct({ production: Schema.Literal("absentEverywhere"), cell: KernelNat }),
]).annotate({
  identifier: "KernelRunPredicate",
  title: "Run trigger production",
  description:
    "One candidate trigger production, as an execution-time supply. The production field names" +
    " the shape, and negation carries another production inside it.",
})

/**
 * One execution-time supply of a run, bound to the node it completes.
 *
 * The slot selects the shape, which is what lets a reader take the row without
 * knowing which generator the node applies. Four of the five slots are the
 * fields the model's own declaration form leaves absent — a declare's kind, a
 * fold's anchor, a decide's token, a trigger's predicate. The fifth,
 * `strategy`, is the one slot a candidate carries that no intrinsic sentence
 * does: `CandidateAct.join` takes a merge strategy and `Act.join` drops it, so
 * no declaration form can write one and no field table read off `Act` can name
 * one. It is carried here because the completion had to answer for it.
 */
export const KernelRunSupply = Schema.Union([
  Schema.Struct({
    bound: Schema.String,
    node: KernelNat,
    slot: Schema.Literal("kind"),
  }),
  Schema.Struct({
    bound: Schema.Struct({
      floor: KernelNat,
      foldId: KernelNat,
      head: KernelNat,
      lane: KernelNat,
      shard: KernelNat,
      state: KernelNat,
    }),
    node: KernelNat,
    slot: Schema.Literal("anchor"),
  }),
  Schema.Struct({
    bound: Schema.Struct({ register: KernelNat, value: KernelNat }),
    node: KernelNat,
    slot: Schema.Literal("token"),
  }),
  Schema.Struct({
    bound: KernelRunPredicate,
    node: KernelNat,
    slot: Schema.Literal("predicate"),
  }),
  Schema.Struct({
    bound: Schema.Struct({
      algebra: KernelNat,
      merge: Schema.Literals(["declaredAlgebra", "lastWriterWins"]),
    }),
    node: KernelNat,
    slot: Schema.Literal("strategy"),
  }),
]).annotate({
  identifier: "KernelRunSupply",
  title: "Run supply",
  description:
    "One candidate slot the declaration form carries no reference for, bound at the node it" +
    " completes. The slot selects the shape of what is bound.",
})

/**
 * One judged node of a run: the node's local name, the generator it applied,
 * the tags of the payload atoms the door swept, and the verdict.
 *
 * The payload is tags and not values on purpose. A run's identity labels are
 * the model's own small naturals; a runtime reasons in content addresses, and
 * comparing the two would fail for a reason that is not a defect. What the tags
 * state survives every relabelling: a consumed local must reach the door as a
 * literal, an unfilled hole must reach it as a hole.
 */
export const KernelRunStep = Schema.Struct({
  generator: Schema.String,
  node: KernelNat,
  payload: Schema.Array(Schema.String),
  verdict: Schema.Literal("admitted"),
}).annotate({
  identifier: "KernelRunStep",
  title: "Run step",
  description:
    "One node the door admitted, in walked order, with the tags of the payload atoms it swept.",
})

/**
 * How one run ended.
 *
 * Two of the three arms are the model's own `RunOutcome`: a run lands, or it
 * meets a taught refusal at a node and the tail is never judged. The third is
 * NOT the model's, and says so. `RunOutcome` has two arms because the model's
 * completion is total — it always produces a candidate — while a carriage's
 * does not: a slot may be unwired by the declaration, unsupplied by the run, or
 * consume a local that never landed, and then the door is never reached and
 * there is no door verdict to report. A row carrying `unspeakable` is a witness
 * that a program the admission relation accepts is not thereby executable, and
 * it records which node, which slot, and which of the four ways the slot had no
 * value.
 */
export const KernelRunOutcome = Schema.Union([
  Schema.Struct({
    outcome: Schema.Literal("landed"),
    steps: Schema.Array(KernelRunStep),
  }),
  Schema.Struct({
    node: KernelNat,
    outcome: Schema.Literal("refused"),
    reason: Schema.String,
    steps: Schema.Array(KernelRunStep),
  }),
  Schema.Struct({
    detail: Schema.Literals(["unwired", "unsupplied", "unlanded", "unbranded"]),
    generator: Schema.String,
    node: KernelNat,
    outcome: Schema.Literal("unspeakable"),
    slot: Schema.String,
    steps: Schema.Array(KernelRunStep),
  }),
]).annotate({
  identifier: "KernelRunOutcome",
  title: "Run outcome",
  description:
    "A run that landed, a run the door refused at a named node, or a run whose completion could" +
    " not speak a node at all. The third arm is the carriage's, not the door's.",
})

/**
 * One run vector: an execution of a program the corpus itself carries.
 *
 * The record is a claim, not a transcript. It states the door, the writ and the
 * supplies the completion read, so a consumer holding the corpus's own program
 * declaration can recompute the outcome and compare. As with a canonical form
 * vector, the `bytes` field pairs the answer with the question: canonicalizing
 * `outcome` must reproduce it exactly.
 */
export const KernelRunRecord = Schema.Struct({
  bytes: Schema.String,
  context: KernelRunContext,
  name: Schema.String,
  outcome: KernelRunOutcome,
  program: Schema.String,
  record: Schema.Literal("run"),
  supplies: Schema.Array(KernelRunSupply),
  writ: KernelNat,
}).annotate({
  identifier: "KernelRunRecord",
  title: "Run vector",
  description:
    "One execution of one committed program declaration: the door it was judged at, the writ it" +
    " acted under, the execution-time supplies its completion read, the outcome, and the" +
    " outcome's own canonical bytes.",
})

/**
 * Any record of the interchange. Members are tried in file-group order, which
 * is also the order a reader meets them.
 */
export const KernelCorpusRecord = Schema.Union([
  KernelHeaderRecord,
  KernelKindRecord,
  KernelStageRecord,
  KernelRefusalRecord,
  KernelTypeRecord,
  KernelEncodingRecord,
  KernelAdmissionRefusedRecord,
  KernelAdmissionAdmittedRecord,
  KernelDocRecord,
  KernelCanonRecord,
  KernelProgramRecord,
  KernelRunRecord,
]).annotate({
  identifier: "KernelCorpusRecord",
  title: "Corpus record",
  description: "One line of the interchange file, whichever group it belongs to.",
})

/** The header line, decoded. */
export type KernelHeaderRecord = typeof KernelHeaderRecord.Type
/** One declaration-kind line, decoded. */
export type KernelKindRecord = typeof KernelKindRecord.Type
/** One hole-stage line, decoded. */
export type KernelStageRecord = typeof KernelStageRecord.Type
/** One taught-refusal line, decoded. */
export type KernelRefusalRecord = typeof KernelRefusalRecord.Type
/** One type line, decoded. */
export type KernelTypeRecord = typeof KernelTypeRecord.Type
/** One constructor of a type line, decoded. */
export type KernelConstructorRecord = typeof KernelConstructorRecord.Type
/** One field of a constructor, decoded. */
export type KernelFieldRecord = typeof KernelFieldRecord.Type
/** One type parameter, decoded. */
export type KernelParamRecord = typeof KernelParamRecord.Type
/** One encoding vector, decoded. */
export type KernelEncodingRecord = typeof KernelEncodingRecord.Type
/** One admission verdict, decoded. */
export type KernelAdmissionRecord = typeof KernelAdmissionRecord.Type
/** One documentation line, decoded. */
export type KernelDocRecord = typeof KernelDocRecord.Type
/** One canonical-form vector, decoded. */
export type KernelCanonRecord = typeof KernelCanonRecord.Type
/** One program argument reference, decoded. */
export type KernelArgRef = typeof KernelArgRef.Type
/** One declared program parameter, decoded. */
export type KernelProgramHole = typeof KernelProgramHole.Type
/** One program consumption edge, decoded. */
export type KernelProgramEdge = typeof KernelProgramEdge.Type
/** One program node, decoded. */
export type KernelProgramNode = typeof KernelProgramNode.Type
/** One program declaration, decoded. */
export type KernelProgramDeclaration = typeof KernelProgramDeclaration.Type
/** One program vector line, decoded. */
export type KernelProgramRecord = typeof KernelProgramRecord.Type
/** One run door reference, decoded. */
export type KernelRunRef = typeof KernelRunRef.Type
/** One run's admission context, decoded. */
export type KernelRunContext = typeof KernelRunContext.Type
/** One execution-time supply, decoded. */
export type KernelRunSupply = typeof KernelRunSupply.Type
/** One judged node of a run, decoded. */
export type KernelRunStep = typeof KernelRunStep.Type
/** How one run ended, decoded. */
export type KernelRunOutcome = typeof KernelRunOutcome.Type
/** One run vector line, decoded. */
export type KernelRunRecord = typeof KernelRunRecord.Type
/** Any line of the interchange, decoded. */
export type KernelCorpusRecord = typeof KernelCorpusRecord.Type

/** The schema for one record group, keyed by the group's discriminator. */
export const KERNEL_RECORD_SCHEMA = {
  kind: KernelKindRecord,
  stage: KernelStageRecord,
  refusal: KernelRefusalRecord,
  type: KernelTypeRecord,
  encoding: KernelEncodingRecord,
  admission: KernelAdmissionRecord,
  doc: KernelDocRecord,
  canon: KernelCanonRecord,
  program: KernelProgramRecord,
  run: KernelRunRecord,
} as const satisfies { readonly [Group in KernelRecordGroup]: Schema.Top }
