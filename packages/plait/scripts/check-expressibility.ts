/**
 * The expressibility wall.
 *
 * Five arms, in the order a reader should lose confidence in them. The first is
 * the backbone every other hangs from; the rest exist because byte-identical
 * regeneration alone proves only that the committed files match what the
 * declaration renders TODAY — it cannot see a declaration that says something
 * false.
 *
 * 1. **regeneration** — all four artifacts re-rendered from the declaration and
 *    byte-compared against the committed ones.
 * 2. **preimage** — the committed denotation rehashes to the digest every other
 *    artifact names, through the estate's identity door, so the digest names a
 *    preimage anyone can recompute rather than a number the emitter asserted.
 * 3. **parity** — every shared field is pulled back OUT of each projection's own
 *    bytes by a parser written for that medium (wrapped JSDoc, a labelled JSON
 *    description, markdown table cells) and byte-compared across the three. A
 *    renderer that drops a field fails here; one that never rendered it fails
 *    here too.
 * 4. **oracle** — three of the four statement pairs are the join operator's own
 *    and are byte-compared against the block committed in the design record.
 *    Both-sides-agree is not verification (AGENTS.md): arms 1-3 prove only that
 *    projections of one declaration agree with each other, which they would also
 *    do if the declaration were wrong. The record was written before this slice
 *    and by another hand, so it is the oracle outside both sides — and it is
 *    what keeps the law-1 sketch rows (see `expressibility-term.ts`) honest
 *    until DEV-796 lands the corpus groups.
 * 5. **anchor + served schema** — every runtime fact the declaration states is
 *    bound to the `casJoinLoop` call the declared entry actually makes, and the
 *    served callable schema is re-derived HERE, through a second rendering
 *    independent of `expressibility.ts`'s, and byte-compared. One rendering
 *    compared against itself would be green by construction.
 *
 * External JSON is decoded through `effect/Schema`, never cast. The wall is a
 * plain build-time script rather than an Effect service graph, matching its
 * sibling check scripts in this directory.
 *
 * `check-expressibility-negative.ts` is the proof this can go red.
 */
import { resolve } from "node:path"

import { Effect, Schema } from "effect"

import { digestOf } from "../src/truth/Digest.js"
import type { WireValue } from "../src/truth/Canonical.js"
import {
  ARTIFACT_PATH,
  GENERATE_COMMAND,
  GENERATED_DIR,
  GENERATED_FILES,
  type GeneratedFile,
  checkExpressibility,
  renderAll,
} from "./expressibility.js"
import {
  algebraic,
  DERIVED_ORDER,
  DESIGN_RECORD,
  LAWS_OF,
  type ParameterDecl,
  plainWords,
  REQUIRES,
  type Shared,
  SHARED_FIELDS,
  SIGNATURE,
  sharedOf,
  type Statement,
  TERM,
  termBytes,
  termPreimage,
  termDigest,
} from "./expressibility-term.js"

const repository = resolve(import.meta.dir, "../../..")
const quiet = process.argv.includes("--quiet")
// The directory under test. Defaults to the committed artifacts; the negative
// control points it at a mutant so the refusal is executed rather than argued.
const dirFlag = process.argv.indexOf("--dir")
const underTest = dirFlag >= 0 ? process.argv[dirFlag + 1]! : GENERATED_DIR

const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

let failures = 0
const fail = (reason: string): void => {
  failures += 1
  console.error(`EXPRESSIBILITY: FAIL - ${reason}`)
}
const note = (line: string): void => {
  if (!quiet) console.log(line)
}

const digest = await termDigest()
const preimage = await termPreimage()
const shared = sharedOf(digest)

// ── Arm 1: byte-identical regeneration ───────────────────────────────────────

const committed = new Map<GeneratedFile, string>()
for (const name of GENERATED_FILES) {
  committed.set(name, await read(`${underTest}/${name}`).catch(() => ""))
}
const regenerated = checkExpressibility(committed, renderAll(shared, digest, preimage))
if (!regenerated.ok) {
  fail(regenerated.reason)
  console.error(`  regenerate with: ${GENERATE_COMMAND}`)
} else {
  note(`  PASS  ${GENERATED_FILES.length} artifacts byte-identical to a fresh rendering`)
}

// ── Arm 2: the preimage ──────────────────────────────────────────────────────

const committedBytes = committed.get("denotation.json") ?? ""
if (committedBytes !== preimage) {
  fail(`denotation.json is not the declaration's canonical bytes`)
} else {
  // Re-derived from the COMMITTED bytes rather than from the in-memory value,
  // so the digest is checkable from the artifact instead of asserted by its writer.
  const rehashed = await Effect.runPromise(
    digestOf(JSON.parse(committedBytes) as WireValue),
  )
  if (rehashed !== digest) fail(`rehashing the committed preimage gives ${rehashed}, not ${digest}`)
  else note(`  PASS  the committed preimage rehashes to ${digest.slice(0, 16)}… (${(await termBytes()).length} bytes)`)
}

