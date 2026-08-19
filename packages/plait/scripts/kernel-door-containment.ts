/**
 * The one-door containment wall.
 *
 * The law is standing law 2 made mechanical: all judgment routes through
 * kernel admission, and a private validator is a second door. Its stage-4
 * content is the one written down rather than invented here — the package
 * contract's own words, that `src/kernel/KernelDoor.ts` is the one shipping
 * admission door, that its candidate, context, and intrinsic-act types derive
 * from `KernelSchemas.generated.ts`, and that the hosts "export that exact
 * `admit` function, never a wrapper or private candidate validator"; and the
 * DEV-796 debt ledger's unification target for every carriage and surface row,
 * "consume the shared generated-core candidate form through KernelDoor".
 *
 * What makes this a wall rather than a tautology is that its four inputs are
 * four artifacts, and no two of them are views of one value:
 *
 * 1. **The generated schema module** is read out of its own *bytes*, through
 *    the TypeScript AST, for the set of symbols the generator emitted — not by
 *    importing the schemas and asking them their names, which would only ask
 *    the generated value to agree with itself. `check:kernel-surfaces`
 *    separately holds those bytes to the digest the model emitter registers
 *    for them.
 * 2. **The door module** is read out of its *bytes* for the form it claims:
 *    which generated symbol each of the candidate, intrinsic-act, and context
 *    bindings names, and which `Kernel*` type names it puts into circulation.
 *    A door whose form did not come from the generator is refused before the
 *    sweep runs, because a sweep held against a drifted door guards nothing.
 * 3. **Every other shipped module** under `src/` is read out of its *bytes*
 *    for the four shapes a second door takes: a verdict it constructs, an
 *    `admit` route that is anything but the door's own function, a hand-written
 *    twin of a name the door's form owns, and a use of one of those names that
 *    no import from the door or the generator bound.
 * 4. **The route pin** is a reviewed transcription that is never an input to
 *    any generator. It is what stops the wall from being satisfiable by
 *    renaming: a module that names a judgment route the door does not own has
 *    to be written into the pin, with the ticket that owns its convergence, in
 *    a diff a reviewer reads.
 *
 * ## The amendment: one guarded trusted-base seam (ruling A1)
 *
 * Operator ruling A1 (2026-08-19, board DEV-772) amends standing law 2. A
 * runtime whose addresses are hex digests cannot build a candidate about them
 * without a map into the model's identity labels, so the law now ADMITS one
 * such map — `kernel/KernelIdentity.ts` — and holds it guarded. Two more
 * artifacts join the four above: the seam's own bytes, read for whether every
 * conversion sits behind the digest-domain guard and whether anything throws;
 * and a reviewed identity-site pin naming every place under `src/` that reads
 * digest bytes as an unbounded natural at all.
 *
 * The reason the seam is admitted rather than forbidden is worth stating: the
 * previous rule forbade the conversion, so every host was doorless — the rule
 * refused the feature rather than the defect. What the defect actually was is
 * now checkable: an unguarded `BigInt("0x" + hex)` over a bare `string` throws
 * on `""`, at the exact seam where a host hands in caller-supplied bytes.
 *
 * The mutation arm is `check:kernel-door-control`: it plants each second-door
 * and each unguarded-seam spelling into the bytes this module parses and
 * requires this same law to refuse each one for the reason committed in the
 * control's trace.
 *
 * **Bounds.** This wall reads source bytes, so it states what can be SPELLED
 * in `src/`, never what a running program does: identity of the shipped routes
 * at runtime is `test/KernelDoor.routes.test.ts`, and agreement with the
 * model's verdicts is `test/KernelConformance.test.ts`. A route reached only
 * through an object spread is invisible here and is the runtime test's to hold.
 * `test/` and `negative-controls/` are outside the sweep on purpose — a control
 * that plants a second door must be able to spell one.
 *
 * @module
 */
import * as ts from "typescript-five"

/** The result of checking one package against the one-door law. */
export type KernelDoorCheck =
  | {
    readonly ok: true
    readonly modules: number
    readonly routes: number
    readonly pinned: number
    readonly translations: number
  }
  | { readonly ok: false; readonly reason: string }

/** One reviewed judgment route the door does not own, and who owns it. */
export interface PinnedRoute {
  readonly module: string
  readonly ticket: string
}

