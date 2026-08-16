/**
 * The frozen spec (verify/moves/Moves/Spec.lean, L1-L8) restated as
 * executable properties over the ground instantiation, plus the two spec
 * witnesses. These are not proofs — the Lean gate carries those — they pin
 * the transliteration to the same laws on inputs the corpus never sampled.
 */

import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import { kernel, sessionDigest, type WireMove } from "../src/wire.ts"

const holeArb = FastCheck.constantFrom<"h0" | "h1" | "h2">("h0", "h1", "h2")
const valueArb = FastCheck.nat({ max: 5 })
const holderArb = FastCheck.constantFrom("alice", "bob", "carol", "dave")

const candidateArb = FastCheck.record({ holder: holderArb, value: valueArb })

const fillArb: FastCheck.Arbitrary<WireMove> = FastCheck.record({
  hole: holeArb,
  holder: holderArb,
  op: FastCheck.constant("fill" as const),
  value: valueArb,
})

const disputeArb: FastCheck.Arbitrary<WireMove> = FastCheck.record({
  candidates: FastCheck.array(candidateArb, { maxLength: 3 }).map((cs) => kernel.csetOfList(cs)),
  hole: holeArb,
  holder: holderArb,
  op: FastCheck.constant("dispute" as const),
})

const decideArb: FastCheck.Arbitrary<WireMove> = FastCheck.record({
  hole: holeArb,
  op: FastCheck.constant("decide" as const),
  value: valueArb,
})

const wireMoveArb = FastCheck.oneof(
  { weight: 3, arbitrary: fillArb },
  { weight: 2, arbitrary: disputeArb },
)
const anyMoveArb = FastCheck.oneof(
  { weight: 3, arbitrary: fillArb },
  { weight: 2, arbitrary: disputeArb },
  { weight: 1, arbitrary: decideArb },
)

const wireBagArb = FastCheck.array(wireMoveArb, { maxLength: 10 })
const anyBagArb = FastCheck.array(anyMoveArb, { maxLength: 12 })

/** A bag together with one of its permutations. */
const permutedBagArb = wireBagArb.chain((bag) =>
  FastCheck.tuple(
    FastCheck.constant(bag),
    FastCheck.shuffledSubarray(bag, { minLength: bag.length, maxLength: bag.length }),
  )
)

describe("wire confluence (L2/L3)", () => {
  test("the terminal state — meaning and journal — is permutation-invariant", () => {
    FastCheck.assert(
      FastCheck.property(permutedBagArb, ([bag, permuted]) => {
        return kernel.stateEq(kernel.replay(bag).state, kernel.replay(permuted).state)
      }),
    )
  })

  test("sessionDigest is a function of the intent bag alone", () => {
    FastCheck.assert(
      FastCheck.property(permutedBagArb, ([bag, permuted]) =>
        sessionDigest(bag) === sessionDigest(permuted)),
    )
  })

  test("merge is bag union: symmetric with no ordering metadata", () => {
    FastCheck.assert(
      FastCheck.property(wireBagArb, wireBagArb, (left, right) =>
        kernel.stateEq(kernel.merge(left, right), kernel.merge(right, left))),
    )
  })
})

describe("strong no-loss (L1)", () => {
  test("every fill lands its exact holder-attributed pair in terminal evidence", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, (bag) => {
        const terminal = kernel.replay(bag).state
        return bag.every((move) =>
          move.op !== "fill" ||
          kernel.csetMember(terminal.evidence[move.hole], { holder: move.holder, value: move.value })
        )
      }),
    )
  })

  test("fills are total: willAdmit is constantly true for fills", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, fillArb, (bag, fill) => {
        const terminal = kernel.replay(bag).state
        const [, admitted] = kernel.repairK(terminal, fill)
        return kernel.willAdmit(terminal, fill) && admitted
      }),
    )
  })
})

