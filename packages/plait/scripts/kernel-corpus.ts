/**
 * The reader for the kernel-conformance interchange, format 2.
 *
 * Reading happens in three layers, and each layer catches what the layer above
 * it cannot express.
 *
 * 1. **Bytes.** LF endings, ASCII only, no empty line, a final newline. These
 *    are properties of the file, not of any record.
 * 2. **Canonical form.** Every line is parsed into the canonical domain and
 *    written back; if the bytes differ, the line was not canonical. One
 *    comparison covers member order, absence of whitespace, string escaping,
 *    and the minimal-decimal number rule - all things a schema cannot see,
 *    because a schema sees a value and these are properties of its spelling.
 * 3. **Meaning.** Each record decodes through the schema for its group, so a
 *    malformed record reports the annotated path a schema knows how to give,
 *    and the decoded value carries `bigint` integers rather than lossy
 *    doubles. Then the cross-record invariants: dense ranks, unique reasons,
 *    admissions that name refusals, docs that name types, canon vectors whose
 *    bytes are what the canonicalizer actually produces.
 *
 * The reader refuses rather than half-parses. An artifact that half-parses is
 * worse than one that refuses, because whatever is generated from it would
 * carry the half.
 *
 * One group is deliberately absent from `KERNEL_RECORD_GROUPS`:
 * `model-admission`. Those rows are marked `scope: "model-internal"` by the
 * emitter and document the MODEL rather than claiming anything about a host,
 * so this reader leaves them where the add-only rule puts them - reported in
 * `skipped`, collected nowhere, and therefore absent from the conformance
 * roster a door is replayed against. That is the whole of the exclusion:
 * nothing here has to know what the group contains, only that it is not
 * addressed to a host. Adding the name to `KERNEL_RECORD_GROUPS` would silently
 * promote those rows into the roster, so the skip is checked by a test rather
 * than left to habit (operator grill ruling A8, sitting record DEV-772).
 *
 * @module
 */
import {
  encodeCanonicalJson,
  parseCanonicalJson,
  type CanonicalJson,
} from "../src/truth/CanonicalJson.js"
import {
  KERNEL_CORPUS_FORMAT,
  KERNEL_RECORD_GROUPS,
  KERNEL_RECORD_SCHEMA,
  KernelHeaderRecord,
  type KernelAdmissionRecord,
  type KernelCanonRecord,
  type KernelDocRecord,
  type KernelEncodingRecord,
  type KernelArgRef,
  type KernelKindRecord,
  type KernelProgramRecord,
  type KernelRecordGroup,
  type KernelRefusalRecord,
  type KernelStageRecord,
  type KernelTypeRecord,
} from "../src/kernel/KernelCorpusSchemas.js"
import { canonicalWriter, decodeCanonicalText } from "../src/truth/SchemaCanonical.js"

/**
 * The interchange file the runtime derives its tables from, relative to the
 * repository root: the model's own emission, produced by executing the model,
 * never a hand-typed table and never a stand-in.
 *
 * Everything this package derives - the generated tables, the generated
 * schemas, the rendered prose, the conformance wall - enters through this one
 * constant, so there is exactly one place a reader has to look to know what
 * the runtime is standing on.
 */
export const CORPUS_PATH = "packages/plait/fixtures/kernel-conformance.ndjson"

