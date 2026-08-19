/**
 * The closure suites for the read-side folds, and the laws of the instances
 * beside them.
 *
 * **The enumerations are never listed here.** Every arm record below is built
 * from the union's own literals — the same accessor the declared segment order
 * reads — so a kind added to the vocabulary tomorrow arrives in these suites
 * without an edit, and a suite cannot quietly cover fewer kinds than the
 * vocabulary carries. An enumeration that is listed drifts, and a closure suite
 * that drifts is a suite that reports totality it no longer has.
 *
 * The runtime half is here: every kind dispatches, and to its own arm. The
 * compile-time half — that a caller missing an arm does not typecheck, which is
 * what makes the closure a contract and not a habit — is the executed
 * must-not-compile control beside this file.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Order } from "effect"

import { Digest } from "../src/truth/Digest.js"
import {
  absenceRefusal,
  match as matchRefusal,
  matchKind as matchRefusalKind,
  structuralRefusal,
  StructuralRefusalKind,
  type Refusal,
  type StructuralRefusal,
} from "../src/truth/Refusal.js"
import {
  encodeEnvelope,
  EnvelopeKind,
  matchKind as matchEnvelopeKind,
  byDigest as envelopeByDigest,
  type Envelope,
} from "../src/kernel/Wire.js"
import {
  byDigest as cellByDigest,
  stateOf,
  type Observation,
} from "../src/planes/Cell.js"
import {
  byToken,
  matchState,
  TokenOrder,
  type RegisterState,
} from "../src/planes/Register.js"
import { matchPublished, type PublishedEnvelope } from "../src/carriage/FabricClient.js"
import { matchEmitted, type EmittedEvent } from "../src/planes/Lane.js"
import { Holder } from "../src/kernel/Wire.js"
import { OutcomeValue } from "../src/planes/Register.js"
import {
  matchOutcome,
  matchRunOutcome,
  type EngineOutcome,
  type RunOutcome,
} from "../src/carriage/Engine.js"
import type { KernelAct } from "../src/kernel/KernelDoor.js"
import {
  KERNEL_REFUSALS,
  type KernelRefusalRow,
} from "../src/kernel/KernelTables.generated.js"

const lane = Digest.make("015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862")

const refusalOfKind = (kind: StructuralRefusalKind): StructuralRefusal =>
  structuralRefusal({
    kind,
    law: "A closure suite mints one refusal per kind the vocabulary carries.",
    path: ["kind"],
    got: kind,
    expected: kind,
    next: [{ subject: "kind", note: "Handle every kind the vocabulary carries." }],
  })

/**
 * One arm per kind, derived from the union artifact. The cast is the derivation
 * seam: `Object.fromEntries` cannot know it produced exactly the union's keys,
 * and the assertion below reads the key set back to prove that it did.
 */
const kindArms = Object.fromEntries(
  StructuralRefusalKind.literals.map((kind) => [
    kind,
    (refusal: StructuralRefusal) => `${kind}:${refusal.kind}`,
  ]),
) as { readonly [K in StructuralRefusalKind]: (refusal: StructuralRefusal) => string }

describe("the structural-kind fold is closed over the generated vocabulary", () => {
  test("the derived arm record carries exactly the union's kinds", () => {
    expect(Object.keys(kindArms).sort()).toEqual(
      [...StructuralRefusalKind.literals].sort(),
    )
  })

  test("the vocabulary carries more than one kind, so the suite is not vacuous", () => {
    expect(StructuralRefusalKind.literals.length).toBeGreaterThan(1)
  })

  test("every kind the vocabulary carries dispatches to its own arm", () => {
    for (const kind of StructuralRefusalKind.literals) {
      expect(matchRefusalKind(kindArms)(refusalOfKind(kind))).toBe(`${kind}:${kind}`)
    }
  })

  test("the fold is total: no kind falls through", () => {
    const reached = new Set(
      StructuralRefusalKind.literals.map((kind) =>
        matchRefusalKind(kindArms)(refusalOfKind(kind))
      ),
    )
    expect(reached.size).toBe(StructuralRefusalKind.literals.length)
  })
})

describe("the refusal-sort fold is closed over the two sorts", () => {
  const fold = matchRefusal({
    StructuralRefusal: (refusal) => `structural:${refusal.kind}`,
    AbsenceRefusal: (refusal) => `absence:${refusal.kind}`,
  })

  const absence = absenceRefusal({
    kind: "cataloged-value-absent",
    law: "A head-relative statement may be repealed by later evidence.",
    path: [],
    got: "missing",
    expected: "present",
    next: [{ subject: "read", note: "Read again after the value lands." }],
  })

  test("a structural refusal reaches the structural arm", () => {
    expect(fold(refusalOfKind("malformed-envelope"))).toBe("structural:malformed-envelope")
  })

  test("an absence observation reaches the absence arm", () => {
    expect(fold(absence)).toBe("absence:cataloged-value-absent")
  })

  test("the fold answers on every sort the union carries", () => {
    const both: ReadonlyArray<Refusal> = [refusalOfKind("digest-mismatch"), absence]
    expect(both.map(fold)).toEqual(["structural:digest-mismatch", "absence:cataloged-value-absent"])
  })
})

