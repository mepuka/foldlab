import { expect, test } from "bun:test"

import vector from "../../../go/canonical/probes/cg1-vector.json"
import { entryDigest, foldChain, GENESIS } from "../src/jcs.ts"

test("the shared chain-identity vector refuses outside the Unicode scalar domain", () => {
  expect(entryDigest({ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate })).toEqual({
    ok: false,
    refusal: { _tag: "InvalidUnicode", field: "payload", reason: "payload is not valid Unicode" },
  })
  expect(entryDigest({ seq: 0, prev: vector.tsLoneSurrogate, payload: "valid" })).toEqual({
    ok: false,
    refusal: { _tag: "InvalidUnicode", field: "prev", reason: "prev is not valid Unicode" },
  })
  expect(entryDigest({ seq: 0, prev: GENESIS, payload: "\udc00" })).toEqual({
    ok: false,
    refusal: { _tag: "InvalidUnicode", field: "payload", reason: "payload is not valid Unicode" },
  })
  expect(entryDigest({ seq: 0, prev: GENESIS, payload: "paired 🚀 scalar" })).toMatchObject({ ok: true })
  expect(
    foldChain([{ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate }]),
  ).toEqual({ ok: false, seq: 0, reason: "payload is not valid Unicode" })
})

test("chain identity refuses every runtime sequence outside the safe unsigned domain as data", () => {
  const invalid = [
    ...vector.invalidSequence,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0,
    -0.5,
    0.5,
    "0" as unknown as number,
    null as unknown as number,
    0n as unknown as number,
    {} as unknown as number,
    [] as unknown as number,
  ]
  for (const seq of invalid) {
    expect(() => entryDigest({ seq, prev: GENESIS, payload: "valid" })).not.toThrow()
    expect(entryDigest({ seq, prev: GENESIS, payload: "valid" })).toEqual({
      ok: false,
      refusal: {
        _tag: "InvalidSequence",
        seq,
        reason: "seq is not a safe unsigned integer",
      },
    })
    expect(() => foldChain([{ seq, prev: GENESIS, payload: "valid" }])).not.toThrow()
    expect(foldChain([{ seq, prev: GENESIS, payload: "valid" }])).toEqual({
      ok: false,
      seq,
      reason: "seq is not a safe unsigned integer",
    })
  }
  for (const seq of vector.validSequenceBoundary) {
    expect(entryDigest({ seq, prev: GENESIS, payload: "valid" })).toMatchObject({ ok: true })
  }
})

test("chain identity returns Unicode refusal data for non-string runtime field costumes", () => {
  for (const [field, value] of [["payload", null], ["prev", {}]] as const) {
    const entry = {
      seq: 0,
      prev: field === "prev" ? value as unknown as string : GENESIS,
      payload: field === "payload" ? value as unknown as string : "valid",
    }
    expect(() => entryDigest(entry)).not.toThrow()
    expect(entryDigest(entry)).toEqual({
      ok: false,
      refusal: { _tag: "InvalidUnicode", field, reason: `${field} is not valid Unicode` },
    })
  }
})
