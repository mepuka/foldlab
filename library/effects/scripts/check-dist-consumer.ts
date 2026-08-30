/** The built package must be consumable, not merely compiled: the dist
 * entry resolves as ESM at runtime, both public namespaces are present
 * with their layer constructors, and no emitted file kept a source-only
 * `.ts` specifier past the declaration rewrite — and a FOREIGN consumer
 * resolving the bare specifier through the exports map (a linked
 * `node_modules/@foldlab/cas`, never a relative path into dist) gets
 * the same surface, under both pinned runtimes (bun, and node — the
 * claim-target engine). Run after `bun run build`. */
import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
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

// ─── The packaging surface itself ───────────────────────────────────
// Every path package.json points a consumer at must exist: the files
// whitelist, the bin target, and each exports-map leaf. A publish that
// names a missing file fails HERE, not at a consumer's install.
const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const manifest = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
) as {
  readonly name: string
  readonly version: string
  readonly files: ReadonlyArray<string>
  readonly bin: Record<string, string>
  readonly exports: Record<string, Record<string, string> | string>
}
for (const entry of manifest.files) {
  if (!existsSync(join(packageRoot, entry))) {
    failures.push(`files whitelist names a missing entry: ${entry}`)
  }
}
for (const [name, target] of Object.entries(manifest.bin)) {
  if (!existsSync(join(packageRoot, target))) {
    failures.push(`bin "${name}" points at a missing file: ${target}`)
  }
}
for (const [subpath, targets] of Object.entries(manifest.exports)) {
  const leaves = typeof targets === "string" ? [targets] : Object.values(targets)
  for (const leaf of leaves) {
    if (!existsSync(join(packageRoot, leaf))) {
      failures.push(`exports["${subpath}"] points at a missing file: ${leaf}`)
    }
  }
}

// ─── The foreign consumer ───────────────────────────────────────────
// A scratch package with node_modules/@foldlab/cas linked to this
// package root, importing the BARE specifier so resolution goes
// through the exports map — exactly what an installed consumer does.
// Run under the current runtime (bun in the chain) and under node,
// the pinned claim-target engine, which must serve dist unaided.
const consumerDir = mkdtempSync(join(tmpdir(), "cas-consumer-"))
try {
  const scopeDir = join(consumerDir, "node_modules", "@foldlab")
  mkdirSync(scopeDir, { recursive: true })
  // A junction on Windows needs no privilege; a symlink elsewhere.
  symlinkSync(
    packageRoot,
    join(scopeDir, "cas"),
    process.platform === "win32" ? "junction" : "dir",
  )
  const probe = [
    `import { Cas, Server } from "${manifest.name}"`,
    `import { createRequire } from "node:module"`,
    `const require = createRequire(import.meta.url)`,
    `const pkg = require("${manifest.name}/package.json")`,
    `const defects = []`,
    `if (Cas?.layerMemory === undefined) defects.push("Cas.layerMemory unresolved")`,
    `if (Cas?.layerFile === undefined) defects.push("Cas.layerFile unresolved")`,
    `if (Server?.httpApp === undefined) defects.push("Server.httpApp unresolved")`,
    `if (pkg.name !== "${manifest.name}") defects.push("./package.json export unresolved")`,
    `if (defects.length > 0) { console.error(defects.join("; ")); process.exit(1) }`,
    `console.log("resolved " + pkg.name + "@" + pkg.version)`,
  ].join("\n")
  const probePath = join(consumerDir, "main.mjs")
  writeFileSync(probePath, probe)
  const runtimes: ReadonlyArray<readonly [string, string]> = [
    ["current runtime", process.execPath],
    ["node (claim-target engine)", "node"],
  ]
  for (const [label, executable] of runtimes) {
    const run = spawnSync(executable, [probePath], {
      cwd: consumerDir,
      encoding: "utf8",
    })
    if (run.error !== undefined || run.status !== 0) {
      const detail = run.error !== undefined
        ? String(run.error)
        : `${run.stdout ?? ""}${run.stderr ?? ""}`.trim()
      failures.push(`foreign consumer failed under ${label}: ${detail}`)
    }
  }
} finally {
  rmSync(consumerDir, { force: true, recursive: true })
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}
console.log(
  "dist consumer smoke: exact exports and inventory, namespaces present, specifiers rewritten, "
    + "packaging paths present, bare-specifier resolution green under bun and node",
)
