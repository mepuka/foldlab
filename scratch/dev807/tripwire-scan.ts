/**
 * DEV-807 tripwire scan: does any committed corpus vector or program
 * declaration carry an integer outside the I-JSON safe range?
 *
 * The ruled wire grammar (§11a projection ruling 3) admits integers in the
 * I-JSON safe range only. CanonicalJson's domain is unbounded bigint. This
 * walks every committed artifact the collapse would move onto the jcs seam
 * and reports every integer the ruled grammar would refuse.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { parseCanonicalJson, type CanonicalJson } from "../../packages/plait/src/truth/CanonicalJson.js"

const SAFE = BigInt(Number.MAX_SAFE_INTEGER) // 9007199254740991

interface Hit {
  readonly file: string
  readonly line: number
  readonly path: string
  readonly value: bigint
}

const hits: Array<Hit> = []

const walk = (value: CanonicalJson, path: string, file: string, line: number): void => {
  if (typeof value === "bigint") {
    if (value > SAFE || value < -SAFE) hits.push({ file, line, path, value })
    return
  }
  if (value === null || typeof value !== "object") return
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${path}[${index}]`, file, line))
    return
  }
  for (const [key, member] of Object.entries(value as { [k: string]: CanonicalJson })) {
    walk(member, `${path}.${key}`, file, line)
  }
}

// Also catch integers that JSON.parse would round: scan the raw text for any
// digit run of 16+ digits, so a value the canonical parser never reaches
// (a non-canonical file, a JSON file) is still seen.
const rawWideRuns = (text: string, file: string): void => {
  const lines = text.split("\n")
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/(?<![\w.])-?\d{16,}(?![\w.])/g)) {
      const value = BigInt(match[0])
      if (value > SAFE || value < -SAFE) {
        const already = hits.some((hit) => hit.file === file && hit.line === index + 1 && hit.value === value)
        if (!already) hits.push({ file, line: index + 1, path: "<raw scan>", value })
      }
    }
  })
}

const ndjson = (file: string): void => {
  const text = readFileSync(file, "utf8")
  text.split("\n").filter((line) => line.length > 0).forEach((line, index) => {
    try {
      walk(parseCanonicalJson(line), "$", file, index + 1)
    } catch {
      // not canonical-domain text; the raw scan below still covers it
    }
  })
  rawWideRuns(text, file)
}

const files: Array<string> = []
const collect = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue
      collect(full)
      continue
    }
    if (entry.endsWith(".ndjson") || entry.endsWith(".json")) files.push(full)
  }
}
collect("packages/plait/fixtures")
collect("fixtures")
collect("verify/kernel")

for (const file of files) ndjson(file)

if (hits.length === 0) {
  console.log("TRIPWIRE CLEAR: no integer outside [-(2^53-1), 2^53-1] in any scanned artifact")
} else {
  console.log(`TRIPWIRE FIRED: ${hits.length} integer(s) outside the I-JSON safe range`)
  for (const hit of hits) {
    console.log(`  ${hit.file}:${hit.line} ${hit.path} = ${hit.value}`)
  }
}
console.log(`\nscanned ${files.length} files:`)
for (const file of files) console.log(`  ${file}`)
