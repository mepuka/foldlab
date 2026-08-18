import { Layer } from "effect"

import { Cells, type CellOptions } from "../src/planes/Cell.js"
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
 * Two committed rows kill it, and where they bite is precise.
 *
 * Contention in the INTERIOR of the retry loop does not discriminate: under a
 * CAS-class failure the loop's pre-CAS guard re-reads and catches a rival's
 * superstate on the next attempt, so byte-equality costs one extra read and
 * lands the same state. The guard runs at the TOP of an attempt, though, and
 * the last attempt has no successor — so at the RETRY BOUNDARY the two
 * disciplines separate: attempts 1..7 lose to rival joins lacking the delta,
 * attempt 8 loses to a strict superstate carrying it, subsumption succeeds
 * inside attempt 8 and byte-equality exhausts the bound over a cell that
 * already holds the delta.
 *
 * The second row is the ambiguity case at attempt 1: a TRANSPORT-class failure
 * whose read-back carries the delta because a rival's join subsumed it.
 * Subsumption reports the converged state; byte-equality cannot recognize the
 * superstate and, the cause not being CAS-class, refuses transport absence.
 */
export const byteEqualityLayer = (options: CellOptions) =>
  Layer.effect(Cells, makeCellServiceWith(options, byteEqualityReconciliation))
