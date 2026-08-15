/**
 * E2 part 2: the consumer that never met the agents.
 *
 * A separate program — deliberately NOT Effect, plain TypeScript, could
 * be Go — that knows nothing about fibers, schedules, or which agent
 * said what. It receives only journal entries (data) and declares its
 * logic as a PREDICATE OVER EPISTEMIC STATES: "act when the order's id
 * is decided and its currency is understood."
 *
 * The claim this demonstrates: downstream logic hooks into MEANING
 * TRANSITIONS, not messages — and because meaning is schedule-invariant,
 * the consumer inherits schedule independence without knowing schedules
 * exist. The trigger may fire at a different entry INDEX per schedule,
 * but it fires at the SAME state digest: one meaning-point, many clocks.
 */

import { runOnce, type Schedule } from "./experiment.ts"
import { initialState, step, digest, type EpistemicState } from "./journal.ts"
import type { JsonValue } from "../../packages/core/src/jcs.ts"

const HOLES = ["order.id_format", "order.currency", "order.shipping_policy"]

// ---- the consumer's entire knowledge of the world: a state predicate.
// No agent names, no message formats, no schedule assumptions.

/**
 * NAIVE (negative control, discovered by refutation): "filled" is not a
 * stable property — a fill can later be disputed — so triggering on it
 * observes a transient prefix and inherits the schedule's clock.
 */
const naiveReady = (s: EpistemicState): boolean => {
  const settled = (h: EpistemicState["holes"][string]) =>
    h?.status === "filled" || h?.status === "decided"
  return settled(s.holes["order.id_format"]) && settled(s.holes["order.currency"])
}

/**
 * STABLE: triggers only on properties that can never un-happen — a fence
 * decision is forever, and a single-seat fill is forever because no
 * second seat exists to contest it. Which holes are single-seat is
 * protocol knowledge (here: currency has one authorized filler).
 * This is the CALM discipline surfacing: monotone hooks are
 * coordination-free; non-monotone hooks must wait for the fence.
 */
const stableReady = (s: EpistemicState): boolean => {
  const id = s.holes["order.id_format"]
  const currency = s.holes["order.currency"]
  return id?.status === "decided" && (currency?.status === "filled" || currency?.status === "decided")
}

// ---- fold the journal, watch for a predicate's rising edge.
const watch = (
  entries: readonly { move: Parameters<typeof step>[1]; stateDigest: string }[],
  ready: (s: EpistemicState) => boolean,
) => {
  let state = initialState(HOLES)
  for (const [i, entry] of entries.entries()) {
    const next = step(state, entry.move)
    if (!next.ok) throw new Error(`committed history refused: ${next.refusal}`)
    state = next.state
    if (ready(state)) {
      return { firedAtIndex: i, triggeringStateDigest: digest(state as unknown as JsonValue) }
    }
  }
  return null
}

const schedules: Schedule[] = [
  { kind: "fifo" },
  { kind: "lifo" },
  ...Array.from({ length: 10 }, (_, i) => ({ kind: "seeded" as const, seed: i + 1 })),
]

const agents = [
  { name: "A", intents: [{ hole: "order.id_format", value: { format: "uuid-v4" } }] },
  { name: "B", intents: [{ hole: "order.currency", value: { code: "USD", minor_units: 2 } }] },
  { name: "C", intents: [{ hole: "order.id_format", value: { format: "ulid" } }] },
]

const reports = schedules.map((s) => runOnce(HOLES, agents, s))

const evaluate = (name: string, ready: (s: EpistemicState) => boolean) => {
  const results = reports.map((report) => ({
    schedule: report.schedule,
    fired: watch(report.entries, ready),
  }))
  const meaningPoints = new Set(results.map((r) => r.fired?.triggeringStateDigest))
  const indices = new Set(results.map((r) => r.fired?.firedAtIndex))
  console.log(`\n--- ${name} ---`)
  for (const r of results.slice(0, 3)) {
    console.log(
      `${r.schedule.padEnd(10)} fired at entry ${r.fired?.firedAtIndex} on meaning-point ${r.fired?.triggeringStateDigest.slice(0, 16)}...`,
    )
  }
  console.log(`distinct firing indices (clock positions): ${indices.size}`)
  console.log(`distinct meaning-points fired on:          ${meaningPoints.size}`)
  return meaningPoints.size
}

console.log("A separate program, not Effect, never met the agents; input is journal data only.")

const naivePoints = evaluate("NAIVE predicate: 'id settled && currency settled' (unstable)", naiveReady)
console.log(
  naivePoints > 1
    ? "schedule-DEPENDENT, as the stability law predicts: 'filled' can un-happen, so the hook saw transient prefixes."
    : "CONTROL IS DEAD WEIGHT: the unstable predicate failed to leak the clock.",
)

const stablePoints = evaluate("STABLE predicate: 'id decided && currency single-seat-filled'", stableReady)
console.log(
  stablePoints === 1
    ? "One meaning-point, many clocks: the consumer inherited schedule independence without knowing schedules exist."
    : "REFUTED: even the stable predicate leaked a clock — the stability law is wrong or the fence is unsound.",
)
