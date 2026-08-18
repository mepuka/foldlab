import { readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import * as ts from "typescript-five"

const packageRoot = resolve(import.meta.dir, "..")

const corpusAnchors = [
  "src/kernel/KernelCorpusSchemas.d.ts",
  "src/kernel/KernelSchemas.generated.d.ts",
  "src/kernel/KernelTables.generated.d.ts",
] as const

export type PublicTypeClassification =
  | "corpus-derived"
  | "truth-floor"
  | "UNTRACED"

export interface ClassifiedPublicType {
  readonly publicType: string
  readonly owner: string
  readonly classification: PublicTypeClassification
}

export interface PublicTypeUniverseInspection {
  readonly classifications: ReadonlyArray<ClassifiedPublicType>
  readonly inventory: string
  readonly violations: string
}

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const collectDeclarations = (directory: string): ReadonlyArray<string> => {
  const declarations: Array<string> = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && entry.name.endsWith(".d.ts")) declarations.push(path)
    }
  }
  visit(directory)
  return declarations
}

const resolveAlias = (checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol =>
  symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

const moduleSymbol = (
  checker: ts.TypeChecker,
  source: ts.SourceFile,
): ts.Symbol => {
  const symbol = checker.getSymbolAtLocation(source)
  if (symbol === undefined) throw new Error(`declaration module has no symbol: ${source.fileName}`)
  return symbol
}

const sourceOwner = (directory: string, declaration: ts.Declaration): string => {
  const emittedRoot = `${normalizePath(resolve(directory))}/`
  const emitted = normalizePath(declaration.getSourceFile().fileName)
  if (!emitted.startsWith(emittedRoot)) {
    throw new Error(`public type declaration is outside the emitted package: ${emitted}`)
  }
  const relative = emitted.slice(emittedRoot.length)
  return relative.endsWith(".d.ts") ? `${relative.slice(0, -5)}.ts` : relative
}

const ownerDeclaration = (
  directory: string,
  exported: ts.Symbol,
  target: ts.Symbol,
): ts.Declaration => {
  const emittedRoot = `${normalizePath(resolve(directory))}/`
  const candidates = [
    ...(target.declarations ?? []),
    ...(exported.declarations ?? []),
  ]
  const declaration = candidates.find((candidate) =>
    normalizePath(candidate.getSourceFile().fileName).startsWith(emittedRoot))
  if (declaration === undefined) {
    throw new Error(`public type has no package-owned declaration: ${exported.name}`)
  }
  return declaration
}

const createProgram = (directory: string): ts.Program => {
  const roots = collectDeclarations(directory)
  const configPath = resolve(packageRoot, "tsconfig.json")
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"))
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(configPath),
    { noEmit: true },
    configPath,
  )
  const program = ts.createProgram({ rootNames: [...roots], options: parsed.options })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => packageRoot,
      getNewLine: () => "\n",
    }))
  }
  return program
}

const reachesCorpus = (
  checker: ts.TypeChecker,
  directory: string,
  initial: ts.Symbol,
): boolean => {
  const emittedRoot = `${normalizePath(resolve(directory))}/`
  const visited = new Set<ts.Symbol>()

  const visitSymbol = (candidate: ts.Symbol): boolean => {
    const symbol = resolveAlias(checker, candidate)
    if (visited.has(symbol)) return false
    visited.add(symbol)

    for (const declaration of symbol.declarations ?? []) {
      const file = normalizePath(declaration.getSourceFile().fileName)
      if (!file.startsWith(emittedRoot)) continue
      const relative = file.slice(emittedRoot.length)
      if (corpusAnchors.some((anchor) => anchor === relative)) return true
      if (visitNode(declaration)) return true
    }
    return false
  }

  const visitNode = (node: ts.Node): boolean => {
    const symbol = checker.getSymbolAtLocation(node)
    if (symbol !== undefined && visitSymbol(symbol)) return true
    let reached = false
    node.forEachChild((child) => {
      if (!reached && visitNode(child)) reached = true
    })
    return reached
  }

  return visitSymbol(initial)
}

