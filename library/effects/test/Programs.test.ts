/**
 * THE CROSS-HOST CODEC GATE — a program's address is the same on both
 * hosts, or red.
 *
 * `Cas.Lang.encodeProg` lays a defunctionalized table down as store
 * content: one step node per code point, then one cont node naming them
 * all, and the program's address is the cont node's.
 * `src/cas/Programs.ts` is the host mirror of that layout. The claim
 * under test is not that the two produce "compatible documents" — it is
 * that they produce THE SAME BYTES, which is the only claim a
 * content-addressed store can check.
 *
 * The fixtures make the comparison honest at both ends:
 *
 * - `generated/VectorProgramLifts.json` carries the seven registered
 *   programs as tables, emitted by Lean from the same `PProg` the
 *   TypeScript programs were printed from;
 * - `generated/VectorProgramAddresses.json` carries the addresses Lean
 *   computed for those same tables under the production digest.
 *
 * This suite decodes the first, puts it into a REAL store — every
 * address computed by THIS host's own SHA-256, nothing replayed from a
 * given address — and compares what the store answered against the
 * second. Nothing is asserted about a document; the assertion is about
 * 64 hex characters that a digest produced.
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect, Option, Schema } from "effect"
import { Cas } from "../src/index.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"
import { readFixtureString } from "./fixtures/read.ts"

const { Programs, Store } = Cas

/* ── the fixtures ────────────────────────────────────────────────── */

/** The address document Lean emits beside the programs — the
 * cross-host gate's Lean half. */
const AddressDocument = Schema.Struct({
  contAddress: Cas.ContentId,
  name: Schema.String,
  stepAddresses: Schema.Array(Cas.ContentId),
})

/** The lift document's instruction shape, as the harness emits it. The
 * v0 document spells only puts whose operands are earlier answers —
 * that is `Cas.Lang.PProg`'s served sub-fragment, and this schema says
 * so rather than admitting a wider shape it cannot mean. */
const LiftInstruction = Schema.Struct({
  index: Schema.Number,
  payloadHex: Schema.String,
  refs: Schema.Array(Schema.Struct({
    expectedTag: Schema.Number,
    source: Schema.Number,
  })),
  tag: Schema.Number,
  version: Schema.Number,
})

const LiftDocument = Schema.Struct({
  helperUnpinned: Schema.Boolean,
  instructions: Schema.Array(LiftInstruction),
  kind: Schema.Literal("lifted"),
  name: Schema.String,
  storeBinder: Schema.String,
})

const readGenerated = <A, I>(schema: Schema.Codec<A, I>, file: string) =>
  readFixtureString(`test/generated/${file}`).pipe(
    Effect.map((text) => JSON.parse(text) as unknown),
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(schema))),
  )

const hex = (s: string): Uint8Array =>
  Uint8Array.from({ length: s.length / 2 }, (_, i) => Number.parseInt(s.slice(i * 2, i * 2 + 2), 16))

/** A lift document as the table it denotes. The document's references
 * are answer indices, so every operand is `answer` — a literal address
 * has no spelling in the v0 document, which is exactly the limit queue
 * item 22 removes. */
const toProgram = (
  document: typeof LiftDocument.Type,
): Cas.Programs.Program =>
  document.instructions.map((instruction): Cas.Programs.Line => ({
    _tag: "put",
    version: instruction.version,
    tag: instruction.tag,
    payload: hex(instruction.payloadHex),
    refs: instruction.refs.map((ref) => ({
      expectedTag: ref.expectedTag,
      source: Programs.answer(ref.source),
    })),
  }))

const fixtures = Effect.gen(function* () {
  const addresses = yield* readGenerated(AddressDocument, "VectorProgramAddresses.json")
  const lifts = yield* readGenerated(LiftDocument, "VectorProgramLifts.json")
  return { addresses, lifts }
}).pipe(Effect.provide(layerDiskFs))

/* ── the gate ────────────────────────────────────────────────────── */

describe("the program codec agrees with Lean's, address for address", () => {
  it.effect("every registered program is put at the address Lean computed", () =>
    Effect.gen(function* () {
      const { addresses, lifts } = yield* fixtures
      expect(lifts.length).toBe(addresses.length)
      expect(lifts.length).toBeGreaterThan(0)

      for (const lift of lifts) {
        const expected = addresses.find((row) => row.name === lift.name)
        expect(`${lift.name} stamped`).toBe(
          expected === undefined ? `${lift.name} unstamped` : `${lift.name} stamped`,
        )
        if (expected === undefined) continue

        const store = yield* Store
        // The store computes every address itself. Nothing below is
        // replayed from the fixture — the fixture is only what the
        // answers are COMPARED to.
        const stored = yield* Programs.putProgram(store, toProgram(lift))

        expect(`${lift.name} steps ${stored.steps.length}`).toBe(
          `${lift.name} steps ${expected.stepAddresses.length}`,
        )
        for (const [position, address] of expected.stepAddresses.entries()) {
          expect(`${lift.name}.step[${position}] ${stored.steps[position]}`)
            .toBe(`${lift.name}.step[${position}] ${address}`)
        }
        expect(`${lift.name}.cont ${stored.address}`)
          .toBe(`${lift.name}.cont ${expected.contAddress}`)
      }
    }).pipe(Effect.provide(Cas.layerMemoryLive)))

  it.effect("a stored program decodes back to exactly the table put", () =>
    Effect.gen(function* () {
      const { lifts } = yield* fixtures
      for (const lift of lifts) {
        const store = yield* Store
        const program = toProgram(lift)
        const stored = yield* Programs.putProgram(store, program)
        // `decodeProg_encodeProg`, run against a real store instead of
        // against a word.
        const recovered = yield* Programs.loadProgram(store, stored.address)
        expect(`${lift.name} lines ${recovered.length}`).toBe(
          `${lift.name} lines ${program.length}`,
        )
        for (const [index, line] of program.entries()) {
          expect(`${lift.name}[${index}] ${JSON.stringify(recovered[index])}`)
            .toBe(`${lift.name}[${index}] ${JSON.stringify(line)}`)
        }
      }
    }).pipe(Effect.provide(Cas.layerMemoryLive)))

  it.effect("running a stored program reproduces its vector's word", () =>
    Effect.gen(function* () {
      const { lifts } = yield* fixtures
      const store = yield* Store
      for (const lift of lifts) {
        const stored = yield* Programs.putProgram(store, toProgram(lift))
        const direct = yield* Programs.runProgram(store, toProgram(lift))
        // The whole brain stem: by ADDRESS, not by document.
        const byAddress = yield* Programs.runProgramAt(store, stored.address)
        expect(`${lift.name} ${byAddress.word.join(",")}`)
          .toBe(`${lift.name} ${direct.word.join(",")}`)
        expect(`${lift.name} lines ${byAddress.word.length}`)
          .toBe(`${lift.name} lines ${lift.instructions.length}`)
      }
    }).pipe(Effect.provide(Cas.layerMemoryLive)))
})

