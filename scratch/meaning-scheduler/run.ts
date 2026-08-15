/**
 * E2 driver: two scenarios x twelve schedules. Prints a verdict per
 * pre-registered claim (PREREGISTRATION.md) — this file exists to
 * refute them, not to demo them.
 */

import { runOnce, type Schedule, type RunReport } from "./experiment.ts"

const HOLES = ["order.id_format", "order.currency", "order.shipping_policy"] as const

const schedules: Schedule[] = [
  { kind: "fifo" },
  { kind: "lifo" },
  ...Array.from({ length: 10 }, (_, i) => ({ kind: "seeded" as const, seed: i + 1 })),
]

const summarize = (name: string, reports: RunReport[]) => {
  const stateDigests = new Set(reports.map((r) => r.stateDigest))
  const chainHeads = new Set(reports.map((r) => r.chainHead))
  const orders = new Set(reports.map((r) => r.moveOrder.join(" ")))
  const allVerified = reports.every((r) => r.verified)
  const allLegible = reports.every((r) => r.legibleHeads)
  console.log(`\n=== ${name} ===`)
  console.log(`schedules run:            ${reports.length}`)
  console.log(`distinct move orderings:  ${orders.size}  (must be >1 or the schedules never differed)`)
  console.log(`distinct chain heads:     ${chainHeads.size}  (chain remembers the linearization)`)
  console.log(`distinct state digests:   ${stateDigests.size}`)
  console.log(`verify-on-read all runs:  ${allVerified}`)
  for (const r of reports.filter((x) => !x.verified)) {
    console.log(`  FAILED ${r.schedule}: ${r.verifyFailures.join("; ")}`)
  }
  return { stateDigests, chainHeads, orders, allVerified, allLegible }
}

// ---------------------------------------------------------- scenario 1
// Commuting moves only: three agents fill three disjoint holes.
const commuting = schedules.map((s) =>
  runOnce(
    [...HOLES],
    [
      { name: "A", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
      { name: "B", intents: [{ hole: "order.currency", value: { code: "USD", minor_units: 2 } }] },
      { name: "C", intents: [{ hole: "order.shipping_policy", value: { carrier: "any", sla_days: 5 } }] },
    ],
    s,
  ),
)
const s1 = summarize("scenario 1: commuting fills (claim 1)", commuting)
const claim1 =
  s1.stateDigests.size === 1 && s1.orders.size > 1
    ? "HELD — meanings converged byte-for-byte across genuinely different interleavings"
    : s1.orders.size <= 1
      ? "INCONCLUSIVE — schedules never actually differed; the probe is too weak"
      : "REFUTED — commuting moves produced divergent final understandings"
console.log(`CLAIM 1 (schedule irrelevance of meaning): ${claim1}`)

// ---------------------------------------------------------- scenario 2
// Genuine conflict: A and C fill the SAME hole with different values.
const conflicting = schedules.map((s) =>
  runOnce(
    [...HOLES],
    [
      { name: "A", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
      { name: "B", intents: [{ hole: "order.currency", value: { code: "USD", minor_units: 2 } }] },
      { name: "C", intents: [{ hole: "order.id_format", value: { format: "ulid" } }] },
    ],
    s,
  ),
)
const s2 = summarize("scenario 2: conflicting fills (claim 2)", conflicting)
const everyRunSurfaced = conflicting.every((r) => r.disputes >= 1 && r.decisions >= 1)
const noSilentClobber = conflicting.every((r) => {
  const final = r.finalState.holes["order.id_format"]
  return final?.status === "decided"
})
const bothCandidatesJournaled = conflicting.every((r) =>
  r.moveOrder.some((m) => m.includes("dispute")),
)
const claim2 =
  everyRunSurfaced && noSilentClobber && bothCandidatesJournaled
    ? "HELD — every interleaving forced the conflict to an explicit dispute + fence decision; no schedule silently won"
    : "REFUTED — some schedule let one meaning clobber another without a decision point"
console.log(`CLAIM 2 (decisions surface themselves): ${claim2}`)
console.log(
  `  (bonus) conflict scenario state convergence: ${new Set(conflicting.map((r) => r.stateDigest)).size === 1 ? "converged — evidence + deterministic fence rule" : "divergent (expected if fence rule were order-sensitive)"}`,
)

// ---------------------------------------------------------- claim 3
const claim3 =
  s1.allVerified && s2.allVerified
    ? "HELD — every intermediate head in every run refolds to a well-formed snapshot matching its recorded digest"
    : "REFUTED — some committed head has no coherent epistemic reading"
console.log(`\nCLAIM 3 (every head is legible): ${claim3}`)

// ---------------------------------------------------- negative controls
// The harness must be able to refute, or "HELD" means nothing.

// Control A: a clobbering journal (last writer wins, no dispute) must FAIL
// the claim-2 checks and lose state convergence.
const clobbered = schedules.map((s) =>
  runOnce(
    [...HOLES],
    [
      { name: "A", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
      { name: "B", intents: [{ hole: "order.currency", value: { code: "USD", minor_units: 2 } }] },
      { name: "C", intents: [{ hole: "order.id_format", value: { format: "ulid" } }] },
    ],
    s,
    "clobber",
  ),
)
const clobberSurfaced = clobbered.every((r) => r.disputes >= 1 && r.decisions >= 1)
const clobberConverged = new Set(clobbered.map((r) => r.stateDigest)).size === 1
console.log(`\nCONTROL A (clobber journal): claim-2 check ${clobberSurfaced ? "PASSED — CONTROL IS DEAD WEIGHT" : "failed as it must"}; state ${clobberConverged ? "converged — CONTROL IS DEAD WEIGHT" : "diverged by schedule, as lawlessness predicts"}`)

// Control B: tampering one committed digest must fail verify-on-read.
import { Journal, verifyJournal } from "./journal.ts"
const tampered = new Journal([...HOLES])
tampered.append(tampered.head(), { kind: "fill", hole: "order.currency", value: { code: "USD" }, by: "A" })
;(tampered.entries[0] as { stateDigest: string }).stateDigest = "00".repeat(32)
const tamperCaught = !verifyJournal(tampered, [...HOLES]).ok
console.log(`CONTROL B (tampered digest): verify-on-read ${tamperCaught ? "refused, as it must" : "ACCEPTED — VERIFIER HAS NO TEETH"}`)

// ---------------------------------------------------------- evidence dump
console.log(`\n--- sample interleavings, scenario 2 (first 3 schedules) ---`)
for (const r of conflicting.slice(0, 3)) {
  console.log(`${r.schedule}: ${r.moveOrder.join(" -> ")}`)
}
