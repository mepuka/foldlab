/**
 * The runtime side of the generated-surface wall.
 *
 * Two of this package's generated modules are no longer rendered here. They are
 * projected from the kernel model by the emitter that also mints the corpus, so
 * the byte-identical-regeneration wall for them lives where the emitter does -
 * the same place the interchange fixture's own wall has always lived, and for
 * the same reason: only the model can regenerate what the model emits.
 *
 * That leaves this battery, which carries no Lean toolchain, needing a way to
 * hold the committed files to that emission. It gets one from the emitter's own
 * digest register: the model side states what each surface hashes to and what
 * corpus it was projected from, and proves those digests fresh under its gate
 * and against a host digest tool. This check hashes the files this repository
 * actually holds and compares.
 *
 * What that proves, exactly: the committed surfaces are the bytes the emitter
 * produced at the corpus the register names, and the corpus is the one it says
 * it is. A hand edit to either surface, a stale surface after a corpus change,
 * and a register that drifted from its own emission are all caught here. What
 * it does not prove is that the register is a fresh emission - that is the
 * model gate's claim, made where the emitter can be run.
 *
 * The register names surfaces by TARGET, never by location, because a rendered
 * surface's provenance is a digest and a location is an ambient reference. The
 * mapping from target to file is a tracking fact and lives here, where tracking
 * belongs.
 *
 * @module
 */
import { createHash } from "node:crypto"
import { resolve } from "node:path"

import { CORPUS_PATH } from "./kernel-corpus.js"

/** Where the emitter's digest register is committed, relative to the root. */
export const REGISTER_PATH = "verify/unity/surface-digests.ndjson"

/** Each emitted surface, by the target the register names it under. */
export const SURFACE_PATHS: { readonly [target: string]: string } = {
  "kernel-builder": "packages/plait/src/kernel/KernelBuilder.generated.ts",
  "kernel-tables": "packages/plait/src/kernel/KernelTables.generated.ts",
  "refusal-kinds": "packages/plait/src/truth/RefusalKinds.generated.ts",
}

/** The result of holding the committed files to the register. */
export type SurfaceCheck =
  | { readonly ok: true; readonly surfaces: number }
  | { readonly ok: false; readonly reason: string }

/** One file's identity: SHA-256 over its bytes, lowercase hex. */
export const digestOf = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex")

interface RegisterRow {
  readonly record: string
  readonly target?: string
  readonly digest?: string
}

/**
 * Hold the held bytes to the register. Pure in its inputs so the self-test
 * below can run it over a mutated register without touching the tree.
 */
export const checkKernelSurfaces = (
  register: string,
  held: { readonly [path: string]: Uint8Array },
): SurfaceCheck => {
  const rows: Array<RegisterRow> = []
  for (const [index, line] of register.split("\n").entries()) {
    if (line === "") continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      return { ok: false, reason: `register line ${index + 1} is not JSON` }
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, reason: `register line ${index + 1} is not a record` }
    }
    rows.push(parsed as RegisterRow)
  }

  const corpusRows = rows.filter((row) => row.record === "corpus")
  if (corpusRows.length !== 1) {
    return { ok: false, reason: "the register must name exactly one corpus" }
  }
  const surfaceRows = rows.filter((row) => row.record === "surface")
  if (surfaceRows.length === 0) return { ok: false, reason: "the register names no surface" }
  if (rows.length !== corpusRows.length + surfaceRows.length) {
    return { ok: false, reason: "the register carries a record group this check does not know" }
  }

  const compare = (path: string, registered: unknown, what: string): string | undefined => {
    if (typeof registered !== "string") return `${what} carries no digest`
    const bytes = held[path]
    if (bytes === undefined) return `${what} names ${path}, which is not held`
    const measured = digestOf(bytes)
    return measured === registered
      ? undefined
      : `${what} is registered as ${registered} but hashes to ${measured}`
  }

  const corpusFault = compare(CORPUS_PATH, corpusRows[0]!.digest, "the corpus")
  if (corpusFault !== undefined) return { ok: false, reason: corpusFault }

  const seen = new Set<string>()
  for (const row of surfaceRows) {
    const target = row.target
    if (typeof target !== "string") return { ok: false, reason: "a surface row names no target" }
    if (seen.has(target)) return { ok: false, reason: `the register names target ${target} twice` }
    seen.add(target)
    const path = SURFACE_PATHS[target]
    if (path === undefined) {
      return { ok: false, reason: `the register names target ${target}, which this check cannot place` }
    }
    const fault = compare(path, row.digest, `surface ${target}`)
    if (fault !== undefined) return { ok: false, reason: fault }
  }
  for (const target of Object.keys(SURFACE_PATHS)) {
    if (!seen.has(target)) return { ok: false, reason: `the register omits target ${target}` }
  }
  return { ok: true, surfaces: surfaceRows.length }
}

