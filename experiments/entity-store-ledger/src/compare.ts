import { readFileSync } from "node:fs"

export class LedgerDriftError extends Error {
  readonly code = "ledger-drift"

  constructor(detail: string) {
    super(`ledger-drift: ${detail}`)
    this.name = "LedgerDriftError"
  }
}

const firstDifference = (left: Uint8Array, right: Uint8Array): number => {
  const shared = Math.min(left.byteLength, right.byteLength)
  for (let index = 0; index < shared; index += 1) {
    if (left[index] !== right[index]) return index
  }
  return shared
}

export const assertLedgerMatches = (
  committedPath: string,
  regenerated: Uint8Array
): void => {
  const committed = readFileSync(committedPath)
  if (committed.equals(regenerated)) return
  const difference = firstDifference(committed, regenerated)
  throw new LedgerDriftError(
    `committed LEDGER.md differs from fresh extraction ` +
      `(committed ${committed.byteLength} bytes, regenerated ${regenerated.byteLength} bytes; ` +
      `first difference at byte ${difference})`
  )
}
