/**
 * The declaration registry, TypeScript side — the door's allowlist and
 * its Lean twin.
 *
 * `CanonicalSchema.DeclarationRegistry` is the hand mirror of
 * `Cas.Schema.DeclarationId` (`library/cas/Cas/Schema/Declarations.lean`).
 * The first statement below reads the Lean file and compares the two
 * tables row for row, so drift on either side is a red suite rather than
 * an asymmetry someone notices later; the rest exercise what the rows
 * buy — revival of a stored Date/URL/Option through Effect's OWN
 * revivers, and refusal, by the same name the Lean door uses
 * (`IngestRefusal.unknownDeclaration`), of an id no row admits.
 *
 * The three Effect rows are adopted pending operator ratification
 * (SCHEMA-MATERIALIZATION.md ruling-queue item 7). Each is one row here,
 * one reviver there, and one entry in `admittedRows` below.
 */
import { expect, it } from "@effect/vitest"
import { Effect, Layer, Option, Schema, SchemaRepresentation } from "effect"
import { Cas } from "../src/index.ts"
import { CasStore } from "../src/cas/Store.ts"
import { canonicalJson } from "../src/cas/Value.ts"
import { deterministicAddress } from "./fixtures/address.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"
import { readFixtureString } from "./fixtures/read.ts"

const CS = Cas.CanonicalSchema
const layer = Layer.mergeAll(
  Cas.layerMemoryWith(deterministicAddress()),
  layerDiskFs,
)
const utf8 = new TextDecoder("utf-8", { fatal: true })

/** One admitted row and a carrier that exercises it. Row zero's carrier
 * is the estate's own reference declaration; the other three are
 * Effect's own built-ins, taken verbatim. */
const admittedRows: ReadonlyArray<readonly [string, Schema.Top]> = [
  ["foldlab/cas/ref", CS.ref(9)],
  ["effect/schema/Date", Schema.Date],
  ["effect/schema/URL", Schema.URL],
  ["effect/schema/Option", Schema.Option(Schema.String)],
]

/** The body of one Lean `def <name> : ... → ...` block. */
const leanBody = (source: string, header: string): string => {
  const start = source.indexOf(header)
  expect(`${header} present`).toBe(start < 0 ? `${header} missing` : `${header} present`)
  const body = source.slice(start + header.length)
  const end = body.indexOf("\n\n")
  return body.slice(0, end < 0 ? undefined : end)
}

/** The match arms of one Lean `def <name> : ... → ...` block, as
 * `[constructor, right-hand side]` pairs in source order. Deliberately
 * a dumb reader: it must break loudly if the Lean table stops being a
 * flat table. */
const leanArms = (
  source: string,
  header: string,
): ReadonlyArray<readonly [string, string]> =>
  leanBody(source, header).split("\n").flatMap((line) => {
    const arm = /^\s*\|\s*\.(\w+)\s*=>\s*(.+?)\s*$/.exec(line)
    return arm === null ? [] : [[arm[1]!, arm[2]!] as const]
  })

/** The two-argument arms of the payload gate, as
 * `[row, payload constructor, right-hand side]` triples. The payload
 * column is a CONSTANT DUPLICATED across the two runtimes — the door's
 * wf gate reads it on the TypeScript side and `Ast.wf` reads it on the
 * Lean side — so it gets the same treatment the wire and arity columns
 * already get. */
const leanPayloadArms = (
  source: string,
): ReadonlyArray<readonly [string, string, string]> =>
  leanBody(source, "def DeclarationId.payloadWf : DeclarationId → DeclPayload → Bool")
    .split("\n").flatMap((line) => {
      // The payload constructor may bind a variable (`.nat t`), so the
      // binder is matched and discarded rather than tripping the reader.
      const arm = /^\s*\|\s*\.(\w+),\s*\.(\w+)(?:\s+\w+)*\s*=>\s*(.+?)\s*$/.exec(line)
      return arm === null ? [] : [[arm[1]!, arm[2]!, arm[3]!] as const]
    })