const repository = resolve(import.meta.dir, "../../..")
const read = async (path: string): Promise<Uint8Array> =>
  new Uint8Array(await Bun.file(resolve(repository, path)).arrayBuffer())

const register = await Bun.file(resolve(repository, REGISTER_PATH)).text()
const held: { [path: string]: Uint8Array } = { [CORPUS_PATH]: await read(CORPUS_PATH) }
for (const path of Object.values(SURFACE_PATHS)) held[path] = await read(path)

if (Bun.argv.includes("--self-test")) {
  // A checker that cannot fail proves nothing. Each probe moves one thing the
  // check is supposed to notice, and each must be refused for its own reason.
  //
  // The digest flip is derived from the register's own first digest character
  // and REFUSES a no-op, because a mutation keyed to a byte the register no
  // longer contains silently becomes a self-comparison: the retired spelling
  // replaced a literal that a register rotation removed, and the probe then
  // reported its unmutated input as an accepted mutant.
  const flipped = (() => {
    const found = register.match(/"digest":"([0-9a-f])/)
    if (found === null) {
      console.error("KERNEL SURFACES CONTROL: FAIL - the register carries no digest to flip")
      process.exit(1)
    }
    const first = found[1]!
    const other = first === "0" ? "1" : "0"
    const mutated = register.replace(/"digest":"[0-9a-f]/, `"digest":"${other}`)
    if (mutated === register) {
      console.error("KERNEL SURFACES CONTROL: FAIL - the digest flip did not change the register")
      process.exit(1)
    }
    return mutated
  })()
  const probes: ReadonlyArray<readonly [string, string, { [path: string]: Uint8Array }, string]> = [
    [
      "flipped surface digest",
      flipped,
      held,
      "hashes to",
    ],
    [
      "hand-edited surface",
      register,
      { ...held, [SURFACE_PATHS["kernel-tables"]!]: new TextEncoder().encode("// edited\n") },
      "hashes to",
    ],
    [
      "dropped surface row",
      register.split("\n").filter((line) => !line.includes(`"refusal-kinds"`)).join("\n"),
      held,
      "omits target refusal-kinds",
    ],
    [
      // The name here must be one NO target will ever carry. It used to be
      // `kernel-builder`, which was unplaceable only until the builder surface
      // flipped to the model emitter and enrolled above - at which point this
      // probe would have quietly become a self-comparison, the same way the
      // digest flip did. A probe keyed to "not yet a target" expires; one keyed
      // to a name the register cannot mint does not.
      "unplaceable target",
      register.replace(`"kernel-tables"`, `"no-such-surface"`),
      held,
      "cannot place",
    ],
    [
      "second corpus row",
      `${register}{"digest":"00","record":"corpus"}\n`,
      held,
      "exactly one corpus",
    ],
  ]
  for (const [name, mutated, files, reason] of probes) {
    const probed = checkKernelSurfaces(mutated, files)
    if (probed.ok) {
      console.error(`KERNEL SURFACES CONTROL: FAIL - probe ${name} was accepted`)
      process.exit(1)
    }
    if (!probed.reason.includes(reason)) {
      console.error(
        `KERNEL SURFACES CONTROL: FAIL - probe ${name} refused for the wrong reason: ${probed.reason}`,
      )
      process.exit(1)
    }
  }
  const healthy = checkKernelSurfaces(register, held)
  if (!healthy.ok) {
    console.error(`KERNEL SURFACES CONTROL: FAIL - the healthy tree was refused: ${healthy.reason}`)
    process.exit(1)
  }
  console.log(
    `KERNEL SURFACES CONTROL: PASS (${probes.length} probes refused on their own reason;` +
      " healthy tree accepted)",
  )
  process.exit(0)
}

const checked = checkKernelSurfaces(register, held)
if (!checked.ok) {
  console.error(`KERNEL SURFACES: FAIL - ${checked.reason}`)
  console.error("  the surfaces are emitted by the kernel model; regenerate them and the")
  console.error("  register together under verify/unity, then commit both with the change")
  process.exit(1)
}
console.log(
  `KERNEL SURFACES: PASS (${checked.surfaces} committed surfaces and the corpus hash as the` +
    " model emitter's register states; byte-identical regeneration is walled where the emitter runs)",
)
