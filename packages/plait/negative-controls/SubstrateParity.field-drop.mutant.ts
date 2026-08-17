import {
  assertDistinguishingFieldSet,
  pinnedWrongLastSequenceShape,
} from "../test/WrongLastSequenceShape.js"

/**
 * Planted regression: the wall's comparison narrows — `cause` and the raw
 * wire `ApiError` fall out of the compared shape, leaving only fields that
 * can never carry a new distinguishing signal. The field-set guard must
 * refuse this; a guard that accepts it has stopped pinning what the
 * indistinguishability wall compares.
 */
const { cause: _cause, apiError: _apiError, ...narrowedShape } = pinnedWrongLastSequenceShape

try {
  assertDistinguishingFieldSet(narrowedShape)
  console.error("SUBSTRATE PARITY FIELD-DROP MUTANT: narrowed field set was accepted")
  process.exit(0)
} catch (refusal) {
  console.error(String(refusal))
  process.exit(1)
}
