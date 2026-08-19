/**
 * The plane-layering wall — standing law 4's mechanical arm.
 *
 * The law is the estate's fourth standing law, quoted from the root
 * `AGENTS.md`: *truth ← kernel ← planes ← carriage ← surface; a layer imports
 * only itself and deeper.* A module in a shallower plane may name a deeper one;
 * the reverse is a blocker-severity finding. Type-only imports are imports: the
 * law carves out no exception, and `src/carriage/README.md` says so where it
 * names the edges this wall was minted to watch.
 *
 * ## Internal modules are plane members housed in a flat directory
 *
 * `src/internal/` stays flat, and every module in it declares a `Seam:` tag
 * naming the plane it belongs to. For the layering law that tag IS the module's
 * plane, so one rule covers the whole tree: for every edge, the target's plane
 * must be at or deeper than the source's. Read out, that is what the ruling
 * spells as two halves — an internal module may import public modules only of
 * its seam plane or deeper, and anything may import it only from that seam's
 * rank or shallower. Internal-to-internal edges compare the two seams.
 *
 * The earlier "importable from any layer" exemption is superseded, because it
 * was a laundering channel: a kernel module importing an internal adapter that
 * itself reaches carriage arrives at carriage through the private bag, and no
 * arm saw it. The old spec's "its own seam's siblings" phrase now has a
 * mechanical reading — the public modules of its seam plane.
 *
 * ## Truth's internal edges are tolerated, not encouraged
 *
 * Truth is the deepest plane and imports only itself. A seam-tagged internal
 * edge out of `truth/` is tolerated where necessary and never encouraged: every
 * such edge is written down in a reviewed pin, and an edge absent from the pin
 * is refused even when both seam ranks are lawful. A lawful rank is the floor;
 * the reviewed diff is the discouragement. Folding the material into `truth/`
 * proper is preferred wherever a way exists.
 *
 * ## What makes this a wall rather than a tautology
 *
 * Its inputs are separate artifacts, and no two of them are views of one value:
 *
 * 1. **The import graph** is read out of the *bytes* of every module under
 *    `src/`, through the TypeScript AST — never by importing a module and
 *    asking the runtime what it loaded. A module graph learned by loading is a
 *    graph the loader already resolved, and an `import type` edge would vanish
 *    from it entirely.
 * 2. **Each module's plane** is read twice and the two readings must agree:
 *    once from the directory it sits in, once from the `Plane:` tag its own
 *    header declares. A file moved between planes without its header following
 *    is a refusal, so neither reading can drift alone.
 * 3. **The ladder itself** is read out of the *bytes* of the root `AGENTS.md`,
 *    where law 4 is written down, and compared against the order this module
 *    encodes. A reworded or reordered law reddens the wall naming the stale
 *    transcription rather than quietly enforcing yesterday's order.
 * 4. **The truth-edge pin** is a reviewed file that nothing generates and no
 *    generator reads. It cannot be satisfied by editing a header.
 *
 * ## Placement is ruled, never invented here
 *
 * Every placement this module encodes is a citation, not a judgment: the five
 * planes and their order come from root `AGENTS.md` law 4; the seam discipline
 * and the truth-edge pin come from the DEV-767 round-two ruling recorded in
 * `../DECISIONS.md`; `src/index.ts` wears the surface plane because
 * `src/surface/README.md` says two files wear that plane and names it as one of
 * them. A directory or a root-level module that no document places is a
 * REFUSAL, not a skip: the roster arm exists so that a new plane cannot enter
 * the tree by being unmentioned.
 *
 * The mutation arm is `check:layering-control`.
 *
 * @module
 */
import { readdirSync } from "node:fs"
import { posix, resolve } from "node:path"

import * as ts from "typescript-five"

/** The walked tree, relative to the repository root. */
export const SOURCE_ROOT = "packages/plait/src"

/** The file law 4 is written down in, relative to the repository root. */
export const STANDING_LAW_PATH = "AGENTS.md"

