/**
 * The word log: the store's own history, persisted — the receipts
 * seam beside the byte and naming planes.
 *
 * The store is a SET (address ⇀ bytes, grow-only); the word is
 * strictly more — bindings in admission order — and until this seam
 * existed the running system dropped it: `cas_run`'s reply was the
 * word for that call and nothing persisted it. This seam is where the
 * running system keeps its word. `append` records one admission;
 * `since` answers the word's suffix from a mark, which is the Lean
 * model's `WordE.since` (`Cas/Lang/Worded.lean`) realized as a read.
 *
 * ## The record is registered, never ad hoc
 *
 * Every row this seam persists and every document `since` answers is
 * spelled by the GENERATED word-wire mirrors
 * (`generated/WordLogSchema.ts`, emitted from
 * `library/cas/Cas/Lang/WordWire.lean` by `lake exe emitword`,
 * byte-identity-gated). A receipt is `(address, at, seq, size, tag)`:
 * `seq` is the mark — a zero-based word index, dense by construction —
 * and `at` is epoch milliseconds on the admitting host's clock. Time
 * is host territory (the model has no clock), and both host fields are
 * per-device honest: the word does NOT sync, so a mark and a timestamp
 * only ever speak for the store that wrote them.
 *
 * A receipt deliberately carries less than a binding: the store
 * already holds the bytes, so the log never becomes a second byte
 * plane. Every logged address is resident — the store law appends the
 * receipt only AFTER `putBytes` succeeds — so `log ⋈ load` recovers
 * full bindings whenever a consumer wants them.
 *
 * ## What the log records, exactly
 *
 * Fresh admissions. A duplicate put is the identity on the store and
 * appends nothing, exactly as the Lean `step` leaves the word
 * unchanged on `duplicate`. Content admitted before a store first
 * opened with this seam is present without receipts: history begins
 * when the log begins, which is the honest reading of "admission
 * order is when this store learned something".
 *
 * ## The crash direction, ruled
 *
 * Bytes first, receipt second — the same safe direction the crash
 * matrix already proves for unacknowledged puts ("durable but never
 * acknowledged"): a crash between the two leaves resident content
 * with no receipt, and the word under-reports rather than lies. The
 * reverse order could leave a receipt claiming an admission the store
 * never made, which is the one thing the store never does. A log
 * whose middle is undecodable is corruption and fails typed; only a
 * torn FINAL line of the file realization — the crash artifact — is
 * tolerated, because the put it belonged to never answered.
 */
import { Context, Effect, Layer, Option, Schema, Semaphore } from "effect"
import { FileSystem, PlatformError } from "effect"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { BackendFailure } from "./Backend.ts"
import { canonicalJson } from "../internal/canonicalJson.ts"
import { wordHistorySchema, wordLogEntrySchema } from "./generated/WordLogSchema.ts"

/** One receipt, in the registered spelling: the persisted record of
 * one admission. `seq` is the mark (zero-based word index), `at`
 * epoch milliseconds on the admitting host's clock. */
export type WordLogEntry = typeof wordLogEntrySchema.Type

/** The history document `since` answers: the word's suffix from a
 * mark, in admission order, and `next` — the mark of the next entry
 * to be admitted, so a client never computes its own cursor. */
export type WordHistory = typeof wordHistorySchema.Type

/** What `append` is handed: a receipt minus its mark. The log assigns
 * `seq` — atomically, in the realization's own idiom — because the
 * mark IS the log's order and a caller must not be able to claim a
 * position. */
export interface WordLogAppend {
  readonly address: string
  readonly at: number
  readonly size: number
  readonly tag: number
}

/** The word-log seam: append one receipt, read the history from a
 * mark. Like every backend seam it judges nothing — admission is the
 * store law's, and the log is only asked to remember it. */
export interface WordLogShape {
  /** Record one fresh admission. The realization assigns the mark. */
  readonly append: (
    entry: WordLogAppend,
  ) => Effect.Effect<void, BackendFailure>
  /** The word's suffix from a mark (zero-based, half-open — never a
   * timestamp): `since(0)` is the whole history, an empty `word` is
   * "nothing happened since the mark". */
  readonly since: (
    mark: number,
  ) => Effect.Effect<WordHistory, BackendFailure>
}