const envelopeArms = Object.fromEntries(
  EnvelopeKind.literals.map((kind) => [
    kind,
    (envelope: Envelope) => `${kind}:${envelope.holder}`,
  ]),
) as { readonly [K in EnvelopeKind]: (envelope: Envelope) => string }

const envelopeOfKind = (kind: EnvelopeKind): Envelope =>
  Effect.runSync(encodeEnvelope({
    v: 0,
    kind,
    lane,
    key: "entity-1",
    holder: Holder.make("seat-alpha"),
    body: null,
    pins: [],
  })).envelope

describe("the envelope-kind fold is closed over the four observation kinds", () => {
  test("the derived arm record carries exactly the kind schema's literals", () => {
    expect(Object.keys(envelopeArms).sort()).toEqual([...EnvelopeKind.literals].sort())
  })

  test("every admitted kind dispatches to its own arm", () => {
    for (const kind of EnvelopeKind.literals) {
      expect(matchEnvelopeKind(envelopeArms)(envelopeOfKind(kind))).toBe(`${kind}:seat-alpha`)
    }
  })
})

describe("the register-state fold covers the model's three states", () => {
  const fold = matchState({
    absent: () => "absent",
    held: (state) => `held:${state.holder}:${state.token}`,
    landed: (state) => `landed:${state.holder}:${state.outcome.value}`,
  })

  const absent: RegisterState = { token: 0, holder: null, outcome: null }
  const held: RegisterState = { token: 4, holder: Holder.make("seat-alpha"), outcome: null }
  const landed: RegisterState = {
    token: 9,
    holder: Holder.make("seat-alpha"),
    outcome: { token: 9, value: OutcomeValue.make("done") },
  }

  test("a key nobody has fenced reads absent", () => {
    expect(fold(absent)).toBe("absent")
  })

  test("a standing lease with no result reads held", () => {
    expect(fold(held)).toBe("held:seat-alpha:4")
  })

  test("a result written under its fence reads landed, with the outcome as a value", () => {
    expect(fold(landed)).toBe("landed:seat-alpha:done")
  })

  test("the three arms are distinguished, so no state is folded into another", () => {
    expect(new Set([fold(absent), fold(held), fold(landed)]).size).toBe(3)
  })
})

describe("the acknowledgement folds are two, deliberately", () => {
  const published = (duplicate: boolean): PublishedEnvelope => ({
    digest: lane,
    sequence: 12,
    duplicate,
  })
  const emitted = (duplicate: boolean): EmittedEvent => ({
    digest: lane,
    partition: 3,
    position: 12,
    duplicate,
  })

  const publishFold = matchPublished({
    fresh: (value) => `fresh:${value.sequence}`,
    duplicate: (value) => `duplicate:${value.sequence}`,
  })
  const emitFold = matchEmitted({
    fresh: (value) => `fresh:${value.partition}`,
    duplicate: (value) => `duplicate:${value.partition}`,
  })

  test("a commons acknowledgement folds over its own window", () => {
    expect(publishFold(published(false))).toBe("fresh:12")
    expect(publishFold(published(true))).toBe("duplicate:12")
  })

  test("a partition acknowledgement folds over its own window", () => {
    expect(emitFold(emitted(false))).toBe("fresh:3")
    expect(emitFold(emitted(true))).toBe("duplicate:3")
  })
})

describe("the engine outcome fold covers both ways a judged write ends", () => {
  const act: KernelAct = { _tag: "spawn", parent: { id: 1n }, request: { id: 2n } }
  const row: KernelRefusalRow = KERNEL_REFUSALS[0]!

  const carried: EngineOutcome<{ readonly token: number }> = {
    _tag: "carried",
    act,
    encoded: [7n, 0n],
    landed: { token: 4 },
  }
  const refused: EngineOutcome<{ readonly token: number }> = {
    _tag: "refused",
    refusal: row,
  }

  const fold = {
    carried: (value: { readonly landed: { readonly token: number } }) =>
      `carried:${value.landed.token}`,
    refused: (value: { readonly refusal: KernelRefusalRow }) =>
      `refused:${value.refusal.reason}`,
  }

  test("an admitted sentence reaches the carried arm with its landing typed", () => {
    expect(matchOutcome(carried, fold)).toBe("carried:4")
  })

  test("a refused sentence reaches the refused arm with the taught row", () => {
    expect(matchOutcome(refused, fold)).toBe(`refused:${row.reason}`)
  })

  test("the pipeable shape answers alike when the landing is pinned", () => {
    const pipeable = matchOutcome<{ readonly token: number }, string>(fold)
    expect(pipeable(carried)).toBe("carried:4")
    expect(pipeable(refused)).toBe(`refused:${row.reason}`)
  })

  test("the two arms are distinguished, so neither outcome folds into the other", () => {
    expect(new Set([matchOutcome(carried, fold), matchOutcome(refused, fold)]).size)
      .toBe(2)
  })
})

