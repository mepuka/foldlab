/**
 * The canonical schema plane: derived bytes as identity, the Effect
 * Schema carrier annotation, and schemas as store content.
 */
import { expect, it } from "@effect/vitest"
import { cast, Effect, Encoding, Option, Schema } from "effect"
import { Cas } from "../src/index.ts"
import { ContentId, UnknownKind } from "../src/cas/Node.ts"
import { CasStore, layerMemoryWith } from "../src/cas/Store.ts"
import { deterministicAddress } from "./fixtures/address.ts"

const CS = Cas.CanonicalSchema
const address = deterministicAddress()

const snapshotAst = CS.struct({
  label: CS.field(CS.stringAst),
  count: CS.field(CS.integerAst),
  note: CS.optionalField(CS.array(CS.stringAst)),
  author: CS.field(CS.ref(0x21)),
})

it("canonical bytes are deterministic and insertion-order free", () => {
  const reordered = CS.struct({
    author: CS.field(CS.ref(0x21)),
    note: CS.optionalField(CS.array(CS.stringAst)),
    count: CS.field(CS.integerAst),
    label: CS.field(CS.stringAst),
  })
  expect(Encoding.encodeHex(CS.bytesOf(snapshotAst)))
    .toBe(Encoding.encodeHex(CS.bytesOf(reordered)))
  // Distinct schemas carry distinct canonical bytes.
  expect(Encoding.encodeHex(CS.bytesOf(CS.stringAst)))
    .not.toBe(Encoding.encodeHex(CS.bytesOf(CS.integerAst)))
})

it("the carrier annotation rides an Effect Schema and reads back checked", () => {
  const Snapshot = Schema.Struct({
    label: Schema.String,
    count: Schema.Int,
  })
  const carrying = Snapshot.pipe(CS.annotate(snapshotAst))

  expect(Option.isNone(CS.astOf(Snapshot))).toBe(true)
  expect(CS.astOf(carrying)).toEqual(Option.some(snapshotAst))

  // Derived-on-read: the bytes for the carrier are the bytes of the
  // annotation, recomputed, never stored.
  const bytes = CS.bytesFor(carrying)
  expect(Option.isSome(bytes)).toBe(true)
  expect(Encoding.encodeHex(Option.getOrThrow(bytes)))
    .toBe(Encoding.encodeHex(CS.bytesOf(snapshotAst)))

  // A malformed annotation answers None, never an unchecked value.
  const corrupted = Snapshot.annotate({ [CS.AnnotationKey]: 42 })
  expect(Option.isNone(CS.astOf(corrupted))).toBe(true)
})

it.effect("schemas are content: put, address identity, exact get", () =>
  Effect.gen(function* () {
    const id = yield* CS.put(snapshotAst)
    const expected = yield* CS.addressWith(address)(snapshotAst)
    expect(id).toBe(expected)

    const back = yield* CS.get(id)
    expect(back).toEqual(snapshotAst)

    // Re-admission deduplicates: same schema, same address.
    expect(yield* CS.put(snapshotAst)).toBe(id)
  }).pipe(Effect.provide(layerMemoryWith(address))))

it.effect("get refuses a resident node of another kind", () =>
  Effect.gen(function* () {
    const store = yield* CasStore
    const alien = yield* store.put({
      kind: { version: 0, tag: 0x22 },
      payload: new Uint8Array([1, 2, 3]),
      refs: [],
    })
    const error = yield* Effect.flip(CS.get(alien))
    expect(error).toEqual(new UnknownKind({ version: 0, tag: 0x22 }))
  }).pipe(Effect.provide(layerMemoryWith(address))))

it("the schema kind tag is registry-reserved against user projections", () => {
  expect(() =>
    Cas.value({
      kindTag: CS.KindTag,
      revision: 0,
      schema: Schema.Struct({ x: Schema.String }),
    })
  ).toThrow(/reserved/)
})

it("canonical literals refuse non-integer numbers", () => {
  expect(() => CS.literal(0.5)).toThrow(/safe integers/)
  expect(CS.literal(7)).toEqual({ _tag: "Literal", value: 7 })
})

it.effect("fromAst derives a typed carrier that knows its own canonical form", () =>
  Effect.gen(function* () {
    const ast = CS.struct({
      label: CS.field(CS.stringAst),
      count: CS.field(CS.integerAst),
      note: CS.optionalField(CS.stringAst),
      kind: CS.field(CS.literal("v0")),
    })
    const derived = CS.fromAst(ast)

    // The derived carrier declares its source; bytes derive from it.
    expect(CS.astOf(derived)).toEqual(Option.some(ast))
    expect(Encoding.encodeHex(Option.getOrThrow(CS.bytesFor(derived))))
      .toBe(Encoding.encodeHex(CS.bytesOf(ast)))

    // Fully typed: the compile-time witness is the point.
    const decoded = yield* Schema.decodeUnknownEffect(derived)({
      count: 3,
      kind: "v0",
      label: "x",
    })
    const witness: {
      readonly label: string
      readonly count: number
      readonly note?: string
      readonly kind: "v0"
    } = decoded
    expect(witness.count).toBe(3)

    // The integer law travels into the carrier.
    const refused = yield* Effect.flip(Schema.decodeUnknownEffect(derived)({
      count: 2.5,
      kind: "v0",
      label: "x",
    }))
    expect(refused).toBeDefined()
  }))

it.effect("fromAst refs ride the value plane and admission checks the edge", () =>
  Effect.gen(function* () {
    const Author = Cas.value({
      kindTag: 0x21,
      revision: 0,
      schema: Schema.Struct({ name: Schema.String }),
    })
    const docAst = CS.struct({
      title: CS.field(CS.stringAst),
      author: CS.field(CS.ref(0x21)),
    })
    const Doc = Cas.value({
      kindTag: 0x22,
      revision: 0,
      schema: CS.fromAst(docAst),
    })

    const author = yield* Author.put({ name: "pierce" })
    const doc = yield* Doc.put({ title: "types", author: cast(author) })
    const back = yield* Doc.get(doc)
    expect(back.title).toBe("types")
    expect(back.author).toBe(author)

    // A dangling reference refuses at admission — the store's law
    // checks the edge the canonical schema declared.
    const ghost: Cas.Root<unknown> = cast(ContentId.make("ab".repeat(32)))
    const refusal = yield* Effect.flip(Doc.put({ title: "nope", author: ghost }))
    expect(refusal._tag).toBe("CasError/DanglingReference")
  }).pipe(Effect.provide(layerMemoryWith(address))))
