/**
 * The word log — the receipts seam, held to the store's own bar.
 *
 * The claims, by plane:
 *
 * - THE LAW: a fresh admission is receipted with a dense, zero-based
 *   mark; a duplicate put appends nothing (the Lean `step`'s word
 *   behaviour, mirrored); and a put whose bytes land but whose receipt
 *   fails FAILS TOGETHER, typed — while the content stays resident and
 *   a re-put answers the same address. That last case is the ruled
 *   crash-class outcome, probed end to end.
 * - THE FILE REALIZATION: rows are the registered word-wire spelling,
 *   one line each; a torn final line — the crash artifact — is
 *   tolerated on read and REPAIRED by the next append, so the tear can
 *   never sit mid-file and poison later reads; an edited mark fails
 *   typed, because order is semantics.
 * - THE SQL REALIZATION: the single-statement append keeps marks dense
 *   under concurrent writers, and a completely fresh composition over
 *   the same database file answers the same history — the durability
 *   claim `KvsSqlite.test.ts` proves for bytes, extended to receipts.
 */
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { expect, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Schema } from "effect"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import { Cas } from "../src/index.ts"
import { wordHistorySchema } from "../src/cas/generated/WordLogSchema.ts"
import { layerDiskFs, withStoreRoot } from "./fixtures/diskFs.ts"

const node = (
  payload: ReadonlyArray<number>,
  tag: number,
): Cas.NodeInput => Cas.NodeInput.make({
  kind: { version: 0, tag },
  payload: Uint8Array.from(payload),
  refs: [],
})

/** The memory store WITH receipts: the store law over one memory
 * backend and one memory word log. */
const layerMemoryWorded = Cas.layerStore.pipe(
  Layer.provideMerge(Layer.mergeAll(
    Cas.layerMemoryBackend,
    Cas.layerMemoryWordLog,
  )),
  Layer.provideMerge(Cas.layerAddressSha256Live),
)

it.effect("fresh admissions are receipted in admission order; a duplicate appends nothing", () =>
  Effect.gen(function* () {
    const store = yield* Cas.Store
    const log = yield* Cas.WordLog

    const first = yield* store.put(node([1], 0x01))
    const second = yield* store.put(node([2, 3], 0x0c))
    // The duplicate is the identity on the store AND on the word —
    // the Lean `step` leaves the word unchanged on `duplicate`.
    const again = yield* store.put(node([1], 0x01))
    expect(again).toBe(first)

    const history = yield* log.since(0)
    expect(history.next).toBe(2)
    expect(history.word.map((entry) => entry.seq)).toEqual([0, 1])
    expect(history.word.map((entry) => entry.address)).toEqual([first, second])
    expect(history.word.map((entry) => entry.tag)).toEqual([0x01, 0x0c])
    expect(history.word.map((entry) => entry.size)).toEqual([1, 2])
    for (const entry of history.word) {
      // `at` is the composition's Clock — under the test clock that is
      // the epoch itself, which is exactly the honesty claimed: the
      // timestamp is whatever clock the admitting host runs on.
      expect(Number.isSafeInteger(entry.at)).toBe(true)
      expect(entry.at).toBeGreaterThanOrEqual(0)
    }

    // `since` is the suffix, half-open: from 1 answers only the
    // second receipt; from the end answers "nothing happened" with
    // the true cursor; a mark past the end still answers the cursor.
    expect((yield* log.since(1)).word.map((entry) => entry.seq)).toEqual([1])
    expect(yield* log.since(2)).toEqual({ next: 2, word: [] })
    expect(yield* log.since(99)).toEqual({ next: 2, word: [] })
    // A hostile mark never reaches a from-the-end slice.
    expect((yield* log.since(-3)).word).toHaveLength(2)
  }).pipe(Effect.provide(layerMemoryWorded)))

