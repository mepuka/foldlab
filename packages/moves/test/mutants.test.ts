/**
 * A wall that cannot fail proves nothing. Each planted mutant drops exactly
 * one law the model proves; the corpus must kill every one of them. A mutant
 * that survives all 2000 vectors would mean the wall has a blind spot the
 * size of that law.
 */

import { describe, expect, test } from "bun:test"
import { decodeJson } from "@foldlab/core/jcs"
import type { EpistemicState, Move } from "../src/kernel.ts"
import { makeKernel } from "../src/kernel.ts"
import {
  type Actor,
  type Hole,
  holes,
  kernel,
  movesFromJson,
  type Semantics,
  type Val,
  verdictLineUsing,
  type WireMove,
} from "../src/wire.ts"

type State = EpistemicState<Hole, Val, Actor>
type RepairFn = (s: State, m: WireMove) => State | null

const utf8 = new TextEncoder()
const raw = await Bun.file(new URL("../fixtures/moves-conformance.ndjson", import.meta.url)).text()
const vectors = raw.split("\n").filter((line) => line.length > 0).slice(1).map((line) => {
  const result = decodeJson(utf8.encode(line))
  if (!result.ok) throw new Error(result.refusal.reason)
  return { line, moves: movesFromJson(result.value) }
})

const singleton = (value: Val, holder: Actor) => kernel.csetOfList([{ holder, value }])

/** Rebuild the runner family from a mutated repair, keeping everything else lawful. */
const semanticsOf = (repairFn: RepairFn): Semantics => ({
  initial: kernel.initial,
  runRepair: (s, moves) => {
    let state = s
    for (const move of moves) {
      const next = repairFn(state, move)
      if (next === null) return null
      state = next
    }
    return state
  },
  runRepairK: (s, moves) => {
    let state = s
    const receipts: Array<{ readonly admitted: boolean; readonly move: Move<Hole, Val, Actor> }> = []
    for (const move of moves) {
      const next = repairFn(state, move)
      const admitted = next !== null
      if (next !== null) state = next
      receipts.push({ admitted, move })
    }
    return { receipts, state }
  },
  stepTrace: kernel.stepTrace,
})

/** Overwrite-on-conflict: the losing fill is erased (kills no-loss and confluence). */
const lastWriteWins: RepairFn = (s, m) => {
  if (m.op === "fill") {
    const hs = s.holes[m.hole]
    if (hs.tag === "filled" && hs.value !== m.value) {
      return kernel.put(s, m.hole, { tag: "filled", value: m.value }, singleton(m.value, m.holder))
    }
  }
  return kernel.repair(s, m)
}

/** The pre-D85 semantics, verbatim from Spec.lean's frozen mutant: a confirming
 * refill journals nothing and a fill at disputed/decided refuses (kills strong
 * no-loss — the MOVES-5 regression). */
const legacyRepair: RepairFn = (s, m) => {
  if (m.op !== "fill") return kernel.step(s, m)
  const hs = s.holes[m.hole]
  if (hs.tag === "filled") {
    return hs.value === m.value ? s : kernel.step(s, {
      candidates: kernel.canonicalRepairCandidates(s, m.hole, m.value, m.holder),
      hole: m.hole,
      holder: m.holder,
      op: "dispute",
    })
  }
  return kernel.step(s, m)
}

/** Drop the decide membership guard: any value closes a dispute (kills decision provenance). */
const decideAnywhere: RepairFn = (s, m) => {
  if (m.op === "decide") {
    const hs = s.holes[m.hole]
    if (hs.tag === "disputed") {
      return kernel.put(s, m.hole, { tag: "decided", value: m.value }, hs.candidates)
    }
  }
  return kernel.repair(s, m)
}

/** Admit empty dispute offers (kills the D85 refusal characterization). */
const emptyOfferAdmitted: RepairFn = (s, m) => {
  if (m.op === "dispute" && m.candidates.length === 0 && s.holes[m.hole].tag !== "decided") {
    const merged = kernel.csetUnion(kernel.priorCandidates(s, m.hole), m.candidates)
    return kernel.put(s, m.hole, { candidates: merged, tag: "disputed" }, merged)
  }
  return kernel.repair(s, m)
}

/** Reverse the declared value order: storage stops being canonical (kills byte identity). */
const reversedValueOrder = makeKernel<Hole, Val, Actor>({
  holderCmp: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  holes,
  valueCmp: (a, b) => (a < b ? 1 : a > b ? -1 : 0),
})

const firstKill = (semantics: Semantics): number | null => {
  for (const [index, vector] of vectors.entries()) {
    if (verdictLineUsing(semantics, vector.moves) !== vector.line) return index
  }
  return null
}

const mutants: ReadonlyArray<readonly [string, Semantics]> = [
  ["last-write-wins fill", semanticsOf(lastWriteWins)],
  ["pre-D85 legacy repair", semanticsOf(legacyRepair)],
  ["decide without membership", semanticsOf(decideAnywhere)],
  ["empty offer admitted", semanticsOf(emptyOfferAdmitted)],
  ["reversed value order", reversedValueOrder],
]

describe("planted mutants", () => {
  for (const [name, semantics] of mutants) {
    test(`${name} is killed by a named vector`, () => {
      const index = firstKill(semantics)
      expect(index).not.toBeNull()
    })
  }

  test("the lawful kernel survives what the mutants do not", () => {
    expect(firstKill(kernel)).toBeNull()
  })
})
