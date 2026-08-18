import { resolve } from "node:path"

import { KERNEL_RUNTIME_STRUCTURAL_REFUSALS } from "../src/kernel/KernelTables.generated.js"
import {
  REFUSAL_VOCABULARY_PATHS,
  RUNTIME_REFUSAL_WAIVER_TICKET,
  checkProjectionAncestry,
  checkRefusalVocabulary,
  checkRuntimeUnionWiring,
  readCorpusRefusalReasons,
  readRuntimeRefusalKinds,
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

console.log(
  `REFUSAL VOCABULARY: PASS (${evidence.runtimeKinds.length} runtime kinds:`
    + ` ${checked.corpusBacked} corpus-backed,`
    + ` ${checked.stagedDebt} pinned ${RUNTIME_REFUSAL_WAIVER_TICKET} staged debt,`
    + ` against ${evidence.corpusReasons.length} corpus refusal reasons)`,
)
