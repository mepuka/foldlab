/**
 * The first differential gate on the schema plane: Effect's own
 * machinery checked against the estate's, in both directions.
 *
 * Every committed fixture in `library/cas/schemas/` is loaded AS STORE
 * CONTENT — the Lean-emitted bytes are put into a store and read back
 * through `CanonicalSchema.get` — then revived into a live validator with
 * `SchemaRepresentation.fromRepresentation` under the estate's reviver
 * registry, and confronted with the hand-written mirror. Nothing here
 * derives one side from the other: storage bytes on one side, hand-typed
 * Effect Schema on the other.
 *
 * Three facts about Effect decide the shape of these assertions, and each
 * is stated where it bites:
 *
 * - `toCode` lives in a FUNCTION-valued annotation, so it does not
 *   survive `toJson`; code generation runs on a representation lowered
 *   from a LIVE schema, which is what revival produces.
 * - Effect allocates a fresh closure per filter, so two structurally
 *   identical ASTs are never `deepStrictEqual`; `expectAstEqual` below
 *   quotients function identity and compares everything else exactly.
 * - `TestSchema.Asserts.verifyLosslessTransformation` compares with
 *   `assert.deepStrictEqual`, which is prototype-strict, while
 *   fast-check's `record` emits null-prototype objects unless
 *   `noNullPrototype` is set — which Effect's arbitrary derivation does
 *   not set. It is therefore usable only on schemas that do not generate
 *   objects; `expectLossless` runs the same law for the rest.
 */
import { expect, it } from "@effect/vitest"
import {
  Effect,
  Layer,
  Option,
  Schema,
  SchemaAST,
  SchemaRepresentation,
} from "effect"
import { FastCheck, TestSchema } from "effect/testing"
import { Cas } from "../src/index.ts"
import { canonicalJson, refWithTag } from "../src/cas/Value.ts"
import { CasStore } from "../src/cas/Store.ts"
import { deterministicAddress } from "./fixtures/address.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"
import { readFixtureBytes } from "./fixtures/read.ts"
import { registry } from "./fixtures/schemaRegistry.ts"

const CS = Cas.CanonicalSchema
const address = deterministicAddress()
const layer = Layer.mergeAll(Cas.layerMemoryWith(address), layerDiskFs)
const utf8 = new TextDecoder("utf-8", { fatal: true })

/** A ref at the root: a document whose whole content is one foldlab
 * declaration. No registered code has that shape, so the `toCode`
 * contract is exercised outside a struct as well as inside one. */
const refRoot = CS.ref(0x53)

/** Admit one committed fixture's bytes as a schema node and read the
 * document back out through the front door — storage, not a constructor. */
const documentFromStore = (name: string) =>
  Effect.gen(function* () {
    const payload = yield* readFixtureBytes(`../cas/schemas/${name}.json`).pipe(
      Effect.orDie,
    )
    const store = yield* CasStore
    const id = yield* store.put({
      kind: { version: Cas.SchemeVersion, tag: CS.KindTag },
      payload,
      refs: [],
    })
    return yield* CS.get(id)
  })

/** The live representation of a schema: not JSON-round-tripped, so the
 * `toCode` annotations code generation needs are still attached. */
const liveRepresentation = (schema: Schema.Top) =>
  SchemaRepresentation.toRepresentation(schema.ast)

/** Structural AST equality, quotienting function identity. Effect builds
 * a fresh closure every time a filter is constructed (`Schema.isInt()`
 * allocates its own `run`, `toCode`, and `toJsonSchema`), so two ASTs
 * that agree in every datum still differ by reference. Functions are
 * required to be functions of the same name at the same path; every
 * other value, the check identities included, must match exactly. */
const astDifferences = (
  left: unknown,
  right: unknown,
  path: string,
  found: Array<string>,
): void => {
  if (Object.is(left, right)) return
  if (typeof left === "function" && typeof right === "function") {
    if (left.name !== right.name) {
      found.push(`${path}: function ${left.name} vs function ${right.name}`)
    }
    return
  }
  if (
    typeof left !== "object" || typeof right !== "object"
    || left === null || right === null
  ) {
    found.push(`${path}: ${String(left)} vs ${String(right)}`)
    return
  }
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) {
    found.push(`${path}: differing prototypes`)
    return
  }
  for (const key of new Set([...Reflect.ownKeys(left), ...Reflect.ownKeys(right)])) {
    astDifferences(
      Reflect.get(left, key),
      Reflect.get(right, key),
      `${path}.${String(key)}`,
      found,
    )
  }
}

const expectAstEqual = (name: string, left: Schema.Top, right: Schema.Top) => {
  const found: Array<string> = []
  astDifferences(left.ast, right.ast, name, found)
  expect(found).toEqual([])
}

/** `verifyLosslessTransformation`'s law, run where its own assertion
 * cannot be: generate, encode, decode, and require the value back.
 * `toEqual` ignores the null prototypes fast-check hands out. */