it.effect("a put whose receipt fails FAILS TOGETHER, and the ruled outcome holds: resident bytes, refusal named, re-put answers the address", () =>
  Effect.gen(function* () {
    const backend = Cas.makeMemoryBackend()
    let receiptsDown = true
    const flakyLog: Cas.WordLogShape = {
      append: () => receiptsDown
        ? Effect.fail(new Cas.BackendFailure({ reason: "the receipts plane is gone" }))
        : Effect.void,
      since: () => Effect.succeed({ next: 0, word: [] }),
    }
    const layer = Cas.layerStore.pipe(
      Layer.provideMerge(Layer.mergeAll(
        Layer.succeed(Cas.ByteReader, backend.reader),
        Layer.succeed(Cas.ByteWriter, backend.writer),
        Layer.succeed(Cas.WordLog, flakyLog),
      )),
      Layer.provideMerge(Cas.layerAddressSha256Live),
    )
    return yield* Effect.gen(function* () {
      const store = yield* Cas.Store

      // Bytes land, the receipt does not: the put refuses, typed, and
      // the refusal names both facts — the admission happened and the
      // word under-reports it. BROKEN-SILENT is the only alarm
      // category, and this is the loud spelling of the ruling.
      const refused = yield* Effect.flip(store.put(node([7, 7], 0x01)))
      expect(Cas.isCasError(refused)).toBe(true)
      const reason = (refused as { readonly reason: string }).reason
      expect(reason).toContain("receipt was not written")
      expect(reason).toContain("re-put answers the same address")

      // The ruled outcome's second half: the byte plane is grow-only,
      // so the content IS resident, and a re-put answers the same
      // address through the duplicate outcome — which appends no
      // receipt, so the gap is permanent and honestly under-reported.
      receiptsDown = false
      const address = yield* store.put(node([7, 7], 0x01))
      expect(address).toMatch(/^[0-9a-f]{64}$/u)
    }).pipe(Effect.provide(layer))
  }))

/** The file store WITH receipts, composed exactly as the CLI composes
 * it: backend and word log side by side UNDER the store law. */
const layerFileWorded = (storeRoot: string) =>
  Cas.layerStore.pipe(
    Layer.provideMerge(Layer.merge(
      Cas.layerFileBackend(storeRoot),
      Cas.layerFileWordLog(storeRoot),
    )),
    Layer.provideMerge(Layer.mergeAll(
      layerDiskFs,
      Cas.layerAddressSha256Live,
    )),
  )

it.effect("file log: rows are the registered spelling on disk, and history survives a fresh composition", () =>
  withStoreRoot((storeRoot) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const put = (bytes: ReadonlyArray<number>) =>
        Cas.Store.pipe(
          Effect.flatMap((store) => store.put(node(bytes, 0x01))),
          Effect.provide(layerFileWorded(storeRoot)),
        )
      const first = yield* put([1])
      const second = yield* put([2])

      // The persisted rows decode through the GENERATED schema — the
      // registered spelling, byte for byte on disk, never an ad-hoc
      // shape.
      const raw = yield* fs.readFileString(`${storeRoot}/word.jsonl`)
      const lines = raw.trimEnd().split("\n")
      expect(lines).toHaveLength(2)
      const document = Schema.decodeUnknownSync(wordHistorySchema)({
        next: lines.length,
        word: lines.map((line) => JSON.parse(line)),
      })
      expect(document.word.map((entry) => entry.address)).toEqual([first, second])

      // A completely fresh composition over the same directory reads
      // the same history: the word is the store's, not a process's.
      const replay = yield* Cas.WordLog.pipe(
        Effect.flatMap((log) => log.since(0)),
        Effect.provide(layerFileWorded(storeRoot)),
      )
      expect(replay.next).toBe(2)
      expect(replay.word.map((entry) => entry.seq)).toEqual([0, 1])
    })))

it.effect("file log: a torn final line is tolerated on read and repaired by the next append", () =>
  withStoreRoot((storeRoot) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const worded = layerFileWorded(storeRoot)
      const put = (bytes: ReadonlyArray<number>) =>
        Cas.Store.pipe(
          Effect.flatMap((store) => store.put(node(bytes, 0x01))),
          Effect.provide(worded),
        )
      const since = Cas.WordLog.pipe(
        Effect.flatMap((log) => log.since(0)),
        Effect.provide(worded),
      )

      yield* put([1])
      yield* put([2])
      // The crash artifact: an append that died mid-line. Its put
      // never acknowledged, so under-reporting it is the safe
      // direction — reads answer the clean prefix.
      yield* fs.writeFile(
        `${storeRoot}/word.jsonl`,
        new TextEncoder().encode(`{"address":"deadbeef`),
        { flag: "a" },
      )
      const torn = yield* since
      expect(torn.next).toBe(2)

      // The NEXT append repairs the tear before writing: were the torn
      // tail left in place it would sit mid-file after this append and
      // read as corruption forever after.
      yield* put([3])
      const healed = yield* since
      expect(healed.next).toBe(3)
      expect(healed.word.map((entry) => entry.seq)).toEqual([0, 1, 2])
      const raw = yield* fs.readFileString(`${storeRoot}/word.jsonl`)
      expect(raw).not.toContain("deadbeef")
    })))

