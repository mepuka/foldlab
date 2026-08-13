/**
 * Generated laws for the declared fold grammar. These are property suites,
 * not sampled examples: every primitive and a nested product earn their API
 * rights from deterministic, shrinking fast-check runs.
 */

import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import {
  algebras,
  encodeFoldState,
  hasAdmittedDeclaration,
  homomorphisms,
  mapped,
  mappedStep,
  product,
  productStep,
  steps,
  type Algebra,
  type DeclaredHom,
  type FoldState,
  type Step,
} from "../src/algebra.ts"
import { defineFold, type Fold } from "../src/fold.ts"
import { makeFoldLawSuite } from "../src/foldLaws.ts"
import { event, type StreamEvent } from "../src/stream.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

const registerLaws = <
  A extends FoldState,
  B extends FoldState = A,
  C extends FoldState = A,
>(
  name: string,
  fold: Fold<StreamEvent, A>,
  options: {
    readonly map?: DeclaredHom<A, B>
    readonly zip?: Fold<StreamEvent, C>
  },
): void => {
  const suite = makeFoldLawSuite(fold, {
    fixtures: foldFixtureEvents,
    ...options,
  })
  if (!suite.ok) throw new Error(`${name}: ${suite.refusal.reason}`)
  describe(name, () => {
    for (const law of suite.laws) {
      test(`${law.name}; seed=${law.seed}`, law.check)
    }
  })
}

registerLaws("sum", primitiveFolds.sum, { zip: primitiveFolds.count })
registerLaws("count", primitiveFolds.count, { zip: primitiveFolds.sum })
registerLaws("max", primitiveFolds.max, {
  map: homomorphisms.isPositiveFromMax,
  zip: primitiveFolds.count,
})
registerLaws("min", primitiveFolds.min, { zip: primitiveFolds.any })
registerLaws("any", primitiveFolds.any, { zip: primitiveFolds.setUnion })
registerLaws("all", primitiveFolds.all, { zip: primitiveFolds.max })
registerLaws("setUnion", primitiveFolds.setUnion, { zip: primitiveFolds.sum })
registerLaws(
  "nested product",
  primitiveFolds.sum.zip(primitiveFolds.count.zip(primitiveFolds.setUnion)),
  { zip: primitiveFolds.max },
)

/**
 * The semilattice gate (#20). Commutativity and idempotence are what separate
 * an algebra that may federate from one that must not, and the suite is only
 * worth having if it can REFUSE a false claim. These tests hand it three
 * algebras that lie and one that does not, and check the outcome each time.
 *
 * The lying algebra is not invented for the occasion: `lastWriteWins` is the
 * last-write-wins register — the one-key restriction of the very KV union that
 * #14 §6.1 finding 3 named as the missing `combine` — and it is a lawful monoid
 * that is idempotent and genuinely not commutative. It is the case the gate
 * exists to catch.
 */
