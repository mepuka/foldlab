/**
 * The plane-layering wall — standing law 4's mechanical arm.
 *
 * The law is the estate's fourth standing law, quoted from the root
 * `AGENTS.md`: *truth ← kernel ← planes ← carriage ← surface; a layer imports
 * only itself and deeper.* A module in a shallower plane may name a deeper one;
 * the reverse is a blocker-severity finding. Type-only imports are imports: the
 * law carves out no exception, and `src/carriage/README.md` says so where it
 * names the two edges this wall was minted to watch.
 *
 * What makes this a wall rather than a tautology is that its inputs are
 * separate artifacts, and no two of them are views of one value:
 *
 * 1. **The import graph** is read out of the *bytes* of every module under
 *    `src/`, through the TypeScript AST — never by importing a module and
 *    asking the runtime what it loaded. A module graph learned by loading is a
 *    graph the loader already resolved, and a `import type` edge would vanish
 *    from it entirely.
 * 2. **Each module's plane** is read twice and the two readings must agree:
 *    once from the directory it sits in (the reorg spec's "Directory = plane"),
 *    once from the `Plane:` tag its own header declares. A file moved between
 *    planes without its header following is a refusal, so neither reading can
 *    drift alone.
 * 3. **The ladder itself** is read out of the *bytes* of the root `AGENTS.md`,
 *    where law 4 is written down, and compared against the order this module
 *    encodes. A reworded or reordered law reddens the wall naming the stale
 *    transcription rather than quietly enforcing yesterday's order.
 *
 * ## Placement is ruled, never invented here
 *
 * Every placement this module encodes is a citation, not a judgment:
 *
 * - The five planes and their order: root `AGENTS.md`, standing law 4.
 * - `internal/` is exempt from the ladder — "private adapters and helpers,
 *   importable from any layer": `scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md`
 *   §2, RATIFIED by the operator 2026-08-18. Its companion clause ("never
 *   itself importing a public module except its own seam's siblings") has no
 *   mechanical reading until "its own seam's siblings" is ruled, so this wall
 *   claims nothing about edges leaving `internal/` and says so in its PASS
 *   line rather than counting them as clean.
 * - `src/index.ts` wears the surface plane: `src/surface/README.md` — "Two
 *   files wear this plane — `cli.ts` ... and `../index.ts`, the curated barrel
 *   that *is* the public surface."
 *
 * A directory or a root-level module that no document places is a REFUSAL, not
 * a skip: the roster arm exists so that a new plane cannot enter the tree by
 * being unmentioned.
 *
 * The mutation arm is `check:layering-control`: it plants one shallower-facing
 * import into a clean module's source bytes and requires this same law to
 * refuse it for the reason committed in the control's trace.
 *
 * @module
 */
import { posix } from "node:path"

import * as ts from "typescript-five"

/** The walked tree, relative to the repository root. */
export const SOURCE_ROOT = "packages/plait/src"

/** The file law 4 is written down in, relative to the repository root. */
export const STANDING_LAW_PATH = "AGENTS.md"

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

/** A directory under `src/` that a ruling keeps off the ladder. */
export interface StatedExclusion {
  /** The directory name directly under `src/`. */
  readonly directory: string
  /** The ruling, in its own words. */
  readonly why: string
  /** Where that ruling is written down. */
  readonly citation: string
}

/**
 * The exclusion roster. Every entry is a ruling someone made and wrote down;
 * an unstated placement belongs in a report to the operator, never here.
 */
export const STATED_EXCLUSIONS: ReadonlyArray<StatedExclusion> = [
  {
    directory: "internal",
    why:
      "internal/ is exempt: it is private adapters and helpers, importable from"
      + " any layer, never itself importing a public module except its own"
      + " seam's siblings",
    citation:
      "scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md §2"
      + " (RATIFIED by the operator 2026-08-18)",
  },
]

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

/** Where a module sits on the ladder, or why it is off it. */
export type Placement =
  | { readonly sort: "plane"; readonly plane: Plane }
  | { readonly sort: "excluded"; readonly exclusion: StatedExclusion }
  | { readonly sort: "unplaced"; readonly reason: string }

/** Where an import specifier points. */
export type Target =
  | { readonly sort: "external" }
  | { readonly sort: "local"; readonly path: string }
  | { readonly sort: "escapes"; readonly path: string }

/** One module of the walked tree, read from its bytes. */
export interface PlaneModule {
  /** Path relative to `src/`, forward slashes: `kernel/KernelProgram.ts`. */
  readonly path: string
  /** The plane the directory places it in. */
  readonly placement: Placement
  /** The plane its own header declares, or the refusal that read produced. */
  readonly declaredPlane: DeclaredPlane
  /** Every import, re-export, and dynamic import the bytes carry. */
  readonly imports: ReadonlyArray<ModuleImport>
}

