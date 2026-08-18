/**
 * The annotation wall, and the SchemaAST exploration it rests on.
 *
 * Three things are checked here that plain schemas would not give.
 *
 * **Annotations are derived, so drift is a failure.** Every generated schema's
 * `description` is the model's docstring and its `title` is that docstring's
 * first sentence. A hand-typed description that restates a docstring forks the
 * model as surely as a hand-typed refusal table would; because these are
 * generated, the assertion below is cheap and total, and an edit in the model
 * that does not reach the schema reddens here.
 *
 * **Examples are real records.** Every `examples` annotation decodes through
 * the schema it annotates. An example that no longer parses is a lie told to
 * every reader of the JSON Schema export, and it is caught before it ships.
 *
 * **The canonical writer is derived from the tree, not written per record.**
 * `canonicalWriter` walks a schema's `SchemaAST` once and returns the writer
 * for it, so the both-ways law is earned generically: add a record type and its
 * writer arrives with its schema. The walk also refuses, before any data
 * exists, a schema that *cannot* have a canonical form - a JavaScript `number`,
 * or a codec whose two views would disagree about what reaches the wire. Those
 * are refusals of a type rather than of a value, which no amount of testing
 * over values would give.
 */
import { describe, expect, test } from "bun:test"
import { Schema } from "effect"

import { loadKernelArtifact } from "./KernelConformance.harness.js"
import { firstSentence } from "../scripts/kernel-schemas.js"
import {
  KERNEL_CANONICAL_EXAMPLES_KEY,
  KERNEL_RECORD_SCHEMA,
  KERNEL_SCHEMA_PROVENANCE,
  KERNEL_TYPE_SCHEMA,
  KernelActEncoding,
  KernelCanonRecord,
  KernelRefusalRecord,
} from "../src/kernel/KernelSchemas.generated.js"
import {
  canonicalWriter,
  decodeCanonicalText,
  roundTripsCanonically,
} from "../src/truth/SchemaCanonical.js"

const corpus = await loadKernelArtifact()

const annotationsOf = (schema: { readonly ast: { readonly annotations?: unknown } }): {
  readonly [key: string]: unknown
} => (schema.ast.annotations ?? {}) as { readonly [key: string]: unknown }

describe("generated annotations are the model's own text", () => {
  test("every closed-list type has a schema, in the corpus's declaration order", () => {
    expect(Object.keys(KERNEL_TYPE_SCHEMA)).toEqual(corpus.types.map((type) => type.name))
  })

  test("every schema's description carries its docstring, and its title the first sentence", () => {
    for (const doc of corpus.docs) {
      const schema = KERNEL_TYPE_SCHEMA[doc.name as keyof typeof KERNEL_TYPE_SCHEMA]
      const annotations = annotationsOf(schema)
      expect([doc.name, annotations.identifier]).toEqual([doc.name, `Kernel${doc.name}`])
      expect([doc.name, annotations.title]).toEqual([doc.name, firstSentence(doc.doc)])
      // The description is the docstring, and then - only for a branded type -
      // one derived sentence saying where the brand went. Both halves are
      // generated; neither is retyped.
      expect([doc.name, String(annotations.description).startsWith(doc.doc)])
        .toEqual([doc.name, true])
    }
    console.info(
      `KERNEL ANNOTATIONS: PASS described=${corpus.docs.length}/${corpus.types.length}` +
        ` source=${KERNEL_SCHEMA_PROVENANCE.source} format=${KERNEL_SCHEMA_PROVENANCE.format}`,
    )
  })

  test("a branded type says where its brand went; an unbranded one does not", () => {
    const digest = annotationsOf(KERNEL_TYPE_SCHEMA.Digest)
    expect(String(digest.description)).toContain("Branded in the model by kind")
    const value = annotationsOf(KERNEL_TYPE_SCHEMA.Value)
    expect(String(value.description)).not.toContain("Branded in the model")
  })

  test("every example annotation is a record the schema it annotates accepts", () => {
    let checked = 0
    for (const [group, schema] of Object.entries(KERNEL_RECORD_SCHEMA)) {
      const examples = annotationsOf(schema).examples as ReadonlyArray<unknown> | undefined
      expect([group, examples === undefined]).toEqual([group, false])
      for (const example of examples ?? []) {
        const decoded = Schema.decodeUnknownResult(schema)(example)
        expect([group, decoded._tag]).toEqual([group, "Success"])
        checked++
      }
    }
    const vectors = annotationsOf(KernelActEncoding).examples as ReadonlyArray<unknown>
    expect(vectors).toHaveLength(corpus.encodings.length)
    for (const vector of vectors) {
      expect(Schema.decodeUnknownResult(KernelActEncoding)(vector)._tag).toBe("Success")
    }
    console.info(
      `KERNEL EXAMPLES: PASS record-examples=${checked} encoding-vectors=${vectors.length}` +
        ` canon-vectors=${corpus.canons.length}`,
    )
  })
})