// ── The three media ──────────────────────────────────────────────────────────

const capture = (medium: string, field: string, text: string, pattern: RegExp): string => {
  const found = pattern.exec(text)
  if (found === null || found[1] === undefined) {
    fail(`${medium}: no ${field} — ${String(pattern)} matched nothing`)
    return `<${medium}:${field} not found>`
  }
  return found[1].trim()
}

const paragraphsOf = (block: string): readonly string[] => {
  const lines = block.split("\n").slice(1, -1).map((line) => line.replace(/^\s*\*\s?/, ""))
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

/** The served file, only as far as this wall reads it. Decoded, never cast. */
const ToolFile = Schema.Struct({
  term_digest: Schema.String,
  tools: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      description: Schema.String,
      input_schema: Schema.Unknown,
    }),
  ),
})

const decodeTool = async (text: string): Promise<typeof ToolFile.Type | null> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    fail("tool.schema.json is not JSON")
    return null
  }
  return await Effect.runPromise(
    Schema.decodeUnknownEffect(ToolFile)(parsed).pipe(
      Effect.catch((issue) =>
        Effect.sync(() => {
          fail(`tool.schema.json does not decode at the served shape: ${String(issue)}`)
          return null
        })
      ),
    ),
  )
}

const fromTool = (decoded: typeof ToolFile.Type): Shared => {
  const medium = "tool(.json)"
  const text = decoded.tools[0]?.description ?? `<${medium}:description not found>`
  return {
    affordance: capture(medium, "affordance", text, /^(.+?)\. Algebraic: /),
    rung: capture(medium, "rung", text, /; rung (.+?); evidence /),
    algebraic: capture(medium, "algebraic", text, /\. Algebraic: (.+?)\. Plain: /),
    plain: capture(medium, "plain", text, /\. Plain: (.+?)\. Inherited: /),
    inherited: capture(medium, "inherited", text, /\. Inherited: (.+?)\. License: /),
    donors: capture(medium, "donors", text, /\. License: (.+?); rung /),
    evidence: capture(medium, "evidence", text, /; evidence (.+?)\. Bound: /),
    term: decoded.term_digest,
  }
}

const cellsOf = (line: string): readonly string[] =>
  line.split("|").slice(1, -1).map((cell) => cell.trim())
const unticked = (cell: string): string => cell.replaceAll("`", "")

const fromRegisters = (source: string): Shared => {
  const medium = "registers(.md)"
  const rows = source.split("\n").filter((l) => l.startsWith(`| \`${TERM.affordance}(`)).map(cellsOf)
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

// ── Arm 3: parity ────────────────────────────────────────────────────────────

const decodedTool = await decodeTool(committed.get("tool.schema.json") ?? "")
if (decodedTool !== null) {
  const extracted: ReadonlyArray<readonly [string, Shared]> = [
    ["surface(.ts)", fromSurface(committed.get("joinAll.generated.ts") ?? "")],
    ["tool(.json)", fromTool(decodedTool)],
    ["registers(.md)", fromRegisters(committed.get("registers.md") ?? "")],
  ]
  let agreed = 0
  for (const field of SHARED_FIELDS) {
    const derived = shared[field]
    const disagreeing = extracted.filter(([, s]) => s[field] !== derived)
    if (disagreeing.length === 0) {
      agreed += 1
      continue
    }
    fail(`${field} DIFFERS in ${disagreeing.length}/3 projections`)
    for (const [medium, s] of disagreeing) {
      console.error(`    derived: ${derived}`)
      console.error(`    ${medium}: ${s[field]}`)
    }
  }
  if (agreed === SHARED_FIELDS.length) {
    note(`  PASS  ${agreed} shared fields identical in 3/3 projections`)
  }

  // ── Arm 5b: the served schema, re-derived independently ────────────────────

  const rederived = (): unknown => {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const parameter of SIGNATURE.parameters as readonly ParameterDecl[]) {
      if (parameter.required) required.push(parameter.served_name)
      const description = parameter.served_description
        .replace("{rung}", shared.rung)
        .replace("{inherited}", shared.inherited)
      properties[parameter.served_name] = parameter.served.kind === "digest-string"
        ? { type: "string", pattern: parameter.served.pattern, description }
        : { type: "array", items: { type: "string" }, description }
    }
    return { type: "object", additionalProperties: false, required, properties }
  }
  const servedText = await Effect.runPromise(
    digestOf((decodedTool.tools[0]?.input_schema ?? null) as WireValue),
  )
  const expectedText = await Effect.runPromise(digestOf(rederived() as WireValue))
  if (servedText !== expectedText) {
    fail("the served callable schema is not what the declared signature derives")
    console.error(`    derived digest: ${expectedText}`)
    console.error(`    served  digest: ${servedText}`)
  } else {
    const names = SIGNATURE.parameters.map((p) => p.served_name).join(", ")
    note(`  PASS  served input_schema re-derives identically (${names})`)
  }
}

