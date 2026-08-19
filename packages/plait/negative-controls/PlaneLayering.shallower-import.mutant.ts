/**
 * The plane-layering wall's mutation arm.
 *
 * Six plants into the *source bytes of a shipped module* — the artifacts the
 * production wall parses — with the production readers and the production law
 * then run over the planted bytes, plus a seventh that plants a row into the
 * reviewed pin. Nothing here re-states the law or hands a helper a constructed
 * graph: the only difference between an arm's run and a clean one is what that
 * arm planted.
 *
 * Every victim is checked unplanted first, so no arm can pass on a violation
 * that was already in the tree. Import plants lead the file, so the lines the
 * refusals name are 1 and 2 whatever the victim's own header and body do; the
 * two header plants name no line at all.
 *
 * The arms, one law each:
 *
 * - `shallower-plane-import` — a plane module reaching a shallower plane, in
 *   both forms of the edge. `src/carriage/README.md` records why the type-only
 *   form matters: the edges this wall exists for are type-only.
 * - `internal-outbound-above-seam` — an internal module reaching a plane
 *   shallower than its own seam.
 * - `inbound-below-seam` — a deep module reaching an internal module whose seam
 *   is shallower than the importer, which is the laundering channel the seam
 *   ruling closed.
 * - `truth-edge-unpinned` — a truth-plane edge into `internal/` whose seam
 *   ranks are lawful but which the reviewed pin does not carry. Tolerated where
 *   necessary means pinned; the rank is the floor, not the licence.
 * - `seam-tag-absent` — an internal module with no `Seam:` tag, which has no
 *   plane to rank.
 * - `seam-tag-on-plane-module` — a plane module claiming a seam it cannot have.
 * - `pin-row-outlives-edge` — a pinned row whose edge the tree no longer
 *   carries, which is a standing licence nobody reviewed.
 *
 * Trace: `bun run generate:layering-control`.
 */
import { resolve } from "node:path"

import {
  checkModuleLayering,
  checkTruthEdgePin,
  placeModule,
  readDeclaredPlane,
  readDeclaredSeam,
  readModuleImports,
  readPlaneModules,
  readTruthEdgePin,
  seamIndexOf,
  sourcePath,
  TRUTH_EDGE_PIN_PATH,
  type PlaneModule,
} from "../scripts/plane-layering.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

/**
 * What an arm mutates, declared rather than inferred. An import plant leads the
 * file, so the planted bytes are what the import reader sees while the tag
 * readers keep the shipped header — which is also why the lines a refusal names
 * are 1 and 2 no matter how the victim's own prose moves. A header plant is the
 * mirror image: the tag readers see the planted bytes, the import reader the
 * shipped ones. Either way each reading is a production reader over real bytes,
 * and the arm's blast radius is written down.
 */
type Plant =
  | { readonly sort: "imports"; readonly lines: ReadonlyArray<string> }
  | { readonly sort: "header"; readonly rewrite: (shipped: string) => string }

/** One planted law, its victim, and the edit that drops it. */
interface Arm {
  readonly name: string
  /** `src/`-relative path of the shipped module the plant goes into. */
  readonly victim: string
  readonly plant: Plant
}

const ARMS: ReadonlyArray<Arm> = [
  {
    name: "shallower-plane-import",
    victim: "truth/Canonical.ts",
    plant: {
      sort: "imports",
      lines: [
        "import { FabricClient } from \"../carriage/FabricClient.js\"",
        "import type { RunFold } from \"../surface/cli.js\"",
      ],
    },
  },
  {
    name: "internal-outbound-above-seam",
    victim: "internal/transport.ts",
    plant: {
      sort: "imports",
      lines: ["import { FabricClient } from \"../carriage/FabricClient.js\""],
    },
  },
  {
    name: "inbound-below-seam",
    victim: "truth/Canonical.ts",
    plant: {
      sort: "imports",
      lines: ["import { natsConnection } from \"../internal/nats.js\""],
    },
  },
  {
    name: "truth-edge-unpinned",
    victim: "truth/Canonical.ts",
    plant: {
      sort: "imports",
      lines: ["import { digestOf } from \"../internal/digests.js\""],
    },
  },
  {
    name: "seam-tag-absent",
    victim: "internal/transport.ts",
    plant: { sort: "header", rewrite: (shipped) => shipped.replace(/^ \* Seam: .*\n/m, "") },
  },
  {
    name: "seam-tag-on-plane-module",
    victim: "truth/Canonical.ts",
    plant: {
      sort: "header",
      rewrite: (shipped) =>
        shipped.replace(
          /^( \* Plane: .*\n)/m,
          "$1 * Seam: carriage — hosts and transport clients.\n",
        ),
    },
  },
]

