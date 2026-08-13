/**
 * Parallel KV replay, as a package consumer sees it.
 *
 * Run from the repository root: `bun examples/rosetta/parallel-kv.ts`.
 * The plain combine preserves a committed segment order; the enriched join
 * commutes because it retains the event coordinates that establish a winner.
 */

import { Effect } from "effect"
import {
  combineKV,
  event,
  foldKV,
  stateDigest,
  type KVState,
} from "@foldlab/core/stream"
import {
  combineSeqKV,
  foldSeqKV,
  projectKV,
  type SeqKVResult,
  type SeqKVState,
} from "@foldlab/core/kvSemilattice"

const history = [
  event("orders", 1, "status=created"),
  event("orders", 2, "owner=ada"),
  event("orders", 3, "status=paid"),
  event("orders", 4, "region=eu"),
] as const
const cut = 2

const admittedKV = (state: KVState | undefined): KVState => {
  if (state === undefined) throw new Error("the admitted replay overflowed its KV count")
  return state
}

const admittedSeqKV = (result: SeqKVResult): SeqKVState => {
  if (!result.ok) throw new Error(`the admitted replay refused: ${result.refusal._tag}`)
  return result.state
}

const sequential = Effect.runSync(foldKV(history))
const left = Effect.runSync(foldKV(history.slice(0, cut)))
const right = Effect.runSync(foldKV(history.slice(cut)))
const ordered = admittedKV(combineKV(left, right))
const swapped = admittedKV(combineKV(right, left))

const enrichedWhole = admittedSeqKV(foldSeqKV(history))
const enrichedLeft = admittedSeqKV(foldSeqKV(history.slice(0, cut)))
const enrichedRight = admittedSeqKV(foldSeqKV(history.slice(cut)))
const joined = admittedSeqKV(combineSeqKV(enrichedLeft, enrichedRight))
const joinedSwapped = admittedSeqKV(combineSeqKV(enrichedRight, enrichedLeft))

export const parallelKVReport = {
  sequential: stateDigest(sequential),
  ordered: stateDigest(ordered),
  swapped: stateDigest(swapped),
  enrichedWhole: stateDigest(projectKV(enrichedWhole)),
  joined: stateDigest(projectKV(joined)),
  joinedSwapped: stateDigest(projectKV(joinedSwapped)),
} as const

export const parallelKVChecks = {
  orderedReplayMatchesSequential:
    parallelKVReport.ordered === parallelKVReport.sequential,
  enrichedProjectionMatchesSequential:
    parallelKVReport.enrichedWhole === parallelKVReport.sequential &&
    parallelKVReport.joined === parallelKVReport.sequential,
  swappedPlainCombineDiffers:
    parallelKVReport.swapped !== parallelKVReport.sequential,
  swappedEnrichedJoinAgrees:
    parallelKVReport.joinedSwapped === parallelKVReport.joined,
} as const

if (import.meta.main) {
  console.log("parallel KV replay")
  for (const [name, digest] of Object.entries(parallelKVReport)) {
    console.log(`  ${name.padEnd(15)} ${digest}`)
  }
  for (const [law, held] of Object.entries(parallelKVChecks)) {
    console.log(`  ${held ? "PASS" : "FAIL"} ${law}`)
  }
  if (Object.values(parallelKVChecks).some((held) => !held)) process.exitCode = 1
}
