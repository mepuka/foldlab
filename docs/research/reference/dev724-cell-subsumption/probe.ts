/**
 * Deterministic abstract trace for DEV-724/T16.
 *
 * This is a contract-prose probe, not a model verdict and not a NATS test. It
 * mirrors the two decision points in PR 81's merge loop:
 *
 *   1. line 243: before a CAS, return when `delta <= current`;
 *   2. line 257: after an ambiguous failed CAS, reconcile either by
 *      subsumption (shipped) or equality with the stale intended bytes
 *      (DEV-727's one-line alternative).
 *
 * Two schedules locate the strict superstate at different attempts:
 *
 *   - on attempt 1, equality misses once, then returns at the unchanged
 *     pre-CAS subsumption guard without issuing another CAS;
 *   - on attempt 8, seven ordinary conflicts first consume the budget. The
 *     equality miss has no ninth pre-CAS check and therefore reports bounded
 *     contention, while subsumption succeeds on the eighth reconciliation.
 */

type State = ReadonlySet<string>
type Reconcile = "subsumption" | "equality"

const join = (left: State, right: State): State => new Set([...left, ...right])
const equal = (left: State, right: State): boolean =>
  left.size === right.size && [...left].every((item) => right.has(item))
const subsumes = (current: State, delta: State): boolean =>
  equal(join(current, delta), current)

interface Result {
  readonly outcome: "success" | "exhausted"
  readonly loopReads: number
  readonly reconciliationReads: number
  readonly casAttempts: number
  readonly trace: ReadonlyArray<string>
}

const initial = new Set(["alpha"])
const delta = new Set(["beta"])

const run = (
  reconcile: Reconcile,
  strictAtAttempt: number,
  attemptBound = 8,
): Result => {
  let current: State = initial
  let loopReads = 0
  let reconciliationReads = 0
  let casAttempts = 0
  const trace: Array<string> = []

  for (let attempt = 0; attempt < attemptBound; attempt++) {
    loopReads++
    trace.push(`loop-read-${attempt + 1}:${[...current].join(",")}`)
    // PR 81 line 243. This remains subsumption in DEV-727's alternative.
    if (subsumes(current, delta)) {
      trace.push("pre-CAS guard: delta already carried -> success")
      return { outcome: "success", loopReads, reconciliationReads, casAttempts, trace }
    }

    casAttempts++
    const intended = join(current, delta)
    trace.push(`CAS-${casAttempts}: wrong-revision failure after intended ${[...intended].join(",")}`)
    reconciliationReads++
    // Every rival transition is a lawful inflation. Before the selected
    // strict-superstate attempt it adds only a fresh gamma, so delta is absent.
    // At the selected attempt it independently adds both delta and fresh gamma.
    current = join(
      current,
      attempt + 1 === strictAtAttempt
        ? new Set(["beta", `gamma-${attempt + 1}`])
        : new Set([`gamma-${attempt + 1}`]),
    )
    trace.push(`read-back:${[...current].join(",")}`)

    const accepted = reconcile === "subsumption"
      ? subsumes(current, delta)
      : equal(current, intended)
    if (accepted) {
      trace.push(`${reconcile} reconciliation -> success`)
      return { outcome: "success", loopReads, reconciliationReads, casAttempts, trace }
    }
    trace.push(`${reconcile} reconciliation -> retry`)
  }

  return { outcome: "exhausted", loopReads, reconciliationReads, casAttempts, trace }
}

const firstAttempt = {
  bySubsumption: run("subsumption", 1),
  byEquality: run("equality", 1),
}
const finalAttempt = {
  bySubsumption: run("subsumption", 8),
  byEquality: run("equality", 8),
}

if (firstAttempt.bySubsumption.outcome !== "success" ||
  firstAttempt.bySubsumption.casAttempts !== 1) {
  throw new Error(`unexpected first-attempt subsumption result: ${JSON.stringify(firstAttempt)}`)
}
if (firstAttempt.byEquality.outcome !== "success" ||
  firstAttempt.byEquality.casAttempts !== 1 ||
  firstAttempt.byEquality.loopReads !== 2) {
  throw new Error(`equality did not exit on the next pre-CAS guard: ${JSON.stringify(firstAttempt)}`)
}
if (finalAttempt.bySubsumption.outcome !== "success" ||
  finalAttempt.bySubsumption.casAttempts !== 8) {
  throw new Error(`unexpected final-attempt subsumption result: ${JSON.stringify(finalAttempt)}`)
}
if (finalAttempt.byEquality.outcome !== "exhausted" ||
  finalAttempt.byEquality.casAttempts !== 8) {
  throw new Error(`equality did not exhaust at the attempt boundary: ${JSON.stringify(finalAttempt)}`)
}

const summary = ({ outcome, loopReads, reconciliationReads, casAttempts, trace }: Result) => ({
  outcome,
  loopReads,
  reconciliationReads,
  casAttempts,
  finalEvents: trace.slice(-3),
})

console.log(JSON.stringify({
  firstAttempt: {
    bySubsumption: summary(firstAttempt.bySubsumption),
    byEquality: summary(firstAttempt.byEquality),
  },
  finalAttempt: {
    bySubsumption: summary(finalAttempt.bySubsumption),
    byEquality: summary(finalAttempt.byEquality),
  },
}, null, 2))
