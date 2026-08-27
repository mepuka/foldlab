/** The built package must be consumable, not merely compiled: the dist
 * entry resolves as ESM at runtime, both public namespaces are present
 * with their layer constructors, and no emitted file kept a source-only
 * `.ts` specifier past the declaration rewrite. Run after `bun run build`. */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const failures: Array<string> = []
const distDir = fileURLToPath(new URL("../dist", import.meta.url))

const mod = await import(new URL("../dist/index.js", import.meta.url).href) as {
  readonly Cas?: Record<string, unknown>
  readonly Replay?: Record<string, unknown>
}
if (typeof mod.Cas !== "object" || mod.Cas === null) {
  failures.push("dist entry is missing the Cas namespace")
} else {
  if (typeof mod.Cas.layerMemory !== "function") failures.push("Cas.layerMemory is not a function")
  if (typeof mod.Cas.layerRemote !== "function") failures.push("Cas.layerRemote is not a function")
}
if (typeof mod.Replay !== "object" || mod.Replay === null) {
  failures.push("dist entry is missing the Replay namespace")
} else {
  if (mod.Replay.layer === undefined) failures.push("Replay.layer is missing")
  if (mod.Replay.WitnessSink === undefined) failures.push("Replay.WitnessSink is missing")
}

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
for (const file of walk(distDir)) {
  if (!file.endsWith(".d.ts") && !file.endsWith(".js")) continue
  if (/from\s+"[^"]*\.ts"/.test(readFileSync(file, "utf8"))) {
    failures.push(`unrewritten .ts specifier in ${file}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}
console.log("dist consumer smoke: entry imports, namespaces present, specifiers rewritten")
