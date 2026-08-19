/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * GENERATED FILE - DO NOT EDIT.
 *
 * Corpus:  packages/plait/fixtures/kernel-conformance.ndjson
 * Command: bun run generate:kernel-schemas
 * Source:  verify/kernel, emitted by "verify/unity emit"
 *          at interchange format 2.
 *
 * The interchange as schemas, in two halves.
 *
 * The record schemas re-export the hand-written grammar of the file with the
 * examples the corpus supplies. The grammar itself cannot be generated from
 * the file it reads, so it stays hand-written next door; what is generated is
 * every example, taken from a real record rather than invented.
 *
 * The mini-AST schemas are the model's own type vocabulary. Their shape comes
 * from the type records, their description from the docstring the model
 * carries, their title from that docstring's first sentence. A sentence
 * written once in the model reaches an agent's tool description with no human
 * in the path, and a drifted description is a failing check rather than a
 * rotting comment.
 *
 * Numbers are bigint everywhere. The interchange's integers are unbounded and
 * an encoded sentence already exceeds what a JavaScript number holds exactly.
 *
 * Brand arguments are dropped here. TypeScript erases, so one schema describes
 * every brand of a shape; the compile-time separation is generated into
 * KernelTables.generated.ts, where the branded aliases live.
 *
 * These are safety-side shapes and texts, never runtime guarantees. A model
 * theorem stays in the model.
 *
 * @module
 */
import { Schema } from "effect"

import * as Grammar from "./KernelCorpusSchemas.js"

/** Where these schemas came from, carried as data for a consumer to assert. */
export const KERNEL_SCHEMA_PROVENANCE = {
  command: "bun run generate:kernel-schemas",
  corpus: "packages/plait/fixtures/kernel-conformance.ndjson",
  format: 2n,
  generator: "verify/unity emit",
  source: "verify/kernel",
} as const

/**
 * An unbounded non-negative integer, the interchange's one numeric shape.
 * Re-exported so a generated schema and the grammar it extends cannot drift
 * onto two different carriers.
 */
export const KernelNat = Grammar.KernelNat

/**
 * The annotation key carrying each schema's examples as canonical byte
 * strings, beside the `examples` key carrying them as values.
 *
 * It exists because of a measured gap. A JSON Schema export describes the
 * encoded view, JSON has no unbounded integer, and Effect drops the whole
 * `examples` key - silently, not partially - when any example holds a
 * bigint. Nearly every record here holds one, so the examples that matter
 * most would never reach a reader of the export. The canonical bytes are
 * strings, they survive the export, and they are the exact bytes the
 * interchange carries, so nothing is approximated to make them fit.
 *
 * Read them with:
 * `Schema.toJsonSchemaDocument(schema, { includeAnnotationKey: (key) =>`
 * `key === KERNEL_CANONICAL_EXAMPLES_KEY })`.
 */
export const KERNEL_CANONICAL_EXAMPLES_KEY = "canonicalExamples"

// ---------------------------------------------------------------------------
// The interchange records, annotated with the corpus's own examples.
// ---------------------------------------------------------------------------

/** The provenance line, with the counts it pins. Examples are real records from the corpus. */
export const KernelHeaderRecord = Grammar.KernelHeaderRecord.annotate({
  canonicalExamples: [
    "{\"counts\":{\"admission\":19,\"canon\":10,\"doc\":25,\"encoding\":12,\"kind\":12,\"model-admission\":2,\"program\":4,\"refusal\":16,\"stage\":5,\"type\":25},\"format\":2,\"generator\":\"verify/unity emit\",\"record\":\"header\",\"source\":\"verify/kernel\"}",
  ],
  examples: [
    {
      counts: {
        admission: 19n,
        canon: 10n,
        doc: 25n,
        encoding: 12n,
        kind: 12n,
        "model-admission": 2n,
        program: 4n,
        refusal: 16n,
        stage: 5n,
        type: 25n,
      },
      format: 2n,
      generator: "verify/unity emit",
      record: "header",
      source: "verify/kernel",
    },
  ],
})

/** One declaration kind of the closed universe. Examples are real records from the corpus. */
export const KernelKindRecord = Grammar.KernelKindRecord.annotate({
  canonicalExamples: [
    "{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}",
  ],
  examples: [
    { name: "schema", rank: 0n, record: "kind" },
  ],
})

/** One epistemic stage of a hole. Examples are real records from the corpus. */
export const KernelStageRecord = Grammar.KernelStageRecord.annotate({
  canonicalExamples: [
    "{\"name\":\"opened\",\"rank\":0,\"record\":\"stage\"}",
  ],
  examples: [
    { name: "opened", rank: 0n, record: "stage" },
  ],
})

/**
 * One taught refusal: the law it defends, the repair it teaches. Examples are real records from
 * the corpus.
 */
export const KernelRefusalRecord = Grammar.KernelRefusalRecord.annotate({
  canonicalExamples: [
    "{\"applicability\":\"advisory\",\"law\":\"the fold carrier has no clock parameter (f11_query_deterministic)\",\"reason\":\"clock-read\",\"record\":\"refusal\",\"repair\":\"emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value\"}",
  ],
  examples: [
    {
      applicability: "advisory",
      law: "the fold carrier has no clock parameter (f11_query_deterministic)",
      reason: "clock-read",
      record: "refusal",
      repair: "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value",
    },
  ],
})

