import { KERNEL_REFUSAL_VOCABULARY } from "../src/kernel/KernelTables.generated.js"
import { StructuralRefusalKind } from "../src/truth/Refusal.js"
import { checkRefusalVocabulary } from "../scripts/refusal-vocabulary.js"

/** A planted hand-minted spelling outside the generated refusal vocabulary. */
const mutantRuntimeKinds = [...StructuralRefusalKind.literals, "hand-minted-refusal"]
const checked = checkRefusalVocabulary(mutantRuntimeKinds, KERNEL_REFUSAL_VOCABULARY)

if (checked.ok) {
  console.error("REFUSAL VOCABULARY MUTANT: planted hand-minted kind was accepted")
  process.exit(0)
}

console.error(checked.reason)
process.exit(1)
