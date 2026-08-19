/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * Lattice cells: the join, the cell service over the ruled `flb-fab-cell` KV
 * bucket, and the local replica that mirrors one into a process.
 *
 * The merge-then-`update(rev)` write loop is `internal/cas.ts`'s `casJoinLoop`,
 * shared by every class-(a) write path; this module's service is its first
 * consumer, and no ordering, locking, or conflict-resolution parameter reaches
 * either.
 *
 * A cell is the finite set of holder-attributed observations a replica has
 * verified, merged by set union — the carrier the fabric model's F1 family is
 * stated over. The public surface takes a *delta*, never a rewrite function:
 * there is no ordering, locking, or conflict-resolution parameter anywhere,
 * because the only lawful update is a join.
 *
 * **Canonical order is declared, not derived from the model.** Observations
 * sort by their RFC 8785 canonical bytes, so every TypeScript replica that
 * verified the same set holds byte-identical state. The claim is set equality;
 * agreement with the Lean carrier's own comparator order is NOT claimed, and
 * no cross-language byte wall over cell state exists.
 *
 * **No watch surface ships.** The ninth substrate suite now probes initial
 * replay, coalescing, delete markers, resume-from-revision, and one bounded
 * reconnect schedule at the pin. It licenses a future feed only as advisory:
 * this module still ships read and merge, `KvWatchEntry.isUpdate` is not an
 * initial/live boundary, and no absence may ever be inferred from a watch.
 *
 * Incarnation: EXEMPT from the register's incarnation pin — argued and
 * recorded, not assumed, in packages/plait/DECISIONS.md, Task DEV-779. KV
 * revisions are backing-stream sequences, but no revision crosses this seam:
 * `read` and `merge` are the whole surface, so there is no fence a reborn
 * bucket could honor. A bucket delete+recreate destroys data, which no pin
 * recovers.
 *
 * @module
 */
import { Context, Effect, Layer, Schema, Stream, SubscriptionRef } from "effect"

import type { ConnectionBootstrap } from "../internal/transport.js"
import { canonicalBytes } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import {
  structuralRefusal,
  WireValueSchema,
  type Next,
  type Refusal,
  type StructuralRefusal,
} from "../truth/Refusal.js"
import { CellName } from "../kernel/Subjects.js"
import { makeCellService } from "../internal/cells.js"

/**
 * The name of one lattice cell, re-exported at the concept it names.
 *
 * The sort is declared once in the fabric's token grammar because the context
 * program's cell selector spells it too, and one grammar stated twice is two
 * grammars. Callers of this seam reach it here.
 */
export { CellName } from "../kernel/Subjects.js"

/** The file-backed KV bucket that is authoritative for lattice cells. */
export const CELL_BUCKET = "flb-fab-cell"

/**
 * Retained revisions per cell key. A cell is a lattice value, not a log: only
 * the current state has meaning, and no audit or history claim rides cells.
 */
export const CELL_HISTORY = 1

/**
 * The bound on merge-write attempts before contention is reported as absence.
 * The loop's termination is liveness and is never claimed; convergence of the
 * value is F1.
 */
export const CELL_MERGE_ATTEMPTS = 8

/** One holder-attributed observation: the only delta the evidence alphabet admits. */
export const Observation = Schema.Struct({
  holder: WireValueSchema,
  value: WireValueSchema,
})

/** One holder-attributed observation: the only delta the evidence alphabet admits. */
export type Observation = typeof Observation.Type

/** The canonical observation set stored at one cell key, with its identity. */
export interface CellState {
  readonly observations: ReadonlyArray<Observation>
  readonly digest: Digest
}

/** Connection bootstrap for the cell bucket. */
export interface CellOptions extends ConnectionBootstrap {}

/** One taught repair per structural law; every refusal names its legal next step. */
const teachCellKey: ReadonlyArray<Next> = [{
  subject: "cell.read",
  note: "Present the cell name as one literal KV token without dots, whitespace, or wildcards.",
}]

