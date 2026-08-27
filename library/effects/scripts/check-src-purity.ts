/**
 * The Effect-boundary purity gate: nothing under src/ may run an
 * Effect itself. Runtime execution belongs to callers (and tests);
 * a run or unsafe call inside the library escapes structured error
 * handling, interruption, and layer scoping silently.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const forbidden =
  /\bEffect\.(runSync|runSyncExit|runPromise|runPromiseExit|runFork|runCallback)\b|\brunMain\b|\bunsafeRun\w*\b/

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path)
      : path.endsWith(".ts") ? [path]
      : []
  })

const hits: Array<string> = []
for (const file of walk(join(import.meta.dirname ?? ".", "..", "src"))) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/)
  lines.forEach((line, index) => {
    if (forbidden.test(line)) hits.push(`${file}:${index + 1}: ${line.trim()}`)
  })
}

if (hits.length > 0) {
  console.error("src purity gate: runtime execution inside the library:")
  for (const hit of hits) console.error(`  ${hit}`)
  process.exit(1)
}
console.log("src purity gate: no runtime execution under src/")
