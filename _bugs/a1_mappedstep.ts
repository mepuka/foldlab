// A1 on the STEP lane: mappedStep is even weaker than mapped. `mapped`
// (algebra.ts:314) gates on source.declaration.digest === hom.source.declaration.digest.
// `mappedStep` (algebra.ts:449) checks ONLY that source.declaration !== undefined
// — it never verifies the source is the homomorphism's declared source. So a
// declared step totally unrelated to hom.source is certified as a mapped view.
import { steps, mapped, mappedStep, homomorphisms, algebras } from "../packages/core/src/algebra.ts"

const hom = homomorphisms.isPositiveFromMax // declared source = max, target = any

// Contrast: mapped() REFUSES an algebra whose declaration is not hom.source (max).
const mappedMismatch = mapped(hom as any, algebras.count) // count != max
console.log("mapped(isPositiveFromMax, count):")
console.log("  certified? ", mappedMismatch.declaration !== undefined, " identityIssue:", mappedMismatch.identityIssue)

// mappedStep() ACCEPTS a source step unrelated to hom.source (payloadLength, a
// length generator — nothing to do with a max fold) with no digest check.
const s = mappedStep(hom as any, steps.payloadLength)
console.log("mappedStep(isPositiveFromMax, payloadLength):")
console.log("  certified? ", s.declaration !== undefined, " identityIssue:", s.identityIssue)
console.log("  applied to a payload of length 5:", s.apply({ stream: "x", seq: 1, payload: new Uint8Array(5) }))

const forged = mappedStep(hom as any, steps.sequenceNumber) // also unrelated
console.log("mappedStep(isPositiveFromMax, sequenceNumber): certified?",
  forged.declaration !== undefined, " identityIssue:", forged.identityIssue)

console.log(
  s.declaration !== undefined && mappedMismatch.declaration === undefined
    ? "CONFIRMED: mappedStep omits the source==hom.source check that mapped enforces; it certifies mapped views over unrelated sources"
    : "not reproduced",
)
