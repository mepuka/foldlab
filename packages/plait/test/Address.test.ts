import { describe, expect, test } from "bun:test"

import { Effect, Layer, Option } from "effect"

import {
  Binding,
  Directory,
  Petname,
  at,
  directory,
  list,
  petname,
} from "../src/planes/Address.js"
import type { WireValue } from "../src/truth/Canonical.js"
import { Catalog, Payloads, substrateLayer, type CatalogService } from "../src/planes/Catalog.js"
import { Digest, digestOf } from "../src/truth/Digest.js"
import { isRetryable } from "../src/truth/Refusal.js"
import { publish } from "../src/planes/Resolved.js"

const wire = (value: Directory): WireValue => value as unknown as WireValue

const binding = (name: string, digest: Digest): Binding => ({
  name: Petname.make(name),
  digest,
})

/** Publishes a directory over the given bindings and answers its digest. */
const publishDirectory = Effect.fn("test.publishDirectory")(function* (
  bindings: ReadonlyArray<Binding>,
) {
  const folded = yield* directory(bindings)
  const { digest } = yield* publish(wire(folded))
  return digest
})

/** Publishes any wire value and answers its digest — the leaf of a walk. */
const publishValue = Effect.fn("test.publishValue")(function* (value: WireValue) {
  const { digest } = yield* publish(value)
  return digest
})

/**
 * A two-level tree: `root/config/model` names the leaf, and `root/tool` names a
 * second leaf beside the `config` directory.
 */
const tree = Effect.fn("test.tree")(function* () {
  const model = yield* publishValue({ model: "opus" })
  const tool = yield* publishValue({ tool: "grep" })
  const config = yield* publishDirectory([binding("model", model)])
  const root = yield* publishDirectory([binding("config", config), binding("tool", tool)])
  return { root, config, model, tool }
})

/** A catalog that answers nothing and counts how often it was asked. */
const countingCatalog = (): { readonly service: CatalogService; asked: () => number } => {
  let asked = 0
  return {
    service: {
      get: () =>
        Effect.sync(() => {
          asked++
          return Option.none()
        }),
      put: (value) => digestOf(value),
    },
    asked: () => asked,
  }
}

const withCounting = (catalog: CatalogService) =>
  Layer.mergeAll(Catalog.testLayer(catalog), Payloads.layer)