/** The verdict on one module. */
export type LayeringCheck =
  | {
    readonly ok: true
    /** Edges between two ladder planes, this module's own plane included. */
    readonly ladderEdges: number
    /** Edges into a stated exclusion, which this wall does not judge. */
    readonly exemptEdges: number
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

/** What a module's header says its plane is, or why the read found nothing. */
export type DeclaredPlane =
  | { readonly ok: true; readonly plane: string }
  | { readonly ok: false; readonly reason: string }

/**
 * Reads the `Plane:` tag out of a module's leading header comment. A module
 * with no tag is a refusal rather than an unplaced module: the tag is half of
 * the placement evidence, and a missing half must never read as agreement. The
 * refusal is returned rather than thrown so that one untagged module costs one
 * line of the report instead of the rest of the walk.
 */
export const readDeclaredPlane = (source: string, path: string): DeclaredPlane => {
  const start = source.startsWith("#!") ? source.indexOf("\n") + 1 : 0
  const ranges = ts.getLeadingCommentRanges(source, start) ?? []
  for (const range of ranges) {
    const comment = source.slice(range.pos, range.end)
    const tag = /^[\s*/]*Plane:\s*([A-Za-z]+)\b/m.exec(comment)
    if (tag !== null) return { ok: true, plane: tag[1]! }
  }
  return {
    ok: false,
    reason: `${path} declares no \`Plane:\` tag in its header comment`,
  }
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
 * Places one `src/`-relative path on the ladder, off it, or nowhere. Nowhere is
 * a refusal the caller must report: a directory no ruling names is exactly the
 * silent guess this wall exists to prevent.
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
  const exclusion = STATED_EXCLUSIONS.find((entry) => entry.directory === directory)
  if (exclusion !== undefined) return { sort: "excluded", exclusion }
  return {
    sort: "unplaced",
    reason:
      `${sourcePath(relative)} sits in ${quote(directory)}, which law 4 does not name`
      + ` and no stated exclusion covers`,
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

/**
 * The layering law, evaluated over one module.
 *
 * Every clause is separate because a red wall has to name which one moved, and
 * every refusal names the file, the import, and the law — in that order, so the
 * first line of a failure is already the repair site.
 */
export const checkModuleLayering = (module: PlaneModule): LayeringCheck => {
  const reasons: Array<string> = []
  const here = sourcePath(module.path)

  if (module.placement.sort === "unplaced") {
    return { ok: false, reasons: [`${module.placement.reason}\n  ${LAYERING_LAW}`] }
  }

  const expected = module.placement.sort === "plane"
    ? module.placement.plane
    : module.placement.exclusion.directory
  if (!module.declaredPlane.ok) {
    reasons.push(`${module.declaredPlane.reason}\n  ${LAYERING_LAW}`)
  } else if (module.declaredPlane.plane !== expected) {
    reasons.push(
      `${here} declares \`Plane: ${module.declaredPlane.plane}\` while sitting in`
        + ` ${quote(expected)}; the directory and the header must agree\n  ${LAYERING_LAW}`,
    )
  }

  // The exemption is a ruling about edges INTO `internal/`, and this wall reads
  // it no wider than that: nothing here judges what `internal/` imports, so an
  // excluded module's own edges are neither counted nor cleared.
  if (module.placement.sort === "excluded") {
    return reasons.length === 0
      ? { ok: true, ladderEdges: 0, exemptEdges: 0 }
      : { ok: false, reasons }
  }

  const depth = PLANE_LADDER.indexOf(module.placement.plane)
  let ladderEdges = 0
  let exemptEdges = 0

  for (const edge of module.imports) {
    const target = resolveTarget(module.path, edge.specifier)
    if (target.sort === "external") continue
    if (target.sort === "escapes") {
      reasons.push(
        `${here}:${edge.line} imports ${quote(edge.specifier)}, which resolves outside`
          + ` ${SOURCE_ROOT}; no ruling places a module there on the ladder\n  ${LAYERING_LAW}`,
      )
      continue
    }
    const placement = placeModule(target.path)
    if (placement.sort === "unplaced") {
      reasons.push(
        `${here}:${edge.line} imports ${quote(edge.specifier)}: ${placement.reason}`
          + `\n  ${LAYERING_LAW}`,
      )
      continue
    }
    if (placement.sort === "excluded") {
      exemptEdges += 1
      continue
    }
    ladderEdges += 1
    const targetDepth = PLANE_LADDER.indexOf(placement.plane)
    if (targetDepth <= depth) continue
    const note = edge.typeOnly
      ? " (type-only; the layering law carves out no exception)"
      : ""
    reasons.push(
      `${here}:${edge.line} imports ${quote(edge.specifier)}${note}: plane`
        + ` ${module.placement.plane} imports plane ${placement.plane}, which is`
        + ` shallower\n  ${LAYERING_LAW}`,
    )
  }

  return reasons.length === 0 ? { ok: true, ladderEdges, exemptEdges } : { ok: false, reasons }
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
 * five planes plus the stated exclusions. A new directory is a refusal, so a
 * sixth plane cannot enter the tree by going unmentioned, and a deleted one is
 * a refusal too, so the wall cannot keep passing over a plane that is gone.
 */
export const checkDirectoryRoster = (
  directories: ReadonlyArray<string>,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
  const known = new Set<string>([
    ...PLANE_LADDER,
    ...STATED_EXCLUSIONS.map((entry) => entry.directory),
  ])
  const seen = new Set(directories)
  for (const directory of directories) {
    if (known.has(directory)) continue
    return {
      ok: false,
      reason:
        `${SOURCE_ROOT}/${directory}/ is on neither law 4's ladder nor the stated`
        + ` exclusion roster; its placement is a ruling this wall will not invent`,
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
