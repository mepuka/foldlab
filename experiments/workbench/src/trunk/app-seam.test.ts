/**
 * S3b BATTERY — the Lane-A seam over real sockets (L-S1..L-S5).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * The stub is a real `node:http` listener (fixtures/app-harness.ts);
 * the daemon itself is §7 BB-8's territory. Red at COLLECTION today
 * because `./app.ts` does not exist. Read-only to the implementer.
 */
import { Effect } from "effect"
import { expect, test } from "vitest"

import { BODY_PREVIEW_MAX, HistorySeam, makeHttpSeam, type PullRefusal } from "./app.ts"
import { foldDocument } from "./fold.ts"
import { emptyModel, totalCount } from "./model.ts"
import { deadBase, startStub, type StubAnswer } from "./fixtures/app-harness.ts"

const pullFrom = (base: string, since: number): Promise<unknown> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const seam = yield* HistorySeam
      return yield* seam.pull(since)
    }).pipe(Effect.provide(makeHttpSeam(base))),
  )

const pullRefusal = (base: string, since: number): Promise<PullRefusal> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const seam = yield* HistorySeam
      return yield* Effect.flip(seam.pull(since))
    }).pipe(Effect.provide(makeHttpSeam(base))),
  )

const loadFrom = (
  base: string,
  address: string,
): Promise<{ readonly hex: string; readonly size: number }> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const seam = yield* HistorySeam
      return yield* seam.load(address)
    }).pipe(Effect.provide(makeHttpSeam(base))),
  )

const page = (status: number, body: string, contentType?: string): StubAnswer =>
  contentType === undefined ? { status, body } : { status, body, contentType }

// ---------------------------------------------------------------- L-S1

test("pull asks exactly GET /history?since=<mark> and nothing else", async () => {
  const stub = await startStub(() => page(200, JSON.stringify({ next: 7, word: [] })))
  try {
    await pullFrom(stub.base, 7)
    expect(stub.requests).toHaveLength(1)
    const request = stub.requests[0]
    expect(request?.method).toBe("GET")
    expect(request?.url, "the canonical decimal, since alone").toBe("/history?since=7")
    expect(request?.headers["if-none-match"], "no validator courting (S1 L-A14)").toBeUndefined()
    expect(request?.headers["if-modified-since"]).toBeUndefined()
  } finally {
    await stub.close()
  }
})

// ---------------------------------------------------------------- L-S2

test("a 200 page arrives as the body, undecoded — the seam holds no schema opinion", async () => {
  const garbage = { next: "not-a-number", word: 42, hasMore: true }
  const stub = await startStub(() => page(200, JSON.stringify(garbage)))
  try {
    const answer = await pullFrom(stub.base, 0)
    expect(answer, "reshaping is the door's job, not the seam's").toStrictEqual(garbage)
  } finally {
    await stub.close()
  }
})

test("404 is NoRoute", async () => {
  const stub = await startStub(() => page(404, JSON.stringify({ refused: true })))
  try {
    expect((await pullRefusal(stub.base, 0))._tag).toBe("NoRoute")
  } finally {
    await stub.close()
  }
})

test("403 is Forbidden", async () => {
  const stub = await startStub(() => page(403, JSON.stringify({ refused: true })))
  try {
    expect((await pullRefusal(stub.base, 0))._tag).toBe("Forbidden")
  } finally {
    await stub.close()
  }
})

test("another status is Status, with the number kept", async () => {
  const stub = await startStub(() => page(503, "busy", "text/plain"))
  try {
    const refusal = await pullRefusal(stub.base, 0)
    expect(refusal._tag).toBe("Status")
    expect(refusal._tag === "Status" ? refusal.status : -1).toBe(503)
  } finally {
    await stub.close()
  }
})

test("an unreachable daemon is Unreachable", async () => {
  const base = await deadBase()
  const refusal = await pullRefusal(base, 0)
  expect(refusal._tag).toBe("Unreachable")
})

test("a 200 that is not JSON answers the raw text for the door to refuse", async () => {
  const stub = await startStub(() => page(200, "<!doctype html><p>proxy page</p>", "text/html"))
  try {
    const answer = await pullFrom(stub.base, 0)
    expect(answer).toBe("<!doctype html><p>proxy page</p>")
    const folded = foldDocument(emptyModel, answer)
    expect(folded.status._tag, "one authority refuses it").toBe("Refused")
  } finally {
    await stub.close()
  }
})

// ---------------------------------------------------------------- L-S3

test("the zero store's page is an answer, not an error", async () => {
  const stub = await startStub(() => page(200, JSON.stringify({ next: 0, word: [] })))
  try {
    const answer = await pullFrom(stub.base, 0)
    const folded = foldDocument(emptyModel, answer)
    expect(folded.status._tag).toBe("Live")
    expect(folded.mark).toBe(0)
    expect(totalCount(folded)).toBe(0)
  } finally {
    await stub.close()
  }
})

// ---------------------------------------------------------------- L-S4

test("load answers a bounded hex preview with the true size", async () => {
  const address = "ab".repeat(32)
  const big = "x".repeat(BODY_PREVIEW_MAX + 1000)
  const stub = await startStub((request) =>
    request.url === `/cas/${address}`
      ? page(200, big, "application/octet-stream")
      : page(404, "missing"),
  )
  try {
    const preview = await loadFrom(stub.base, address)
    expect(preview.size, "the true size, not the truncated one").toBe(big.length)
    expect(preview.hex.length).toBeLessThanOrEqual(BODY_PREVIEW_MAX * 2)
    expect(preview.hex.startsWith("78".repeat(8)), "lowercase hex of the bytes").toBe(true)
    expect(/^[0-9a-f]*$/u.test(preview.hex)).toBe(true)
  } finally {
    await stub.close()
  }
})

// ---------------------------------------------------------------- L-S5

test("two pulls are identical and stateless", async () => {
  const body = JSON.stringify({ next: 3, word: [] })
  const stub = await startStub(() => page(200, body))
  try {
    const first = await pullFrom(stub.base, 3)
    const second = await pullFrom(stub.base, 3)
    expect(second).toStrictEqual(first)
    expect(stub.requests.map((request) => request.url)).toStrictEqual([
      "/history?since=3",
      "/history?since=3",
    ])
    expect(stub.requests[1]?.headers["cookie"], "no state grows on the client").toBeUndefined()
    expect(stub.requests[1]?.headers["if-none-match"]).toBeUndefined()
  } finally {
    await stub.close()
  }
})
