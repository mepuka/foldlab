/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import { Effect, Result, Schema, Scope } from "effect"

import { canonicalBytes } from "../truth/Canonical.js"
import {
  CELL_BUCKET,
  CELL_HISTORY,
  CELL_MERGE_ATTEMPTS,
  Observation,
  join,
  stateOf,
  type CellOptions,
  type CellService,
} from "../planes/Cell.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Next,
  type Refusal,
} from "../truth/Refusal.js"
import {
  CasWriteFailure,
  carries,
  casJoinLoop,
  type CasJoin,
  type MergeDiscipline as CasMergeDiscipline,
  type Revisioned,
} from "./cas.js"
import {
  acquireConnection,
  isCasRefusal,
  teachRetryOperation,
  transportRefusalFor,
} from "./transport.js"

/**
 * NATS KV adapter for lattice cells.
 *
 * The write path is merge-then-`update(rev)`: read the current state, join the
 * delta locally, and CAS at the observed revision. A lost race re-reads and
 * re-merges — convergent by F1 — never last-writer-wins. Failed CAS appends
 * are reconciled by read-back comparison, never by expecting a duplicate
 * PubAck, and are classified by operation context plus code 10071 rather than
 * by an error name (DEV-704 seam rules 1-2).
 *
 * That loop is no longer written here: it is `internal/cas.ts`'s `casJoinLoop`,
 * the class-(a) write path extracted behaviour-preserving under the G-2
 * contract, and this adapter is its first consumer. What stays here is what is
 * the cell's own — the bucket's ruled shape, the key law, the observation
 * codec, the carrier's join and identity, and the two committed disciplines.
 *
 * Incarnation bound: KV revisions are backing-stream sequences, so a bucket
 * delete+recreate resets the revision order and every claim here holds only
 * within a fixed backing-stream incarnation; administrative lifecycle mutation
 * is outside the credential guard. No watch surface exists: the now-landed KV
 * watch probe licenses only a future advisory feed, and its `isUpdate` flag is
 * not an initial/live boundary.
 */

/**
 * `Observation` is suspended because `Cell.ts` imports this adapter: the cycle
 * is the shipped public/internal split, and a direct reference here would read
 * the binding before the public module has initialized it.
 */
const StoredCell = Schema.Array(Schema.suspend(() => Observation))

const decoder = new TextDecoder()
const cellPattern = /^[^.*>\s]+$/u

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "cell-transport-unavailable",
  law: "Transport absence may be retried; lattice-law refusals may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: teachRetryOperation,
})

/** One taught repair per structural law; every refusal names its legal next step. */
const teachCellKey: ReadonlyArray<Next> = [{
  subject: "cell.read",
  note: "Present the cell name as one literal KV token without dots, whitespace, or wildcards.",
}]
const teachStoredCell: ReadonlyArray<Next> = [{
  subject: "cell.read",
  note: "Restore the canonical observation array at this key; only cell merges write this bucket.",
}]
const teachContention: ReadonlyArray<Next> = [{
  subject: "cell.merge",
  note: "Re-attempt the merge; the join is idempotent, so a repeated delta adds nothing twice.",
}]

const validCell = (cell: string): Effect.Effect<string, Refusal> =>
  cellPattern.test(cell)
    ? Effect.succeed(cell)
    : Effect.fail(structuralRefusal({
      kind: "invalid-cell-key",
      law: "A cell name maps to one literal NATS KV key.",
      path: ["cell"],
      got: cell,
      expected: "one non-empty token without dots, whitespace, or wildcards",
      next: teachCellKey,
    }))

const malformedCell = (got: string): Refusal =>
  structuralRefusal({
    kind: "malformed-cell-state",
    law: "Cell state is the canonical array of holder-attributed observations.",
    path: ["value"],
    got,
    expected: "[{ holder: Json, value: Json }, ...]",
    next: teachStoredCell,
  })

