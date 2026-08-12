/**
 * The fence's law suite. What is checked, in the order an attacker would
 * probe it: a mint anchors and resolves; annotations never move identity
 * (claims are not facts); a digest that was never minted refuses, typed —
 * an LLM cannot hallucinate a digest that resolves; impure and
 * nondeterministic transforms refuse with the law that caught them;
 * composition happens only through handles, forged handles die before any
 * law runs, and every anchor is recomputable by an auditor from the
 * digests alone.
 */

import { describe, expect, test } from "bun:test"
import { Effect, Schema } from "effect"
import {
  makeRegistry,
  mintAnchor,
  MintRefused,
  probeCorpus,
  structuralDigest,
  UnknownDigest,
  type Handle,
} from "../src/mint.ts"
import { WireEvent } from "../src/schema.ts"
import { headFrom, streamSeed, type StreamEvent } from "../src/stream.ts"
import { apply, compose, filterKeyPrefix, mapValueUpper, renameStream } from "../src/xform.ts"

const digestOf = (s: Schema.Top) => Effect.runSync(structuralDigest(s))

describe("the fence: mint + registry", () => {
  test("a mint anchors: handle, schema, and xform digests all resolve", () => {
    const reg = makeRegistry()
    const h = Effect.runSync(reg.mint(WireEvent, { id: "filterKeyPrefix", params: "a" }, filterKeyPrefix("a")))
    expect(Effect.runSync(reg.resolve(h.digest)).kind).toBe("mint")
    expect(Effect.runSync(reg.resolve(h.schemaDigest)).kind).toBe("schema")
    expect(Effect.runSync(reg.resolve(h.xformDigest)).kind).toBe("xform")
    expect(Effect.runSync(reg.resolve(h.digest)).refs).toContain(h.schemaDigest)
  })

  test("annotations are claims, not identity: they never move the structural digest", () => {
    const plain = Schema.Struct({ stream: Schema.String, seq: Schema.Number })
    const annotated = plain.annotate({
      title: "wire event",
      description: "claimed, not committed",
      "x-nats-subject": "events.>",
    } as never)
    expect(digestOf(annotated)).toBe(digestOf(plain))
    const different = Schema.Struct({ stream: Schema.String, seq: Schema.String })
    expect(digestOf(different)).not.toBe(digestOf(plain))
  })

  test("an unminted digest refuses, typed — nothing resolves that was not committed", () => {
    const reg = makeRegistry()
    const err = Effect.runSync(Effect.flip(reg.resolve("ab".repeat(32))))
    expect(err).toBeInstanceOf(UnknownDigest)
  })

  test("an impure transform refuses at the purity law", () => {
    const reg = makeRegistry()
    const mutator = (e: StreamEvent) => {
      e.payload[0] = 88 // writes into the event it was handed
      return e
    }
    const err = Effect.runSync(Effect.flip(reg.mint(WireEvent, { id: "evil" }, mutator)))
    expect(err).toBeInstanceOf(MintRefused)
    expect((err as MintRefused).law).toBe("purity")
  })

  test("a nondeterministic transform refuses at the determinism law", () => {
    const reg = makeRegistry()
    const enc = new TextEncoder()
    let n = 0
    const flaky = (e: StreamEvent) => ({ ...e, payload: enc.encode(`x=${n++}`) })
    const err = Effect.runSync(Effect.flip(reg.mint(WireEvent, { id: "flaky" }, flaky)))
    expect(err).toBeInstanceOf(MintRefused)
    expect((err as MintRefused).law).toBe("determinism")
  })

  test("composition is by handle, the composed mint behaves as the fused pipeline, and the anchor is auditable", () => {
    const reg = makeRegistry()
    const a = Effect.runSync(reg.mint(WireEvent, { id: "renameStream", params: "z" }, renameStream("z")))
    const b = Effect.runSync(reg.mint(WireEvent, { id: "filterKeyPrefix", params: "a" }, filterKeyPrefix("a")))
    const c = Effect.runSync(reg.mint(WireEvent, { id: "mapValueUpper" }, mapValueUpper()))
    const composed = Effect.runSync(reg.composeMint([a, b, c]))

    // behavior: the minted composition IS the fused pipeline, witnessed by head
    const probe = probeCorpus()
    const seed = streamSeed("mint.witness")
    expect(headFrom(seed, apply(composed.xform, probe))).toBe(
      headFrom(seed, apply(compose(renameStream("z"), filterKeyPrefix("a"), mapValueUpper()), probe)),
    )
    // the ledger commits to the children
    const record = Effect.runSync(reg.resolve(composed.digest))
    for (const child of [a, b, c]) expect(record.refs).toContain(child.digest)
    // the anchor is recomputable by an auditor from the digests alone
    expect(mintAnchor(composed.schemaDigest, composed.xformDigest)).toBe(composed.digest)
  })

  test("a forged handle refuses before any law runs", () => {
    const reg = makeRegistry()
    const real = Effect.runSync(reg.mint(WireEvent, { id: "mapValueUpper" }, mapValueUpper()))
    const forged: Handle = { ...real, digest: "ef".repeat(32) }
    const err = Effect.runSync(Effect.flip(reg.composeMint([real, forged])))
    expect(err).toBeInstanceOf(UnknownDigest)
  })

  test("the seed roots the commitment: same transform under two seeds is two commitments", () => {
    const reg = makeRegistry()
    const under = (seed?: string) =>
      Effect.runSync(
        reg.mint(WireEvent, { id: "filterKeyPrefix", params: "a" }, filterKeyPrefix("a"),
          seed === undefined ? undefined : { seed: streamSeed(seed) }),
      )
    const dflt = under(undefined)
    const tenantA = under("tenant:a")
    const tenantB = under("tenant:b")
    expect(tenantA.xformDigest).not.toBe(tenantB.xformDigest)
    expect(tenantA.xformDigest).not.toBe(dflt.xformDigest)
    // identity of the TYPE is untouched by where behavior was committed
    expect(tenantA.schemaDigest).toBe(tenantB.schemaDigest)
    // and every variant resolves independently
    for (const h of [dflt, tenantA, tenantB]) {
      expect(Effect.runSync(reg.resolve(h.digest)).kind).toBe("mint")
    }
  })
})