/** The reviewed truth-edge pin, relative to the repository root. */
export const TRUTH_EDGE_PIN_PATH = "packages/plait/test/fixtures/truth-internal-edges.pin.txt"

/**
 * The ladder, deepest first: an index in this array IS a plane's depth, and the
 * law is that no module's import may name a plane with a higher index than its
 * own. Transcribed from law 4 and held to those bytes by
 * {@link checkStandingLaw}.
 */
export const PLANE_LADDER = ["truth", "kernel", "planes", "carriage", "surface"] as const

/** One of the five planes law 4 names. */
export type Plane = typeof PLANE_LADDER[number]

/**
 * The law, in the words the refusal quotes. Transcribed rather than rendered
 * from the read of `AGENTS.md`, so that an editorial pass over the standing
 * laws moves {@link checkStandingLaw}'s arm — which names the transcription —
 * instead of silently rewriting every committed control trace.
 */
export const LAYERING_LAW =
  `law 4 — plane layering: ${PLANE_LADDER.join(" ← ")};`
  + " a layer imports only itself and deeper"

/** The clause law 4 states the direction in, held against the law's own bytes. */
export const LAYERING_CLAUSE = "a layer imports only itself and deeper"

/** The directory whose modules are plane members by their `Seam:` tag. */
export const SEAM_DIRECTORY = "internal"

/** A module directly under `src/` whose plane a ruling states. */
export interface StatedRootModule {
  /** The file name directly under `src/`. */
  readonly file: string
  /** The plane the ruling gives it. */
  readonly plane: Plane
  /** Where that ruling is written down. */
  readonly citation: string
}

/**
 * Modules that sit at the root of `src/` rather than inside a plane directory.
 * There is exactly one, and a document places it.
 */
export const STATED_ROOT_MODULES: ReadonlyArray<StatedRootModule> = [
  {
    file: "index.ts",
    plane: "surface",
    citation:
      "packages/plait/src/surface/README.md — \"Two files wear this plane —"
      + " cli.ts ... and ../index.ts, the curated barrel that *is* the public"
      + " surface.\"",
  },
]

/** One import edge, as the source bytes spell it. */
export interface ModuleImport {
  /** The specifier exactly as written. */
  readonly specifier: string
  /** 1-based line of the statement that carries it. */
  readonly line: number
  /** Whether the whole edge is erased at compile time. Imports either way. */
  readonly typeOnly: boolean
}

/** Where a module sits in the tree. */
export type Placement =
  | { readonly sort: "plane"; readonly plane: Plane }
  | { readonly sort: "seamed" }
  | { readonly sort: "unplaced"; readonly reason: string }

/** Where an import specifier points. */
export type Target =
  | { readonly sort: "external" }
  | { readonly sort: "local"; readonly path: string }
  | { readonly sort: "escapes"; readonly path: string }

/** What a module's header says its plane is, or why the read found nothing. */
export type DeclaredPlane =
  | { readonly ok: true; readonly plane: string }
  | { readonly ok: false; readonly reason: string }

/** What a module's header says its seam is. Absence is lawful off `internal/`. */
export type DeclaredSeam =
  | { readonly sort: "absent" }
  | { readonly sort: "declared"; readonly seam: string }

/** One module of the walked tree, read from its bytes. */
export interface PlaneModule {
  /** Path relative to `src/`, forward slashes: `kernel/KernelProgram.ts`. */
  readonly path: string
  /** Where the directory puts it. */
  readonly placement: Placement
  /** The plane its own header declares, or the refusal that read produced. */
  readonly declaredPlane: DeclaredPlane
  /** The seam its own header declares. Required in `internal/`, refused outside. */
  readonly declaredSeam: DeclaredSeam
  /** Every import, re-export, and dynamic import the bytes carry. */
  readonly imports: ReadonlyArray<ModuleImport>
}

/** The seam every `internal/` module belongs to, by `src/`-relative path. */
export type SeamIndex = ReadonlyMap<string, Plane>

