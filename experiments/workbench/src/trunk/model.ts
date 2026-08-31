/**
 * THE TRUNK'S VOCABULARY — the lanes, the classifier, the carrier.
 *
 * Contract: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` §0.
 * Laws discharged here: L-M1 (the lane set is the generated registry's),
 * L-M2 (one classifier authority, CR-42), L-M3 (N9's bare-hex fallback,
 * copied from `bin/cli/history.ts:75-78`), L-M4 (the pinned micro-tint
 * index), and the carrier invariant CI-1..CI-5's ground case.
 *
 * Nothing here reads a browser global (L-P8): the trunk's engine is pure
 * and takes its world as arguments.
 */
import { Schema as S } from "effect"
import { defineTaggedUnion } from "foldkit/schema"

import { KindTagRows } from "../generated/kindTags.ts"
import { wordHistorySchema, wordLogEntrySchema } from "../generated/WordLogSchema.ts"

/** TP-29: the CARRIER bound — how many receipts one lane holds. */
export const K_CARRIER = 512
/** TP-29: the visible individuated span. A different number from the
 * carrier bound, and the two are not interchangeable. */
export const WINDOW = 30

/** One column of the trunk. Fifteen registry sorts plus the residue lane
 * every unregistered tag lands in — `unregistered` is a lane, not a sort
 * (TP-30). */
export type LaneId =
  | "schema" | "git" | "cont" | "agent"
  | "step"
  | "manifest" | "tree" | "file"
  | "context" | "entry" | "value" | "annotation" | "query" | "result"
  | "chunk"
  | "unregistered"

/**
 * The sixteen lanes in RULED order (aesthetics §1.3): speed class
 * ascending — near-still, bursty-per-program, per-artifact, steady-fast,
 * bursty-fastest — with the residue lane last. The ORDER is a ruling; the
 * MEMBERSHIP is the generated registry's, and L-M1 decides it.
 */
export const LANES: ReadonlyArray<LaneId> = [
  "schema", "git", "cont", "agent",
  "step",
  "manifest", "tree", "file",
  "context", "entry", "value", "annotation", "query", "result",
  "chunk",
  "unregistered",
]

/** Indices into LANES at which a CLASS gutter replaces an intra gutter.
 * The `unregistered` boundary takes the wider residue gutter. */
export const CLASS_STARTS: ReadonlyArray<number> = [0, 4, 5, 8, 14, 15]

const LANE_INDEX: ReadonlyMap<string, number> = new Map(
  LANES.map((lane, index) => [lane, index]),
)

/** Where a lane sits in the ruled order. A name no lane carries answers
 * -1, which indexes nothing and surfaces as a missing column rather than
 * as a silent zero. */
export const laneIndex = (lane: string): number => LANE_INDEX.get(lane) ?? -1

/** The classifier, DERIVED from the generated registry rather than
 * transcribed from it (CR-42, one authority). A registry row whose name
 * is not a ruled lane is deliberately absent from this map: it then
 * classifies as `unregistered`, and L-M1/L-M2 go red rather than the
 * receipt disappearing. */
const LANE_BY_TAG: ReadonlyMap<number, LaneId> = new Map(
  KindTagRows.flatMap((row) => {
    const lane = LANES.find((candidate) => candidate === row.name)
    return lane === undefined ? [] : [[row.tag, lane] as const]
  }),
)

/** CR-42: `col` is derived from the receipt's tag, here and nowhere else.
 * Every tag the registry does not name lands in the residue lane — never
 * dropped, because a dropped receipt takes count honesty with it. */
export const laneOfTag = (tag: number): LaneId => LANE_BY_TAG.get(tag) ?? "unregistered"

/** N9, copied and not reinvented (`library/effects/bin/cli/history.ts`,
 * the `kindName` above `historyCommand`): the registry name, else bare
 * hex. Two registers of one document must not disagree about what a
 * stored node is called. */
export const kindName = (tag: number): string => {
  const row = KindTagRows.find((candidate) => candidate.tag === tag)
  return row === undefined ? `0x${tag.toString(16).padStart(2, "0")}` : row.name
}

const TINT_STEPS: ReadonlyArray<0 | 1 | 2 | 3 | 4> = [0, 1, 2, 3, 4]

/**
 * The PINNED micro-tint index (TP-13): the address's first hex NIBBLE
 * mod 5 — not its char code, and not `"a" % 5`, which is NaN. The
 * precondition (the address begins with a lowercase hex digit) is
 * established at the door by `decodeHistory`; out of domain the ladder
 * answers its first step rather than NaN, so nothing downstream indexes
 * a palette with a hole.
 */
export const tintIndex = (address: string): 0 | 1 | 2 | 3 | 4 =>
  TINT_STEPS[Number.parseInt(address.slice(0, 1), 16) % TINT_STEPS.length] ?? 0

/** One receipt, as S0's mirror describes it — never a second opinion. */
export type Receipt = typeof wordLogEntrySchema.Type
/** One page of the word: a suffix from a mark, plus the next mark. */
export type WordHistory = typeof wordHistorySchema.Type

/**
 * One column's IMMUTABLE snapshot (TP-10): replaced on every fold that
 * touches the lane, never mutated, so `createLazy`'s `===` comparison is
 * both sound and cheap. `tailRevision` is DERIVED (the tail's last seq,
 * -1 when empty) rather than an opaque counter — packet FLAG-4: a counter
 * makes incremental-equals-fresh false on the nose.
 */
export const Column = S.Struct({
  count: S.Int,
  tailRevision: S.Int,
  tail: S.Array(wordLogEntrySchema),
})
export type Column = typeof Column.Type

/**
 * Four states, not a boolean (the skeleton's own `Probe` precedent):
 * "never asked" and "asked and was refused" are different facts, and a
 * refusal carries its reason.
 */
export const Status = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Live: {},
  Refused: { reason: S.String },
})
export type Status = typeof Status.Type

/** The trunk's whole state. `mark` is a receipt INDEX (TP-19b) and is
 * only ever assigned from a page's `next` (L-F3). Declared as a Schema so
 * S3b hands it to the foldkit Runtime unchanged. */
export const Model = S.Struct({
  status: Status,
  mark: S.Int,
  columns: S.Array(Column),
})
export type Model = typeof Model.Type

const EMPTY_COLUMN: Column = { count: 0, tailRevision: -1, tail: [] }

/** Idle, mark 0, sixteen empty columns — CI-1..CI-5 hold. */
export const emptyModel: Model = {
  status: Status.Idle(),
  mark: 0,
  columns: LANES.map(() => EMPTY_COLUMN),
}

/** The empty column every lane starts at, shared because it is immutable.
 * The fold replaces snapshots; it never writes through one. */
export const emptyColumn: Column = EMPTY_COLUMN

export const columnOf = (model: Model, lane: LaneId): Column =>
  model.columns[laneIndex(lane)] ?? EMPTY_COLUMN

/** Σ column counts — every receipt ever folded, whether or not the
 * carrier still holds it. */
export const totalCount = (model: Model): number =>
  model.columns.reduce((sum, column) => sum + column.count, 0)
