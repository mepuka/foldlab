/**
 * Lattice cells: the join, the merge-then-`update(rev)` write loop, and the
 * cell service over the ruled `flb-fab-cell` KV bucket.
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
 * **No watch surface ships.** Watch is admitted advisory-only behind a ninth
 * probe suite on the substrate gate (KV watch semantics at the pin: initial
 * replay, coalescing, delete markers, resume-from-revision). That suite is not
 * merged — the substrate gate carries eight suites — so this module ships
 * read and merge only, and no absence may ever be inferred from either.
 *
 * Incarnation bound: KV revisions are backing-stream sequences, so every claim
 * this module's walls make holds within a fixed backing-stream incarnation;
 * administrative lifecycle mutation is outside the credential guard.
 *
 * @module
 */
import { Context, Effect, Layer, Schema } from "effect"

import { canonicalBytes } from "./Canonical.js"
import { digestOf, type Digest } from "./Digest.js"
import type { Refusal, StructuralRefusal } from "./Refusal.js"
import { makeCellService } from "./internal/cells.js"

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
  holder: Schema.Json,
  value: Schema.Json,
})

/** One holder-attributed observation: the only delta the evidence alphabet admits. */
export type Observation = typeof Observation.Type

/** The canonical observation set stored at one cell key, with its identity. */
export interface CellState {
  readonly observations: ReadonlyArray<Observation>
  readonly digest: Digest
}

/** Connection bootstrap for the cell bucket. */
export interface CellOptions {
  readonly servers: string | ReadonlyArray<string>
  readonly connectionName?: string
}

/**
 * Reads a cell and joins a delta into it.
 *
 * `merge` takes only a join: a lost CAS race re-reads and re-merges, which is
 * convergent by F1. There is no last-writer-wins path and no conflict callback.
 */
export interface CellService {
  readonly read: (cell: string) => Effect.Effect<CellState, Refusal>
  readonly merge: (
    cell: string,
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
 * Scope-owned lattice cells over the ruled `flb-fab-cell` bucket.
 *
 * @example
 * ```ts
 * import { Cells } from "@foldlab/plait/Cell"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const cells = yield* Cells
 *   return yield* cells.merge("membership", [{ holder: "seat-a", value: 1 }])
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