const decodeCell = (
  entry: KvEntry,
): Effect.Effect<ReadonlyArray<Observation>, Refusal> => {
  const parsed = Effect.try({
    try: () => JSON.parse(entry.string()) as unknown,
    catch: (cause) => malformedCell(String(cause)),
  })
  return Effect.flatMap(parsed, (value) => {
    const result = Schema.decodeUnknownResult(StoredCell, {
      onExcessProperty: "error",
      errors: "first",
    })(value)
    return Result.isSuccess(result)
      ? Effect.succeed(result.success)
      : Effect.fail(malformedCell(String(result.failure)))
  })
}

const read = (bucket: KV, cell: string): Effect.Effect<KvEntry | null, Refusal> =>
  Effect.tryPromise({
    try: () => bucket.get(cell),
    catch: (cause) => transportRefusal("cell.read", cause),
  })

const sameBytes = Effect.fn("Cells.sameBytes")(function* (
  left: ReadonlyArray<Observation>,
  right: ReadonlyArray<Observation>,
): Effect.fn.Return<boolean, Refusal> {
  return decoder.decode(yield* canonicalBytes(left)) ===
    decoder.decode(yield* canonicalBytes(right))
})

/**
 * The cell carrier bound into the extracted loop: set union as the join, the
 * empty observation set as the state of a cell no replica has written, and
 * canonical bytes as identity.
 */
const cellJoin: CasJoin<ReadonlyArray<Observation>> = {
  combine: (left, right) => join(left, right),
  initialValue: [],
  identical: (left, right) => sameBytes(left, right),
}

/**
 * Whether a read-back already holds the delta. For a lattice this is the
 * honest post-condition of a merge: the intended append may have landed, or a
 * rival's join may have subsumed it, and F1 makes the two indistinguishable and
 * equally correct. Byte comparison against one intended record — the register's
 * reconciliation — would be too strict here, because a concurrent writer's
 * larger state is still a state that carries this delta.
 */
const subsumes = (
  current: ReadonlyArray<Observation>,
  delta: ReadonlyArray<Observation>,
): Effect.Effect<boolean, Refusal> => carries(cellJoin, current, delta)

/**
 * The two steps of the merge loop a negative control may replace, at the cell
 * carrier. The seam itself is `internal/cas.ts`'s, shared by every class-(a)
 * write path; this alias is the cell instance of it, and the two committed
 * controls below name it. Package-internal: the public `Cells.layer` takes
 * connection options and nothing else, so no discipline is selectable from
 * outside this package.
 */
export type MergeDiscipline = CasMergeDiscipline<ReadonlyArray<Observation>>

/** Cells merge by join and reconcile by subsumption. */
export const lawfulMergeDiscipline: MergeDiscipline = {
  next: (current, delta) => join(current, delta),
  reconciled: (readBack, delta) => subsumes(readBack, delta),
}

/** Reconciles by byte-equality against the one intended record (T16's alternative). */
export const byteEqualityReconciliation: MergeDiscipline = {
  next: lawfulMergeDiscipline.next,
  reconciled: (readBack, _delta, intended) => sameBytes(readBack, intended),
}

/** Writes the delta alone, discarding the current state (§6.3's refused merge). */
export const lastWriterWinsMerge: MergeDiscipline = {
  next: (_current, delta) => Effect.succeed(delta),
  reconciled: lawfulMergeDiscipline.reconciled,
}

export const makeCellService = (
  options: CellOptions,
): Effect.Effect<CellService, Refusal, Scope.Scope> =>
  makeCellServiceWith(options, lawfulMergeDiscipline)

