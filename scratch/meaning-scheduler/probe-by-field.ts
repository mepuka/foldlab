/**
 * Probe from the monotone-determinism survey: two agents fill the SAME
 * hole with the SAME value. Semantically idempotent — should commute.
 * Prediction: the `by` field records whoever landed first, so the state
 * digest is schedule-dependent and claim 1 is falsified for this class.
 */

import { runOnce, type Schedule } from "./experiment.ts"

const HOLES = ["order.id_format", "order.currency", "order.shipping_policy"]
const schedules: Schedule[] = [
  { kind: "fifo" },
  { kind: "lifo" },
  ...Array.from({ length: 10 }, (_, i) => ({ kind: "seeded" as const, seed: i + 1 })),
]

const reports = schedules.map((s) =>
  runOnce(
    HOLES,
    [
      { name: "A", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
      { name: "B", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
    ],
    s,
  ),
)

const digests = new Set(reports.map((r) => r.stateDigest))
const fillers = new Set(
  reports.map((r) => {
    const h = r.finalState.holes["order.id_format"]
    return h?.status === "filled" ? h.by : h?.status
  }),
)
console.log(`same-value fills by two agents, 12 schedules:`)
console.log(`  distinct final state digests: ${digests.size}`)
console.log(`  distinct recorded fillers:    ${[...fillers].join(", ")}`)
console.log(
  digests.size === 1
    ? "held: by-field did not leak the schedule"
    : "REFUTED as predicted: semantically idempotent fills produced schedule-dependent state digests — the by field leaks the clock into meaning",
)