const renderInventory = (
  classifications: ReadonlyArray<ClassifiedPublicType>,
): string => {
  const corpusDerived = classifications.filter(
    ({ classification }) => classification === "corpus-derived",
  ).length
  const truthFloor = classifications.filter(
    ({ classification }) => classification === "truth-floor",
  ).length
  const untraced = classifications.filter(
    ({ classification }) => classification === "UNTRACED",
  )
  return [
    "# Public type universe debt ledger",
    "",
    "<!-- Generated by: bun run generate:type-universe -->",
    "<!-- Authority: emitted declarations from src/index.ts own the public type quantifier. Declaration-symbol ancestry reaching KernelCorpusSchemas or either generated kernel table is corpus-derived; src/truth owners are the truth-vocabulary floor; every other type is UNTRACED. -->",
    "",
    `Classified ${classifications.length} public types: ${corpusDerived} corpus-derived, ${truthFloor} truth-floor, ${untraced.length} UNTRACED.`,
    "",
    "| Public type | Owning module | Classification |",
    "| --- | --- | --- |",
    ...untraced.map(({ publicType, owner }) =>
      `| \`${publicType}\` | \`${owner}\` | UNTRACED |`),
    "",
  ].join("\n")
}

/**
 * Classifies every type reachable as an export of the emitted public barrel.
 * Type ancestry follows declaration symbols rather than file-level imports, so
 * an unused corpus import cannot make an unrelated type look derived.
 */
export const inspectPublicTypeUniverse = (
  directory: string,
  entryRelative: string,
): PublicTypeUniverseInspection => {
  const program = createProgram(directory)
  const checker = program.getTypeChecker()
  const entryPath = resolve(directory, entryRelative)
  const entry = program.getSourceFile(entryPath)
  if (entry === undefined) throw new Error(`emitted entry is absent: ${entryPath}`)

  const classifications = new Map<string, ClassifiedPublicType>()
  const inspectExport = (
    exported: ts.Symbol,
    path: string,
    ancestors: ReadonlySet<ts.Symbol>,
  ): void => {
    const target = resolveAlias(checker, exported)
    if (target.flags & ts.SymbolFlags.Type) {
      const declaration = ownerDeclaration(directory, exported, target)
      const owner = sourceOwner(directory, declaration)
      const classification: PublicTypeClassification = owner.startsWith("src/truth/")
        ? "truth-floor"
        : reachesCorpus(checker, directory, target)
          ? "corpus-derived"
          : "UNTRACED"
      classifications.set(path, { publicType: path, owner, classification })
    }

    if (!(target.flags & ts.SymbolFlags.Module) || ancestors.has(target)) return
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(target)
    for (const child of checker.getExportsOfModule(target).sort((left, right) =>
      compareText(left.name, right.name))) {
      inspectExport(child, path === "" ? child.name : `${path}.${child.name}`, nextAncestors)
    }
  }

  const entryModule = moduleSymbol(checker, entry)
  for (const exported of checker.getExportsOfModule(entryModule).sort((left, right) =>
    compareText(left.name, right.name))) {
    inspectExport(exported, exported.name, new Set())
  }

  const ordered = [...classifications.values()].sort((left, right) =>
    compareText(left.publicType, right.publicType))
  if (ordered.length === 0) {
    throw new Error("public type universe is empty")
  }
  const violations = ordered
    .filter(({ classification }) => classification === "UNTRACED")
    .map(({ publicType, owner }) =>
      `PUBLIC TYPE UNIVERSE VIOLATION: ${publicType} owner=${owner} classification=UNTRACED`)
    .join("\n")

  return {
    classifications: ordered,
    inventory: renderInventory(ordered),
    violations: violations === "" ? "" : `${violations}\n`,
  }
}