/** One type of the model's emitted vocabulary. Examples are real records from the corpus. */
export const KernelTypeRecord = Grammar.KernelTypeRecord.annotate({
  canonicalExamples: [
    "{\"constructors\":[{\"fields\":[],\"name\":\"schema\"},{\"fields\":[],\"name\":\"program\"},{\"fields\":[],\"name\":\"policy\"},{\"fields\":[],\"name\":\"capability\"},{\"fields\":[],\"name\":\"lane\"},{\"fields\":[],\"name\":\"algebra\"},{\"fields\":[],\"name\":\"index\"},{\"fields\":[],\"name\":\"resource\"},{\"fields\":[],\"name\":\"ontology\"},{\"fields\":[],\"name\":\"schedule\"},{\"fields\":[],\"name\":\"template\"},{\"fields\":[],\"name\":\"language\"}],\"form\":\"inductive\",\"name\":\"DeclKind\",\"params\":[],\"record\":\"type\"}",
  ],
  examples: [
    {
      constructors: [
        { fields: [], name: "schema" },
        { fields: [], name: "program" },
        { fields: [], name: "policy" },
        { fields: [], name: "capability" },
        { fields: [], name: "lane" },
        { fields: [], name: "algebra" },
        { fields: [], name: "index" },
        { fields: [], name: "resource" },
        { fields: [], name: "ontology" },
        { fields: [], name: "schedule" },
        { fields: [], name: "template" },
        { fields: [], name: "language" },
      ],
      form: "inductive",
      name: "DeclKind",
      params: [],
      record: "type",
    },
  ],
})

/** One sentence in its canonical framing. Examples are real records from the corpus. */
export const KernelEncodingRecord = Grammar.KernelEncodingRecord.annotate({
  canonicalExamples: [
    "{\"act\":[0,0,7000051000172,4],\"name\":\"lawful-declare\",\"record\":\"encoding\"}",
    "{\"act\":[1,0,8],\"name\":\"resolve-schema\",\"record\":\"encoding\"}",
    "{\"act\":[2,1,42],\"name\":\"emit-lane\",\"record\":\"encoding\"}",
    "{\"act\":[3,6,42],\"name\":\"join-cell\",\"record\":\"encoding\"}",
    "{\"act\":[4,2,1,0,4,11,6,13],\"name\":\"fold-at-anchor\",\"record\":\"encoding\"}",
    "{\"act\":[5,3,7,42],\"name\":\"decide-fenced\",\"record\":\"encoding\"}",
    "{\"act\":[6,0,1,17,0,3],\"name\":\"trigger-evidence-appears\",\"record\":\"encoding\"}",
    "{\"act\":[6,1,6,23,0,3],\"name\":\"trigger-cell-reaches\",\"record\":\"encoding\"}",
    "{\"act\":[6,2,0,3,0,3],\"name\":\"trigger-hole-reaches\",\"record\":\"encoding\"}",
    "{\"act\":[6,3,3,0,0,3],\"name\":\"trigger-outcome-landed\",\"record\":\"encoding\"}",
    "{\"act\":[6,4,1,0,6,3],\"name\":\"trigger-head-advanced-past\",\"record\":\"encoding\"}",
    "{\"act\":[7,4,5],\"name\":\"spawn-under-writ\",\"record\":\"encoding\"}",
  ],
  examples: [
    { act: [0n, 0n, 7000051000172n, 4n], name: "lawful-declare", record: "encoding" },
    { act: [1n, 0n, 8n], name: "resolve-schema", record: "encoding" },
    { act: [2n, 1n, 42n], name: "emit-lane", record: "encoding" },
    { act: [3n, 6n, 42n], name: "join-cell", record: "encoding" },
    { act: [4n, 2n, 1n, 0n, 4n, 11n, 6n, 13n], name: "fold-at-anchor", record: "encoding" },
    { act: [5n, 3n, 7n, 42n], name: "decide-fenced", record: "encoding" },
    { act: [6n, 0n, 1n, 17n, 0n, 3n], name: "trigger-evidence-appears", record: "encoding" },
    { act: [6n, 1n, 6n, 23n, 0n, 3n], name: "trigger-cell-reaches", record: "encoding" },
    { act: [6n, 2n, 0n, 3n, 0n, 3n], name: "trigger-hole-reaches", record: "encoding" },
    { act: [6n, 3n, 3n, 0n, 0n, 3n], name: "trigger-outcome-landed", record: "encoding" },
    { act: [6n, 4n, 1n, 0n, 6n, 3n], name: "trigger-head-advanced-past", record: "encoding" },
    { act: [7n, 4n, 5n], name: "spawn-under-writ", record: "encoding" },
  ],
})

/** A planted candidate the door refused. Examples are real records from the corpus. */
export const KernelAdmissionRefusedRecord = Grammar.KernelAdmissionRefusedRecord.annotate({
  canonicalExamples: [
    "{\"name\":\"clockFold\",\"reason\":\"clock-read\",\"record\":\"admission\",\"verdict\":\"refused\"}",
  ],
  examples: [
    { name: "clockFold", reason: "clock-read", record: "admission", verdict: "refused" },
  ],
})

/** The lawful twin the door admitted. Examples are real records from the corpus. */
export const KernelAdmissionAdmittedRecord = Grammar.KernelAdmissionAdmittedRecord.annotate({
  canonicalExamples: [
    "{\"encoded\":[0,0,7000051000172,4],\"name\":\"lawfulDeclare\",\"record\":\"admission\",\"verdict\":\"admitted\"}",
  ],
  examples: [
    {
      encoded: [0n, 0n, 7000051000172n, 4n],
      name: "lawfulDeclare",
      record: "admission",
      verdict: "admitted",
    },
  ],
})

/**
 * One type's docstring, read out of the model's environment. Examples are real records from the
 * corpus.
 */
export const KernelDocRecord = Grammar.KernelDocRecord.annotate({
  canonicalExamples: [
    "{\"doc\":\"The closed universe of declaration kinds. One brand per kind: a\\ndigest is always the digest of a declaration of a known kind. \",\"name\":\"DeclKind\",\"record\":\"doc\",\"target\":\"type\"}",
  ],
  examples: [
    {
      doc: "The closed universe of declaration kinds. One brand per kind: a\ndigest is always the digest of a declaration of a known kind. ",
      name: "DeclKind",
      record: "doc",
      target: "type",
    },
  ],
})