/** The artifacts the wall reads, relative to the package root. */
export const KERNEL_DOOR_PATHS = {
  /** The one shipping admission door, read as source bytes. */
  door: "src/kernel/KernelDoor.ts",
  /** The model's emitted schemas, read as source bytes. */
  generatedSchemas: "src/kernel/KernelSchemas.generated.ts",
  /** The reviewed route pin, never a generator input. */
  routePin: "test/fixtures/kernel-door-routes.pin.txt",
  /** The one guarded trusted-base seam, read as source bytes (ruling A1). */
  seam: "src/kernel/KernelIdentity.ts",
  /** The reviewed identity-translation site pin, never a generator input. */
  sitePin: "test/fixtures/kernel-identity-sites.pin.txt",
  /** The tree the sweep quantifies over. */
  sweepRoot: "src",
} as const

/** The specifier the seam's guard must take its domain from. */
export const DIGEST_DOMAIN_SPECIFIER = "../truth/Digest.js"

/** The binding the truth plane gives the runtime content-address domain. */
export const DIGEST_DOMAIN_BINDING = "Digest"

/** The refusing decoder the guard must run the domain through. */
export const GUARD_DECODER = "decodeRefusing"

/** The module specifier a host imports the door through, as its bytes spell it. */
export const DOOR_MODULE_BASENAME = "KernelDoor.js"

/** The specifier the door's form must come from, as the door's bytes spell it. */
export const GENERATED_SCHEMAS_SPECIFIER = "./KernelSchemas.generated.js"

/** The name of the one host-facing judgment function. */
export const ADMIT_BINDING = "admit"

/** The name of the field an admission verdict selects on. */
export const VERDICT_FIELD = "verdict"

/**
 * The three roles the package contract names — "its candidate, context, and
 * intrinsic-act types derive from `KernelSchemas.generated.ts`" — keyed by the
 * binding the door exports for each. The generated symbol behind each role is
 * read from the door's bytes, never listed here: this table says which roles
 * must exist, and the door says what fills them.
 */
export const DOOR_FORM_ROLES: { readonly [binding: string]: string } = {
  Candidate: "candidate",
  Act: "intrinsic-act",
  DoorContext: "admission-context",
}

/** One role of the shared candidate form and the generated symbol behind it. */
export interface DoorFormBinding {
  readonly binding: string
  readonly role: string
  readonly generatedName: string
}

/** What the door's own bytes say the shared candidate form is. */
export interface DoorForm {
  readonly form: ReadonlyArray<DoorFormBinding>
  /** Every `Kernel*` type name the door exports: the form's public vocabulary. */
  readonly vocabulary: ReadonlyArray<string>
}

/** One place a module spells something only the door may spell. */
export interface JudgmentSite {
  readonly module: string
  readonly line: number
  readonly detail: string
}

/** What one swept module's bytes said. */
export interface ModuleFindings {
  readonly module: string
  /** Verdict shapes the module constructs or declares. */
  readonly verdicts: ReadonlyArray<JudgmentSite>
  /** `admit` routes that are not the door's own function. */
  readonly routes: ReadonlyArray<JudgmentSite>
  /** How many `admit` routes the module carries at all. */
  readonly routeCount: number
  /** Hand-written twins of a name the shared form owns. */
  readonly twins: ReadonlyArray<JudgmentSite>
  /** Uses of a form name that no door or generator import bound. */
  readonly unbound: ReadonlyArray<JudgmentSite>
  /** Hex-prefixed `BigInt` conversions: runtime digest bytes read as an integer. */
  readonly translations: ReadonlyArray<JudgmentSite>
}

/** What the one guarded seam's own bytes said (ruling A1). */
export interface SeamFindings {
  readonly module: string
  /** Identity translations the guard does not enclose. */
  readonly unguarded: ReadonlyArray<JudgmentSite>
  /** Throw statements on the meaning path. */
  readonly throws: ReadonlyArray<JudgmentSite>
  /** How many translations the guard does enclose. */
  readonly guarded: number
}

const quote = (value: string): string => JSON.stringify(value)

// Annotated at the binding, not only at the arrow, so a bare `refuse(...)`
// reads as control flow that does not return.
const refuse: (reason: string) => never = (reason) => {
  throw new Error(`kernel door containment: ${reason}`)
}

const parse = (source: string, path: string): ts.SourceFile =>
  ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)

