#!/usr/bin/env bun

/**
 * Plane: surface — entry points.
 *
 * The `plait` command line, declared on the pinned Effect release's own CLI
 * (`effect/unstable/cli`). Nothing here parses arguments: the command tree is
 * DATA — flags, arguments, and subcommands declared as values — and the
 * library's parser is the interpreter that walks it. `--help`, `--version`,
 * `--wizard`, and shell completions are properties of that data, not features
 * this file writes.
 *
 * ## The shape, and why it is this shape
 *
 * The file reads in three movements, and the estate's algebra is meant to be
 * visible in each:
 *
 * 1. **The vocabulary** — what this surface refuses, and the ONE total
 *    function that renders a refusal to a terminal. A refusal is a sum
 *    (`truth/Refusal.ts`'s `Refusal` union) and it is rendered by ENCODING the
 *    value through its own schema, then through the one canonicalizer. No
 *    command prints a refusal its own way, and no field list is restated here:
 *    what reaches stderr is the taught value itself.
 * 2. **The declaration** — the command tree as data. Where the estate has a
 *    schema for a domain (`truth/Digest.ts` for content addresses), the flag
 *    carries that schema, so decoding is the estate's decode algebra rather
 *    than this file's `if`.
 * 3. **The interpretation** — handlers as `Effect.fn`, services via `Layer`,
 *    and one total map from the error channel to an exit code.
 *
 * Judgment is not here. `admit` below is re-exported from the one door; this
 * surface routes to it and never wraps it.
 *
 * @module
 */
import { fileURLToPath } from "node:url"

import { BunServices } from "@effect/platform-bun"
import { Console, Context, Effect, FileSystem, Layer, Option, Path, Ref, Result, Schema, SchemaParser, Scope } from "effect"
import { Argument, CliError, Command, Flag } from "effect/unstable/cli"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"

import { jetstreamManager } from "@nats-io/jetstream"

import { admit as kernelAdmit } from "../kernel/KernelDoor.js"
import { Engine } from "../carriage/Engine.js"
import * as Init from "./init.js"
import * as McpFace from "./mcp.js"
import { Catalog, Payloads } from "../planes/Catalog.js"
import { Cells } from "../planes/Cell.js"
import { Registers } from "../planes/Register.js"
import * as Algebra from "../truth/Algebra.js"
import type { Anchor } from "../planes/Anchor.js"
import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { digestOf, Digest } from "../truth/Digest.js"
import { Holder } from "../kernel/Wire.js"
import {
  Folds,
  declare as declareFold,
  deploy,
  type DeclaredFold,
  type FoldScoreboard,
} from "../planes/Fold.js"
import * as Lane from "../planes/Lane.js"
import {
  Refusal,
  StructuralRefusal,
  structuralRefusal,
} from "../truth/Refusal.js"
import {
  runRedeliveryChaos,
  transportRefusal,
  type RedeliveryChaosResult,
} from "../internal/chaos.js"
import { laneStreamName } from "../internal/lanes.js"
import { acquireConnection } from "../internal/transport.js"

/** The kernel's one candidate-judgment function; the CLI defines no side door. */
export const admit = kernelAdmit

type ChaosFold = DeclaredFold<WireValue, WireValue, number>

/** The three measured chaos axes, named once and read by both the flag and the run. */
const AXES = ["kill", "duplicate", "reorder"] as const
type Axis = (typeof AXES)[number]

// ===========================================================================
// 1. The vocabulary — what this surface refuses, and how a refusal is rendered
// ===========================================================================

/**
 * The one minting site for this surface's structural refusal.
 *
 * Its `kind` is a member of the generated vocabulary
 * (`truth/RefusalKinds.generated.ts`), and its `law` is the pinned teaching in
 * `test/RefusalPayloads.taught.txt`. Neither is spelled twice.
 */
const chaosRefusal = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
  note: string,
): StructuralRefusal =>
  structuralRefusal({
    kind: "invalid-chaos-request",
    law:
      "plait chaos runs one pinned span of one admitted declared fold; no ambient head or arbitrary program is accepted.",
    path,
    got,
    expected,
    next: [{ subject: "plait chaos", note }],
  })

const usage =
  "plait chaos <module-path> (--head <position> | --pin-head) [--fold <digest>] [--lane <digest>] [--axis kill|duplicate|reorder] [--seed <n>] [--repeat <n>] [--output json|text] [--report <path>]"

