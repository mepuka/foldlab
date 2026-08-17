import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect } from "effect"

import { canonicalBytes } from "../src/Canonical.js"
import { CELL_BUCKET, canonicalize, type Observation } from "../src/Cell.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * The cell's real merge path (read the entry, write with revision CAS) with
 * exactly one step deleted: the join with the current state. The mutant
 * therefore writes the delta ALONE at the observed revision — last-writer-wins,
 * the merge semantics the §6.3 mapping row refuses by name. The write
 * mechanics, the bucket, the key law, and the canonical encoding stay
 * identical to `internal/cells.ts`; only the ⊔ is gone.
 *
 * The F1 `cell-merge-aci` vector kills this variant: the model's verdict is
 * that the two merge schedules commute to one state, and the mutant's two
 * schedules end at their own last delta instead — each disagreeing with the
 * model and with the other.
 */
export const mergeWithoutJoin = async (
  url: string,
  cell: string,
  delta: ReadonlyArray<Observation>,
): Promise<void> => {
  const connection = await connect({ servers: url, name: "cell-lww-mutant" })
  try {
    const bucket = await new Kvm(connection).open(CELL_BUCKET)
    const entry = await bucket.get(cell)
    // DELETED JOIN: the current state is read and then discarded.
    const bytes = Effect.runSync(canonicalBytes(Effect.runSync(canonicalize(delta))))
    if (entry === null) {
      await bucket.create(cell, bytes)
    } else {
      await bucket.update(cell, bytes, entry.revision)
    }
  } finally {
    await connection.close()
  }
}
