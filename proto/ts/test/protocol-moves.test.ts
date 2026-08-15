import { expect, test } from "bun:test"
import { Result, Schema } from "effect"
import fixtureJson from "../../wire/fixtures/protocol-moves.json"
import { ProtoClient } from "../src/client.ts"
import type { Json } from "../src/jcs.ts"
import { bootstrapTaskAcceptance } from "../src/protocol.ts"
import { spawnProtod } from "./harness.ts"

const FillMove = Schema.Struct({
  op: Schema.Literal("fill"),
  principal: Schema.String,
  hole: Schema.String,
  value: Schema.Json,
})
const CloseMove = Schema.Struct({
  op: Schema.Literal("close"),
  principal: Schema.String,
})
const Move = Schema.Union([FillMove, CloseMove])
type Move = typeof Move.Type

const HoleSubset = Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Json))
const Vector = Schema.Struct({
  name: Schema.String,
  setup: Schema.Array(Move),
  pre: HoleSubset,
  move: Move,
  expected: Schema.optionalKey(HoleSubset),
  refusal: Schema.optionalKey(Schema.Struct({ kind: Schema.String })),
  outcome: Schema.optionalKey(Schema.Literals(["completed", "abandoned"])),
  head_unchanged: Schema.optionalKey(Schema.Boolean),
})
const Fixture = Schema.Struct({
  _provenance: Schema.String,
  version: Schema.Literal("flb.protocol.session.v0"),
  bindings: Schema.Record(Schema.String, Schema.String),
  vectors: Schema.Array(Vector),
})

const decoded = Schema.decodeUnknownResult(Fixture, { onExcessProperty: "error" })(fixtureJson)
if (Result.isFailure(decoded)) throw new Error(String(decoded.failure))
const fixture = decoded.success

const mutableJson = (value: unknown): Json => {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (Array.isArray(value)) return value.map(mutableJson)
  if (typeof value === "object") {
    const result: Record<string, Json> = {}
    for (const [key, child] of Object.entries(value)) result[key] = mutableJson(child)
    return result
  }
  throw new Error("fixture value is outside JSON")
}

const execute = (client: ProtoClient, session: string, move: Move) =>
  move.op === "close"
    ? client.closeProtocolSession(session, move.principal)
    : client.fillProtocolSession(session, move.principal, move.hole, mutableJson(move.value))

test("the shared protocol move vectors pass through the typed client decode path", async () => {
  expect(fixture._provenance).toContain("not a correspondence proof")
  const fenceDigests = new Map<string, string>()
  for (const vector of fixture.vectors) {
    const daemon = await spawnProtod()
    const connected = await ProtoClient.connect(daemon.url)
    expect(connected.ok).toBe(true)
    if (!connected.ok) {
      await daemon.stop()
      throw new Error(JSON.stringify(connected.refusal))
    }
    const client = connected.fact
    try {
      const bootstrapped = await bootstrapTaskAcceptance(client, `fixture:${vector.name}`)
      const opened = await client.openProtocolSession({
        protocol: bootstrapped.protocol,
        bindings: fixture.bindings,
      })
      expect(opened.ok).toBe(true)
      if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
      const session = opened.fact.session

      for (const setup of vector.setup) {
        const reply = await execute(client, session, setup)
        expect(reply.ok).toBe(true)
        if (!reply.ok) throw new Error(`${vector.name} setup: ${JSON.stringify(reply.refusal)}`)
      }
      const before = await client.protocolSessionState(session)
      expect(before.ok).toBe(true)
      if (!before.ok) throw new Error(JSON.stringify(before.refusal))
      expect(before.fact.holes).toMatchObject(vector.pre)

      const result = await execute(client, session, vector.move)
      if (vector.refusal !== undefined) {
        expect(result.ok).toBe(false)
        if (result.ok) throw new Error(`${vector.name}: expected refusal`)
        expect(result.refusal.kind).toBe(vector.refusal.kind)
        continue
      }
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(`${vector.name}: ${JSON.stringify(result.refusal)}`)
      if (vector.head_unchanged === true) expect(result.fact.head).toBe(before.fact.head)
      if (vector.outcome !== undefined) {
        if (vector.move.op !== "close") throw new Error(`${vector.name}: outcome belongs to close`)
        if (!("outcome" in result.fact)) throw new Error(`${vector.name}: close reply has no outcome`)
        expect(result.fact.outcome).toBe(vector.outcome)
      }
      const after = await client.protocolSessionState(session)
      expect(after.ok).toBe(true)
      if (!after.ok) throw new Error(JSON.stringify(after.refusal))
      expect(after.fact.holes).toMatchObject(vector.expected ?? {})
      if (vector.name.startsWith("fence-")) {
        if (after.fact.final_state_digest === undefined) throw new Error(`${vector.name}: no final state digest`)
        fenceDigests.set(vector.name, after.fact.final_state_digest)
      }
    } finally {
      await client.close()
      await daemon.stop()
    }
  }
  expect(fenceDigests.get("fence-coordinator-arrives-first")).toBe(
    fenceDigests.get("fence-operator-arrives-first"),
  )
}, 120_000)
