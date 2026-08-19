import { afterEach, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { Effect } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
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

  test("renders a refused request as the taught refusal value itself", async () => {
    // bun's default per-test timeout is 5000ms; this wall probes the CLI's
    // refusal rendering by spawning three bun CLI processes sequentially, which
    // under the parallel real-NATS load this wall group runs with trips the
    // loader's 5s default (observed: "this test timed out after 5000ms",
    // DEV-820) without any assertion failing. It makes no timing claim — only
    // exit=2 and the rendered vocabulary — so it is given the sibling chaos
    // tests' measured bound.
    //
    // The pinned key set is the `Refusal` union's OWN encoded form, not a field
    // list this test agrees with the CLI on. It carries `_tag` because a
    // `Schema.TaggedError` carries `_tag`; the six-field rival rendering the CLI
    // used to hand-assemble (DEV-804 staged debt) could not, because it named
    // its fields by hand and `_tag` was not one of them. Retiring that rendering
    // onto the taught vocabulary is what moved this control's trace.
    const taughtKeys = ["_tag", "expected", "got", "kind", "law", "next", "path", "sort"].sort()

    const unpinned = await runCli(["chaos", "./test/fixtures/chaos-fold.ts"])
    expect(unpinned.exit).toBe(2)
    const unpinnedRefusal = JSON.parse(unpinned.stderr) as Record<string, unknown>
    expect(Object.keys(unpinnedRefusal).sort()).toEqual(taughtKeys)
    expect(unpinnedRefusal._tag).toBe("StructuralRefusal")
    expect(unpinnedRefusal.path).toEqual(["head"])

    const noFold = await runCli([
      "chaos",
      "./test/fixtures/no-fold.ts",
      "--head",
      "1",
    ])
    expect(noFold.exit).toBe(2)
    const noFoldRefusal = JSON.parse(noFold.stderr) as Record<string, unknown>
    expect(Object.keys(noFoldRefusal).sort()).toEqual(taughtKeys)
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
    expect(Object.keys(uncatalogedRefusal).sort()).toEqual(taughtKeys)
    expect(uncatalogedRefusal.path).toEqual(["fold"])

    // The refusal reaches the terminal through the package's one canonicalizer,
    // so its bytes are the same bytes the same refusal has anywhere else.
    const recanonicalized = await Effect.runPromise(canonicalBytes(unpinnedRefusal as WireValue))
    expect(unpinned.stderr.trimEnd()).toBe(new TextDecoder().decode(recanonicalized))

    const trace = "FOLD CLI CONTROL: PASS component=taught-refusal-rendering cases=unpinned-head,uncataloged-fold,module-without-fold exit=2"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.cli-refusal.trace.txt",
    )).text())
    console.info(trace)
    // Three CLI child processes, and the wall group runs four files at once:
    // the default five-second budget is a scheduler measurement, not a claim
    // about the refusals. Its siblings above carry the same explicit bound.
  }, 120_000)

  test("refuses a malformed invocation with the library's structured usage error", async () => {
    // The arm this control holds is a NEGATIVE one about authorship: a
    // malformed invocation must be refused by the CLI library's own parser and
    // must NOT be a message this package wrote. So it asserts the library's
    // shape — the command's own help document on stdout, the diagnosis on
    // stderr, the offending token named — and asserts that the estate's refusal
    // vocabulary is ABSENT: a `StructuralRefusal` here would mean the
    // hand-rolled parser had grown back.
    //
    // The stream split is the library's and is pinned as found: a help document
    // is output, a diagnosis is not.
    const unrecognized = await runCli(["chaos", "./test/fixtures/chaos-fold.ts", "--bogus"])
    expect(unrecognized.exit).toBe(2)
    expect(unrecognized.stdout).toContain("USAGE")
    expect(unrecognized.stdout).toContain("--pin-head")
    expect(unrecognized.stderr).toContain("ERROR")
    expect(unrecognized.stderr).toContain("Unrecognized flag: --bogus")
    expect(unrecognized.stderr).not.toContain("StructuralRefusal")

    const unknownCommand = await runCli(["bogus"])
    expect(unknownCommand.exit).toBe(2)
    expect(unknownCommand.stderr).toContain(`Unknown subcommand "bogus"`)
    expect(unknownCommand.stderr).not.toContain("StructuralRefusal")

    // A digest flag carries the estate's own `Digest` schema, so a malformed
    // content address is refused by the decode algebra rather than by a width
    // test the CLI restates. The library reports it; the pattern is truth's.
    const malformedDigest = await runCli(["chaos", "--fold", "nothex", "--head", "1"])
    expect(malformedDigest.exit).toBe(2)
    expect(malformedDigest.stderr).toContain("Invalid value for flag --fold")
    expect(malformedDigest.stderr).toContain("^[0-9a-f]{64}$")
    expect(malformedDigest.stderr).not.toContain("StructuralRefusal")

    const trace = "FOLD CLI CONTROL: PASS component=library-usage-error cases=unrecognized-flag,unknown-subcommand,malformed-digest exit=2"
    expect(`${trace}\n`).toBe(await Bun.file(resolve(
      import.meta.dir,
      "../negative-controls/Fold.cli-usage.trace.txt",
    )).text())
    console.info(trace)
  }, 120_000)
})