const lineOf = (node: ts.Node): number =>
  node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1

const isExported = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node)
  && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ?? false)

const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)
    ? unwrap(node.expression)
    : node

const memberName = (node: ts.Node): string | undefined => {
  const named = node as { readonly name?: ts.Node }
  const name = named.name
  if (name === undefined) return undefined
  if (ts.isIdentifier(name)) return name.text
  if (ts.isStringLiteral(name)) return name.text
  return undefined
}

const visitAll = (node: ts.Node, visit: (node: ts.Node) => void): void => {
  visit(node)
  ts.forEachChild(node, (child) => {
    visitAll(child, visit)
  })
}

/**
 * Reads the names the generator emitted out of the generated module's bytes.
 * The read is over the committed source, so the door's claimed ancestry is
 * checked against what the generator actually wrote rather than against a
 * value the same import would hand both sides.
 */
export const readGeneratedExports = (
  source: string,
  path: string,
): ReadonlyArray<string> => {
  const names: Array<string> = []
  for (const statement of parse(source, path).statements) {
    if (!isExported(statement)) continue
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text)
      }
      continue
    }
    if (
      ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)
      || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)
    ) {
      const name = memberName(statement)
      if (name !== undefined) names.push(name)
    }
  }
  if (names.length === 0) return refuse(`${path} exports nothing`)
  return names
}

/**
 * Reads the shared candidate form out of the door's own bytes: which generated
 * symbol each role names, and which `Kernel*` type names the door puts into
 * circulation. A door that stopped deriving a role from the generated module
 * is reported here, before any other module is swept.
 */
export const readDoorForm = (source: string, path: string): DoorForm => {
  const file = parse(source, path)
  let namespaceAlias: string | undefined
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (statement.moduleSpecifier.text !== GENERATED_SCHEMAS_SPECIFIER) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      namespaceAlias = bindings.name.text
    }
  }
  if (namespaceAlias === undefined) {
    return refuse(
      `${path} does not import ${quote(GENERATED_SCHEMAS_SPECIFIER)} as a namespace`,
    )
  }

  const form: Array<DoorFormBinding> = []
  const vocabulary: Array<string> = []
  let admits = false
  for (const statement of file.statements) {
    // A name the door circulates by re-exporting the generator's declaration.
    // This arm is not decoration: DEV-804 converted seven of the door's type
    // aliases into `export type { KernelXValue as KernelX } from` re-exports —
    // the one shape whose ancestry the public-type census can read back — and
    // an export declaration is not a type alias declaration. Reading only the
    // declarations would have quietly dropped those seven names out of the
    // vocabulary, which is what the twin and unbound-use clauses quantify over.
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause
      if (clause === undefined || !ts.isNamedExports(clause)) continue
      for (const element of clause.elements) {
        const name = element.name.text
        if (name.startsWith("Kernel")) vocabulary.push(name)
      }
      continue
    }
    if (!isExported(statement)) continue
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      const name = statement.name.text
      if (name.startsWith("Kernel")) vocabulary.push(name)
      continue
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      const binding = declaration.name.text
      if (binding === ADMIT_BINDING) admits = true
      const role = DOOR_FORM_ROLES[binding]
      if (role === undefined) continue
      const initializer = declaration.initializer
      if (initializer === undefined) {
        return refuse(`${path}'s ${role} binding ${quote(binding)} has no initializer`)
      }
      const access = unwrap(initializer)
      if (
        !ts.isPropertyAccessExpression(access) || !ts.isIdentifier(access.expression)
        || access.expression.text !== namespaceAlias
      ) {
        return refuse(
          `${path}'s ${role} binding ${quote(binding)} does not derive from`
            + ` ${quote(GENERATED_SCHEMAS_SPECIFIER)}`,
        )
      }
      form.push({ binding, role, generatedName: access.name.text })
    }
  }
  if (!admits) return refuse(`${path} exports no ${quote(ADMIT_BINDING)} function`)
  for (const binding of Object.keys(DOOR_FORM_ROLES)) {
    if (form.some((entry) => entry.binding === binding)) continue
    return refuse(
      `${path} exports no ${quote(binding)} binding for the`
        + ` ${DOOR_FORM_ROLES[binding]!} role of the shared candidate form`,
    )
  }
  if (vocabulary.length === 0) return refuse(`${path} exports no Kernel* form vocabulary`)
  return { form, vocabulary }
}