/**
 * Admits one cell name, refusing anything the KV keyspace cannot carry.
 *
 * This is the sort's one minting site: the adapter under this seam calls it
 * rather than re-testing the grammar, so a name that reached the substrate was
 * admitted exactly once and the teaching has one home.
 *
 * @example
 * ```ts
 * import { cellName } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.runSync(cellName("membership"))
 * // "membership"
 * ```
 */
export const cellName = Effect.fn("Cell.cellName")(function* (
  name: string,
): Effect.fn.Return<CellName, StructuralRefusal> {
  if (!Schema.is(CellName)(name)) {
    return yield* structuralRefusal({
      kind: "invalid-cell-key",
      law: "A cell name maps to one literal NATS KV key.",
      path: ["cell"],
      got: name,
      expected: "one non-empty token without dots, whitespace, or wildcards",
      next: teachCellKey,
    })
  }
  return name
})

/**
 * Reads a cell and joins a delta into it.
 *
 * `merge` takes only a join: a lost CAS race re-reads and re-merges, which is
 * convergent by F1. There is no last-writer-wins path and no conflict callback.
 */
export interface CellService {
  readonly read: (cell: CellName) => Effect.Effect<CellState, Refusal>
  readonly merge: (
    cell: CellName,
    delta: ReadonlyArray<Observation>,
  ) => Effect.Effect<CellState, Refusal>
}

const sortKey = Effect.fn("Cell.sortKey")(function* (
  observation: Observation,
): Effect.fn.Return<string, StructuralRefusal> {
  return new TextDecoder().decode(yield* canonicalBytes(observation))
})

/**
 * Returns the canonical, duplicate-free observation set.
 *
 * Idempotence and commutativity of the join are properties of this function:
 * arrival order and multiplicity are erased before any byte is compared.
 *
 * @example
 * ```ts
 * import { canonicalize } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.runSync(canonicalize([{ holder: 1, value: 10 }, { holder: 1, value: 10 }]))
 * // [{ holder: 1, value: 10 }]
 * ```
 */
export const canonicalize = Effect.fn("Cell.canonicalize")(function* (
  observations: ReadonlyArray<Observation>,
): Effect.fn.Return<ReadonlyArray<Observation>, StructuralRefusal> {
  const keyed: Array<readonly [string, Observation]> = []
  for (const observation of observations) {
    keyed.push([yield* sortKey(observation), observation])
  }
  keyed.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
  const canonical: Array<Observation> = []
  let previous: string | undefined
  for (const [key, observation] of keyed) {
    if (key === previous) continue
    previous = key
    canonical.push(observation)
  }
  return canonical
})

/**
 * The least upper bound of two cells: finite-set union.
 *
 * @example
 * ```ts
 * import { join } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.runSync(join([{ holder: 1, value: 10 }], [{ holder: 2, value: 20 }]))
 * ```
 */
export const join = Effect.fn("Cell.join")(function* (
  left: ReadonlyArray<Observation>,
  right: ReadonlyArray<Observation>,
): Effect.fn.Return<ReadonlyArray<Observation>, StructuralRefusal> {
  return yield* canonicalize([...left, ...right])
})

/** Canonicalizes an observation set and derives the state's identity. */
export const stateOf = Effect.fn("Cell.stateOf")(function* (
  observations: ReadonlyArray<Observation>,
): Effect.fn.Return<CellState, StructuralRefusal> {
  const canonical = yield* canonicalize(observations)
  return { observations: canonical, digest: yield* digestOf(canonical) }
})

/** The state of a cell no replica has written. */
export const empty: Effect.Effect<CellState, StructuralRefusal> = stateOf([])

