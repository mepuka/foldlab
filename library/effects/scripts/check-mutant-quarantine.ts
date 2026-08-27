/**
 * Mutant quarantine grep (ratified mutation form): model files under
 * Effects/ never import the Effects/Mutants/ tree. Mutants may import the
 * model; the reverse direction is the defect this gate exists to catch.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..")
const root = join(pkg, "Effects")
const quarantine = join(root, "Mutants")

const leanFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (path === quarantine) continue
      out.push(...leanFiles(path))
    } else if (name.endsWith(".lean")) {
      out.push(path)
    }
  }
  return out
}

let violations = 0
for (const file of leanFiles(root)) {
  const text = readFileSync(file, "utf8")
  for (const line of text.split(/\r?\n/)) {
    if (/^import\s+Effects\.Mutants/.test(line)) {
      console.error(`quarantine violation: ${relative(pkg, file)}: ${line.trim()}`)
      violations++
    }
  }
}

if (violations > 0) {
  console.error(`${violations} quarantine violation(s); the model never imports mutants`)
  process.exit(1)
}
console.log("mutant quarantine clean: no model file imports Effects/Mutants")
