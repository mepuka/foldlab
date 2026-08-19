/**
 * Root law 10's mutation arm.
 *
 * Seven plants, one per way the sweep can fail, each made in the *bytes of an
 * official surface* — the artifacts the production wall reads — and then judged
 * by the production law. Nothing here re-states the law: every arm differs from
 * the green run by exactly the one line it plants.
 *
 * 1. **A board ticket id**, planted into the prose page: the shape a ticket
 *    number takes when a generator projects a waiver outward.
 * 2. **A sitting-note id**, planted into the kernel tables. This arm exists
 *    because the clause used to be spelled `DEV-` and this family walked
 *    straight through it. One family's prefix is not the class, and an id arm
 *    that only ever plants the prefix the clause was written for proves the
 *    clause against itself.
 * 3. **A filesystem path**, planted into the kernel tables: the shape
 *    provenance took before it was a digest.
 * 4. **A generation command**, planted into the truth-plane vocabulary: the
 *    shape a regeneration instruction takes when it is written into the
 *    artifact instead of the README beside it.
 * 5. **The original retired marker**, planted over the page's first meaning.
 *    It carries a ticket number, which is exactly why it is planted: the marker
 *    clause is read BEFORE the artifact classes, so this arm proves the clause
 *    catches the marker as a marker rather than the id clause catching it by
 *    accident. An arm that could not tell those apart would prove neither.
 * 6. **The artifact-free retired marker**, planted the same way. It carries no
 *    id, no path, and no command, so nothing but the marker clause can refuse
 *    it — and it is the form a generator left un-flipped would still render.
 * 7. **A stale by-name exclusion**, planted into the list the id clause is read
 *    against rather than into a surface. The exclusion list is the one place a
 *    tracking family could be admitted on purpose, so the liveness clause that
 *    guards it needs its own plant: an excuse nothing on any surface relies on
 *    is refused.
 */
import { resolve } from "node:path"

import {
  LAWFUL_ID_SHAPED_TOKENS,
  OFFICIAL_SURFACES,
  REFUSAL_VOCABULARY_PATHS,
  RETIRED_DRAFT_MARKERS,
  checkNoTrackingArtifacts,
  type OfficialSurface,
} from "../scripts/refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/** A ticket citation, as a generator projecting a waiver outward would render it. */
const PLANTED_ID = " * Waiver: DEV-804"

/** A sitting-note citation: the family the DEV-literal clause walked past. */
const PLANTED_SIBLING_ID = " * Ruled at KM-11, see the walkthrough sheet"

/** An id-shaped token excused by name that no surface actually speaks. */
const PLANTED_STALE_EXCLUSION = "KM-11"

/** A location, as provenance read before it was an identity. */
const PLANTED_PATH = " * Artifact: packages/plait/fixtures/kernel-conformance.ndjson"

/** A regeneration instruction, written into the artifact rather than beside it. */
const PLANTED_COMMAND = " * Command:  bun run generate:kernel-tables"

/** Where the first rendered meaning's teaching ends on the page. */
const PAGE_TEACHING_CLOSE = "\n**Applicability.**"

const abandon = (reason: string): never => {
  console.error(`TRACKING ARTIFACTS MUTANT: ${reason}`)
  return process.exit(0)
}

const union = await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion)
const tables = await read(REFUSAL_VOCABULARY_PATHS.kernelTables)
const page = await read(REFUSAL_VOCABULARY_PATHS.prosePage)

/** One surface's bytes with a line planted after its first. */
const plant = (bytes: string, line: string): string => {
  const at = bytes.indexOf("\n")
  if (at < 0) return abandon("an official surface read as a single line")
  return `${bytes.slice(0, at)}\n${line}${bytes.slice(at)}`
}

/** The page's bytes with a marker put back over its first standing meaning. */
const remark = (marker: string): string => {
  const teachingClose = page.indexOf(PAGE_TEACHING_CLOSE)
  if (teachingClose < 0) return abandon("the rendered page renders no taught refusal")
  let at = page.indexOf("\n", teachingClose + 1) + 1
  while (page.startsWith("\n", at)) at++
  if (at <= 0) return abandon("the rendered page's first meaning has no sentence")
  return `${page.slice(0, at)}${marker}\n\n${page.slice(at)}`
}

const surfaces = (
  plantedUnion: string,
  plantedTables: string,
  plantedPage: string,
): ReadonlyArray<OfficialSurface> => [
  { surface: OFFICIAL_SURFACES.runtimeUnion, bytes: plantedUnion },
  { surface: OFFICIAL_SURFACES.kernelTables, bytes: plantedTables },
  { surface: OFFICIAL_SURFACES.prosePage, bytes: plantedPage },
]

const judge = (
  arm: string,
  planted: ReadonlyArray<OfficialSurface>,
  lawful: ReadonlyArray<string> = LAWFUL_ID_SHAPED_TOKENS,
): string => {
  const checked = checkNoTrackingArtifacts(planted, RETIRED_DRAFT_MARKERS, lawful)
  return checked.ok ? abandon(`the ${arm} plant was accepted`) : checked.reason
}

console.error(judge("board ticket id", surfaces(union, tables, plant(page, PLANTED_ID))))
console.error(judge("sitting-note id", surfaces(union, plant(tables, PLANTED_SIBLING_ID), page)))
console.error(judge("filesystem path", surfaces(union, plant(tables, PLANTED_PATH), page)))
console.error(judge("generation command", surfaces(plant(union, PLANTED_COMMAND), tables, page)))
for (const marker of RETIRED_DRAFT_MARKERS) {
  console.error(judge(`retired marker ${marker}`, surfaces(union, tables, remark(marker))))
}
console.error(
  judge("stale exclusion", surfaces(union, tables, page), [
    ...LAWFUL_ID_SHAPED_TOKENS,
    PLANTED_STALE_EXCLUSION,
  ]),
)
process.exit(1)
