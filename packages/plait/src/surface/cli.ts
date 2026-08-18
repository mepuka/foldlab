#!/usr/bin/env bun

/**
 * Plane: surface — entry points.
 *
 * @module
 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { jetstreamManager } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Predicate } from "effect"

import * as Algebra from "../truth/Algebra.js"
import type { Anchor } from "../planes/Anchor.js"
import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import {
  Folds,
  declare as declareFold,
  deploy,
  type DeclaredFold,
  type FoldScoreboard,
} from "../planes/Fold.js"
import * as Lane from "../planes/Lane.js"
import {
  StructuralRefusal,
  structuralRefusal,
  type Refusal,
} from "../truth/Refusal.js"
import {
  runRedeliveryChaos,
  type RedeliveryChaosResult,
} from "../internal/chaos.js"
import { laneStreamName } from "../internal/lanes.js"

type ChaosFold = DeclaredFold<WireValue, WireValue, number>
type Axis = "kill" | "duplicate" | "reorder"

interface CliOptions {
  readonly modulePath?: string
  readonly foldDigest?: string
  readonly lane?: string
  readonly head?: number
  readonly pinHead: boolean
  readonly axes: ReadonlyArray<Axis>
  readonly seed: number
  readonly repeat: number
  readonly output: "json" | "text"
  readonly report?: string
}

interface PumpResult {
  readonly anchors: ReadonlyArray<Anchor>
  readonly scoreboard: FoldScoreboard
}

interface KillMeasurement {
  readonly anchors: ReadonlyArray<Anchor>
  readonly resumeCoordinates: ReadonlyArray<number>
  readonly scoreboard: FoldScoreboard
  readonly equal: boolean
}

const cliRefusal = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
  note: string,
): StructuralRefusal => structuralRefusal({
  kind: "invalid-chaos-request",
  law: "plait chaos runs one pinned span of one admitted declared fold; no ambient head or arbitrary program is accepted.",
  path,
  got,
  expected,
  next: [{ subject: "plait chaos", note }],
})

const usage = "plait chaos <module-path> (--head <position> | --pin-head) [--lane <digest>] [--axis kill|duplicate|reorder] [--seed <n>] [--repeat <n>] [--output json|text] [--report <path>]"

const parseNatural = (name: string, value: string | undefined, minimum: number): number => {
  const parsed = value === undefined ? Number.NaN : Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw cliRefusal([name], value ?? "missing", `a safe integer >= ${minimum}`, usage)
  }
  return parsed
}

const parse = (args: ReadonlyArray<string>): CliOptions => {
  if (args[0] !== "chaos") throw cliRefusal(["command"], args[0] ?? "missing", "chaos", usage)
  let modulePath: string | undefined
  let foldDigest: string | undefined
  let lane: string | undefined
  let head: number | undefined
  let pinHead = false
  const axes: Array<Axis> = []
  let seed = 712
  let repeat = 1
  let output: "json" | "text" = "text"
  let report: string | undefined

  for (let index = 1; index < args.length; index++) {
    const argument = args[index]!
    if (!argument.startsWith("--")) {
      if (modulePath !== undefined) throw cliRefusal(["module"], argument, "one module path", usage)
      modulePath = argument
      continue
    }
    switch (argument) {
      case "--fold":
        foldDigest = args[++index]
        break
      case "--lane":
        lane = args[++index]
        break
      case "--head":
        head = parseNatural("head", args[++index], 1)
        break
      case "--pin-head":
        pinHead = true
        break
      case "--axis": {
        const axis = args[++index]
        if (axis !== "kill" && axis !== "duplicate" && axis !== "reorder") {
          throw cliRefusal(["axis"], axis ?? "missing", ["kill", "duplicate", "reorder"], usage)
        }
        axes.push(axis)
        break
      }
      case "--seed":
        seed = parseNatural("seed", args[++index], 0)
        break
      case "--repeat":
        repeat = parseNatural("repeat", args[++index], 1)
        break
      case "--output": {
        const selected = args[++index]
        if (selected !== "json" && selected !== "text") {
          throw cliRefusal(["output"], selected ?? "missing", ["json", "text"], usage)
        }
        output = selected
        break
      }
      case "--report":
        report = args[++index]
        if (report === undefined) throw cliRefusal(["report"], "missing", "one path", usage)
        break
      default:
        throw cliRefusal(["flag"], argument, "one declared plait chaos flag", usage)
    }
  }
  if (modulePath === undefined && foldDigest === undefined) {
    throw cliRefusal(["fold"], "missing", "a module path or --fold digest", usage)
  }
  if (modulePath !== undefined && foldDigest !== undefined) {
    throw cliRefusal(["fold"], "module path and digest", "exactly one fold selector", usage)
  }
  if (head === undefined && !pinHead) {
    throw cliRefusal(["head"], "unpinned", "--head <position> or --pin-head", "Pin the span before running either arm.")
  }
  if (head !== undefined && pinHead) {
    throw cliRefusal(["head"], "two head selectors", "exactly one head selector", usage)
  }
  const selectedAxes = axes.length === 0 ? ["kill", "duplicate", "reorder"] as const : axes
  if (repeat > 1 && selectedAxes.includes("kill")) {
    throw cliRefusal(
      ["repeat"],
      repeat,
      1,
      "The v0 hard-kill arm owns one immutable anchor namespace; repeat duplicate/reorder schedules or use a fresh fold declaration.",
    )
  }
  return {
    ...(modulePath === undefined ? {} : { modulePath }),
    ...(foldDigest === undefined ? {} : { foldDigest }),
    ...(lane === undefined ? {} : { lane }),
    ...(head === undefined ? {} : { head }),
    pinHead,
    axes: [...new Set(selectedAxes)],
    seed,
    repeat,
    output,
    ...(report === undefined ? {} : { report }),
  }
}

const looksLikeFold = (candidate: unknown): candidate is ChaosFold =>
  Predicate.isObject(candidate) &&
  Predicate.isObject(candidate.declaration) &&
  candidate.declaration.kind === "fold" &&
  typeof candidate.digest === "string" &&
  Predicate.isObject(candidate.lane) &&
  Predicate.isObject(candidate.lane.declaration) &&
  typeof candidate.lane.digest === "string" &&
  typeof candidate.lane.handle === "string" &&
  typeof candidate.lane.partitions === "number" &&
  Predicate.isObject(candidate.algebra) &&
  Predicate.isObject(candidate.algebra.declaration) &&
  Predicate.isObject(candidate.algebra.reducer) &&
  Predicate.isObject(candidate.contribution) &&
  typeof candidate.contribution.apply === "function" &&
  typeof candidate.step === "function"

const absoluteModulePath = (path: string): string => isAbsolute(path) ? path : resolve(process.cwd(), path)

const certifyFold = async (candidate: ChaosFold): Promise<ChaosFold> => {
  const lane = await Effect.runPromise(Lane.declare({
    handle: candidate.lane.handle,
    event: candidate.lane.event,
    eventSchema: candidate.lane.declaration.eventSchema,
    partitions: candidate.lane.partitions,
    partitionKey: candidate.lane.partitionKey,
  }))
  if (lane.digest !== candidate.lane.digest) {
    throw cliRefusal(
      ["module", "fold", "lane", "digest"],
      candidate.lane.digest,
      lane.digest,
      "Export the exact admitted lane returned by Lane.declare.",
    )
  }
  const algebra = await Effect.runPromise(Algebra.declare({
    declaration: candidate.algebra.declaration.definition,
    reducer: candidate.algebra.reducer,
  }))
  if (algebra.digest !== candidate.algebra.digest) {
    throw cliRefusal(
      ["module", "fold", "algebra", "digest"],
      candidate.algebra.digest,
      algebra.digest,
      "Export the exact admitted algebra returned by Algebra.declare.",
    )
  }
  const admitted = await Effect.runPromise(declareFold({
    lane,
    algebra: candidate.algebra as Algebra.CommutativeAlgebra<WireValue>,
    contribution: candidate.contribution,
  }))
  const exportedDigest = await Effect.runPromise(digestOf(candidate.declaration as unknown as WireValue))
  if (exportedDigest !== candidate.digest || admitted.digest !== candidate.digest) {
    throw cliRefusal(
      ["module", "fold", "digest"],
      candidate.digest,
      admitted.digest,
      "Export one internally consistent fold declaration returned by Fold.declare.",
    )
  }
  return admitted
}

const loadFold = async (modulePath: string): Promise<ChaosFold> => {
  let namespace: Record<string, unknown>
  try {
    namespace = await import(pathToFileURL(absoluteModulePath(modulePath)).href) as Record<string, unknown>
  } catch (cause) {
    throw cliRefusal(["module"], String(cause), "an importable module exporting one declared fold", usage)
  }
  const candidate = await Promise.resolve(namespace.fold ?? namespace.default)
  if (!looksLikeFold(candidate)) {
    throw cliRefusal(
      ["module", "fold"],
      candidate === undefined ? "missing" : "not a declared fold",
      "a `fold` or default export returned by Fold.declare",
      "Export the admitted fold value itself; plait chaos never invokes an arbitrary program export.",
    )
  }
  return certifyFold(candidate)
}

const readHeads = async (
  servers: string,
  fold: ChaosFold,
  requested: number | undefined,
): Promise<ReadonlyArray<number>> => {
  if (requested !== undefined) return Array.from({ length: fold.lane.partitions }, () => requested)
  const connection = await connect({ servers, name: "foldlab-plait-chaos-pin-head" })
  try {
    const manager = await jetstreamManager(connection)
    const heads: Array<number> = []
    for (let partition = 0; partition < fold.lane.partitions; partition++) {
      const info = await manager.streams.info(laneStreamName(fold.lane, partition))
      if (info.state.last_seq < 1) {
        throw cliRefusal(["head", String(partition)], 0, "a positive pinned stream head", "Emit a finite span before running chaos.")
      }
      heads.push(info.state.last_seq)
    }
    return heads
  } finally {
    await connection.close()
  }
}

const waitForJson = async <A>(
  path: string,
  child: ReturnType<typeof Bun.spawn>,
): Promise<A> => {
  let lastParseFailure = "file not created"
  for (let attempt = 0; attempt < 800; attempt++) {
    if (await Bun.file(path).exists()) {
      try {
        return JSON.parse(await Bun.file(path).text()) as A
      } catch (cause) {
        lastParseFailure = String(cause)
      }
    }
    if (child.exitCode !== null) {
      const stderr = child.stderr instanceof ReadableStream
        ? await new Response(child.stderr).text()
        : ""
      throw cliRefusal(
        ["kill", "child"],
        `${child.exitCode}: ${stderr}; ${lastParseFailure}`,
        "a live pump child and one complete JSON handoff",
        "Inspect the child refusal and substrate.",
      )
    }
    await Bun.sleep(25)
  }
  throw cliRefusal(
    ["kill", "child"],
    `timeout: ${lastParseFailure}`,
    "one complete checkpoint marker",
    "Use a larger pinned span or inspect the substrate.",
  )
}

const runPumpChild = async (args: ReadonlyArray<string>): Promise<void> => {
  const [modulePath, servers, headsJson, resultPath, markerPath, markerFloorText] = args
  if (modulePath === undefined || servers === undefined || headsJson === undefined || resultPath === undefined) {
    throw new Error("internal chaos pump arguments are incomplete")
  }
  const fold = await loadFold(modulePath)
  const heads = JSON.parse(headsJson) as ReadonlyArray<number>
  const markerFloor = markerFloorText === undefined ? Number.POSITIVE_INFINITY : Number(markerFloorText)
  await Effect.runPromise(Effect.gen(function* () {
    const handle = yield* deploy(fold, { checkpointEvery: 16 })
    let markerWritten = false
    while (true) {
      const anchors = yield* Effect.forEach(
        heads,
        (_, partition) => handle.anchor(partition),
        { concurrency: "unbounded" },
      )
      const applied = anchors.reduce((sum, anchor) => sum + anchor.floor, 0)
      if (!markerWritten && markerPath !== undefined && applied >= markerFloor) {
        markerWritten = true
        yield* Effect.promise(() => Bun.write(markerPath, JSON.stringify({ anchors, applied })))
      }
      if (anchors.every((anchor, partition) => anchor.floor >= heads[partition]!)) {
        const scoreboard = yield* handle.scoreboard
        yield* Effect.promise(() => Bun.write(resultPath, JSON.stringify({ anchors, scoreboard })))
        return
      }
      yield* Effect.sleep("5 millis")
    }
  }).pipe(
    Effect.provide(Folds.layer({ servers })),
    Effect.scoped,
  ))
}

const runKill = async (
  modulePath: string,
  servers: string,
  heads: ReadonlyArray<number>,
  seed: number,
  reference: ReadonlyArray<Digest>,
): Promise<KillMeasurement> => {
  const directory = await mkdtemp(join(tmpdir(), "plait-chaos-cli-"))
  const marker = join(directory, "marker.json")
  const result = join(directory, "result.json")
  const children = new Set<ReturnType<typeof Bun.spawn>>()
  const spawn = (withMarker: boolean) => {
    const command = [
      process.execPath,
      fileURLToPath(import.meta.url),
      "__pump",
      absoluteModulePath(modulePath),
      servers,
      JSON.stringify(heads),
      result,
    ]
    if (withMarker) {
      const total = heads.reduce((sum, head) => sum + head, 0)
      const markerFloor = Math.max(1, Math.min(total - 1, 1 + (seed % Math.max(total - 1, 1))))
      command.push(marker, String(markerFloor))
    }
    const child = Bun.spawn({ cmd: command, stdout: "ignore", stderr: "pipe" })
    children.add(child)
    return child
  }
  try {
    const first = spawn(true)
    const marked = await waitForJson<{ anchors: ReadonlyArray<Anchor> }>(marker, first)
    if (marked.anchors.every((anchor, partition) => anchor.floor >= heads[partition]!)) {
      throw cliRefusal(
        ["kill", "span"],
        "fully anchored before interruption",
        "an unanchored suffix",
        "Use a fresh declared fold and a larger pinned span so the hard kill lands mid-stream.",
      )
    }
    first.kill(9)
    await first.exited

    const resumed = spawn(false)
    const measured = await waitForJson<PumpResult>(result, resumed)
    await resumed.exited
    const observed = measured.anchors.map((anchor) => anchor.stateDigest)
    return {
      anchors: measured.anchors,
      resumeCoordinates: marked.anchors.map((anchor) => anchor.floor),
      scoreboard: measured.scoreboard,
      equal: reference.every((digest, index) => digest === observed[index]),
    }
  } finally {
    for (const child of children) {
      if (child.exitCode === null) child.kill()
      await child.exited
    }
    await rm(directory, { recursive: true, force: true })
  }
}

const corpusDigest = async (): Promise<string> => {
  const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
  const bytes = new Uint8Array(await Bun.file(join(packageRoot, "fixtures", "fabric-conformance.ndjson")).arrayBuffer())
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
}

const axisRecord = (
  axis: Axis,
  reference: ReadonlyArray<Digest>,
  observed: ReadonlyArray<Digest>,
  equal: boolean,
  extra: Record<string, WireValue> = {},
): WireValue => ({
  axis,
  status: equal ? "pass" : "diverged",
  reference: [...reference],
  observed: [...observed],
  equal,
  ...extra,
})

const execute = async (options: CliOptions): Promise<{ readonly scoreboard: WireValue; readonly exit: number }> => {
  if (options.foldDigest !== undefined) {
    throw cliRefusal(
      ["fold"],
      options.foldDigest,
      "a cataloged fold available through the future catalog slice",
      "v0 can load a declared fold module; digest lookup is refused until the catalog exists.",
    )
  }
  const modulePath = options.modulePath!
  const fold = await loadFold(modulePath)
  if (options.lane !== undefined && options.lane !== fold.lane.digest) {
    throw cliRefusal(["lane"], options.lane, fold.lane.digest, "Use the lane committed by the fold declaration.")
  }
  const servers = process.env.PLAIT_NATS_URL ?? "nats://127.0.0.1:4222"
  const heads = await readHeads(servers, fold, options.head)
  const started = performance.now()
  const runs: Array<RedeliveryChaosResult> = []
  for (let repeat = 0; repeat < options.repeat; repeat++) {
    runs.push(await Effect.runPromise(runRedeliveryChaos({
      servers,
      fold,
      heads,
      seed: options.seed + repeat,
    }).pipe(Effect.scoped)))
  }
  const reference = runs[0]!.referenceDigests
  const axes: Array<WireValue> = []
  let anchorWrites = runs.reduce((sum, run) => sum + run.anchorWrites, 0)
  let kills = 0
  if (options.axes.includes("kill")) {
    const killed = await runKill(modulePath, servers, heads, options.seed, reference)
    axes.push(axisRecord("kill", reference, killed.anchors.map((anchor) => anchor.stateDigest), killed.equal, {
      kills: 1,
      resumeCoordinates: [...killed.resumeCoordinates],
      anchorFloorRole: "derived resume record; the successor discipline protects",
    }))
    anchorWrites += killed.scoreboard.anchorWrites
    kills = 1
  }
  if (options.axes.includes("duplicate")) {
    const equal = runs.every((run) => run.equal)
    axes.push(axisRecord("duplicate", reference, runs[0]!.successorDigests, equal, {
      schedulesMeasured: runs.length,
      redeliveries: runs.reduce((sum, run) => sum + run.redeliveriesAbsorbed, 0),
      mechanism: "durable-consumer NAK/redelivery; no republish",
    }))
  }
  if (options.axes.includes("reorder")) {
    const equal = runs.every((run) => run.equal)
    axes.push(axisRecord("reorder", reference, runs[0]!.successorDigests, equal, {
      schedulesMeasured: runs.length,
      scope: "arrival reorder",
      bufferedOutOfOrderArrivals: runs.reduce((sum, run) => sum + run.bufferedOutOfOrderArrivals, 0),
      bufferedOutOfOrderDrained: runs.reduce((sum, run) => sum + run.bufferedOutOfOrderDrained, 0),
    }))
  }
  axes.push({
    axis: "reorder-partitions",
    status: "n/a",
    reason: "deferred by the v0 ruling; arrival reorder is the shipped F2b axis",
  })
  const applicable = axes.filter((axis) => Predicate.isObject(axis) && axis.status !== "n/a") as Array<Record<string, WireValue>>
  const passed = applicable.filter((axis) => axis.equal === true).length
  const digest = await corpusDigest()
  const elapsedMillis = Math.round((performance.now() - started) * 1000) / 1000
  const scoreboard: WireValue = {
    v: 0,
    kind: "plait-chaos-scoreboard",
    run: {
      fold: fold.digest,
      lane: fold.lane.digest,
      heads: [...heads],
      seed: options.seed,
      repeat: options.repeat,
      substrate: "nats-server v2.14.4; single node; non-clustered; R=1; file-backed",
    },
    axes,
    measurements: {
      eventsAdmitted: runs.reduce((sum, run) => sum + run.eventsAdmitted, 0),
      eventsApplied: runs.reduce((sum, run) => sum + run.eventsApplied, 0),
      arrivalsSuppressedAtFrontier: runs.reduce(
        (sum, run) => sum + run.arrivalsSuppressedAtFrontier,
        0,
      ),
      redeliveriesAbsorbed: runs.reduce((sum, run) => sum + run.redeliveriesAbsorbed, 0),
      bufferedOutOfOrderArrivals: runs.reduce((sum, run) => sum + run.bufferedOutOfOrderArrivals, 0),
      bufferedOutOfOrderDrained: runs.reduce((sum, run) => sum + run.bufferedOutOfOrderDrained, 0),
      anchorWrites,
      kills,
      refusals: {},
      elapsedMillis,
      elapsedLabel: "cost measurement, not a benchmark",
    },
    citations: {
      laws: ["F3ResumeExact", "F2TraceInvariant", "F2bGuardedExactlyOnce"],
      corpusSha256: digest,
    },
    verdict: `Under this schedule, on this substrate envelope, the deployed runtime produced byte-equal terminal digests on ${passed} of ${applicable.length} applicable axes. This is a measurement of one run, not a proof. The machine-checked reason is F3 / F2 / F2b, proven in verify/fabric at corpus ${digest}.`,
    bounds: "No liveness, exactly-once, external-effect, or floor-protection claim. One live pump per fold partition is assumed.",
  }
  return { scoreboard, exit: passed === applicable.length ? 0 : 1 }
}

const printRefusal = (refusal: Refusal | StructuralRefusal): void => {
  const body = {
    kind: refusal.kind,
    sort: refusal.sort,
    law: refusal.law,
    path: refusal.path,
    got: refusal.got,
    expected: refusal.expected,
    next: refusal.next,
  }
  process.stderr.write(`${JSON.stringify(body)}\n`)
}

const main = async (): Promise<number> => {
  if (process.argv[2] === "__pump") {
    await runPumpChild(process.argv.slice(3))
    return 0
  }
  let options: CliOptions
  try {
    options = parse(process.argv.slice(2))
    const result = await execute(options)
    const bytes = await Effect.runPromise(canonicalBytes(result.scoreboard))
    if (options.report !== undefined) await Bun.write(options.report, bytes)
    if (options.output === "json") {
      process.stdout.write(bytes)
      process.stdout.write("\n")
    } else {
      const score = result.scoreboard as Record<string, WireValue>
      const axes = score.axes as ReadonlyArray<Record<string, WireValue>>
      for (const axis of axes) {
        process.stdout.write(`${String(axis.axis).padEnd(20)} ${String(axis.status)}${axis.reason === undefined ? "" : ` — ${String(axis.reason)}`}\n`)
      }
      process.stdout.write(`${String(score.verdict)}\n`)
    }
    return result.exit
  } catch (cause) {
    if (cause instanceof StructuralRefusal ||
      (Predicate.isObject(cause) && (cause.sort === "structural" || cause.sort === "absence"))) {
      printRefusal(cause as Refusal)
    } else {
      printRefusal(cliRefusal(["runtime"], String(cause), "a completed chaos measurement", "Inspect the substrate and module refusal."))
    }
    return 2
  }
}

process.exitCode = await main()
