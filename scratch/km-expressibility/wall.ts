/**
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * Artifact 4 of the slice: the PARITY WALL. Four checks, in the order a reader
 * should lose confidence in them.
 *
 * 1. **preimage** — the digest is recomputed from the term and matched against
 *    the canonical bytes `emit.ts` wrote, so the digest names a preimage anyone
 *    can rehash rather than a number the emitter asserted.
 * 2. **parity** — every shared field is pulled back OUT of each projection's own
 *    bytes, by a parser written for that medium (wrapped JSDoc, a labelled JSON
 *    description, markdown table cells), and byte-compared across the three and
 *    against what the term derives. A renderer that drops or mangles a field
 *    fails here; a renderer that never rendered it fails here too.
 * 3. **oracle** — three of the four statement pairs are the join operator's own,
 *    and are byte-compared against the block committed in
 *    `docs/design/2026-08-18-km-algebraic-register.md` §6.3. Both-sides-agree is
 *    not verification (AGENTS.md, working precepts): checks 1 and 2 prove only
 *    that three projections of one term agree with each other, which they would
 *    also do if the term were wrong. §6.3 was written before this exemplar and
 *    by another hand, so it is the oracle outside both sides.
 * 4. **anchor** — every runtime fact the term declares is matched against the
 *    shipped source it names. The denotation is anchored to code, not to a
 *    story about code.
 *
 * A wall that cannot go red proves nothing: `run.sh` mutates one shared field
 * in one projection and requires this to fail on exactly that field.
 *
 * Run: `bun scratch/km-expressibility/wall.ts [generated-dir]`
 */

import { relative, resolve } from "node:path"

import {
  algebraic,
  DERIVED_ORDER,
  LAWS_OF,
  plainWords,
  REQUIRES,
  REWRITE,
  SHARED,
  SHARED_FIELDS,
  type Shared,
  type Statement,
  TERM,
  TERM_DIGEST,
  canonicalBytes,
} from "./term.ts"

const repository = resolve(import.meta.dir, "../..")
const directory = resolve(import.meta.dir, Bun.argv[2] ?? "generated")

const read = (path: string): Promise<string> => Bun.file(resolve(directory, path)).text()
const readRepository = (path: string): Promise<string> =>
  Bun.file(resolve(repository, path)).text()

let failures = 0
const fail = (line: string): void => {
  failures += 1
  console.log(`  FAIL  ${line}`)
}

/** Pulls one capture out of a text, or names what it could not find. */
const capture = (medium: string, field: string, text: string, pattern: RegExp): string => {
  const found = pattern.exec(text)
  if (found === null || found[1] === undefined) {
    fail(`${medium}: no ${field} — ${String(pattern)} matched nothing`)
    return `<${medium}:${field} not found>`
  }
  return found[1].trim()
}

// -- Medium 1: the wrapped JSDoc of the generated TypeScript surface ----------

/** Strips the comment furniture and rejoins wrapped lines into paragraphs. */
const paragraphsOf = (block: string): readonly string[] => {
  const lines = block
    .split("\n")
    .slice(1, -1)
    .map((line) => line.replace(/^\s*\*\s?/, ""))
  const paragraphs: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) paragraphs.push(current.join(" "))
      current = []
    } else current.push(line.trim())
  }
  if (current.length > 0) paragraphs.push(current.join(" "))
  return paragraphs
}

const fromSurface = (source: string): Shared => {
  const medium = "surface(.ts)"
  const declaration = /declare function (\w+)<[^>]*>\(\n((?:[^)]*\n)*?)\):/.exec(source)
  const signature = declaration === null || declaration[1] === undefined
    ? `<${medium}:signature not found>`
    : `${declaration[1]}(${
      (declaration[2] ?? "")
        .split("\n")
        .map((line) => /^\s*(\w+):/.exec(line)?.[1])
        .filter((name): name is string => name !== undefined)
        .join(", ")
    })`

  // The docstring is the last JSDoc block before the declaration it documents.
  const before = source.slice(0, source.indexOf("declare function"))
  const block = before.slice(before.lastIndexOf("/**"))
  const paragraphs = paragraphsOf(block)
  const paragraph = (name: string, pattern: RegExp): string =>
    paragraphs.find((candidate) => pattern.test(candidate)) ??
      `<${medium}:${name} paragraph not found>`

  const sentence = paragraph("algebraic", /^\w+: .* Derived order: /)
  const licence = paragraph("licence", /^Licensed by /)
  return {
    affordance: signature,
    rung: capture(medium, "rung", licence, /rung: ([^;]+);/),
    algebraic: capture(medium, "algebraic", sentence, /^\w+: (.+?)\. Derived order: /),
    plain: paragraph("plain", /^what is known here /).replace(/\.$/, ""),
    inherited: paragraph("inherited", /^any grouping, /).replace(/\.$/, ""),
    donors: capture(medium, "donors", licence, /^Licensed by (.+?) \(/),
    evidence: capture(medium, "evidence", licence, /evidence: ([^.;]+)\./),
    term: capture(medium, "term", source, /^ \* Term: +([0-9a-f]{64})$/m),
  }
}