export const makeCellServiceWith = Effect.fn("Cells.make")(function* (
  options: CellOptions,
  discipline: MergeDiscipline,
): Effect.fn.Return<CellService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-cell",
    "connection.acquire",
    transportRefusal,
  )
  const bucket = yield* Effect.tryPromise({
    try: () => new Kvm(connection).create(CELL_BUCKET, {
      storage: StorageType.File,
      replicas: 1,
      history: CELL_HISTORY,
      ttl: 0,
      max_bytes: -1,
    }),
    catch: (cause) => transportRefusal("bucket.ensure", cause),
  })
  const status = yield* Effect.tryPromise({
    try: () => bucket.status(),
    catch: (cause) => transportRefusal("bucket.status", cause),
  })
  if (status.storage !== StorageType.File || status.replicas !== 1 ||
    status.history !== CELL_HISTORY || status.ttl !== 0 || status.max_bytes !== -1) {
    return yield* structuralRefusal({
      kind: "cell-substrate-shape",
      law: "The cell bucket is file-backed R=1 with one retained revision and no age or size eviction.",
      path: ["bucket", "config"],
      got: JSON.stringify({
        storage: status.storage,
        replicas: status.replicas,
        history: status.history,
        ttl: status.ttl,
        max_bytes: status.max_bytes,
      }),
      expected: "file/R=1/history=1/ttl=0/max_bytes=-1",
      next: [{
        subject: "bucket.ensure",
        note: "Configure the cell bucket file-backed with one replica, one retained revision, and no age or size eviction.",
        body: {
          storage: StorageType.File,
          replicas: 1,
          history: CELL_HISTORY,
          ttl: 0,
          max_bytes: -1,
        },
      }],
    })
  }

  const currentOf = Effect.fn("Cells.currentOf")(function* (
    entry: KvEntry | null,
  ): Effect.fn.Return<ReadonlyArray<Observation>, Refusal> {
    return entry === null ? [] : yield* decodeCell(entry)
  })

  const readCell: CellService["read"] = Effect.fn("Cells.read")(
    function* (rawCell) {
      const cell = yield* validCell(rawCell)
      return yield* stateOf(yield* currentOf(yield* read(bucket, cell)))
    },
  )

  /** The cell's state with the revision it was observed at; `null` where none is written. */
  const readState = Effect.fn("Cells.readState")(function* (
    cell: string,
  ): Effect.fn.Return<Revisioned<ReadonlyArray<Observation>> | null, Refusal> {
    const entry = yield* read(bucket, cell)
    return entry === null
      ? null
      : { value: yield* decodeCell(entry), revision: entry.revision }
  })

  /**
   * One canonical CAS append. The cause is carried unclassified past the loop's
   * read-back: `isCasRefusal` decides retry (operation context plus code 10071,
   * seam rule 2), and the transport mint is a thunk the loop calls only on the
   * branch that needs it.
   */
  const write = Effect.fn("Cells.write")(function* (
    cell: string,
    value: ReadonlyArray<Observation>,
    expectedRevision: number | null,
  ): Effect.fn.Return<number, CasWriteFailure | Refusal> {
    const bytes = yield* canonicalBytes(value)
    return yield* Effect.tryPromise({
      try: () => expectedRevision === null
        ? bucket.create(cell, bytes)
        : bucket.update(cell, bytes, expectedRevision),
      catch: (cause) => new CasWriteFailure(
        isCasRefusal(cause),
        () => transportRefusal("cell.merge", cause),
      ),
    })
  })

  const merge: CellService["merge"] = Effect.fn("Cells.merge")(
    function* (rawCell, rawDelta) {
      const cell = yield* validCell(rawCell)
      const delta = yield* join([], rawDelta)
      return yield* stateOf(yield* casJoinLoop({
        join: cellJoin,
        discipline,
        attempts: CELL_MERGE_ATTEMPTS,
        read: readState(cell),
        create: (value) => write(cell, value, null),
        update: (value, expectedRevision) => write(cell, value, expectedRevision),
        contribution: delta,
        contended: (attempts) => absenceRefusal({
          kind: "cell-update-contended",
          law: "A merge lands its delta or reports contention; a cell is never written by anything but a join.",
          path: ["cell", cell],
          got: attempts,
          expected: "one uncontended revision within the attempt bound",
          next: teachContention,
        }),
      }))
    },
  )

  return { read: readCell, merge }
})
