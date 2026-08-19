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
 * 2. **No claim of draftness.** A retired draft marker is planted back over the
 *    first shipped meaning. This arm INVERTED when the operator ratified the
 *    corpus: the same plant used to be the lawful form and the removal was the
 *    mutation, and now a sentence that still says the operator has not ruled is
 *    the falsehood the clause exists to catch.
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
  REFUSAL_VOCABULARY_PATHS,
  RETIRED_DRAFT_MARKERS,
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

/**
 * The marker a generator left un-flipped would keep rendering: the form the
 * mechanism ran under until the taste pass ruled on the sentences.
 */
const PLANTED_MARKER = RETIRED_DRAFT_MARKERS[1]

/** The sentence a drifted projection would render instead of the real one. */
const PLANTED_SENTENCE = "A paraphrase the generated modules do not carry."

/** Where the generated roster's literal list closes. */
const ROSTER_CLOSE = "\n] as const\n"

/** Where the first shipped meaning's doc comment opens. */
const MEANING_OPEN = "  /**\n"

/** Where the first rendered meaning's teaching ends on the page. */
const PAGE_TEACHING_CLOSE = "\n**Applicability.**"

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
    retiredMarkers: RETIRED_DRAFT_MARKERS,
  })
  return checked.ok ? abandon(`the ${arm} plant was accepted`) : checked.reason
}

const rosterClose = union.indexOf(ROSTER_CLOSE)
if (rosterClose < 0) abandon("the shipped runtime union has no roster to plant into")
const meaningless =
  `${union.slice(0, rosterClose)}\n  ${JSON.stringify(PLANTED_KIND)},${union.slice(rosterClose)}`

const meaningOpen = union.indexOf(MEANING_OPEN)
if (meaningOpen < 0) abandon("the shipped runtime union renders no meaning to mark")
const marked = union.replace(MEANING_OPEN, `${MEANING_OPEN}   * ${PLANTED_MARKER}\n`)

const teachingClose = page.indexOf(PAGE_TEACHING_CLOSE)
if (teachingClose < 0) abandon("the rendered page renders no taught refusal")
let sentenceAt = page.indexOf("\n", teachingClose + 1) + 1
while (page.startsWith("\n", sentenceAt)) sentenceAt++
const sentenceEnd = page.indexOf("\n", sentenceAt)
if (sentenceAt <= 0 || sentenceEnd < 0) abandon("the rendered page's first meaning has no sentence")
const paraphrased = `${page.slice(0, sentenceAt)}${PLANTED_SENTENCE}${page.slice(sentenceEnd)}`

console.error(judge("meaningless kind", meaningless, tables, page))
console.error(judge("marked meaning", marked, tables, page))
console.error(judge("paraphrased page", union, tables, paraphrased))
process.exit(1)
