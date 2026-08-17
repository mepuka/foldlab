import { Layer } from "effect"

import { Cells, type CellOptions } from "../src/Cell.js"
import { byteEqualityReconciliation, makeCellServiceWith } from "../src/internal/cells.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * This is `makeCellService` with exactly one step replaced: the merge
 * discipline's `reconciled`, which lawfully asks whether the read-back after a
 * failed CAS already CARRIES the delta (subsumption), instead asks whether the
 * read-back EQUALS the one record this call intended to write — the register's
 * reconciliation, applied to a lattice. That is T16's named alternative.
 *
 * Everything else is the shipped code path, `next` (the join) included, so the
 * only behaviour under test is the reconciliation predicate. The bucket is
 * ensured by the shipped setup, so the control runs standalone.
 *
 * What kills it is NOT contention alone. Under a CAS-class failure the loop's
 * own idempotence guard re-reads and catches a rival's superset on the next
 * attempt, so byte-equality costs one extra round trip and lands the same
 * state — the two disciplines are indistinguishable there, which is why the
 * lost-CAS row passes under both. The discriminating schedule is the one T16
 * names: a TRANSPORT-class failure whose read-back carries the delta because a
 * rival's join subsumed it. Subsumption reports the converged state;
 * byte-equality falls through to the transport branch and REFUSES a merge whose
 * delta is already in the cell.
 */
export const byteEqualityLayer = (options: CellOptions) =>
  Layer.effect(Cells, makeCellServiceWith(options, byteEqualityReconciliation))