/** The word log in the context — the receipts seam beside the byte
 * plane and the roots registry. A composition that provides it gets a
 * store whose admissions are receipted; one that does not gets the
 * store law unchanged. */
export class WordLog extends Context.Service<WordLog, WordLogShape>()(
  "foldlab/cas/WordLog",
) {}

/** A mark off a caller: word indexes are whole and non-negative, and
 * a negative or fractional one must not reach `Array.slice`'s
 * from-the-end reading or a SQL comparison. */
const flooredMark = (mark: number): number =>
  Number.isFinite(mark) ? Math.max(0, Math.floor(mark)) : 0

/* ── memory ──────────────────────────────────────────────────────── */

/** One isolated in-memory word log — the test seam, and the receipts
 * half of an in-memory session. */
export const makeMemoryWordLog = (): WordLogShape => {
  const entries: Array<WordLogEntry> = []
  return {
    append: (entry) => Effect.sync(() => {
      entries.push({
        address: entry.address,
        at: entry.at,
        seq: entries.length,
        size: entry.size,
        tag: entry.tag,
      })
    }),
    since: (mark) => Effect.sync(() => {
      const from = flooredMark(mark)
      return { next: entries.length, word: entries.slice(from) }
    }),
  }
}

/* ── sql ─────────────────────────────────────────────────────────── */

/** The table the word lives in when the composition does not name one
 * — the receipts counterpart of `cas_objects` and `cas_roots`. */
export const defaultWordTable = "cas_word"

/** Which table the word log lives in. */
export interface SqlWordLogOptions {
  readonly table?: string
}

const sqlFailure = (error: SqlError): BackendFailure =>
  new BackendFailure({
    reason: `word log failed: ${error.message}`,
    cause: error,
  })

const decodeEntry = Schema.decodeUnknownEffect(wordLogEntrySchema)

/** One JSONL line to one receipt, in a single schema step — parse and
 * decode through the registered spelling, no bare `JSON.parse`. */
const decodeLine = Schema.decodeUnknownEffect(
  Schema.fromJsonString(wordLogEntrySchema),
)

/**
 * The word log over the `SqlClient` in context, creating the table if
 * it is not there (a composition step, exactly as the roots adapter
 * treats its own `CREATE TABLE`).
 *
 * `append` is ONE statement — `INSERT … SELECT COALESCE(MAX(seq), -1)
 * + 1` — so the mark is assigned under the same write lock that lands
 * the row: the single-statement atomic append of the root-store
 * precedent, and what keeps `seq` dense and zero-based with no
 * counter held anywhere. `since` reads `WHERE seq >= mark ORDER BY
 * seq`; a row that does not decode as a receipt fails typed, because
 * order is semantics and a filtered row would silently renumber
 * history.
 */
