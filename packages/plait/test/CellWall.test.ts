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
   * T16's discriminating row.
   *
   * Contention alone does NOT separate subsumption from byte-equality: under a
   * CAS-class failure the loop's own idempotence guard re-reads and catches a
   * rival's superset on the next attempt, so both disciplines land the same
   * state and neither exhausts the attempt bound. The separating schedule is
   * the one T16 names — a TRANSPORT-class failure whose read-back carries the
   * delta because a rival's join subsumed it. The tap discards the write frame
   * while leaving the connection open, so the write times out transport-class
   * and the same connection's reconciliation read still reaches the server.
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