/* ── the sub-language the lift document cannot spell ─────────────── */

describe("the codec carries the whole table, not the served sub-fragment", () => {
  it.effect("a literal-address operand and a load round-trip through content", () =>
    Effect.gen(function* () {
      const store = yield* Store
      // A value node put by an ordinary program, so its address exists
      // to be named literally by the next one.
      const seed = yield* store.put({
        kind: { version: 0, tag: 1 },
        payload: new TextEncoder().encode("hello, cas"),
        refs: [],
      })

      // The two things `RunParams` had no spelling for before queue
      // item 22: a LITERAL address operand, and a LOAD instruction.
      const program: Cas.Programs.Program = [
        { _tag: "load", source: Programs.literal(seed) },
        {
          _tag: "put",
          version: 0,
          tag: 9,
          payload: new Uint8Array(),
          refs: [{ expectedTag: 1, source: Programs.literal(seed) }],
        },
      ]

      const stored = yield* Programs.putProgram(store, program)
      const recovered = yield* Programs.loadProgram(store, stored.address)
      expect(JSON.stringify(recovered)).toBe(JSON.stringify(program))

      const outcome = yield* Programs.runProgramAt(store, stored.address)
      // A load admits nothing, so it extends the answer history and not
      // the word. The word is one binding; the history is two.
      expect(outcome.word.length).toBe(1)
      expect(outcome.answers.length).toBe(2)
      expect(outcome.answers[0]).toBe(seed)
    }).pipe(Effect.provide(Cas.layerMemoryLive)))

  it.effect("the address a table would be put at is the address it is put at", () =>
    Effect.gen(function* () {
      const store = yield* Store
      const address = yield* Cas.AddressScheme
      const program: Cas.Programs.Program = [
        { _tag: "put", version: 0, tag: 1, payload: hex("abcdef"), refs: [] },
        { _tag: "load", source: Programs.answer(0) },
      ]
      // Computed from the bytes alone, no store touched.
      const predicted = yield* Programs.programAddress(address.digest, program)
      const stored = yield* Programs.putProgram(store, program)
      expect(predicted.address).toBe(stored.address)
      expect(predicted.steps.join(",")).toBe(stored.steps.join(","))
    }).pipe(Effect.provide(Cas.layerMemoryLive)))
})

/* ── fail-closed ─────────────────────────────────────────────────── */

describe("the program plane is fail-closed", () => {
  it.effect("a node that is not a cont node is not a program", () =>
    Effect.gen(function* () {
      const store = yield* Store
      const value = yield* store.put({
        kind: { version: 0, tag: 1 },
        payload: hex("00"),
        refs: [],
      })
      const outcome = yield* Effect.exit(Programs.loadProgram(store, value))
      expect(outcome._tag).toBe("Failure")
    }).pipe(Effect.provide(Cas.layerMemoryLive)))

  it.effect("a step node whose payload is not a code point is refused", () =>
    Effect.gen(function* () {
      // The discriminator byte is neither 0 nor 1, so the body is not a
      // line encoding at all.
      expect(Option.isNone(Programs.decodeLineBody(hex("07")))).toBe(true)
      // A well-formed put body with one trailing byte: the reader is
      // closed, so slack is a refusal rather than ignored.
      const line: Cas.Programs.Line = {
        _tag: "put",
        version: 0,
        tag: 1,
        payload: hex("ab"),
        refs: [],
      }
      const body = Programs.encodeLineBody(line)
      expect(Option.isSome(Programs.decodeLineBody(body))).toBe(true)
      const slack = new Uint8Array(body.length + 1)
      slack.set(body)
      expect(Option.isNone(Programs.decodeLineBody(slack))).toBe(true)
      return yield* Effect.void
    }))

  it.effect("a code point naming an answer that has not been given refuses", () =>
    Effect.gen(function* () {
      const store = yield* Store
      const program: Cas.Programs.Program = [
        {
          _tag: "put",
          version: 0,
          tag: 9,
          payload: new Uint8Array(),
          refs: [{ expectedTag: 1, source: Programs.answer(3) }],
        },
      ]
      const outcome = yield* Effect.exit(Programs.runProgram(store, program))
      expect(outcome._tag).toBe("Failure")
    }).pipe(Effect.provide(Cas.layerMemoryLive)))
})