export const makeSqlWordLog = (
  options: SqlWordLogOptions = {},
): Effect.Effect<WordLogShape, never, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    // Without transforms: the columns are spelled here and in the rows
    // identically, whatever naming convention the client was
    // configured with.
    const client = (yield* SqlClient.SqlClient).withoutTransforms()
    const table = client(options.table ?? defaultWordTable)

    yield* client`
      CREATE TABLE IF NOT EXISTS ${table} (
        seq INTEGER PRIMARY KEY,
        address TEXT NOT NULL,
        tag INTEGER NOT NULL,
        size INTEGER NOT NULL,
        at INTEGER NOT NULL
      )
    `.pipe(Effect.orDie)

    const append: WordLogShape["append"] = Effect.fn("SqlWordLog.append")(
      function* (entry) {
        return yield* client`
          INSERT INTO ${table} (seq, address, tag, size, at)
          SELECT COALESCE(MAX(seq), -1) + 1, ${entry.address}, ${entry.tag},
            ${entry.size}, ${entry.at}
          FROM ${table}
        `.pipe(Effect.asVoid, Effect.mapError(sqlFailure))
      },
    )

    const since: WordLogShape["since"] = Effect.fn("SqlWordLog.since")(
      function* (mark) {
        const from = flooredMark(mark)
        const rows = yield* client<typeof wordLogEntrySchema.Encoded>`
          SELECT seq, address, tag, size, at FROM ${table}
          WHERE seq >= ${from} ORDER BY seq
        `.pipe(Effect.mapError(sqlFailure))
        const word: Array<WordLogEntry> = []
        for (const row of rows) {
          // The row is still parsed at the boundary: a table is
          // external data, whatever the query's nominal type says.
          word.push(yield* decodeEntry(row).pipe(
            Effect.mapError((issue) => new BackendFailure({
              reason: `word log row is not a receipt: ${String(issue)}`,
              cause: issue,
            })),
          ))
        }
        const last = word.at(-1)
        if (last !== undefined) {
          return { next: last.seq + 1, word }
        }
        // An empty suffix still owes the true cursor: the mark may lie
        // beyond the word, and `next` must say where the word ends.
        const heads = yield* client<{ readonly next: number }>`
          SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM ${table}
        `.pipe(Effect.mapError(sqlFailure))
        const next = Number(heads.at(0)?.next ?? 0)
        return { next: Number.isFinite(next) ? next : 0, word }
      },
    )

    return { append, since }
  })

/* ── file ────────────────────────────────────────────────────────── */

/** The word log of a file-backed store: one append-only line file in
 * the store root, beside `objects/` and `roots/`. */
export const wordLogRelativePath = "word.jsonl"

const isNotFound = (error: PlatformError.PlatformError): boolean =>
  error.reason._tag === "NotFound"

const fileFailure = (error: PlatformError.PlatformError): BackendFailure =>
  new BackendFailure({ reason: error.message, cause: error })

const utf8Encoder = new TextEncoder()

/**
 * The word log over the store root's `FileSystem` — one JSONL file,
 * each line a receipt in the registered canonical spelling, appended
 * with the platform's own append flag so a line is one write.
 *
 * Single-writer honest, like the file layout it lives beside: appends
 * within one process are serialized by a semaphore and each read
 * re-counts the file, but two PROCESSES appending concurrently can
 * tear the mark assignment. The db-backed store is the composition
 * for concurrent hosts; this one is for the store you carry in a
 * directory. A torn final line — the crash artifact of an append that
 * never answered — is tolerated on read and repaired by the next
 * append (truncated to the clean prefix under the write permit, so
 * the tear can never sit mid-file and read as corruption); an
 * undecodable line anywhere else IS corruption and fails typed.
 *
 * No fsync is asserted, the same honest posture the byte plane keeps
 * (crash matrix, finding c): a power loss — not a process crash — can
 * tear the final line, and the torn-line tolerance above is exactly
 * the read-side answer to it.
 */