/**
 * Renders one refusal to standard error, and is the ONLY place this surface
 * writes one.
 *
 * The rendering is a projection of the value, not a transcription of it: the
 * refusal is encoded through the `Refusal` schema union — which is what makes
 * this function total over the sum, and what carries the taught `_tag`,
 * `sort`, `kind`, `law`, `path`, `got`, `expected`, and `next` without this
 * file naming any of them — and then through the package's one RFC 8785
 * canonicalizer, so a refusal on a terminal is byte-identical to the same
 * refusal anywhere else it is written.
 *
 * The fallback exists because a total function may not fail: a refusal whose
 * own payload will not canonicalize still has to reach the operator, and a
 * rendering that refused to render would lose the only evidence there is.
 */
const renderRefusal = Effect.fn("cli.renderRefusal")(function* (
  refusal: Refusal,
): Effect.fn.Return<void> {
  const rendered = yield* SchemaParser.encodeUnknownEffect(Refusal)(refusal).pipe(
    Effect.flatMap((encoded) => canonicalBytes(encoded as WireValue)),
    Effect.map((bytes) => new TextDecoder().decode(bytes)),
    Effect.orElseSucceed(() => JSON.stringify({ sort: refusal.sort, kind: refusal.kind, law: refusal.law })),
  )
  yield* Console.error(rendered)
})

// ===========================================================================
// 2. The declaration — the command tree as data
// ===========================================================================

/**
 * A content address on the command line is decoded by the estate's own digest
 * schema, so `--fold` and `--lane` admit exactly what `truth/Digest.ts` admits
 * and the CLI states no width and no alphabet of its own.
 */
const digestFlag = (name: string, description: string) =>
  Flag.string(name).pipe(
    Flag.withSchema(Digest),
    Flag.withDescription(description),
    Flag.optional,
  )

const chaosFlags = {
  fold: digestFlag("fold", "Run a cataloged fold by digest instead of a module path"),
  lane: digestFlag("lane", "Assert the lane digest the fold declaration commits to"),
  head: Flag.integer("head").pipe(
    Flag.withDescription("Pin every partition's span at this stream position"),
    Flag.optional,
  ),
  pinHead: Flag.boolean("pin-head").pipe(
    Flag.withDescription("Pin each partition's span at the live stream head"),
  ),
  axis: Flag.choice("axis", AXES).pipe(
    Flag.withDescription("Measure this axis; repeatable, and all three when omitted"),
    Flag.atLeast(0),
  ),
  seed: Flag.integer("seed").pipe(
    Flag.withDescription("Seed the redelivery and interruption schedule"),
    Flag.withDefault(712),
  ),
  repeat: Flag.integer("repeat").pipe(
    Flag.withDescription("Measure this many schedules; the kill arm admits exactly one"),
    Flag.withDefault(1),
  ),
  output: Flag.choice("output", ["json", "text"]).pipe(
    Flag.withDescription("Print the canonical scoreboard, or the axis lines and verdict"),
    Flag.withDefault("text" as const),
  ),
  report: Flag.path("report", { mustExist: false }).pipe(
    Flag.withDescription("Also write the canonical scoreboard bytes to this path"),
    Flag.optional,
  ),
}

// ===========================================================================
// 3. The interpretation — the measurement, in Effect
// ===========================================================================

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

/**
 * Guards the legacy chaos harness's untyped JavaScript module boundary. This
 * is not candidate judgment: it accepts no `KernelCandidateAct`, constructs no
 * `KernelAct`, and teaches no kernel refusal. That route is {@link admit}.
 *
 * The shape is stated as a schema rather than as a chain of `typeof` tests, so
 * the boundary is decoded by the same algebra every other boundary is.
 */
const PlainObject = Schema.declare<Record<string, unknown>>(
  (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
  { identifier: "PlainObject" },
)

const AnyFunction = Schema.declare<(...args: never) => unknown>(
  (value): value is (...args: never) => unknown => typeof value === "function",
  { identifier: "Function" },
)

const ChaosFoldExport = Schema.Struct({
  digest: Schema.String,
  declaration: Schema.Struct({ kind: Schema.Literal("fold") }),
  lane: Schema.Struct({
    declaration: PlainObject,
    digest: Schema.String,
    // The handle a module exports is judged as the sort it is: this value is
    // handed straight to `Lane.declare`, so the boundary that admits the module
    // admits its route name under the same grammar the lane seam demands.
    handle: Lane.LaneHandle,
    partitions: Schema.Finite,
  }),
  algebra: Schema.Struct({
    declaration: PlainObject,
    digest: Schema.String,
    reducer: PlainObject,
  }),
  contribution: Schema.Struct({ apply: AnyFunction }),
  step: AnyFunction,
})

const absoluteModulePath = Effect.fn("cli.absoluteModulePath")(function* (
  candidate: string,
): Effect.fn.Return<string, never, Path.Path> {
  const path = yield* Path.Path
  return path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate)
})

