/**
 * The first minute: both folds, the cut, and a refusal — in one run.
 *
 * Run from the repository root: `bun packages/core/examples/tour.ts`
 *
 * This file lives under packages/core because `effect` resolves from
 * packages/core/node_modules and is not hoisted to the root; a copy under
 * scripts/ cannot import it.
 *
 * Provenance: docs/research/2026-08-14-tangible-examples.md, where the
 * expected output is recorded verbatim.
 */

import { Effect } from "effect"
import { applyKV, combineKV, event, foldKV, headFrom, stateDigest, streamSeed } from "../src/stream.ts"

const seed = streamSeed("orders")
const A = [event("orders", 1, "customer=ada"), event("orders", 2, "total=42")]
const B = [event("orders", 1, "total=42"), event("orders", 2, "customer=ada")]
const st = (e: typeof A) => stateDigest(Effect.runSync(foldKV(e)))

console.log("two histories, same two facts, different order\n")
console.log("  A head          ", headFrom(seed, A))
console.log("  B head          ", headFrom(seed, B))
console.log("  A state digest  ", st(A))
console.log("  B state digest  ", st(B))
console.log("  heads equal?    ", headFrom(seed, A) === headFrom(seed, B))
console.log("  states equal?   ", st(A) === st(B))

console.log("\ncut B anywhere, fold the halves apart, combine:")
for (let k = 0; k <= B.length; k++) {
  const left = Effect.runSync(foldKV(B.slice(0, k)))
  const right = Effect.runSync(foldKV(B.slice(k)))
  console.log(`  cut@${k} ->`, stateDigest(combineKV(left, right)!))
}

console.log("\nfeed the meaning fold something it does not admit:")
const junk = { stream: "orders", seq: 3, payload: new Uint8Array([0xff, 0xfe]) }
console.log("  head still extends:", headFrom(seed, [...B, junk]))
console.log(
  "  meaning fold says:",
  Effect.runSync(Effect.flip(applyKV(Effect.runSync(foldKV(B)), junk)))._tag,
)
