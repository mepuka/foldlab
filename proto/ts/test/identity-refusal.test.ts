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