describe("claimed laws are checked, and a false claim is refused (#20)", () => {
  const suiteFor = <A extends FoldState>(algebra: Algebra<A>, step: Step<StreamEvent, A>) => {
    const suite = makeFoldLawSuite(defineFold(algebra, step), { fixtures: foldFixtureEvents })
    if (!suite.ok) throw new Error(suite.refusal.reason)
    return suite
  }
  const lawNamed = <A extends FoldState>(
    algebra: Algebra<A>,
    step: Step<StreamEvent, A>,
    name: string,
  ) => suiteFor(algebra, step).laws.find((law) => law.name === name)

  /** The LWW register: a later write displaces an earlier one; no write is neutral. */
  const lastWriteWins = (left: number | null, right: number | null): number | null =>
    right === null ? left : right

  test("a claim that is absent generates no law, so no name reads as a proof", () => {
    const unclaimed: Algebra<number | null> = {
      empty: null,
      combine: lastWriteWins,
      generator: algebras.max.generator!,
    }
    const names = suiteFor(unclaimed, steps.sequenceNumber).laws.map((law) => law.name)
    expect(names).not.toContain("combine commutativity")
    expect(names).not.toContain("combine idempotence")
  })

  test("REFUSED: the LWW register claiming commutativity fails its own law", () => {
    const lying: Algebra<number | null> = {
      empty: null,
      combine: lastWriteWins,
      generator: algebras.max.generator!,
      laws: { commutative: true, idempotent: true },
    }
    const commutativity = lawNamed(lying, steps.sequenceNumber, "combine commutativity")
    expect(commutativity).toBeDefined()
    expect(() => commutativity!.check()).toThrow()

    // Everything it does hold, it still passes — the refusal is surgical, not a
    // blanket rejection of an algebra that is a perfectly good monoid.
    for (const name of ["monoid identity", "monoid associativity", "combine idempotence"]) {
      const law = lawNamed(lying, steps.sequenceNumber, name)
      expect(law).toBeDefined()
      expect(() => law!.check()).not.toThrow()
    }
  })

  test("REFUSED: addition claiming idempotence fails its own law", () => {
    const lying: Algebra<number> = {
      empty: 0,
      combine: (left, right) => (left + right) % 0x1_0000_0000,
      generator: algebras.sum.generator!,
      laws: { commutative: true, idempotent: true },
    }
    const idempotence = lawNamed(lying, steps.payloadLength, "combine idempotence")
    expect(idempotence).toBeDefined()
    expect(() => idempotence!.check()).toThrow()
    expect(() => lawNamed(lying, steps.payloadLength, "combine commutativity")!.check())
      .not.toThrow()
  })

  test("ADMITTED: the five declared joins carry both laws and pass them", () => {
    for (const name of ["max", "min", "any", "all", "setUnion"] as const) {
      const algebra = algebras[name]
      expect(algebra.laws).toEqual({ commutative: true, idempotent: true })
    }
    for (const name of ["sum", "count"] as const) {
      expect(algebras[name].laws).toEqual({ commutative: true, idempotent: false })
    }
  })

  test("the suite lists exactly the claims: sum commutes, setUnion also absorbs", () => {
    const sumNames = suiteFor(algebras.sum, steps.payloadLength).laws.map((law) => law.name)
    expect(sumNames).toContain("combine commutativity")
    expect(sumNames).not.toContain("combine idempotence")

    const setNames = suiteFor(algebras.setUnion, steps.streamSet).laws.map((law) => law.name)
    expect(setNames).toContain("combine commutativity")
    expect(setNames).toContain("combine idempotence")
  })

  test("a product is never more federated than its least federated member", () => {
    expect(product(algebras.setUnion, algebras.max).laws)
      .toEqual({ commutative: true, idempotent: true })
    // `sum` absorbs nothing, so the pair absorbs nothing.
    expect(product(algebras.setUnion, algebras.sum).laws)
      .toEqual({ commutative: true, idempotent: false })
    // An anonymous member claiming nothing sinks both claims.
    const anonymous: Algebra<number> = { empty: 0, combine: (left) => left }
    expect(product(algebras.setUnion, anonymous).laws)
      .toEqual({ commutative: false, idempotent: false })
  })

  test("a mapped view carries the target's claims, not the source's", () => {
    // `max` is a join and `any` is a join, so the view is one too — but the
    // claim comes from the target, whose combine is the one that runs.
    expect(mapped(homomorphisms.isPositiveFromMax, algebras.max).laws)
      .toEqual(algebras.any.laws)
  })
})

/**
 * Lawful-surface admission (A1 #5, A2 #11). The gate that admits a mapped view
 * must prove LAW, not merely digest CONSENSUS. These tests pin the brand as a
 * runtime capability minted only by this module, and mark the precise residual
 * gap the brand does NOT close.
 */
