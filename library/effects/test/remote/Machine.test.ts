import { expect, it } from "@effect/vitest"
import { Effect, HashMap, HashSet, Schema } from "effect"
import { readFile } from "node:fs/promises"
import {
  initialMachineState,
  run,
  type Event,
  type MInput,
  type Op,
  type Params,
} from "../../src/internal/remoteMachine.ts"

const Byte = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 0xff }))
const Bytes = Schema.Array(Byte)
const Key = Bytes.check(Schema.isLengthBetween(32, 32))

const Load = Schema.Struct({ _tag: Schema.Literal("Load"), key: Key })
const Upload = Schema.Struct({ _tag: Schema.Literal("Upload"), bytes: Bytes, key: Key })
const Operation = Schema.Union([Load, Upload])
const Command = Operation

const Event = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("Ok"), bytes: Bytes, declared: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal("Absent") }),
  Schema.Struct({ _tag: Schema.Literal("IntegrityMismatch") }),
])

const Decision = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("Issued"), command: Command }),
  Schema.Struct({ _tag: Schema.Literal("Verified"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("Cached"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("Returned"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("BudgetRejected"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("IntegrityRejected"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("RepeatRefused"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("GaveUp"), key: Key }),
])

const Result = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("Commanded") }),
  Schema.Struct({ _tag: Schema.Literal("Delivered"), bytes: Bytes, key: Key }),
  Schema.Struct({ _tag: Schema.Literal("Uploaded"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("NotFound"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("BudgetRejected"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("IntegrityRejected"), key: Key }),
  Schema.Struct({ _tag: Schema.Literal("RepeatRefused"), key: Key }),
])

const TaggedCommand = Schema.Struct({ command: Command, op: Schema.Number })
const TaggedDecision = Schema.Struct({ decision: Decision, op: Schema.Number })
const SequenceItem = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal("OpRef"), index: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal("EventRef"), index: Schema.Number }),
])

const manifestSchema = <Family extends string>(family: Family) => Schema.Struct({
  family: Schema.Literal(family),
  meaning: Schema.String,
  model: Schema.Literal("effects-model@0.1.0"),
  oracle: Schema.String,
  rows: Schema.Array(Schema.Struct({
    case: Schema.String,
    expect: Schema.Struct({
      commands: Schema.Array(TaggedCommand),
      decisions: Schema.Array(TaggedDecision),
      results: Schema.Array(Result),
      state: Schema.Struct({
        cacheSize: Schema.Number,
        inFlightSize: Schema.Number,
        rejectedSize: Schema.Number,
      }),
    }),
    input: Schema.Struct({
      ops: Schema.Array(Schema.Struct({ id: Schema.Number, op: Operation })),
      schedule: Schema.Array(Schema.Struct({ answers: Schema.Number, event: Event })),
      sequence: Schema.Array(SequenceItem),
    }),
  })),
})

type Key = ReadonlyArray<number>
type Bytes = ReadonlyArray<number>

/** The manifest-declared 32-lane toy digest. Test-side only. */
const toyAddr = (bytes: Bytes): Key => Array.from({ length: 32 }, (_, lane) => {
  let accumulator = lane + bytes.length
  for (const byte of bytes) accumulator += byte * (lane + 3)
  return accumulator % 256
})

const params: Params<Key, Bytes> = {
  budgets: { maxBytes: 40, maxKeys: 4 },
  size: (bytes) => bytes.length,
  verify: (key, bytes) => key.length === 32
    && toyAddr(bytes).every((byte, index) => key[index] === byte),
}

const readJson = (url: URL): Effect.Effect<unknown> =>
  Effect.promise(async () => JSON.parse(await readFile(url, "utf8")) as unknown)

const assertFamily = <Family extends "RMT-001" | "RMT-002" | "RMT-003" | "RMT-004" | "RMT-015">(
  family: Family,
) => Effect.gen(function* () {
  const manifest = yield* readJson(
    new URL(`../../conformance/manifest/${family}.json`, import.meta.url),
  ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(manifestSchema(family))))

  for (const row of manifest.rows) {
    const inputs: Array<MInput<Key, Bytes>> = []
    for (const item of row.input.sequence) {
      if (item._tag === "OpRef") {
        const operation = row.input.ops[item.index]
        if (operation === undefined) throw new Error(`${row.case}: unknown operation index`)
        inputs.push({
          _tag: "Request",
          id: operation.id,
          op: operation.op as Op<Key, Bytes>,
        })
      } else {
        const scheduled = row.input.schedule[item.index]
        if (scheduled === undefined) throw new Error(`${row.case}: unknown event index`)
        inputs.push({
          _tag: "FromWire",
          id: scheduled.answers,
          event: scheduled.event as Event<Key, Bytes>,
        })
      }
    }

    const output = run(params, initialMachineState(), inputs)
    const actual = {
      commands: output.commands,
      decisions: output.decisions,
      results: output.results,
      state: {
        cacheSize: HashSet.size(output.state.cache),
        inFlightSize: HashMap.size(output.state.inFlight),
        rejectedSize: HashSet.size(output.state.rejected),
      },
    }

    expect({ case: row.case, result: actual }).toEqual({
      case: row.case,
      result: row.expect,
    })
  }
})

it.effect("RMT-001 consumes every ratified remote-admission row structurally", () =>
  assertFamily("RMT-001"))

it.effect("RMT-002 consumes every ratified remote-budget row structurally", () =>
  assertFamily("RMT-002"))

it.effect("RMT-003 consumes every ratified terminal-integrity row structurally", () =>
  assertFamily("RMT-003"))

it.effect("RMT-004 consumes every ratified deduplicated-upload row structurally", () =>
  assertFamily("RMT-004"))

it.effect("RMT-015 consumes every ratified remote-load agreement row structurally", () =>
  assertFamily("RMT-015"))
