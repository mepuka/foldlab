/**
 * The containment wall's mutation arm.
 *
 * A hand-minted spelling is planted into the *source of the runtime union* —
 * the artifact the production wall parses — and the production readers and the
 * production law are then run over the planted bytes. Nothing here re-states
 * the law or supplies a hand-built argument to a helper: the only difference
 * between this run and the green one is the one kind that was planted.
 */
import { resolve } from "node:path"

import {
  REFUSAL_VOCABULARY_PATHS,
  RUNTIME_REFUSAL_WAIVER_TICKET,
  RUNTIME_UNION_BINDING,
  checkRefusalVocabulary,
  readCorpusRefusalReasons,
  readRuntimeRefusalKinds,
  readStagedDebtPin,
} from "../scripts/refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/** The spelling a hand-minted refusal would introduce outside every ancestry. */
const PLANTED = "hand-minted-refusal"

const shipped = readRuntimeRefusalKinds(
  await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion),
  REFUSAL_VOCABULARY_PATHS.runtimeUnion,
)
if (shipped.length === 0) {
  console.error("REFUSAL VOCABULARY MUTANT: the shipped runtime union read empty")
  process.exit(0)
}

// The plant is a re-emission of the shipped roster with one extra kind, so the
// production reader has to parse it back out for the law to see it at all.
const planted = `export const ${RUNTIME_UNION_BINDING} = [\n`
  + [...shipped, PLANTED].map((kind) => `  ${JSON.stringify(kind)},`).join("\n")
  + "\n] as const\n"

const checked = checkRefusalVocabulary({
  runtimeKinds: readRuntimeRefusalKinds(planted, REFUSAL_VOCABULARY_PATHS.runtimeUnion),
  corpusReasons: readCorpusRefusalReasons(
    await read(REFUSAL_VOCABULARY_PATHS.corpusFixture),
    REFUSAL_VOCABULARY_PATHS.corpusFixture,
  ),
  waivers: readStagedDebtPin(
    await read(REFUSAL_VOCABULARY_PATHS.stagedDebtPin),
    REFUSAL_VOCABULARY_PATHS.stagedDebtPin,
  ),
  waiverTicket: RUNTIME_REFUSAL_WAIVER_TICKET,
})

if (checked.ok) {
  console.error("REFUSAL VOCABULARY MUTANT: planted hand-minted kind was accepted")
  process.exit(0)
}

console.error(checked.reason)
process.exit(1)
