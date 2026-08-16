/**
 * The ground wire instantiation and its codec, mirroring
 * `verify/moves/Oracle/{Instance,Codec}.lean` and the emitter's verdict in
 * `verify/moves/Main.lean`. The corpus grammar is deliberately narrow —
 * fixed ASCII keys, non-negative integers below 2^53, ASCII-identifier
 * holders — because inside that grammar Lean's printer, RFC 8785, and
 * JavaScript's code-unit string order all agree, so byte equality of
 * canonical serializations is a meaningful differential verdict.
 */

import { encodeJsonValue, type JsonValue } from "@foldlab/core/jcs"
import { createHash } from "node:crypto"
import {
  type Candidate,
  type CandidateSet,
  type Cmp,
  type EpistemicState,
  type HoleState,
  type Kernel,
  makeKernel,
  type Move,
  type RunResult,
} from "./kernel.ts"

export type Hole = "h0" | "h1" | "h2"
export type Val = number
export type Actor = string

export const holes: ReadonlyArray<Hole> = ["h0", "h1", "h2"]

const valueCmp: Cmp<Val> = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const holderCmp: Cmp<Actor> = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export type WireMove = Move<Hole, Val, Actor>
export type WireState = EpistemicState<Hole, Val, Actor>
export type WireCandidateSet = CandidateSet<Val, Actor>
export type WireKernel = Kernel<Hole, Val, Actor>

export const kernel: WireKernel = makeKernel({ holderCmp, holes, valueCmp })

export const digestState = (s: WireState): string => {
  const encoded = encodeJsonValue(stateToJson(s))
  if (!encoded.ok) throw new Error(`state left the canonical domain: ${encoded.refusal.reason}`)
  return createHash("sha256").update(encoded.bytes).digest("hex")
}

/**
 * The digest of a session is a function of its intent bag alone (over the
 * fill/dispute wire fragment): replay the bag from the all-open state and
 * digest the terminal fold.
 */
export const sessionDigest = (intents: ReadonlyArray<WireMove>): string =>
  digestState(kernel.replay(intents).state)

/*! ## Encode (JsonValue projections; RFC 8785 ordering is the encoder's) */

const candToJson = (c: Candidate<Val, Actor>): JsonValue => ({
  holder: c.holder,
  value: c.value,
})

const csetToJson = (cs: CandidateSet<Val, Actor>): JsonValue => cs.map(candToJson)

const hstateToJson = (hs: HoleState<Val, Actor>): JsonValue => {
  switch (hs.tag) {
    case "open":
      return { tag: "open" }
    case "filled":
      return { tag: "filled", value: hs.value }
    case "disputed":
      return { candidates: csetToJson(hs.candidates), tag: "disputed" }
    case "decided":
      return { tag: "decided", value: hs.value }
  }
}

export const stateToJson = (s: WireState): JsonValue =>
  Object.fromEntries(
    holes.map((h) => [h, { evidence: csetToJson(s.evidence[h]), meaning: hstateToJson(s.holes[h]) }]),
  )

export const moveToJson = (m: WireMove): JsonValue => {
  switch (m.op) {
    case "fill":
      return { hole: m.hole, holder: m.holder, op: "fill", value: m.value }
    case "dispute":
      return { candidates: csetToJson(m.candidates), holder: m.holder, hole: m.hole, op: "dispute" }
    case "decide":
      return { hole: m.hole, op: "decide", value: m.value }
  }
}

export const runToJson = (r: RunResult<Hole, Val, Actor>): JsonValue => ({
  receipts: r.receipts.map((receipt) => receipt.admitted),
  state: stateToJson(r.state),
})

const fencesToJson = (s: WireState): JsonValue =>
  Object.fromEntries(
    holes.map((h) => {
      const hs = s.holes[h]
      if (hs.tag !== "disputed" || hs.candidates.length === 0) return [h, null]
      return [h, {
        min: kernel.minFenceRule.choose(hs.candidates),
        plurality: kernel.pluralityFenceRule.choose(hs.candidates),
      }]
    }),
  )

