/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A structural-kind fold whose arm record is one kind short. That is exactly
 * what every existing caller looks like on the day a kind is emitted into the
 * vocabulary: the record it was written against no longer spans the union, and
 * the fold refuses it. The closure is therefore a contract the compiler holds
 * rather than a discipline a reviewer remembers, and this file is the evidence.
 *
 * Both records are declared rather than built. The claim is about what can be
 * SPELLED, so the control needs the types and not the values, and declaring
 * them keeps the compiler reporting the missing arm instead of the scaffolding
 * that would have produced one.
 *
 * The dropped kind is not named here. It is the vocabulary's own first literal,
 * read off the generated declaration, so this control cannot fall out of step
 * with the union it is about.
 *
 * The lawful twin below compiles, so the failure is the missing arm and not the
 * spelling around it.
 */
import {
  matchKind,
  StructuralRefusalKind,
  type StructuralRefusal,
} from "../src/truth/Refusal.js"

/** Every arm the vocabulary demands, derived from the vocabulary. */
declare const everyKind: {
  readonly [K in StructuralRefusalKind]: (refusal: StructuralRefusal) => string
}

/** The witness: a fold whose arms span the union. */
export const lawful = matchKind(everyKind)

/** One kind short: the union's first literal dropped from the record. */
declare const missingOne: Omit<
  typeof everyKind,
  (typeof StructuralRefusalKind.literals)[0]
>

/** The planted spelling: a fold whose arms no longer span the union. */
export const planted = matchKind(missingOne)
