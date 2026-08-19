/**
 * The tool-schema parity wall: the package's committed copy of the model's
 * tool-schema projection is byte-identical to the emission the model's own
 * gate holds fresh.
 *
 * Two homes, one artifact — the dual-home discipline the skills mirror
 * already uses. The model-side gate proves its committed artifact is a fresh
 * emission of the projection AST; this check proves the runtime serves that
 * same artifact and not a drifted twin. Together the chain reads: projection
 * AST → model artifact → package copy → served tools, each link walled.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const packageCopy = resolve(packageRoot, "fixtures/tools.schema.json")
const modelArtifact = resolve(packageRoot, "../../verify/unity/artifacts/tools.schema.json")

const read = (path: string): string => {
  try {
    return readFileSync(path, "utf8")
  } catch {
    console.error(`KERNEL TOOLS: FAIL — cannot read ${path}`)
    process.exit(1)
  }
}

const copy = read(packageCopy)
const emitted = read(modelArtifact)

if (copy !== emitted) {
  const copyLines = copy.split("\n")
  const emittedLines = emitted.split("\n")
  let line = 0
  while (line < Math.min(copyLines.length, emittedLines.length)) {
    if (copyLines[line] !== emittedLines[line]) break
    line += 1
  }
  console.error(
    `KERNEL TOOLS: FAIL — the package copy diverges from the model's emission at line ${
      line + 1
    }; re-copy the artifact IN THE SAME COMMIT as whatever moved it`,
  )
  process.exit(1)
}

console.log(
  `KERNEL TOOLS: PASS (package copy is byte-identical to the model's emission; ${copy.length} bytes)`,
)