export type Semantics = Pick<WireKernel, "initial" | "runRepair" | "runRepairK" | "stepTrace">

/**
 * One trace, every exported semantics — the exact shape the Lean emitter
 * computes per corpus line. Byte equality of the canonical serialization
 * against the emitted line is the conformance verdict. The semantics is a
 * parameter so planted mutants can be driven through the identical harness;
 * fence choices are always the lawful rules over whatever terminal set the
 * given semantics reaches.
 */
export const verdictOfTraceUsing = (semantics: Semantics, moves: ReadonlyArray<WireMove>): JsonValue => {
  const total = semantics.runRepairK(semantics.initial(), moves)
  const primitive = semantics.stepTrace(semantics.initial(), moves)
  const repaired = semantics.runRepair(semantics.initial(), moves)
  const reversed = semantics.runRepairK(semantics.initial(), [...moves].reverse())
  return {
    fences: fencesToJson(total.state),
    moves: moves.map(moveToJson),
    repairK: runToJson(total),
    reverseRepairK: runToJson(reversed),
    runRepair: repaired === null ? null : stateToJson(repaired),
    step: primitive === null ? null : stateToJson(primitive),
  }
}

export const verdictOfTrace = (moves: ReadonlyArray<WireMove>): JsonValue =>
  verdictOfTraceUsing(kernel, moves)

export const verdictLineUsing = (semantics: Semantics, moves: ReadonlyArray<WireMove>): string => {
  const encoded = encodeJsonValue(verdictOfTraceUsing(semantics, moves))
  if (!encoded.ok) throw new Error(`verdict left the canonical domain: ${encoded.refusal.reason}`)
  return encoded.bytes
}

export const verdictLine = (moves: ReadonlyArray<WireMove>): string => verdictLineUsing(kernel, moves)

/*! ## Decode */

const asRecord = (j: JsonValue, what: string): { readonly [key: string]: JsonValue } => {
  if (j === null || typeof j !== "object" || Array.isArray(j)) throw new Error(`${what}: expected an object`)
  return j as { readonly [key: string]: JsonValue }
}

const asString = (j: JsonValue | undefined, what: string): string => {
  if (typeof j !== "string") throw new Error(`${what}: expected a string`)
  return j
}

const asNumber = (j: JsonValue | undefined, what: string): number => {
  if (typeof j !== "number" || !Number.isSafeInteger(j) || j < 0) {
    throw new Error(`${what}: expected a non-negative safe integer`)
  }
  return j
}

const asArray = (j: JsonValue | undefined, what: string): ReadonlyArray<JsonValue> => {
  if (!Array.isArray(j)) throw new Error(`${what}: expected an array`)
  return j
}

const holeOfName = (name: string): Hole => {
  if (name === "h0" || name === "h1" || name === "h2") return name
  throw new Error(`unknown hole ${name}`)
}

export const moveFromJson = (j: JsonValue): WireMove => {
  const obj = asRecord(j, "move")
  const op = asString(obj["op"], "move.op")
  const hole = holeOfName(asString(obj["hole"], "move.hole"))
  switch (op) {
    case "fill":
      return {
        hole,
        holder: asString(obj["holder"], "fill.holder"),
        op: "fill",
        value: asNumber(obj["value"], "fill.value"),
      }
    case "decide":
      return { hole, op: "decide", value: asNumber(obj["value"], "decide.value") }
    case "dispute": {
      const candidates = asArray(obj["candidates"], "dispute.candidates").map((c) => {
        const pair = asRecord(c, "candidate")
        return {
          holder: asString(pair["holder"], "candidate.holder"),
          value: asNumber(pair["value"], "candidate.value"),
        }
      })
      return {
        candidates: kernel.csetOfList(candidates),
        hole,
        holder: asString(obj["holder"], "dispute.holder"),
        op: "dispute",
      }
    }
    default:
      throw new Error(`unknown op ${op}`)
  }
}

export const movesFromJson = (j: JsonValue): ReadonlyArray<WireMove> =>
  asArray(asRecord(j, "verdict")["moves"], "verdict.moves").map(moveFromJson)