/** One reviewed row of the truth-edge pin. */
export interface PinnedTruthEdge {
  /** `src/`-relative path of the truth-plane importer. */
  readonly importer: string
  /** `src/`-relative path of the internal module it reaches. */
  readonly imported: string
  /** Why the material has not been folded into `truth/` proper. */
  readonly why: string
}

/** The verdict on one module. */
export type LayeringCheck =
  | {
    readonly ok: true
    /** Edges whose two ends the ladder ranks, this module's own plane included. */
    readonly edges: number
  }
  | { readonly ok: false; readonly reasons: ReadonlyArray<string> }

const quote = (value: string): string => JSON.stringify(value)

// Annotated at the binding, not only at the arrow, so a bare `refuse(...)`
// reads as control flow that does not return.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`plane layering: ${reason}`)
}

const parse = (source: string, path: string): ts.SourceFile =>
  ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)

/** The repository-relative path a `src/`-relative one names. */
export const sourcePath = (relative: string): string => `${SOURCE_ROOT}/${relative}`

const headerComments = (source: string): ReadonlyArray<string> => {
  const start = source.startsWith("#!") ? source.indexOf("\n") + 1 : 0
  return (ts.getLeadingCommentRanges(source, start) ?? [])
    .map((range) => source.slice(range.pos, range.end))
}

/**
 * Reads the `Plane:` tag out of a module's leading header comment. A module
 * with no tag is a refusal rather than an unplaced module: the tag is half of
 * the placement evidence, and a missing half must never read as agreement. The
 * refusal is returned rather than thrown so that one untagged module costs one
 * line of the report instead of the rest of the walk.
 */
export const readDeclaredPlane = (source: string, path: string): DeclaredPlane => {
  for (const comment of headerComments(source)) {
    const tag = /^[\s*/]*Plane:\s*([A-Za-z]+)\b/m.exec(comment)
    if (tag !== null) return { ok: true, plane: tag[1]! }
  }
  return {
    ok: false,
    reason: `${path} declares no \`Plane:\` tag in its header comment`,
  }
}

/**
 * Reads the `Seam:` tag out of a module's leading header comment. Absence is a
 * fact, not a refusal, because only `internal/` modules carry one — which of
 * the two is lawful here is the caller's law, not the reader's.
 */
export const readDeclaredSeam = (source: string): DeclaredSeam => {
  for (const comment of headerComments(source)) {
    const tag = /^[\s*/]*Seam:\s*([A-Za-z]+)\b/m.exec(comment)
    if (tag !== null) return { sort: "declared", seam: tag[1]! }
  }
  return { sort: "absent" }
}

const isDynamicImport = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword

/**
 * Reads every module specifier the bytes carry: static imports, re-exports,
 * `import =` requires, and dynamic `import(...)` calls, type-only or not. The
 * walk is over the whole tree rather than the top-level statements, because a
 * dynamic import nested in a function body is an edge in the module graph just
 * the same.
 */
export const readModuleImports = (
  source: string,
  path: string,
): ReadonlyArray<ModuleImport> => {
  const file = parse(source, path)
  const found: Array<ModuleImport> = []
  const at = (node: ts.Node): number =>
    file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1

  const record = (specifier: ts.Expression, node: ts.Node, typeOnly: boolean): void => {
    if (!ts.isStringLiteralLike(specifier)) return
    found.push({ specifier: specifier.text, line: at(node), typeOnly })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      record(node.moduleSpecifier, node, node.importClause?.isTypeOnly === true)
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      record(node.moduleSpecifier, node, node.isTypeOnly)
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
    ) {
      record(node.moduleReference.expression, node, node.isTypeOnly)
    } else if (isDynamicImport(node)) {
      const first = node.arguments[0]
      if (first !== undefined) record(first, node, false)
    }
    ts.forEachChild(node, visit)
  }

  visit(file)
  return found
}

/**
 * Places one `src/`-relative path in the tree. Nowhere is a refusal the caller
 * must report: a directory no ruling names is exactly the silent guess this
 * wall exists to prevent.
 */