describe("refusal characterization (L5) and alignment (L6/L7)", () => {
  test("the runner refuses exactly when d85Refusal holds, at every step", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, (bag) => {
        let state = kernel.initial()
        for (const move of bag) {
          const predicted = kernel.willAdmit(state, move)
          const [next, admitted] = kernel.repairK(state, move)
          if (admitted !== predicted) return false
          if (!admitted && !kernel.stateEq(next, state)) return false
          state = next
        }
        return true
      }),
    )
  })

  test("receipts align one-to-one with the intent list", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, (bag) => {
        const { receipts } = kernel.replay(bag)
        return receipts.length === bag.length &&
          receipts.every((receipt, index) => receipt.move === bag[index])
      }),
    )
  })
})

describe("safety survives totalization (L8)", () => {
  test("every terminal state of an arbitrary finite trace is well-formed", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, (bag) => kernel.wf(kernel.replay(bag).state)),
    )
  })

  test("no later move, admitted or refused, revises a decided hole", () => {
    FastCheck.assert(
      FastCheck.property(anyBagArb, anyBagArb, (before, after) => {
        const mid = kernel.replay(before).state
        const decidedHoles = kernel.carrier.holes.filter((h) => mid.holes[h].tag === "decided")
        const terminal = kernel.runRepairK(mid, after).state
        return decidedHoles.every((h) => {
          const was = mid.holes[h]
          const now = terminal.holes[h]
          return was.tag === "decided" && now.tag === "decided" && now.value === was.value
        })
      }),
    )
  })
})

describe("schedule-free fences (L4)", () => {
  test("min and plurality choose identically across permutations, and soundly", () => {
    FastCheck.assert(
      FastCheck.property(permutedBagArb, ([bag, permuted]) => {
        const one = kernel.replay(bag).state
        const two = kernel.replay(permuted).state
        return kernel.carrier.holes.every((h) => {
          const a = one.holes[h]
          const b = two.holes[h]
          if (a.tag !== "disputed" || b.tag !== "disputed") return a.tag === b.tag
          const minChoice = kernel.minFenceRule.choose(a.candidates)
          const pluralityChoice = kernel.pluralityFenceRule.choose(a.candidates)
          return minChoice === kernel.minFenceRule.choose(b.candidates) &&
            pluralityChoice === kernel.pluralityFenceRule.choose(b.candidates) &&
            kernel.valueAppears(a.candidates, minChoice) &&
            kernel.valueAppears(a.candidates, pluralityChoice)
        })
      }),
    )
  })

  test("close seals any sound fence's choice; the soundness validator refuses the rest", () => {
    FastCheck.assert(
      FastCheck.property(wireBagArb, holeArb, (bag, hole) => {
        const terminal = kernel.replay(bag).state
        const hs = terminal.holes[hole]
        const closed = kernel.close(terminal, hole, kernel.minFenceRule)
        if (hs.tag !== "disputed") return closed === null
        if (closed === null) return false
        const sealed = closed.holes[hole]
        return sealed.tag === "decided" && kernel.valueAppears(hs.candidates, sealed.value)
      }),
    )
    expect(() =>
      kernel.close(
        kernel.replay([
          { hole: "h0", holder: "alice", op: "fill", value: 1 },
          { hole: "h0", holder: "bob", op: "fill", value: 2 },
        ]).state,
        "h0",
        kernel.soundFence(() => 99),
      )
    ).toThrow("unsound fence")
  })
})

describe("spec witnesses", () => {
  test("W1: the three-fill bag is fully admitted and journals the third pair", () => {
    const bag: ReadonlyArray<WireMove> = [
      { hole: "h0", holder: "alice", op: "fill", value: 10 },
      { hole: "h0", holder: "bob", op: "fill", value: 20 },
      { hole: "h0", holder: "carol", op: "fill", value: 30 },
    ]
    const { receipts, state } = kernel.replay(bag)
    expect(receipts.map((r) => r.admitted)).toEqual([true, true, true])
    expect(kernel.csetMember(state.evidence.h0, { holder: "carol", value: 30 })).toBe(true)
  })

  test("W2: a confirming refill records the second holder (MOVES-5 closed)", () => {
    const { state } = kernel.replay([
      { hole: "h0", holder: "alice", op: "fill", value: 10 },
      { hole: "h0", holder: "bob", op: "fill", value: 10 },
    ])
    expect(state.holes.h0).toEqual({ tag: "filled", value: 10 })
    expect(kernel.csetMember(state.evidence.h0, { holder: "bob", value: 10 })).toBe(true)
  })
})
