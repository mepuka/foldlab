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
 * **The canonical writer is the estate's one canonicalizer, not a per-schema
 * derivation.** `roundTripsCanonically` decodes a line through the schema and
 * writes the decoded value back through `@foldlab/core/jcs`, so the both-ways
 * law is earned generically: add a record type and its writer arrives with the
 * seam. Until DEV-804 slice C this package walked each schema's `SchemaAST` to
 * build a private writer, which bought two refusals of a *type* rather than of
 * a value - a JavaScript `number` node, and a codec whose two views disagree
 * about what reaches the wire. That walk is gone with the twin it was built
 * on, and the loss is measured rather than waved at: both defects are still
 * caught, at the first record that exercises them, by the three controls at
 * the end of this block. The `number` refusal is not merely relocated - it is
 * repealed, because the estate's number domain (DEV-807) carries JavaScript
 * numbers and the ruling says the estate's canonicalizer wins.
 */
import { describe, expect, test } from "bun:test"
import { Schema } from "effect"

import type { JsonValue } from "@foldlab/core/jcs"

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
  decodeCanonicalText,
  roundTripsCanonically,
  writeCanonicalValue,
} from "../scripts/kernel-corpus.js"

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
        " writer=@foldlab/core/jcs",
    )
  })

  test("a bigint carrier survives a value past what a double holds", () => {
    const line =
      "{\"bytes\":\"9007199254740993\",\"name\":\"big-integer\",\"record\":\"canon\","
      + "\"value\":9007199254740993}"
    const read = decodeCanonicalText(KernelCanonRecord, line)
    expect(read.ok).toBe(true)
    expect(read.ok && read.value.value).toBe(9007199254740993n)
    expect(writeCanonicalValue(read.ok ? read.value as JsonValue : undefined!)).toBe(line)
    console.info(
      "CANON CARRIER: PASS vector=9007199254740993 carrier=bigint" +
        " bytes=9007199254740993 seam=@foldlab/core/jcs",
    )
  })

  test("a schema of JavaScript numbers refuses the identity it cannot hold", () => {
    // The AST walk used to refuse this schema before any data existed. The
    // estate's number domain carries JavaScript numbers now, so there is no
    // type to refuse - and the vector that made the old refusal worth having
    // still stops the schema, at the record, without rounding.
    const rounding = Schema.Struct({
      bytes: Schema.String,
      name: Schema.String,
      record: Schema.Literal("canon"),
      value: Schema.Finite,
    })
    const line =
      "{\"bytes\":\"9007199254740993\",\"name\":\"big-integer\",\"record\":\"canon\","
      + "\"value\":9007199254740993}"
    const round = roundTripsCanonically(rounding, line)
    expect(round.ok).toBe(false)
    expect(round.ok ? "" : round.reason).toContain("value")
  })

  test("a schema with two views moves the bytes at its first record", () => {
    // A codec decodes to a value whose canonical form is not the text it came
    // from, which is exactly what "two views and no single canonical form"
    // meant. Caught per record now instead of per type.
    const round = roundTripsCanonically(Schema.Struct({ n: Schema.BigIntFromString }), "{\"n\":\"5\"}")
    expect(round.ok).toBe(false)
    expect(round.ok ? "" : round.reason).toContain("re-emission moved")
  })

  test("a member the schema does not declare is dropped, and the bytes say so", () => {
    // The AST walk refused an undeclared member outright. The decode drops it
    // instead - and a dropped member is a shorter re-emission, so the byte
    // comparison is what refuses. Without this control the collapse would have
    // widened the reader silently.
    const line = "{\"extra\":1,\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}"
    const round = roundTripsCanonically(KERNEL_RECORD_SCHEMA.kind, line)
    expect(round.ok).toBe(false)
    expect(round.ok ? "" : round.reason).toContain("re-emission moved")
    console.info(
      "SCHEMA CONTROLS: PASS repealed=number-node-at-derivation" +
        " caught-per-record=two-views,undeclared-member writer=@foldlab/core/jcs",
    )
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