/**
 * Re-declares every part of an imported fold through the package's own
 * declaration seams and requires each to agree with the digest the module
 * exported. A module hands in values; only `Fold.declare` mints the admitted
 * one this measurement runs.
 */
const rebuildChaosFoldExport = Effect.fn("cli.rebuildChaosFoldExport")(function* (
  exported: ChaosFold,
): Effect.fn.Return<ChaosFold, Refusal> {
  const lane = yield* Lane.declare({
    handle: exported.lane.handle,
    event: exported.lane.event,
    eventSchema: exported.lane.declaration.eventSchema,
    partitions: exported.lane.partitions,
    partitionKey: exported.lane.partitionKey,
  })
  if (lane.digest !== exported.lane.digest) {
    return yield* chaosRefusal(
      ["module", "fold", "lane", "digest"],
      exported.lane.digest,
      lane.digest,
      "Export the exact admitted lane returned by Lane.declare.",
    )
  }
  const algebra = yield* Algebra.declare({
    declaration: exported.algebra.declaration.definition,
    reducer: exported.algebra.reducer,
  })
  if (algebra.digest !== exported.algebra.digest) {
    return yield* chaosRefusal(
      ["module", "fold", "algebra", "digest"],
      exported.algebra.digest,
      algebra.digest,
      "Export the exact admitted algebra returned by Algebra.declare.",
    )
  }
  const admitted = yield* declareFold({
    lane,
    algebra: exported.algebra as Algebra.CommutativeAlgebra<WireValue>,
    contribution: exported.contribution,
  })
  const exportedDigest = yield* digestOf(exported.declaration as unknown as WireValue)
  if (exportedDigest !== exported.digest || admitted.digest !== exported.digest) {
    return yield* chaosRefusal(
      ["module", "fold", "digest"],
      exported.digest,
      admitted.digest,
      "Export one internally consistent fold declaration returned by Fold.declare.",
    )
  }
  return admitted
})

const loadFold = Effect.fn("cli.loadFold")(function* (
  modulePath: string,
): Effect.fn.Return<ChaosFold, Refusal, Path.Path> {
  const absolute = yield* absoluteModulePath(modulePath)
  const namespace = yield* Effect.tryPromise({
    try: () => import(/* @vite-ignore */ `file://${absolute}`) as Promise<Record<string, unknown>>,
    catch: (cause) =>
      chaosRefusal(["module"], String(cause), "an importable module exporting one declared fold", usage),
  })
  const exported = yield* Effect.promise(() => Promise.resolve(namespace.fold ?? namespace.default))
  yield* SchemaParser.decodeUnknownEffect(ChaosFoldExport)(exported).pipe(
    Effect.mapError(() =>
      chaosRefusal(
        ["module", "fold"],
        exported === undefined ? "missing" : "not a declared fold",
        "a `fold` or default export returned by Fold.declare",
        "Export the admitted fold value itself; plait chaos never invokes an arbitrary program export.",
      )
    ),
  )
  return yield* rebuildChaosFoldExport(exported as ChaosFold)
})

/**
 * Pins the span every arm of this run measures.
 *
 * An explicit `--head` is the same pin on every partition. `--pin-head` reads
 * each declared partition's live stream head through the package's own
 * Scope-owned connection seam, so the connection is released by the scope
 * rather than by a `finally`, and a substrate failure arrives as the chaos
 * harness's retryable transport absence.
 */
const readHeads = Effect.fn("cli.readHeads")(function* (
  servers: string,
  fold: ChaosFold,
  requested: Option.Option<number>,
): Effect.fn.Return<ReadonlyArray<number>, Refusal, Scope.Scope> {
  if (Option.isSome(requested)) {
    return Array.from({ length: fold.lane.partitions }, () => requested.value)
  }
  const connection = yield* acquireConnection(
    { servers },
    "foldlab-plait-chaos-pin-head",
    "chaos.pin-head",
    transportRefusal,
  )
  const heads: Array<number> = []
  for (let partition = 0; partition < fold.lane.partitions; partition++) {
    const info = yield* Effect.tryPromise({
      try: async () => {
        const manager = await jetstreamManager(connection)
        return manager.streams.info(laneStreamName(fold.lane, partition))
      },
      catch: (cause) => transportRefusal("chaos.pin-head", cause),
    })
    if (info.state.last_seq < 1) {
      return yield* chaosRefusal(
        ["head", String(partition)],
        0,
        "a positive pinned stream head",
        "Emit a finite span before running chaos.",
      )
    }
    heads.push(info.state.last_seq)
  }
  return heads
})

