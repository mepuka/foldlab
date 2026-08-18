import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { dirname, resolve, sep } from "node:path"
import * as ts from "typescript"

/**
 * The emitted-declaration walk is the load-bearing public-surface authority.
 * Its caller rejects an empty manifest, so declaration drift cannot erase the
 * quantified surface and pass vacuously.
 */
const packageRoot = resolve(import.meta.dir, "..")
const declarationCache = resolve(packageRoot, "node_modules/.cache")
const maximumSurfaceDepth = 8

export interface EmittedDeclarations {
  readonly directory: string
  readonly dispose: () => void
}

export interface PublicEffectInspection {
  readonly manifest: string
  readonly violations: string
}

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

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

/**
 * Emission is async so callers can run several projects at once: each call
 * already owns a private `--outDir` under the cache, so concurrent compilers
 * share nothing but the directory they were minted from.
 */
export const emitDeclarations = async (project: string): Promise<EmittedDeclarations> => {
  mkdirSync(declarationCache, { recursive: true })
  const directory = mkdtempSync(resolve(declarationCache, "plait-public-effects-"))
  const child = Bun.spawn({
    cmd: [
      "bunx",
      "tsc",
      "-p",
      project,
      "--declaration",
      "--emitDeclarationOnly",
      "--noEmit",
      "false",
      "--outDir",
      directory,
      "--rootDir",
      ".",
      "--pretty",
      "false",
    ],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) {
    throw new Error(`public declaration emission failed\n${stdout}${stderr}`)
  }

  return {
    directory,
    dispose: () => {
      const resolvedCache = `${resolve(declarationCache)}${sep}`
      if (!resolve(directory).startsWith(resolvedCache)) {
        throw new Error(`refusing to remove non-cache declaration directory: ${directory}`)
      }
      rmSync(directory, { recursive: true, force: true })
    },
  }
}

const symbolDeclaration = (symbol: ts.Symbol): ts.Declaration | undefined =>
  symbol.valueDeclaration ?? symbol.declarations?.[0]

const moduleSymbol = (
  checker: ts.TypeChecker,
  source: ts.SourceFile,
): ts.Symbol => {
  const symbol = checker.getSymbolAtLocation(source)
  if (symbol === undefined) throw new Error(`declaration module has no symbol: ${source.fileName}`)
  return symbol
}

const refusalType = (
  checker: ts.TypeChecker,
  source: ts.SourceFile,
): ts.Type => {
  for (const statement of source.statements) {
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === "Refusal") {
      return checker.getTypeFromTypeNode(statement.type)
    }
  }
  throw new Error(`Refusal type alias is absent from ${source.fileName}`)
}

type Carrier = {
  readonly kind: "Effect" | "Layer" | "Stream"
  readonly arguments: ReadonlyArray<ts.Type>
}

const carrier = (checker: ts.TypeChecker, type: ts.Type): Carrier | undefined => {
  const candidates = [type.aliasSymbol, type.getSymbol()]
  for (const symbol of candidates) {
    if (symbol === undefined ||
      (symbol.name !== "Effect" && symbol.name !== "Layer" && symbol.name !== "Stream")) {
      continue
    }
    const declaration = symbol.declarations?.[0]
    if (declaration === undefined) continue
    const source = normalizePath(declaration.getSourceFile().fileName)
    if (!source.endsWith(`/effect/dist/${symbol.name}.d.ts`)) continue
    if (!(type.flags & ts.TypeFlags.Object)) return undefined
    const arguments_ = checker.getTypeArguments(type as ts.TypeReference)
    return { kind: symbol.name, arguments: arguments_ }
  }
  return undefined
}

const sortedExports = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): ReadonlyArray<ts.Symbol> =>
  [...checker.getExportsOfModule(symbol)].sort((left, right) =>
    left.name.localeCompare(right.name))

