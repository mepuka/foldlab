// The end-to-end smoke thread: one agent session, both directions, no
// trust anywhere. Spawns the real protod binary, speaks only the three
// verbs, and repairs itself from refusals alone — no external docs.
import { afterAll, beforeAll, expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { structureDigest, type Json } from "../src/jcs.ts"
import { Session } from "../src/session.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon
let client: ProtoClient

beforeAll(async () => {
  daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  client = connected.fact
}, 120_000)

afterAll(async () => {
  await client?.close()
  await daemon?.stop()
}, 60_000)

test("the smoke thread reads like an agent session", async () => {
  const session = new Session(client)

  // 1 — describe: learn the surface from the daemon itself.
  const described = await session.describe()
  expect(described.ok).toBe(true)
  if (!described.ok) throw new Error("describe refused")
  const contract = described.fact.contract
  expect(contract.requests.map((r) => r.name).sort()).toEqual([
    "contract_describe",
    "journal_read",
    "type_create",
    "type_fill",
    "type_unfill",
  ])
  expect(contract.ingress.note).toContain("NOT checked")
  expect(contract.scheme).toBe("bytes-sha256-v1")

  // 2 — create with a typo'd structure: the daemon refuses and teaches.
  const typoed = await session.createType({ k: "strng" })
  expect(typoed.ok).toBe(false)
  if (typoed.ok) throw new Error("typo was admitted")
  const refusal = typoed.refusal
  expect(refusal.kind).toBe("invalid-structure")
  expect(refusal.local).toBe(false)
  expect(refusal.law).toContain("flb.type.v0")
  expect(refusal.path).toEqual(["structure", "k"])
  expect(refusal.got).toBe("strng")
  expect(refusal.expected).toContain("string")
  expect(refusal.example).toEqual({ k: "string" })
  expect(refusal.next.length).toBeGreaterThan(0)

  // 3 — self-repair FROM THE REFUSAL: the example is a valid node; use
  // it directly. No docs were consulted.
  const repaired = await session.createType(refusal.example as Json)
  expect(repaired.ok).toBe(true)
  if (!repaired.ok) throw new Error("repair failed")
  expect(repaired.fact.created).toBe(true)
  const stringDigest = repaired.fact.digest
  expect(stringDigest).toBe(structureDigest({ k: "string" }))

  // 4 — create a type with a ref to the cataloged digest plus a
  // declared check (the DAG grows; checks are declared metadata).
  const refChecked: Json = {
    k: "check",
    base: { k: "ref", digest: stringDigest },
    check: { name: "minLength", args: { min: 1 } },
  }
  const created = await session.createType(refChecked, { submitter: "smoke-agent" })
  expect(created.ok).toBe(true)
  if (!created.ok) throw new Error("ref+check create refused")
  expect(created.fact.created).toBe(true)
  expect(created.fact.scheme).toBe("bytes-sha256-v1")
  const typeDigest = created.fact.digest

  // 5 — publish a frame claiming the new type: admitted, and the reply
  // says exactly what was NOT checked.
  const admitted = await session.publish("data", {
    type: typeDigest,
    payload: "hello-world",
  })
  expect(admitted.ok).toBe(true)
  if (!admitted.ok) throw new Error("publish refused")
  expect(admitted.fact.admitted).toBe(true)
  expect(admitted.fact.note).toContain("payload conformance")
  expect(admitted.fact.note).toContain("NOT checked")

  // 6 — a frame claiming an unknown identity is refused (W4), with a
  // next hint pointing at type.create.
  const unknown = await session.publish("data", { type: "e".repeat(64), payload: 1 })
  expect(unknown.ok).toBe(false)
  if (unknown.ok) throw new Error("unknown identity admitted")
  expect(unknown.refusal.kind).toBe("unknown-identity")
  expect(unknown.refusal.next.some((h) => h.subject === "flb.req.type.create")).toBe(true)

  // 7 — read the catalog and the data journal; the client recomputes
  // every head locally (verify-on-read is in the read verb itself).
  const catalog = await session.read("catalog")
  expect(catalog.ok).toBe(true)
  if (!catalog.ok) throw new Error("catalog read refused")
  expect(catalog.fact.entries.length).toBe(2) // string, ref+check
  const facts = catalog.fact.entries.map((e) => JSON.parse(e.payload))
  expect(facts[0].digest).toBe(stringDigest)
  expect(facts[1].digest).toBe(typeDigest)
  expect(facts.every((f: any) => f.scheme === "bytes-sha256-v1")).toBe(true)

  const data = await session.read("data")
  expect(data.ok).toBe(true)
  if (!data.ok) throw new Error("data read refused")
  expect(data.fact.entries.length).toBe(1)
  expect(data.fact.verified.head).toBe(admitted.fact.head) // local fold == admit claim
  const frame = JSON.parse(data.fact.entries[0]!.payload)
  expect(frame.type).toBe(typeDigest)

  // 8 — convergence: resubmitting the same structure is created:false
  // with the same fact, never an error.
  const resubmitted = await session.createType(refChecked)
  expect(resubmitted.ok).toBe(true)
  if (!resubmitted.ok) throw new Error("convergence refused")
  expect(resubmitted.fact.created).toBe(false)
  expect(resubmitted.fact.digest).toBe(typeDigest)

  // 9 — an asserted-digest lie is refused with both values (W1).
  const lie = "d".repeat(64)
  const refused = await session.createType({ k: "bool" }, { assertedDigest: lie })
  expect(refused.ok).toBe(false)
  if (refused.ok) throw new Error("the lie was believed")
  expect(refused.refusal.kind).toBe("digest-mismatch")
  expect(refused.refusal.got).toBe(lie)
  expect(refused.refusal.expected).toBe(structureDigest({ k: "bool" }))

  // The transcript witnessed the whole thread, in order.
  const verbs = session.transcript.map((t) => t.verb)
  expect(session.transcript.length).toBe(10)
  expect(new Set(verbs)).toEqual(new Set(["request", "publish", "read"]))
  expect(session.transcript.every((t, i) => t.step === i)).toBe(true)
}, 120_000)

test("client-local failures are refusal values, marked local (W8)", async () => {
  const unreachable = await ProtoClient.connect("nats://127.0.0.1:1")
  expect(unreachable.ok).toBe(false)
  if (unreachable.ok) throw new Error("connected to nothing")
  expect(unreachable.refusal.kind).toBe("unreachable")
  expect(unreachable.refusal.local).toBe(true)
}, 30_000)