/** The Lean payload constructor, as the TypeScript column spells it. */
const payloadColumn = (constructor: string): string => {
  const column: Record<string, string> = { nat: "byte", null: "null" }
  const named = column[constructor]
  expect(`${constructor} has a column`).toBe(
    named === undefined ? `${constructor} has no column` : `${constructor} has a column`,
  )
  return named!
}

/** Admit one document's canonical payload bytes as a schema node and
 * read the identity back through the front door. */
const throughTheStore = (identity: Schema.Top) =>
  Effect.gen(function* () {
    const id = yield* CS.put(identity)
    return yield* CS.get(id)
  })

it.effect("the TypeScript declaration registry mirrors Declarations.lean row for row", () =>
  Effect.gen(function* () {
    const source = yield* readFixtureString(
      "../cas/Cas/Schema/Declarations.lean",
    ).pipe(Effect.orDie)
    const wires = leanArms(source, "def DeclarationId.wire : DeclarationId → String")
    const arities = leanArms(source, "def DeclarationId.arity : DeclarationId → Nat")
    const payloads = leanPayloadArms(source)
    const lean = wires.map(([constructor, wire], index) => {
      const arity = arities[index]
      expect(`${constructor} arity row`).toBe(
        arity === undefined || arity[0] !== constructor
          ? `${constructor} arity row out of order`
          : `${constructor} arity row`,
      )
      const payload = payloads[index]
      expect(`${constructor} payload row`).toBe(
        payload === undefined || payload[0] !== constructor
          ? `${constructor} payload row out of order`
          : `${constructor} payload row`,
      )
      return {
        arity: Number(arity![1]),
        id: JSON.parse(wire) as string,
        payload: payloadColumn(payload![1]),
      }
    })
    // Row for row, order for order, wire for wire, arity for arity,
    // payload discipline for payload discipline.
    expect(
      CS.DeclarationRegistry.map(({ arity, id, payload }) => ({ arity, id, payload })),
    ).toEqual(lean)

    // The payload gate is EXACTLY these arms: the Lean table's only
    // other arm is the catch-all, so no id admits a payload the
    // TypeScript column does not name. And the one non-null column
    // really is the kind-tag bound the TypeScript gate checks.
    expect(leanBody(
      source,
      "def DeclarationId.payloadWf : DeclarationId → DeclPayload → Bool",
    )).toContain("| _, _ => false")
    expect(payloads.find(([, constructor]) => constructor === "nat")?.[2])
      .toBe("decide (t < 256)")
  }).pipe(Effect.provide(layerDiskFs)))

it("the reviver set is the declaration registry, row for row", () => {
  // ONE LIST: the declaration arm of `Revivers` is derived from the
  // registry rows, so an admitted id with no reviver behind it (or a
  // reviver for an id the door refuses) is unspellable rather than
  // merely untested.
  expect(CS.Revivers.length).toBe(CS.CheckRevivers.length + CS.DeclarationRegistry.length)
  expect(CS.Revivers.slice(0, CS.CheckRevivers.length)).toEqual(CS.CheckRevivers)
  expect(CS.Revivers.slice(CS.CheckRevivers.length).map((reviver) => reviver.id))
    .toEqual(CS.DeclarationRegistry.map((row) => row.id))
  for (const row of CS.DeclarationRegistry) {
    expect(`${row.id} reviver`).toBe(`${row.reviver.id} reviver`)
  }
})

it.effect("a schema carrying each admitted row round-trips through the store", () =>
  Effect.gen(function* () {
    for (const [id, carrier] of admittedRows) {
      // get → fromRepresentation → representationOf: storage, revival,
      // and re-lowering agree on one byte string, which is the carrier's.
      const document = yield* throughTheStore(carrier)
      const revived = CS.fromRepresentation(document)
      expect(`${id} ${utf8.decode(CS.payloadOf(revived))}`)
        .toBe(`${id} ${utf8.decode(CS.payloadOf(carrier))}`)
      expect(`${id} ${utf8.decode(CS.payloadOf(CS.representationOf(revived)))}`)
        .toBe(`${id} ${utf8.decode(CS.payloadOf(carrier))}`)
      // The row's wire spelling is really the one that travelled.
      expect(utf8.decode(CS.payloadOf(carrier))).toContain(`"id":"${id}"`)
    }
  }).pipe(Effect.provide(layer)))

