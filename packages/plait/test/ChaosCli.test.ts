import { afterEach, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { Effect } from "effect"

import { canonicalBytes } from "../src/truth/Canonical.js"
import * as Lane from "../src/planes/Lane.js"
import { lane } from "./fixtures/chaos-fold.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const runCli = async (
  args: ReadonlyArray<string>,
  url?: string,
): Promise<{ readonly exit: number; readonly stdout: string; readonly stderr: string }> => {
  const child = Bun.spawn({
    cmd: ["bun", "run", "./src/surface/cli.ts", ...args],
    cwd: resolve(import.meta.dir, ".."),
    env: { ...process.env, ...(url === undefined ? {} : { PLAIT_NATS_URL: url }) },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    child.stdout instanceof ReadableStream ? new Response(child.stdout).text() : "",
    child.stderr instanceof ReadableStream ? new Response(child.stderr).text() : "",
  ])
  return { exit, stdout, stderr }
}

const emitSpan = async (url: string, perPartition: number): Promise<void> => {
  const declared = await lane
  const tenants: Array<string | undefined> = [undefined, undefined]
  for (let index = 0; tenants.some((tenant) => tenant === undefined); index++) {
    const tenant = `cli-tenant-${index}`
    const coordinate = await Effect.runPromise(Lane.partition(declared, {
      tenant,
      ordinal: index,
      delta: 1,
    }))
    tenants[coordinate.partition] ??= tenant
  }
  await Effect.runPromise(Effect.gen(function* () {
    for (let index = 0; index < perPartition; index++) {
      for (let partition = 0; partition < 2; partition++) {
        yield* Lane.emit(declared, {
          tenant: tenants[partition]!,
          ordinal: index * 2 + partition,
          delta: 1,
        }, { holder: "cli-test" })
      }
    }
  }).pipe(
    Effect.provide(Lane.Lanes.layer({ servers: url })),
    Effect.scoped,
  ))
}

describe("plait chaos CLI", () => {
  test("prints the harness's canonical measured scoreboard", async () => {
    harness = await startNatsHarness()
    await emitSpan(harness.url, 20)

    const report = join(harness.directory, "chaos-scoreboard.json")
    const result = await runCli([
      "chaos",
      "./test/fixtures/chaos-fold.ts",
      "--head",
      "20",
      "--axis",
      "kill",
      "--axis",
      "duplicate",
      "--axis",
      "reorder",
      "--seed",
      "7",
      "--output",
      "json",
      "--report",
      report,
    ], harness.url)
    expect(result.exit, result.stderr).toBe(0)
    const scoreboard = JSON.parse(result.stdout) as {
      axes: ReadonlyArray<{ axis: string; status: string; anchorFloorRole?: string }>
      measurements: {
        eventsApplied: number
        arrivalsSuppressedAtFrontier: number
        redeliveriesAbsorbed: number
        bufferedOutOfOrderDrained: number
      }
      verdict: string
      bounds: string
    }
    expect(scoreboard.axes).toContainEqual(expect.objectContaining({ axis: "duplicate", status: "pass" }))
    expect(scoreboard.axes).toContainEqual(expect.objectContaining({ axis: "reorder", status: "pass" }))
    expect(scoreboard.axes).toContainEqual(expect.objectContaining({ axis: "kill", status: "pass" }))
    expect(scoreboard.axes).toContainEqual(expect.objectContaining({ axis: "reorder-partitions", status: "n/a" }))
    expect(scoreboard.measurements.redeliveriesAbsorbed).toBe(80)
    expect(scoreboard.measurements.eventsApplied).toBe(40)
    expect(scoreboard.measurements.arrivalsSuppressedAtFrontier).toBe(80)
    expect(scoreboard.measurements.bufferedOutOfOrderDrained).toBeGreaterThan(0)
    expect(scoreboard.axes.find((axis) => axis.axis === "kill")?.anchorFloorRole)
      .toBe("derived resume record; the successor discipline protects")
    expect(scoreboard.verdict).toContain("measurement of one run, not a proof")
    expect(scoreboard.bounds).not.toContain("floor guard")

    const reportBytes = new Uint8Array(await Bun.file(report).arrayBuffer())
    const recanonicalized = await Effect.runPromise(canonicalBytes(scoreboard))
    expect([...reportBytes]).toEqual([...recanonicalized])
    expect(new TextDecoder().decode(reportBytes)).toBe(result.stdout.trimEnd())
  }, 120_000)

  test("a planted between-arm state mutation reddens the harness verdict and CLI", async () => {
    harness = await startNatsHarness()
    await emitSpan(harness.url, 20)
    const result = await runCli([
      "chaos",
      "./test/fixtures/chaos-fold-state-mutant.ts",
      "--head",
      "20",
      "--axis",
      "kill",
      "--seed",
      "7",
      "--output",
      "json",
    ], harness.url)
    expect(result.exit, result.stderr).toBe(1)
    const scoreboard = JSON.parse(result.stdout) as {
      axes: ReadonlyArray<{ axis: string; status: string; equal?: boolean }>
    }
    expect(scoreboard.axes).toContainEqual(expect.objectContaining({
      axis: "kill",
      status: "diverged",
      equal: false,
    }))
    const trace = "FOLD CLI CONTROL: PASS component=digest-verdict mutant=state-between-arms exit=1 axis=kill status=diverged"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.cli-divergence.trace.txt",
    )).text())
    console.info(trace)
  }, 120_000)

  test("refuses an unpinned head and a module without a fold in six fields", async () => {
    const unpinned = await runCli(["chaos", "./test/fixtures/chaos-fold.ts"])
    expect(unpinned.exit).toBe(2)
    const unpinnedRefusal = JSON.parse(unpinned.stderr) as Record<string, unknown>
    expect(Object.keys(unpinnedRefusal).sort()).toEqual(
      ["expected", "got", "kind", "law", "next", "path", "sort"].sort(),
    )
    expect(unpinnedRefusal.path).toEqual(["head"])

    const noFold = await runCli([
      "chaos",
      "./test/fixtures/no-fold.ts",
      "--head",
      "1",
    ])
    expect(noFold.exit).toBe(2)
    const noFoldRefusal = JSON.parse(noFold.stderr) as Record<string, unknown>
    expect(Object.keys(noFoldRefusal).sort()).toEqual(
      ["expected", "got", "kind", "law", "next", "path", "sort"].sort(),
    )
    expect(noFoldRefusal.path).toEqual(["module", "fold"])
    expect(noFoldRefusal.kind).toBe("invalid-chaos-request")

    const uncataloged = await runCli([
      "chaos",
      "--fold",
      "f".repeat(64),
      "--head",
      "1",
    ])
    expect(uncataloged.exit).toBe(2)
    const uncatalogedRefusal = JSON.parse(uncataloged.stderr) as Record<string, unknown>
    expect(Object.keys(uncatalogedRefusal).sort()).toEqual(
      ["expected", "got", "kind", "law", "next", "path", "sort"].sort(),
    )
    expect(uncatalogedRefusal.path).toEqual(["fold"])
    const trace = "FOLD CLI CONTROL: PASS component=six-field-refusal cases=unpinned-head,uncataloged-fold,module-without-fold exit=2"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.cli-refusal.trace.txt",
    )).text())
    console.info(trace)
  })
})
