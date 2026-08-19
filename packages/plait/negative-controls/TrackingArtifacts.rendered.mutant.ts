/**
 * Root law 10's mutation arm.
 *
 * Four plants, one per class the sweep refuses, each made in the *bytes of an
 * official surface* — the artifacts the production wall reads — and then judged
 * by the production law. Nothing here re-states the law: every arm differs from
 * the green run by exactly the one line it plants.
 *
 * 1. **A tracking id**, planted into the prose page: the shape a ticket number
 *    takes when a generator projects a waiver outward.
 * 2. **A filesystem path**, planted into the kernel tables: the shape
 *    provenance took before it was a digest.
 * 3. **A generation command**, planted into the truth-plane vocabulary: the
 *    shape a regeneration instruction takes when it is written into the
 *    artifact instead of the README beside it.
 * 4. **A retired draft marker**, planted over the page's first real one. The
 *    plant carries no id, no path, and no command on purpose: the marker clause
 *    has to refuse it ON ITS OWN, or the clause would only ever be firing
 *    because the old marker happened to name a ticket. The literal retired
 *    string is refused twice over — once as a tracking id and once as a wrong
 *    marker — and an arm that cannot tell those apart proves neither.
 */
import { resolve } from "node:path"

import {
  DRAFT_MEANING_MARKER,
  OFFICIAL_SURFACES,
  REFUSAL_VOCABULARY_PATHS,
  checkNoTrackingArtifacts,
  type OfficialSurface,
} from "../scripts/refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/** A ticket citation, as a generator projecting a waiver outward would render it. */
const PLANTED_ID = " * Waiver: DEV-804"

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

const judge = (arm: string, planted: ReadonlyArray<OfficialSurface>): string => {
  const checked = checkNoTrackingArtifacts(planted, DRAFT_MEANING_MARKER)
  return checked.ok ? abandon(`the ${arm} plant was accepted`) : checked.reason
}

if (!page.includes(`${DRAFT_MEANING_MARKER}\n`)) {
  abandon("the rendered page carries no ratified marker to retire")
}
const retired = page.replace(DRAFT_MEANING_MARKER, PLANTED_MARKER)

console.error(judge("tracking id", surfaces(union, tables, plant(page, PLANTED_ID))))
console.error(judge("filesystem path", surfaces(union, plant(tables, PLANTED_PATH), page)))
console.error(judge("generation command", surfaces(plant(union, PLANTED_COMMAND), tables, page)))
console.error(judge("retired marker", surfaces(union, tables, retired)))
process.exit(1)