/**
 * Waits for one pump child's JSON handoff.
 *
 * The bound is the same 800 x 25ms this arm has always carried, and the exit
 * condition is the same pair: the file parses, or the child is gone. What
 * moved is that a dead child and an exhausted bound are refusals on the error
 * channel rather than thrown values.
 */
const waitForJson = <A>(
  path: string,
  child: ChildProcessSpawner.ChildProcessHandle,
): Effect.Effect<A, Refusal, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    let lastParseFailure = "file not created"
    for (let attempt = 0; attempt < 800; attempt++) {
      const text = yield* fs.readFileString(path).pipe(Effect.option)
      if (Option.isSome(text)) {
        const parsed = yield* Effect.try({
          try: () => JSON.parse(text.value) as A,
          catch: (cause) => String(cause),
        }).pipe(Effect.result)
        if (Result.isSuccess(parsed)) return parsed.success
        lastParseFailure = parsed.failure
      }
      const running = yield* child.isRunning.pipe(Effect.orElseSucceed(() => false))
      if (!running) {
        return yield* chaosRefusal(
          ["kill", "child"],
          `exited: ${lastParseFailure}`,
          "a live pump child and one complete JSON handoff",
          "Inspect the child refusal and substrate.",
        )
      }
      yield* Effect.sleep("25 millis")
    }
    return yield* chaosRefusal(
      ["kill", "child"],
      `timeout: ${lastParseFailure}`,
      "one complete checkpoint marker",
      "Use a larger pinned span or inspect the substrate.",
    )
  })

/**
 * The hard-kill arm: run a pump to a marked coordinate, SIGKILL it mid-stream,
 * and measure what the resumed pump re-derives.
 *
 * Both children are spawned through the CLI runtime's own
 * `ChildProcessSpawner` — the same service `Command.Environment` already
 * carries — and both are owned by the scope, so an interrupted measurement
 * cannot leave a pump behind.
 */
const runKill = Effect.fn("cli.runKill")(function* (
  modulePath: string,
  servers: string,
  heads: ReadonlyArray<number>,
  seed: number,
  reference: ReadonlyArray<Digest>,
): Effect.fn.Return<
  KillMeasurement,
  Refusal,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "plait-chaos-cli-" }).pipe(
    Effect.mapError((cause) =>
      chaosRefusal(["kill", "workspace"], String(cause), "a writable temporary directory", "Inspect the filesystem.")
    ),
  )
  const marker = path.join(directory, "marker.json")
  const result = path.join(directory, "result.json")
  const absolute = yield* absoluteModulePath(modulePath)

  const spawn = Effect.fn("cli.runKill.spawn")(function* (withMarker: boolean) {
    const args = ["__pump", absolute, servers, JSON.stringify(heads), result]
    if (withMarker) {
      const total = heads.reduce((sum, head) => sum + head, 0)
      const markerFloor = Math.max(1, Math.min(total - 1, 1 + (seed % Math.max(total - 1, 1))))
      args.push("--marker", marker, "--marker-floor", String(markerFloor))
    }
    const handle = yield* Effect.acquireRelease(
      ChildProcess.make(process.execPath, [fileURLToPath(import.meta.url), ...args], {
        stdout: "pipe",
        stderr: "pipe",
      }),
      (child) => child.kill({ killSignal: "SIGKILL" }).pipe(Effect.ignore),
    ).pipe(
      Effect.mapError((cause) =>
        chaosRefusal(["kill", "child"], String(cause), "one spawned pump child", "Inspect the substrate.")
      ),
    )
    return handle
  })

  const first = yield* spawn(true)
  const marked = yield* waitForJson<{ anchors: ReadonlyArray<Anchor> }>(marker, first)
  if (marked.anchors.every((anchor, partition) => anchor.floor >= heads[partition]!)) {
    return yield* chaosRefusal(
      ["kill", "span"],
      "fully anchored before interruption",
      "an unanchored suffix",
      "Use a fresh declared fold and a larger pinned span so the hard kill lands mid-stream.",
    )
  }
  yield* first.kill({ killSignal: "SIGKILL" }).pipe(Effect.ignore)
  yield* first.exitCode.pipe(Effect.ignore)

  const resumed = yield* spawn(false)
  const measured = yield* waitForJson<PumpResult>(result, resumed)
  yield* resumed.exitCode.pipe(Effect.ignore)
  const observed = measured.anchors.map((anchor) => anchor.stateDigest)
  return {
    anchors: measured.anchors,
    resumeCoordinates: marked.anchors.map((anchor) => anchor.floor),
    scoreboard: measured.scoreboard,
    equal: reference.every((digest, index) => digest === observed[index]),
  }
})