// -- Medium 2: the labelled description of the MCP tool entry -----------------

const fromTool = (source: string): Shared => {
  const medium = "tool(.json)"
  const parsed = JSON.parse(source) as {
    readonly term_digest?: string
    readonly tools?: ReadonlyArray<{ readonly description?: string }>
  }
  const text = parsed.tools?.[0]?.description ?? `<${medium}:description not found>`
  return {
    affordance: capture(medium, "affordance", text, /^(.+?)\. Algebraic: /),
    rung: capture(medium, "rung", text, /; rung (.+?); evidence /),
    algebraic: capture(medium, "algebraic", text, /\. Algebraic: (.+?)\. Plain: /),
    plain: capture(medium, "plain", text, /\. Plain: (.+?)\. Inherited: /),
    inherited: capture(medium, "inherited", text, /\. Inherited: (.+?)\. License: /),
    donors: capture(medium, "donors", text, /\. License: (.+?); rung /),
    evidence: capture(medium, "evidence", text, /; evidence (.+?)\. Bound: /),
    term: parsed.term_digest ?? `<${medium}:term_digest not found>`,
  }
}

// -- Medium 3: the markdown table cells of the two register rows --------------

const cellsOf = (line: string): readonly string[] =>
  line.split("|").slice(1, -1).map((cell) => cell.trim())

const unticked = (cell: string): string => cell.replaceAll("`", "")

const fromRegisters = (source: string): Shared => {
  const medium = "registers(.md)"
  const rows = source
    .split("\n")
    .filter((line) => line.startsWith(`| \`${TERM.affordance}(`))
    .map(cellsOf)
  const [algebraicRow, plainRow] = [rows[0], rows[1]]
  if (algebraicRow === undefined || plainRow === undefined) {
    fail(`${medium}: expected two register rows, found ${rows.length}`)
  }
  const cell = (row: readonly string[] | undefined, index: number): string =>
    row?.[index] ?? `<${medium}:cell ${index} not found>`
  return {
    affordance: unticked(cell(algebraicRow, 0)),
    rung: capture(medium, "rung", cell(algebraicRow, 1), /`([^`]+)`/),
    algebraic: cell(algebraicRow, 4),
    plain: cell(plainRow, 4),
    inherited: capture(medium, "inherited", source, /^> (.+)$/m),
    donors: unticked(cell(algebraicRow, 2)),
    evidence: cell(algebraicRow, 3),
    term: capture(medium, "term", source, /Term: ([0-9a-f]{64}) -->/),
  }
}

// -- Check 1: the preimage ----------------------------------------------------

console.log(`== parity wall: ${SHARED.affordance} ==`)
console.log(`   term      ${TERM_DIGEST}`)
// Repository-relative on purpose: this output is quoted in the README, and a
// path only one machine can resolve is not evidence anyone else can read.
console.log(`   projections in ${relative(repository, directory).replaceAll("\\", "/")}`)
console.log()
console.log("-- 1. preimage: the digest names bytes anyone can rehash --")

const bytes = canonicalBytes(TERM)
const committed = await read("denotation.json")
if (committed !== bytes) {
  fail(`denotation.json is not the term's canonical bytes (${committed.length} vs ${bytes.length})`)
} else {
  console.log(`  PASS  denotation.json is the canonical preimage (${bytes.length} bytes)`)
}
// Through Bun's hasher rather than the emitter's `node:crypto` path, so the
// digest is checkable from the artifact instead of asserted by its writer.
const rehashed = new Bun.CryptoHasher("sha256").update(committed, "utf8").digest("hex")
if (rehashed !== TERM_DIGEST) {
  fail(`rehashing the committed bytes gives ${rehashed}, not ${TERM_DIGEST}`)
} else {
  console.log("  PASS  rehashing the committed bytes reproduces the term digest")
}

// -- Check 2: parity across the three projections -----------------------------

console.log()
console.log("-- 2. parity: shared fields, extracted from each projection's own bytes --")

const extracted: ReadonlyArray<readonly [string, Shared]> = [
  ["surface(.ts)", fromSurface(await read("joinAll.generated.ts"))],
  ["tool(.json)", fromTool(await read("tool.json"))],
  ["registers(.md)", fromRegisters(await read("registers.md"))],
]