const expectLossless = async (schema: Schema.Codec<unknown, unknown>) => {
  const decode = Schema.decodeUnknownEffect(schema)
  const encode = Schema.encodeEffect(schema)
  await FastCheck.assert(
    FastCheck.asyncProperty(
      Schema.toArbitrary(schema)(FastCheck),
      async (value) => {
        expect(await Effect.runPromise(encode(value).pipe(Effect.flatMap(decode))))
          .toEqual(value)
      },
    ),
    { numRuns: 25, seed: 20260829 },
  )
}

it.effect("every committed fixture revives from storage into its hand mirror", () =>
  Effect.gen(function* () {
    for (const [name, mirror] of registry) {
      const document = yield* documentFromStore(name)
      const revived = SchemaRepresentation.fromRepresentation(document, {
        revivers: CS.Revivers,
      })
      // Revive-then-re-lower answers the mirror's own bytes, which are
      // the fixture's bytes: storage, revival, and the hand mirror agree
      // on one identity.
      const relowered = utf8.decode(CS.payloadOf(revived))
      expect(`${name} ${relowered}`)
        .toBe(`${name} ${utf8.decode(CS.payloadOf(mirror))}`)
      expect(`${name} ${relowered}`).toBe(
        `${name} ${canonicalJson({
          revision: CS.Revision,
          value: SchemaRepresentation.toJson(document),
        })}`,
      )
    }
  }).pipe(Effect.provide(layer)))

it.effect("a revived code is the hand mirror's own AST, closures aside", () =>
  Effect.gen(function* () {
    // `pin-sample` is exempt and gets its own statement below: reviving a
    // typed reference deliberately yields more than the mirror declares.
    for (const [name, mirror] of registry.filter(([n]) => n !== "pin-sample")) {
      const document = yield* documentFromStore(name)
      expectAstEqual(
        name,
        SchemaRepresentation.fromRepresentation(document, {
          revivers: CS.Revivers,
        }),
        mirror,
      )
    }
  }).pipe(Effect.provide(layer)))

it.effect("a revived typed reference is the reference codec, not the bare declaration", () =>
  Effect.gen(function* () {
    const document = yield* documentFromStore("pin-sample")
    const revived = SchemaRepresentation.fromRepresentation(document, {
      revivers: CS.Revivers,
    })
    const rootField = (schema: Schema.Top): SchemaAST.AST =>
      (schema.ast as SchemaAST.Objects).propertySignatures
        .find((property) => property.name === "root")!.type
    const revivedRoot = rootField(revived)
    const mirrorRoot = rootField(registry.find(([n]) => n === "pin-sample")![1])

    // The mirror declares the encoded sentinel; the reviver hands back
    // `refWithTag`, whose decoded side is a `Root` address. The two are
    // one identity only after the transformation is erased, which is
    // exactly what the representation does.
    expect(revivedRoot.encoding).not.toBe(undefined)
    expect(mirrorRoot.encoding).toBe(undefined)
    expect(canonicalJson(SchemaRepresentation.toJson(
      SchemaRepresentation.toRepresentation(revivedRoot),
    ))).toBe(canonicalJson(SchemaRepresentation.toJson(
      SchemaRepresentation.toRepresentation(mirrorRoot),
    )))
  }).pipe(Effect.provide(layer)))

