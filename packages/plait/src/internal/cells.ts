import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import { Effect, Result, Schema, Scope } from "effect"

import { canonicalBytes } from "../Canonical.js"
import {
  CELL_BUCKET,
  CELL_HISTORY,
  CELL_MERGE_ATTEMPTS,
  Observation,
  join,
  stateOf,
  type CellOptions,
  type CellService,
} from "../Cell.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Next,
  type Refusal,
} from "../Refusal.js"
import {
  KvFailure,
  acquireConnection,
  isCasRefusal,
  teachRetryOperation,
  transportRefusalFor,
  type TransportTerms,
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
 * Incarnation bound: KV revisions are backing-stream sequences, so a bucket
 * delete+recreate resets the revision order and every claim here holds only
 * within a fixed backing-stream incarnation; administrative lifecycle mutation
 * is outside the credential guard. No watch surface exists: the KV watch
 * probe suite is not on the substrate gate.
 */

/**
 * `Observation` is suspended because `Cell.ts` imports this adapter: the cycle
 * is the shipped public/internal split, and a direct reference here would read
 * the binding before the public module has initialized it.
 */
const StoredCell = Schema.Array(Schema.suspend(() => Observation))

const decoder = new TextDecoder()
const cellPattern = /^[^.*>\s]+$/u

/** This adapter's transport terms; the spine wall derives its table from them. */
export const transportTerms: TransportTerms = {
  kind: "cell-transport-unavailable",
  law: "Transport absence may be retried; lattice-law refusals may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: teachRetryOperation,
}

const transportRefusal = transportRefusalFor(transportTerms)

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
 * Whether a read-back already holds the delta. For a lattice this is the
 * honest post-condition of a merge: the intended append may have landed, or a
 * rival's join may have subsumed it, and F1 makes the two indistinguishable and
 * equally correct. Byte comparison against one intended record — the register's
 * reconciliation — would be too strict here, because a concurrent writer's
 * larger state is still a state that carries this delta.
 */
const subsumes = Effect.fn("Cells.subsumes")(function* (
  current: ReadonlyArray<Observation>,
  delta: ReadonlyArray<Observation>,
): Effect.fn.Return<boolean, Refusal> {
  return yield* sameBytes(yield* join(current, delta), current)
})

/**
 * The two steps of the merge loop a negative control may replace, named so a
 * control deletes exactly one behaviour and provably shares everything else —
 * connection, bucket shape check, key law, attempt loop, CAS mechanics,
 * canonical encoding, and the step it does not touch. Package-internal: the
 * public `Cells.layer` takes connection options and nothing else, so no
 * discipline is selectable from outside this package.
 */
export interface MergeDiscipline {
  /** The state a delta writes over the current state. The lawful step is the join (⊔). */
  readonly next: (
    current: ReadonlyArray<Observation>,
    delta: ReadonlyArray<Observation>,
  ) => Effect.Effect<ReadonlyArray<Observation>, Refusal>
  /** Whether a read-back after a failed CAS already carries the delta. */
  readonly reconciled: (
    readBack: ReadonlyArray<Observation>,
    delta: ReadonlyArray<Observation>,
    intended: ReadonlyArray<Observation>,
  ) => Effect.Effect<boolean, Refusal>
}

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

  const merge: CellService["merge"] = Effect.fn("Cells.merge")(
    function* (rawCell, rawDelta) {
      const cell = yield* validCell(rawCell)
      const delta = yield* join([], rawDelta)
      for (let attempt = 0; attempt < CELL_MERGE_ATTEMPTS; attempt++) {
        const entry = yield* read(bucket, cell)
        const current = yield* currentOf(entry)
        // The join is idempotent: a delta already carried is not re-written,
        // so a settled cell costs one read and no CAS traffic at all.
        if (yield* subsumes(current, delta)) return yield* stateOf(current)
        const merged = yield* discipline.next(current, delta)
        const bytes = yield* canonicalBytes(merged)
        const landed = yield* Effect.tryPromise({
          try: () => entry === null
            ? bucket.create(cell, bytes)
            : bucket.update(cell, bytes, entry.revision),
          catch: (cause) => new KvFailure(cause),
        }).pipe(
          Effect.map(() => true),
          // Reconcile the ambiguous CAS outcome by read-back (seam rule 1),
          // never by expecting a duplicate PubAck.
          Effect.catch(({ cause }) => Effect.gen(function* () {
            const readBack = yield* currentOf(yield* read(bucket, cell))
            if (yield* discipline.reconciled(readBack, delta, merged)) return true
            if (isCasRefusal(cause)) return false
            return yield* transportRefusal("cell.merge", cause)
          })),
        )
        if (landed) return yield* stateOf(yield* currentOf(yield* read(bucket, cell)))
      }
      return yield* absenceRefusal({
        kind: "cell-update-contended",
        law: "A merge lands its delta or reports contention; a cell is never written by anything but a join.",
        path: ["cell", cell],
        got: CELL_MERGE_ATTEMPTS,
        expected: "one uncontended revision within the attempt bound",
        next: teachContention,
      })
    },
  )

  return { read: readCell, merge }
})