describe("lawful-surface admission (A1/A2)", () => {
  test("the adversarial generator targets all four declaration admission gates", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.integer(), (value) => {
        const algebraDeclaration = algebras.max.declaration!
        const stepDeclaration = steps.sequenceNumber.declaration!
        const forgedAlgebra = {
          empty: null,
          combine: () => value,
          declaration: {
            [Symbol.for("@foldlab/core/Declaration")]: true,
            spec: algebraDeclaration.spec,
            encoding: algebraDeclaration.encoding,
            digest: algebraDeclaration.digest,
          },
        } as unknown as Algebra<number | null>
        const forgedStep = {
          apply: () => value,
          declaration: {
            [Symbol.for("@foldlab/core/Declaration")]: true,
            spec: stepDeclaration.spec,
            encoding: stepDeclaration.encoding,
            digest: stepDeclaration.digest,
          },
        } as unknown as Step<StreamEvent, number | null>

        expect(mapped(homomorphisms.isPositiveFromMax, forgedAlgebra).declaration).toBeUndefined()
        expect(mappedStep(homomorphisms.isPositiveFromMax, forgedStep).declaration).toBeUndefined()
        expect(product(forgedAlgebra, algebras.max).declaration).toBeUndefined()
        expect(productStep<StreamEvent, readonly [number | null, number | null]>(
          forgedStep,
          steps.sequenceNumber,
        ).declaration).toBeUndefined()
        expect(hasAdmittedDeclaration(forgedAlgebra)).toBe(false)
        expect(hasAdmittedDeclaration(forgedStep)).toBe(false)
        expect(hasAdmittedDeclaration(algebras.max)).toBe(true)
        expect(hasAdmittedDeclaration(steps.sequenceNumber)).toBe(true)
      }),
      { seed: 0x22c1_0005, numRuns: 250, endOnFailure: false },
    )
  })

  test("A1: the Declaration brand is file-private, not re-mintable from the global registry", () => {
    const decl = algebras.max.declaration!
    const brands = Object.getOwnPropertySymbols(decl)
    expect(brands).toHaveLength(1)
    // A file-private Symbol() has no registry key; a Symbol.for() key would.
    expect(Symbol.keyFor(brands[0]!)).toBeUndefined()
    // The key an attacker would guess resolves to a DIFFERENT symbol.
    expect(brands[0]).not.toBe(Symbol.for("@foldlab/core/Declaration"))
  })

  test("A1: the DeclaredHom brand is file-private, not re-mintable from the global registry", () => {
    const hom = homomorphisms.isPositiveFromMax
    const brands = Object.getOwnPropertySymbols(hom)
    expect(brands).toHaveLength(1)
    expect(Symbol.keyFor(brands[0]!)).toBeUndefined()
    expect(brands[0]).not.toBe(Symbol.for("@foldlab/core/DeclaredHom"))
  })

  test("A1: mapped refuses a forged declaration that copies a real digest onto a lying combine", () => {
    const realMax = algebras.max.declaration!
    const forgedSource = {
      empty: null,
      combine: (left: number | null) => left, // NOT max's combine
      declaration: {
        // The global-registry brand outside code can reach, plus max's digest.
        [Symbol.for("@foldlab/core/Declaration")]: true,
        spec: realMax.spec,
        encoding: realMax.encoding,
        digest: realMax.digest,
      },
    } as unknown as Algebra<number | null>
    const result = mapped(homomorphisms.isPositiveFromMax, forgedSource)
    expect(result.declaration).toBeUndefined()
    expect(result.identityIssue).toBeDefined()
  })

  test("A1: the gates refuse a forged homomorphism with a genuine declaration but a lying map", () => {
    const genuine = homomorphisms.isPositiveFromMax
    const forgedHom = {
      // No reachable DeclaredHom brand; genuine source/target/declaration copied.
      source: genuine.source,
      target: genuine.target,
      map: (_value: number | null) => true, // lies: always positive
      declaration: genuine.declaration,
    } as unknown as typeof genuine
    expect(mapped(forgedHom, algebras.max).declaration).toBeUndefined()
    expect(mappedStep(forgedHom, steps.sequenceNumber).declaration).toBeUndefined()
  })

  test("A2: mappedStep refuses a forged source-step declaration (brand, matching mapped)", () => {
    const realSeq = steps.sequenceNumber.declaration!
    const forgedStep = {
      apply: (event: StreamEvent) => event.seq,
      declaration: {
        [Symbol.for("@foldlab/core/Declaration")]: true,
        spec: realSeq.spec,
        encoding: realSeq.encoding,
        digest: realSeq.digest,
      },
    } as unknown as Step<StreamEvent, number | null>
    expect(mappedStep(homomorphisms.isPositiveFromMax, forgedStep).declaration).toBeUndefined()
  })

  test("A2: the mapped fold VIEW is gated at the algebra even when the composed step is honest", () => {
    // A mapped STEP is honest function-composition identity (hom.map ∘ step),
    // well-defined for any genuine source, so mappedStep certifies it...
    const composed = mappedStep(homomorphisms.isPositiveFromMax, steps.payloadLength)
    expect(composed.declaration).toBeDefined()
    // ...but the replay-free homomorphism VIEW is licensed only over the algebra
    // the hom preserves. mapped refuses a mismatched algebra, so the fold whose
    // map pairs them earns no identity — the source-match lives where the
    // algebra is present, which is the only place preservation is a property.
    expect(mapped(homomorphisms.isPositiveFromMax, algebras.min).declaration).toBeUndefined()
    const fold = defineFold(algebras.min, steps.payloadNumber(["x"]))
      .map(homomorphisms.isPositiveFromMax)
    expect(fold.digest).toBeUndefined()
  })

  test("KNOWN GAP: a genuine declaration re-hosted on a foreign combine is admitted (closure proposed)", () => {
    // The brand refuses FABRICATED declarations. It does NOT catch a GENUINE,
    // branded declaration re-hosted on a foreign combine: same digest implies
    // same SPEC (canonical encoding is injective), not same BEHAVIOR, because
    // Algebra carries combine as an independent structural field. Closing this
    // requires branding the Algebra/Step VALUE itself (proposed; no cross-process
    // consumer exists yet). This test pins the gap so any change is visible.
    const rehosted = {
      empty: null,
      combine: (left: number | null) => left, // lies
      declaration: algebras.max.declaration, // genuine, branded, real digest
    } as unknown as Algebra<number | null>
    expect(mapped(homomorphisms.isPositiveFromMax, rehosted).declaration).toBeDefined()
  })
})