const doorImportSpecifier = (specifier: string): boolean =>
  specifier.endsWith(`/${DOOR_MODULE_BASENAME}`)

const formImportSpecifier = (specifier: string): boolean =>
  doorImportSpecifier(specifier) || specifier.endsWith("/KernelSchemas.generated.js")
  || specifier === GENERATED_SCHEMAS_SPECIFIER

/** Local names a module bound by importing something from the one door. */
interface DoorBindings {
  /** Local names bound to the door's `admit` export. */
  readonly admits: ReadonlySet<string>
  /** Local names bound to the door module as a namespace. */
  readonly namespaces: ReadonlySet<string>
  /** Local names bound from the door or the generated schemas, by any import. */
  readonly formNames: ReadonlySet<string>
}

const readDoorBindings = (file: ts.SourceFile): DoorBindings => {
  const admits = new Set<string>()
  const namespaces = new Set<string>()
  const formNames = new Set<string>()
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    const specifier = statement.moduleSpecifier.text
    if (!formImportSpecifier(specifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined) continue
    if (ts.isNamespaceImport(bindings)) {
      formNames.add(bindings.name.text)
      if (doorImportSpecifier(specifier)) namespaces.add(bindings.name.text)
      continue
    }
    for (const element of bindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      formNames.add(element.name.text)
      if (doorImportSpecifier(specifier) && imported === ADMIT_BINDING) {
        admits.add(element.name.text)
      }
    }
  }
  return { admits, namespaces, formNames }
}

const routesToDoor = (expression: ts.Expression, bindings: DoorBindings): boolean => {
  const value = unwrap(expression)
  if (ts.isIdentifier(value)) return bindings.admits.has(value.text)
  return ts.isPropertyAccessExpression(value) && ts.isIdentifier(value.expression)
    && bindings.namespaces.has(value.expression.text)
    && value.name.text === ADMIT_BINDING
}

const typedByDoor = (type: ts.TypeNode, bindings: DoorBindings): boolean => {
  if (!ts.isTypeQueryNode(type)) return false
  const name = type.exprName
  if (ts.isIdentifier(name)) return bindings.admits.has(name.text)
  return ts.isIdentifier(name.left) && bindings.namespaces.has(name.left.text)
    && name.right.text === ADMIT_BINDING
}

const describe = (node: ts.Node): string => {
  const text = node.getText().split("\n")[0]!.trim()
  return text.length > 72 ? `${text.slice(0, 69)}...` : text
}

/**
 * Excluded from the form-vocabulary use rule: the module-binding positions.
 * `export * as KernelDoor from ".../KernelDoor.js"` names the door in order to
 * route to it, which is the opposite of the twin this rule hunts.
 */
const isModuleBindingName = (node: ts.Node): boolean => {
  const parent = node.parent as ts.Node | undefined
  if (parent === undefined) return false
  return ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)
    || ts.isNamespaceImport(parent) || ts.isNamespaceExport(parent)
    || ts.isImportClause(parent) || ts.isImportEqualsDeclaration(parent)
}

const isMemberPosition = (node: ts.Identifier): boolean => {
  const parent = node.parent as ts.Node | undefined
  if (parent === undefined) return false
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true
  if (ts.isQualifiedName(parent) && parent.right === node) return true
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true
  if (ts.isPropertySignature(parent) && parent.name === node) return true
  return false
}

/**
 * One identity translation: a `BigInt` conversion over a hex-prefixed
 * expression, which is how runtime digest bytes are read as an unbounded
 * natural.
 *
 * The rule is scoped to `BigInt` deliberately. `Number.parseInt(_, 16)` yields
 * a `number` and is structurally incapable of carrying a 256-bit address, so
 * the JSON `\uXXXX` unescape in `truth/Canonical.ts` is outside this law — a
 * bound stated here rather than a case quietly skipped in the walk.
 */
const isIdentityTranslation = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression)
  && node.expression.text === "BigInt"
  && node.arguments.length > 0 && node.arguments[0]!.getText().includes("0x")

/** The guard: the truth-plane digest domain run through the refusing decoder. */
const isDomainGuard = (node: ts.Node, domainAlias: string): boolean =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression)
  && node.expression.text === GUARD_DECODER
  && node.arguments.some((argument) =>
    ts.isIdentifier(argument) && argument.text === domainAlias
  )

