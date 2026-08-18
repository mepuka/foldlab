import { afterAll, describe, expect, test } from "bun:test"
import { resolve as resolvePath } from "node:path"

import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Fiber, Layer, Result, Schema } from "effect"

import { byteEqualityLayer } from "../negative-controls/cell-byte-equality-mutant.js"
import { lastWriterWinsLayer } from "../negative-controls/cell-lww-mutant.js"
import { canonicalBytes } from "../src/Canonical.js"
import {
  CELL_BUCKET,
  CELL_HISTORY,
  CELL_MERGE_ATTEMPTS,
  Cells,
  join,
  stateOf,
  type CellService,
  type CellState,
  type Observation,
} from "../src/Cell.js"
import type { Digest } from "../src/Digest.js"
import type { Refusal } from "../src/Refusal.js"
import {
  bucketPublishPrefixes,
  startHoldProxy,
  startInterposingProxy,
  type HoldProxy,
} from "./HoldProxy.js"
import {
  buildServerBinary,
  startNatsServer,
  type NatsHarness,
  type NatsServerBinary,
} from "./NatsHarness.js"

const Pair = Schema.Tuple([Schema.Number, Schema.Number])
const Header = Schema.Struct({
  command: Schema.String,
  counts: Schema.Record(Schema.String, Schema.Number),
  format: Schema.Literal(1),
  generator: Schema.String,
  vectors: Schema.Number,
})
const Kind = Schema.Struct({ kind: Schema.String })
const F1Row = Schema.Struct({
  kind: Schema.Literal("F1"),
  name: Schema.String,
  witness: Schema.String,
  input: Schema.Struct({ left: Schema.Array(Pair), right: Schema.Array(Pair) }),
  verdict: Schema.Struct({ commutes: Schema.Boolean, state: Schema.Array(Pair) }),
})
type F1Row = typeof F1Row.Type
const F2Row = Schema.Struct({
  kind: Schema.Literal("F2"),
  name: Schema.String,
  witness: Schema.String,
  input: Schema.Struct({ deliveries: Schema.Array(Pair) }),
  verdict: Schema.Struct({
    matchesExact: Schema.optionalKey(Schema.Boolean),
    matchesSequential: Schema.optionalKey(Schema.Boolean),
    state: Schema.Array(Pair),
  }),
})
type F2Row = typeof F2Row.Type

const corpus = resolvePath(import.meta.dir, "../fixtures/fabric-conformance.ndjson")
const mutantTrace = resolvePath(
  import.meta.dir,
  "../negative-controls/cell-lww-mutant.trace.json",
)
const byteEqualityTrace = resolvePath(
  import.meta.dir,
  "../negative-controls/cell-byte-equality-mutant.trace.json",
)
const boundaryTrace = resolvePath(
  import.meta.dir,
  "../negative-controls/cell-retry-boundary.trace.json",
)

const observationOf = ([holder, value]: readonly [number, number]): Observation =>
  ({ holder, value }) as Observation

/** The digest of the observation set a model verdict names. */
const modelDigest = (
  pairs: ReadonlyArray<readonly [number, number]>,
): Digest => Effect.runSync(stateOf(pairs.map(observationOf))).digest

const pinnedCount = (
  counts: { readonly [kind: string]: number },
  kind: string,
): number => {
  const count = counts[kind]
  if (count === undefined) throw new Error(`corpus header pins no ${kind} count`)
  return count
}

interface Families {
  readonly f1: ReadonlyArray<F1Row>
  readonly f2: ReadonlyArray<F2Row>
  readonly counts: { readonly [kind: string]: number }
}

/**
 * Loads the model-emitted corpus and its pinned counts. The wall replays the
 * F1 and F2 families only; every other family is another slice's, and the
 * count assertions below make a silent skip impossible.
 */