describe("fold construction rights", () => {
  test("sum and count close under u32 modular addition", () => {
    expect(algebras.sum.combine(0xffff_ffff, 1)).toBe(0)
    expect(algebras.count.combine(0xffff_ffff, 1)).toBe(0)
  })

  test("zip performs one traversal", () => {
    let traversals = 0
    const events: Iterable<StreamEvent> = {
      [Symbol.iterator]: () => {
        traversals++
        return foldFixtureEvents[Symbol.iterator]()
      },
    }
    expect(primitiveFolds.sum.zip(primitiveFolds.count).fold(events)).toEqual([15, 5])
    expect(traversals).toBe(1)
  })

  test("map construction does not replay and mapped folding commutes", () => {
    let calls = 0
    const counted: Step<StreamEvent, number | null> = {
      ...steps.sequenceNumber,
      apply: (input) => {
        calls++
        return input.seq
      },
    }
    const source = defineFold(algebras.max, counted)
    const mapped = source.map(homomorphisms.isPositiveFromMax)
    expect(calls).toBe(0)
    expect(mapped.fold(foldFixtureEvents)).toBe(true)
    expect(calls).toBe(foldFixtureEvents.length)
    expect(mapped.fold([])).toBe(homomorphisms.isPositiveFromMax.map(source.fold([])))
  })

  test("declared payloadNumber is total over invalid and missing JSON paths", () => {
    const number = steps.payloadNumber(["metrics", "score"])
    expect(number.apply(event("json", 1, "{\"metrics\":{\"score\":3}}"))).toBe(3)
    expect(number.apply(event("json", 2, "{\"metrics\":{}}"))).toBeNull()
    expect(number.apply(event("json", 3, "not-json"))).toBeNull()
  })

  test("payloadNumber cannot bypass constrained decode on a digest path", () => {
    const score = steps.payloadNumber(["score"])
    const duplicate = event("json", 1, "{\"score\":1,\"score\":2}")
    expect(score.apply(duplicate)).toBeNull()
    expect(defineFold(algebras.max, score).fold([duplicate])).toBeNull()

    const tooDeep = `{\"score\":3,\"deep\":${"[".repeat(300)}null${"]".repeat(300)}}`
    expect(score.apply(event("json", 2, tooDeep))).toBeNull()
    expect(score.apply(event("json", 3, "{\"score\":4}"))).toBe(4)
  })

  test("payloadNumber snapshots its identity-bearing path", () => {
    const path = ["metrics", "score"]
    const number = steps.payloadNumber(path)
    const digest = number.declaration?.digest
    path[1] = "other"
    expect(number.apply(event("json", 1, "{\"metrics\":{\"score\":3}}"))).toBe(3)
    expect(number.declaration?.digest).toBe(digest)
  })

  test("the declared hom encoding is the canonical encoding of its spec", () => {
    const declared = homomorphisms.isPositiveFromMax.declaration
    expect(encodeFoldState(declared.spec)).toEqual({ ok: true, bytes: declared.encoding })
  })

  test("canonical encoding refuses cycles as data", () => {
    const cyclic: Array<FoldState> = []
    cyclic.push(cyclic)
    expect(encodeFoldState(cyclic)).toEqual({
      ok: false,
      refusal: {
        _tag: "NonCanonicalValue",
        path: "$/0",
        reason: "cyclic values are outside the canonical domain",
      },
    })
  })

  test("fast-check shrinks a failure to its minimized counterexample", () => {
    const result = FastCheck.check(
      FastCheck.property(FastCheck.integer({ min: 0, max: 100 }), (value) => value < 0),
      { examples: [[100]], seed: 0x14_06_05, endOnFailure: false },
    )
    expect(result.failed).toBe(true)
    if (result.failed) {
      expect(result.numShrinks).toBeGreaterThan(0)
      expect(result.counterexample).toEqual([0])
    }
  })
})