export const placeModule = (relative: string): Placement => {
  const segments = relative.split("/")
  if (segments.length === 1) {
    const stated = STATED_ROOT_MODULES.find((module) => module.file === relative)
    if (stated !== undefined) return { sort: "plane", plane: stated.plane }
    return {
      sort: "unplaced",
      reason:
        `${sourcePath(relative)} sits at the root of ${SOURCE_ROOT} and no ruling`
        + ` places it on the ladder`,
    }
  }
  const directory = segments[0]!
  const plane = PLANE_LADDER.find((name) => name === directory)
  if (plane !== undefined) return { sort: "plane", plane }
  if (directory === SEAM_DIRECTORY) return { sort: "seamed" }
  return {
    sort: "unplaced",
    reason:
      `${sourcePath(relative)} sits in ${quote(directory)}, which law 4 does not name`
      + ` and which is not the seam-tagged ${quote(SEAM_DIRECTORY)} directory`,
  }
}

/**
 * Resolves one specifier written in a module at `from` (a `src/`-relative
 * path). A bare specifier is a package dependency and no plane edge; a relative
 * one that leaves `src/` is reported as an escape rather than silently placed.
 */
export const resolveTarget = (from: string, specifier: string): Target => {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return { sort: "external" }
  }
  const joined = posix.normalize(posix.join(posix.dirname(from), specifier))
  // The package writes ESM specifiers against the emitted `.js`; the module
  // those bytes name is the sibling `.ts`.
  const path = joined.endsWith(".js") ? `${joined.slice(0, -3)}.ts` : joined
  if (path === ".." || path.startsWith("../")) return { sort: "escapes", path }
  return { sort: "local", path }
}

/** The plane a module counts as for the layering law, seam tags included. */
export type Membership =
  | { readonly sort: "plane"; readonly plane: Plane }
  | { readonly sort: "unseamed" }
  | { readonly sort: "unplaced"; readonly reason: string }

/** The plane a seam tag names, or nothing when it names none of the five. */
export const seamPlane = (declared: DeclaredSeam): Plane | undefined =>
  declared.sort === "declared"
    ? PLANE_LADDER.find((name) => name === declared.seam)
    : undefined

/**
 * The one rule the whole ruling collapses to: a module's plane is its directory
 * for the five planes, and its declared seam for `internal/`. Outbound and
 * inbound are then the same inequality read from the two ends.
 *
 * This is the read for an import TARGET, where a path is all the caller has, so
 * the seam comes from the index. A module judging ITSELF reads its own header
 * instead — see {@link checkModuleLayering} — because a module missing from the
 * index would otherwise be refused with nothing to say.
 */
export const membershipOf = (path: string, seams: SeamIndex): Membership => {
  const placement = placeModule(path)
  if (placement.sort === "unplaced") return { sort: "unplaced", reason: placement.reason }
  if (placement.sort === "plane") return { sort: "plane", plane: placement.plane }
  const seam = seams.get(path)
  return seam === undefined ? { sort: "unseamed" } : { sort: "plane", plane: seam }
}

/** The seam index the walked modules declare, keyed by `src/`-relative path. */
export const seamIndexOf = (modules: ReadonlyArray<PlaneModule>): SeamIndex => {
  const index = new Map<string, Plane>()
  for (const module of modules) {
    if (module.placement.sort !== "seamed") continue
    if (module.declaredSeam.sort !== "declared") continue
    const declared = module.declaredSeam.seam
    const seam = PLANE_LADDER.find((name) => name === declared)
    if (seam !== undefined) index.set(module.path, seam)
  }
  return index
}

/**
 * Reads the reviewed truth-edge pin. Comment and blank lines are ignored; a
 * content line is `<importer> <imported> <why>`.
 */
