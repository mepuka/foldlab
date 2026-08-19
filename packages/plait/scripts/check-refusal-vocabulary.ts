import { resolve } from "node:path"

import { KERNEL_RUNTIME_STRUCTURAL_REFUSALS } from "../src/kernel/KernelTables.generated.js"
import {
  DRAFT_MEANING_MARKER,
  LAWFUL_ID_SHAPED_TOKENS,
  OFFICIAL_SURFACES,
  REFUSAL_VOCABULARY_PATHS,
  RUNTIME_REFUSAL_WAIVER_TICKET,
  checkNoTrackingArtifacts,
  checkProjectionAncestry,
  checkRefusalMeanings,
  checkRefusalVocabulary,
  checkRuntimeUnionWiring,
  readCorpusRefusalReasons,
  readKernelReasonMeanings,
  readProseMeanings,
  readRuntimeRefusalKinds,
  readRuntimeRefusalMeanings,
  readStagedDebtPin,
  type RefusalVocabularyEvidence,
} from "./refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `fail(...)` as control flow that does not return and narrows after it.
const fail: (reason: string) => never = (reason) => {
  console.error(`REFUSAL VOCABULARY: FAIL — ${reason}`)
  return process.exit(1)
}

const wiring = checkRuntimeUnionWiring(
  await read(REFUSAL_VOCABULARY_PATHS.refusalModule),
  REFUSAL_VOCABULARY_PATHS.refusalModule,
  "./RefusalKinds.generated.js",
)
if (!wiring.ok) fail(wiring.reason)

const evidence: RefusalVocabularyEvidence = {
  runtimeKinds: readRuntimeRefusalKinds(
    await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion),
    REFUSAL_VOCABULARY_PATHS.runtimeUnion,
  ),
  corpusReasons: readCorpusRefusalReasons(
    await read(REFUSAL_VOCABULARY_PATHS.corpusFixture),
    REFUSAL_VOCABULARY_PATHS.corpusFixture,
  ),
  waivers: readStagedDebtPin(
    await read(REFUSAL_VOCABULARY_PATHS.stagedDebtPin),
    REFUSAL_VOCABULARY_PATHS.stagedDebtPin,
  ),
  waiverTicket: RUNTIME_REFUSAL_WAIVER_TICKET,
}

const checked = checkRefusalVocabulary(evidence)
if (!checked.ok) fail(checked.reason)

const ancestry = checkProjectionAncestry(KERNEL_RUNTIME_STRUCTURAL_REFUSALS, evidence)
if (!ancestry.ok) fail(ancestry.reason)

const meanings = checkRefusalMeanings({
  runtimeMeanings: readRuntimeRefusalMeanings(
    await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion),
    REFUSAL_VOCABULARY_PATHS.runtimeUnion,
  ),
  reasonMeanings: readKernelReasonMeanings(
    await read(REFUSAL_VOCABULARY_PATHS.kernelTables),
    REFUSAL_VOCABULARY_PATHS.kernelTables,
  ),
  proseMeanings: readProseMeanings(
    await read(REFUSAL_VOCABULARY_PATHS.prosePage),
    REFUSAL_VOCABULARY_PATHS.prosePage,
  ),
  corpusReasons: evidence.corpusReasons,
  draftMarker: DRAFT_MEANING_MARKER,
})
if (!meanings.ok) fail(meanings.reason)

const rendered = checkNoTrackingArtifacts(
  [
    {
      surface: OFFICIAL_SURFACES.runtimeUnion,
      bytes: await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion),
    },
    {
      surface: OFFICIAL_SURFACES.kernelTables,
      bytes: await read(REFUSAL_VOCABULARY_PATHS.kernelTables),
    },
    {
      surface: OFFICIAL_SURFACES.prosePage,
      bytes: await read(REFUSAL_VOCABULARY_PATHS.prosePage),
    },
  ],
  DRAFT_MEANING_MARKER,
  LAWFUL_ID_SHAPED_TOKENS,
)
if (!rendered.ok) fail(rendered.reason)

console.log(
  `REFUSAL VOCABULARY: PASS (${evidence.runtimeKinds.length} runtime kinds:`
    + ` ${checked.corpusBacked} corpus-backed,`
    + ` ${checked.stagedDebt} pinned ${RUNTIME_REFUSAL_WAIVER_TICKET} staged debt,`
    + ` against ${evidence.corpusReasons.length} corpus refusal reasons;`
    + ` ${meanings.kinds} kind and ${meanings.reasons} reason meanings, all still marked`
    + " drafts awaiting ratification;"
    + ` ${rendered.lines} lines across ${rendered.surfaces} official surfaces carry no`
    + ` tracking artifact, with ${rendered.exclusions} id-shaped token excused by name`
    + ` (${LAWFUL_ID_SHAPED_TOKENS.join(", ")}), each live)`,
)