const loadFamilies = async (): Promise<Families> => {
  const lines = (await Bun.file(corpus).text()).trimEnd().split("\n")
  const header = Schema.decodeUnknownSync(Header)(JSON.parse(lines[0]!), {
    onExcessProperty: "error",
  })
  expect(header.generator).toBe("verify/fabric emitter")
  expect(header.command).toBe(
    "cd verify/fabric && lake exe emitter > ../../packages/plait/fixtures/fabric-conformance.ndjson",
  )
  const rows = lines.slice(1).map((line) => JSON.parse(line) as unknown)
  expect(rows).toHaveLength(header.vectors)
  const f1: Array<F1Row> = []
  const f2: Array<F2Row> = []
  for (const row of rows) {
    const { kind } = Schema.decodeUnknownSync(Kind)(row)
    if (kind === "F1") f1.push(Schema.decodeUnknownSync(F1Row)(row, { onExcessProperty: "error" }))
    if (kind === "F2") f2.push(Schema.decodeUnknownSync(F2Row)(row, { onExcessProperty: "error" }))
  }
  expect(f1).toHaveLength(pinnedCount(header.counts, "F1"))
  expect(f2).toHaveLength(pinnedCount(header.counts, "F2"))
  return { f1, f2, counts: header.counts }
}

/**
 * Row isolation is a distinct cell key on one server, not a fresh server per
 * row. The register wall needs a fresh backing-stream incarnation per row
 * because it asserts token NUMERICS; this wall asserts only cell state bytes,
 * which no revision order can move, so one incarnation is sound and honest.
 */
let built: NatsServerBinary | undefined
let harness: NatsHarness | undefined
let proxy: HoldProxy | undefined

/**
 * Built on first use, not in a hook: the pinned server is compiled from the Go
 * module lock, and a cold build outruns the default hook timeout.
 */
const server = async (): Promise<NatsHarness> => {
  if (harness !== undefined) return harness
  built = await buildServerBinary()
  harness = await startNatsServer(built.binary)
  return harness
}

const withCellsAt = <A>(
  url: string,
  use: (cells: CellService) => Effect.Effect<A, unknown>,
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const cells = yield* Cells
      return yield* use(cells)
    }).pipe(
      Effect.provide(Cells.layer({ servers: url })),
      Effect.scoped,
    ) as Effect.Effect<A, never>,
  )

const withCells = async <A>(
  use: (cells: CellService) => Effect.Effect<A, unknown>,
): Promise<A> => withCellsAt((await server()).url, use)

const serverUrl = async (): Promise<string> => (await server()).url

afterAll(async () => {
  if (proxy !== undefined) await proxy.stop()
  if (harness !== undefined) await harness.stop()
  if (built !== undefined) await built.cleanup()
})

