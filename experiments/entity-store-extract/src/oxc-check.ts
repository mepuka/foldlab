/*
 * The oxc leg's GATE — the claim, made checkable.
 *
 * The claim is "100% of the pinned rc.111 schema surface, read in process". A claim
 * that is only asserted in a report decays the day the pins move, so it is spelled here
 * as six steps that either pass or exit non-zero with the offending file named:
 *
 *   G1  pin        every one of the six files matches its recorded git blob
 *   G2  coverage   SURFACE_PINS is a superset of the inventory's own pins, digests equal
 *   G3  parse      all six parse with ZERO errors — this is the 100% claim itself
 *   G4  agreement  the five census enumerations agree (21/21/21/22/22, no failures)
 *   G5  instrument the oxc inventory is byte-identical to the committed one, normalizing
 *                  only extractor.instrument / instrumentVersion
 *   G6  surface    the committed oxc-surface.json is byte-identical to a fresh survey
 *
 * G5 is the cross-instrument discipline TOOLS.md already runs for the tree-sitter twin,
 * pointed at a third instrument. Note what it does and does not say: it compares against
 * the COMMITTED inventory, which the compiler-API leg produced. The tsc leg is therefore
 * the offline differential — it is not run here, and it is not on the hot path. Whether
 * it is retained as a gate-time second instrument is an operator ruling (see the lane's
 * REPORT.md); until then this gate reads its committed output as data.
 *
 * G6 is drift, not truth: the survey is this instrument's own census of the surface, and
 * committing it makes a silent change in what oxc can read impossible.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { emit, normalizeInstrument, PIN, resolveSrcDir, SURFACE_FILES, SURFACE_PINS } from "./contract.ts"
import { extractOxc, parseVerified, surveySurface } from "./oxc-extract.ts"

const LANE = join(import.meta.dirname, "..")

export interface GateResult {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export const runGates = (srcDir: string): Array<GateResult> => {
  const results: Array<GateResult> = []

  // G1 + G3 — the pinned read and the parse, in one pass over the surface.
  const parsed = SURFACE_FILES.map((f) => parseVerified(srcDir, f))
  results.push({
    name: "G1 pin",
    ok: true,
    detail: `${SURFACE_FILES.length}/${SURFACE_FILES.length} files match their recorded git blob`
  })

  // G2 — the inventory's own two pins must be the same bytes the surface names.
  const mismatched = Object.entries(PIN.files).filter(
    ([file, sha]) => SURFACE_PINS[file as keyof typeof SURFACE_PINS] !== sha
  )
  results.push({
    name: "G2 coverage",
    ok: mismatched.length === 0,
    detail: mismatched.length === 0
      ? `surface (${SURFACE_FILES.length}) covers the inventory's pins (${Object.keys(PIN.files).length}), digests equal`
      : `digest disagreement on ${mismatched.map(([f]) => f).join(", ")}`
  })

  const dirty = parsed.filter((f) => f.errors.length > 0)
  results.push({
    name: "G3 parse",
    ok: dirty.length === 0,
    detail: dirty.length === 0
      ? `${parsed.length}/${parsed.length} files parsed with ZERO errors: ${parsed.map((f) => f.file).join(", ")}`
      : dirty.map((f) => `${f.file}: ${f.errors.length} error(s), first "${f.errors[0]?.message}"`).join("; ")
  })

  // G4 — the five enumerations.
  const { inventory, report } = extractOxc(srcDir)
  const counts = [
    report.unionAliasCount,
    report.guardTagCount,
    report.classCount,
    report.representationUnionCount,
    report.runtimeArrayCount
  ]
  const countsOk = counts.join("/") === "21/21/21/22/22"
  results.push({
    name: "G4 agreement",
    ok: report.failures.length === 0 && countsOk,
    detail: report.failures.length === 0 && countsOk
      ? `enumerations A-E agree: ${counts.join("/")}`
      : `counts ${counts.join("/")}; failures: ${report.failures.join(" | ") || "none"}`
  })

  // G5 — cross-instrument byte identity against the committed inventory.
  const committed = readFileSync(join(LANE, "inventory.json"), "utf8")
  const ours = emit(inventory)
  const same = normalizeInstrument(ours) === normalizeInstrument(committed)
  results.push({
    name: "G5 instrument",
    ok: same,
    detail: same
      ? "oxc inventory is byte-identical to the committed inventory (instrument fields normalized)"
      : `oxc inventory diverges from the committed inventory (${firstDifference(normalizeInstrument(committed), normalizeInstrument(ours))})`
  })

  // G6 — the committed surface census must be a fresh survey.
  const surveyPath = join(LANE, "oxc-surface.json")
  const fresh = emit(surveySurface(srcDir))
  let committedSurvey: string | undefined
  try {
    committedSurvey = readFileSync(surveyPath, "utf8")
  } catch {
    committedSurvey = undefined
  }
  results.push({
    name: "G6 surface",
    ok: committedSurvey === fresh,
    detail: committedSurvey === undefined
      ? "oxc-surface.json is absent — run `bun run src/oxc-extract.ts`"
      : committedSurvey === fresh
      ? "committed oxc-surface.json matches a fresh survey"
      : `oxc-surface.json is stale (${firstDifference(committedSurvey, fresh)})`
  })

  return results
}

const firstDifference = (a: string, b: string): string => {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      const line = a.slice(0, i).split("\n").length
      return `first difference at byte ${i}, line ${line}`
    }
  }
  return `identical for ${n} bytes, then lengths differ (${a.length} vs ${b.length})`
}

if (import.meta.main) {
  const srcDir = process.argv[2] ?? resolveSrcDir(import.meta.dirname)
  const results = runGates(srcDir)
  for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.name.padEnd(14)} ${r.detail}`)
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`\n${failed.length} gate(s) failed.`)
    process.exit(1)
  }
  console.log(`\nall ${results.length} gates green over ${srcDir}`)
}