/**
 * One canonical-form vector: a value and the bytes it must produce. Examples are real records
 * from the corpus.
 */
export const KernelCanonRecord = Grammar.KernelCanonRecord.annotate({
  canonicalExamples: [
    "{\"bytes\":\"{}\",\"name\":\"empty-object\",\"record\":\"canon\",\"value\":{}}",
    "{\"bytes\":\"[]\",\"name\":\"empty-array\",\"record\":\"canon\",\"value\":[]}",
    "{\"bytes\":\"\\\"\\\"\",\"name\":\"empty-string\",\"record\":\"canon\",\"value\":\"\"}",
    "{\"bytes\":\"0\",\"name\":\"zero\",\"record\":\"canon\",\"value\":0}",
    "{\"bytes\":\"9007199254740993\",\"name\":\"big-integer\",\"record\":\"canon\",\"value\":9007199254740993}",
    "{\"bytes\":\"{\\\"a\\\":2,\\\"b\\\":1}\",\"name\":\"key-order\",\"record\":\"canon\",\"value\":{\"a\":2,\"b\":1}}",
    "{\"bytes\":\"{\\\"z\\\":{\\\"y\\\":[3,4]}}\",\"name\":\"nested-object\",\"record\":\"canon\",\"value\":{\"z\":{\"y\":[3,4]}}}",
    "{\"bytes\":\"[[],[{}]]\",\"name\":\"nested-array\",\"record\":\"canon\",\"value\":[[],[{}]]}",
    "{\"bytes\":\"\\\"a\\\\\\\"b\\\\\\\\c\\\\nd\\\\te\\\"\",\"name\":\"string-escapes\",\"record\":\"canon\",\"value\":\"a\\\"b\\\\c\\nd\\te\"}",
    "{\"bytes\":\"\\\"\\\\u0001\\\"\",\"name\":\"control-char\",\"record\":\"canon\",\"value\":\"\\u0001\"}",
  ],
  examples: [
    { bytes: "{}", name: "empty-object", record: "canon", value: {} },
    { bytes: "[]", name: "empty-array", record: "canon", value: [] },
    { bytes: "\"\"", name: "empty-string", record: "canon", value: "" },
    { bytes: "0", name: "zero", record: "canon", value: 0n },
    {
      bytes: "9007199254740993",
      name: "big-integer",
      record: "canon",
      value: 9007199254740993n,
    },
    { bytes: "{\"a\":2,\"b\":1}", name: "key-order", record: "canon", value: { a: 2n, b: 1n } },
    {
      bytes: "{\"z\":{\"y\":[3,4]}}",
      name: "nested-object",
      record: "canon",
      value: { z: { y: [3n, 4n] } },
    },
    { bytes: "[[],[{}]]", name: "nested-array", record: "canon", value: [[], [{}]] },
    {
      bytes: "\"a\\\"b\\\\c\\nd\\te\"",
      name: "string-escapes",
      record: "canon",
      value: "a\"b\\c\nd\te",
    },
    { bytes: "\"\\u0001\"", name: "control-char", record: "canon", value: "\u0001" },
  ],
})

/**
 * One program declaration and the bytes that are its identity. Examples are real records from
 * the corpus.
 */
export const KernelProgramRecord = Grammar.KernelProgramRecord.annotate({
  canonicalExamples: [
    "{\"bytes\":\"{\\\"edges\\\":[{\\\"from\\\":2,\\\"to\\\":1}],\\\"holes\\\":[],\\\"lineage\\\":[],\\\"nodes\\\":[{\\\"args\\\":{\\\"body\\\":{\\\"arg\\\":\\\"local\\\",\\\"name\\\":1}},\\\"generator\\\":\\\"emit\\\",\\\"name\\\":2},{\\\"args\\\":{},\\\"generator\\\":\\\"declare\\\",\\\"name\\\":1}]}\",\"declaration\":{\"edges\":[{\"from\":2,\"to\":1}],\"holes\":[],\"lineage\":[],\"nodes\":[{\"args\":{\"body\":{\"arg\":\"local\",\"name\":1}},\"generator\":\"emit\",\"name\":2},{\"args\":{},\"generator\":\"declare\",\"name\":1}]},\"name\":\"ground-two-node\",\"record\":\"program\"}",
  ],
  examples: [
    {
      bytes: "{\"edges\":[{\"from\":2,\"to\":1}],\"holes\":[],\"lineage\":[],\"nodes\":[{\"args\":{\"body\":{\"arg\":\"local\",\"name\":1}},\"generator\":\"emit\",\"name\":2},{\"args\":{},\"generator\":\"declare\",\"name\":1}]}",
      declaration: {
        edges: [{ from: 2n, to: 1n }],
        holes: [],
        lineage: [],
        nodes: [
          { args: { body: { arg: "local", name: 1n } }, generator: "emit", name: 2n },
          { args: {}, generator: "declare", name: 1n },
        ],
      },
      name: "ground-two-node",
      record: "program",
    },
  ],
})

/** One admission verdict, refused or admitted, with both shapes exemplified. */
export const KernelAdmissionRecord = Schema.Union([
  KernelAdmissionRefusedRecord,
  KernelAdmissionAdmittedRecord,
]).annotate({
  identifier: "KernelAdmissionRecord",
  title: "Admission record",
  description: "One door verdict for one planted candidate. The verdict selects the shape.",
  canonicalExamples: [
    "{\"name\":\"clockFold\",\"reason\":\"clock-read\",\"record\":\"admission\",\"verdict\":\"refused\"}",
    "{\"encoded\":[0,0,7000051000172,4],\"name\":\"lawfulDeclare\",\"record\":\"admission\",\"verdict\":\"admitted\"}",
  ],
  examples: [
    { name: "clockFold", reason: "clock-read", record: "admission", verdict: "refused" },
    {
      encoded: [0n, 0n, 7000051000172n, 4n],
      name: "lawfulDeclare",
      record: "admission",
      verdict: "admitted",
    },
  ],
})

