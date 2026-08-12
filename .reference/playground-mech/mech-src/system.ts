/**
 * @playground/mech — explicit-state model checking for kernel protocols.
 *
 * This is the TypeScript half of the model gate (docs/research/
 * effector-model-gate.md). The Go half (`go/effector/model`) runs the same
 * search inside the Go gate; this half exists so that protocol models can be
 * written, checked, and DEMONSTRATED at the application layer, in the same
 * language as the engine that will obey them — and so that the two halves can
 * be pinned against each other: the TS port of the effector model must
 * reproduce the Go checker's state counts and 64-bit fingerprints exactly
 * (see test/effector.wall.test.ts, the cross-language wall in the P2a
 * tradition).
 *
 * Determinism is a requirement, not a nicety: a counterexample nobody can
 * reproduce is an anecdote. The checker never reads a clock, `actions` must
 * return a FIXED enumeration order, and the visited set is keyed on a
 * caller-supplied canonical encoding — injectivity is the caller's law, and
 * the checker's fingerprint makes a violation of it loud.
 */

import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

// ---------- FNV-1a 64-bit, matching go/effector/model exactly ----------

const FNV_OFFSET_HI = 0xcbf29ce4
const FNV_OFFSET_LO = 0x84222325
const FNV_LOW = 0x1b3
const TWO32 = 0x1_0000_0000

type U64Parts = readonly [hi: number, lo: number]

const fnv1a64Parts = (encoded: string): U64Parts => {
  let hi = FNV_OFFSET_HI
  let lo = FNV_OFFSET_LO
  for (let i = 0; i < encoded.length; i++) {
    lo = (lo ^ encoded.charCodeAt(i)) >>> 0
    const lowProduct = lo * FNV_LOW
    const carry = Math.floor(lowProduct / TWO32)
    hi = (hi * FNV_LOW + carry + lo * 0x100) >>> 0
    lo = lowProduct >>> 0
  }
  return [hi, lo]
}

const partsToBigInt = (hi: number, lo: number): bigint =>
  (BigInt(hi) << 32n) | BigInt(lo)

/**
 * FNV-1a over the char codes of a canonical encoding. Every code unit MUST be
 * <= 0xff — encodings are byte strings, and the Go side hashes bytes.
 * Arithmetic stays in exact unsigned 32-bit limbs; BigInt conversion happens
 * once at the public boundary.
 */
export const fnv1a64 = (encoded: string): bigint => {
  const [hi, lo] = fnv1a64Parts(encoded)
  return partsToBigInt(hi, lo)
}

// ---------- the transition system ----------

/**
 * An explicit-state transition system. `S` is the state, `A` the action
 * label, `L` the observable outcome of a step (what the implementation would
 * return to its caller — invariants get to see it, because safety properties
 * like fencing are properties of a WRITE, invisible to a state predicate once
 * the state has moved on).
 */
export interface System<S, A, L> {
  readonly init: S
  /** Enabled actions in a FIXED order. Determinism depends on it. */
  readonly actions: (s: S) => ReadonlyArray<A>
  /** Fire an enabled action. Must not mutate `s`. */
  readonly step: (s: S, a: A) => readonly [S, L]
  /**
   * Canonical encoding: equal states encode equal, distinct states encode
   * distinct, and every char code is a byte (<= 0xff). Used directly as the
   * visited-set key — there is no hash collision to reason about.
   */
  readonly encode: (s: S) => string
  readonly describeAction: (a: A) => string
  readonly describeState: (s: S) => string
  readonly describeLabel: (l: L) => string
}

/**
 * Checked on every TRANSITION, not merely every state. Return null when the
 * transition is legal, a human-readable reason when it is not.
 */
export interface Invariant<S, A, L> {
  readonly name: string
  readonly violated: (pre: S, a: A, l: L, post: S) => string | null
}

export interface TraceStep<S, A, L> {
  readonly action: A
  readonly label: L
  readonly before: S
  readonly after: S
}

export interface Violation<S, A, L> {
  readonly invariant: string
  readonly detail: string
  /** Minimal-depth counterexample: BFS guarantees no shorter trace fails. */
  readonly trace: ReadonlyArray<TraceStep<S, A, L>>
}

export interface Report<S, A, L> {
  readonly states: number
  readonly transitions: number
  readonly maxDepth: number
  /** Sum (mod 2^64) of fnv1a64 over every discovered state's encoding. */
  readonly fingerprint: bigint
  readonly violation: Violation<S, A, L> | null
}

export const formatFingerprint = (fp: bigint): string =>
  fp.toString(16).padStart(16, "0")

export const formatTrace = <S, A, L>(
  sys: System<S, A, L>,
  trace: ReadonlyArray<TraceStep<S, A, L>>,
): string =>
  trace
    .map(
      (st, i) =>
        `  ${String(i + 1).padStart(2)}. ${sys.describeAction(st.action).padEnd(10)} -> ${
          sys.describeLabel(st.label).padEnd(14)
        } | ${sys.describeState(st.after)}`,
    )
    .join("\n")

// ---------- the checker ----------

interface Link<A, L> {
  readonly parent: number
  readonly action: A
  readonly label: L
}

/**
 * Deterministic breadth-first search to `depth` (or to closure when
 * `depth <= 0`, which the caller must know is finite). Returns the first
 * invariant violation, minimal by BFS. Mirrors go/effector/model's Check
 * step for step, so state counts, transition counts and fingerprints are
 * comparable across the language wall.
 */
