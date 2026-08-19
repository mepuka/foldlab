import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Runs one half of the test tree so a working agent can pay for the half it is
 * moving. The wall half brings up real nats-server incarnations and costs
 * seconds per file; the fast half is pure and costs milliseconds, and having
 * to run both to learn whether a canonicalization change survived is what made
 * the inner loop expensive.
 *
 * The partition is DERIVED, never listed: a test file is a wall file when it
 * reaches for the NATS harness and a fast file otherwise. That keeps the split
 * from weakening the battery in either direction — `bun run test` runs both
 * groups, and the groups are a partition of every `test/*.test.ts` file, so a
 * file added tomorrow joins one of them by construction. A misclassification
 * costs wall-clock and nothing else; no reading of the predicate can drop a
 * test file from the battery.
 */
const packageRoot = resolve(import.meta.dir, "..")
const testRoot = resolve(packageRoot, "test")
const harnessModule = "./NatsHarness.js"

type Group = "fast" | "walls"

const partition = (): Record<Group, ReadonlyArray<string>> => {
  const files = readdirSync(testRoot).filter((name) => name.endsWith(".test.ts")).sort()
  if (files.length === 0) throw new Error("plait test split found no test file")
  const fast: Array<string> = []
  const walls: Array<string> = []
  for (const file of files) {
    const source = readFileSync(resolve(testRoot, file), "utf8")
    ;(source.includes(harnessModule) ? walls : fast).push(`./test/${file}`)
  }
  return { fast, walls }
}

const requested = process.argv[2]
if (requested !== "fast" && requested !== "walls") {
  console.error("usage: bun scripts/run-test-group.ts fast|walls")
  process.exit(2)
}

const files = partition()[requested]
// An empty group would report a green `bun test` over nothing. Whichever half
// emptied, the split is wrong and the battery must say so rather than pass.
if (files.length === 0) throw new Error(`plait ${requested} test group is empty`)

/**
 * Only the wall group runs in workers, and only four of them. Its files spend
 * their time waiting on real servers rather than on this machine's cores, so
 * overlapping them is nearly free — while the fast group finishes in about a
 * second, which is less than the workers would cost to start. Four is a bound,
 * not a target: the chaos rows SIGKILL child processes and measure what
 * resumes, and a machine oversubscribed with servers is a machine where that
 * measurement starts reporting the scheduler.
 */
const workers = requested === "walls" ? ["--parallel=4"] : []

/**
 * The wall group fans out into the workers above, and each worker loads the
 * harness in its own process. The harness resolves the pinned server as it
 * loads, so no row is ever charged for a compile — but four workers starting
 * together on a cold Go build cache would start four of them. Resolving it once
 * here, before the fan-out, leaves each worker a cached binary to check against
 * the pin instead of a compiler to wait on. The fast group never imports the
 * harness, which is the same fact the partition above reads, so this arm is the
 * only one that pays.
 */
if (requested === "walls") {
  const { buildServerBinary } = await import("../test/NatsHarness.js")
  await buildServerBinary()
}

const run = Bun.spawnSync({
  cmd: ["bun", "test", ...workers, ...files],
  cwd: packageRoot,
  stdout: "inherit",
  stderr: "inherit",
})
process.exit(run.exitCode)
