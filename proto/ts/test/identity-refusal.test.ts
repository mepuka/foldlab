import { expect, test } from "bun:test"

import vector from "../../../go/canonical/probes/cg1-vector.json"
import { entryDigest, foldChain, GENESIS, InvalidUnicodeError } from "../src/jcs.ts"

test("the shared chain-identity vector refuses outside the Unicode scalar domain", () => {
  expect(() =>
    entryDigest({ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate }),
  ).toThrow(InvalidUnicodeError)
  expect(() =>
    entryDigest({ seq: 0, prev: vector.tsLoneSurrogate, payload: "valid" }),
  ).toThrow(InvalidUnicodeError)
  expect(() =>
    entryDigest({ seq: 0, prev: GENESIS, payload: "\udc00" }),
  ).toThrow(InvalidUnicodeError)
  expect(() =>
    entryDigest({ seq: 0, prev: GENESIS, payload: "paired 🚀 scalar" }),
  ).not.toThrow()
  expect(
    foldChain([{ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate }]),
  ).toEqual({ ok: false, seq: 0, reason: "payload is not valid Unicode" })
})
