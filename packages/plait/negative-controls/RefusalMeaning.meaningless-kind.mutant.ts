/**
 * The meaning law's mutation arm.
 *
 * Three plants, one per clause the law can lose, each made in the *bytes of an
 * artifact the production wall parses* and then read back by the production
 * readers and judged by the production law. Nothing here re-states the law or
 * hands a helper a built argument: every arm differs from the green run by
 * exactly the one mutation it names.
 *
 * 1. **Presence.** A kind is planted into the runtime union with no meaning
 *    above it, which is what a kind minted without one looks like on disk.
 * 2. **The draft marker.** The first shipped meaning loses its marker line,
 *    which is how an unratified sentence would start reading as ratified prose.
 * 3. **Projection agreement.** The prose page's first rendered meaning is
 *    rewritten, which is how one projection drifts from the other.
 *
 * The fourth clause — one name, one meaning across both registers — has no
 * plant here, and the reason is stated rather than hidden: no name is carried
 * by both registers at this pin, so there is nothing to make disagree without
 * inventing a roster row.
 */
import { resolve } from "node:path"

import {
  DRAFT_MEANING_MARKER,
  REFUSAL_MEANING_TASTE_TICKET,
  REFUSAL_VOCABULARY_PATHS,
  checkRefusalMeanings,
  readCorpusRefusalReasons,
  readKernelReasonMeanings,
  readProseMeanings,
  readRuntimeRefusalMeanings,
} from "../scripts/refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/** The spelling a kind minted with no standing meaning would introduce. */
const PLANTED_KIND = "meaningless-refusal"

/** The heading an unratified meaning would wear if the marker were dropped. */
const PLANTED_MARKER = "Meaning:"

/** The sentence a drifted projection would render instead of the real one. */
const PLANTED_SENTENCE = "A paraphrase the generated modules do not carry."

/** Where the generated roster's literal list closes. */
const ROSTER_CLOSE = "\n] as const\n"

const abandon = (reason: string): never => {
  console.error(`REFUSAL MEANING MUTANT: ${reason}`)
  return process.exit(0)
}

const union = await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion)
const tables = await read(REFUSAL_VOCABULARY_PATHS.kernelTables)
const page = await read(REFUSAL_VOCABULARY_PATHS.prosePage)
const corpusReasons = readCorpusRefusalReasons(
  await read(REFUSAL_VOCABULARY_PATHS.corpusFixture),
  REFUSAL_VOCABULARY_PATHS.corpusFixture,
)

const judge = (
  arm: string,
  plantedUnion: string,
  plantedTables: string,
  plantedPage: string,
): string => {
  const checked = checkRefusalMeanings({
    runtimeMeanings: readRuntimeRefusalMeanings(
      plantedUnion,
      REFUSAL_VOCABULARY_PATHS.runtimeUnion,
    ),
    reasonMeanings: readKernelReasonMeanings(
      plantedTables,
      REFUSAL_VOCABULARY_PATHS.kernelTables,
    ),
    proseMeanings: readProseMeanings(plantedPage, REFUSAL_VOCABULARY_PATHS.prosePage),
    corpusReasons,
    draftMarker: DRAFT_MEANING_MARKER,
    tasteTicket: REFUSAL_MEANING_TASTE_TICKET,
  })
  return checked.ok ? abandon(`the ${arm} plant was accepted`) : checked.reason
}

const rosterClose = union.indexOf(ROSTER_CLOSE)
if (rosterClose < 0) abandon("the shipped runtime union has no roster to plant into")
const meaningless =
  `${union.slice(0, rosterClose)}\n  ${JSON.stringify(PLANTED_KIND)},${union.slice(rosterClose)}`

if (!union.includes(DRAFT_MEANING_MARKER)) abandon("the shipped runtime union carries no marker")
const unmarked = union.replace(DRAFT_MEANING_MARKER, PLANTED_MARKER)

const markerAt = page.indexOf(`${DRAFT_MEANING_MARKER}\n`)
if (markerAt < 0) abandon("the rendered page carries no marked meaning")
const sentenceAt = page.indexOf("\n", page.indexOf("\n", markerAt) + 1) + 1
const sentenceEnd = page.indexOf("\n", sentenceAt)
if (sentenceAt <= 0 || sentenceEnd < 0) abandon("the rendered page's first meaning has no sentence")
const paraphrased = `${page.slice(0, sentenceAt)}${PLANTED_SENTENCE}${page.slice(sentenceEnd)}`

console.error(judge("meaningless kind", meaningless, tables, page))
console.error(judge("unmarked meaning", unmarked, tables, page))
console.error(judge("paraphrased page", union, tables, paraphrased))
process.exit(1)
