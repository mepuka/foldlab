/**
 * Runs the Go benchmarks with production settings and optionally saves a
 * named result file for benchstat comparison.
 *
 *   bun run bench:go                      # print to stdout
 *   bun run bench:go -- --save baseline   # also write bench/results/baseline.txt
 *
 * Env knobs: BENCH (regex, default "."), BENCH_COUNT (default 10),
 * BENCH_CPU (default 1 — the hot paths are per-event and single-threaded),
 * BENCH_TIME (go -benchtime, default "1s").
 */

import { $ } from "bun"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const args = process.argv.slice(2)
const saveAt = args.indexOf("--save")
const name = saveAt >= 0 ? args[saveAt + 1] : undefined
if (saveAt >= 0 && !name) {
  console.error("--save needs a name, e.g. --save baseline")
  process.exit(1)
}

const bench = process.env["BENCH"] ?? "."
const count = process.env["BENCH_COUNT"] ?? "10"
const cpu = process.env["BENCH_CPU"] ?? "1"
const time = process.env["BENCH_TIME"] ?? "1s"

// -run=^$ skips tests entirely; benchmarks only.
const out =
  await $`go test -run=^$ -bench=${bench} -benchmem -count=${count} -cpu=${cpu} -benchtime=${time} ./stream`
    .cwd(join(root, "go"))
    .text()

console.log(out)

if (name) {
  const dir = join(root, "bench", "results")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${name}.txt`)
  await Bun.write(file, out)
  console.log(`saved -> bench/results/${name}.txt`)
}
