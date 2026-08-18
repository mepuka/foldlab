/**
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * Artifact 4 of the slice: the PARITY WALL. Six checks, in the order a reader
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
 * 4. **anchor** — every runtime fact the term declares is bound to the
 *    `casJoinLoop` call the declared ENTRY actually makes. Round 2: the round-1
 *    anchor asked only whether each string occurred somewhere in the named
 *    module, so a module that had stopped calling the loop still passed — it
 *    could certify a false denotation.
 * 5. **served schema** — the MCP callable's `required`, `pattern`, and
 *    `items.type` are re-derived from the declared signature by a rendering
 *    written HERE, independent of `project.ts`'s, and byte-compared against the
 *    served bytes. Round 2, and the review's worst finding: the served schema
 *    used to be hand-built in `project.ts` and absent from this wall, so it
 *    could drift from the term with every arm green (standing estate law 3).
 * 6. **served equals derived** — the emitters are EXECUTED into a scratch
 *    directory and all four artifacts are byte-compared against the committed
 *    ones. Nothing here trusts that `generated/` was regenerated after the last
 *    edit; this check re-runs the derivation and looks.
 *
 * Reads cross a service boundary (`Artifacts`) and every external byte is
 * decoded through `effect/Schema` into a tagged refusal carrying reason · law ·
 * repair — standing estate laws 5 and 6. Round 1 used `JSON.parse(source) as
 * ...`, an unchecked cast on the meaning path.
 *
 * A wall that cannot go red proves nothing: `run.sh` mutates one shared field in
 * one projection, one `required` list, and one `items.type`, and requires this
 * to fail on exactly the mutated thing.
 *
 * Run: `bun scratch/km-expressibility/wall.ts [generated-dir]`
 */

import { rmSync } from "node:fs"
import { relative, resolve } from "node:path"

import { Context, Data, Effect, Layer, Schema } from "./effect.ts"
import {
  algebraic,
  canonicalBytes,
  DERIVED_ORDER,
  LAWS_OF,
  type ParameterDecl,
  plainWords,
  REQUIRES,
  REWRITE,
  SHARED,
  SHARED_FIELDS,
  type Shared,
  SIGNATURE,
  type Statement,
  TERM,
  TERM_DIGEST,
} from "./term.ts"

const repository = resolve(import.meta.dir, "../..")
const directory = resolve(import.meta.dir, Bun.argv[2] ?? "generated")

// ── Refusals: reason · law · repair (standing estate law 6) ──────────────────

/**
 * The typed absence this wall answers with. Never a throw across the seam, and
 * never a bare `Error`: a refusal that cannot say which law it serves or what
 * would repair it teaches the reader nothing.
 */
class ArtifactRefusal extends Data.TaggedError("ArtifactRefusal")<{
  readonly reason: string
  readonly law: string
  readonly repair: string
}> {}

// ── The service boundary ─────────────────────────────────────────────────────

interface ArtifactsShape {
  /** One emitted projection, by file name, from the directory under test. */
  readonly projection: (name: string) => Effect.Effect<string, ArtifactRefusal>
  /** One shipped repository file, by repository-relative path. */
  readonly source: (path: string) => Effect.Effect<string, ArtifactRefusal>
}

const readText = (
  absolute: string,
  shown: string,
  law: string,
  repair: string,
): Effect.Effect<string, ArtifactRefusal> =>
  Effect.tryPromise({
    try: () => Bun.file(absolute).text(),
    catch: () =>
      new ArtifactRefusal({
        reason: `${shown} could not be read`,
        law,
        repair,
      }),
  })

