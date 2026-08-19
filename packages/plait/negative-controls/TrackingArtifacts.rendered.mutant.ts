/**
 * Root law 10's mutation arm.
 *
 * Six plants, one per way the sweep can fail, each made in the *bytes of an
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
 * 5. **A retired draft marker**, planted over the page's first real one. The
 *    plant carries no id, no path, and no command on purpose: the marker clause
 *    has to refuse it ON ITS OWN, or the clause would only ever be firing
 *    because the old marker happened to name a ticket. The literal retired
 *    string is refused twice over — once as a tracking id and once as a wrong
 *    marker — and an arm that cannot tell those apart proves neither.
 * 6. **A stale by-name exclusion**, planted into the list the id clause is read
 *    against rather than into a surface. The exclusion list is the one place a
 *    tracking family could be admitted on purpose, so the liveness clause that
 *    guards it needs its own plant: an excuse nothing on any surface relies on
 *    is refused.
 */
import { resolve } from "node:path"

import {
  DRAFT_MEANING_MARKER,
  LAWFUL_ID_SHAPED_TOKENS,
  OFFICIAL_SURFACES,
  REFUSAL_VOCABULARY_PATHS,
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

/** A draft marker that is not the ratified one, and names nothing else. */
const PLANTED_MARKER = "Draft meaning (pending ratification):"

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
  const checked = checkNoTrackingArtifacts(planted, DRAFT_MEANING_MARKER, lawful)
  return checked.ok ? abandon(`the ${arm} plant was accepted`) : checked.reason
}

if (!page.includes(`${DRAFT_MEANING_MARKER}\n`)) {
  abandon("the rendered page carries no ratified marker to retire")
}
const retired = page.replace(DRAFT_MEANING_MARKER, PLANTED_MARKER)

console.error(judge("board ticket id", surfaces(union, tables, plant(page, PLANTED_ID))))
console.error(judge("sitting-note id", surfaces(union, plant(tables, PLANTED_SIBLING_ID), page)))
console.error(judge("filesystem path", surfaces(union, plant(tables, PLANTED_PATH), page)))
console.error(judge("generation command", surfaces(plant(union, PLANTED_COMMAND), tables, page)))
console.error(judge("retired marker", surfaces(union, tables, retired)))
console.error(
  judge("stale exclusion", surfaces(union, tables, page), [
    ...LAWFUL_ID_SHAPED_TOKENS,
    PLANTED_STALE_EXCLUSION,
  ]),
)
process.exit(1)