/**
 * One process's local join of everything it has observed.
 *
 * **What it is.** `current` is this process's join, `changes` is the monotone
 * stream of those joins, and `absorb` merges an observed remote state into it.
 * Convergence is by construction: absorbing is the same join the fabric writes
 * with, so a replica that absorbed the same observations holds byte-identical
 * state (`f1_cell_extensional` plus the declared canonical order).
 *
 * **What licenses it, by name.** `cell_absorb_inflationary` — absorbing an
 * observation never shrinks the local join — and `cell_le_iff_subset` — the
 * derived order IS observation-set inclusion. Together they make "my local view
 * is a lattice lower bound of the truth" a theorem rather than a hope.
 *
 * **What it does NOT claim.** No freshness: `current` is a LOWER BOUND,
 * head-relative, and the fabric may hold strictly more. No absence reasoning:
 * "the replica does not contain X" is a statement about this process's
 * observation history and never about the fabric — read absence head-relative
 * from the cell instead. No durability role: the substrate is already durable,
 * so a replica exists for latency and read amplification, and losing every
 * replica loses nothing but time. No cross-replica agreement beyond F1's
 * convergence.
 *
 * **How it is fed.** By polling `Cells.read` and absorbing the result — that is
 * the licensed feed today. A KV watch feed waits on its own ruled ticket, and
 * would be advisory even then: a subscriber that misses intermediate `changes`
 * values loses nothing, because by F1 the latest local join absorbs every state
 * it skipped, but no absence may ever be inferred from a feed.
 */
export interface CellReplica {
  /** This process's current local join — a lattice lower bound of the truth. */
  readonly current: Effect.Effect<CellState>
  /** The current local join and every later one; coalescing is harmless by F1. */
  readonly changes: Stream.Stream<CellState>
  /** Merges an observed state into the local join. */
  readonly absorb: (
    observed: ReadonlyArray<Observation>,
  ) => Effect.Effect<void, StructuralRefusal>
}

/**
 * Builds a local replica seeded with an observation set — the empty set for a
 * replica that has observed nothing yet.
 *
 * `absorb` is effectful because the join is: `Cell.join` refuses values outside
 * the RFC 8785 wire grammar, so the replica rides `SubscriptionRef.updateEffect`
 * rather than `update` and carries the structural channel honestly. On
 * decode-verified observations that refusal cannot fire — `holder` and `value`
 * are `Schema.Json` by the `Observation` schema — but the type does not lie
 * about the composition.
 *
 * @example
 * ```ts
 * import { replica } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.runSync(Effect.gen(function* () {
 *   const local = yield* replica()
 *   yield* local.absorb([{ holder: "seat-a", value: 1 }])
 *   return (yield* local.current).observations
 * }))
 * // [{ holder: "seat-a", value: 1 }]
 * ```
 */
export const replica = Effect.fn("Cell.replica")(function* (
  initial: ReadonlyArray<Observation> = [],
): Effect.fn.Return<CellReplica, StructuralRefusal> {
  const state = yield* SubscriptionRef.make(yield* stateOf(initial))
  return {
    current: SubscriptionRef.get(state),
    changes: SubscriptionRef.changes(state),
    absorb: (observed) =>
      SubscriptionRef.updateEffect(state, (local) =>
        Effect.flatMap(join(local.observations, observed), stateOf)),
  }
})

/**
 * Scope-owned lattice cells over the ruled `flb-fab-cell` bucket.
 *
 * @example
 * ```ts
 * import { Cells, cellName } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const cells = yield* Cells
 *   const cell = yield* cellName("membership")
 *   return yield* cells.merge(cell, [{ holder: "seat-a", value: 1 }])
 * })
 * ```
 */
export class Cells extends Context.Service<Cells, CellService>()(
  "@foldlab/plait/Cells",
) {
  /** Builds a scope-owned live NATS KV implementation. */
  static readonly layer = (options: CellOptions): Layer.Layer<Cells, Refusal> =>
    Layer.effect(Cells, makeCellService(options))

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (service: CellService): Layer.Layer<Cells> =>
    Layer.succeed(Cells, Cells.of(service))
}