class Artifacts extends Context.Service<Artifacts, ArtifactsShape>()(
  "scratch/km-expressibility/Artifacts",
) {
  static readonly layer = (under: string): Layer.Layer<Artifacts> =>
    Layer.succeed(
      Artifacts,
      Artifacts.of({
        projection: (name) =>
          readText(
            resolve(under, name),
            `projection ${name}`,
            "Every projection the wall compares is emitted, never hand-placed.",
            "Run `bun scratch/km-expressibility/emit.ts` and `project.ts`.",
          ),
        source: (path) =>
          readText(
            resolve(repository, path),
            `shipped source ${path}`,
            "A denotation names shipped code, and the code it names must exist.",
            `Re-anchor the term to where the fact lives now, or restore ${path}.`,
          ),
      }),
    )
}

// ── Decoding external bytes ──────────────────────────────────────────────────

/** The served tool file, only as far as this wall reads it. */
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

const decodeJson = (
  text: string,
  shown: string,
): Effect.Effect<typeof ToolFile.Type, ArtifactRefusal> =>
  Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: () =>
      new ArtifactRefusal({
        reason: `${shown} is not JSON`,
        law: "External bytes are decoded, never cast.",
        repair: "Re-emit the projection rather than editing it.",
      }),
  }).pipe(
    Effect.flatMap((value) =>
      Schema.decodeUnknownEffect(ToolFile)(value).pipe(
        Effect.mapError(
          (issue) =>
            new ArtifactRefusal({
              reason: `${shown} does not decode at the served shape: ${String(issue)}`,
              law: "All validation goes through effect/Schema (constrained decode).",
              repair: "Re-emit with `bun scratch/km-expressibility/project.ts`.",
            }),
        ),
      )
    ),
  )

// ── Reporting ────────────────────────────────────────────────────────────────

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

// ── Medium 1: the wrapped JSDoc of the generated TypeScript surface ──────────

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

// ── Medium 2: the labelled description of the MCP tool entry ─────────────────

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

// ── Medium 3: the markdown table cells of the two register rows ──────────────

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

// ── Check 5's independent rendering of the served schema ─────────────────────

/**
 * The wall's OWN rendering of the declared signature into JSON Schema.
 *
 * Deliberately not `project.ts`'s function and deliberately not a shared helper
 * either side imports: a helper would make check 5 compare a value with itself
 * and pass by construction. Two renderings of one declaration, byte-compared, is
 * the served-equals-derived shape; one rendering compared to itself is theatre.
 */
const rederiveServed = (): unknown => {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const parameter of SIGNATURE.parameters as readonly ParameterDecl[]) {
    if (parameter.required) required.push(parameter.served_name)
    const description = parameter.served_description
      .replace("{rung}", SHARED.rung)
      .replace("{inherited}", SHARED.inherited)
    if (parameter.served.kind === "digest-string") {
      properties[parameter.served_name] = {
        type: "string",
        pattern: parameter.served.pattern,
        description,
      }
    } else {
      properties[parameter.served_name] = {
        type: "array",
        items: { type: "string" },
        description,
      }
    }
  }
  return { type: "object", additionalProperties: false, required, properties }
}

// ── The wall ─────────────────────────────────────────────────────────────────