/** Every interchange record schema, keyed by its record group. */
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
} as const

// ---------------------------------------------------------------------------
// The model's type vocabulary. Shapes from the type records, prose from the
// doc records; the closed list, in the model's declaration order.
// ---------------------------------------------------------------------------

/**
 * The value CandidatePredicate carries. Written out because CandidatePredicate refers to
 * itself, and a suspended schema needs a type to be annotated with.
 */
export type KernelCandidatePredicateValue =
  | { readonly _tag: "evidenceAppears"; readonly lane: bigint; readonly pattern: bigint }
  | { readonly _tag: "cellReaches"; readonly cell: bigint; readonly threshold: bigint }
  | { readonly _tag: "holeReaches"; readonly hole: bigint; readonly stage: bigint }
  | { readonly _tag: "outcomeLanded"; readonly register: bigint }
  | {
    readonly _tag: "headAdvancedPast"
    readonly lane: bigint
    readonly shard: bigint
    readonly position: bigint
  }
  | { readonly _tag: "onAbsence"; readonly subject: bigint }
  | { readonly _tag: "negation"; readonly inner: KernelCandidatePredicateValue }
  | { readonly _tag: "deadline"; readonly tick: bigint }
  | { readonly _tag: "absentEverywhere"; readonly cell: bigint }

/**
 * The closed universe of declaration kinds. One brand per kind: a
 * digest is always the digest of a declaration of a known kind.
 */
export const KernelDeclKind = Schema.Literals([
  "schema",
  "program",
  "policy",
  "capability",
  "lane",
  "algebra",
  "index",
  "resource",
  "ontology",
  "schedule",
  "template",
  "language",
]).annotate({
  identifier: "KernelDeclKind",
  title: "The closed universe of declaration kinds.",
  description:
    "The closed universe of declaration kinds. One brand per kind: a\ndigest is always the "
    + "digest of a declaration of a known kind. ",
})

/**
 * The value DeclKind carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelDeclKindValue = typeof KernelDeclKind.Type

/**
 * A kind-tagged reference: the one lawful way a heterogeneous collection of
 * digests is carried. The model spells it as an abbreviation rather than a
 * declaration, so it has no type record of its own and is expanded here.
 */
export const KernelRef = Schema.Struct({
  id: KernelNat,
  kind: KernelDeclKind,
}).annotate({
  identifier: "KernelRef",
  title: "A kind-tagged reference.",
  description:
    "The pair of a declaration kind and an identifier. It appears wherever a collection holds "
    + "digests of several kinds at once, so that the kind travels with the identifier instead of "
    + "being inferred from context.",
})

/**
 * The value KernelRef carries, named here so a consumer re-exports this
 * declaration instead of restating the type as one of its own.
 */
export type KernelRefValue = typeof KernelRef.Type

/**
 * A content address branded by the declaration kind it names. Digests
 * are modeled as identity labels; that a real digest is a hash over
 * one canonical byte form stays in the trusted base. A digest of one
 * kind never compares with a digest of another: the comparison has no
 * type, which is the referent-pinning discipline carried by the sort
 * system itself.
 */
export const KernelDigest = Schema.Struct({ id: KernelNat }).annotate({
  identifier: "KernelDigest",
  title: "A content address branded by the declaration kind it names.",
  description:
    "A content address branded by the declaration kind it names. Digests\nare modeled as "
    + "identity labels; that a real digest is a hash over\none canonical byte form stays in the "
    + "trusted base. A digest of one\nkind never compares with a digest of another: the "
    + "comparison has no\ntype, which is the referent-pinning discipline carried by the "
    + "sort\nsystem itself. Branded in the model by kind; the brand is erased here and carried by "
    + "the generated aliases instead.",
})

/**
 * The value Digest carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelDigestValue = typeof KernelDigest.Type

/**
 * An immutable value at its canonical byte form, modeled as an opaque
 * identity label. Canonical-byte identity (one value, one byte form)
 * is the certifier's own wall and is not restated here.
 */
export const KernelValue = Schema.Struct({ bytes: KernelNat }).annotate({
  identifier: "KernelValue",
  title: "An immutable value at its canonical byte form, modeled as an opaque",
  description:
    "An immutable value at its canonical byte form, modeled as an opaque\nidentity label. "
    + "Canonical-byte identity (one value, one byte form)\nis the certifier's own wall and is not "
    + "restated here. ",
})

/**
 * The value Value carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelValueValue = typeof KernelValue.Type

/**
 * The digest of a fold state: a value identity, never a declaration
 * identity. Its own sort keeps it out of every declaration-digest
 * position.
 */
export const KernelStateLabel = Schema.Struct({ value: KernelNat }).annotate({
  identifier: "KernelStateLabel",
  title: "The digest of a fold state: a value identity, never a declaration",
  description:
    "The digest of a fold state: a value identity, never a declaration\nidentity. Its own sort "
    + "keeps it out of every declaration-digest\nposition. ",
})

/**
 * The value StateLabel carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelStateLabelValue = typeof KernelStateLabel.Type

/**
 * A human-facing petname. Naming, never identity: no operation in this
 * package derives a digest from a petname, because resolution is a
 * head-relative read served by a fold, outside the identity plane.
 */
export const KernelPetname = Schema.Struct({ text: Schema.String }).annotate({
  identifier: "KernelPetname",
  title: "A human-facing petname.",
  description:
    "A human-facing petname. Naming, never identity: no operation in this\npackage derives a "
    + "digest from a petname, because resolution is a\nhead-relative read served by a fold, "
    + "outside the identity plane. ",
})

/**
 * The value Petname carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelPetnameValue = typeof KernelPetname.Type

/**
 * A fencing token, meaningful only within the register that issued
 * it. The register is part of the token's type: a cross-register
 * comparison fails to elaborate, so the proven-but-vacuous-bound
 * failure (two sides of a comparison denominated in different spaces)
 * has no syntax.
 */