it.effect("the three adopted rows revive inside a struct, through Effect's own revivers", () =>
  Effect.gen(function* () {
    const mirror = Schema.Struct({
      at: Schema.Date,
      maybe: Schema.Option(Schema.String),
      url: Schema.URL,
    })
    const document = yield* throughTheStore(mirror)
    const revived = CS.fromRepresentation(document)
    expect(utf8.decode(CS.payloadOf(revived)))
      .toBe(utf8.decode(CS.payloadOf(mirror)))

    // A revived declaration is a live validator, not an opaque node.
    const decode = Schema.decodeUnknownEffect(
      revived as Schema.Codec<unknown, unknown>,
    )
    const when = new Date("2026-08-29T00:00:00.000Z")
    const decoded = yield* decode({
      at: when,
      maybe: Option.some("here"),
      url: new URL("https://example.test/schema"),
    })
    expect(decoded).toEqual({
      at: when,
      maybe: Option.some("here"),
      url: new URL("https://example.test/schema"),
    })
    expect(yield* Effect.exit(decode({ at: "not a date", maybe: undefined, url: 1 })))
      .toMatchObject({ _tag: "Failure" })
  }).pipe(Effect.provide(layer)))

it.effect("the arity-1 row carries its element schema in typeParameters", () =>
  Effect.gen(function* () {
    const document = yield* throughTheStore(Schema.Option(Schema.Int))
    const json = SchemaRepresentation.toJson(document) as {
      readonly representation: {
        readonly _tag: string
        readonly representation: { readonly id: string }
        readonly typeParameters: ReadonlyArray<{ readonly _tag: string }>
      }
    }
    expect(json.representation._tag).toBe("Declaration")
    expect(json.representation.representation.id).toBe("effect/schema/Option")
    // Arity 1 in the registry, one type parameter on the wire, and the
    // parameter is the element code — the check the arity column buys.
    expect(CS.DeclarationRegistry.find((row) => row.id === "effect/schema/Option")?.arity)
      .toBe(1)
    expect(json.representation.typeParameters.length).toBe(1)
    expect(json.representation.typeParameters[0]!._tag).toBe("Number")

    const revived = CS.fromRepresentation(document) as Schema.Codec<unknown, unknown>
    expect(yield* Schema.decodeUnknownEffect(revived)(Option.some(7)))
      .toEqual(Option.some(7))
    expect(yield* Effect.exit(
      Schema.decodeUnknownEffect(revived)(Option.some("seven")),
    )).toMatchObject({ _tag: "Failure" })
  }).pipe(Effect.provide(layer)))

it("an unknown declaration id is refused at the strict document gate", () => {
  const unknown = SchemaRepresentation.toJson(
    SchemaRepresentation.toRepresentation(Schema.Duration.ast),
  )
  // `effect/schema/Duration` ships the whole Effect contract and is
  // still refused: admission is the registry, not Effect's catalogue.
  expect(() => CS.fromJson(unknown)).toThrow(
    /unknown declaration "effect\/schema\/Duration"/,
  )
  expect(() => CS.fromJson(SchemaRepresentation.toJson(
    SchemaRepresentation.toRepresentation(
      Schema.Struct({ nested: Schema.Duration }).ast,
    ),
  ))).toThrow(/unknown declaration "effect\/schema\/Duration"/)
})

it.effect("the door refuses a stored node carrying an unadmitted declaration", () =>
  Effect.gen(function* () {
    const payload = new TextEncoder().encode(canonicalJson({
      revision: CS.Revision,
      value: SchemaRepresentation.toJson(
        SchemaRepresentation.toRepresentation(Schema.Duration.ast),
      ),
    }))
    const store = yield* CasStore
    const id = yield* store.put({
      kind: { tag: CS.KindTag, version: Cas.SchemeVersion },
      payload,
      refs: [],
    })
    const failure = yield* Effect.flip(CS.get(id))
    expect(failure._tag).toBe("ProjectionCodecFailure")
    expect(String((failure as Cas.ProjectionCodecFailure).issue))
      .toContain("unknown declaration")
  }).pipe(Effect.provide(layer)))
