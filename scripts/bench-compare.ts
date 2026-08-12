/**
 * Statistical comparison of two saved benchmark runs via benchstat.
 *
 *   bun run bench:compare -- baseline candidate
 *
 * Bare names resolve into bench/results/<name>.txt; paths pass through.
 * Install once: go install golang.org/x/perf/cmd/benchstat@latest
 */

import { $ } from "bun"
import { existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")

if (!Bun.which("benchstat")) {
  console.error(
    "benchstat not found on PATH.\ninstall: go install golang.org/x/perf/cmd/benchstat@latest",
  )
  process.exit(1)
}

const [a, b] = process.argv.slice(2)
if (!a || !b) {
  console.error("usage: bun run bench:compare -- <old> <new>")
  process.exit(1)
}

const resolve = (n: string) => {
  if (existsSync(n)) return n
  const p = join(root, "bench", "results", `${n}.txt`)
  if (existsSync(p)) return p
  console.error(`no such result: ${n} (looked for ${p})`)
  process.exit(1)
}

await $`benchstat ${resolve(a)} ${resolve(b)}`
