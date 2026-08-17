import { afterEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { gzipSync } from "node:zlib"

import { Effect, Schema } from "effect"

import { decodeEnvelope } from "../src/Wire.js"

const goRoot = resolve(import.meta.dir, "../../../go")
const corpus = resolve(import.meta.dir, "../fixtures/envelopes.ndjson")
const temporaryDirectories: Array<string> = []
const MutantRow = Schema.Struct({
  case: Schema.String,
  digest: Schema.String,
  envelope: Schema.Json,
})

const runWall = (path: string) => Bun.spawnSync({
  cmd: ["go", "run", "./cmd/plaitwall", "--corpus", path],
  cwd: goRoot,
  stdout: "pipe",
  stderr: "pipe",
})

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) =>
    rm(path, { recursive: true, force: true })
  ))
})

describe("TS to Go envelope wall", () => {
  test("Go re-derives every TypeScript envelope digest", () => {
    const result = runWall(corpus)

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("PLAIT WALL: PASS (4 envelopes)")
  })

  test("kills the transport-form fingerprint mutant", async () => {
    const lines = (await Bun.file(corpus).text()).trimEnd().split("\n")
    const original = Schema.decodeUnknownSync(MutantRow)(JSON.parse(lines[1]!), {
      onExcessProperty: "error",
    })
    const decoded = Effect.runSync(
      decodeEnvelope(new TextEncoder().encode(JSON.stringify(original.envelope))),
    )
    const row = {
      ...original,
      digest: createHash("sha256").update(gzipSync(decoded.bytes)).digest("hex"),
    }
    lines[1] = JSON.stringify(row)

    const directory = await mkdtemp(join(tmpdir(), "plait-wall-mutant-"))
    temporaryDirectories.push(directory)
    const mutant = join(directory, "envelopes.ndjson")
    await Bun.write(mutant, `${lines.join("\n")}\n`)

    const result = runWall(mutant)

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.toString()).toContain(
      "emit-inline-unicode: digest mismatch",
    )
  })
})
