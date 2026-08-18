import { afterEach, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect } from "effect"

import { ANCHOR_BUCKET, type Anchor } from "../src/Anchor.js"
import { digestOf } from "../src/Digest.js"
import * as Lane from "../src/Lane.js"
import { runRedeliveryChaos } from "../src/internal/chaos.js"
import { declareChaosCounter, type ChaosEvent } from "./ChaosFixture.js"
import { startNatsHarness, type NatsHarness, waitForFile } from "./NatsHarness.js"

interface PumpResult {
  readonly anchors: ReadonlyArray<Anchor>
  readonly scoreboard: {
    readonly messages: number
    readonly redeliveriesAbsorbed: number
    readonly anchorWrites: number
  }
}

type ChaosLane = Lane.DeclaredLane<ChaosEvent, 2>

const processes = new Set<ReturnType<typeof Bun.spawn>>()
let harness: NatsHarness | undefined

afterEach(async () => {
  for (const process of processes) {
    if (process.exitCode === null) process.kill()
    await process.exited
  }
  processes.clear()
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const stderr = async (process: ReturnType<typeof Bun.spawn>): Promise<string> =>
  process.stderr instanceof ReadableStream
    ? await new Response(process.stderr).text()
    : ""

const spawnPump = (options: {
  readonly url: string
  readonly handle: string
  readonly targets: ReadonlyArray<number>
  readonly result: string
  readonly marker?: string
  readonly markerFloor?: number
}) => {
  const args = [
    "bun",
    "run",
    "./test/process/fold-pump.ts",
    options.url,
    options.handle,
    JSON.stringify(options.targets),
    options.result,
  ]
  if (options.marker !== undefined) {
    args.push(options.marker, String(options.markerFloor ?? 1))
  }
  const child = Bun.spawn({
    cmd: args,
    cwd: resolve(import.meta.dir, ".."),
    stdout: "ignore",
    stderr: "pipe",
  })
  processes.add(child)
  return child
}

const tenantsByPartition = async (
  lane: ChaosLane,
): Promise<readonly [string, string]> => {
  const tenants: Array<string | undefined> = [undefined, undefined]
  for (let index = 0; tenants.some((tenant) => tenant === undefined); index++) {
    const tenant = `tenant-${index}`
    const coordinate = await Effect.runPromise(Lane.partition(lane, { tenant, ordinal: index, delta: 1 }))
    tenants[coordinate.partition] ??= tenant
  }
  return tenants as unknown as readonly [string, string]
}

const emitEvents = async (
  url: string,
  lane: ChaosLane,
  events: ReadonlyArray<ChaosEvent>,
): Promise<ReadonlyArray<number>> => Effect.runPromise(Effect.gen(function* () {
  const targets = [0, 0]
  for (const event of events) {
    const emitted = yield* Lane.emit(lane, event, { holder: "chaos-gate" })
    targets[emitted.partition] = emitted.position
  }
  return targets
}).pipe(
  Effect.provide(Lane.Lanes.layer({ servers: url })),
  Effect.scoped,
))

const readResult = async (path: string): Promise<PumpResult> =>
  JSON.parse(await Bun.file(path).text()) as PumpResult

const waitForPumpFile = async (
  child: ReturnType<typeof Bun.spawn>,
  path: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (await Bun.file(path).exists()) return
    if (child.exitCode !== null) {
      throw new Error(`fold pump exited ${child.exitCode}: ${await stderr(child)}`)
    }
    await Bun.sleep(25)
  }
  throw new Error(`fold pump did not write ${path}`)
}

describe("real-substrate fold chaos", () => {
  test("the ack-before-anchor mutant loses the acknowledged successor after kill", async () => {
    harness = await startNatsHarness()
    const declaration = await Effect.runPromise(declareChaosCounter("chaos-ack-mutant"))
    const tenants = await tenantsByPartition(declaration.lane)
    const events: Array<ChaosEvent> = []
    for (let index = 0; index < 3; index++) {
      for (let partition = 0; partition < 2; partition++) {
        events.push({
          tenant: tenants[partition]!,
          ordinal: index * 2 + partition,
          delta: 1,
        })
      }
    }
    const targets = await emitEvents(harness.url, declaration.lane, events)
    const marker = join(harness.directory, "ack-before-anchor.json")
    const mutant = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "./test/process/ack-before-anchor.ts",
        harness.url,
        declaration.lane.handle,
        "0",
        marker,
      ],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "ignore",
      stderr: "pipe",
    })
    processes.add(mutant)
    await waitForFile(marker)
    mutant.kill(9)
    expect(await mutant.exited).not.toBe(0)

    const resultPath = join(harness.directory, "ack-mutant-result.json")
    const resumed = spawnPump({
      url: harness.url,
      handle: declaration.lane.handle,
      targets,
      result: resultPath,
    })
    await Bun.sleep(1_500)
    expect(await Bun.file(resultPath).exists()).toBe(false)

    const inspection = await connect({ servers: harness.url })
    try {
      const bucket = await new Kvm(inspection).open(ANCHOR_BUCKET)
      const key = `anchor.${declaration.fold.digest}.${declaration.lane.digest}.0`
      const entry = await bucket.get(key)
      if (entry === null) throw new Error("mutant resume did not create its anchor")
      const anchor = JSON.parse(entry.string()) as Anchor
      expect(anchor.floor).toBe(0)
      expect(anchor.stateDigest).not.toBe(await Effect.runPromise(digestOf(3)))
    } finally {
      await inspection.close()
    }
    resumed.kill(9)
    await resumed.exited
    const trace = "FOLD CONTROL: PASS component=anchor-before-ack mutant=ack-before-anchor killed-by=hard-kill-resume observed-floor=0 expected-floor=3"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.ack-before-anchor.trace.txt",
    )).text())
    console.info(trace)
  }, 120_000)

  test("NAK redelivers every event twice under a reordered arrival schedule", async () => {
    harness = await startNatsHarness()
    const declaration = await Effect.runPromise(declareChaosCounter("chaos-redelivery"))
    const tenants = await tenantsByPartition(declaration.lane)
    const lines = (await Bun.file(resolve(
      import.meta.dir,
      "../fixtures/fabric-conformance.ndjson",
    )).text()).trimEnd().split("\n")
    const model = lines.slice(1).map((line) => JSON.parse(line) as {
      readonly name: string
      readonly input: {
        readonly interleaved: ReadonlyArray<number>
        readonly partitions: ReadonlyArray<ReadonlyArray<number>>
      }
      readonly verdict: { readonly merged: number; readonly sequential: number }
    }).find((row) => row.name === "partition-interleaving")
    if (model === undefined) throw new Error("missing F4 partition-interleaving vector")
    const owner = new Map<number, number>()
    model.input.partitions.forEach((values, partition) => {
      for (const value of values) owner.set(value, partition)
    })
    const events = model.input.interleaved.map((delta, ordinal): ChaosEvent => {
      const partition = owner.get(delta)
      if (partition === undefined) throw new Error(`F4 value ${delta} has no partition`)
      return { tenant: tenants[partition]!, ordinal, delta }
    })
    const heads = await emitEvents(harness.url, declaration.lane, events)
    const result = await Effect.runPromise(runRedeliveryChaos({
      servers: harness.url,
      fold: declaration.fold,
      heads,
      seed: 712,
    }).pipe(Effect.scoped))

    expect(result.equal).toBe(true)
    expect(result.arrivalOrderDiverged).toBe(true)
    expect(result.eventsAdmitted).toBe(events.length)
    expect(result.eventsApplied).toBe(events.length)
    expect(result.arrivalsSuppressedAtFrontier).toBe(events.length * 2)
    expect(result.redeliveriesAbsorbed).toBe(events.length * 2)
    expect(result.bufferedOutOfOrderArrivals).toBeGreaterThan(0)
    expect(result.bufferedOutOfOrderDrained).toBe(result.bufferedOutOfOrderArrivals)
    const initial = declaration.algebra.reducer.initialValue
    const partitionStates = model.input.partitions.map((values) =>
      values.reduce(declaration.algebra.reducer.combine, initial))
    const merged = partitionStates.reduce(declaration.algebra.reducer.combine, initial)
    const sequential = model.input.interleaved.reduce(
      declaration.algebra.reducer.combine,
      initial,
    )
    expect(result.referenceDigests).toEqual(await Promise.all(
      partitionStates.map((state) => Effect.runPromise(digestOf(state))),
    ))
    expect(merged).toBe(model.verdict.merged)
    expect(sequential).toBe(model.verdict.sequential)
    expect(merged).toBe(sequential)
    const trace = `FOLD CHAOS: PASS protocol=NAK redeliveries=${result.redeliveriesAbsorbed} buffered=${result.bufferedOutOfOrderArrivals} drained=${result.bufferedOutOfOrderDrained} successor-equal=true arrival-order-mutant-diverged=true`
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.protocol-redelivery.trace.txt",
    )).text())
    console.info(trace)
  }, 120_000)

  test("a hard-killed pump resumes to the uninterrupted per-partition digests", async () => {
    harness = await startNatsHarness()
    const killedDeclaration = await Effect.runPromise(declareChaosCounter("chaos-killed"))
    const referenceDeclaration = await Effect.runPromise(declareChaosCounter("chaos-reference"))
    const tenants = await tenantsByPartition(killedDeclaration.lane)
    const referenceTenants = await tenantsByPartition(referenceDeclaration.lane)
    const perPartition = 100
    const killedEvents: Array<ChaosEvent> = []
    const referenceEvents: Array<ChaosEvent> = []
    for (let index = 0; index < perPartition; index++) {
      for (let partition = 0; partition < 2; partition++) {
        const ordinal = index * 2 + partition
        killedEvents.push({ tenant: tenants[partition]!, ordinal, delta: 1 })
        referenceEvents.push({ tenant: referenceTenants[partition]!, ordinal, delta: 1 })
      }
    }
    const killedTargets = await emitEvents(harness.url, killedDeclaration.lane, killedEvents)
    const referenceTargets = await emitEvents(harness.url, referenceDeclaration.lane, referenceEvents)
    expect(killedTargets).toEqual([perPartition, perPartition])
    expect(referenceTargets).toEqual([perPartition, perPartition])

    const killedResultPath = join(harness.directory, "killed-result.json")
    const markerPath = join(harness.directory, "kill-marker.json")
    const first = spawnPump({
      url: harness.url,
      handle: killedDeclaration.lane.handle,
      targets: killedTargets,
      result: killedResultPath,
      marker: markerPath,
      markerFloor: 4,
    })
    await waitForFile(markerPath)
    first.kill(9)
    const killedExit = await first.exited
    expect(killedExit).not.toBe(0)

    const inspection = await connect({ servers: harness.url })
    try {
      const bucket = await new Kvm(inspection).open(ANCHOR_BUCKET)
      const interrupted: Array<Anchor> = []
      for (let partition = 0; partition < 2; partition++) {
        const key = `anchor.${killedDeclaration.fold.digest}.${killedDeclaration.lane.digest}.${partition}`
        const entry = await bucket.get(key)
        if (entry === null) throw new Error(`missing interrupted anchor ${partition}`)
        interrupted.push(JSON.parse(entry.string()) as Anchor)
      }
      expect(interrupted.some((anchor, partition) => anchor.floor < killedTargets[partition]!)).toBe(true)
    } finally {
      await inspection.close()
    }

    const resumed = spawnPump({
      url: harness.url,
      handle: killedDeclaration.lane.handle,
      targets: killedTargets,
      result: killedResultPath,
    })
    await waitForPumpFile(resumed, killedResultPath)
    expect(await resumed.exited, await stderr(resumed)).toBe(0)

    const referencePath = join(harness.directory, "reference-result.json")
    const reference = spawnPump({
      url: harness.url,
      handle: referenceDeclaration.lane.handle,
      targets: referenceTargets,
      result: referencePath,
    })
    await waitForPumpFile(reference, referencePath)
    expect(await reference.exited, await stderr(reference)).toBe(0)

    const [resumedResult, referenceResult] = await Promise.all([
      readResult(killedResultPath),
      readResult(referencePath),
    ])
    const expectedPartitionDigest = await Effect.runPromise(digestOf(perPartition))
    expect(resumedResult.anchors.map((anchor) => anchor.stateDigest)).toEqual(
      referenceResult.anchors.map((anchor) => anchor.stateDigest),
    )
    expect(resumedResult.anchors.every((anchor) => anchor.stateDigest === expectedPartitionDigest))
      .toBe(true)
    expect(perPartition * 2).toBe(killedEvents.reduce((sum, event) => sum + event.delta, 0))
    console.info(
      `FOLD CHAOS: PASS hard-kill=signal-9 partitions=2 events=${killedEvents.length} resumed-anchor-writes=${resumedResult.scoreboard.anchorWrites} state-digest-equality=true`,
    )
  }, 120_000)
})