const shipped = await readPlaneModules(repository)
const pin = readTruthEdgePin(await read(TRUTH_EDGE_PIN_PATH), TRUTH_EDGE_PIN_PATH)
const shippedSeams = seamIndexOf(shipped)

const moduleAt = (path: string): PlaneModule => {
  const found = shipped.find((module) => module.path === path)
  if (found === undefined) {
    console.error(`PLANE LAYERING MUTANT: no shipped module at ${sourcePath(path)}`)
    process.exit(0)
  }
  return found
}

const refused: Array<string> = []

for (const arm of ARMS) {
  const victim = moduleAt(arm.victim)
  const clean = checkModuleLayering(victim, shippedSeams, pin)
  if (!clean.ok) {
    console.error(
      `PLANE LAYERING MUTANT: the unplanted victim ${sourcePath(arm.victim)} is already refused`,
    )
    process.exit(0)
  }

  const source = await read(sourcePath(arm.victim))
  const planted = arm.plant.sort === "imports"
    ? `${arm.plant.lines.join("\n")}\n\n${source}`
    : arm.plant.rewrite(source)
  if (planted === source) {
    console.error(`PLANE LAYERING MUTANT: arm ${arm.name} planted nothing`)
    process.exit(0)
  }

  // Each reader is pointed at the bytes its arm actually mutated, and the seam
  // index is rebuilt around the result, so a header plant cannot be judged
  // against a membership the unplanted tree supplied.
  const tags = arm.plant.sort === "header" ? planted : source
  const mutant: PlaneModule = {
    path: arm.victim,
    placement: placeModule(arm.victim),
    declaredPlane: readDeclaredPlane(tags, sourcePath(arm.victim)),
    declaredSeam: readDeclaredSeam(tags),
    imports: readModuleImports(planted, sourcePath(arm.victim)),
  }
  const seams = seamIndexOf(
    shipped.map((module) => (module.path === arm.victim ? mutant : module)),
  )

  const checked = checkModuleLayering(mutant, seams, pin)
  if (checked.ok) {
    console.error(`PLANE LAYERING MUTANT: arm ${arm.name} was accepted`)
    process.exit(0)
  }

  refused.push(`PLANE LAYERING MUTANT ARM: ${arm.name}`)
  for (const reason of checked.reasons) refused.push(`PLANE LAYERING VIOLATION: ${reason}`)
}

// The staleness clause is graph-level rather than per-module, so its arm plants
// a row instead of bytes: a pin that outlives its edge is a licence nobody is
// reading any more, and the roster's whole worth is that it is read.
const stale = checkTruthEdgePin(shipped, [
  ...pin,
  { importer: "truth/Digest.ts", imported: "internal/digests.ts", why: "planted" },
])
if (stale.ok) {
  console.error("PLANE LAYERING MUTANT: arm pin-row-outlives-edge was accepted")
  process.exit(0)
}
refused.push("PLANE LAYERING MUTANT ARM: pin-row-outlives-edge")
refused.push(`PLANE LAYERING VIOLATION: ${stale.reason}\n  ${TRUTH_EDGE_PIN_PATH}`)

for (const line of refused) console.error(line)
process.exit(1)