const corpusDigest = Effect.fn("cli.corpusDigest")(function* (): Effect.fn.Return<
  string,
  Refusal,
  FileSystem.FileSystem | Path.Path
> {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
  const bytes = yield* fs.readFile(path.join(packageRoot, "fixtures", "fabric-conformance.ndjson")).pipe(
    Effect.mapError((cause) =>
      chaosRefusal(["corpus"], String(cause), "the readable conformance corpus", "Restore the package fixtures.")
    ),
  )
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
})

const axisRecord = (
  axis: Axis,
  reference: ReadonlyArray<Digest>,
  observed: ReadonlyArray<Digest>,
  equal: boolean,
  extra: Record<string, WireValue> = {},
): Record<string, WireValue> => ({
  axis,
  status: equal ? "pass" : "diverged",
  reference: [...reference],
  observed: [...observed],
  equal,
  ...extra,
})

interface ChaosRequest {
  readonly module: Option.Option<string>
  readonly fold: Option.Option<Digest>
  readonly lane: Option.Option<Digest>
  readonly head: Option.Option<number>
  readonly pinHead: boolean
  readonly axis: ReadonlyArray<Axis>
  readonly seed: number
  readonly repeat: number
  readonly output: "json" | "text"
  readonly report: Option.Option<string>
}

/** A request that survived judgment: one fold selector, one pinned span, one axis set. */
interface AdmittedRun {
  readonly modulePath: string
  readonly axes: ReadonlyArray<Axis>
}

/**
 * The laws this surface holds over a well-FORMED invocation.
 *
 * The library owns syntax — an unknown flag, a missing value, a bad choice
 * are its structured usage errors, rendered with the command's own help. What
 * the library cannot know is the estate's law: that a chaos run pins exactly
 * one span of exactly one fold. Those are refusals, and they are judged here
 * so the division stays legible — syntax refused by the parser, law refused by
 * the taught vocabulary.
 *
 * Judgment RETURNS the admitted run rather than nodding at the request and
 * leaving the caller to re-read it. That is why nothing downstream needs a
 * cast: the only way to hold a module path here is to have been admitted.
 */
const judgeRequest = Effect.fn("cli.judgeRequest")(function* (
  request: ChaosRequest,
): Effect.fn.Return<AdmittedRun, Refusal> {
  if (Option.isSome(request.fold)) {
    if (Option.isSome(request.module)) {
      return yield* chaosRefusal(["fold"], "module path and digest", "exactly one fold selector", usage)
    }
    return yield* chaosRefusal(
      ["fold"],
      request.fold.value,
      "a cataloged fold available through the future catalog slice",
      "v0 can load a declared fold module; digest lookup is refused until the catalog exists.",
    )
  }
  if (Option.isNone(request.module)) {
    return yield* chaosRefusal(["fold"], "missing", "a module path or --fold digest", usage)
  }
  if (Option.isNone(request.head) && !request.pinHead) {
    return yield* chaosRefusal(
      ["head"],
      "unpinned",
      "--head <position> or --pin-head",
      "Pin the span before running either arm.",
    )
  }
  if (Option.isSome(request.head) && request.pinHead) {
    return yield* chaosRefusal(["head"], "two head selectors", "exactly one head selector", usage)
  }
  const axes = request.axis.length === 0 ? AXES : [...new Set(request.axis)]
  if (request.repeat > 1 && axes.includes("kill")) {
    return yield* chaosRefusal(
      ["repeat"],
      request.repeat,
      1,
      "The v0 hard-kill arm owns one immutable anchor namespace; repeat duplicate/reorder schedules or use a fresh fold declaration.",
    )
  }
  return { modulePath: request.module.value, axes }
})