const wall = Effect.gen(function* () {
  const artifacts = yield* Artifacts

  console.log(`== parity wall: ${SHARED.affordance} ==`)
  console.log(`   term      ${TERM_DIGEST}`)
  // Repository-relative on purpose: this output is quoted in the README, and a
  // path only one machine can resolve is not evidence anyone else can read.
  console.log(`   projections in ${relative(repository, directory).replaceAll("\\", "/")}`)

  // -- Check 1: the preimage --------------------------------------------------

  console.log()
  console.log("-- 1. preimage: the digest names bytes anyone can rehash --")

  const bytes = canonicalBytes(TERM)
  const committed = yield* artifacts.projection("denotation.json")
  if (committed !== bytes) {
    fail(
      `denotation.json is not the term's canonical bytes (${committed.length} vs ${bytes.length})`,
    )
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

  // -- Check 2: parity across the three projections ----------------------------

  console.log()
  console.log("-- 2. parity: shared fields, extracted from each projection's own bytes --")

  const toolText = yield* artifacts.projection("tool.json")
  const decodedTool = yield* decodeJson(toolText, "tool.json")

  const extracted: ReadonlyArray<readonly [string, Shared]> = [
    ["surface(.ts)", fromSurface(yield* artifacts.projection("joinAll.generated.ts"))],
    ["tool(.json)", fromTool(decodedTool)],
    ["registers(.md)", fromRegisters(yield* artifacts.projection("registers.md"))],
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

  // -- Check 3: the outside oracle --------------------------------------------

  console.log()
  console.log("-- 3. oracle: the operator's statements against the committed design record --")

  const RECORD = "docs/design/2026-08-18-km-algebraic-register.md"
  const HEADING = "### join (the monotone write at a lattice carrier)"
  const design = yield* artifacts.source(RECORD)
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

  // -- Check 4: the runtime anchor --------------------------------------------

  console.log()
  console.log("-- 4. anchor: the declared facts, bound to the call the entry makes --")

  const { runtime } = TERM
  const entrySource = yield* artifacts.source(runtime.entry_module)
  const loopSource = yield* artifacts.source(runtime.loop_module)
  const attemptsSource = yield* artifacts.source(runtime.attempts_module)

  // The entry, then the ONE call it makes, then the bindings inside THAT call.
  // Round 1 checked these strings against the whole file, which a module that no
  // longer called the loop would still have satisfied.
  const entryAt = entrySource.indexOf(runtime.entry_binding)
  if (entryAt < 0) {
    fail(
      `the declared entry is not defined as \`${runtime.entry_binding}\` in ${runtime.entry_module}`,
    )
  } else {
    console.log(`  PASS  the declared entry — \`${runtime.entry_binding}\` in ${runtime.entry_module}`)

    const afterEntry = entrySource.slice(entryAt)
    const callAt = afterEntry.indexOf(`${runtime.loop}({`)
    if (callAt < 0) {
      fail(`\`${runtime.entry}\` does not call \`${runtime.loop}\` — the denotation is not anchored`)
    } else {
      // The call's own argument object: from `casJoinLoop({` to its closing `}))`.
      const fromCall = afterEntry.slice(callAt)
      const end = fromCall.indexOf("\n      }))")
      const call = end < 0 ? fromCall.slice(0, 1200) : fromCall.slice(0, end)
      console.log(`  PASS  \`${runtime.entry}\` calls \`${runtime.loop}\` (${call.split("\n").length} argument lines)`)

      const bindings: ReadonlyArray<readonly [string, string]> = [
        [`join: ${runtime.carrier}`, "the join bound into the call"],
        ["discipline,", "the discipline slot the call passes"],
        [`attempts: ${runtime.attempts_symbol}`, "the attempt bound the call passes"],
        [`"${runtime.contended}"`, "the refusal an exhausted bound gives"],
      ]
      for (const [needle, why] of bindings) {
        if (call.includes(needle)) console.log(`  PASS  ${why} — \`${needle}\``)
        else fail(`${why}: \`${needle}\` is NOT an argument of the ${runtime.loop} call`)
      }
    }
  }

  const elsewhere: ReadonlyArray<readonly [string, string, string]> = [
    [
      loopSource,
      `export const ${runtime.loop} = `,
      `the loop the term denotes, in ${runtime.loop_module}`,
    ],
    [
      loopSource,
      TERM.donors.join("`, `"),
      `the donors the loop's header names, in ${runtime.loop_module}`,
    ],
    [
      attemptsSource,
      `${runtime.attempts_symbol} = ${runtime.attempts}`,
      `the attempt bound's value, in ${runtime.attempts_module}`,
    ],
    [
      entrySource,
      runtime.discipline_binding,
      "the discipline bound to the shipped service",
    ],
  ]
  for (const [source, needle, why] of elsewhere) {
    if (source.includes(needle)) console.log(`  PASS  ${why} — \`${needle}\``)
    else fail(`${why}: \`${needle}\` not found`)
  }

  const proofs = yield* artifacts.source("verify/fabric/Fabric/Proofs.lean")
  for (const [needle, why] of [
    [`theorem ${TERM.donors[1]!}`, "the donor, as a proved theorem"],
    ["theorem f1_cell_join_semilattice", "the rung at this carrier"],
  ] as ReadonlyArray<readonly [string, string]>) {
    if (proofs.includes(needle)) console.log(`  PASS  ${why} — \`${needle}\``)
    else fail(`${why}: \`${needle}\` is not in verify/fabric/Fabric/Proofs.lean`)
  }

  // -- Check 5: the served schema, re-derived independently -------------------

  console.log()
  console.log("-- 5. served schema: re-derived from the declaration, byte-compared --")

  const servedBytes = canonicalBytes(decodedTool.tools[0]?.input_schema ?? null)
  const expectedBytes = canonicalBytes(rederiveServed())
  if (servedBytes !== expectedBytes) {
    fail("the served callable schema is not what the declared signature derives")
    console.log(`          derived : ${expectedBytes}`)
    console.log(`          served  : ${servedBytes}`)
  } else {
    const names = SIGNATURE.parameters.map((p) => p.served_name).join(", ")
    console.log(`  PASS  input_schema IDENTICAL to the term's derivation (${names})`)
    console.log(`          required   ${JSON.stringify(SIGNATURE.parameters.filter((p) => p.required).map((p) => p.served_name))}`)
    console.log(`          shapes     ${SIGNATURE.parameters.map((p) => `${p.served_name}:${p.served.kind}`).join(", ")}`)
  }

  // -- Check 6: served equals derived, by executing the emitters --------------

  console.log()
  console.log("-- 6. served equals derived: the emitters re-run, all four artifacts compared --")

  const fresh = resolve(import.meta.dir, ".rederived")
  for (const script of ["emit.ts", "project.ts"]) {
    const spawned = Bun.spawnSync(["bun", resolve(import.meta.dir, script), ".rederived"], {
      cwd: repository,
    })
    if (spawned.exitCode !== 0) {
      fail(`${script} did not run: ${spawned.stderr.toString().split("\n")[0] ?? ""}`)
    }
  }
  const ARTIFACTS = [
    "denotation.json",
    "joinAll.generated.ts",
    "tool.json",
    "registers.md",
  ] as const
  let identical = 0
  for (const name of ARTIFACTS) {
    const committedText = yield* artifacts.projection(name)
    const freshText = yield* readText(
      resolve(fresh, name),
      `re-derived ${name}`,
      "The emitters must run from a clean tree.",
      "Run `bash scratch/km-expressibility/run.sh`.",
    )
    if (committedText === freshText) identical += 1
    else fail(`${name} is NOT what the emitter derives — the served copy has drifted`)
  }
  if (identical === ARTIFACTS.length) {
    console.log(`  PASS  all ${ARTIFACTS.length} artifacts byte-identical to a fresh derivation`)
  }
  // The wall owns this directory's lifecycle; a standalone run leaves no litter.
  rmSync(fresh, { recursive: true, force: true })

  console.log()
  if (failures === 0) console.log("WALL GREEN — one term, four artifacts, no second text.")
  else console.log(`WALL RED — ${failures} failure${failures === 1 ? "" : "s"}.`)
  return failures
})

const exitCode = await Effect.runPromise(
  wall.pipe(
    Effect.provide(Artifacts.layer(directory)),
    Effect.catchTag("ArtifactRefusal", (refusal) =>
      Effect.sync(() => {
        console.log()
        console.log(`  REFUSED  ${refusal.reason}`)
        console.log(`     law     ${refusal.law}`)
        console.log(`     repair  ${refusal.repair}`)
        console.log()
        console.log("WALL RED — a refusal, not a crash.")
        return failures + 1
      })),
  ),
)

process.exit(exitCode === 0 ? 0 : 1)