export const makeFileWordLog = (
  storeRoot: string,
): Effect.Effect<WordLogShape, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const writing = yield* Semaphore.make(1)
    const path = `${storeRoot}/${wordLogRelativePath}`

    /** The log as read: the decoded receipts, and the raw text split
     * into the clean prefix and any torn tail. The tail is the crash
     * artifact of an append that never answered — its put never
     * acknowledged, so under-reporting it is the crash matrix's safe
     * direction. `append` repairs it; `since` merely tolerates it. */
    const readLog: Effect.Effect<
      {
        readonly entries: Array<WordLogEntry>
        readonly cleanPrefix: string
        readonly torn: boolean
      },
      BackendFailure
    > = Effect.gen(function* () {
      const raw = yield* fs.readFileString(path).pipe(
        Effect.catchTag("PlatformError", (error) => isNotFound(error)
          ? Effect.succeed("")
          : Effect.fail(fileFailure(error))),
      )
      const lines = raw.split("\n")
      // A trailing newline leaves one empty tail; drop it before the
      // torn-line reading below, so a clean file has no "torn" line.
      if (lines.at(-1) === "") lines.pop()
      const entries: Array<WordLogEntry> = []
      let cleanPrefix = ""
      for (const [index, line] of lines.entries()) {
        // One schema step parses the line and decodes the receipt —
        // the ratified JSON codec discipline, no bare JSON.parse.
        const parsed = decodeLine(line).pipe(
          Effect.mapError((issue) => new BackendFailure({
            reason: `word log line ${index} is not a receipt: ${String(issue)}`,
            cause: issue,
          })),
        )
        // Only the FINAL line may fail to decode — the torn tail.
        // Anywhere else an undecodable line is corruption and the
        // typed failure propagates.
        const entry = index === lines.length - 1
          ? yield* parsed.pipe(Effect.option)
          : Option.some(yield* parsed)
        if (Option.isNone(entry)) {
          return { entries, cleanPrefix, torn: true }
        }
        if (entry.value.seq !== index) {
          return yield* new BackendFailure({
            reason: `word log line ${index} claims mark ${entry.value.seq} — the log's order has been edited, and order is semantics`,
          })
        }
        entries.push(entry.value)
        cleanPrefix = `${cleanPrefix}${line}\n`
      }
      return { entries, cleanPrefix, torn: false }
    })

    const platformFailure = <A>(
      effect: Effect.Effect<A, PlatformError.PlatformError>,
    ): Effect.Effect<A, BackendFailure> => Effect.mapError(effect, fileFailure)

    const append: WordLogShape["append"] = Effect.fn("FileWordLog.append")(
      function* (entry) {
        return yield* writing.withPermits(1)(Effect.gen(function* () {
          const log = yield* readLog
          if (log.torn) {
            // Repair the crash artifact BEFORE appending: a torn line
            // left in place would sit mid-file after this append and
            // poison every later read as corruption. Truncating to the
            // clean prefix discards only an admission that never
            // acknowledged — the safe direction, made durable. The
            // truncation is temp + rename — the byte plane's own
            // atomicity idiom — because an in-place rewrite would hand
            // a concurrent reader a half-written prefix, which is
            // worse than the tear being repaired.
            const repair = `${path}.repair`
            yield* fs.writeFile(
              repair,
              utf8Encoder.encode(log.cleanPrefix),
            ).pipe(platformFailure)
            yield* fs.rename(repair, path).pipe(platformFailure)
          }
          const row = Schema.encodeSync(wordLogEntrySchema)({
            address: entry.address,
            at: entry.at,
            seq: log.entries.length,
            size: entry.size,
            tag: entry.tag,
          })
          yield* fs.writeFile(path, utf8Encoder.encode(`${canonicalJson(row)}\n`), {
            flag: "a",
          }).pipe(platformFailure)
        }))
      },
    )

    const since: WordLogShape["since"] = Effect.fn("FileWordLog.since")(
      function* (mark) {
        const log = yield* readLog
        const from = flooredMark(mark)
        return { next: log.entries.length, word: log.entries.slice(from) }
      },
    )

    return { append, since }
  })

/* ── layers ──────────────────────────────────────────────────────── */

/** One isolated in-memory word log as a layer — the test seam's Layer
 * form. Each build is its own history. */
export const layerMemoryWordLog: Layer.Layer<WordLog> =
  Layer.sync(WordLog, makeMemoryWordLog)

/** Provide the word log over the `SqlClient` in context — the
 * db-backed store's receipts plane, in the same file as its bytes and
 * roots. */
export const layerSqlWordLog = (
  options: SqlWordLogOptions = {},
): Layer.Layer<WordLog, never, SqlClient.SqlClient> =>
  Layer.effect(WordLog, makeSqlWordLog(options))

/** Provide the word log over a store root's `FileSystem` — the file
 * store's receipts plane, one line file beside `objects/` and
 * `roots/`. */
export const layerFileWordLog = (
  storeRoot: string,
): Layer.Layer<WordLog, never, FileSystem.FileSystem> =>
  Layer.effect(WordLog, makeFileWordLog(storeRoot))
