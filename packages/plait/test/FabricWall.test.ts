import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import { Effect } from "effect"

import { initial } from "../src/Anchor.js"
import type { WireValue } from "../src/Canonical.js"
import { digestOf } from "../src/Digest.js"
import {
  arrivalOrderReplay,
  replaySuccessors,
  type PositionedEvent,
} from "../src/internal/successors.js"

interface CorpusRow {
  readonly kind: string
  readonly name: string
  readonly input: Record<string, unknown>
  readonly verdict: Record<string, unknown>
  readonly witness: string
}

const fixture = resolve(import.meta.dir, "../fixtures/fabric-conformance.ndjson")

const consumedFamilies = new Set(["F2", "F2b", "F3", "F3-F2b", "F4"])

const exclusions = {
  "cell-merge-aci": "F1 belongs to E6 Cell.ts",
  "non-commuting-intruder": "alphabet admission is slice 0's envelope/lane wall",
  "attenuation-request-clamped": "F9 belongs to the action plane",
  "delegation-tree-attenuation": "F9 belongs to the action plane",
} as const

const f2bCounts: Readonly<Record<string, number>> = {
  "floor-violating-stale-replay": 2,
  "duplicate-current-delivery": 2,
  "bounded-reordered-delivery": 2,
  "ahead-of-ceiling-arrival": 2,
  "multi-gap-window": 4,
  "redeliver-everything-twice-shuffled": 3,
}

const positioned = async <Event extends WireValue>(
  position: number,
  event: Event,
): Promise<PositionedEvent<Event>> => ({
  position,
  event,
  digest: await Effect.runPromise(digestOf({ position, event })),
})

const replayF2 = async (row: CorpusRow): Promise<WireValue> => {
  const raw = row.input.deliveries as ReadonlyArray<readonly [number, number]>
  const deliveries = await Promise.all(raw.map(([position, operation]) =>
    positioned(position, [position, operation] as const)))
  const anchor = await Effect.runPromise(initial([]))
  const result = await Effect.runPromise(replaySuccessors({
    anchor,
    state: [] as ReadonlyArray<readonly [number, number]>,
    deliveries,
    step: (state, event) => [...state, event],
  }))
  return result.state
}

const replayF2b = async (
  row: CorpusRow,
  state: number | ReadonlyArray<number> = Array.isArray(row.verdict.exact) ? [] : 0,
): Promise<WireValue> => {
  const floor = row.input.floor as number
  const raw = row.input.deliveries as ReadonlyArray<{
    readonly operation: number
    readonly position: number
  }>
  const deliveries = await Promise.all(raw.map((delivery) =>
    positioned(delivery.position, delivery.operation)))
  const start = await Effect.runPromise(initial(state))
  const count = f2bCounts[row.name]
  if (count === undefined) throw new Error(`missing pinned window count for ${row.name}`)
  const result = await Effect.runPromise(replaySuccessors({
    anchor: { ...start, floor },
    state,
    deliveries,
    count,
    step: Array.isArray(state)
      ? (current, event) => [...current as ReadonlyArray<number>, event]
      : (current, event) => current as number + event,
  }))
  return result.state as WireValue
}

const replayArrivalOrderF2b = async (row: CorpusRow): Promise<WireValue> => {
  const state: number | ReadonlyArray<number> = Array.isArray(row.verdict.exact) ? [] : 0
  const deliveries = await Promise.all((row.input.deliveries as ReadonlyArray<{
    readonly operation: number
    readonly position: number
  }>).map((delivery) => positioned(delivery.position, delivery.operation)))
  const start = await Effect.runPromise(initial(state))
  const result = await Effect.runPromise(arrivalOrderReplay({
    anchor: { ...start, floor: row.input.floor as number },
    state,
    deliveries,
    step: Array.isArray(state)
      ? (current, event) => [...current as ReadonlyArray<number>, event]
      : (current, event) => current as number + event,
  }))
  return result.state as WireValue
}