it.effect("toCodeDocument generates TypeScript for every registered code and for a reference", () =>
  Effect.gen(function* () {
    const names = [...registry.map(([name]) => name), "ref-root"]
    const representations = yield* Effect.forEach(registry, ([name]) =>
      documentFromStore(name).pipe(Effect.map((document) =>
        liveRepresentation(SchemaRepresentation.fromRepresentation(document, {
          revivers: CS.Revivers,
        }))
      )))
    const all = [...representations, liveRepresentation(CS.fromRepresentation(
      CS.representationOf(refRoot),
    ))]
    for (const one of all) expect(one.references).toEqual({})

    const generated = SchemaRepresentation.toCodeDocument({
      references: {},
      representations: [
        all[0]!.representation,
        ...all.slice(1).map((one) => one.representation),
      ],
    })

    expect(generated.codes.map((code, index) => `${names[index]} ${code.runtime}`))
      .toEqual([
        `vector-document Schema.Struct({ "description": Schema.String, "digest": Schema.Literal("sha256-scheme0"), "name": Schema.String, "schemaVersion": Schema.Literal(1), "word": Schema.Array(Schema.Struct({ "address": Schema.String, "node": Schema.Struct({ "payload": Schema.String, "refs": Schema.Array(Schema.Struct({ "expectedTag": Schema.Number.check(Schema.isInt().annotate({ "expected": "an integer" })), "id": Schema.String })), "tag": Schema.Number.check(Schema.isInt().annotate({ "expected": "an integer" })), "version": Schema.Number.check(Schema.isInt().annotate({ "expected": "an integer" })) }) })) })`,
        `vector-index Schema.Struct({ "digest": Schema.Literal("sha256-scheme0"), "schemaVersion": Schema.Literal(1), "vectors": Schema.Array(Schema.Struct({ "bindings": Schema.Number.check(Schema.isInt().annotate({ "expected": "an integer" })), "description": Schema.String, "file": Schema.String, "name": Schema.String, "root": Schema.String })) })`,
        `pin-sample Schema.Struct({ "count": Schema.Number.check(Schema.isInt().annotate({ "expected": "an integer" })), "flag": Schema.Boolean, "items": Schema.Array(Schema.String), "label": Schema.String, "note": Schema.optionalKey(Schema.String), "root": Cas.CanonicalSchema.ref(9), "unit": Schema.Null })`,
        `literal-pin Schema.Struct({ "a": Schema.Null, "b": Schema.Literal(true), "c": Schema.optionalKey(Schema.Literal(-7)), "d": Schema.Literal("pinned") })`,
        `ref-root Cas.CanonicalSchema.ref(83)`,
      ])

    expect(generated.codes.map((code, index) => `${names[index]} ${code.Type}`))
      .toEqual([
        `vector-document { readonly "description": string, readonly "digest": "sha256-scheme0", readonly "name": string, readonly "schemaVersion": 1, readonly "word": ReadonlyArray<{ readonly "address": string, readonly "node": { readonly "payload": string, readonly "refs": ReadonlyArray<{ readonly "expectedTag": number, readonly "id": string }>, readonly "tag": number, readonly "version": number } }> }`,
        `vector-index { readonly "digest": "sha256-scheme0", readonly "schemaVersion": 1, readonly "vectors": ReadonlyArray<{ readonly "bindings": number, readonly "description": string, readonly "file": string, readonly "name": string, readonly "root": string }> }`,
        `pin-sample { readonly "count": number, readonly "flag": boolean, readonly "items": ReadonlyArray<string>, readonly "label": string, readonly "note"?: string, readonly "root": Cas.ReferenceSentinel, readonly "unit": null }`,
        `literal-pin { readonly "a": null, readonly "b": true, readonly "c"?: -7, readonly "d": "pinned" }`,
        `ref-root Cas.ReferenceSentinel`,
      ])

    // The declaration's own import rides along exactly once, and no
    // reference table is needed for the admitted subset.
    expect(generated.artifacts).toEqual([
      { _tag: "Import", importDeclaration: `import { Cas } from "@foldlab/cas"` },
    ])
    expect(generated.references).toEqual({ nonRecursives: [], recursives: {} })
  }).pipe(Effect.provide(layer)))

it.effect("a persisted document carries no toCode, so generation runs on the revived schema", () =>
  Effect.gen(function* () {
    const document = yield* documentFromStore("pin-sample")
    expect(() =>
      SchemaRepresentation.toCodeDocument({
        references: document.references,
        representations: [document.representation],
      })
    ).toThrow(/Missing toCode callback/)
  }).pipe(Effect.provide(layer)))

it("the reference declaration and the reference codec both derive arbitraries", async () => {
  // `verifyLosslessTransformation` itself, on the two shapes whose
  // generated values are not objects built by fast-check's `record`.
  await new TestSchema.Asserts(CS.ref(9))
    .verifyLosslessTransformation({ params: { numRuns: 25, seed: 20260829 } })
  await new TestSchema.Asserts(refWithTag(9))
    .verifyLosslessTransformation({ params: { numRuns: 25, seed: 20260829 } })
})

it.effect("every revived code survives the lossless-transformation law", () =>
  Effect.gen(function* () {
    for (const [name] of registry) {
      const document = yield* documentFromStore(name)
      const revived = SchemaRepresentation.fromRepresentation(document, {
        revivers: CS.Revivers,
      })
      yield* Effect.promise(() =>
        expectLossless(revived as Schema.Codec<unknown, unknown>)
      )
      expect(`${name} lossless`).toBe(`${name} lossless`)
    }
  }).pipe(Effect.provide(layer)))

it("an address annotation survives the whole persistence round trip", () => {
  expect(Cas.Annotations.AddressKey).toBe("foldlab/cas/address")
  const carried = Cas.ContentId.make("7f".repeat(32))

  // One carrier per gotcha: a checked schema, where the annotation lands
  // on the last check rather than on the node; and a transformation,
  // where only the encoded side is lowered into the representation.
  const carriers = [
    Schema.String.check(Schema.isMinLength(2)),
    Schema.FiniteFromString,
  ] as const
  for (const carrier of carriers) {
    const schema = Cas.Annotations.annotateAddress(carried)(carrier)
    expect(Option.getOrThrow(Cas.Annotations.addressOf(schema))).toBe(carried)

    const json = SchemaRepresentation.toJson(
      SchemaRepresentation.toRepresentation(schema.ast),
    )
    const revived = SchemaRepresentation.fromRepresentation(
      SchemaRepresentation.fromJson(json),
      { revivers: [Schema.isMinLengthReviver] },
    )
    expect(Option.getOrThrow(Cas.Annotations.addressOf(revived))).toBe(carried)
  }
  expect(Cas.Annotations.addressOf(Schema.String)._tag).toBe("None")
  expect(Cas.Annotations.addressOf(Schema.String.annotate({
    [Cas.Annotations.AddressKey]: "not an address",
  }))._tag).toBe("None")
})
