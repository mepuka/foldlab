import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Schema } from "effect"
import { FastCheck } from "effect/testing"
import { ProtoClient } from "../src/client.ts"
import {
  GENESIS,
  canonicalize,
  entryDigest,
  structureDigest,
  type Json,
} from "../src/jcs.ts"
import {
  JournalSession,
  SESSION_GRAMMAR_DIGEST,
  SESSION_JOURNAL_PREFIX,
  refuseSessionCompaction,
  sessionRetentionTier,
} from "../src/session.ts"
import {
  SUBJECT_SESSION_MOVE,
  SessionStateReply,
} from "../src/wire.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon
let client: ProtoClient

beforeAll(async () => {
  daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(JSON.stringify(connected.refusal))
  client = connected.fact
}, 120_000)

afterAll(async () => {
  await client?.close()
  await daemon?.stop()
}, 60_000)

const FixtureStep = Schema.Struct({
  step: Schema.Int,
  event: Schema.Json,
  canonical: Schema.String,
  head: Schema.String,
  stateDigest: Schema.String,
})
type FixtureStep = typeof FixtureStep.Type

const SessionFixture = Schema.Struct({
  version: Schema.String,
  grammarDigest: Schema.String,
  stateScheme: Schema.String,
  session: Schema.String,
  steps: Schema.Array(FixtureStep),
})

const fixture = Schema.decodeUnknownSync(SessionFixture)(JSON.parse(readFileSync(
  new URL("../../wire/fixtures/sessions.json", import.meta.url),
  "utf8",
)))

