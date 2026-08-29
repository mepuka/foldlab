/** The built package must be consumable, not merely compiled: the dist
 * entry resolves as ESM at runtime, both public namespaces are present
 * with their layer constructors, and no emitted file kept a source-only
 * `.ts` specifier past the declaration rewrite. Run after `bun run build`. */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const failures: Array<string> = []
const distDir = fileURLToPath(new URL("../dist", import.meta.url))
const srcDir = fileURLToPath(new URL("../src", import.meta.url))

const mod = await import(new URL("../dist/index.js", import.meta.url).href) as {
  readonly Cas?: Record<string, unknown>
  readonly Server?: Record<string, unknown>
}
const rootExports = Object.keys(mod).sort()
if (rootExports.length !== 2
  || rootExports[0] !== "Cas"
  || rootExports[1] !== "Server") {
  failures.push(`dist entry exports ${rootExports.join(", ")}; expected Cas, Server`)
}
if (typeof mod.Cas !== "object" || mod.Cas === null) {
  failures.push("dist entry is missing the Cas namespace")
} else {
  if (mod.Cas.layerMemory === undefined) failures.push("Cas.layerMemory is missing")
  if (mod.Cas.layerFile === undefined) failures.push("Cas.layerFile is missing")
}
if (typeof mod.Server !== "object" || mod.Server === null) {
  failures.push("dist entry is missing the Server namespace")
} else {
  if (mod.Server.httpApp === undefined) failures.push("Server.httpApp is missing")
  if (mod.Server.Core === undefined) failures.push("Server.Core is missing")
}

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const normalizedRelative = (root: string, file: string): string =>
  relative(root, file).replaceAll("\\", "/")

const expectedInventory = walk(srcDir)
  .filter((file) => file.endsWith(".ts"))
  .flatMap((file) => {
    const stem = normalizedRelative(srcDir, file).slice(0, -3)
    return [`${stem}.d.ts`, `${stem}.d.ts.map`, `${stem}.js`, `${stem}.js.map`]
  })
  .sort()
const actualInventory = walk(distDir)
  .map((file) => normalizedRelative(distDir, file))
  .sort()

const missing = expectedInventory.filter((file) => !actualInventory.includes(file))
const unexpected = actualInventory.filter((file) => !expectedInventory.includes(file))
for (const file of missing) failures.push(`dist output is missing ${file}`)
for (const file of unexpected) failures.push(`dist output is unexpected ${file}`)

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
console.log("dist consumer smoke: exact exports and inventory, namespaces present, specifiers rewritten")