export const readTruthEdgePin = (
  pin: string,
  path: string,
): ReadonlyArray<PinnedTruthEdge> => {
  const rows: Array<PinnedTruthEdge> = []
  const lines = pin.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.trim()
    if (line === "" || line.startsWith("#")) continue
    const parts = line.split(" ").filter((part) => part !== "")
    if (parts.length < 3) {
      return refuse(
        `${path} line ${index + 1} is not an "<importer> <imported> <why>" row`,
      )
    }
    rows.push({
      importer: parts[0]!,
      imported: parts[1]!,
      why: parts.slice(2).join(" "),
    })
  }
  return rows
}

const pinned = (
  pin: ReadonlyArray<PinnedTruthEdge>,
  importer: string,
  imported: string,
): boolean => pin.some((row) => row.importer === importer && row.imported === imported)

/**
 * The layering law, evaluated over one module against the seams the tree
 * declares and the reviewed truth-edge pin.
 *
 * Every clause is separate because a red wall has to name which one moved, and
 * every refusal names the file, the import, and the law — in that order, so the
 * first line of a failure is already the repair site.
 */
export const checkModuleLayering = (
  module: PlaneModule,
  seams: SeamIndex,
  pin: ReadonlyArray<PinnedTruthEdge>,
): LayeringCheck => {
  const reasons: Array<string> = []
  const here = sourcePath(module.path)
  const law = (reason: string): string => `${reason}\n  ${LAYERING_LAW}`

  if (module.placement.sort === "unplaced") {
    return { ok: false, reasons: [law(module.placement.reason)] }
  }

  const expected = module.placement.sort === "plane"
    ? module.placement.plane
    : SEAM_DIRECTORY
  if (!module.declaredPlane.ok) {
    reasons.push(law(module.declaredPlane.reason))
  } else if (module.declaredPlane.plane !== expected) {
    reasons.push(law(
      `${here} declares \`Plane: ${module.declaredPlane.plane}\` while sitting in`
        + ` ${quote(expected)}; the directory and the header must agree`,
    ))
  }

  // The seam tag is what makes an internal module a plane member, so it is
  // required exactly where the flat directory is and refused everywhere else —
  // a plane module carrying one would be claiming a membership it already has.
  if (module.placement.sort === "seamed") {
    if (module.declaredSeam.sort === "absent") {
      reasons.push(law(
        `${here} declares no \`Seam:\` tag in its header comment; an internal module`
          + ` is a member of the plane its seam names`,
      ))
    } else {
      const declared = module.declaredSeam.seam
      if (!PLANE_LADDER.some((name) => name === declared)) {
        reasons.push(law(
          `${here} declares \`Seam: ${declared}\`, which law 4 does not name`,
        ))
      }
    }
  } else if (module.declaredSeam.sort === "declared") {
    reasons.push(law(
      `${here} declares \`Seam: ${module.declaredSeam.seam}\` while sitting on the`
        + ` ${expected} plane; only ${SEAM_DIRECTORY}/ modules carry a seam`,
    ))
  }

  // A module's OWN membership is read from its own header, never from the seam
  // index: the index is built for targets, and a module absent from it would
  // otherwise be refused with nothing to say.
  const mine = module.placement.sort === "plane"
    ? module.placement.plane
    : seamPlane(module.declaredSeam)
  if (mine === undefined) {
    // Without a readable seam there is no rank to judge this module's edges by.
    // The tag clause above has already said so; inventing a rank to keep walking
    // would be the guess this wall exists to refuse. The belt-and-braces reason
    // is here because a refusal that names nothing is worse than a crash.
    if (reasons.length === 0) {
      reasons.push(law(`${here} has no readable seam, so its edges cannot be ranked`))
    }
    return { ok: false, reasons }
  }

  const depth = PLANE_LADDER.indexOf(mine)
  let edges = 0

  for (const edge of module.imports) {
    const target = resolveTarget(module.path, edge.specifier)
    if (target.sort === "external") continue
    if (target.sort === "escapes") {
      reasons.push(law(
        `${here}:${edge.line} imports ${quote(edge.specifier)}, which resolves outside`
          + ` ${SOURCE_ROOT}; no ruling places a module there on the ladder`,
      ))
      continue
    }
    const reached = membershipOf(target.path, seams)
    if (reached.sort === "unplaced") {
      reasons.push(law(
        `${here}:${edge.line} imports ${quote(edge.specifier)}: ${reached.reason}`,
      ))
      continue
    }
    if (reached.sort === "unseamed") {
      reasons.push(law(
        `${here}:${edge.line} imports ${quote(edge.specifier)}, whose \`Seam:\` tag the`
          + ` wall could not read; an unseamed internal module has no plane to rank`,
      ))
      continue
    }
    edges += 1
    const note = edge.typeOnly
      ? " (type-only; the layering law carves out no exception)"
      : ""
    const targetDepth = PLANE_LADDER.indexOf(reached.plane)
    if (targetDepth > depth) {
      // A seamed module is named by its seam rather than by "plane", so a
      // refusal reads as the ruling does: the tag IS the membership.
      const from = module.placement.sort === "seamed" ? "seam" : "plane"
      const into = target.path.startsWith(`${SEAM_DIRECTORY}/`) ? "seam" : "plane"
      reasons.push(law(
        `${here}:${edge.line} imports ${quote(edge.specifier)}${note}: ${from}`
          + ` ${mine} imports ${into} ${reached.plane}, which is shallower`,
      ))
      continue
    }
    // Truth's seam-tagged internal edges are tolerated where necessary, never
    // encouraged: a lawful rank is the floor, and the reviewed pin is the
    // licence. Folding the material into `truth/` proper is preferred.
    if (
      module.placement.sort === "plane"
      && module.placement.plane === "truth"
      && target.path.startsWith(`${SEAM_DIRECTORY}/`)
      && !pinned(pin, module.path, target.path)
    ) {
      reasons.push(law(
        `${here}:${edge.line} imports ${quote(edge.specifier)}${note}: a truth-plane`
          + ` edge into ${SEAM_DIRECTORY}/ is tolerated only where pinned, and`
          + ` ${TRUTH_EDGE_PIN_PATH} does not carry this row`,
      ))
    }
  }

  return reasons.length === 0 ? { ok: true, edges } : { ok: false, reasons }
}