/** The measurement itself. Returns the scoreboard and the exit its verdict earns. */
const measure = Effect.fn("cli.measure")(function* (
  request: ChaosRequest,
): Effect.fn.Return<
  { readonly scoreboard: WireValue; readonly exit: number },
  Refusal,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> {
  const { axes: selected, modulePath } = yield* judgeRequest(request)
  const fold = yield* loadFold(modulePath)
  if (Option.isSome(request.lane) && request.lane.value !== fold.lane.digest) {
    return yield* chaosRefusal(
      ["lane"],
      request.lane.value,
      fold.lane.digest,
      "Use the lane committed by the fold declaration.",
    )
  }
  const servers = process.env.PLAIT_NATS_URL ?? "nats://127.0.0.1:4222"
  const heads = yield* readHeads(servers, fold, request.head)
  const started = performance.now()

  const runs: Array<RedeliveryChaosResult> = []
  for (let repeat = 0; repeat < request.repeat; repeat++) {
    runs.push(yield* runRedeliveryChaos({
      servers,
      fold,
      heads,
      seed: request.seed + repeat,
    }).pipe(Effect.scoped))
  }
  const reference = runs[0]!.referenceDigests
  const axes: Array<Record<string, WireValue>> = []
  let anchorWrites = runs.reduce((sum, run) => sum + run.anchorWrites, 0)
  let kills = 0

  if (selected.includes("kill")) {
    const killed = yield* runKill(modulePath, servers, heads, request.seed, reference)
    axes.push(axisRecord("kill", reference, killed.anchors.map((anchor) => anchor.stateDigest), killed.equal, {
      kills: 1,
      resumeCoordinates: [...killed.resumeCoordinates],
      anchorFloorRole: "derived resume record; the successor discipline protects",
    }))
    anchorWrites += killed.scoreboard.anchorWrites
    kills = 1
  }
  if (selected.includes("duplicate")) {
    const equal = runs.every((run) => run.equal)
    axes.push(axisRecord("duplicate", reference, runs[0]!.successorDigests, equal, {
      schedulesMeasured: runs.length,
      redeliveries: runs.reduce((sum, run) => sum + run.redeliveriesAbsorbed, 0),
      mechanism: "durable-consumer NAK/redelivery; no republish",
    }))
  }
  if (selected.includes("reorder")) {
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

  const applicable = axes.filter((axis) => axis.status !== "n/a")
  const passed = applicable.filter((axis) => axis.equal === true).length
  const digest = yield* corpusDigest()
  const elapsedMillis = Math.round((performance.now() - started) * 1000) / 1000
  const scoreboard: WireValue = {
    v: 0,
    kind: "plait-chaos-scoreboard",
    run: {
      fold: fold.digest,
      lane: fold.lane.digest,
      heads: [...heads],
      seed: request.seed,
      repeat: request.repeat,
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
    verdict:
      `Under this schedule, on this substrate envelope, the deployed runtime produced byte-equal terminal digests on ${passed} of ${applicable.length} applicable axes. This is a measurement of one run, not a proof. The machine-checked reason is F3 / F2 / F2b, proven in verify/fabric at corpus ${digest}.`,
    bounds:
      "No liveness, exactly-once, external-effect, or floor-protection claim. One live pump per fold partition is assumed.",
  }
  return { scoreboard, exit: passed === applicable.length ? 0 : 1 }
})

// ===========================================================================
// The command tree
// ===========================================================================

/**
 * `plait chaos` — the measurement verb.
 *
 * Its handler reads a decoded request and writes a canonical scoreboard. It
 * fails with refusals; it renders none, because rendering belongs to the one
 * function above and the exit belongs to the one seam below.
 */
const chaos = Command.make("chaos", {
  module: Argument.string("module").pipe(
    Argument.withDescription("Path to a module exporting one fold declared by Fold.declare"),
    Argument.optional,
  ),
  ...chaosFlags,
}, (request) =>
  Effect.gen(function* () {
    const measured = yield* measure(request)
    const bytes = yield* canonicalBytes(measured.scoreboard)
    const text = new TextDecoder().decode(bytes)
    if (Option.isSome(request.report)) {
      const fs = yield* FileSystem.FileSystem
      yield* fs.writeFile(request.report.value, bytes).pipe(
        Effect.mapError((cause) =>
          chaosRefusal(["report"], String(cause), "a writable report path", "Choose a writable report path.")
        ),
      )
    }
    if (request.output === "json") {
      yield* Console.log(text)
    } else {
      const score = measured.scoreboard as Record<string, WireValue>
      const lines = score.axes as ReadonlyArray<Record<string, WireValue>>
      for (const axis of lines) {
        yield* Console.log(
          `${String(axis.axis).padEnd(20)} ${String(axis.status)}${
            axis.reason === undefined ? "" : ` — ${String(axis.reason)}`
          }`,
        )
      }
      yield* Console.log(String(score.verdict))
    }
    const verdict = yield* Verdict
    yield* verdict.record(measured.exit)
  }).pipe(Effect.scoped)).pipe(
    Command.withDescription(
      "Measure one pinned span of one admitted declared fold under redelivery, reorder, and hard-kill schedules.",
    ),
  )

/**
 * `plait __pump` — the kill arm's own child, declared rather than smuggled.
 *
 * The hard-kill arm needs a second process it can SIGKILL mid-stream. That
 * process is this command: unlisted, so it never appears in help or
 * completions, but parsed by the same tree as every other verb rather than by
 * an `argv[2]` test ahead of the parser.
 */
const pump = Command.make("__pump", {
  module: Argument.string("module"),
  servers: Argument.string("servers"),
  heads: Argument.string("heads"),
  result: Argument.string("result"),
  marker: Flag.string("marker").pipe(Flag.optional),
  markerFloor: Flag.integer("marker-floor").pipe(Flag.optional),
}, (config) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const fold = yield* loadFold(config.module)
    const heads = JSON.parse(config.heads) as ReadonlyArray<number>
    const markerFloor = Option.getOrElse(config.markerFloor, () => Number.POSITIVE_INFINITY)
    const handle = yield* deploy(fold, { checkpointEvery: 16 })
    let markerWritten = false
    while (true) {
      const anchors = yield* Effect.forEach(
        heads,
        (_, partition) => handle.anchor(partition),
        { concurrency: "unbounded" },
      )
      const applied = anchors.reduce((sum, anchor) => sum + anchor.floor, 0)
      if (!markerWritten && Option.isSome(config.marker) && applied >= markerFloor) {
        markerWritten = true
        yield* fs.writeFileString(config.marker.value, JSON.stringify({ anchors, applied })).pipe(Effect.orDie)
      }
      if (anchors.every((anchor, partition) => anchor.floor >= heads[partition]!)) {
        const scoreboard = yield* handle.scoreboard
        yield* fs.writeFileString(config.result, JSON.stringify({ anchors, scoreboard })).pipe(Effect.orDie)
        return
      }
      yield* Effect.sleep("5 millis")
    }
  }).pipe(
    Effect.provide(Folds.layer({ servers: config.servers })),
    Effect.scoped,
  )).pipe(Command.unlisted)

