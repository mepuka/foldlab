/**
 * DEV-807 collapse probe: what would the jcs seam actually produce for every
 * committed artifact the collapse moves onto it?
 *
 * Not an argument — an execution. For each committed canon vector and each
 * committed program declaration, project the bigint-domain value onto the jcs
 * `JsonValue` domain the way the collapse would have to (bigint -> number,
 * which is the ONLY carrier `encodeJsonValue` has for an integer), run the
 * one seam, and compare against the bytes the corpus committed.
 */
import { readFileSync } from "node:fs"

import { encodeJsonValue, type JsonValue } from "../../packages/core/src/jcs.js"
import { parseCanonicalJson, type CanonicalJson } from "../../packages/plait/src/truth/CanonicalJson.js"

const CORPUS = "packages/plait/fixtures/kernel-conformance.ndjson"

/** The projection the collapse forces: the jcs domain has `number`, not `bigint`. */
const toJson = (value: CanonicalJson): JsonValue => {
  if (typeof value === "bigint") return Number(value)
  if (value === null || typeof value !== "object") return value as JsonValue
  if (Array.isArray(value)) return value.map(toJson)
  const out: { [key: string]: JsonValue } = {}
  for (const [key, member] of Object.entries(value as { [k: string]: CanonicalJson })) {
    out[key] = toJson(member)
  }
  return out
}

const jcsBytes = (value: CanonicalJson): string => {
  const encoded = encodeJsonValue(toJson(value))
  return encoded.ok ? encoded.bytes : `<REFUSED: ${encoded.refusal.reason} at ${encoded.refusal.path}>`
}

const rows = readFileSync(CORPUS, "utf8").split("\n").filter((line) => line.length > 0)
  .map((line) => parseCanonicalJson(line) as { readonly [k: string]: CanonicalJson })

let agree = 0
let diverge = 0
const report = (group: string, name: string, committed: string, produced: string): void => {
  const same = committed === produced
  if (same) agree++
  else diverge++
  console.log(`${same ? "  SAME " : "  DIFF "} ${group}/${name}`)
  if (!same) {
    console.log(`         committed: ${committed}`)
    console.log(`         jcs seam : ${produced}`)
  }
}

console.log("=== canon vectors: value -> bytes through the jcs seam ===")
for (const row of rows) {
  if (row.record !== "canon") continue
  report("canon", String(row.name), String(row.bytes), jcsBytes(row.value!))
}

console.log("\n=== program declarations: declaration -> bytes through the jcs seam ===")
for (const row of rows) {
  if (row.record !== "program") continue
  report("program", String(row.name), String(row.bytes), jcsBytes(row.declaration!))
}

console.log(`\nagree=${agree} diverge=${diverge}`)

console.log("\n=== the divergence, stated exactly ===")
const big = rows.find((row) => row.record === "canon" && row.name === "big-integer")!
const committedValue = big.value as bigint
console.log(`corpus value (bigint, exact) : ${committedValue}`)
console.log(`corpus bytes (committed)     : ${String(big.bytes)}`)
console.log(`Number(value)                : ${Number(committedValue)}`)
console.log(`jcs seam bytes               : ${jcsBytes(big.value!)}`)
console.log(`round trip is lossy          : ${BigInt(Number(committedValue)) !== committedValue}`)
console.log(`lost by                      : ${committedValue - BigInt(Number(committedValue))}`)