export const check = <S, A, L>(
  sys: System<S, A, L>,
  depth: number,
  invariants: ReadonlyArray<Invariant<S, A, L>>,
): Report<S, A, L> => {
  const index = new Map<string, number>()
  const states: Array<S> = [sys.init]
  const depths: Array<number> = [0]
  const links: Array<Link<A, L> | null> = [null]
  index.set(sys.encode(sys.init), 0)

  let transitions = 0
  let maxDepth = 0
  let [fingerprintHi, fingerprintLo] = fnv1a64Parts(sys.encode(sys.init))

  for (let head = 0; head < states.length; head++) {
    const cur = states[head]!
    const curDepth = depths[head]!
    if (curDepth > maxDepth) maxDepth = curDepth
    if (depth > 0 && curDepth >= depth) continue
    for (const action of sys.actions(cur)) {
      const [next, label] = sys.step(cur, action)
      transitions++
      for (const inv of invariants) {
        const reason = inv.violated(cur, action, label, next)
        if (reason === null) continue
        return {
          states: states.length,
          transitions,
          maxDepth,
          fingerprint: partsToBigInt(fingerprintHi, fingerprintLo),
          violation: {
            invariant: inv.name,
            detail: reason,
            trace: reconstruct(states, links, head, {
              action,
              label,
              before: cur,
              after: next,
            }),
          },
        }
      }
      const key = sys.encode(next)
      if (index.has(key)) continue
      index.set(key, states.length)
      states.push(next)
      depths.push(curDepth + 1)
      links.push({ parent: head, action, label })
      const [hashHi, hashLo] = fnv1a64Parts(key)
      const lowSum = fingerprintLo + hashLo
      fingerprintLo = lowSum >>> 0
      fingerprintHi = (fingerprintHi + hashHi + (lowSum >= TWO32 ? 1 : 0)) >>> 0
    }
  }
  return {
    states: states.length,
    transitions,
    maxDepth,
    fingerprint: partsToBigInt(fingerprintHi, fingerprintLo),
    violation: null,
  }
}

const reconstruct = <S, A, L>(
  states: ReadonlyArray<S>,
  links: ReadonlyArray<Link<A, L> | null>,
  node: number,
  last: TraceStep<S, A, L>,
): Array<TraceStep<S, A, L>> => {
  const reversed: Array<TraceStep<S, A, L>> = []
  let i = node
  while (i > 0) {
    const link = links[i]!
    reversed.push({
      action: link.action,
      label: link.label,
      before: states[link.parent]!,
      after: states[i]!,
    })
    i = link.parent
  }
  reversed.reverse()
  reversed.push(last)
  return reversed
}

// ---------- path enumeration (schedules for conformance and demos) ----------

export interface PathSet<S, A, L> {
  readonly paths: ReadonlyArray<ReadonlyArray<TraceStep<S, A, L>>>
  /** Complete schedules considered (kept or not). */
  readonly explored: number
  /** True when `limit` stopped enumeration: coverage is a SAMPLE. */
  readonly capped: boolean
}

/**
 * Deterministic depth-first enumeration of every schedule of exactly `depth`
 * actions (plus any shorter schedule that runs out of enabled actions).
 * Every shorter schedule is a prefix of an emitted one, so emitting only
 * maximal schedules loses no coverage. `limit > 0` stops early and sets
 * `capped` — callers MUST surface that, a truncated sweep reported as
 * exhaustive is exactly the lie this library exists to prevent.
 */
export const enumeratePaths = <S, A, L>(
  sys: System<S, A, L>,
  depth: number,
  limit: number,
  keep: ((path: ReadonlyArray<TraceStep<S, A, L>>) => boolean) | null,
): PathSet<S, A, L> => {
  const paths: Array<ReadonlyArray<TraceStep<S, A, L>>> = []
  let explored = 0
  let capped = false
  const path: Array<TraceStep<S, A, L>> = []

  const emit = (): void => {
    explored++
    if (keep !== null && !keep(path)) return
    paths.push([...path])
    if (limit > 0 && paths.length >= limit) capped = true
  }

  const walk = (s: S): void => {
    if (capped) return
    if (path.length === depth) {
      emit()
      return
    }
    let fired = 0
    for (const action of sys.actions(s)) {
      fired++
      const [next, label] = sys.step(s, action)
      path.push({ action, label, before: s, after: next })
      walk(next)
      path.pop()
      if (capped) return
    }
    if (fired === 0) emit()
  }
  walk(sys.init)
  return { paths, explored, capped }
}

// ---------- Effect surface ----------

/** A violation, as a typed Effect error carrying the formatted trace. */
export class MechViolation extends Data.TaggedError("MechViolation")<{
  readonly invariant: string
  readonly detail: string
  readonly trace: string
  readonly states: number
  readonly transitions: number
}> {}

/**
 * `check` as an Effect: succeeds with the clean report, fails with a typed
 * MechViolation carrying the minimal counterexample — so an application can
 * gate a deploy, a migration, or a config change on a model check and handle
 * the counterexample like any other domain error.
 */
export const checkEffect = <S, A, L>(
  sys: System<S, A, L>,
  depth: number,
  invariants: ReadonlyArray<Invariant<S, A, L>>,
): Effect.Effect<Report<S, A, L>, MechViolation> =>
  Effect.suspend(() => {
    const report = check(sys, depth, invariants)
    if (report.violation === null) return Effect.succeed(report)
    return Effect.fail(
      new MechViolation({
        invariant: report.violation.invariant,
        detail: report.violation.detail,
        trace: formatTrace(sys, report.violation.trace),
        states: report.states,
        transitions: report.transitions,
      }),
    )
  })
