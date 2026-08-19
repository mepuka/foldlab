/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * An envelope-kind fold whose arm record is one kind short. A fifth monotone
 * observation kind admitted by the wire grammar has to reach every consumer,
 * and the way it reaches them is that their arm records stop spanning the
 * union. This file is that failure, executed.
 *
 * Both records are declared rather than built: the claim is about what can be
 * SPELLED, so the control needs the types and not the values.
 *
 * The dropped kind is not named here. It is the kind schema's own first
 * literal, so the control follows the grammar rather than restating it.
 *
 * The lawful twin below compiles, so the failure is the missing arm and not the
 * spelling around it.
 */
import { EnvelopeKind, matchKind, type Envelope } from "../src/kernel/Wire.js"

/** Every arm the grammar demands, derived from the grammar. */
declare const everyKind: {
  readonly [K in EnvelopeKind]: (envelope: Envelope) => string
}

/** The witness: a fold whose arms span the union. */
export const lawful = matchKind(everyKind)

/** One kind short: the union's first literal dropped from the record. */
declare const missingOne: Omit<typeof everyKind, (typeof EnvelopeKind.literals)[0]>

/** The planted spelling: a fold whose arms no longer span the union. */
export const planted = matchKind(missingOne)