export const KernelToken = Schema.Struct({ value: KernelNat }).annotate({
  identifier: "KernelToken",
  title: "A fencing token, meaningful only within the register that issued",
  description:
    "A fencing token, meaningful only within the register that issued\nit. The register is part "
    + "of the token's type: a cross-register\ncomparison fails to elaborate, so the "
    + "proven-but-vacuous-bound\nfailure (two sides of a comparison denominated in different "
    + "spaces)\nhas no syntax. Branded in the model by register; the brand is erased here and "
    + "carried by the generated aliases instead.",
})

/**
 * The value Token carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelTokenValue = typeof KernelToken.Type

/** A lane partition: the venue-local shard of an evidence stream.  */
export const KernelLanePartition = Schema.Struct({
  lane: KernelDigest,
  shard: KernelNat,
}).annotate({
  identifier: "KernelLanePartition",
  title: "A lane partition: the venue-local shard of an evidence stream.",
  description:
    "A lane partition: the venue-local shard of an evidence stream. ",
})

/**
 * The value LanePartition carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelLanePartitionValue = typeof KernelLanePartition.Type

/**
 * A journal position, meaningful only within its partition. As with
 * tokens, the space rides the type.
 */
export const KernelPosition = Schema.Struct({ value: KernelNat }).annotate({
  identifier: "KernelPosition",
  title: "A journal position, meaningful only within its partition.",
  description:
    "A journal position, meaningful only within its partition. As with\ntokens, the space rides "
    + "the type. Branded in the model by partition; the brand is erased here and carried by the "
    + "generated aliases instead.",
})

/**
 * The value Position carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelPositionValue = typeof KernelPosition.Type

/**
 * An anchor fact: `(fold digest, partition) -> (floor, state, head)`.
 * A fact, not a cache -- the resume coordinate every head-relative
 * read carries. The fold digest and partition are part of the type:
 * an anchor replays nowhere but at its own fold and partition.
 */
export const KernelAnchorFact = Schema.Struct({
  floor: KernelPosition,
  state: KernelStateLabel,
  head: KernelPosition,
}).annotate({
  identifier: "KernelAnchorFact",
  title: "An anchor fact: `(fold digest, partition) -> (floor, state, head)`.",
  description:
    "An anchor fact: `(fold digest, partition) -> (floor, state, head)`.\nA fact, not a cache "
    + "-- the resume coordinate every head-relative\nread carries. The fold digest and partition "
    + "are part of the type:\nan anchor replays nowhere but at its own fold and partition. "
    + "Branded in the model by declared and partition; the brand is erased here and carried by "
    + "the generated aliases instead.",
})

/**
 * The value AnchorFact carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelAnchorFactValue = typeof KernelAnchorFact.Type

/**
 * The epistemic stages of a hole, in rising rank order. `opened` is
 * the protocol stage named open; the language keyword forces the
 * spelling.
 */
export const KernelHoleStage = Schema.Literals([
  "opened",
  "filled",
  "disputed",
  "decided",
  "sealed",
]).annotate({
  identifier: "KernelHoleStage",
  title: "The epistemic stages of a hole, in rising rank order.",
  description:
    "The epistemic stages of a hole, in rising rank order. `opened` is\nthe protocol stage "
    + "named open; the language keyword forces the\nspelling. ",
})

/**
 * The value HoleStage carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelHoleStageValue = typeof KernelHoleStage.Type

/**
 * The closed trigger grammar at kernel sorts: exactly the five
 * monotone productions. Every production reads its component upward
 * (presence, reached-at-least, landed, advanced-past), so stability
 * under growth is a property of the grammar's shape.
 */
export const KernelKTriggerPredicate = Schema.Union([
  Schema.TaggedStruct("evidenceAppears", { lane: KernelDigest, pattern: KernelValue }),
  Schema.TaggedStruct("cellReaches", { cell: KernelDigest, threshold: KernelValue }),
  Schema.TaggedStruct("holeReaches", { hole: KernelNat, target: KernelHoleStage }),
  Schema.TaggedStruct("outcomeLanded", { register: KernelDigest }),
  Schema.TaggedStruct("headAdvancedPast", {
    partition: KernelLanePartition,
    position: KernelPosition,
  }),
]).annotate({
  identifier: "KernelKTriggerPredicate",
  title: "The closed trigger grammar at kernel sorts: exactly the five",
  description:
    "The closed trigger grammar at kernel sorts: exactly the five\nmonotone productions. Every "
    + "production reads its component upward\n(presence, reached-at-least, landed, "
    + "advanced-past), so stability\nunder growth is a property of the grammar's shape. ",
})

/**
 * The value KTriggerPredicate carries, named here so a consumer re-exports this declaration
 * instead of restating the type as one of its own.
 */
export type KernelKTriggerPredicateValue = typeof KernelKTriggerPredicate.Type

/**
 * One lawful kernel sentence: the eight generators, each constructor
 * demanding exactly the sorts its licensing law names.
 * `resolve` is anchor-free because a digest names one value forever;
 * every head-relative read is `fold` at an anchor -- the
 * immutable/head-relative split carried by the constructors
 * themselves. `decide` is commit-with-token: the token's type pins
 * the register, so an unfenced or cross-register commit has no
 * derivation.
 */