// ── Arm 4: the outside oracle ────────────────────────────────────────────────

const HEADING = "### join (the monotone write at a lattice carrier)"
const design = await read(DESIGN_RECORD).catch(() => "")
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
  fail(`${DESIGN_RECORD} §6.3: expected 8 register lines under the join heading, read ${pairs.length}`)
} else {
  let oracled = 0
  ORACLED.forEach(([label, statement], index) => {
    const committedPlain = pairs[2 + index * 2]!.text
    const committedAlgebraic = pairs[3 + index * 2]!.text
    if (plainWords(statement) !== committedPlain) fail(`${label} (plain) is not §6.3's`)
    else if (algebraic(statement) !== committedAlgebraic) fail(`${label} (algebraic) is not §6.3's`)
    else oracled += 1
  })
  if (oracled === ORACLED.length) {
    note(`  PASS  ${oracled} statement pairs byte-identical to §6.3 (rewrite differs by design: batch vs one)`)
  }
}

// ── Arm 5a: the runtime anchor ───────────────────────────────────────────────

const { runtime } = TERM
const entrySource = await read(runtime.entry_module).catch(() => "")
const loopSource = await read(runtime.loop_module).catch(() => "")
const attemptsSource = await read(runtime.attempts_module).catch(() => "")
const proofs = await read("verify/fabric/Fabric/Proofs.lean").catch(() => "")

const entryAt = entrySource.indexOf(runtime.entry_binding)
let anchored = 0
if (entryAt < 0) {
  fail(`the declared entry is not defined as \`${runtime.entry_binding}\` in ${runtime.entry_module}`)
} else {
  const afterEntry = entrySource.slice(entryAt)
  const callAt = afterEntry.indexOf(`${runtime.loop}({`)
  if (callAt < 0) {
    fail(`\`${runtime.entry}\` does not call \`${runtime.loop}\` — the denotation is not anchored`)
  } else {
    const fromCall = afterEntry.slice(callAt)
    const end = fromCall.indexOf("\n      }))")
    const call = end < 0 ? fromCall.slice(0, 1200) : fromCall.slice(0, end)
    for (
      const [needle, why] of [
        [`join: ${runtime.carrier}`, "the join bound into the call"],
        ["discipline,", "the discipline slot the call passes"],
        [`attempts: ${runtime.attempts_symbol}`, "the attempt bound the call passes"],
        [`"${runtime.contended}"`, "the refusal an exhausted bound gives"],
      ] as ReadonlyArray<readonly [string, string]>
    ) {
      if (call.includes(needle)) anchored += 1
      else fail(`${why}: \`${needle}\` is NOT an argument of the ${runtime.loop} call`)
    }
  }
}

for (
  const [source, needle, why] of [
    [loopSource, `export const ${runtime.loop} = `, "the loop the term denotes"],
    [loopSource, TERM.donors.join("`, `"), "the donors the loop's header names"],
    [attemptsSource, `${runtime.attempts_symbol} = ${runtime.attempts}`, "the attempt bound's value"],
    [entrySource, runtime.discipline_binding, "the discipline bound to the shipped service"],
    [proofs, `theorem ${TERM.donors[1]!}`, "the donor, as a proved theorem"],
    [proofs, "theorem f1_cell_join_semilattice", "the rung at this carrier"],
  ] as ReadonlyArray<readonly [string, string, string]>
) {
  if (source.includes(needle)) anchored += 1
  else fail(`${why}: \`${needle}\` not found`)
}

if (anchored === 10) note(`  PASS  ${anchored} runtime facts bound to the ${runtime.loop} call and its proofs`)

// ── Verdict ──────────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`EXPRESSIBILITY: FAIL - ${failures} arm${failures === 1 ? "" : "s"} red`)
  process.exit(1)
}
console.log(
  `EXPRESSIBILITY: PASS (byte-identical regeneration from ${ARTIFACT_PATH};` +
    ` ${SHARED_FIELDS.length} shared fields in 3/3; served schema re-derived; ${anchored} runtime facts anchored)`,
)