describe("the canonical writer, derived from the tree", () => {
  test("the whole corpus round-trips through the generated record schemas", () => {
    const groups = new Map<string, keyof typeof KERNEL_RECORD_SCHEMA>()
    for (const group of Object.keys(KERNEL_RECORD_SCHEMA)) {
      groups.set(group, group as keyof typeof KERNEL_RECORD_SCHEMA)
    }
    const failures: Array<string> = []
    // Line one is the header, whose schema is not in the per-group table; the
    // rest each go through the schema for the group they name.
    for (const [index, line] of corpus.lines.slice(1).entries()) {
      const group = /"record":"([a-z]+)"/.exec(line)?.[1] ?? ""
      const key = groups.get(group)
      if (key === undefined) continue
      const read = roundTripsCanonically(KERNEL_RECORD_SCHEMA[key], line)
      if (!read.ok) failures.push(`line ${index + 2}: ${read.reason}`)
    }
    expect(failures).toEqual([])
    console.info(
      `SCHEMA BOTH-WAYS: PASS lines=${corpus.lines.length - 1} groups=${groups.size}` +
        " writer=derived-from-ast",
    )
  })

  test("a bigint carrier survives a value past what a double holds", () => {
    const line =
      "{\"bytes\":\"9007199254740993\",\"name\":\"big-integer\",\"record\":\"canon\","
      + "\"value\":9007199254740993}"
    const read = decodeCanonicalText(KernelCanonRecord, line)
    expect(read.ok).toBe(true)
    expect(read.ok && read.value.value).toBe(9007199254740993n)
    expect(canonicalWriter(KernelCanonRecord).toText(read.ok ? read.value : undefined!)).toBe(line)
  })

  test("a schema of JavaScript numbers is refused at derivation, before any value", () => {
    expect(() => canonicalWriter(Schema.Struct({ n: Schema.Number })))
      .toThrow(/has no canonical form/)
  })

  test("a schema with two views is refused: neither view is the one on the wire", () => {
    expect(() => canonicalWriter(Schema.Struct({ n: Schema.BigIntFromString })))
      .toThrow(/two views and no single canonical form/)
  })

  test("a decode failure names the field, through the schema's own annotations", () => {
    const read = decodeCanonicalText(
      KernelRefusalRecord,
      "{\"applicability\":\"maybe\",\"law\":\"l\",\"reason\":\"r\",\"record\":\"refusal\",\"repair\":\"p\"}",
    )
    expect(read.ok).toBe(false)
    expect(read.ok ? "" : read.reason).toContain("applicability")
  })
})

describe("the JSON Schema export", () => {
  test("a record schema exports with its title, description, and examples", () => {
    const document = Schema.toJsonSchemaDocument(KernelCanonRecord, {
      includeAnnotationKey: (key) => key === KERNEL_CANONICAL_EXAMPLES_KEY,
    })
    const definition = document.definitions.KernelCanonRecord as {
      readonly title?: string
      readonly description?: string
      readonly canonicalExamples?: ReadonlyArray<string>
    }
    expect(definition.title).toBe("Canonical form vector")
    expect(definition.description).toContain("canonical serialization")
    expect(definition.canonicalExamples).toHaveLength(corpus.canons.length)
    expect(definition.canonicalExamples?.[0]).toBe(
      "{\"bytes\":\"{}\",\"name\":\"empty-object\",\"record\":\"canon\",\"value\":{}}",
    )
    console.info(
      `JSON SCHEMA: PASS definition=KernelCanonRecord title=${JSON.stringify(definition.title)}` +
        ` canonical-examples=${definition.canonicalExamples?.length ?? 0}` +
        ` dialect=${document.dialect}`,
    )
  })

  test("the value examples are dropped, and that is why the byte examples exist", () => {
    // Measured, and pinned so it stays measured: Effect drops the whole
    // `examples` key when any example carries a bigint, because the encoded
    // view has no place to put one. Not a partial list - the key is gone. A
    // schema whose examples are all strings keeps them, which is the control
    // that makes the first half of this test mean something.
    const dropped = Schema.toJsonSchemaDocument(KernelCanonRecord)
    expect((dropped.definitions.KernelCanonRecord as { examples?: unknown }).examples)
      .toBeUndefined()
    const kept = Schema.toJsonSchemaDocument(
      Schema.Struct({ s: Schema.String }).annotate({ identifier: "OnlyStrings", examples: [{ s: "x" }] }),
    )
    expect((kept.definitions.OnlyStrings as { examples?: ReadonlyArray<unknown> }).examples)
      .toHaveLength(1)
    console.info(
      "JSON SCHEMA GAP: PASS bigint-examples=dropped-silently string-examples=kept" +
        ` workaround=${KERNEL_CANONICAL_EXAMPLES_KEY}`,
    )
  })

  test("a mini-AST schema exports the model's docstring as its description", () => {
    const document = Schema.toJsonSchemaDocument(KERNEL_TYPE_SCHEMA.Act)
    const definition = document.definitions.KernelAct as { readonly description?: string }
    const doc = corpus.docs.find((row) => row.name === "Act")
    expect(doc).toBeDefined()
    expect(definition.description).toContain(doc!.doc.split("\n")[0]!)
  })

  test("the export renders an unbounded integer as a decimal string, not a number", () => {
    // Measured, not assumed, and worth pinning: JSON Schema describes the
    // *encoded* view, and JSON has no unbounded integer, so Effect lowers a
    // bigint field to a pattern-checked string. The interchange itself writes
    // that field as a bare JSON number. So this export documents Effect's JSON
    // codec for the type, not this corpus's bytes - a consumer generating a
    // reader from it would build the wrong parser.
    const document = Schema.toJsonSchemaDocument(KernelActEncoding)
    expect(JSON.stringify(document)).toContain("\"type\":\"string\"")
    expect(JSON.stringify(document)).toContain("^-?")
    console.info(
      "JSON SCHEMA CAVEAT: PASS bigint-renders-as=string-with-integer-pattern" +
        " wire-form=json-number note=export-describes-effects-json-codec-not-the-corpus",
    )
  })
})
