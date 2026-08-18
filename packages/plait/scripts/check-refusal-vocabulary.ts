import {
  KERNEL_REFUSAL_VOCABULARY,
  KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS,
  KERNEL_RUNTIME_STRUCTURAL_REFUSALS,
} from "../src/kernel/KernelTables.generated.js"
import { StructuralRefusalKind } from "../src/truth/Refusal.js"
import { RUNTIME_REFUSAL_WAIVER_TICKET } from "./kernel-runtime-refusals.js"
import { checkRefusalVocabulary } from "./refusal-vocabulary.js"

const checked = checkRefusalVocabulary(
  StructuralRefusalKind.literals,
  KERNEL_REFUSAL_VOCABULARY,
)
if (!checked.ok) {
  console.error(`REFUSAL VOCABULARY: FAIL — ${checked.reason}`)
  process.exit(1)
}

if (
  JSON.stringify(StructuralRefusalKind.literals)
  !== JSON.stringify(KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS)
) {
  console.error(
    "REFUSAL VOCABULARY: FAIL — runtime schema is not the generated structural-refusal projection",
  )
  process.exit(1)
}

const wrongWaiver = KERNEL_RUNTIME_STRUCTURAL_REFUSALS.find(
  (row) => row.source === "staged-debt" && row.waiver !== RUNTIME_REFUSAL_WAIVER_TICKET,
)
if (wrongWaiver !== undefined) {
  console.error(
    `REFUSAL VOCABULARY: FAIL — staged-debt row ${JSON.stringify(wrongWaiver.kind)} does not cite ${RUNTIME_REFUSAL_WAIVER_TICKET}`,
  )
  process.exit(1)
}

const stagedDebt = KERNEL_RUNTIME_STRUCTURAL_REFUSALS.filter(
  (row) => row.source === "staged-debt",
).length
console.log(
  `REFUSAL VOCABULARY: PASS (${StructuralRefusalKind.literals.length} runtime kinds contained in ${KERNEL_REFUSAL_VOCABULARY.length} generated reasons; ${stagedDebt} staged-debt waivers cite ${RUNTIME_REFUSAL_WAIVER_TICKET})`,
)
