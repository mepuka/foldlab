import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { FastCheck } from "effect/testing"
import { algebras, steps, type FoldState } from "../../../packages/core/src/algebra.ts"
import { defineFold } from "../../../packages/core/src/fold.ts"
import { event } from "../../../packages/core/src/stream.ts"
import { ProtoClient } from "../src/client.ts"
import { foldChain, structureDigest, type ChainEntry, type Json } from "../src/jcs.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

interface QueryFixture {
  readonly _provenance: string
  readonly pattern: Json
  readonly queryDigest: string
  readonly overCatalogHead: string
  readonly entries: ReadonlyArray<ChainEntry>
  readonly results: ReadonlyArray<{
    readonly digest: string
    readonly scheme: string
    readonly structure: Json
    readonly catalogSeq: number
    readonly catalogHead: string
  }>
}

const fixture = (await import("../../wire/fixtures/catalog-query.json", {
  with: { type: "json" },
})).default as QueryFixture

const recompute = (pattern: Json, entries: ReadonlyArray<ChainEntry>) => {
  const fold = defineFold(algebras.setUnion, steps.structureMatches(pattern as FoldState))
  const events = entries.map((entry) => event("catalog", entry.seq, entry.payload))
  if (fold.digest === undefined) throw new Error("declared catalog query lost its identity")
  return { digest: fold.digest, results: [...fold.fold(events)] }
}

describe("U2 R0 — frozen catalog-query certificates", () => {
  test("every row re-derives and the query names the exact verified prefix", () => {
    const chain = foldChain(fixture.entries)
    expect(chain.ok).toBe(true)
    if (!chain.ok) throw new Error(chain.reason)
    expect(chain.head).toBe(fixture.overCatalogHead)

    for (const row of fixture.results) {
      expect(row.scheme).toBe("bytes-sha256-v1")
      expect(structureDigest(row.structure)).toBe(row.digest)
      const prefix = foldChain(fixture.entries.slice(0, row.catalogSeq + 1))
      expect(prefix.ok).toBe(true)
      if (prefix.ok) expect(prefix.head).toBe(row.catalogHead)
    }

    const folded = recompute(fixture.pattern, fixture.entries)
    expect(folded.digest).toBe(fixture.queryDigest)
    expect(folded.results).toEqual(fixture.results.map((row) => row.digest))
    expect(fixture._provenance).toContain("generated once by the Go query fixture")
  })

  test("negative controls detect a forged row and an incomplete set", () => {
    const first = fixture.results[0]!
    expect(structureDigest({ k: "bool" })).not.toBe(first.digest)
    const honest = recompute(fixture.pattern, fixture.entries).results
    expect(honest.slice(1)).not.toEqual(honest)
  })
})

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

test("type.get returns one client-verified certificate and typed absence", async () => {
  const structure: Json = { k: "brand", name: "CatalogQueryGet", of: { k: "string" } }
  const created = await client.createType(structure)
  expect(created.ok).toBe(true)
  if (!created.ok) throw new Error(JSON.stringify(created.refusal))

  const got = await client.getType(created.fact.digest)
  expect(got.ok).toBe(true)
  if (!got.ok) throw new Error(JSON.stringify(got.refusal))
  expect(got.fact.digest).toBe(created.fact.digest)
  expect(got.fact.structure).toEqual(structure)
  expect(got.fact.catalogSeq).toBe(created.fact.catalogSeq)
  expect(got.fact.catalogHead).toBe(created.fact.catalogHead)

  const absent = await client.getType("f".repeat(64))
  expect(absent.ok).toBe(false)
  if (!absent.ok) {
    expect(absent.refusal.kind).toBe("unknown-identity")
    expect(absent.refusal.local).toBe(false)
  }
}, 120_000)

test("U2 R1 — recomputed fold equals the returned set at generated catalog prefixes", async () => {
  let run = 0
  await FastCheck.assert(
    FastCheck.asyncProperty(
      FastCheck.integer({ min: -1_000_000, max: 1_000_000 }),
      FastCheck.boolean(),
      async (sample, broad) => {
        const name = `CatalogQuery_${run++}_${sample}`
        const structure: Json = { k: "brand", name, of: { k: "list", of: { k: "string" } } }
        const created = await client.createType(structure)
        expect(created.ok).toBe(true)

        const pattern: Json = broad
          ? { k: "hole" }
          : { k: "brand", name, of: { k: "hole" } }
        const queried = await client.queryCatalog(pattern)
        expect(queried.ok).toBe(true)
        if (!queried.ok) throw new Error(JSON.stringify(queried.refusal))

        const catalog = await client.read("catalog")
        expect(catalog.ok).toBe(true)
        if (!catalog.ok) throw new Error(JSON.stringify(catalog.refusal))
        const folded = recompute(pattern, catalog.fact.entries)
        expect(queried.fact.queryDigest).toBe(folded.digest)
        expect(queried.fact.overCatalogHead).toBe(catalog.fact.verified.head)
        expect(queried.fact.results.map((row) => row.digest)).toEqual(folded.results)
      },
    ),
    { numRuns: 24 },
  )
}, 120_000)
