import { describe, expect, test } from "bun:test"
import { resolve as resolvePath } from "node:path"

import { Effect, Layer, Option, Schema } from "effect"

import {
  Binding,
  Directory,
  Petname,
  at,
  directory,
  list,
  petname,
} from "../src/planes/Address.js"
import { KernelPetname } from "../src/kernel/KernelSchemas.generated.js"
import type { WireValue } from "../src/truth/Canonical.js"
import { Catalog, Payloads, substrateLayer, type CatalogService } from "../src/planes/Catalog.js"
import { Digest, digestOf } from "../src/truth/Digest.js"
import { isRetryable } from "../src/truth/Refusal.js"
import { publish } from "../src/planes/Resolved.js"

/** The model's own emitted vectors — the authority for what this module names. */
const corpus = resolvePath(import.meta.dir, "../fixtures/fabric-conformance.ndjson")

interface ModelRow {
  readonly kind: string
  readonly name: string
  readonly verdict: { readonly refusal?: string }
}

const wire = (value: Directory): WireValue => value as unknown as WireValue

const binding = (name: string, digest: Digest): Binding => ({
  name: Petname.make({ text: name }),
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
      // The carrier is the generated `KernelPetname`, so an admitted name IS
      // the model's shape and not a second one this module invented.
      const admitted = Effect.runSync(petname(name))
      expect(admitted.text, name).toBe(name)
      expect(Object.keys(admitted), name).toEqual(["text"])
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
    //
    // The store lies only AFTER a hop it answered truthfully, which is the
    // whole point: a catalog that lies at the root would prove nothing about
    // hops, because the walk would end before taking one. Here the root opens,
    // `config` resolves to a digest, and the SECOND resolve is the one that
    // gets a value which does not hash to what it asked for.
    const built = Effect.runSync(tree().pipe(Effect.provide(substrateLayer)))
    const honest = Effect.runSync(
      Effect.gen(function* () {
        const root = yield* directory([
          binding("config", built.config),
          binding("tool", built.tool),
        ])
        return wire(root)
      }),
    )
    const wrong = wire(Effect.runSync(directory([binding("model", built.tool)])))
    let asked = 0
    const lying: CatalogService = {
      get: (digest) => {
        asked++
        return Effect.succeed(Option.some(digest === built.root ? honest : wrong))
      },
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
    // The refusal is about the SECOND hop's digest, not the root's, so a hop
    // after a successful hop is what verified here.
    expect(refusal.expected).toBe(built.config)
    expect(refusal.expected).not.toBe(built.root)
    expect(asked).toBe(2)
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

  test("canonical order is RFC 8785 BYTE order, which is not UTF-16 order", () => {
    // The two disagree exactly outside the BMP: a surrogate pair sorts BELOW
    // U+E000-U+FFFF as UTF-16 code units and ABOVE them as UTF-8 bytes. The
    // documented sentence — and any directory fold written elsewhere to it —
    // says bytes, so this pins bytes. Both bindings carry the same digest, so
    // the canonical key's leading `digest` member cannot decide the order and
    // the name is what is compared.
    const astral = "\u{1D11E}"
    const bmp = ""
    expect(astral < bmp).toBe(true) // UTF-16 order, the one NOT used

    const folded = fold([binding(astral, alpha), binding(bmp, alpha)])
    expect(folded.bindings.map((entry) => entry.name.text)).toEqual([bmp, astral])
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

describe("what this module takes from the corpus rather than coining", () => {
  test("a directory whose bindings do not decode is not `not-a-directory`", () => {
    // The value IS a directory — closed header, bindings array — carrying one
    // binding whose name breaks the petname law. Answering `not-a-directory`
    // here teaches "publish a directory under this digest" for a digest that
    // already holds one, so the schema's own refusal flies instead, naming the
    // field that failed.
    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const leaf = yield* publishValue({ model: "opus" })
        const root = yield* publishValue(
          { v: 0, kind: "directory", bindings: [{ name: { text: ".." }, digest: leaf }] } as
            unknown as WireValue,
        )
        return yield* Effect.flip(list(root))
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(refusal.kind).not.toBe("not-a-directory")
    expect(refusal.kind).toBe("malformed-value")
    // The diagnosis names the refused field and the law it broke, which is the
    // whole reason this case does not wear the navigational kind.
    expect(String(refusal.got)).toContain("one literal petname")
    expect(String(refusal.got)).toContain("name")
  })

  test("`ambiguous-binding` is the model's spelling, read from the corpus", async () => {
    // Law 1: a reason the corpus already names is not this package's to coin.
    // The model emits this one on the F12 across-bind-orders row, so the wall
    // is a comparison and not a second opinion — a rename in `verify/fabric`
    // reds here rather than leaving two spellings of one reason in the estate.
    const lines = (await Bun.file(corpus).text()).trimEnd().split("\n")
    const rows = lines.slice(1).map((line) => JSON.parse(line) as ModelRow)
    const ambiguous = rows.filter(
      (row) => row.kind === "F12" && row.name === "ambiguous-across-bind-orders",
    )

    // Exactly one, so a corpus that dropped the row reds instead of vacuously
    // passing over an empty filter.
    expect(ambiguous).toHaveLength(1)
    const emitted = ambiguous[0]!.verdict.refusal
    // A row that stopped carrying a refusal name is a moved corpus, not a pass.
    if (emitted === undefined) throw new Error("the F12 ambiguity row names no refusal")

    const refusal = Effect.runSync(
      Effect.gen(function* () {
        const left = yield* publishValue({ model: "one" })
        const right = yield* publishValue({ model: "two" })
        const root = yield* publishDirectory([
          binding("model", left),
          binding("model", right),
        ])
        return yield* Effect.flip(at(root, "model"))
      }).pipe(Effect.provide(substrateLayer)),
    )

    expect(refusal.kind).toBe(emitted)
  })

  test("`Petname` carries the generated projection, not a second definition", () => {
    // The carrier is `KernelPetname` and the brand rides on it, so a value this
    // module admits decodes against the generated schema unchanged. Two
    // carriers for one concept is the Law 1 defect this asserts the absence of.
    // `decodeSync`, not `decodeUnknownSync`: the compiler has to accept an
    // admitted petname as the generated schema's Encoded type, which is half
    // the claim and the half a runtime assertion cannot make.
    const admitted = Effect.runSync(petname("model"))
    expect(Schema.decodeSync(KernelPetname)(admitted)).toEqual({ text: "model" })
  })
})