describe("flb.session.v0", () => {
  test("R0 fixture pins every chain head and normalized state digest", async () => {
    expect(fixture.grammarDigest).toBe(SESSION_GRAMMAR_DIGEST)
    let previous = GENESIS
    for (const step of fixture.steps) {
      expect(canonicalize(asJson(step.event))).toBe(step.canonical)
      const digest = entryDigest({ seq: step.step, prev: previous, payload: step.canonical })
      expect(digest.ok).toBe(true)
      if (!digest.ok) throw new Error(digest.refusal.reason)
      expect(digest.digest).toBe(step.head)
      previous = digest.digest
    }

    const opened = await client.openSession({
      grammar: fixture.grammarDigest,
      author: "fixture-agent",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
    expect(opened.fact.session).toBe(fixture.session)
    assertFixturePrefix(opened.fact, fixture.steps[0]!)

    let current = opened.fact
    for (const step of fixture.steps.slice(1)) {
      const event = asJsonObject(step.event)
      const kind = event["kind"]
      const path = event["path"]
      if (!Array.isArray(path) || !path.every((edge) => typeof edge === "string")) {
        throw new Error("fixture path is not a string array")
      }
      const moved = kind === "fill"
        ? await client.moveSession(current.session, current.head, {
          op: "fill",
          path,
          subtree: requiredJsonField(event, "subtree"),
        })
        : await client.moveSession(current.session, current.head, {
          op: "unfill",
          path,
        })
      expect(moved.ok).toBe(true)
      if (!moved.ok) throw new Error(JSON.stringify(moved.refusal))
      current = moved.fact
      assertFixturePrefix(current, step)
    }
  }, 120_000)

  test("expectedHead is mandatory and stale refusal carries a mechanical retry", async () => {
    const opened = await JournalSession.open(client, "expected-head")
    expect(opened.ok).toBe(true)
    if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
    const session = opened.fact
    const original = session.state

    const moved = await session.fill([], { k: "list", of: { k: "hole" } })
    expect(moved.ok).toBe(true)
    if (!moved.ok) throw new Error(JSON.stringify(moved.refusal))

    const missing = await client.request(
      SUBJECT_SESSION_MOVE,
      { session: original.session, op: "unfill", path: [] },
      SessionStateReply,
    )
    expect(missing.ok).toBe(false)
    if (missing.ok) throw new Error("missing expectedHead admitted")
    expect(missing.refusal.kind).toBe("malformed")

    const stale = await client.moveSession(original.session, original.head, {
      op: "fill",
      path: ["of"],
      subtree: { k: "string" },
    })
    expect(stale.ok).toBe(false)
    if (stale.ok) throw new Error("stale head admitted")
    expect(stale.refusal.kind).toBe("session-stale")
    expect(stale.refusal.got).toEqual({
      expectedHead: original.head,
      context: { op: "fill", path: ["of"], subtree: { k: "string" } },
    })
    const expected = asJsonObject(stale.refusal.expected)
    expect(expected["currentHead"]).toBe(session.state.head)
    expect(stale.refusal.next[1]?.body).toEqual({
      session: original.session,
      expectedHead: session.state.head,
      op: "fill",
      path: ["of"],
      subtree: { k: "string" },
    })

    const unchanged = await client.sessionState(original.session)
    expect(unchanged.ok).toBe(true)
    if (!unchanged.ok) throw new Error(JSON.stringify(unchanged.refusal))
    expect(unchanged.fact.head).toBe(session.state.head)
  }, 120_000)

  test("L2 witnesses equal states with unequal heads and U4 stays history-pure", async () => {
    const left = await JournalSession.open(client, "purity-left")
    const right = await JournalSession.open(client, "purity-right")
    expect(left.ok && right.ok).toBe(true)
    if (!left.ok || !right.ok) throw new Error("open refused")

    const filled = await right.fact.fill([], { k: "string" })
    expect(filled.ok).toBe(true)
    const unfilled = await right.fact.unfill([])
    expect(unfilled.ok).toBe(true)
    if (!unfilled.ok) throw new Error(JSON.stringify(unfilled.refusal))

    expect(right.fact.state.stateDigest).toBe(left.fact.state.stateDigest)
    expect(right.fact.state.head).not.toBe(left.fact.state.head)
    expect(right.fact.state.catalogHead).toBe(left.fact.state.catalogHead)
    expect(right.fact.state.frontier).toEqual(left.fact.state.frontier)

    // Directed control: a frontier that remembers "string was tried" drops
    // that choice and therefore FAILS the equal-state/same-catalog-head law.
    const memoizingMutant = right.fact.state.frontier.map((entry) => ({
      ...entry,
      legal: entry.legal.filter((choice) => choice.kind !== "string"),
    }))
    expect(memoizingMutant).not.toEqual(left.fact.state.frontier)

    const once = await left.fact.unfill([])
    expect(once.ok).toBe(true)
    const onceHead = left.fact.state.head
    const onceDigest = left.fact.state.stateDigest
    const twice = await left.fact.unfill([])
    expect(twice.ok).toBe(true)
    expect(left.fact.state.stateDigest).toBe(onceDigest)
    expect(left.fact.state.head).not.toBe(onceHead)
  }, 120_000)

  test("U4 property: frontier is only a function of state and catalog head", async () => {
    const leafArbitrary = FastCheck.constantFrom<Json>(
      { k: "string" }, { k: "bool" }, { k: "int" }, { k: "float" },
      { k: "null" }, { k: "opaque" },
    )
    let caseIndex = 0
    await FastCheck.assert(
      FastCheck.asyncProperty(FastCheck.integer(), leafArbitrary, async (nonce, leaf) => {
        const suffix = `${nonce}-${caseIndex++}`
        const direct = await JournalSession.open(client, `purity-direct-${suffix}`)
        const roundTrip = await JournalSession.open(client, `purity-roundtrip-${suffix}`)
        expect(direct.ok && roundTrip.ok).toBe(true)
        if (!direct.ok || !roundTrip.ok) throw new Error("generated open refused")
        const filled = await roundTrip.fact.fill([], leaf)
        expect(filled.ok).toBe(true)
        const unfilled = await roundTrip.fact.unfill([])
        expect(unfilled.ok).toBe(true)
        if (!unfilled.ok) throw new Error(JSON.stringify(unfilled.refusal))
        expect(roundTrip.fact.state.stateDigest).toBe(direct.fact.state.stateDigest)
        expect(roundTrip.fact.state.catalogHead).toBe(direct.fact.state.catalogHead)
        expect(roundTrip.fact.state.frontier).toEqual(direct.fact.state.frontier)
      }),
      { seed: 0x2500_0037, numRuns: 12, endOnFailure: false },
    )
  }, 120_000)

  test("L7 replay audit converges on commit and resume verifies the journal", async () => {
    const opened = await JournalSession.open(client, "commit-auditor")
    expect(opened.ok).toBe(true)
    if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
    const session = opened.fact
    const structure: Json = {
      k: "union",
      of: [{ k: "string" }, { k: "bool" }],
    }
    const filled = await session.fill([], structure)
    expect(filled.ok).toBe(true)
    if (!filled.ok) throw new Error(JSON.stringify(filled.refusal))
    expect(filled.fact.stateDigest).toBe(structureDigest(structure))

    const committed = await session.commit("session-test")
    expect(committed.ok).toBe(true)
    if (!committed.ok) throw new Error(JSON.stringify(committed.refusal))
    expect(committed.fact.digest).toBe(committed.fact.stateDigest)
    expect(committed.fact.scheme).toBe("bytes-sha256-v1")

    const resumed = await JournalSession.resume(client, committed.fact.session)
    expect(resumed.ok).toBe(true)
    if (!resumed.ok) throw new Error(JSON.stringify(resumed.refusal))
    expect(resumed.fact.state.head).toBe(committed.fact.head)
    expect(resumed.fact.state.stateDigest).toBe(committed.fact.stateDigest)
    expect(resumed.fact.state.partial).toEqual(structure)

    const read = await client.read(committed.fact.session)
    expect(read.ok).toBe(true)
    if (!read.ok) throw new Error(JSON.stringify(read.refusal))
    expect(read.fact.verified.head).toBe(committed.fact.head)
  }, 120_000)

  test("retention is marked and compaction refuses until corpus sealing exists", () => {
    expect([
      "open", "fill", "unfill", "refusal", "utterance", "proposal", "adoption", "commit",
    ].map(sessionRetentionTier)).toEqual([
      "irreducible", "compactible", "compactible", "compactible",
      "irreducible", "irreducible", "never-discardable", "never-discardable",
    ])
    const compacted = refuseSessionCompaction("flb_session_v0_test", ["open", "fill", "refusal"])
    expect(compacted.marks.map((mark) => mark.tier)).toEqual([
      "irreducible", "compactible", "compactible",
    ])
    expect(compacted.reply.ok).toBe(false)
    if (compacted.reply.ok) throw new Error("compaction unexpectedly succeeded")
    expect(compacted.reply.refusal.kind).toBe("compaction-blocked")
    expect(compacted.reply.refusal.expected).toContain("flb.certification.v0")
  })
})

const assertFixturePrefix = (
  state: { readonly step: number; readonly head: string; readonly stateDigest: string; readonly session: string },
  step: FixtureStep,
): void => {
  expect(state.session.startsWith(SESSION_JOURNAL_PREFIX)).toBe(true)
  expect(state.step).toBe(step.step)
  expect(state.head).toBe(step.head)
  expect(state.stateDigest).toBe(step.stateDigest)
}

const requiredJsonField = (value: { readonly [key: string]: Json }, key: string): Json => {
  const field = value[key]
  if (field === undefined) throw new Error(`fixture event misses ${key}`)
  return field
}

const asJson = (value: unknown): Json => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("fixture number is not canonical JSON")
    return value
  }
  if (Array.isArray(value)) return value.map(asJson)
  if (typeof value === "object") {
    const object: Record<string, Json> = {}
    for (const [key, field] of Object.entries(value)) object[key] = asJson(field)
    return object
  }
  throw new Error("value is outside the JSON domain")
}

const asJsonObject = (value: unknown): { readonly [key: string]: Json } => {
  const json = asJson(value)
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("value is not a JSON object")
  }
  return json
}