/**
 * The pin's own staleness clause. A row naming an edge the tree no longer
 * carries is a refusal: a pin that outlives its edge is a standing licence
 * nobody reviewed, and the whole point of the roster is that it is read.
 */
export const checkTruthEdgePin = (
  modules: ReadonlyArray<PlaneModule>,
  pin: ReadonlyArray<PinnedTruthEdge>,
): { readonly ok: true; readonly pinned: number } | {
  readonly ok: false
  readonly reason: string
} => {
  const live = new Set<string>()
  for (const module of modules) {
    if (module.placement.sort !== "plane" || module.placement.plane !== "truth") continue
    for (const edge of module.imports) {
      const target = resolveTarget(module.path, edge.specifier)
      if (target.sort !== "local") continue
      if (!target.path.startsWith(`${SEAM_DIRECTORY}/`)) continue
      live.add(`${module.path} ${target.path}`)
    }
  }
  for (const row of pin) {
    if (live.has(`${row.importer} ${row.imported}`)) continue
    return {
      ok: false,
      reason:
        `${TRUTH_EDGE_PIN_PATH} pins ${quote(`${row.importer} → ${row.imported}`)},`
        + ` which the tree no longer carries; a pin that outlives its edge is an`
        + ` unreviewed licence`,
    }
  }
  return { ok: true, pinned: pin.length }
}

/** The ladder as the standing law's own bytes spell it. */
export interface StandingLaw {
  readonly ladder: ReadonlyArray<string>
  readonly clause: string
}

/**
 * Reads law 4's ladder out of the root `AGENTS.md`. The law lives in prose and
 * wraps across lines, so the read joins the paragraph up to the wall sentence
 * and pulls the arrow chain out of it.
 */