export const KernelAct = Schema.Union([
  Schema.TaggedStruct("declare", {
    kind: KernelDeclKind,
    value: KernelValue,
    writ: KernelDigest,
  }),
  Schema.TaggedStruct("resolve", { kind: KernelDeclKind, target: KernelDigest }),
  Schema.TaggedStruct("emit", { lane: KernelDigest, body: KernelValue }),
  Schema.TaggedStruct("join", { cell: KernelDigest, contribution: KernelValue }),
  Schema.TaggedStruct("fold", {
    declared: KernelDigest,
    partition: KernelLanePartition,
    anchor: KernelAnchorFact,
    query: KernelValue,
  }),
  Schema.TaggedStruct("decide", {
    register: KernelDigest,
    token: KernelToken,
    outcome: KernelValue,
  }),
  Schema.TaggedStruct("trigger", {
    predicate: KernelKTriggerPredicate,
    declaration: KernelDigest,
  }),
  Schema.TaggedStruct("spawn", { parent: KernelDigest, request: KernelDigest }),
]).annotate({
  identifier: "KernelAct",
  title: "One lawful kernel sentence: the eight generators, each constructor",
  description:
    "One lawful kernel sentence: the eight generators, each constructor\ndemanding exactly the "
    + "sorts its licensing law names.\n`resolve` is anchor-free because a digest names one value "
    + "forever;\nevery head-relative read is `fold` at an anchor -- the\nimmutable/head-relative "
    + "split carried by the constructors\nthemselves. `decide` is commit-with-token: the token's "
    + "type pins\nthe register, so an unfenced or cross-register commit has no\nderivation. ",
})

/**
 * The value Act carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelActValue = typeof KernelAct.Type

/**
 * A raw argument atom. The lawful atoms are digest references and
 * literals; holes are lawful in program declarations and refused in a
 * single sentence; every other atom is an unlawful shape kept
 * spellable so the door's refusal of it is demonstrable.
 */
export const KernelRawArg = Schema.Union([
  Schema.TaggedStruct("digestRef", { kind: KernelDeclKind, id: KernelNat }),
  Schema.TaggedStruct("literal", { value: KernelNat }),
  Schema.TaggedStruct("hole", { name: KernelNat }),
  Schema.TaggedStruct("clockNow", {}),
  Schema.TaggedStruct("randomSeed", {}),
  Schema.TaggedStruct("secretBytes", { bytes: KernelNat }),
  Schema.TaggedStruct("mintedId", { token: KernelNat }),
  Schema.TaggedStruct("functionValue", { code: KernelNat }),
]).annotate({
  identifier: "KernelRawArg",
  title: "A raw argument atom.",
  description:
    "A raw argument atom. The lawful atoms are digest references and\nliterals; holes are "
    + "lawful in program declarations and refused in a\nsingle sentence; every other atom is an "
    + "unlawful shape kept\nspellable so the door's refusal of it is demonstrable. ",
})

/**
 * The value RawArg carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelRawArgValue = typeof KernelRawArg.Type

/**
 * A candidate anchor: the raw spelling of a resume coordinate, its
 * fold carried as data rather than as a type index -- which is exactly
 * what lets a cross-fold anchor be spelled and refused.
 */
export const KernelCandidateAnchor = Schema.Struct({
  foldId: KernelNat,
  lane: KernelNat,
  shard: KernelNat,
  floor: KernelNat,
  state: KernelNat,
  head: KernelNat,
}).annotate({
  identifier: "KernelCandidateAnchor",
  title: "A candidate anchor: the raw spelling of a resume coordinate, its",
  description:
    "A candidate anchor: the raw spelling of a resume coordinate, its\nfold carried as data "
    + "rather than as a type index -- which is exactly\nwhat lets a cross-fold anchor be spelled "
    + "and refused. ",
})

/**
 * The value CandidateAnchor carries, named here so a consumer re-exports this declaration
 * instead of restating the type as one of its own.
 */
export type KernelCandidateAnchorValue = typeof KernelCandidateAnchor.Type

/**
 * A raw token claim: the register the claimant believes the token
 * belongs to, carried as data so a cross-register claim is spellable
 * and refused.
 */
export const KernelTokenClaim = Schema.Struct({
  register: KernelNat,
  value: KernelNat,
}).annotate({
  identifier: "KernelTokenClaim",
  title: "A raw token claim: the register the claimant believes the token",
  description:
    "A raw token claim: the register the claimant believes the token\nbelongs to, carried as "
    + "data so a cross-register claim is spellable\nand refused. ",
})

/**
 * The value TokenClaim carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelTokenClaimValue = typeof KernelTokenClaim.Type

/**
 * A candidate merge strategy. Both spellings retain the intended
 * declared algebra. Last-writer-wins additionally asks arrival order
 * to override that algebra and is refused at the door. Retaining the
 * algebra makes dropping the unlawful override a candidate-only
 * repair: no catalog lookup or new choice is smuggled into it.
 */
export const KernelMergeStrategy = Schema.Union([
  Schema.TaggedStruct("declaredAlgebra", { algebra: KernelNat }),
  Schema.TaggedStruct("lastWriterWins", { algebra: KernelNat }),
]).annotate({
  identifier: "KernelMergeStrategy",
  title: "A candidate merge strategy.",
  description:
    "A candidate merge strategy. Both spellings retain the intended\ndeclared algebra. "
    + "Last-writer-wins additionally asks arrival order\nto override that algebra and is refused "
    + "at the door. Retaining the\nalgebra makes dropping the unlawful override a "
    + "candidate-only\nrepair: no catalog lookup or new choice is smuggled into it. ",
})

/**
 * The value MergeStrategy carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelMergeStrategyValue = typeof KernelMergeStrategy.Type

/**
 * The candidate trigger grammar: the five lawful productions plus the
 * shapes the closed grammar deliberately cannot carry -- absence,
 * negation, deadline, and the not-present-anywhere claim a local
 * replica can never ground.
 */