for (const field of SHARED_FIELDS) {
  const derived = SHARED[field]
  const disagreeing = extracted.filter(([, shared]) => shared[field] !== derived)
  if (disagreeing.length === 0) {
    const shown = derived.length > 62 ? `${derived.slice(0, 59)}...` : derived
    console.log(`  PASS  ${field.padEnd(11)} IDENTICAL in 3/3  ${shown}`)
    continue
  }
  fail(`${field.padEnd(11)} DIFFERS in ${disagreeing.length}/3`)
  console.log(`          derived : ${derived}`)
  for (const [medium, shared] of disagreeing) {
    console.log(`          ${medium.padEnd(15)}: ${shared[field]}`)
  }
}

// -- Check 3: the outside oracle ----------------------------------------------

console.log()
console.log("-- 3. oracle: the operator's statements against the committed design record --")

const RECORD = "docs/design/2026-08-18-km-algebraic-register.md"
const HEADING = "### join (the monotone write at a lattice carrier)"
const design = await readRepository(RECORD)
const block = design.slice(design.indexOf(HEADING) + HEADING.length)
const pairs: Array<{ readonly register: string; readonly text: string }> = []
for (const line of block.split("\n").slice(1)) {
  const found = /^\s*(plain|algebraic)\s+: (.+)$/.exec(line)
  if (found === null) break
  pairs.push({ register: found[1]!, text: found[2]!.trim() })
}

const ORACLED: ReadonlyArray<readonly [string, Statement]> = [
  ["laws", LAWS_OF],
  ["derived order", DERIVED_ORDER],
  ["requires", REQUIRES],
]

if (pairs.length !== 8) {
  fail(`${RECORD} §6.3: expected 8 register lines under the join heading, read ${pairs.length}`)
} else {
  // Pair 0 is the single-contribution rewrite; this term states the batched one,
  // so it is REPORTED as the declared difference rather than compared.
  console.log(`  NOTE  rewrite differs by design — §6.3 states one contribution, this term a batch`)
  console.log(`          §6.3    plain     : ${pairs[0]!.text}`)
  console.log(`          §6.3    algebraic : ${pairs[1]!.text}`)
  console.log(`          term    plain     : ${plainWords(REWRITE)}`)
  console.log(`          term    algebraic : ${algebraic(REWRITE)}`)
  ORACLED.forEach(([label, statement], index) => {
    const committedPlain = pairs[2 + index * 2]!.text
    const committedAlgebraic = pairs[3 + index * 2]!.text
    const ours = { plain: plainWords(statement), algebraic: algebraic(statement) }
    if (ours.plain !== committedPlain) {
      fail(`${label} (plain) is not §6.3's`)
      console.log(`          §6.3 : ${committedPlain}`)
      console.log(`          term : ${ours.plain}`)
    } else if (ours.algebraic !== committedAlgebraic) {
      fail(`${label} (algebraic) is not §6.3's`)
      console.log(`          §6.3 : ${committedAlgebraic}`)
      console.log(`          term : ${ours.algebraic}`)
    } else {
      console.log(`  PASS  ${label.padEnd(13)} both registers byte-identical to §6.3`)
    }
  })
}

// -- Check 4: the runtime anchor ----------------------------------------------

console.log()
console.log("-- 4. anchor: every runtime fact the term declares, against shipped source --")

const anchors: ReadonlyArray<readonly [string, string, string]> = [
  [TERM.runtime.loop_module, `export const ${TERM.runtime.loop} = `, "the loop the term denotes"],
  [TERM.runtime.loop_module, TERM.donors.join("`, `"), "the donors the loop's header names"],
  [TERM.runtime.entry_module, `${TERM.runtime.loop}({`, "the one call site of that loop"],
  [TERM.runtime.entry_module, `const ${TERM.runtime.carrier}: CasJoin`, "the join bound into it"],
  [TERM.runtime.entry_module, `discipline,`, "the discipline slot the entry passes"],
  [TERM.runtime.entry_module, `"${TERM.runtime.contended}"`, "the refusal an exhausted bound gives"],
  ["packages/plait/src/Cell.ts", `CELL_MERGE_ATTEMPTS = ${TERM.runtime.attempts}`, "the attempt bound"],
  ["verify/fabric/Fabric/Proofs.lean", `theorem ${TERM.donors[1]!}`, "the donor, as a proved theorem"],
  ["verify/fabric/Fabric/Proofs.lean", "theorem f1_cell_join_semilattice", "the rung at this carrier"],
]

for (const [path, needle, why] of anchors) {
  const source = await readRepository(path)
  if (source.includes(needle)) console.log(`  PASS  ${why} — \`${needle}\` in ${path}`)
  else fail(`${why}: \`${needle}\` is NOT in ${path}`)
}

console.log()
if (failures === 0) console.log("WALL GREEN — one term, four artifacts, no second text.")
else console.log(`WALL RED — ${failures} failure${failures === 1 ? "" : "s"}.`)
process.exit(failures === 0 ? 0 : 1)