describe("the run outcome fold covers the three ways a run ends", () => {
  const row: KernelRefusalRow = KERNEL_REFUSALS[0]!
  const steps = [{ node: 1n, encoded: [7n], landed: null }]

  const landed: RunOutcome = { _tag: "landed", steps, landed: null }
  const refused: RunOutcome = { _tag: "refused", node: 2n, refusal: row, steps }
  const unspeakable: RunOutcome = {
    _tag: "unspeakable",
    node: 3n,
    slot: "anchor",
    detail: "unsupplied",
    steps,
  }

  const fold = matchRunOutcome({
    landed: (run) => `landed:${run.steps.length}`,
    refused: (run) => `refused:${run.node}:${run.refusal.reason}`,
    unspeakable: (run) => `unspeakable:${run.node}:${run.slot}:${run.detail}`,
  })

  test("a run whose every node carried reaches the landed arm", () => {
    expect(fold(landed)).toBe("landed:1")
  })

  test("a run stopped at the door reaches the refused arm with the taught row", () => {
    expect(fold(refused)).toBe(`refused:2:${row.reason}`)
  })

  test("a run stopped before the door reaches the unspeakable arm, with no row", () => {
    expect(fold(unspeakable)).toBe("unspeakable:3:anchor:unsupplied")
  })

  test("every arm keeps the steps that already happened", () => {
    for (const outcome of [landed, refused, unspeakable]) {
      expect(matchRunOutcome({
        landed: (run) => run.steps.length,
        refused: (run) => run.steps.length,
        unspeakable: (run) => run.steps.length,
      })(outcome)).toBe(1)
    }
  })

  test("the three arms are distinguished, so no ending folds into another", () => {
    expect(new Set([fold(landed), fold(refused), fold(unspeakable)]).size).toBe(3)
  })
})

describe("the equivalence instances satisfy the equivalence laws", () => {
  const envelopes = EnvelopeKind.literals.map((kind) =>
    Effect.runSync(encodeEnvelope({
      v: 0,
      kind,
      lane,
      key: "entity-1",
      holder: Holder.make("seat-alpha"),
      body: null,
      pins: [],
    }))
  )

  test("the envelope digest equivalence is reflexive, symmetric, and transitive", () => {
    for (const left of envelopes) {
      expect(envelopeByDigest(left, left)).toBe(true)
      for (const right of envelopes) {
        expect(envelopeByDigest(left, right)).toBe(envelopeByDigest(right, left))
        for (const third of envelopes) {
          if (envelopeByDigest(left, right) && envelopeByDigest(right, third)) {
            expect(envelopeByDigest(left, third)).toBe(true)
          }
        }
      }
    }
  })

  const observations: ReadonlyArray<ReadonlyArray<Observation>> = [
    [],
    [{ holder: "seat-alpha", value: 1 }],
    [{ holder: "seat-alpha", value: 1 }, { holder: "seat-beta", value: 2 }],
  ]
  const states = observations.map((set) => Effect.runSync(stateOf(set)))

  test("the cell digest equivalence is reflexive, symmetric, and transitive", () => {
    for (const left of states) {
      expect(cellByDigest(left, left)).toBe(true)
      for (const right of states) {
        expect(cellByDigest(left, right)).toBe(cellByDigest(right, left))
      }
    }
  })

  test("the cell equivalence answers on the canonical form, not on arrival order", () => {
    const forward = Effect.runSync(stateOf([
      { holder: "seat-alpha", value: 1 },
      { holder: "seat-beta", value: 2 },
    ]))
    const backward = Effect.runSync(stateOf([
      { holder: "seat-beta", value: 2 },
      { holder: "seat-alpha", value: 1 },
      { holder: "seat-alpha", value: 1 },
    ]))
    expect(cellByDigest(forward, backward)).toBe(true)
  })

  test("distinct observation sets are distinct lattice points", () => {
    expect(cellByDigest(states[0]!, states[1]!)).toBe(false)
    expect(cellByDigest(states[1]!, states[2]!)).toBe(false)
  })
})

describe("the token order carries the model's monotonicity, within its bounds", () => {
  const at = (token: number): RegisterState => ({
    token,
    holder: Holder.make("seat-alpha"),
    outcome: null,
  })

  test("the token order is the pin's number order", () => {
    expect(TokenOrder(1, 2)).toBe(-1)
    expect(TokenOrder(2, 2)).toBe(0)
    expect(TokenOrder(3, 2)).toBe(1)
  })

  test("observed states sort by their fencing token", () => {
    const sorted = [at(9), at(1), at(4)].sort(byToken)
    expect(sorted.map((state) => state.token)).toEqual([1, 4, 9])
  })

  test("the later of two observations is the one carrying the greater token", () => {
    expect(Order.max(byToken)(at(4), at(9)).token).toBe(9)
    expect(Order.isLessThan(TokenOrder)(4, 9)).toBe(true)
  })
})