export const KernelCandidatePredicate: Schema.Codec<KernelCandidatePredicateValue> = Schema.Union([
  Schema.TaggedStruct("evidenceAppears", { lane: KernelNat, pattern: KernelNat }),
  Schema.TaggedStruct("cellReaches", { cell: KernelNat, threshold: KernelNat }),
  Schema.TaggedStruct("holeReaches", { hole: KernelNat, stage: KernelNat }),
  Schema.TaggedStruct("outcomeLanded", { register: KernelNat }),
  Schema.TaggedStruct("headAdvancedPast", {
    lane: KernelNat,
    shard: KernelNat,
    position: KernelNat,
  }),
  Schema.TaggedStruct("onAbsence", { subject: KernelNat }),
  Schema.TaggedStruct("negation", {
    inner: Schema.suspend((): Schema.Codec<KernelCandidatePredicateValue> => KernelCandidatePredicate),
  }),
  Schema.TaggedStruct("deadline", { tick: KernelNat }),
  Schema.TaggedStruct("absentEverywhere", { cell: KernelNat }),
]).annotate({
  identifier: "KernelCandidatePredicate",
  title: "The candidate trigger grammar: the five lawful productions plus the",
  description:
    "The candidate trigger grammar: the five lawful productions plus the\nshapes the closed "
    + "grammar deliberately cannot carry -- absence,\nnegation, deadline, and the "
    + "not-present-anywhere claim a local\nreplica can never ground. ",
})

/**
 * The raw candidate grammar. Every generator is spellable, and so is
 * every unlawful shape: an anchored resolve, a trusted read, an
 * unfenced or cross-register decide, a last-writer-wins join, an
 * unanchored latest read, and an in-place mutation of the past.
 */
export const KernelCandidateAct = Schema.Union([
  Schema.TaggedStruct("declare", {
    kind: KernelDeclKind,
    payload: Schema.Array(KernelRawArg),
    writ: KernelNat,
  }),
  Schema.TaggedStruct("resolveDigest", {
    kind: KernelDeclKind,
    target: KernelNat,
    anchor: Schema.UndefinedOr(KernelNat),
  }),
  Schema.TaggedStruct("trustBytes", {
    kind: KernelDeclKind,
    target: KernelNat,
    asserted: KernelNat,
  }),
  Schema.TaggedStruct("emit", { lane: KernelNat, body: Schema.Array(KernelRawArg) }),
  Schema.TaggedStruct("join", {
    cell: KernelNat,
    contribution: Schema.Array(KernelRawArg),
    strategy: KernelMergeStrategy,
  }),
  Schema.TaggedStruct("readLatest", { subject: KernelNat }),
  Schema.TaggedStruct("fold", {
    declared: KernelNat,
    anchor: Schema.UndefinedOr(KernelCandidateAnchor),
    query: Schema.Array(KernelRawArg),
  }),
  Schema.TaggedStruct("decide", {
    register: KernelNat,
    token: Schema.UndefinedOr(KernelTokenClaim),
    outcome: Schema.Array(KernelRawArg),
  }),
  Schema.TaggedStruct("trigger", {
    predicate: KernelCandidatePredicate,
    declaration: KernelNat,
  }),
  Schema.TaggedStruct("spawn", { parent: KernelNat, request: KernelNat }),
  Schema.TaggedStruct("updateInPlace", {
    kind: KernelDeclKind,
    target: KernelNat,
    payload: Schema.Array(KernelRawArg),
    writ: KernelNat,
  }),
]).annotate({
  identifier: "KernelCandidateAct",
  title: "The raw candidate grammar.",
  description:
    "The raw candidate grammar. Every generator is spellable, and so is\nevery unlawful shape: "
    + "an anchored resolve, a trusted read, an\nunfenced or cross-register decide, a "
    + "last-writer-wins join, an\nunanchored latest read, and an in-place mutation of the past. ",
})

/**
 * The value CandidateAct carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelCandidateActValue = typeof KernelCandidateAct.Type

/** The closed refusal reasons of the kernel door.  */
export const KernelRefusalReason = Schema.Literals([
  "clockRead",
  "absenceTrigger",
  "unfencedDecide",
  "lastWriterWins",
  "unverifiedRead",
  "crossSortIdentifier",
  "mintedIdentifier",
  "ambientQueryInput",
  "forwardReference",
  "secretCarrier",
  "absenceClaim",
  "pastMutation",
  "offWritReferent",
  "closureIntrospection",
  "anchoredResolve",
  "unfilledHole",
]).annotate({
  identifier: "KernelRefusalReason",
  title: "The closed refusal reasons of the kernel door.",
  description:
    "The closed refusal reasons of the kernel door. ",
})

/**
 * The value RefusalReason carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelRefusalReasonValue = typeof KernelRefusalReason.Type

/**
 * A structural refusal: the reason, the law it defends, and the
 * taught repair. Refusal parity as data: the door never refuses
 * without teaching the legal next move.
 */
export const KernelRefusal = Schema.Struct({
  reason: KernelRefusalReason,
  law: Schema.String,
  repair: Schema.String,
}).annotate({
  identifier: "KernelRefusal",
  title: "A structural refusal: the reason, the law it defends, and the",
  description:
    "A structural refusal: the reason, the law it defends, and the\ntaught repair. Refusal "
    + "parity as data: the door never refuses\nwithout teaching the legal next move. ",
})

/**
 * The value Refusal carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelRefusalValue = typeof KernelRefusal.Type

/**
 * How a taught repair may be applied. A repair is machine-applicable
 * exactly when the lawful rewrite is a function of the refused
 * candidate alone -- an agent may apply it mechanically, with no new
 * information; it is advisory when the repair needs something the
 * candidate does not carry (a token to hold, a value to declare, an
 * authority to request). The Rust diagnostic discipline, adopted by
 * the operator's ruling.
 */
export const KernelApplicability = Schema.Literals(["machineApplicable", "advisory"]).annotate({
  identifier: "KernelApplicability",
  title: "How a taught repair may be applied.",
  description:
    "How a taught repair may be applied. A repair is machine-applicable\nexactly when the "
    + "lawful rewrite is a function of the refused\ncandidate alone -- an agent may apply it "
    + "mechanically, with no new\ninformation; it is advisory when the repair needs something "
    + "the\ncandidate does not carry (a token to hold, a value to declare, an\nauthority to "
    + "request). The Rust diagnostic discipline, adopted by\nthe operator's ruling. ",
})