const replayRow = async (row: CorpusRow): Promise<WireValue> => {
  switch (row.name) {
    case "duplicated-deliveries":
    case "permuted-evidence-schedule":
      return replayF2(row)
    case "floor-violating-stale-replay":
    case "duplicate-current-delivery":
    case "bounded-reordered-delivery":
    case "ahead-of-ceiling-arrival":
    case "multi-gap-window":
    case "redeliver-everything-twice-shuffled":
      return replayF2b(row)
    case "checkpoint-resume": {
      const prefix = row.input.prefix as ReadonlyArray<number>
      const suffix = row.input.suffix as ReadonlyArray<number>
      return [...prefix, ...suffix].reduce((state, value) => state + value, 0)
    }
    case "partition-interleaving": {
      const partitions = row.input.partitions as ReadonlyArray<ReadonlyArray<number>>
      return partitions.map((part) => part.reduce((sum, value) => sum + value, 0))
        .reduce((sum, value) => sum + value, 0)
    }
    case "resume-then-redeliver": {
      const prefix = row.input.prefix as ReadonlyArray<number>
      const deliveries = row.input.suffixDeliveries
      return replayF2b({
        ...row,
        input: { floor: row.input.checkpointFloor, deliveries },
        name: "bounded-reordered-delivery",
      }, prefix)
    }
    default:
      throw new Error(`unconsumed corpus row ${row.kind}/${row.name}`)
  }
}

const expectedState = (row: CorpusRow): WireValue => {
  if ("state" in row.verdict) return row.verdict.state as WireValue
  if ("guarded" in row.verdict) return row.verdict.guarded as WireValue
  if ("resumed" in row.verdict) return row.verdict.resumed as WireValue
  if ("complete" in row.verdict) return row.verdict.complete as WireValue
  if ("merged" in row.verdict) return row.verdict.merged as WireValue
  throw new Error(`row ${row.name} has no pinned terminal state`)
}

describe("verify/fabric runtime replay wall", () => {
  test("consumes every E4 family row with zero skips", async () => {
    const lines = (await Bun.file(fixture).text()).trimEnd().split("\n")
    const header = JSON.parse(lines[0]!) as { vectors: number; counts: Record<string, number> }
    const rows = lines.slice(1).map((line) => JSON.parse(line) as CorpusRow)

    const byName = new Map(rows.map((row) => [row.name, row]))
    expect(Object.keys(exclusions).filter((name) => !byName.has(name))).toEqual([])

    const expectedChecked = [...consumedFamilies].reduce((total, family) => {
      const count = header.counts[family]
      if (count === undefined) throw new Error(`missing consumed family count for ${family}`)
      return total + count
    }, 0)

    let checked = 0
    for (const row of rows.filter((candidate) => consumedFamilies.has(candidate.kind))) {
      expect(await replayRow(row)).toEqual(expectedState(row))
      expect(row.witness).toStartWith("Fabric.")
      checked += 1
    }
    expect(checked).toBe(expectedChecked)

    const unfamiliar = [...new Set(rows
      .filter((row) => !consumedFamilies.has(row.kind) && !(row.name in exclusions))
      .map((row) => row.kind))]

    for (const name of ["duplicate-current-delivery", "bounded-reordered-delivery"]) {
      const row = byName.get(name)!
      expect(await replayArrivalOrderF2b(row)).not.toEqual(expectedState(row))
    }
    const control = "FOLD CONTROL: PASS component=successor-discipline mutant=arrival-order killed-by=duplicate-current-delivery,bounded-reordered-delivery lawful=[2,3] mutant=[3,2]"
    expect(`${control}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.arrival-order.trace.txt",
    )).text())
    console.info(
      `FABRIC WALL: PASS consumed=${checked}/${expectedChecked} skipped-within-family=0 exclusions=${Object.entries(exclusions).map(([name, reason]) => `${name}(${reason})`).join(",")} unfamiliar=${unfamiliar.join(",") || "none"}`,
    )
  })

  test("refuses an unknown row inside a consumed family", async () => {
    await expect(replayRow({
      kind: "F2",
      name: "unknown-f2-row",
      input: {},
      verdict: {},
      witness: "Fabric.unknown",
    })).rejects.toThrow("unconsumed corpus row F2/unknown-f2-row")
  })
})
