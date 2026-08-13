// FINDING-ACCEPTANCE-WIDTH-001: one contract-described ingress frame has
// four derived/runtime faces and three width semantics. The honest finding is
// opt-in and red until the width language is ratified; the always-green
// control proves the comparator agrees when no excess key is present.
import { afterAll, beforeAll, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Schema } from "effect"
import { ProtoClient } from "../src/client.ts"
import { toEffectSchema, toGoSource, toJsonSchema } from "../src/codegen.ts"
import { structureDigest, type Json } from "../src/jcs.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

const FINDING_ENABLED = process.env["FOLDLAB_FINDING_ACCEPTANCE_WIDTH"] === "1"

type Outcome =
  | { readonly accepted: false }
  | { readonly accepted: true; readonly value: Json }

let daemon: RunningDaemon
let client: ProtoClient
let typeDigest: string
let frameStructure: Json

beforeAll(async () => {
  daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  client = connected.fact

  const created = await client.createType({ k: "string" })
  if (!created.ok) throw new Error(`type.create refused: ${JSON.stringify(created.refusal)}`)
  typeDigest = created.fact.digest

  // The witness derives from the daemon's public contract, not a copied frame
  // declaration. This is the same public source the MCP face consumes.
  const described = await client.describe()
  if (!described.ok) throw new Error(`contract.describe refused: ${JSON.stringify(described.refusal)}`)
  frameStructure = described.fact.contract.ingress.frame as Json
}, 120_000)

afterAll(async () => {
  await client?.close()
  await daemon?.stop()
}, 60_000)

/**
 * A deliberately narrow reading of the emitted JSON Schema keyword, not an
 * independent validator. The repository licenses no JSON Schema evaluator.
 * It is sound only for this minimized top-level object witness: every declared
 * property is otherwise known-good, and `additionalProperties: false`
 * normatively refuses any remaining key.
 */
const observeJsonSchemaWidth = (structure: Json, input: Record<string, Json>): Outcome => {
  const derived = toJsonSchema(structure)
  if (!derived.ok) throw new Error(`JSON Schema derivation refused: ${JSON.stringify(derived.refusal)}`)
  const properties = derived.value["properties"]
  if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
    throw new Error(`frame JSON Schema has no object properties: ${JSON.stringify(derived.value)}`)
  }
  const declared = new Set(Object.keys(properties))
  const hasExcessKey = Object.keys(input).some((key) => !declared.has(key))
  return derived.value["additionalProperties"] === false && hasExcessKey
    ? { accepted: false }
    : { accepted: true, value: input }
}

const observeEffect = (structure: Json, input: Record<string, Json>): Outcome => {
  const derived = toEffectSchema(structure)
  if (!derived.ok) throw new Error(`Effect derivation refused: ${JSON.stringify(derived.refusal)}`)
  // This concrete contract-derived schema has no services. The public
  // toEffectSchema return type is intentionally wider (`Schema.Top`).
  const decoded = Schema.decodeUnknownResult(
    derived.value as Schema.Codec<unknown, unknown, never, never>,
  )(input)
  return decoded._tag === "Failure"
    ? { accepted: false }
    : { accepted: true, value: decoded.success as Json }
}

const observeGo = (structure: Json, input: Record<string, Json>): Outcome => {
  const derived = toGoSource(structure, "IngressFrame", structureDigest(structure))
  if (!derived.ok) throw new Error(`Go derivation refused: ${JSON.stringify(derived.refusal)}`)

  const dir = mkdtempSync(join(tmpdir(), "flb-width-finding-"))
  try {
    const generatedDir = join(dir, "flbtypes")
    mkdirSync(generatedDir)
    writeFileSync(join(dir, "go.mod"), "module widthfinding\n\ngo 1.26\n")
    writeFileSync(join(generatedDir, "generated.go"), derived.value)
    writeFileSync(join(dir, "main.go"), `package main

import (
  "encoding/json"
  "fmt"
  "os"

  flbtypes "widthfinding/flbtypes"
)

func main() {
  var frame flbtypes.IngressFrame
  if err := json.Unmarshal([]byte(os.Args[1]), &frame); err != nil {
    fmt.Fprintln(os.Stderr, err)
    os.Exit(2)
  }
  encoded, err := json.Marshal(frame)
  if err != nil {
    fmt.Fprintln(os.Stderr, err)
    os.Exit(3)
  }
  fmt.Print(string(encoded))
}
`)
    const run = Bun.spawnSync(["go", "run", ".", JSON.stringify(input)], { cwd: dir })
    if (run.exitCode !== 0) return { accepted: false }
    return { accepted: true, value: JSON.parse(run.stdout.toString()) as Json }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const observeDaemon = async (
  journal: string,
  input: Record<string, Json>,
): Promise<Outcome> => {
  const admitted = await client.publish(journal, input)
  if (!admitted.ok) return { accepted: false }
  const read = await client.read(journal)
  if (!read.ok) throw new Error(`journal.read refused: ${JSON.stringify(read.refusal)}`)
  if (read.fact.entries.length !== 1) {
    throw new Error(`expected one admitted frame, got ${read.fact.entries.length}`)
  }
  return { accepted: true, value: JSON.parse(read.fact.entries[0]!.payload) as Json }
}

test("width-law sensitivity control: the four faces agree without an excess key", async () => {
  const frame: Record<string, Json> = { type: typeDigest, payload: "ok" }
  const expected: Outcome = { accepted: true, value: frame }
  const outcomes = [
    observeJsonSchemaWidth(frameStructure, frame),
    observeEffect(frameStructure, frame),
    observeGo(frameStructure, frame),
    await observeDaemon("width-control", frame),
  ]
  expect(outcomes).toEqual([expected, expected, expected, expected])
}, 120_000)

test.skipIf(!FINDING_ENABLED)(
  "FINDING: contract-derived faces disagree on the width of one admitted frame",
  async () => {
    const frame: Record<string, Json> = {
      type: typeDigest,
      payload: "ok",
      evidence: "kept",
    }
    const knownFields: Json = { payload: "ok", type: typeDigest }
    const observations = {
      jsonSchema: observeJsonSchemaWidth(frameStructure, frame),
      effect: observeEffect(frameStructure, frame),
      go: observeGo(frameStructure, frame),
      daemon: await observeDaemon("width-finding", frame),
    }

    // Pin each public observation before the equality law goes red. JSON
    // Schema's result is the bounded keyword reading documented above; the
    // other three are executed decoders/ingress paths.
    expect(observations.jsonSchema).toEqual({ accepted: false })
    expect(observations.effect).toEqual({ accepted: true, value: knownFields })
    expect(observations.go).toEqual({ accepted: true, value: knownFields })
    expect(observations.daemon).toEqual({ accepted: true, value: frame })

    // L-ACCEPT/width law: all derived faces and the certifier must name one
    // language and one preservation policy. This is deliberately red: today
    // the four observations collapse to three distinct semantics.
    const expected = observations.daemon
    expect(Object.values(observations)).toEqual([expected, expected, expected, expected])
  },
  120_000,
)