/**
 * The value Applicability carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelApplicabilityValue = typeof KernelApplicability.Type

/**
 * The admission context: the already-admitted catalog and the
 * universe of referents the acting writ pins.
 */
export const KernelDoor = Schema.Struct({
  catalog: Schema.Array(KernelRef),
  pinned: Schema.Array(KernelRef),
}).annotate({
  identifier: "KernelDoor",
  title: "The admission context: the already-admitted catalog and the",
  description:
    "The admission context: the already-admitted catalog and the\nuniverse of referents the "
    + "acting writ pins. ",
})

/**
 * The value Door carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelDoorValue = typeof KernelDoor.Type

/**
 * The admission verdict: an intrinsic sentence, or a taught
 * structural refusal.
 */
export const KernelAdmitResult = Schema.Union([
  Schema.TaggedStruct("admitted", { act: KernelAct }),
  Schema.TaggedStruct("refused", { refusal: KernelRefusal }),
]).annotate({
  identifier: "KernelAdmitResult",
  title: "The admission verdict: an intrinsic sentence, or a taught",
  description:
    "The admission verdict: an intrinsic sentence, or a taught\nstructural refusal. ",
})

/**
 * The value AdmitResult carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelAdmitResultValue = typeof KernelAdmitResult.Type

/** The generator a program node applies.  */
export const KernelGenTag = Schema.Literals([
  "declare",
  "resolve",
  "emit",
  "join",
  "fold",
  "decide",
  "trigger",
  "spawn",
]).annotate({
  identifier: "KernelGenTag",
  title: "The generator a program node applies.",
  description:
    "The generator a program node applies. ",
})

/**
 * The value GenTag carries, named here so a consumer re-exports this declaration instead of
 * restating the type as one of its own.
 */
export type KernelGenTagValue = typeof KernelGenTag.Type

/**
 * One node of a program declaration: a program-scoped name, the
 * generator it applies, its raw arguments (holes permitted here --
 * the program's typed parameters), and the names of the prior nodes
 * it consumes.
 */
export const KernelProgramNode = Schema.Struct({
  name: KernelNat,
  generator: KernelGenTag,
  args: Schema.Array(KernelRawArg),
  uses: Schema.Array(KernelNat),
}).annotate({
  identifier: "KernelProgramNode",
  title: "One node of a program declaration: a program-scoped name, the",
  description:
    "One node of a program declaration: a program-scoped name, the\ngenerator it applies, its "
    + "raw arguments (holes permitted here --\nthe program's typed parameters), and the names of "
    + "the prior nodes\nit consumes. ",
})

/**
 * The value ProgramNode carries, named here so a consumer re-exports this declaration instead
 * of restating the type as one of its own.
 */
export type KernelProgramNodeValue = typeof KernelProgramNode.Type

/** Every mini-AST schema, keyed by the model's short name for the type. */
export const KERNEL_TYPE_SCHEMA = {
  DeclKind: KernelDeclKind,
  Digest: KernelDigest,
  Value: KernelValue,
  StateLabel: KernelStateLabel,
  Petname: KernelPetname,
  Token: KernelToken,
  LanePartition: KernelLanePartition,
  Position: KernelPosition,
  AnchorFact: KernelAnchorFact,
  HoleStage: KernelHoleStage,
  KTriggerPredicate: KernelKTriggerPredicate,
  Act: KernelAct,
  RawArg: KernelRawArg,
  CandidateAnchor: KernelCandidateAnchor,
  TokenClaim: KernelTokenClaim,
  MergeStrategy: KernelMergeStrategy,
  CandidatePredicate: KernelCandidatePredicate,
  CandidateAct: KernelCandidateAct,
  RefusalReason: KernelRefusalReason,
  Refusal: KernelRefusal,
  Applicability: KernelApplicability,
  Door: KernelDoor,
  AdmitResult: KernelAdmitResult,
  GenTag: KernelGenTag,
  ProgramNode: KernelProgramNode,
} as const

/**
 * A sentence in its canonical framing: the generator tag, then that
 * generator's arguments. The examples are the model's own vectors, so an
 * example can never drift from what the door admits.
 *
 * This, and not the act schema, is what the encoding vectors exemplify: a
 * vector is the encoding of an act, not an act.
 */
export const KernelActEncoding = Schema.Array(KernelNat).annotate({
  identifier: "KernelActEncoding",
  title: "An encoded sentence.",
  description:
    "The output of the model's encoder as an array of unbounded integers. Element zero is the "
    + "generator tag and the arity is fixed per tag, so a decoder can dispatch on length and tag "
    + "alone.",
  canonicalExamples: [
    "[0,0,7000051000172,4]",
    "[1,0,8]",
    "[2,1,42]",
    "[3,6,42]",
    "[4,2,1,0,4,11,6,13]",
    "[5,3,7,42]",
    "[6,0,1,17,0,3]",
    "[6,1,6,23,0,3]",
    "[6,2,0,3,0,3]",
    "[6,3,3,0,0,3]",
    "[6,4,1,0,6,3]",
    "[7,4,5]",
  ],
  examples: [
    [0n, 0n, 7000051000172n, 4n],
    [1n, 0n, 8n],
    [2n, 1n, 42n],
    [3n, 6n, 42n],
    [4n, 2n, 1n, 0n, 4n, 11n, 6n, 13n],
    [5n, 3n, 7n, 42n],
    [6n, 0n, 1n, 17n, 0n, 3n],
    [6n, 1n, 6n, 23n, 0n, 3n],
    [6n, 2n, 0n, 3n, 0n, 3n],
    [6n, 3n, 3n, 0n, 0n, 3n],
    [6n, 4n, 1n, 0n, 6n, 3n],
    [7n, 4n, 5n],
  ],
})