const enclosingBody = (node: ts.Node): ts.Node | undefined => {
  let current: ts.Node | undefined = node.parent
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)
      || ts.isArrowFunction(current) || ts.isMethodDeclaration(current)
    ) {
      return current
    }
    current = current.parent
  }
  return undefined
}

const subtreeHas = (root: ts.Node, predicate: (node: ts.Node) => boolean): boolean => {
  let found = false
  visitAll(root, (node) => {
    if (predicate(node)) found = true
  })
  return found
}

/**
 * Sweeps the one guarded seam's own bytes (ruling A1).
 *
 * Two questions, asked separately so a red wall names which one moved: is every
 * conversion in this file enclosed by the domain guard, and does the file throw
 * anywhere on the meaning path. The guard is located by the function that
 * contains it, so a guard moved out of the converting function reads as
 * unguarded rather than as present-somewhere-in-the-file.
 */
export const sweepSeam = (source: string, modulePath: string): SeamFindings => {
  const file = parse(source, modulePath)
  let domainAlias: string | undefined
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (!statement.moduleSpecifier.text.endsWith("/Digest.js")) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      if (imported === DIGEST_DOMAIN_BINDING) domainAlias = element.name.text
    }
  }

  const unguarded: Array<JudgmentSite> = []
  const throws: Array<JudgmentSite> = []
  let guarded = 0

  visitAll(file, (node) => {
    if (ts.isThrowStatement(node)) {
      throws.push({ module: modulePath, line: lineOf(node), detail: `throws ${describe(node)}` })
    }
    if (!isIdentityTranslation(node)) return
    const body = enclosingBody(node)
    const isGuarded = domainAlias !== undefined && body !== undefined
      && subtreeHas(body, (candidate) => isDomainGuard(candidate, domainAlias))
    if (isGuarded) {
      guarded += 1
      return
    }
    unguarded.push({
      module: modulePath,
      line: lineOf(node),
      detail: domainAlias === undefined
        ? `converts ${describe(node)} in a module that never imports the digest domain`
        : `converts ${describe(node)} outside the digest domain guard`,
    })
  })

  return { module: modulePath, unguarded, throws, guarded }
}

/**
 * Sweeps one shipped module's bytes for the shapes a second door takes.
 *
 * Every finding carries its line, because a red wall has to name the site it
 * refuses and not merely the file.
 */
export const sweepModule = (
  source: string,
  modulePath: string,
  form: DoorForm,
): ModuleFindings => {
  const file = parse(source, modulePath)
  const bindings = readDoorBindings(file)
  const vocabulary = new Set(form.vocabulary)
  const verdicts: Array<JudgmentSite> = []
  const routes: Array<JudgmentSite> = []
  const twins: Array<JudgmentSite> = []
  const unbound: Array<JudgmentSite> = []
  const translations: Array<JudgmentSite> = []
  let routeCount = 0

  const site = (node: ts.Node, detail: string): JudgmentSite => ({
    module: modulePath,
    line: lineOf(node),
    detail,
  })

  visitAll(file, (node) => {
    // A verdict this module builds, or a verdict shape it declares. A schema
    // that DESCRIBES the field is a call, never a literal, so the corpus
    // grammar and the generated examples are untouched by this clause.
    if (ts.isPropertyAssignment(node) && memberName(node) === VERDICT_FIELD) {
      if (ts.isStringLiteral(unwrap(node.initializer))) {
        verdicts.push(site(node, `constructs ${describe(node)}`))
      }
    }
    if (ts.isPropertySignature(node) && memberName(node) === VERDICT_FIELD) {
      const type = node.type
      if (type !== undefined && ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
        verdicts.push(site(node, `declares ${describe(node)}`))
      }
    }

    // An `admit` route: exported or not, because a private validator is the
    // exact shape the law names.
    if (memberName(node) === ADMIT_BINDING) {
      if (
        ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)
        || ts.isPropertyAssignment(node)
      ) {
        routeCount += 1
        const initializer = node.initializer
        if (initializer === undefined) {
          routes.push(site(node, "declares an admission route with no initializer"))
        } else if (!routesToDoor(initializer, bindings)) {
          routes.push(site(node, `routes admission through ${describe(initializer)}`))
        }
      } else if (ts.isPropertySignature(node)) {
        routeCount += 1
        const type = node.type
        if (type === undefined || !typedByDoor(type, bindings)) {
          routes.push(site(
            node,
            `declares an admission surface typed ${type === undefined ? "implicitly" : describe(type)}`,
          ))
        }
      } else if (
        ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
        || ts.isMethodSignature(node)
      ) {
        routeCount += 1
        routes.push(site(node, `implements admission as ${describe(node)}`))
      }
    }
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === ADMIT_BINDING) {
      routeCount += 1
      if (!bindings.admits.has(node.name.text)) {
        routes.push(site(node, "routes admission through a shorthand this module bound itself"))
      }
    }

    // A hand-written twin of a name the shared form owns.
    if (
      ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)
      || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)
    ) {
      const name = memberName(node)
      if (name !== undefined && vocabulary.has(name)) {
        twins.push(site(node, `declares ${quote(name)}`))
      }
    }

    // A form name nothing imported: a shape reached without the door.
    if (
      ts.isIdentifier(node) && vocabulary.has(node.text) && !isModuleBindingName(node)
      && !isMemberPosition(node) && !bindings.formNames.has(node.text)
    ) {
      unbound.push(site(node, `names ${quote(node.text)}`))
    }

    // Runtime digest bytes read as an unbounded natural (ruling A1).
    if (isIdentityTranslation(node)) {
      translations.push(site(node, `converts ${describe(node)}`))
    }
  })

  return { module: modulePath, verdicts, routes, routeCount, twins, unbound, translations }
}

