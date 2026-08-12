/**
 * The schema-identity wall: structural digests are pinned by frozen
 * fixture, and the representation's semantics are pinned as laws.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Schema } from "effect"
import { structuralDigest } from "../src/mint.ts"
import { battery, forgivenAsBareString } from "./schemaBattery.ts"

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../fixtures/schema-wall.json"), "utf8"),
) as Record<string, string>

const digest = (s: Schema.Top) => Effect.runSync(structuralDigest(s))

const refusal = (s: Schema.Top) => Effect.runSync(Effect.flip(structuralDigest(s))).law

describe("schema identity is pinned by fixture", () => {
  test("every battery digest reproduces the frozen fixture byte-identically", () => {
    for (const [name, schema] of Object.entries(battery)) {
      expect(`${name}:${digest(schema)}`).toBe(`${name}:${fixture[name]}`)
    }
  })

  test("brands and getter behavior are claims: identical by law to the bare shape", () => {
    for (const name of forgivenAsBareString) {
      expect(`${name}:${digest(battery[name]!)}`).toBe(
        `${name}:${fixture["bareString"]}`,
      )
    }
  })

  test("a constructor default is a claim: the defaulted struct IS the bare struct", () => {
    expect(digest(battery["defaultedStruct"]!)).toBe(fixture["defaultlessStruct"]!)
  })

  test("a check is shape: narrowing the domain moves identity", () => {
    expect(digest(battery["checkedString"]!)).not.toBe(fixture["bareString"]!)
  })

  test("registered symbols distinguish: two keys, two identities", () => {
    expect(fixture["registeredSymKeyA"]).not.toBe(fixture["registeredSymKeyB"])
    expect(fixture["uniqueSymbolA"]).not.toBe(fixture["uniqueSymbolB"])
  })

  test("a local symbol has no persistent identity: typed refusal, never a collision", () => {
    const local = Symbol("local")
    expect(refusal(Schema.Struct({ [local]: Schema.String }))).toBe("representable")
    expect(refusal(Schema.UniqueSymbol(local))).toBe("representable")
  })

  test("annotations never move identity (the founding law, re-witnessed at the wall)", () => {
    const annotated = battery["wireEvent"]!.annotate({
      title: "wire event",
      description: "a claim, not identity",
    })
    expect(digest(annotated)).toBe(fixture["wireEvent"]!)
  })
})
