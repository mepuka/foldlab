/**
 * Prep probe: run the estate's OWN law-10 tracking-artifact sweep over the
 * rendered surfaces the committed wall does not cover.
 *
 * The wall (check:refusal-vocabulary) sweeps exactly three surfaces — the
 * runtime refusal union, the kernel tables, and the prose page. Every other
 * projection of the kernel language is outside it. This probe applies the same
 * three refusal classes to the rest.
 *
 * The patterns below are transcribed from TRACKING_ARTIFACT_CLASSES in
 * packages/plait/scripts/refusal-vocabulary.ts. The transcription is not
 * trusted: the probe re-reads that file and refuses unless each pattern's
 * source text is present in it verbatim, so a drift in the wall reddens this
 * probe rather than silently making it measure a different law.
 *
 * Run: bun scratch/dev-codegen-prep/probe-law10.ts
 */
import { resolve } from "node:path"

const repository = resolve(import.meta.dir, "../..")

const CLASSES = [
  {
    clause: "tracking id",
    pattern: /\bDEV-[0-9]+\b/,
  },
  {
    clause: "filesystem path",
    pattern:
      /(?:^|[^A-Za-z0-9_~@/-])(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:ts|tsx|js|mjs|cjs|jsx|json|ndjson|md|sh|ps1|txt|lean|go|yaml|yml|toml|lock)(?![A-Za-z0-9_])|(?:packages|scripts|src|test|tests|fixtures|docs|verify|proto|node_modules|negative-controls)\/|[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)/,
  },
  {
    clause: "generation command",
    pattern: /(?:\b(?:bun|npm|pnpm|yarn|deno)\s)|(?:\b(?:check|generate|build):[a-z][a-z0-9-]*)/,
  },
] as const

// ── The transcription wall ────────────────────────────────────────────────
const wallSource = await Bun.file(
  resolve(repository, "packages/plait/scripts/refusal-vocabulary.ts"),
).text()
for (const entry of CLASSES) {
  if (!wallSource.includes(entry.pattern.source)) {
    console.error(
      `PROBE REFUSED: the "${entry.clause}" pattern is no longer verbatim in the wall.`,
    )
    process.exit(2)
  }
}
console.log("transcription: PASS (all three refusal classes verbatim from the wall)\n")

// ── The surfaces ──────────────────────────────────────────────────────────
const WALLED = new Set([
  "packages/plait/src/kernel/KernelTables.generated.ts",
  "packages/plait/src/truth/RefusalKinds.generated.ts",
  "docs/generated/kernel-language.generated.md",
])

const targets = [
  "verify/kernel/projections/kernel.ts",
  "verify/kernel/projections/prose.md",
  "verify/kernel/projections/tools.schema.json",
  "packages/plait/src/kernel/KernelBuilder.generated.ts",
  "packages/plait/src/kernel/KernelSchemas.generated.ts",
  "packages/plait/src/kernel/KernelTables.generated.ts",
  "packages/plait/src/truth/RefusalKinds.generated.ts",
  "docs/generated/kernel-language.generated.md",
]

type Hit = { line: number; clause: string; matched: string }

const rows: Array<{ target: string; walled: boolean; lines: number; hits: number }> = []

for (const target of targets) {
  const bytes = await Bun.file(resolve(repository, target)).text()
  const lines = bytes.split("\n")
  const hits: Array<Hit> = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.replace(/\r$/, "")
    for (const entry of CLASSES) {
      const found = entry.pattern.exec(line)
      if (found === null) continue
      hits.push({ line: index + 1, clause: entry.clause, matched: found[0].trim() })
    }
  }
  const walled = WALLED.has(target)
  rows.push({ target, walled, lines: lines.length, hits: hits.length })
  console.log(`== ${target}${walled ? "   [WALLED]" : "   [not walled]"}`)
  console.log(`   lines ${lines.length}   hits ${hits.length}`)
  const byClause = new Map<string, number>()
  for (const hit of hits) byClause.set(hit.clause, (byClause.get(hit.clause) ?? 0) + 1)
  for (const [clause, count] of [...byClause].sort()) console.log(`   ${clause}: ${count}`)
  for (const hit of hits.slice(0, 14)) {
    console.log(`   line ${hit.line} [${hit.clause}] ${JSON.stringify(hit.matched)}`)
  }
  if (hits.length > 14) console.log(`   ... ${hits.length - 14} more`)
  console.log("")
}

console.log("── summary ──")
for (const row of rows) {
  console.log(
    `${row.hits.toString().padStart(4)}  ${row.walled ? "walled    " : "NOT WALLED"}  ${row.target}`,
  )
}