/**
 * Reads the reviewed route pin. Comment and blank lines are ignored; a content
 * line is `<module path> <ticket>`.
 */
export const readRoutePin = (
  pin: string,
  path: string,
): ReadonlyArray<PinnedRoute> => {
  const routes: Array<PinnedRoute> = []
  const lines = pin.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.trim()
    if (line === "" || line.startsWith("#")) continue
    const parts = line.split(" ").filter((part) => part !== "")
    if (parts.length !== 2) {
      return refuse(`${path} line ${index + 1} is not a "<module> <ticket>" pair`)
    }
    routes.push({ module: parts[0]!, ticket: parts[1]! })
  }
  return routes
}

/** The independent derivations the containment law is evaluated over. */
export interface KernelDoorEvidence {
  /** Read from the generated schema module's source bytes. */
  readonly generatedExports: ReadonlyArray<string>
  /** Read from the door module's source bytes. */
  readonly form: DoorForm
  /** Read from every other shipped module's source bytes. */
  readonly modules: ReadonlyArray<ModuleFindings>
  /** Read from the reviewed route pin, which is nothing's input. */
  readonly pin: ReadonlyArray<PinnedRoute>
  /** Read from the one guarded seam's source bytes (ruling A1). */
  readonly seam: SeamFindings
  /** Read from the reviewed identity-site pin, which is nothing's input. */
  readonly sitePin: ReadonlyArray<PinnedRoute>
}

/**
 * The containment law.
 *
 * Ten clauses, evaluated in order, each naming the shape it refuses. They are
 * separate because a red wall has to say which one moved, and because the
 * control plants one spelling per clause and requires exactly that clause to
 * answer. Clauses 7 to 10 are ruling A1's: the seam is guarded, the seam does
 * not throw, no unpinned module reads digest bytes as an identity, and the
 * identity pin names only live sites.
 */
