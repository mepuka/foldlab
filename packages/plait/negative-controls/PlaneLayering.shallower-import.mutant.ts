/**
 * The plane-layering wall's mutation arm.
 *
 * Two shallower-facing imports are planted into the *source bytes of a shipped
 * truth-plane module* — the artifact the production wall parses — and the
 * production readers and the production law are then run over the planted
 * bytes. Nothing here re-states the law or hands a helper a constructed graph:
 * the only difference between this run and a clean one is the two lines that
 * were planted.
 *
 * The victim is checked unplanted first, so the control can never pass on a
 * violation that was already in the tree. The plants go in at the top, so the
 * lines the refusal names are 1 and 2 no matter how the victim's own header and
 * body move.
 *
 * Both forms of the edge are planted, because both are edges: a value import
 * and an `import type`. `src/carriage/README.md` records why the second one
 * matters — the two open findings it names are type-only, and the layering law
 * carves out no exception for them.
 *
 * Trace: `bun run generate:layering-control`.
 */
import { resolve } from "node:path"

import {
  checkModuleLayering,
  placeModule,
  readDeclaredPlane,
  readModuleImports,
  sourcePath,
} from "../scripts/plane-layering.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/** The shipped truth-plane module the plants go into, relative to `src/`. */
const VICTIM = "truth/Canonical.ts"

/** The two edges a deeper plane may not carry. */
const PLANTED = [
  "import { FabricClient } from \"../carriage/FabricClient.js\"",
  "import type { RunFold } from \"../surface/cli.js\"",
]

const shipped = await read(sourcePath(VICTIM))
const declaredPlane = readDeclaredPlane(shipped, sourcePath(VICTIM))

const clean = checkModuleLayering({
  path: VICTIM,
  placement: placeModule(VICTIM),
  declaredPlane,
  imports: readModuleImports(shipped, sourcePath(VICTIM)),
})
if (!clean.ok) {
  console.error(
    `PLANE LAYERING MUTANT: the unplanted victim ${sourcePath(VICTIM)} is already refused`,
  )
  process.exit(0)
}

// The plants lead the file, so the production reader has to parse them back out
// of the bytes for the law to see them at all. The header the declared-plane
// read consumed is read from the shipped bytes, which the plants do not touch.
const planted = `${PLANTED.join("\n")}\n\n${shipped}`

const checked = checkModuleLayering({
  path: VICTIM,
  placement: placeModule(VICTIM),
  declaredPlane,
  imports: readModuleImports(planted, sourcePath(VICTIM)),
})

if (checked.ok) {
  console.error("PLANE LAYERING MUTANT: the planted shallower imports were accepted")
  process.exit(0)
}

for (const reason of checked.reasons) console.error(`PLANE LAYERING VIOLATION: ${reason}`)
process.exit(1)
