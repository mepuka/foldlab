import { describe, expect, test } from "bun:test"
import { algebras, homomorphisms, product, steps } from "../src/algebra.ts"
import { makeCollector, memoryBacking } from "../src/entity.ts"
import { defineFold } from "../src/fold.ts"
import { makeFoldLawSuite } from "../src/foldLaws.ts"
import {
  emptySeqKV,
  foldSeqKV,
  projectKV,
} from "../src/kvSemilattice.ts"
import { emptyKV, event } from "../src/stream.ts"

const attemptMutation = (mutate: () => void): void => {
  try {
    mutate()
  } catch {
    // A frozen public value is one lawful way for the ownership seam to refuse
    // the mutation. The assertion after the attempt is the actual tripwire.
  }
}

describe("public values cannot mutate later core behavior (#48)", () => {
  test("TS-01: mutating an empty set-union result cannot poison a later fold", () => {
    const fold = defineFold(algebras.setUnion, steps.streamSet)
    const exposed = fold.fold([]) as Array<string>
    try {
      attemptMutation(() => exposed.push("POISON"))
      expect(defineFold(algebras.setUnion, steps.streamSet).fold([
        event("t", 1, "k=v"),
      ])).toEqual(["t"])
    } finally {
      const poison = (algebras.setUnion.empty as Array<string>).indexOf("POISON")
      if (poison >= 0) attemptMutation(() => {
        (algebras.setUnion.empty as Array<string>).splice(poison, 1)
      })
    }
  })

  test("TS-02: mutating the enriched identity cannot reach a fresh projection", () => {
    const exposed = emptySeqKV()
    const entries = exposed.entries as Map<string, { seq: number; stream: string; value: string }>
    const seen = exposed.seen as Map<string, ReadonlySet<number>>
    try {
      attemptMutation(() => entries.set("ghost", { seq: 2, stream: "poison", value: "shared" }))
      attemptMutation(() => seen.set("poison", new Set([1, 2])))
      const folded = foldSeqKV([])
      if (!folded.ok) throw new Error(folded.refusal._tag)
      expect([...projectKV(folded.state).entries]).toEqual([])
      expect(projectKV(folded.state).count).toBe(0)
    } finally {
      entries.delete("ghost")
      seen.delete("poison")
    }
  })

  test("TS-03: mutating a product empty cannot rewrite later reads", () => {
    const algebra = product(algebras.sum, algebras.count)
    const exposed = algebra.empty as unknown as Array<number>
    try {
      attemptMutation(() => {
        exposed[0] = 99
      })
      expect(algebra.empty).toEqual([0, 0])
      expect(product(algebras.sum, algebras.count).empty).toEqual([0, 0])
    } finally {
      attemptMutation(() => {
        exposed[0] = 0
      })
    }
  })

  test("TS-04: registry and law mutation cannot rewrite another algebra or its suite", () => {
    const registry = algebras as unknown as { sum: typeof algebras.sum }
    const homRegistry = homomorphisms as unknown as Record<string, unknown>
    const stepRegistry = steps as unknown as Record<string, unknown>
    const originalSum = algebras.sum
    const originalHom = homomorphisms.isPositiveFromMax
    const originalStep = steps.constOne
    const sumLaws = originalSum.laws as { commutative: boolean; idempotent: boolean }
    try {
      attemptMutation(() => {
        sumLaws.idempotent = true
      })
      attemptMutation(() => {
        registry.sum = algebras.max as unknown as typeof algebras.sum
      })
      attemptMutation(() => {
        homRegistry.isPositiveFromMax = {
          ...originalHom,
          map: () => false,
        }
      })
      attemptMutation(() => {
        stepRegistry.constOne = steps.payloadLength
      })

      expect(registry.sum).toBe(originalSum)
      expect(homRegistry.isPositiveFromMax).toBe(originalHom)
      expect(stepRegistry.constOne).toBe(originalStep)
      expect(algebras.count.laws).toEqual({ commutative: true, idempotent: false })
      const suite = makeFoldLawSuite(defineFold(originalSum, steps.payloadLength), {
        fixtures: [],
      })
      if (!suite.ok) throw new Error(suite.refusal.reason)
      expect(suite.laws.map((law) => law.name)).not.toContain("combine idempotence")
      expect(originalSum.laws).not.toBe(algebras.count.laws)
    } finally {
      attemptMutation(() => {
        sumLaws.idempotent = false
      })
      attemptMutation(() => {
        registry.sum = originalSum
      })
      attemptMutation(() => {
        homRegistry.isPositiveFromMax = originalHom
      })
      attemptMutation(() => {
        stepRegistry.constOne = originalStep
      })
    }
  })

  test("TS-05: mutating returned entity views cannot move stored anchors", () => {
    const collector = makeCollector(memoryBacking(), () => "entity")
    const ingested = collector.ingest(event("bus", 1, "a=1"))
    const lookedUp = collector.entity("entity")!
    const expected = collector.anchors()

    attemptMutation(() => {
      (ingested.state.entries as Map<string, string>).set("ingest-poison", "shared")
    })
    attemptMutation(() => {
      (lookedUp.state.entries as Map<string, string>).set("lookup-poison", "shared")
    })

    expect(collector.anchors()).toEqual(expected)
    expect([...collector.entity("entity")!.state.entries]).toEqual([["a", "1"]])
  })

  test("tripwire: descriptors and empty identities remain pristine after adversarial use", () => {
    expect(Object.keys(algebras)).toEqual([
      "sum",
      "count",
      "max",
      "min",
      "any",
      "all",
      "setUnion",
    ])
    expect(Object.keys(homomorphisms)).toEqual(["isPositiveFromMax"])
    expect(Object.keys(steps)).toEqual([
      "constOne",
      "payloadLength",
      "sequenceNumber",
      "payloadNonEmpty",
      "streamSet",
      "payloadNumber",
    ])
    expect(Object.isFrozen(algebras)).toBe(true)
    expect(Object.isFrozen(homomorphisms)).toBe(true)
    expect(Object.isFrozen(steps)).toBe(true)
    for (const algebra of Object.values(algebras)) {
      expect(Object.isFrozen(algebra)).toBe(true)
      expect(Object.isFrozen(algebra.laws)).toBe(true)
    }
    expect(new Set(Object.values(algebras).map((algebra) => algebra.laws)).size).toBe(7)
    expect(algebras.setUnion.empty).toEqual([])
    expect(Object.isFrozen(algebras.setUnion.empty)).toBe(true)

    const pair = product(algebras.sum, algebras.count)
    expect(pair.empty).toEqual([0, 0])
    expect(Object.isFrozen(pair.empty)).toBe(true)

    const firstKV = emptyKV()
    const secondKV = emptyKV()
    expect(firstKV).toEqual({ entries: new Map(), count: 0 })
    expect(firstKV.entries).not.toBe(secondKV.entries)
    expect(projectKV(emptySeqKV())).toEqual({ entries: new Map(), count: 0 })
  })
})