describe("addressing", () => {
  test("a path is a composed resolve: each hop opens the directory the last one named", () => {
    const walked = Effect.runSync(
      Effect.gen(function* () {
        const built = yield* tree()
        return {
          built,
          leaf: yield* at(built.root, "config", "model"),
          first: yield* at(built.root, "config"),
        }
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(walked.leaf).toBe(walked.built.model)
    expect(walked.first).toBe(walked.built.config)
  })

  test("the empty path is its root, and it reads nothing to say so", () => {
    const catalog = countingCatalog()
    const root = Digest.make("a".repeat(64))

    expect(
      Effect.runSync(at(root).pipe(Effect.provide(withCounting(catalog.service)))),
    ).toBe(root)
    expect(catalog.asked()).toBe(0)
  })

  test("the whole path is judged before any store is asked", () => {
    const catalog = countingCatalog()
    const refusal = Effect.runSync(
      at(Digest.make("a".repeat(64)), "config", "..").pipe(
        Effect.provide(withCounting(catalog.service)),
        Effect.flip,
      ),
    )

    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("invalid-petname")
    // The unlawful name is the SECOND segment, so a walk that judged one hop at
    // a time would have resolved the root before reaching it.
    expect(refusal.path).toEqual(["names", "1"])
    expect(catalog.asked()).toBe(0)
  })

  test("every name whose meaning depends on where the reader stands refuses", () => {
    const escapes = [".", "..", "a/b", "a\\b", "", `a${String.fromCharCode(10)}b`]
    for (const escape of escapes) {
      const refusal = Effect.runSync(Effect.flip(petname(escape)))
      expect(refusal.kind, escape).toBe("invalid-petname")
      expect(refusal.path, escape).toEqual(["petname"])
      expect(refusal.next.length, escape).toBeGreaterThan(0)
    }

    // A name is not a path: ordinary dots, hyphens, and spaces are literal.
    for (const name of ["model", "config.json", "my-name", "two words", "..."]) {
      const admitted: string = Effect.runSync(petname(name))
      expect(admitted, name).toBe(name)
    }
  })

  test("an unbound name is structural, not absence: under a fixed root it never moves", () => {
    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const built = yield* tree()
        return yield* Effect.flip(at(built.root, "config", "missing"))
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(refusal.kind).toBe("unbound-petname")
    expect(refusal.sort).toBe("structural")
    expect(refusal.path).toEqual(["names", "1"])
    expect(refusal.got).toBe("missing")
    // The whole reason it is not an absence: retrying re-reads the same
    // immutable directory, so nothing new could ever arrive.
    expect(isRetryable(refusal)).toBe(false)
  })

  test("a name bound twice resolves to neither, and the refusal carries both candidates", () => {
    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const left = yield* publishValue({ model: "one" })
        const right = yield* publishValue({ model: "two" })
        const root = yield* publishDirectory([
          binding("model", left),
          binding("model", right),
        ])
        return { refusal: yield* Effect.flip(at(root, "model")), left, right }
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(refusal.refusal.kind).toBe("ambiguous-binding")
    expect(refusal.refusal.sort).toBe("structural")
    expect(refusal.refusal.got).toEqual({
      name: "model",
      candidates: [refusal.left, refusal.right].sort(),
    })
    expect(isRetryable(refusal.refusal)).toBe(false)
  })

  test("the same binding twice is one binding, not an ambiguity", () => {
    const walked = Effect.runSync(
      Effect.gen(function* () {
        const model = yield* publishValue({ model: "opus" })
        const root = yield* publishDirectory([
          binding("model", model),
          binding("model", model),
        ])
        return { at: yield* at(root, "model"), model }
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(walked.at).toBe(walked.model)
  })

  test("a hop that lands on a value which is not a directory refuses there", () => {
    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const built = yield* tree()
        return yield* Effect.flip(at(built.root, "tool", "deeper"))
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(refusal.kind).toBe("not-a-directory")
    expect(refusal.sort).toBe("structural")
    // The refusal points at the name that produced the digest it could not open.
    expect(refusal.path).toEqual(["names", "0"])
    expect(refusal.next.length).toBeGreaterThan(0)
  })

  test("a root the store does not hold is the one head-relative fact on this path", () => {
    const refusal = Effect.runSync(
      at(Digest.make("b".repeat(64)), "config").pipe(
        Effect.provide(substrateLayer),
        Effect.flip,
      ),
    )

    expect(refusal.kind).toBe("cataloged-value-absent")
    expect(refusal.sort).toBe("absence")
    expect(isRetryable(refusal)).toBe(true)
  })

  test("verify-on-read is inherited: a lying catalog is refused mid-walk", () => {
    // No new machinery means no second verify door, and this is the row that
    // spends that: the store answers a walk's hop with a directory that does
    // not hash to the digest the hop asked for, and `Resolved.resolve` — the
    // one door under every hop — re-derives and refuses.
    const built = Effect.runSync(tree().pipe(Effect.provide(substrateLayer)))
    const wrong = Effect.runSync(directory([binding("model", built.tool)]))
    const lying: CatalogService = {
      get: () => Effect.succeed(Option.some(wire(wrong))),
      put: (value) => digestOf(value),
    }

    const refusal = Effect.runSync(
      at(built.root, "config", "model").pipe(
        Effect.provide(withCounting(lying)),
        Effect.flip,
      ),
    )

    expect(refusal.kind).toBe("digest-mismatch")
    expect(refusal.sort).toBe("structural")
    expect(refusal.expected).toBe(built.root)
  })
})

describe("the directory fold", () => {
  const digests = ["1", "2", "3"].map((character) => Digest.make(character.repeat(64)))
  const [alpha, beta, gamma] = digests as [Digest, Digest, Digest]
  const left = [binding("alpha", alpha), binding("beta", beta)]
  const right = [binding("beta", beta), binding("gamma", gamma)]

  const fold = (bindings: ReadonlyArray<Binding>): Directory =>
    Effect.runSync(directory(bindings))

  test("arrival order and multiplicity are erased before any byte is compared", () => {
    expect(fold([...left, ...right])).toEqual(fold([...right, ...left]))
    expect(fold([...left, ...left])).toEqual(fold(left))
    expect(fold([...left, ...fold(right).bindings])).toEqual(
      fold([...fold(left).bindings, ...right]),
    )
  })

  test("the folded value is the canonical set, so its digest names the set", () => {
    const one = Effect.runSync(digestOf(wire(fold([...left, ...right]))))
    const other = Effect.runSync(digestOf(wire(fold([...right, ...left, ...left]))))
    expect(one).toBe(other)
  })

  test("a listing folds what it read, whatever order it was published in", () => {
    const listed = Effect.runSync(
      Effect.gen(function* () {
        const bindings = [binding("beta", beta), binding("alpha", alpha)]
        // Published unfolded and out of canonical order, on purpose: two
        // digests, one binding set, and `list` answers the same for both.
        const scrambled = yield* publishValue(
          wire({ v: 0, kind: "directory", bindings: [...bindings, ...bindings] }),
        )
        const canonical = yield* publishDirectory(bindings)
        expect(scrambled).not.toBe(canonical)
        return {
          scrambled: yield* list(scrambled),
          canonical: yield* list(canonical),
        }
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(listed.scrambled).toEqual(listed.canonical)
    expect(listed.canonical).toEqual(fold([binding("alpha", alpha), binding("beta", beta)]).bindings)
  })

  test("a listing reads through a path and refuses when the path names no directory", () => {
    const outcome = Effect.runSync(
      Effect.gen(function* () {
        const built = yield* tree()
        return {
          nested: yield* list(built.root, "config"),
          refusal: yield* Effect.flip(list(built.root, "tool")),
          model: built.model,
        }
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(outcome.nested).toEqual([binding("model", outcome.model)])
    expect(outcome.refusal.kind).toBe("not-a-directory")
    expect(outcome.refusal.path).toEqual(["names", "0"])
  })
})