describe("F1 cell wall — the fabric model's cell families replayed on the live KV bucket", () => {
  test("the bucket the cells land in carries the ruled shape", async () => {
    await withCells((cells) => cells.read("shapeprobe"))
    const connection = await connect({ servers: (await server()).url })
    try {
      const status = await new Kvm(connection).open(CELL_BUCKET).then((kv) => kv.status())
      expect(status.history).toBe(CELL_HISTORY)
      expect(status.ttl).toBe(0)
      expect(status.max_bytes).toBe(-1)
      expect(status.replicas).toBe(1)
    } finally {
      await connection.close()
    }
  }, 60_000)

  test("F1: both merge schedules converge on the model's state", async () => {
    const { f1, counts } = await loadFamilies()
    let replayed = 0
    for (const row of f1) {
      expect(row.witness).toStartWith("Fabric.emitter_")
      expect(row.verdict.commutes).toBe(true)
      const left = row.input.left.map(observationOf)
      const right = row.input.right.map(observationOf)
      const forward = await withCells((cells) =>
        Effect.gen(function* () {
          yield* cells.merge(`${row.name}-forward`, left)
          return yield* cells.merge(`${row.name}-forward`, right)
        })
      )
      const backward = await withCells((cells) =>
        Effect.gen(function* () {
          yield* cells.merge(`${row.name}-backward`, right)
          return yield* cells.merge(`${row.name}-backward`, left)
        })
      )
      expect(forward.digest).toBe(modelDigest(row.verdict.state))
      expect(backward.digest).toBe(forward.digest)
      // The state survives a re-read: convergence is of the stored bytes.
      const reread = await withCells((cells) => cells.read(`${row.name}-forward`))
      expect(reread.digest).toBe(forward.digest)
      replayed++
    }
    // The corpus header pins the family size, so a wave that grows the F1
    // family reds this wall rather than silently replaying a subset.
    expect(replayed).toBe(pinnedCount(counts, "F1"))
  }, 120_000)

  test("F2: duplicated and permuted delivery schedules reach the model's state", async () => {
    const { f2, counts } = await loadFamilies()
    let replayed = 0
    for (const row of f2) {
      expect(row.witness).toStartWith("Fabric.emitter_")
      expect(row.verdict.matchesExact ?? row.verdict.matchesSequential).toBe(true)
      const deliveries = row.input.deliveries.map(observationOf)
      const arrival = await withCells((cells) =>
        Effect.gen(function* () {
          let state = yield* cells.read(`${row.name}-arrival`)
          for (const delivery of deliveries) {
            state = yield* cells.merge(`${row.name}-arrival`, [delivery])
          }
          return state
        })
      )
      const reversed = await withCells((cells) =>
        Effect.gen(function* () {
          let state = yield* cells.read(`${row.name}-reversed`)
          for (const delivery of [...deliveries].reverse()) {
            state = yield* cells.merge(`${row.name}-reversed`, [delivery])
          }
          return state
        })
      )
      expect(arrival.digest).toBe(modelDigest(row.verdict.state))
      expect(reversed.digest).toBe(arrival.digest)
      replayed++
    }
    expect(replayed).toBe(pinnedCount(counts, "F2"))
  }, 120_000)

  test("a settled cell absorbs its own delta again without a write", async () => {
    const delta = [observationOf([1, 10]), observationOf([2, 20])]
    const first = await withCells((cells) => cells.merge("idempotence", delta))
    const again = await withCells((cells) => cells.merge("idempotence", [...delta].reverse()))
    expect(again.digest).toBe(first.digest)

    const connection = await connect({ servers: (await server()).url })
    try {
      const bucket = await new Kvm(connection).open(CELL_BUCKET)
      expect(await bucket.get("idempotence")).not.toBeNull()
      // One retained write: the second merge added nothing, so it wrote nothing.
      const history = await bucket.history({ key: "idempotence" })
      let writes = 0
      for await (const _ of history) writes++
      expect(writes).toBe(1)
    } finally {
      await connection.close()
    }
  }, 60_000)

  test("a lost CAS race re-reads and re-merges: no observation is dropped", async () => {
    const alpha = observationOf([1, 10])
    const beta = observationOf([2, 20])
    const gamma = observationOf([3, 30])
    const cell = "lostcas"

    await withCells((cells) => cells.merge(cell, [alpha]))

    // The tap freezes the merge's CAS append in flight; a rival revision lands
    // over a second connection and is acknowledged; the released append then
    // loses its CAS and the merge loop re-reads and re-merges. Every step is
    // barrier-awaited — no sleeps, no racing writers.
    proxy = await startHoldProxy((await server()).url, bucketPublishPrefixes(CELL_BUCKET))
    const tap = proxy
    const rival = Effect.runSync(canonicalBytes(Effect.runSync(join([alpha], [gamma]))))

    const converged = await withCellsAt(tap.url, (cells) =>
      Effect.gen(function* () {
        yield* Effect.sync(() => tap.arm())
        const merging = yield* Effect.forkChild(cells.merge(cell, [beta]))
        yield* Effect.promise(() => tap.captured())
        yield* Effect.promise(async () => {
          const raw = await connect({ servers: (await server()).url })
          try {
            const bucket = await new Kvm(raw).open(CELL_BUCKET)
            const entry = await bucket.get(cell)
            if (entry === null) throw new Error("the cell vanished before the rival write")
            await bucket.update(cell, rival, entry.revision)
          } finally {
            await raw.close()
          }
        })
        yield* Effect.sync(() => tap.release())
        return yield* Fiber.join(merging)
      }))

    // Convergence, not last-writer-wins: the rival's gamma and this merge's
    // beta are both present, on top of the alpha both started from.
    expect(converged.digest).toBe(modelDigest([[1, 10], [2, 20], [3, 30]]))
    const settled = await withCells((cells) => cells.read(cell))
    expect(settled.digest).toBe(converged.digest)
  }, 120_000)

  /**
   * T16's second discriminating row: the ambiguity case, at attempt 1.
   *
   * A TRANSPORT-class failure whose read-back carries the delta because a
   * rival's join subsumed it. Subsumption reports the converged state;
   * byte-equality cannot recognize the strict superstate, and because the
   * cause is not CAS-class it falls straight to the transport branch and
   * refuses a merge whose delta is already in the cell. The tap discards the
   * write frame while leaving the connection open, so the write fails
   * transport-class and the same connection's reconciliation read still lands.
   *
   * This is a DISTINCT result class from the retry-boundary row below — an
   * attempt-1 absence refusal rather than an attempt-8 exhaustion — and it
   * does not stand in for it.
   */
  const subsumedByRival = async (
    layer: (options: { readonly servers: string }) => Layer.Layer<Cells, unknown>,
    cell: string,
  ): Promise<Result.Result<CellState, Refusal>> => {
    const alpha = observationOf([1, 10])
    const beta = observationOf([2, 20])
    const gamma = observationOf([3, 30])
    const url = (await server()).url

    await withCells((cells) => cells.merge(cell, [alpha]))
    // The rival's write is a superset of this merge's delta: it carries beta.
    const rival = Effect.runSync(canonicalBytes(Effect.runSync(join([alpha, beta], [gamma]))))

    if (proxy !== undefined) await proxy.stop()
    proxy = await startHoldProxy(url, bucketPublishPrefixes(CELL_BUCKET))
    const tap = proxy

    return Effect.runPromise(
      Effect.gen(function* () {
        const cells = yield* Cells
        yield* Effect.sync(() => tap.arm())
        const merging = yield* Effect.forkChild(Effect.result(cells.merge(cell, [beta])))
        yield* Effect.promise(() => tap.captured())
        yield* Effect.promise(async () => {
          const raw = await connect({ servers: url })
          try {
            const bucket = await new Kvm(raw).open(CELL_BUCKET)
            const entry = await bucket.get(cell)
            if (entry === null) throw new Error("the cell vanished before the rival write")
            await bucket.update(cell, rival, entry.revision)
          } finally {
            await raw.close()
          }
        })
        yield* Effect.sync(() => tap.discard())
        return yield* Fiber.join(merging)
      }).pipe(
        Effect.provide(layer({ servers: tap.url })),
        Effect.scoped,
      ) as Effect.Effect<Result.Result<CellState, Refusal>, never>,
    )
  }

  test("T16: a rival's subsuming join is convergence under subsumption and a refusal under byte-equality", async () => {
    const lawful = await subsumedByRival(Cells.layer, "subsumed-lawful")
    expect(Result.isSuccess(lawful)).toBe(true)
    if (!Result.isSuccess(lawful)) throw new Error("the lawful merge did not converge")
    // The delta is in the cell — carried there by the rival's join — so the
    // merge reports the converged state rather than fighting for its own write.
    expect(lawful.success.digest).toBe(modelDigest([[1, 10], [2, 20], [3, 30]]))

    const mutant = await subsumedByRival(byteEqualityLayer, "subsumed-byte-equality")
    expect(Result.isFailure(mutant)).toBe(true)
    if (!Result.isFailure(mutant)) throw new Error("byte-equality reconciliation did not refuse")
    expect(mutant.failure.sort).toBe("absence")
    expect(mutant.failure.kind).toBe("cell-transport-unavailable")

    // The mutant refused a merge whose delta the cell already carries: its own
    // read-back holds beta, and it reported unavailability anyway.
    const settled = await withCells((cells) => cells.read("subsumed-byte-equality"))
    expect(settled.digest).toBe(modelDigest([[1, 10], [2, 20], [3, 30]]))

    const record = {
      control: "runtime-cell-byte-equality-mutant",
      decision: "T16",
      schedule: "transport-class write failure whose read-back carries the delta (rival join subsumed it)",
      lawfulVerdict: "converged",
      lawfulStateDigest: lawful.success.digest,
      mutantVerdict: "refused",
      mutantRefusal: { sort: mutant.failure.sort, kind: mutant.failure.kind },
      cellStateAfterMutantRefusal: settled.digest,
      violatedLaw:
        "a read-back that already carries the delta is success, whether this append landed or a rival join subsumed it",
    }
    expect(JSON.stringify(record, null, 2) + "\n").toBe(
      await Bun.file(byteEqualityTrace).text(),
    )
  }, 180_000)

  /**
   * T16's ruled discriminator: the retry boundary.
   *
   * Attempts 1..7 each lose their CAS to a lawful rival join whose read-back
   * still lacks this delta, so both disciplines retry identically. Attempt 8 —
   * the last the bound permits — loses to a rival join that carries this delta
   * plus one fresh observation, so the read-back is a STRICT superstate of the
   * stale intended record. Subsumption sees the merge postcondition already
   * established and returns success inside attempt 8. Byte-equality rejects
   * the superstate, and there is no ninth pre-CAS guard to rescue it, so it
   * reports contention over a cell that already carries the delta.
   *
   * The pre-CAS guard is exactly why nothing before the boundary discriminates
   * and exactly why the boundary does: it runs at the TOP of an attempt, and
   * attempt 8 has no successor.
   */
  const contendedToExhaustion = async (
    layer: (options: { readonly servers: string }) => Layer.Layer<Cells, unknown>,
    cell: string,
  ): Promise<{
    readonly result: Result.Result<CellState, Refusal>
    readonly casAttempts: number
    readonly finalState: ReadonlyArray<Observation>
  }> => {
    const url = await serverUrl()
    const alpha = observationOf([1, 10])
    const beta = observationOf([2, 20])
    const filler = (k: number): Observation => observationOf([100 + k, 1000 + k])

    await withCells((cells) => cells.merge(cell, [alpha]))

    // Every rival write is a lawful join — inflationary, never a replacement —
    // so the schedule stays inside the cell invariant the whole way.
    const rivals: Array<ReadonlyArray<Observation>> = []
    let accumulated: ReadonlyArray<Observation> = [alpha]
    for (let k = 1; k < CELL_MERGE_ATTEMPTS; k++) {
      accumulated = Effect.runSync(join(accumulated, [filler(k)]))
      rivals.push(accumulated)
    }
    // The last rival carries this merge's own delta PLUS one fresh observation,
    // so the read-back is strictly above the intended record rather than equal
    // to it — which is the whole difference between the two disciplines.
    accumulated = Effect.runSync(join(accumulated, [beta, filler(CELL_MERGE_ATTEMPTS)]))
    rivals.push(accumulated)

    const landRival = async (index: number): Promise<void> => {
      const state = rivals[index - 1]
      if (state === undefined) return
      const bytes = Effect.runSync(canonicalBytes(state))
      const raw = await connect({ servers: url })
      try {
        const bucket = await new Kvm(raw).open(CELL_BUCKET)
        const entry = await bucket.get(cell)
        if (entry === null) throw new Error("the cell vanished before the rival write")
        await bucket.update(cell, bytes, entry.revision)
      } finally {
        await raw.close()
      }
    }

    const tap = await startInterposingProxy(
      url,
      bucketPublishPrefixes(CELL_BUCKET),
      landRival,
    )
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cells = yield* Cells
          return yield* Effect.result(cells.merge(cell, [beta]))
        }).pipe(
          Effect.provide(layer({ servers: tap.url })),
          Effect.scoped,
        ) as Effect.Effect<Result.Result<CellState, Refusal>, never>,
      )
      return { result, casAttempts: tap.interceptions(), finalState: accumulated }
    } finally {
      await tap.stop()
    }
  }

  test("T16: at the retry boundary a subsuming rival is success under subsumption and exhaustion under byte-equality", async () => {
    const lawful = await contendedToExhaustion(Cells.layer, "boundary-lawful")
    expect(lawful.casAttempts).toBe(CELL_MERGE_ATTEMPTS)
    expect(Result.isSuccess(lawful.result)).toBe(true)
    if (!Result.isSuccess(lawful.result)) throw new Error("the lawful merge did not converge")
    expect(lawful.result.success.digest).toBe(
      Effect.runSync(stateOf(lawful.finalState)).digest,
    )

    const mutant = await contendedToExhaustion(byteEqualityLayer, "boundary-byte-equality")
    expect(mutant.casAttempts).toBe(CELL_MERGE_ATTEMPTS)
    expect(Result.isFailure(mutant.result)).toBe(true)
    if (!Result.isFailure(mutant.result)) {
      throw new Error("byte-equality reconciliation did not exhaust the attempt bound")
    }
    expect(mutant.result.failure.sort).toBe("absence")
    expect(mutant.result.failure.kind).toBe("cell-update-contended")

    // Both ran the same schedule and the same number of CAS attempts; the cell
    // carries the delta in both cases. Only the result classification differs.
    const settled = await withCells((cells) => cells.read("boundary-byte-equality"))
    expect(settled.digest).toBe(Effect.runSync(stateOf(mutant.finalState)).digest)

    const record = {
      control: "runtime-cell-byte-equality-mutant",
      decision: "T16",
      schedule:
        "attempts 1..7 lose CAS to rival joins lacking the delta; attempt 8 loses to a strict superstate carrying it",
      attemptBound: CELL_MERGE_ATTEMPTS,
      lawfulVerdict: "converged",
      lawfulCasAttempts: lawful.casAttempts,
      lawfulStateDigest: lawful.result.success.digest,
      mutantVerdict: "exhausted",
      mutantCasAttempts: mutant.casAttempts,
      mutantRefusal: { sort: mutant.result.failure.sort, kind: mutant.result.failure.kind },
      cellStateAfterMutantRefusal: settled.digest,
      violatedLaw:
        "a read-back that already carries the delta is success, whether this append landed or a rival join subsumed it",
    }
    expect(JSON.stringify(record, null, 2) + "\n").toBe(
      await Bun.file(boundaryTrace).text(),
    )
  }, 300_000)

  test("the real merge path minus its join is killed by cell-merge-aci on the live bucket", async () => {
    const { f1 } = await loadFamilies()
    const row = f1.find(({ name }) => name === "cell-merge-aci")
    expect(row).toBeDefined()
    const left = row!.input.left.map(observationOf)
    const right = row!.input.right.map(observationOf)

    // The mutant is makeCellService with exactly the join deleted, so it
    // ensures its own bucket and runs the SAME two schedules through the same
    // shipped write path the lawful cells just converged on.
    const mutantUrl = await serverUrl()
    const mutantMerge = (cell: string, delta: ReadonlyArray<Observation>): Promise<unknown> =>
      Effect.runPromise(
        Effect.gen(function* () {
          const cells = yield* Cells
          return yield* cells.merge(cell, delta)
        }).pipe(
          Effect.provide(lastWriterWinsLayer({ servers: mutantUrl })),
          Effect.scoped,
        ) as Effect.Effect<unknown, never>,
      )
    await mutantMerge("mutant-forward", left)
    await mutantMerge("mutant-forward", right)
    await mutantMerge("mutant-backward", right)
    await mutantMerge("mutant-backward", left)

    const forward = await withCells((cells) => cells.read("mutant-forward"))
    const backward = await withCells((cells) => cells.read("mutant-backward"))
    const expected = modelDigest(row!.verdict.state)

    expect(forward.digest).not.toBe(expected)
    expect(backward.digest).not.toBe(expected)
    expect(forward.digest).not.toBe(backward.digest)

    const record = {
      control: "runtime-cell-lww-mutant",
      corpusRow: row!.name,
      corpusWitness: row!.witness,
      corpusVerdict: { commutes: row!.verdict.commutes, state: row!.verdict.state },
      modelStateDigest: expected,
      mutantForwardState: forward.observations,
      mutantBackwardState: backward.observations,
      schedulesAgree: forward.digest === backward.digest,
      violatedLaw:
        "cells merge by join before write; a lost CAS race re-reads and re-merges",
    }
    expect(JSON.stringify(record, null, 2) + "\n").toBe(await Bun.file(mutantTrace).text())
  }, 120_000)
})