/** One read interchange file, grouped, in file order within each group. */
export interface KernelCorpus {
  readonly header: KernelHeaderRecord
  readonly kinds: ReadonlyArray<KernelKindRecord>
  readonly stages: ReadonlyArray<KernelStageRecord>
  readonly refusals: ReadonlyArray<KernelRefusalRecord>
  readonly types: ReadonlyArray<KernelTypeRecord>
  readonly encodings: ReadonlyArray<KernelEncodingRecord>
  readonly admissions: ReadonlyArray<KernelAdmissionRecord>
  readonly docs: ReadonlyArray<KernelDocRecord>
  readonly canons: ReadonlyArray<KernelCanonRecord>
  readonly programs: ReadonlyArray<KernelProgramRecord>
  /** The file's lines, without the trailing empty one. The bytes, for a re-emit check. */
  readonly lines: ReadonlyArray<string>
  /** Groups this reader does not know, skipped under the add-only rule. */
  readonly skipped: ReadonlyArray<string>
}

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `refuse(...)` as control flow that does not return and narrows after it.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel-conformance corpus: ${reason}`)
}

/** The arity each generator tag requires of an encoded sentence. */
export const GENERATOR_ARITY = [4, 3, 3, 3, 8, 4, 6, 3] as const

/**
 * The canonical-form vectors the freeze names, in order. They are checked by
 * name and by position so that a dropped or reordered vector is caught, not
 * absorbed.
 */
export const CANON_VECTOR_NAMES = [
  "empty-object",
  "empty-array",
  "empty-string",
  "zero",
  "big-integer",
  "key-order",
  "nested-object",
  "nested-array",
  "string-escapes",
  "control-char",
] as const

const groupOf = (line: string, where: string): string => {
  const parsed = parseCanonicalJson(line)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return refuse(`${where} is not a JSON object`)
  }
  const record = (parsed as { readonly [key: string]: CanonicalJson }).record
  return typeof record === "string" ? record : refuse(`${where} carries no record group`)
}

const readGroupRecord = <Group extends KernelRecordGroup>(
  group: Group,
  line: string,
  where: string,
): (typeof KERNEL_RECORD_SCHEMA)[Group]["Type"] => {
  const schema = KERNEL_RECORD_SCHEMA[group]
  const read = decodeCanonicalText(schema, line)
  if (!read.ok) return refuse(`${where} is not a ${group} record: ${read.reason}`)
  // The both-ways law, per record: what the schema decoded writes back to the
  // bytes it came from. A schema that quietly widened a field would show here.
  const written = canonicalWriter(schema).toText(read.value)
  if (written !== line) {
    return refuse(`${where} does not survive its own schema: wrote ${written}`)
  }
  return read.value as (typeof KERNEL_RECORD_SCHEMA)[Group]["Type"]
}

const checkBytes = (source: string): ReadonlyArray<string> => {
  if (source.includes("\r")) refuse("the file carries a carriage return")
  const lines = source.split("\n")
  if (lines.at(-1) !== "") refuse("the file does not end with a newline")
  const rows = lines.slice(0, -1)
  if (rows.length === 0) refuse("the file is empty")
  for (const [index, line] of rows.entries()) {
    if (line === "") refuse(`line ${index + 1} is empty`)
    // The rule is ASCII, not printable-ASCII: a control character is lawful
    // inside a string as an escape, and the canonical re-emit below is what
    // proves it was written as one.
    for (let at = 0; at < line.length; at++) {
      if (line.charCodeAt(at) > 0x7f) refuse(`line ${index + 1} is not ASCII at column ${at + 1}`)
    }
  }
  return rows
}

const checkCanonical = (rows: ReadonlyArray<string>): void => {
  for (const [index, line] of rows.entries()) {
    const rewritten = encodeCanonicalJson(parseCanonicalJson(line))
    if (rewritten !== line) {
      refuse(
        `line ${index + 1} is not in canonical form\n  read  ${line}\n  canon ${rewritten}`,
      )
    }
  }
}

const checkCounts = (
  corpus: Omit<KernelCorpus, "lines" | "skipped">,
  skipped: ReadonlyArray<string>,
): void => {
  const counted: ReadonlyArray<readonly [KernelRecordGroup, number]> = [
    ["kind", corpus.kinds.length],
    ["stage", corpus.stages.length],
    ["refusal", corpus.refusals.length],
    ["type", corpus.types.length],
    ["encoding", corpus.encodings.length],
    ["admission", corpus.admissions.length],
    ["doc", corpus.docs.length],
    ["canon", corpus.canons.length],
  ]
  for (const [group, actual] of counted) {
    const pinned = corpus.header.counts[group]
    if (pinned === undefined) refuse(`the header pins no ${group} count`)
    if (pinned !== BigInt(actual)) {
      refuse(`the header pins ${pinned} ${group} records, the file carries ${actual}`)
    }
  }
  // The program group is the add-only rule caught in the act: this reader knows
  // it, and a corpus emitted before it landed carries neither its records nor
  // its count. Absent on both sides is the older file and is read; present on
  // either side must agree, so a group that half-lands still stops the build.
  const pinnedPrograms = corpus.header.counts.program
  if (pinnedPrograms !== undefined || corpus.programs.length > 0) {
    if (pinnedPrograms === undefined) {
      refuse(`the file carries ${corpus.programs.length} program records and pins no count`)
    }
    if (pinnedPrograms !== BigInt(corpus.programs.length)) {
      refuse(
        `the header pins ${pinnedPrograms} program records, the file carries` +
          ` ${corpus.programs.length}`,
      )
    }
  }
  // The add-only rule cuts both ways: a count for a group this reader skipped
  // is skipped with it, but a count for a group that never appeared is a lie.
  const known = new Set<string>([...counted.map(([group]) => group), "program"])
  for (const name of Object.keys(corpus.header.counts)) {
    if (!known.has(name) && !skipped.includes(name)) {
      refuse(`the header pins a ${name} count that names no record group in the file`)
    }
  }
}

const checkTables = (corpus: Omit<KernelCorpus, "lines" | "skipped">): void => {
  corpus.kinds.forEach((kind, rank) => {
    if (kind.rank !== BigInt(rank)) {
      refuse(`kind ${kind.name} has rank ${kind.rank} at position ${rank}`)
    }
  })
  corpus.stages.forEach((stage, rank) => {
    if (stage.rank !== BigInt(rank)) {
      refuse(`stage ${stage.name} has rank ${stage.rank} at position ${rank}`)
    }
  })
  if (new Set(corpus.kinds.map((kind) => kind.name)).size !== corpus.kinds.length) {
    refuse("a declaration kind is named twice")
  }

  const reasons = new Set(corpus.refusals.map((refusal) => refusal.reason))
  if (reasons.size !== corpus.refusals.length) refuse("a refusal reason is spelled twice")
  for (const refusal of corpus.refusals) {
    if (refusal.law === "") refuse(`refusal ${refusal.reason} teaches no law`)
    if (refusal.repair === "") refuse(`refusal ${refusal.reason} teaches no repair`)
  }

  const typeNames = new Set(corpus.types.map((type) => type.name))
  if (typeNames.size !== corpus.types.length) refuse("a type is named twice")
  for (const type of corpus.types) {
    if (type.form === "structure" && type.constructors.length !== 1) {
      refuse(`structure ${type.name} carries ${type.constructors.length} constructors, want 1`)
    }
  }
  checkTypeReferences(corpus.types, typeNames, corpus.kinds)

  for (const encoding of corpus.encodings) {
    const tag = encoding.act[0]
    if (tag === undefined) refuse(`encoding ${encoding.name} is empty`)
    const arity = GENERATOR_ARITY[Number(tag)]
    if (arity === undefined) refuse(`encoding ${encoding.name} carries unknown generator tag ${tag}`)
    if (encoding.act.length !== arity) {
      refuse(
        `encoding ${encoding.name} has ${encoding.act.length} entries, tag ${tag} requires ${arity}`,
      )
    }
  }
  const tags = new Set(corpus.encodings.map((encoding) => Number(encoding.act[0])))
  for (let tag = 0; tag < GENERATOR_ARITY.length; tag++) {
    if (!tags.has(tag)) refuse(`no encoding vector represents generator tag ${tag}`)
  }

  // The admission block is refused rows and then admitted rows, and the split
  // is load-bearing: the refused prefix is what gets read against the taught
  // refusal table position for position, so a single admitted row in the middle
  // would shift every later refusal off its reason. More refused rows than the
  // table has reasons is lawful - one reason can be earned by more than one
  // candidate shape, and the stage-rank edge earns absence-trigger a second
  // time - so the alignment is checked only as far as the table reaches.
  const firstAdmitted = corpus.admissions.findIndex((row) => row.verdict === "admitted")
  if (firstAdmitted < 0) refuse("the admission block carries no admitted verdict")
  if (firstAdmitted === 0) refuse("the admission block opens admitted, so it pins no refusal")
  const admitted: Array<{
    readonly name: string
    readonly encoded: ReadonlyArray<bigint>
  }> = []
  corpus.admissions.forEach((admission, index) => {
    if (admission.verdict !== "refused") {
      admitted.push({ name: admission.name, encoded: admission.encoded })
      return
    }
    if (index > firstAdmitted) {
      refuse(
        `refused verdict ${admission.name} stands after an admitted one;` +
          " the refused rows are not a prefix of the admission block",
      )
    }
    if (!reasons.has(admission.reason)) {
      refuse(`admission ${admission.name} names unknown reason ${admission.reason}`)
    }
    const aligned = corpus.refusals[index]
    if (aligned !== undefined && aligned.reason !== admission.reason) {
      refuse(
        `admission ${index} names ${admission.reason} where refusal ${index} names` +
          ` ${aligned.reason}; the gate order and the declaration order have diverged`,
      )
    }
  })

  // Every admitted row is a sentence at its own generator's arity, and at least
  // one of them is a sentence the encoding group states as well. The second
  // half is the tie between the two groups: an admission block that drifted
  // clear of the encoding vectors would still satisfy the arity check alone.
  //
  // Two admitted rows MAY carry the same sentence. The model's payload
  // canonicalizer is a fold into one identity, and distinct lawful payloads
  // reach the same value; the corpus plants such a pair on purpose. Whether
  // that quotient is intended is an open question for the model, so this reader
  // records the collision rather than refusing it.
  for (const row of admitted) {
    const tag = row.encoded[0]
    if (tag === undefined) refuse(`admission ${row.name} carries an empty sentence`)
    const arity = GENERATOR_ARITY[Number(tag)]
    if (arity === undefined) refuse(`admission ${row.name} carries unknown generator tag ${tag}`)
    if (row.encoded.length !== arity) {
      refuse(
        `admission ${row.name} has ${row.encoded.length} entries, tag ${tag} requires ${arity}`,
      )
    }
  }
  if (
    !admitted.some((row) =>
      corpus.encodings.some((encoding) => encoding.act.join(",") === row.encoded.join(","))
    )
  ) {
    refuse("no admitted sentence matches an encoding vector; the two groups have come apart")
  }

  const documented = corpus.docs.map((doc) => doc.name)
  if (new Set(documented).size !== documented.length) refuse("a type is documented twice")
  let at = 0
  for (const name of documented) {
    if (!typeNames.has(name)) refuse(`doc record names unknown type ${name}`)
    const found = corpus.types.findIndex((type, index) => index >= at && type.name === name)
    if (found < 0) refuse(`doc records are not in type declaration order (at ${name})`)
    at = found + 1
  }
  for (const doc of corpus.docs) {
    if (doc.doc === "") refuse(`type ${doc.name} carries an empty docstring`)
  }

  if (corpus.canons.length !== CANON_VECTOR_NAMES.length) {
    refuse(`the file carries ${corpus.canons.length} canon vectors, want ${CANON_VECTOR_NAMES.length}`)
  }
  corpus.canons.forEach((canon, index) => {
    const wanted = CANON_VECTOR_NAMES[index]
    if (canon.name !== wanted) refuse(`canon vector ${index} is ${canon.name}, want ${wanted}`)
    const written = encodeCanonicalJson(canon.value as CanonicalJson)
    if (written !== canon.bytes) {
      refuse(
        `canon vector ${canon.name} pins bytes ${canon.bytes}, the canonicalizer writes ${written}`,
      )
    }
  })

  checkPrograms(corpus)
}

/**
 * The generator vocabulary and each generator's fields, read off the `Act`
 * type record rather than restated here.
 *
 * This is the one-AST rule with teeth. A program node names a generator and
 * keys its arguments by field name; both come from the same mini-AST record
 * the schemas and the builder surface are generated from, so a generator this
 * reader admits is one the grammar declares, and a field name it admits is one
 * that constructor actually has.
 */
export const generatorFields = (
  types: ReadonlyArray<KernelTypeRecord>,
): ReadonlyMap<string, ReadonlyArray<string>> => {
  const act = types.find((type) => type.name === "Act")
  if (act === undefined) refuse("the corpus declares no Act type, so no generator vocabulary")
  return new Map(
    act.constructors.map((constructor) =>
      [constructor.name, constructor.fields.map((field) => field.name)] as const
    ),
  )
}

/** One consumption, as the edge it must appear as. */
const edgeKey = (from: bigint, to: bigint): string => `${from}->${to}`

// Every program vector is checked against the freeze the same way a canon
// vector is: the record carries both a value and the bytes it must serialize
// to, so the corpus self-tests any consumer that reads it. On top of that
// pairing come the shape laws - the local namespace, the newest-first
// admission order, and the redundancy between edges and local arguments -
// because those are the properties a degenerate producer would drop.
const checkPrograms = (corpus: Omit<KernelCorpus, "lines" | "skipped">): void => {
  if (corpus.programs.length === 0) return
  const fields = generatorFields(corpus.types)
  const kindNames = new Set(corpus.kinds.map((kind) => kind.name))
  const names = corpus.programs.map((program) => program.name)
  if (new Set(names).size !== names.length) refuse("a program vector is named twice")

  for (const program of corpus.programs) {
    const where = `program vector ${program.name}`
    const written = encodeCanonicalJson(program.declaration as unknown as CanonicalJson)
    if (written !== program.bytes) {
      refuse(`${where} pins bytes ${program.bytes}, the canonicalizer writes ${written}`)
    }

    const holes = program.declaration.holes
    holes.forEach((hole, index) => {
      const previous = holes[index - 1]
      if (previous !== undefined && previous.name >= hole.name) {
        refuse(`${where}: holes do not ascend by name (${previous.name} then ${hole.name})`)
      }
    })
    const holeNames = new Set(holes.map((hole) => hole.name))

    const nodes = program.declaration.nodes
    const nodeNames = new Set(nodes.map((node) => node.name))
    if (nodeNames.size !== nodes.length) refuse(`${where}: a node name is used twice`)

    // Newest first, so a node may consume only names that stand after it: those
    // are the ones already admitted when it was. The check is the reader's
    // reading of the model's admission relation, at the one place a file can
    // state a cycle.
    //
    // The argument map is a subset of the generator's fields, never a superset.
    // Two reasons a field is absent, and the file cannot tell them apart: the
    // declaration form carries no reference for that sort at all - a kind tag,
    // a token, a partition, an anchor, a predicate - or the node simply leaves
    // the slot unwired. What the reader can insist on is that every key present
    // names a real field of that generator.
    const consumptions: Array<string> = []
    nodes.forEach((node, index) => {
      const declared = fields.get(node.generator)
      if (declared === undefined) {
        refuse(`${where}: node ${node.name} names generator ${node.generator}, which Act has not`)
      }
      const known = new Set(declared)
      for (const [field, value] of Object.entries(node.args)) {
        const argument = value as KernelArgRef
        if (!known.has(field)) {
          refuse(
            `${where}: node ${node.name} wires argument ${field}, which ${node.generator}` +
              ` has not (it takes ${[...declared].join(", ")})`,
          )
        }
        if (argument.arg === "digest" && !kindNames.has(argument.kind)) {
          refuse(`${where}: node ${node.name} argument ${field} names unknown kind ${argument.kind}`)
        }
        if (argument.arg === "hole" && !holeNames.has(argument.name)) {
          refuse(
            `${where}: node ${node.name} argument ${field} reads hole ${argument.name},` +
              " which this declaration never declared",
          )
        }
        if (argument.arg !== "local") continue
        const older = nodes.findIndex((prior) => prior.name === argument.name)
        if (older < 0) {
          refuse(
            `${where}: node ${node.name} argument ${field} names local ${argument.name},` +
              " which names no node of this declaration",
          )
        }
        if (older <= index) {
          refuse(
            `${where}: node ${node.name} consumes ${argument.name}, which is not older;` +
              " nodes are newest first, so a consumed name stands after its consumer",
          )
        }
        consumptions.push(edgeKey(node.name, argument.name))
      }
    })

    // The edge list is redundant with the local arguments on purpose, and the
    // redundancy is only worth carrying if it is checked: a producer that
    // flattens the DAG drops edges its own arguments still imply.
    const declaredEdges = program.declaration.edges.map((edge) => edgeKey(edge.from, edge.to))
    const sorted = (rows: ReadonlyArray<string>): string => [...rows].sort().join(" ")
    if (sorted(declaredEdges) !== sorted(consumptions)) {
      refuse(
        `${where}: the edge list and the local arguments disagree\n` +
          `  edges     ${sorted(declaredEdges)}\n  arguments ${sorted(consumptions)}`,
      )
    }
  }
}

/** The leaf names a field type may use without a `type` record of its own. */
export const TYPE_REFERENCE_LEAVES = ["Nat", "String", "Ref"] as const

/** The one-argument containers a field type may use. */
export const TYPE_REFERENCE_CONTAINERS = ["List", "Option"] as const

/** One field type, split into its head name and its arguments. */
export interface TypeReference {
  /** The head name: a leaf, a container, or a declared type. */
  readonly name: string
  /** The arguments applied to the head - a container's element, or brand names. */
  readonly args: ReadonlyArray<string>
}

// ref ::= name | name "(" arg ("," arg)* ")"; name ::= [A-Za-z][A-Za-z0-9]*
const referenceGrammar =
  /^([A-Za-z][A-Za-z0-9]*)(?:\(([A-Za-z][A-Za-z0-9]*(?:,[A-Za-z][A-Za-z0-9]*)*)\))?$/

/**
 * Reads one field type reference. The grammar is small enough to state in a
 * line, and it is stated once: the validator below and the schema generator
 * both call this, so a reference the validator admits is one the generator can
 * resolve, by construction rather than by coincidence.
 */
export const parseTypeReference = (text: string, where: string): TypeReference => {
  const matched = referenceGrammar.exec(text)
  if (matched === null) refuse(`${where} does not parse as a type reference: ${text}`)
  return {
    name: matched![1]!,
    args: matched![2] === undefined ? [] : matched![2].split(","),
  }
}

// Every brand argument names either a declaration kind or an earlier field or
// parameter of the same constructor. That resolution rule is the whole of
// §2.5, and getting it wrong silently would let an anchor be replayed under a
// fold it never belonged to.
const checkTypeReferences = (
  types: ReadonlyArray<KernelTypeRecord>,
  declared: ReadonlySet<string>,
  kinds: ReadonlyArray<KernelKindRecord>,
): void => {
  const kindNames = new Set(kinds.map((kind) => kind.name))
  const leaves = new Set<string>(TYPE_REFERENCE_LEAVES)
  const containers = new Set<string>(TYPE_REFERENCE_CONTAINERS)

  for (const type of types) {
    for (const constructor of type.constructors) {
      const bound = new Set<string>(type.params.map((param) => param.name))
      for (const field of constructor.fields) {
        const where = `${type.name}.${constructor.name}.${field.name}`
        const parsed = parseTypeReference(field.type, where)
        if (containers.has(parsed.name)) {
          if (parsed.args.length !== 1) refuse(`${where}: ${parsed.name} takes one argument`)
          const inner = parseTypeReference(parsed.args[0]!, where)
          if (!leaves.has(inner.name) && !declared.has(inner.name)) {
            refuse(`${where}: ${inner.name} is neither a leaf nor a declared type`)
          }
          continue
        }
        if (!leaves.has(parsed.name) && !declared.has(parsed.name)) {
          refuse(`${where}: ${parsed.name} is neither a leaf nor a declared type`)
        }
        for (const argument of parsed.args) {
          if (!kindNames.has(argument) && !bound.has(argument)) {
            refuse(`${where}: brand argument ${argument} names no kind and no earlier field`)
          }
        }
        bound.add(field.name)
      }
    }
  }
}

/**
 * Reads one format-2 interchange file. Every violation refuses with the
 * reason and the line, so a moved artifact stops the build at the line that
 * moved rather than three derivations later.
 */
export const readKernelCorpus = (source: string): KernelCorpus => {
  const rows = checkBytes(source)
  checkCanonical(rows)

  const header = decodeCanonicalText(KernelHeaderRecord, rows[0]!)
  if (!header.ok) {
    refuse(
      `line 1 is not a format-${KERNEL_CORPUS_FORMAT} header: ${header.reason}` +
        `\n  this reader understands format ${KERNEL_CORPUS_FORMAT} and no other`,
    )
  }

  const kinds: Array<KernelKindRecord> = []
  const stages: Array<KernelStageRecord> = []
  const refusals: Array<KernelRefusalRecord> = []
  const types: Array<KernelTypeRecord> = []
  const encodings: Array<KernelEncodingRecord> = []
  const admissions: Array<KernelAdmissionRecord> = []
  const docs: Array<KernelDocRecord> = []
  const canons: Array<KernelCanonRecord> = []
  const programs: Array<KernelProgramRecord> = []
  const skipped: Array<string> = []
  const collect: { readonly [Group in KernelRecordGroup]: (row: never) => void } = {
    kind: (row: KernelKindRecord) => void kinds.push(row),
    stage: (row: KernelStageRecord) => void stages.push(row),
    refusal: (row: KernelRefusalRecord) => void refusals.push(row),
    type: (row: KernelTypeRecord) => void types.push(row),
    encoding: (row: KernelEncodingRecord) => void encodings.push(row),
    admission: (row: KernelAdmissionRecord) => void admissions.push(row),
    doc: (row: KernelDocRecord) => void docs.push(row),
    canon: (row: KernelCanonRecord) => void canons.push(row),
    program: (row: KernelProgramRecord) => void programs.push(row),
  }

  // Group order is part of the grammar, so the reader walks a fixed ladder
  // rather than sorting. A group this reader does not know is skipped, which
  // is what makes a later group add-only rather than a format bump.
  let rung = 0
  for (const [offset, line] of rows.slice(1).entries()) {
    const where = `line ${offset + 2}`
    const group = groupOf(line, where)
    if (group === "header") refuse(`${where} is a second header`)
    const at = KERNEL_RECORD_GROUPS.indexOf(group as KernelRecordGroup)
    if (at < 0) {
      if (!skipped.includes(group)) skipped.push(group)
      continue
    }
    if (at < rung) {
      refuse(`${where} is a ${group} record after a ${KERNEL_RECORD_GROUPS[rung]!} record`)
    }
    rung = at
    const known = group as KernelRecordGroup
    ;(collect[known] as (row: unknown) => void)(readGroupRecord(known, line, where))
  }

  const corpus = {
    header: header.value,
    kinds,
    stages,
    refusals,
    types,
    encodings,
    admissions,
    docs,
    canons,
    programs,
  }
  checkCounts(corpus, skipped)
  checkTables(corpus)
  return { ...corpus, lines: rows, skipped }
}

/**
 * Reads the interchange file the runtime derives from, given a repository
 * root. Every derivation - the generated schemas, the generated tables, the
 * rendered prose, the conformance wall - enters through here, so all of them
 * see one validated reading and the swap to the emitted corpus moves one
 * constant.
 */
export const loadKernelCorpus = async (repository: string): Promise<KernelCorpus> =>
  readKernelCorpus(await Bun.file(`${repository}/${CORPUS_PATH}`).text())