/**
 * The root. Growth happens HERE and only here: a future generator verb —
 * declare, resolve, emit, fold, decide — is a `Command` value added to this
 * list, with its own flags carrying the estate's schemas. Nothing about the
 * parser, the help, the completions, or the refusal rendering changes when one
 * arrives, which is the property that makes this a projection rather than a
 * twin of the grammar.
 */
/**
 * `plait mcp` — the agent face over stdio.
 *
 * The eight served tools are the model's own tool-schema projection, read
 * from the committed artifact and served verbatim; every call routes through
 * the engine, so judgment is the door's and a refusal is the taught row. The
 * carriers are the live NATS planes at the named server, plus the
 * process-local catalog; declaring lanes, cells, and registers through the
 * engine is how this server is configured, because configuration is declared
 * sentences.
 */
const mcp = Command.make("mcp", {
  nats: Flag.string("nats").pipe(
    Flag.withDescription("NATS server URL the live lane, cell, and register carriers connect to"),
  ),
  holder: Flag.string("holder").pipe(
    Flag.withSchema(Holder),
    Flag.withDescription("The attribution carried on every fact this connection lands"),
  ),
  writ: digestFlag(
    "writ",
    "The declared writ this agent acts under, by digest; every declaration is offered against it",
  ),
}, (request) =>
  Effect.gen(function* () {
    const carriers = Layer.mergeAll(
      Catalog.layer,
      Payloads.layer,
      Lane.Lanes.layer({ servers: request.nats }),
      Cells.layer({ servers: request.nats }),
      Registers.layer({ servers: request.nats }),
    )
    // The writ enters as an already-admitted POLICY referent: the door's pinned
    // universe is what a declaration's writ is checked against, so a server
    // started without one could admit no sentence at all. The digest is the
    // whole seed — this surface reads no writ file and resolves no writ value,
    // because a plait item refers to another by digest.
    const seed = Option.match(request.writ, {
      onNone: () => ({}),
      onSome: (writ) => ({ catalog: [{ kind: "policy" as const, digest: writ }] }),
    })
    const engine = Engine.layer(seed).pipe(Layer.provide(carriers))
    return yield* Layer.launch(McpFace.layerStdio({ holder: request.holder }).pipe(
      Layer.provide(engine),
    ))
  })).pipe(
    Command.withDescription(
      "Serve the kernel language over MCP stdio: eight tools, served equals derived, judged by the one door.",
    ),
  )

/**
 * `plait init` — first contact.
 *
 * One command, and the whole of it is declaration: the store, the options, the
 * holder, and the writ are minted as canonical values, written at the names
 * their own bytes earn, and named to the agent client in a project-scoped
 * registration. Nothing is configured; sentences are said.
 *
 * The flags carry defaults on purpose. `plait init --holder <name>` is a
 * complete sentence — a party meeting this estate for the first time should not
 * have to know what a store directory or a partition is in order to be heard —
 * and every other flag narrows a default that is already stated.
 *
 * The handler's shape is the estate's: judgment and minting are the bootstrap
 * module's, the substrate probe is the spine's one acquire, and the report is
 * one line. Neither the refusal rendering nor the exit belongs here.
 */
