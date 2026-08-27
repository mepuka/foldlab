import type { InclusionFunction } from "../MerkleFixtures.ts"

export const represents = "Killing this mutant demonstrates the vectors notice a verifier that accepts without recomputing — the inclusion verifier accepts exactly the openings whose derived-side recomputation reaches the expected root."

/** Check only the index bound and ignore the opening and expected root. */
export const mutantVerify: InclusionFunction = (
  _P,
  index,
  count,
  _bytes,
  _siblings,
  _root,
) => index < count
