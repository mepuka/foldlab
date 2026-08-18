import { describe, expect, test } from "bun:test"

import { Effect, Option } from "effect"

import { Catalog, Payloads, substrateLayer } from "../src/Catalog.js"
import { digestOf } from "../src/Digest.js"

describe("the catalog and its internal payload seam", () => {
  test("admits a value under the digest of its canonical bytes", () => {
    const admitted = Effect.runSync(
      Effect.gen(function* () {
        const catalog = yield* Catalog
        const digest = yield* catalog.put({ b: 2, a: 1 })
        return { digest, found: yield* catalog.get(digest) }
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(admitted.digest).toBe(Effect.runSync(digestOf({ a: 1, b: 2 })))
    expect(Option.getOrNull(admitted.found)).toEqual({ b: 2, a: 1 })
  })

  test("an unadmitted digest is absent, never an invented value", () => {
    const found = Effect.runSync(
      Effect.gen(function* () {
        const catalog = yield* Catalog
        return yield* catalog.get(yield* digestOf({ never: "admitted" }))
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(Option.isNone(found)).toBe(true)
  })

  test("a value outside the RFC 8785 seam refuses admission", () => {
    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const catalog = yield* Catalog
        return yield* Effect.flip(catalog.put(Number.POSITIVE_INFINITY))
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(refusal.kind).toBe("non-canonical-value")
    expect(refusal.next.length).toBeGreaterThan(0)
  })

  test("the standing payload layer answers absence, because no probe licenses more", () => {
    const found = Effect.runSync(
      Effect.gen(function* () {
        const payloads = yield* Payloads
        return yield* payloads.get(yield* digestOf("anything"))
      }).pipe(Effect.provide(substrateLayer)),
    )
    expect(Option.isNone(found)).toBe(true)
  })

  test("a fixture implementation reaches callers through the production tag", () => {
    const stored = new Uint8Array([1, 2, 3])
    const found = Effect.runSync(
      Effect.gen(function* () {
        const payloads = yield* Payloads
        return yield* payloads.get(yield* digestOf("anything"))
      }).pipe(
        Effect.provide(Payloads.testLayer({ get: () => Effect.succeed(Option.some(stored)) })),
      ),
    )
    expect(Option.getOrNull(found)).toEqual(stored)
  })

  test("the internal seam stays unverified: it hands back exactly what it holds", () => {
    // Characterization, not a control: it records that the seam does not police
    // its own answers, which is what leaves a lie writable beneath it. The
    // control that spends that freedom lives at the verify door —
    // "a lying payload layer is refused at the one verify door" in
    // `Resolved.test.ts` — because a refusal is the only thing that can fail.
    const lie = new TextEncoder().encode("not the bytes of any digest asked for")
    const found = Effect.runSync(
      Effect.gen(function* () {
        const payloads = yield* Payloads
        return yield* payloads.get(yield* digestOf({ asked: "for" }))
      }).pipe(
        Effect.provide(Payloads.testLayer({ get: () => Effect.succeed(Option.some(lie)) })),
      ),
    )
    expect(Option.getOrNull(found)).toEqual(lie)
  })

  test("the process-local catalog is not shared between layer builds", () => {
    const digest = Effect.runSync(
      Effect.gen(function* () {
        const catalog = yield* Catalog
        return yield* catalog.put({ scoped: true })
      }).pipe(Effect.provide(Catalog.layer)),
    )
    const foundElsewhere = Effect.runSync(
      Effect.gen(function* () {
        const catalog = yield* Catalog
        return yield* catalog.get(digest)
      }).pipe(Effect.provide(Catalog.layer)),
    )
    expect(Option.isNone(foundElsewhere)).toBe(true)
  })
})