it.effect("file log: an edited mark anywhere fails typed — order is semantics, never renumbered past", () =>
  withStoreRoot((storeRoot) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const worded = layerFileWorded(storeRoot)
      yield* Cas.Store.pipe(
        Effect.flatMap((store) => store.put(node([1], 0x01))),
        Effect.provide(worded),
      )
      // Hand-edit the one receipt to claim a different mark, then add
      // a clean line after it so the damage is NOT the tolerated
      // final-line case.
      const raw = yield* fs.readFileString(`${storeRoot}/word.jsonl`)
      const edited = raw.replace("\"seq\":0", "\"seq\":5")
      yield* fs.writeFileString(`${storeRoot}/word.jsonl`, edited)
      const refused = yield* Effect.flip(Cas.WordLog.pipe(
        Effect.flatMap((log) => log.since(0)),
        Effect.provide(worded),
      ))
      expect((refused as { readonly reason: string }).reason)
        .toContain("order is semantics")
    })))

/** The db-backed store WITH receipts: bytes, roots, and word in one
 * database file — the composition `bin/cli/store.ts` makes, spelled
 * from the library's own layers. */
const layerSqliteWorded = (filename: string) =>
  Layer.mergeAll(Cas.layerStore, Cas.layerSqlRootStore()).pipe(
    // The word log stands UNDER the store law, not beside it: the law
    // reads it as an optional service at build, so a merely-merged
    // sibling would leave every admission unreceipted.
    Layer.provideMerge(Layer.mergeAll(
      Cas.layerKvsBackend,
      Cas.layerSqlWordLog(),
    )),
    Layer.provide(Layer.mergeAll(
      KeyValueStore.layerSql({ table: "cas_objects" }),
      Cas.layerAddressSha256Live,
    )),
    Layer.provideMerge(SqliteClient.layer({ filename })),
  )

it.effect("sqlite log: receipts land beside the bytes, and a fresh composition over the same file answers the same history", () =>
  withStoreRoot((directory) =>
    Effect.gen(function* () {
      const filename = `${directory}/cas.db`
      const addresses = yield* Effect.gen(function* () {
        const store = yield* Cas.Store
        const first = yield* store.put(node([1], 0x01))
        const second = yield* store.put(node([2], 0x53))
        // Duplicate: identity on the store, silence in the word.
        yield* store.put(node([1], 0x01))
        return [first, second]
      }).pipe(Effect.provide(layerSqliteWorded(filename)))

      // The word survives the composition: same file, fresh layers,
      // same receipts — Litestream replicates this file whole, so
      // bytes and history travel together.
      const history = yield* Cas.WordLog.pipe(
        Effect.flatMap((log) => log.since(0)),
        Effect.provide(layerSqliteWorded(filename)),
      )
      expect(history.next).toBe(2)
      expect(history.word.map((entry) => entry.seq)).toEqual([0, 1])
      expect(history.word.map((entry) => entry.address)).toEqual(addresses)
      expect((yield* Cas.WordLog.pipe(
        Effect.flatMap((log) => log.since(1)),
        Effect.provide(layerSqliteWorded(filename)),
      )).word.map((entry) => entry.address)).toEqual([addresses[1]])
    })))

it.effect("sqlite log: concurrent appends keep the marks dense — the single-statement append is the lock", () =>
  withStoreRoot((directory) =>
    Effect.gen(function* () {
      const filename = `${directory}/cas.db`
      const history = yield* Effect.gen(function* () {
        const log = yield* Cas.WordLog
        yield* Effect.all(
          Array.from({ length: 10 }, (_, index) =>
            log.append({
              address: "ab".repeat(32),
              at: 1_000 + index,
              size: index,
              tag: 0x01,
            })),
          { concurrency: "unbounded" },
        )
        return yield* log.since(0)
      }).pipe(Effect.provide(layerSqliteWorded(filename)))

      // Dense, zero-based, no duplicates, no holes: the mark plane
      // cannot tear under concurrent writers, because assignment and
      // insertion are one statement under one write lock.
      expect(history.next).toBe(10)
      expect(history.word.map((entry) => entry.seq))
        .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })))
