/**
 * THE PLACEMENT — index space, the algebra's object. No pixels here.
 *
 * Contract: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` §0/§1.
 * Laws discharged here: L-C1 (exactly-once cover), L-C2 (count honesty,
 * stated on the placement and never on `place`'s culled output),
 * L-C3 (the cut law — the DOI floor moves only at a cut), L-C4 (the
 * extension law), L-C5 (the carrier floor: no Square without its
 * address), L-C7 (canonical order).
 *
 * The DOI partition is frozen between cuts (CANVAS §4: "aggregation is a
 * CUT EVENT"). `placementOf` therefore never recomputes it — with ONE
 * exception the packet itself states, and L-P9 reports as the `carrier`
 * terminator: when a column has outgrown its carrier, the floor is
 * forced up to the oldest row the carrier can still address, because the
 * alternative is to invent an address or read `undefined`.
 */
import { LANES, WINDOW, type Model } from "./model.ts"

/** A mark for one receipt, or one run of receipts carried as a count.
 * `Label` and `Cursor` are deliberately absent (CR-15, CR-16). */
export type Op =
  | { readonly _tag: "Square"; readonly col: number; readonly row: number; readonly address: string }
  | { readonly _tag: "Strip"; readonly col: number; readonly fromRow: number; readonly count: number }

/** The frozen DOI partition. `floor[col]` is the first INDIVIDUATED row
 * of that column; everything below it is carried by one Strip. */
export interface Doi {
  /** The individuated span this cut granted — provenance, not read by
   * the engine (only `floor` is). Named `span`, packet §10 A-1. */
  readonly span: number
  readonly floor: ReadonlyArray<number>
}

/** Every row individuated — the partition a first paint starts from. */
export const initialDoi: Doi = { span: WINDOW, floor: LANES.map(() => 0) }

/** THE ONLY producer of a Doi: a cut. `visible` is the individuated span
 * the cut grants each column. */
export const cutDoi = (model: Model, visible: number): Doi => ({
  span: visible,
  floor: model.columns.map((column) => Math.max(0, column.count - visible)),
})

/** The FULL, unculled placement. Count honesty is stated here. */
export interface Placement {
  readonly doi: Doi
  readonly ops: ReadonlyArray<Op>
}

export const startRow = (op: Op): number => (op._tag === "Square" ? op.row : op.fromRow)

export const covered = (op: Op): number => (op._tag === "Square" ? 1 : op.count)

export const opTotal = (placement: Placement): number =>
  placement.ops.reduce((sum, op) => sum + covered(op), 0)

/**
 * The placement of a model under a partition: for each column, one Strip
 * over the aggregated rows and one Square per individuated row, in
 * canonical order (column ascending, then start row ascending — so a
 * column's Strip precedes its Squares).
 *
 * Coverage is exactly once by construction — `floor + (count - floor) =
 * count` — which is what makes count honesty a fact about the shape
 * rather than a number carried alongside it.
 */
export const placementOf = (model: Model, doi: Doi): Placement => {
  const ops: Array<Op> = []
  model.columns.forEach((column, col) => {
    if (column.count === 0) return
    // The oldest row this column can still name. Rows below it are held
    // by no receipt, so no Square may claim them (L-C5).
    const carrierBase = column.count - column.tail.length
    const asked = Math.min(doi.floor[col] ?? 0, column.count)
    const floor = Math.max(asked, carrierBase)
    if (floor > 0) ops.push({ _tag: "Strip", col, fromRow: 0, count: floor })
    for (let row = floor; row < column.count; row += 1) {
      const receipt = column.tail[row - carrierBase]
      if (receipt === undefined) continue
      ops.push({ _tag: "Square", col, row, address: receipt.address })
    }
  })
  return { doi, ops }
}
