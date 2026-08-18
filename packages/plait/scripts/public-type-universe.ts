import { readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import * as ts from "typescript-five"

const packageRoot = resolve(import.meta.dir, "..")

const generatedCoreAnchors = [
  "src/kernel/KernelCorpusSchemas.d.ts",
  "src/kernel/KernelSchemas.generated.d.ts",
  "src/kernel/KernelTables.generated.d.ts",
] as const

interface PublicTypeIdentity {
  readonly publicType: string
  readonly owner: string
}

export interface GeneratedCorePublicType extends PublicTypeIdentity {
  readonly classification: "derives-from-the-generated-core"
}

export interface TicketedDebtPublicType extends PublicTypeIdentity {
  readonly classification: "debt-with-a-ticket"
  readonly ticket: string
  readonly unificationTarget: string
}

export type ClassifiedPublicType = GeneratedCorePublicType | TicketedDebtPublicType

export type PublicTypeClassification = ClassifiedPublicType["classification"]

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

/**
 * Every declaration of the resolved symbol must be owned by a generated anchor.
 * Asking for only one would bless a symbol a hand-written module augmentation
 * had merged into: that type keeps the generated declaration in its list while
 * carrying a hand-written member, which is the false-positive direction law 1
 * forbids. A symbol with no declaration at all is debt, never a vacuous pass.
 */
const isDeclaredByGeneratedCore = (
  directory: string,
  symbol: ts.Symbol,
): boolean => {
  const emittedRoot = `${normalizePath(resolve(directory))}/`
  const declarations = symbol.declarations ?? []
  return declarations.length > 0 && declarations.every((declaration) => {
    const file = normalizePath(declaration.getSourceFile().fileName)
    if (!file.startsWith(emittedRoot)) return false
    const relative = file.slice(emittedRoot.length)
    return generatedCoreAnchors.some((anchor) => anchor === relative)
  })
}

const debtTarget = (
  owner: string,
): Pick<TicketedDebtPublicType, "ticket" | "unificationTarget"> => {
  if (owner.startsWith("src/truth/")) {
    return {
      ticket: "DEV-795",
      unificationTarget: "stage 2+: converge truth primitives under the generated core",
    }
  }
  if (owner.startsWith("src/kernel/")) {
    return {
      ticket: "DEV-795",
      unificationTarget: "stage 2+: replace hand-written kernel declarations with generated projections",
    }
  }
  if (owner.startsWith("src/planes/")) {
    return {
      ticket: "DEV-795",
      unificationTarget: "stage 3: re-type plane declarations against generated core types",
    }
  }
  if (owner.startsWith("src/carriage/") || owner.startsWith("src/surface/")) {
    return {
      ticket: "DEV-763",
      unificationTarget: "stage 4: consume the shared generated-core candidate form through KernelDoor",
    }
  }
  if (owner.startsWith("negative-controls/")) {
    return {
      ticket: "DEV-796",
      unificationTarget: "stage 1 control: derive the planted type from the generated core",
    }
  }
  throw new Error(`public type debt has no unification ticket: ${owner}`)
}

const isTicketedDebt = (
  classification: ClassifiedPublicType,
): classification is TicketedDebtPublicType =>
  classification.classification === "debt-with-a-ticket"

const renderInventory = (
  classifications: ReadonlyArray<ClassifiedPublicType>,
  command: string,
): string => {
  const generatedCoreDerived = classifications.filter(
    ({ classification }) => classification === "derives-from-the-generated-core",
  ).length
  const debt = classifications.filter(isTicketedDebt)
  return [
    "# Public type universe debt ledger",
    "",
    `<!-- Generated by: ${command} -->`,
    "<!-- Authority: emitted declarations from src/index.ts own the public type quantifier. Only a resolved type declaration owned by KernelCorpusSchemas or either generated kernel table derives from the generated core; every hand-written declaration is ticketed debt with a named unification target, even when it mentions a generated type. -->",
    "",
    `Classified ${classifications.length} public types: ${generatedCoreDerived} derives-from-the-generated-core, ${debt.length} debt-with-a-ticket.`,
    "",
    "| Public type | Owning module | Classification | Unification ticket | Unification target |",
    "| --- | --- | --- | --- | --- |",
    ...debt.map(({ publicType, owner, ticket, unificationTarget }) =>
      `| \`${publicType}\` | \`${owner}\` | debt-with-a-ticket | \`${ticket}\` | ${unificationTarget} |`),
    "",
  ].join("\n")
}

/**
 * Classifies every type reachable as an export of the emitted public barrel.
 * A generated-core type is identified by its resolved declaration owner, so a
 * hand-written wrapper, union, or other structural twin cannot inherit the
 * generated declaration's authority merely by mentioning it.
 */
export const inspectPublicTypeUniverse = (
  directory: string,
  entryRelative: string,
  command: string,
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
      const classification: ClassifiedPublicType = isDeclaredByGeneratedCore(directory, target)
        ? {
            publicType: path,
            owner,
            classification: "derives-from-the-generated-core",
          }
        : {
            publicType: path,
            owner,
            classification: "debt-with-a-ticket",
            ...debtTarget(owner),
          }
      classifications.set(path, classification)
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
    .filter(isTicketedDebt)
    .map(({ publicType, owner, ticket, unificationTarget }) =>
      `PUBLIC TYPE UNIVERSE VIOLATION: ${publicType} owner=${owner} classification=debt-with-a-ticket ticket=${ticket} target=${unificationTarget}`)
    .join("\n")

  return {
    classifications: ordered,
    inventory: renderInventory(ordered, command),
    violations: violations === "" ? "" : `${violations}\n`,
  }
}
