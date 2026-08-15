import { expect, test } from "bun:test"
import { Result, Schema } from "effect"
import vector from "../../wire/refusal-sorts.json"
import { canonicalize } from "../src/jcs.ts"
import {
  DAEMON_REFUSAL_SORTS,
  RefusalReply,
  REFUSAL_SORT_GRAMMAR,
  REFUSAL_SORT_GRAMMAR_DIGEST,
  refusalSortOf,
  type DaemonRefusalKind,
  type RefusalSort,
} from "../src/wire.ts"

test("the TS refusal sorts match the shared combined-grammar vector", () => {
  const expected = new Map(
    Object.entries(vector.sortByKind) as Array<[DaemonRefusalKind, RefusalSort]>,
  )

  expect(Object.keys(DAEMON_REFUSAL_SORTS).length).toBe(14)
  expect(expected.size).toBe(14)
  for (const [kind, sort] of expected) {
    expect(refusalSortOf(kind)).toBe(sort)
    expect(DAEMON_REFUSAL_SORTS[kind]).toBe(sort)
  }
  expect(refusalSortOf("unreachable")).toBeUndefined()
})

test("absence is excluded from every future refusal corpus", () => {
  const corpusKinds = Object.entries(DAEMON_REFUSAL_SORTS)
    .filter(([, sort]) => sort === "structural")
    .map(([kind]) => kind)
  const structural = Object.entries(vector.sortByKind)
    .filter(([, sort]) => sort === "structural")
    .map(([kind]) => kind)
  const absence = Object.entries(vector.sortByKind)
    .filter(([, sort]) => sort === "absence")
    .map(([kind]) => kind)
  expect(corpusKinds.sort()).toEqual(structural.sort())
  for (const kind of absence) expect(corpusKinds).not.toContain(kind)
})

test("the kind-to-sort table is pinned by the grammar digest", () => {
  const canonical = canonicalize({
    grammar: vector.grammar,
    sortByKind: vector.sortByKind,
  })
  expect(canonical.ok).toBe(true)
  if (!canonical.ok) throw new Error(canonical.refusal.reason)
  const digest = new Bun.CryptoHasher("sha256").update(canonical.bytes).digest("hex")
  expect(vector.grammar).toBe(REFUSAL_SORT_GRAMMAR)
  expect(vector.grammarDigest).toBe(REFUSAL_SORT_GRAMMAR_DIGEST)
  expect(digest).toBe(vector.grammarDigest)
})

test("daemon refusal sort is required and survives decode/encode", () => {
  const reply = {
    ok: false as const,
    refusal: {
      kind: "unknown-identity",
      sort: "absence" as const,
      law: "create before publish",
      next: [],
      local: false as const,
    },
  }
  const decoded = Schema.decodeUnknownResult(RefusalReply)(reply)
  expect(Result.isSuccess(decoded)).toBe(true)
  if (Result.isFailure(decoded)) return

  const encoded = Schema.encodeUnknownResult(RefusalReply)(decoded.success)
  expect(Result.isSuccess(encoded)).toBe(true)
  if (Result.isFailure(encoded)) return
  expect(encoded.success).toEqual(reply)

  const withoutSort = {
    ...reply,
    refusal: { ...reply.refusal, sort: undefined },
  }
  expect(Result.isFailure(Schema.decodeUnknownResult(RefusalReply)(withoutSort))).toBe(true)
})
