/**
 * THE SEQ-GUARDED FOLD — the word's pages into the trunk's carrier.
 *
 * Contract: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` §1/§2.
 * Laws discharged here: L-F1 (incremental equals fresh — `run_append`'s
 * host face), L-F2 (seq-guard replay, which the algebra will NOT supply:
 * `lastK_not_idem`), L-F3 (the mark is the page's `next`, always),
 * L-F4 (totality), L-F5 (the memo law), L-F6 (the memory law),
 * L-F7 (fail-closed decode), L-F8 (four states), L-F9 (no mutation),
 * L-F10 (valid in, valid out).
 *
 * Decision 42 (docs/SPECS.md §42) rules the packet's two OPENs and binds
 * here:
 *
 *   OPEN-1 — a page whose `next` is BELOW the mark is the truncation
 *   repair signature. It is REFUSED AND SURFACED; the fold never
 *   silently resets, because a reset is an explicit user action. The
 *   mark still follows `next` (E1, unconditional), so the carrier's own
 *   high-water guard below is what keeps count honesty across the
 *   repair: a receipt a lane already holds is never folded twice. In a
 *   forward chain that guard is a no-op, since every held receipt has
 *   seq < mark.
 *
 *   OPEN-2 — address validity is a DOCUMENT boundary, not a per-op
 *   second opinion: one bad address refuses the whole page, at the
 *   decode step, so the tint ladder never meets NaN.
 */
import { Schema as S } from "effect"

import { wordHistorySchema } from "../generated/WordLogSchema.ts"
import {
  K_CARRIER,
  laneIndex,
  laneOfTag,
  Status,
  type Column,
  type Model,
  type Receipt,
  type WordHistory,
} from "./model.ts"

export type Decoded =
  | { readonly _tag: "Accepted"; readonly history: WordHistory }
  | { readonly _tag: "Malformed"; readonly reason: string }

const ADDRESS = /^[0-9a-f]{64}$/u

const TRUNCATED =
  "store truncated — the word is shorter than this session's mark; reset?"

const decodeStrict = S.decodeUnknownSync(wordHistorySchema)

const malformed = (reason: string): Decoded => ({ _tag: "Malformed", reason })

/**
 * The door. Decodes through S0's generated mirror and nothing else — the
 * workbench never parses the wire itself — then decides the structural
 * preconditions the fold's REQUIRES rest on: R3 (strictly increasing
 * seq: `lastK_not_comm` says a reordered page is a different window, so
 * it is a refusal and never something to sort), R4 (64 lowercase hex
 * addresses, decision 42's document boundary), and a mark that is a
 * receipt index rather than a negative number.
 */
export const decodeHistory = (input: unknown): Decoded => {
  let history: WordHistory
  try {
    history = decodeStrict(input)
  } catch (error) {
    return malformed(
      `the page is not a WordHistory: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (history.next < 0) return malformed(`next ${history.next} is not a receipt index`)
  let previous = -1
  for (const receipt of history.word) {
    if (receipt.seq <= previous) {
      return malformed(`seq ${receipt.seq} follows ${previous}: the page is out of order`)
    }
    previous = receipt.seq
    if (!ADDRESS.test(receipt.address)) {
      return malformed(`seq ${receipt.seq} carries an address that is not 64 lowercase hex`)
    }
  }
  return { _tag: "Accepted", history }
}

/** Concatenation of two adjacent pages — the host face of the word's own
 * append. */
export const concatPages = (a: WordHistory, b: WordHistory): WordHistory => ({
  next: b.next,
  word: [...a.word, ...b.word],
})

const grown = (column: Column, added: ReadonlyArray<Receipt>): Column => {
  const merged = [...column.tail, ...added]
  // `lastK` re-applied at every merge, not only at the end: without it a
  // combined tail longer than k survives an incremental fold and L-F1
  // dies on the nose.
  const tail = merged.length > K_CARRIER ? merged.slice(merged.length - K_CARRIER) : merged
  return {
    count: column.count + added.length,
    tailRevision: tail.at(-1)?.seq ?? -1,
    tail,
  }
}

/**
 * The fold. REQUIRES R2..R4, established by `decodeHistory`; a page that
 * reaches here has been decoded and checked.
 *
 * A receipt is admitted when it is at or past the mark AND newer than
 * what its own lane already holds. The first conjunct is the seq guard
 * the transport's re-delivery makes necessary; the second is the
 * carrier's high-water mark, which only ever bites after a truncation
 * repair has moved the mark backwards.
 */
export const foldPage = (model: Model, page: WordHistory): Model => {
  if (page.next < model.mark) {
    return {
      status: Status.Refused({ reason: TRUNCATED }),
      mark: page.next,
      columns: model.columns,
    }
  }

  const admitted = new Map<number, Array<Receipt>>()
  for (const receipt of page.word) {
    if (receipt.seq < model.mark) continue
    const col = laneIndex(laneOfTag(receipt.tag))
    const column = model.columns[col]
    if (column === undefined || receipt.seq <= column.tailRevision) continue
    const bucket = admitted.get(col)
    if (bucket === undefined) admitted.set(col, [receipt])
    else bucket.push(receipt)
  }

  // Every untouched lane keeps its snapshot by REFERENCE (E7): that is
  // what makes `createLazy` hit, and over-invalidation is the failure
  // TP-10 actually names.
  const columns =
    admitted.size === 0
      ? model.columns
      : model.columns.map((column, col) => {
          const added = admitted.get(col)
          return added === undefined ? column : grown(column, added)
        })

  return { status: Status.Live(), mark: page.next, columns }
}

/**
 * The seam S3b's `update` calls: decode, then fold. A malformed page
 * refuses and moves NOTHING — mark and columns stay reference-identical
 * (E6) — because a partial fold leaves the carrier in a state no law
 * describes.
 */
export const foldDocument = (model: Model, input: unknown): Model => {
  const decoded = decodeHistory(input)
  return decoded._tag === "Malformed"
    ? {
        status: Status.Refused({ reason: decoded.reason }),
        mark: model.mark,
        columns: model.columns,
      }
    : foldPage(model, decoded.history)
}