export const checkKernelDoorContainment = (
  evidence: KernelDoorEvidence,
): KernelDoorCheck => {
  const emitted = new Set(evidence.generatedExports)

  // 1. The shared form is the generated one.
  for (const binding of evidence.form.form) {
    if (emitted.has(binding.generatedName)) continue
    return {
      ok: false,
      reason:
        `the door's ${binding.role} binding ${quote(binding.binding)} names`
        + ` ${quote(binding.generatedName)}, which the generated schema module does not emit`,
    }
  }

  const pinned = new Map<string, string>()
  for (const route of evidence.pin) {
    if (pinned.has(route.module)) {
      return { ok: false, reason: `the route pin names ${quote(route.module)} twice` }
    }
    pinned.set(route.module, route.ticket)
  }

  // 2. One verdict site.
  for (const findings of evidence.modules) {
    const verdict = findings.verdicts[0]
    if (verdict === undefined) continue
    return {
      ok: false,
      reason:
        `${verdict.module}:${verdict.line} ${verdict.detail} — an admission verdict outside`
        + ` the one door is a second door`,
    }
  }

  // 3. One route: every `admit` is the door's own function.
  for (const findings of evidence.modules) {
    const route = findings.routes[0]
    if (route === undefined) continue
    if (pinned.has(findings.module)) continue
    return {
      ok: false,
      reason:
        `${route.module}:${route.line} ${route.detail} rather than the one door function,`
        + ` and no reviewed pin row owns it`,
    }
  }

  // 4. One candidate form: no hand-written twin of a name the form owns.
  for (const findings of evidence.modules) {
    const twin = findings.twins[0]
    if (twin === undefined) continue
    return {
      ok: false,
      reason:
        `${twin.module}:${twin.line} ${twin.detail}, a hand-written twin of the shared`
        + ` candidate form`,
    }
  }

  // 5. Every use of a form name is bound by an import from the door or the
  //    generator, so a host cannot accept a candidate shape of its own naming.
  for (const findings of evidence.modules) {
    const use = findings.unbound[0]
    if (use === undefined) continue
    return {
      ok: false,
      reason:
        `${use.module}:${use.line} ${use.detail} without importing it from the one door`
        + ` or the generated schema module`,
    }
  }

  // 6. The pin is live: a row that owns nothing is a waiver nobody reviews.
  for (const route of evidence.pin) {
    const findings = evidence.modules.find((module) => module.module === route.module)
    if (findings === undefined) {
      return {
        ok: false,
        reason: `the route pin names ${quote(route.module)}, which the sweep did not read`,
      }
    }
    if (findings.routes.length === 0) {
      return {
        ok: false,
        reason:
          `the route pin names ${quote(route.module)}, which declares no admission route`
          + ` outside the one door`,
      }
    }
  }

  // 7. The one seam is guarded: every conversion sits behind the digest domain.
  {
    const bare = evidence.seam.unguarded[0]
    if (bare !== undefined) {
      return {
        ok: false,
        reason:
          `${bare.module}:${bare.line} ${bare.detail} — the trusted-base seam translates only`
          + ` behind the digest domain guard`,
      }
    }
    if (evidence.seam.guarded === 0) {
      return {
        ok: false,
        reason:
          `${evidence.seam.module} performs no guarded identity translation, so the wall`
          + ` would be guarding a seam that is not there`,
      }
    }
  }

  // 8. The guard refuses, it does not throw. A bare throw on the meaning path
  //    is what ruling A1 exists to refuse.
  {
    const thrown = evidence.seam.throws[0]
    if (thrown !== undefined) {
      return {
        ok: false,
        reason:
          `${thrown.module}:${thrown.line} ${thrown.detail} — the seam refuses in the error`
          + ` channel and never throws on the meaning path`,
      }
    }
  }

  const pinnedSites = new Map<string, string>()
  for (const site of evidence.sitePin) {
    if (pinnedSites.has(site.module)) {
      return { ok: false, reason: `the identity-site pin names ${quote(site.module)} twice` }
    }
    pinnedSites.set(site.module, site.ticket)
  }

  // 9. One identity translation site: a second reading of digest bytes as an
  //    identity label is a second trusted base.
  for (const findings of evidence.modules) {
    const translation = findings.translations[0]
    if (translation === undefined) continue
    if (pinnedSites.has(findings.module)) continue
    return {
      ok: false,
      reason:
        `${translation.module}:${translation.line} ${translation.detail} — a second reading of`
        + ` runtime digest bytes as an identity label, and no reviewed pin row owns it`,
    }
  }

  // 10. The identity pin is live too.
  for (const site of evidence.sitePin) {
    const findings = evidence.modules.find((module) => module.module === site.module)
    if (findings === undefined) {
      return {
        ok: false,
        reason: `the identity-site pin names ${quote(site.module)}, which the sweep did not read`,
      }
    }
    if (findings.translations.length === 0) {
      return {
        ok: false,
        reason:
          `the identity-site pin names ${quote(site.module)}, which reads no runtime digest`
          + ` bytes as an integer`,
      }
    }
  }

  return {
    ok: true,
    modules: evidence.modules.length,
    routes: evidence.modules.reduce((total, findings) => total + findings.routeCount, 0),
    pinned: evidence.pin.length,
    translations: evidence.modules.reduce(
      (total, findings) => total + findings.translations.length,
      0,
    ),
  }
}