const init = Command.make("init", {
  holder: Flag.string("holder").pipe(
    Flag.withDescription("The party this agent acts as; attribution, never authority"),
  ),
  directory: Flag.directory("directory", { mustExist: true }).pipe(
    Flag.withDescription("The project the declaration set and the registration are written into"),
    Flag.withDefault("."),
  ),
  store: Flag.path("store", { mustExist: false }).pipe(
    Flag.withDescription("The substrate's store directory; placed under the project when omitted"),
    Flag.optional,
  ),
  name: Flag.string("name").pipe(
    Flag.withDescription("The name the substrate runs under"),
    Flag.withDefault("foldlab-substrate"),
  ),
  addr: Flag.string("addr").pipe(
    Flag.withDescription("The address the substrate listens on and the agent dials"),
    Flag.withDefault("127.0.0.1"),
  ),
  port: Flag.integer("port").pipe(
    Flag.withDescription("The port the substrate listens on and the agent dials"),
    Flag.withDefault(4222),
  ),
  view: Flag.string("view").pipe(
    Flag.withDescription("Grant one declared view by digest; repeatable, and none by default"),
    Flag.atLeast(0),
  ),
  tool: Flag.string("tool").pipe(
    Flag.withDescription("Grant one served tool; repeatable, and every served tool when omitted"),
    Flag.atLeast(0),
  ),
}, (request) =>
  Effect.gen(function* () {
    const opening = yield* Init.bootstrap({
      holder: request.holder,
      directory: request.directory,
      store: Option.getOrNull(request.store),
      serverName: request.name,
      host: request.addr,
      port: request.port,
      views: request.view,
      tools: request.tool,
      // The registration names THE PROGRAM THIS PARTY JUST RAN, so the agent
      // client is handed the same command rather than a location this surface
      // invented.
      invocation: {
        command: process.execPath,
        program: fileURLToPath(import.meta.url),
      },
    })
    // The standing line claims a serving substrate, so it is printed only once
    // one has answered. An absent substrate is an absence: the declarations are
    // already minted and re-derive byte for byte, and the taught repair names
    // the verb that starts one.
    yield* Init.probeSubstrate(opening.url).pipe(Effect.scoped)
    yield* Console.log(Init.standingLine(opening))
  })).pipe(
    Command.withDescription(
      "Declare the opening coordination — store, options, holder, writ — and register the agent client that speaks it.",
    ),
  )

const plait = Command.make("plait").pipe(
  Command.withDescription("The Plait coordination fabric spine."),
  Command.withSubcommands([chaos, init, mcp, pump]),
)

// ===========================================================================
// The exit seam — one total map from the error channel to a process exit
// ===========================================================================

/**
 * A verdict a verb earned, held apart from the process that exits on it.
 *
 * A chaos run that measures divergence has not failed — it has succeeded at
 * reporting a divergence, and its scoreboard is the evidence. So divergence
 * cannot ride the error channel, and the handler must be able to say what it
 * measured without also deciding how the process ends. It records here; the
 * seam below reads once.
 */
interface VerdictService {
  readonly record: (code: number) => Effect.Effect<void>
  readonly read: Effect.Effect<number>
}

class Verdict extends Context.Service<Verdict, VerdictService>()("plait/cli/Verdict") {
  static readonly layer: Layer.Layer<Verdict> = Layer.effect(
    Verdict,
    Effect.gen(function* () {
      const earned = yield* Ref.make(0)
      return {
        record: (code: number) => Ref.set(earned, code),
        read: Ref.get(earned),
      }
    }),
  )
}

/**
 * The one place a refusal, a usage error, or a verdict becomes a process exit.
 *
 * Three outcomes, and each is exactly one line of policy:
 * - a refusal — this surface's taught vocabulary — renders and exits 2;
 * - a `CliError` — the library's structured usage error, already rendered by
 *   the library with the command's own help — exits 2 without a second word,
 *   because writing one would be the re-implementation this file exists to end;
 * - a completed run exits on the verdict it recorded: 0 when every applicable
 *   axis held, 1 when one diverged.
 */
const main = Effect.gen(function* () {
  const verdict = yield* Verdict
  yield* Command.run(plait, { version: "0.0.0" })
  return yield* verdict.read
}).pipe(
  Effect.catch((error) =>
    Effect.gen(function* () {
      if (Schema.is(Refusal)(error)) {
        yield* renderRefusal(error)
        return 2
      }
      if (CliError.isCliError(error)) return 2
      yield* renderRefusal(chaosRefusal(
        ["runtime"],
        String(error),
        "a completed chaos measurement",
        "Inspect the substrate and module refusal.",
      ))
      return 2
    })
  ),
  Effect.provide([BunServices.layer, Verdict.layer]),
)

if (import.meta.main) process.exitCode = await Effect.runPromise(main)