export const inspectPublicDeclarations = (
  directory: string,
  entryRelative: string,
  rootExport?: string,
): PublicEffectInspection => {
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

  const checker = program.getTypeChecker()
  const entryPath = resolve(directory, entryRelative)
  const entry = program.getSourceFile(entryPath)
  if (entry === undefined) throw new Error(`emitted entry is absent: ${entryPath}`)
  const refusalPath = resolve(directory, "src/Refusal.d.ts")
  const refusalSource = program.getSourceFile(refusalPath)
  if (refusalSource === undefined) throw new Error(`emitted Refusal declaration is absent: ${refusalPath}`)
  const allowedError = refusalType(checker, refusalSource)
  const manifest = new Set<string>()
  const violations = new Set<string>()
  const localRoot = `${normalizePath(resolve(directory))}/`

  const errorName = (error: ts.Type): string => checker.typeToString(
    error,
    undefined,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  )

  const inspectCarrier = (type: ts.Type, path: string): boolean => {
    if (type.isUnion()) {
      let found = false
      for (const member of type.types) found = inspectCarrier(member, path) || found
      return found
    }
    const found = carrier(checker, type)
    if (found === undefined) return false
    const error = found.arguments[1]
    if (error === undefined) throw new Error(`${found.kind} at ${path} has no error argument`)
    const renderedError = errorName(error)
    manifest.add(`${path} ${found.kind} error=${renderedError}`)
    if (!checker.isTypeAssignableTo(error, allowedError)) {
      violations.add(`PUBLIC EFFECT VIOLATION: ${path} ${found.kind} error=${renderedError}`)
    }
    if (found.kind === "Effect") {
      const success = found.arguments[0]
      if (success !== undefined) inspectStreamSuccess(success, `${path}#success`)
    }
    return true
  }

  const inspectStreamSuccess = (type: ts.Type, path: string): void => {
    if (type.isUnion()) {
      for (const member of type.types) inspectStreamSuccess(member, path)
      return
    }
    const found = carrier(checker, type)
    if (found?.kind !== "Stream") return
    inspectCarrier(type, path)
  }

  const inspectType = (
    type: ts.Type,
    path: string,
    depth: number,
    seen: ReadonlySet<ts.Type>,
  ): void => {
    if (seen.has(type)) return
    if (inspectCarrier(type, path)) return
    if (depth >= maximumSurfaceDepth) return
    const nextSeen = new Set(seen)
    nextSeen.add(type)

    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call)
    signatures.forEach((signature, index) => {
      inspectType(
        checker.getReturnTypeOfSignature(signature),
        `${path}#call[${index + 1}]`,
        depth + 1,
        nextSeen,
      )
    })

    const prototype = checker.getPropertyOfType(type, "prototype")
    const typeSymbol = type.getSymbol()
    const prototypeDeclaration = prototype === undefined
      ? undefined
      : symbolDeclaration(prototype) ??
        (typeSymbol === undefined ? undefined : symbolDeclaration(typeSymbol))
    let hasLocalPrototype = false
    let localPrototypeType: ts.Type | undefined
    if (prototype !== undefined && prototypeDeclaration !== undefined &&
      normalizePath(prototypeDeclaration.getSourceFile().fileName).startsWith(localRoot)) {
      hasLocalPrototype = true
      localPrototypeType = checker.getTypeOfSymbolAtLocation(prototype, prototypeDeclaration)
      inspectType(
        localPrototypeType,
        path === "" ? "prototype" : `${path}.prototype`,
        depth + 1,
        nextSeen,
      )
    }
    const constructSignatures = checker.getSignaturesOfType(type, ts.SignatureKind.Construct)
    constructSignatures.forEach((signature, index) => {
      const result = checker.getReturnTypeOfSignature(signature)
      if (localPrototypeType !== undefined &&
        checker.isTypeAssignableTo(result, localPrototypeType) &&
        checker.isTypeAssignableTo(localPrototypeType, result)) return
      inspectType(
        result,
        `${path}#construct[${index + 1}]`,
        depth + 1,
        nextSeen,
      )
    })

    const service = checker.getPropertyOfType(type, "Service")
    const serviceDeclaration = service === undefined ? undefined : symbolDeclaration(service)
    if (!hasLocalPrototype && service !== undefined && serviceDeclaration !== undefined &&
      checker.getPropertyOfType(type, "key") !== undefined) {
      inspectType(
        checker.getTypeOfSymbolAtLocation(service, serviceDeclaration),
        `${path}#service`,
        depth + 1,
        nextSeen,
      )
    }

    for (const [kind, label] of [
      [ts.IndexKind.String, "string"],
      [ts.IndexKind.Number, "number"],
    ] as const) {
      const indexed = checker.getIndexTypeOfType(type, kind)
      if (indexed !== undefined) {
        inspectType(indexed, `${path}#index[${label}]`, depth + 1, nextSeen)
      }
    }

    for (const property of checker.getPropertiesOfType(type)) {
      if (property.name === "prototype") continue
      const declaration = property.declarations?.find((candidate) =>
        normalizePath(candidate.getSourceFile().fileName).startsWith(localRoot))
      if (declaration === undefined) continue
      inspectType(
        checker.getTypeOfSymbolAtLocation(property, declaration),
        path === "" ? property.name : `${path}.${property.name}`,
        depth + 1,
        nextSeen,
      )
    }
  }

  const inspectExport = (symbol: ts.Symbol, path: string): void => {
    const target = symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol
    if (target.flags & ts.SymbolFlags.Module) {
      for (const child of sortedExports(checker, target)) {
        inspectExport(child, path === "" ? child.name : `${path}.${child.name}`)
      }
      return
    }
    if (!(target.flags & ts.SymbolFlags.Value)) return
    const declaration = symbolDeclaration(target)
    if (declaration === undefined) return
    inspectType(checker.getTypeOfSymbolAtLocation(target, declaration), path, 0, new Set())
  }

  const entryModule = moduleSymbol(checker, entry)
  if (rootExport === undefined) {
    for (const exported of sortedExports(checker, entryModule)) {
      inspectExport(exported, exported.name)
    }
  } else {
    const exported = checker.getExportsOfModule(entryModule).find((candidate) =>
      candidate.name === rootExport)
    if (exported === undefined) throw new Error(`${rootExport} is absent from ${entryRelative}`)
    const target = exported.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(exported)
      : exported
    const declaration = symbolDeclaration(target)
    if (declaration === undefined) throw new Error(`${rootExport} has no declaration`)
    inspectType(checker.getTypeOfSymbolAtLocation(target, declaration), "", 0, new Set())
  }

  return {
    manifest: [...manifest].sort().join("\n") + "\n",
    violations: [...violations].sort().join("\n") + (violations.size === 0 ? "" : "\n"),
  }
}