export const readStandingLaw = (source: string, path: string): StandingLaw => {
  const heading = source.indexOf("**Plane layering.**")
  if (heading === -1) return refuse(`${path} carries no \`**Plane layering.**\` law`)
  const rest = source.slice(heading)
  const end = rest.indexOf("Wall:")
  if (end === -1) return refuse(`${path}'s plane-layering law names no wall`)
  const statement = rest.slice(0, end).replaceAll(/\s+/g, " ")
  const chain = /([a-z]+(?:\s*←\s*[a-z]+)+)/.exec(statement)
  if (chain === null) return refuse(`${path}'s plane-layering law states no ladder`)
  return {
    ladder: chain[1]!.split("←").map((name) => name.trim()),
    clause: statement.includes(LAYERING_CLAUSE) ? LAYERING_CLAUSE : statement,
  }
}

/**
 * Holds the transcription above to the law's own bytes. A reordered ladder, a
 * renamed plane, or a reworded direction clause reddens here, naming the
 * transcription — never in the graph walk, where it would read as a code
 * finding rather than a stale wall.
 */
export const checkStandingLaw = (law: StandingLaw): { readonly ok: true } | {
  readonly ok: false
  readonly reason: string
} => {
  const stated = law.ladder.join(" ← ")
  const encoded = PLANE_LADDER.join(" ← ")
  if (stated !== encoded) {
    return {
      ok: false,
      reason:
        `${STANDING_LAW_PATH} states the ladder as ${quote(stated)} while this wall`
        + ` encodes ${quote(encoded)}; the transcription is stale`,
    }
  }
  if (law.clause !== LAYERING_CLAUSE) {
    return {
      ok: false,
      reason:
        `${STANDING_LAW_PATH} no longer states ${quote(LAYERING_CLAUSE)}; the wall's`
        + ` direction clause is stale`,
    }
  }
  return { ok: true }
}

/**
 * The roster arm: the directories directly under `src/` must be exactly the
 * five planes plus the seam-tagged flat directory. A new directory is a
 * refusal, so a sixth plane cannot enter the tree by going unmentioned, and a
 * deleted one is a refusal too, so the wall cannot keep passing over a plane
 * that is gone.
 */
export const checkDirectoryRoster = (
  directories: ReadonlyArray<string>,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
  const known = new Set<string>([...PLANE_LADDER, SEAM_DIRECTORY])
  const seen = new Set(directories)
  for (const directory of directories) {
    if (known.has(directory)) continue
    return {
      ok: false,
      reason:
        `${SOURCE_ROOT}/${directory}/ is neither on law 4's ladder nor the seam-tagged`
        + ` ${SEAM_DIRECTORY}/ directory; its placement is a ruling this wall will not`
        + ` invent`,
    }
  }
  for (const directory of known) {
    if (seen.has(directory)) continue
    return {
      ok: false,
      reason: `${SOURCE_ROOT}/${directory}/ is named by the wall but absent from the tree`,
    }
  }
  return { ok: true }
}

/**
 * The `src/`-relative paths of every module the wall walks, sorted, so a
 * failure list reads the same on every host.
 */
export const walkSourceTree = (repository: string): ReadonlyArray<string> => {
  const root = resolve(repository, SOURCE_ROOT).replaceAll("\\", "/")
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) =>
      `${entry.parentPath}/${entry.name}`.replaceAll("\\", "/").slice(`${root}/`.length)
    )
    .sort()
}

/**
 * Reads the whole tree into modules. Shared by the wall and by its mutation
 * arm, so the control plants into the same graph the production check judges.
 */
export const readPlaneModules = async (
  repository: string,
): Promise<ReadonlyArray<PlaneModule>> => {
  const modules: Array<PlaneModule> = []
  for (const path of walkSourceTree(repository)) {
    const source = await Bun.file(resolve(repository, sourcePath(path))).text()
    modules.push({
      path,
      placement: placeModule(path),
      declaredPlane: readDeclaredPlane(source, sourcePath(path)),
      declaredSeam: readDeclaredSeam(source),
      imports: readModuleImports(source, sourcePath(path)),
    })
  }
  return modules
}
