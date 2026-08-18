import { Layer } from "effect"

import { Cells, type CellOptions } from "../src/planes/Cell.js"
import { lastWriterWinsMerge, makeCellServiceWith } from "../src/internal/cells.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * This is `makeCellService` with exactly one step replaced: the merge
 * discipline's `next`, which lawfully returns the join `current ⊔ delta`,
 * returns `delta` alone. That is last-writer-wins, the merge semantics the
 * §6.3 mapping row refuses by name.
 *
 * Everything else is the shipped code path, not a restatement of it: the same
 * `makeCellServiceWith` builds the connection, ensures the bucket with the
 * ruled file/R=1/history=1/ttl=0/max_bytes=-1 config, runs the bucket shape
 * check, enforces the cell-key law, drives the attempt loop, performs the
 * create/update CAS, reconciles a failed CAS by read-back subsumption, and
 * encodes canonically. Because the bucket is ensured by the shipped setup, the
 * control runs standalone — it does not depend on another test having created
 * the bucket first.
 *
 * The F1 `cell-merge-aci` vector kills this variant: the model's verdict is
 * that the two merge schedules commute to one state, and the mutant's two
 * schedules end at their own last delta instead — each disagreeing with the
 * model and with the other.
 */
export const lastWriterWinsLayer = (options: CellOptions) =>
  Layer.effect(Cells, makeCellServiceWith(options, lastWriterWinsMerge))
