import { readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import * as ts from "typescript-five"

const packageRoot = resolve(import.meta.dir, "..")

/**
 * The anchors are the machine-generated declaration files and nothing else.
 * The element type keeps a hand-written file unrepresentable: an anchor must
 * spell `.generated.d.ts`, so the walk cannot be granted authority over a file
 * nothing byte-gates. `KernelCorpusSchemas.d.ts` sat here until DEV-800 round
 * 2 measured the laundering it allowed — the file is hand-written by the
 * package's own admission (`scripts/kernel-schemas.ts`), so its types are
 * `src/kernel/` staged debt like every other hand-written declaration.
 *
 * The union admits `src/truth/` as well as `src/kernel/`, because the tables
 * generator emits the refusal vocabulary into the plane that speaks it rather
 * than up from `kernel/` — one generator, two emissions, both byte-gated where
 * that generator runs. Widening the directory changes nothing about the law
 * T4 states: a path that does not end `.generated.d.ts` is still
 * unrepresentable, in either plane.
 */
const generatedCoreAnchors: ReadonlyArray<
  `src/kernel/${string}.generated.d.ts` | `src/truth/${string}.generated.d.ts`
> = [
  "src/kernel/KernelSchemas.generated.d.ts",
  "src/kernel/KernelTables.generated.d.ts",
  "src/truth/RefusalKinds.generated.d.ts",
]

interface PublicTypeIdentity {
  readonly publicType: string
  readonly owner: string
}

export interface GeneratedCorePublicType extends PublicTypeIdentity {
  readonly classification: "derives-from-the-generated-core"
}

export interface TicketedDebtPublicType extends PublicTypeIdentity {
  readonly classification: "debt-with-a-ticket"
  readonly prefix: string
  readonly ticket: string
  readonly unificationTarget: string
}

export type ClassifiedPublicType = GeneratedCorePublicType | TicketedDebtPublicType

export type PublicTypeClassification = ClassifiedPublicType["classification"]

export interface PublicTypeUniverseInspection {
  readonly classifications: ReadonlyArray<ClassifiedPublicType>
  readonly inventory: string
}

/** One waiver entry as the committed ledger carries it. */
export interface LedgerWaiver {
  readonly publicType: string
  readonly owner: string
  readonly ticket: string
}

export interface WaiverLedger {
  readonly waivers: ReadonlyArray<LedgerWaiver>
  readonly pins: ReadonlyMap<string, number>
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

interface TicketLiveness {
  readonly ticket: string
  /** When present, the ticket may only be cited by owners under this prefix. */
  readonly scope: string | undefined
  readonly why: string
}

/**
 * The reviewed liveness list: the unification tickets a Law 1 waiver may cite.
 *
 * A waiver's whole content is the promise that an OPEN ticket will drain it, so
 * a citation to a closed ticket promises nothing and is refused as a violation
 * of this gate's own precondition. That refusal is not hypothetical: the ledger
 * this file generated until DEV-805 routed the carriage and internal rows to
 * `DEV-763`, which had already closed, and the rows kept reading as lawful debt
 * because nothing compared the citation against the board.
 *
 * CLOSING ONE OF THESE REQUIRES DRAINING ITS ROWS FIRST. A ticket may move to
 * done only once no ledger row cites it; closing it while rows remain turns the
 * whole ledger red rather than quietly blessing orphaned debt. That is the
 * intended direction and still a worse day than draining first.
 */
const liveUnificationTickets: ReadonlyArray<TicketLiveness> = [
  {
    ticket: "DEV-795",
    scope: undefined,
    why: "epic: one type universe — every public type derives from the KM corpus",
  },
  {
    ticket: "DEV-804",
    scope: undefined,
    why: "stage 2, the conversion; pre-registered for the families it converts",
  },
  {
    ticket: "DEV-817",
    scope: undefined,
    why: "carriage speaks the corpus: FabricClient and CasDaemon service shapes",
  },
  {
    ticket: "DEV-796",
    scope: "negative-controls/",
    why:
      "the inventory wall that PLANTED the control rows. It is closed, and the "
      + "scope is what makes citing it lawful: those rows are the control's own "
      + "plant rather than estate surface, and they drain when the control "
      + "retires, not when a family converts. No src/ row may cite it.",
  },
]

const livenessOf = (ticket: string): TicketLiveness | undefined =>
  liveUnificationTickets.find((candidate) => candidate.ticket === ticket)

/**
 * The liveness verdict on one citation, as the line a refusal prints. `undefined`
 * means the citation is lawful.
 */
const livenessViolation = (ticket: string, owner: string): string | undefined => {
  const live = livenessOf(ticket)
  if (live === undefined) {
    return `ticket=${ticket} is not on the reviewed liveness list (${
      liveUnificationTickets.map(({ ticket: name }) => name).join(", ")
    })`
  }
  const { scope } = live
  if (scope !== undefined && !owner.startsWith(scope)) {
    return `ticket=${ticket} is scoped to owners under ${scope} and cannot be cited by owner=${owner}`
  }
  return undefined
}

interface DebtRoute {
  readonly prefix: string
  readonly ticket: string
  readonly unificationTarget: string
}

/**
 * Owning prefix, unification ticket, and unification target are ONE datum per
 * family. The ratchet pins counts per prefix and the waiver rows cite tickets,
 * so deriving both from the same table is what keeps a pin from being pinned
 * against a family the ticket column has quietly re-cut.
 */
const debtRoutes: ReadonlyArray<{
  readonly owners: ReadonlyArray<string>
  readonly route: DebtRoute
}> = [
  {
    owners: ["src/truth/"],
    route: {
      prefix: "truth",
      ticket: "DEV-795",
      unificationTarget: "stage 2+: converge truth primitives under the generated core",
    },
  },
  {
    owners: ["src/kernel/"],
    route: {
      prefix: "kernel",
      ticket: "DEV-795",
      unificationTarget: "stage 2+: replace hand-written kernel declarations with generated projections",
    },
  },
  {
    owners: ["src/planes/"],
    route: {
      prefix: "planes",
      ticket: "DEV-795",
      unificationTarget: "stage 3: re-type plane declarations against generated core types",
    },
  },
  // `internal/` types that reach the barrel do so only through carriage
  // re-exports (FabricClient's connection bootstrap), so they carry the
  // carriage unification target: the seam they are public through. The ticket
  // is DEV-817 and not DEV-763 — DEV-763 closed, and a waiver citing a closed
  // ticket is exactly the precondition failure the liveness list refuses.
  {
    owners: ["src/carriage/", "src/surface/", "src/internal/"],
    route: {
      prefix: "carriage",
      ticket: "DEV-817",
      unificationTarget: "stage 4: consume the shared generated-core candidate form through KernelDoor",
    },
  },
  {
    owners: ["negative-controls/"],
    route: {
      prefix: "negative-controls",
      ticket: "DEV-796",
      unificationTarget: "stage 1 control: derive the planted type from the generated core",
    },
  },
]

/**
 * The generator refuses to emit a ledger it would then have to refuse. Every
 * route's citation is checked against the liveness list before the walk runs,
 * in EVERY mode including `--write`, so repointing a family at a closed ticket
 * fails on the next run rather than waiting for a reviewer to notice a stale
 * ticket in a table of 132 rows — which is exactly how DEV-763 survived on the
 * carriage rows after it closed.
 */
const auditDebtRoutes = (): void => {
  for (const { owners, route } of debtRoutes) {
    for (const owner of owners) {
      const violation = livenessViolation(route.ticket, owner)
      if (violation !== undefined) {
        throw new Error(`debt route for ${owner} is unlawful: ${violation}`)
      }
    }
  }
}

const debtRoute = (owner: string): DebtRoute => {
  const found = debtRoutes.find(({ owners }) =>
    owners.some((prefix) => owner.startsWith(prefix)))
  if (found === undefined) {
    throw new Error(`public type debt has no unification ticket: ${owner}`)
  }
  return found.route
}

export const isTicketedDebt = (
  classification: ClassifiedPublicType,
): classification is TicketedDebtPublicType =>
  classification.classification === "debt-with-a-ticket"

/**
 * The walked debt count per owning prefix — the ratchet's independent side. It
 * is re-derived from the declaration walk on every run; the pins it is compared
 * against come from the committed ledger's bytes, so neither side is a view of
 * the other.
 */
export const debtPins = (
  classifications: ReadonlyArray<ClassifiedPublicType>,
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()
  for (const row of classifications) {
    if (isTicketedDebt(row)) counts.set(row.prefix, (counts.get(row.prefix) ?? 0) + 1)
  }
  return new Map([...counts.entries()].sort(([left], [right]) => compareText(left, right)))
}

const pinHeading = "## Ratchet pins"
const pinHeader = "| Owning prefix | Pinned debt |"
const pinSeparator = "| --- | --- |"
const rowHeading = "## Classified public types"
const rowHeader =
  "| Public type | Owning module | Classification | Unification ticket | Unification target |"
const rowSeparator = "| --- | --- | --- | --- | --- |"

const renderInventory = (
  classifications: ReadonlyArray<ClassifiedPublicType>,
  command: string,
): string => {
  const generatedCoreDerived = classifications.filter(
    ({ classification }) => classification === "derives-from-the-generated-core",
  ).length
  const debt = classifications.filter(isTicketedDebt)
  const pins = debtPins(classifications)
  // Every classification renders, not only the debt rows: the derived side of
  // the census is the side the wall blesses, and a count nobody can audit is
  // how a laundered type stays invisible after the enforce flip.
  return [
    "# Public type universe waiver ledger",
    "",
    `<!-- Generated by: ${command} -->`,
    "<!-- Authority: emitted declarations from src/index.ts own the public type quantifier. Only a resolved type declaration owned entirely by a machine-generated declaration file (`src/kernel/*.generated.d.ts` or `src/truth/*.generated.d.ts`) derives from the generated core; every hand-written declaration is ticketed debt with a named unification target, even when it mentions a generated type. -->",
    "<!-- Waivers: every debt-with-a-ticket row below IS a Law 1 waiver. Enforce mode admits a walked debt row only when its (public type, owning module, unification ticket) triple appears here, names any walked row that does not, and refuses any row here citing a ticket outside the gate's reviewed liveness list. -->",
    "<!-- A5 (DEV-772 sitting record, round 1, 2026-08-19): a Law 1 waiver MAY cover NEW public surface, on condition that it names the provably-absent generator/corpus group AND its unification ticket — the DEV-764 shape. A waiver that names neither is a hand-granted exemption, and this ledger does not carry those: the ratchet counts a conditioned waiver as ticketed debt like any other row, so new surface still costs a pin the operator has to raise by hand. -->",
    "<!-- Ratchet: the pins below are re-derived from the declaration walk on every enforce run. A prefix whose walked debt count EXCEEDS its pin fails the gate; `--write` lowers a pin that fell and refuses to raise one, so debt growth is an operator edit of this file and never a regeneration side effect. -->",
    "",
    `Classified ${classifications.length} public types: ${generatedCoreDerived} derives-from-the-generated-core, ${debt.length} debt-with-a-ticket.`,
    "",
    pinHeading,
    "",
    pinHeader,
    pinSeparator,
    ...[...pins.entries()].map(([prefix, count]) => `| \`${prefix}\` | ${count} |`),
    "",
    rowHeading,
    "",
    rowHeader,
    rowSeparator,
    ...classifications.map((row) =>
      isTicketedDebt(row)
        ? `| \`${row.publicType}\` | \`${row.owner}\` | debt-with-a-ticket | \`${row.ticket}\` | ${row.unificationTarget} |`
        : `| \`${row.publicType}\` | \`${row.owner}\` | derives-from-the-generated-core | — | — |`),
    "",
  ].join("\n")
}

const codeCell = (cell: string, line: string): string => {
  if (!cell.startsWith("`") || !cell.endsWith("`") || cell.length < 3) {
    throw new Error(`ledger cell is not a code span: ${cell} (in: ${line})`)
  }
  return cell.slice(1, -1)
}

const tableCells = (line: string, expected: number): ReadonlyArray<string> => {
  if (!line.startsWith("| ") || !line.endsWith(" |")) {
    throw new Error(`ledger table row is malformed: ${line}`)
  }
  const cells = line.slice(2, -2).split(" | ")
  if (cells.length !== expected) {
    throw new Error(`ledger table row has ${cells.length} cells, expected ${expected}: ${line}`)
  }
  return cells
}

/**
 * The ledger's grammar is stated once and read back by the same module that
 * writes it. Anything the renderer would not have produced is a parse failure,
 * not a silently skipped line: a waiver the gate cannot read is a waiver the
 * gate must not honour.
 */
export const parseWaiverLedger = (text: string): WaiverLedger => {
  const waivers: Array<LedgerWaiver> = []
  const pins = new Map<string, number>()
  let section = ""
  let sawPinSection = false
  let sawRowSection = false
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    if (line.startsWith("## ")) {
      section = line
      if (line === pinHeading) sawPinSection = true
      if (line === rowHeading) sawRowSection = true
      continue
    }
    if (!line.startsWith("|")) continue
    if (section === pinHeading) {
      if (line === pinHeader || line === pinSeparator) continue
      const [prefix, count] = tableCells(line, 2) as [string, string]
      const name = codeCell(prefix, line)
      if (!/^[0-9]+$/.test(count)) {
        throw new Error(`ratchet pin is not a count: ${line}`)
      }
      if (pins.has(name)) throw new Error(`ratchet pin is declared twice: ${name}`)
      pins.set(name, Number.parseInt(count, 10))
      continue
    }
    if (section === rowHeading) {
      if (line === rowHeader || line === rowSeparator) continue
      const [publicType, owner, classification, ticket] = tableCells(line, 5) as [
        string,
        string,
        string,
        string,
        string,
      ]
      if (classification === "derives-from-the-generated-core") continue
      if (classification !== "debt-with-a-ticket") {
        throw new Error(`ledger row carries an unknown classification: ${line}`)
      }
      waivers.push({
        publicType: codeCell(publicType, line),
        owner: codeCell(owner, line),
        ticket: codeCell(ticket, line),
      })
      continue
    }
    throw new Error(`ledger table row sits outside a known section: ${line}`)
  }
  if (!sawPinSection) throw new Error(`ledger carries no "${pinHeading}" section`)
  if (!sawRowSection) throw new Error(`ledger carries no "${rowHeading}" section`)
  return { waivers, pins }
}

/** The pin table alone, or `undefined` when the ledger predates the ratchet. */
export const parseRatchetPins = (text: string): ReadonlyMap<string, number> | undefined => {
  const pinned = text.replaceAll("\r\n", "\n").split("\n").some((line) => line === pinHeading)
  return pinned ? parseWaiverLedger(text).pins : undefined
}

/** Every line an enforcement refusal can open with. */
export const enforcementRefusalPrefixes: ReadonlyArray<string> = [
  "PUBLIC TYPE UNIVERSE PRECONDITION:",
  "PUBLIC TYPE UNIVERSE UNWAIVERED:",
  "PUBLIC TYPE UNIVERSE RATCHET:",
]

export const isEnforcementRefusal = (message: string): boolean =>
  enforcementRefusalPrefixes.some((prefix) => message.startsWith(prefix))

const refusal = (lines: ReadonlyArray<string>, reason: string): string =>
  `${lines.join("\n")}\nPUBLIC TYPE UNIVERSE: FAIL — ${reason}`

const waiverKey = (publicType: string, owner: string, ticket: string): string =>
  `${publicType} ${owner} ${ticket}`

/**
 * Enforcement in three ordered stages, each with its own refusal vocabulary so
 * the control arms can name the law they drop.
 *
 * 1. PRECONDITION — the committed ledger must be readable, must pin every
 *    prefix the walk found, and every waiver on it must cite a live ticket. A
 *    gate whose own authority is malformed refuses before it judges anything.
 * 2. UNWAIVERED — a walked debt row whose (public type, owner, ticket) triple
 *    is absent from the ledger is untraced public surface with no waiver, which
 *    is what the flip exists to refuse.
 * 3. RATCHET — a prefix whose walked debt count exceeds its pin has grown, and
 *    debt only goes down.
 *
 * Order matters and is measured: an unwaivered NEW type also lifts its prefix's
 * count, so running the ratchet first would name a prefix where the type's own
 * name is the useful diagnostic. Neither side is a view of the other — the
 * classifications come from the declaration walk, the ledger from committed
 * bytes.
 */
export const enforceAgainstLedger = (
  classifications: ReadonlyArray<ClassifiedPublicType>,
  ledgerText: string,
): string => {
  let ledger: WaiverLedger
  try {
    ledger = parseWaiverLedger(ledgerText)
  } catch (cause) {
    return refusal(
      [`PUBLIC TYPE UNIVERSE PRECONDITION: ${cause instanceof Error ? cause.message : String(cause)}`],
      "the committed ledger is not a readable waiver ledger",
    )
  }

  const dead = ledger.waivers
    .map(({ publicType, owner, ticket }) => {
      const violation = livenessViolation(ticket, owner)
      return violation === undefined
        ? undefined
        : `PUBLIC TYPE UNIVERSE PRECONDITION: waiver ${publicType} owner=${owner} ${violation}`
    })
    .filter((line): line is string => line !== undefined)
  if (dead.length > 0) {
    return refusal(dead, "a committed waiver cites a ticket the liveness list does not carry")
  }

  const walked = debtPins(classifications)
  const unpinned = [...walked.keys()]
    .filter((prefix) => !ledger.pins.has(prefix))
    .map((prefix) =>
      `PUBLIC TYPE UNIVERSE PRECONDITION: owning prefix=${prefix} carries walked debt and no ratchet pin`)
  if (unpinned.length > 0) {
    return refusal(unpinned, "the committed ledger does not pin every owning prefix the walk found")
  }

  const granted = new Set(
    ledger.waivers.map(({ publicType, owner, ticket }) => waiverKey(publicType, owner, ticket)),
  )
  const unwaivered = classifications
    .filter(isTicketedDebt)
    .filter((row) => !granted.has(waiverKey(row.publicType, row.owner, row.ticket)))
    .map((row) =>
      `PUBLIC TYPE UNIVERSE UNWAIVERED: ${row.publicType} owner=${row.owner} classification=debt-with-a-ticket ticket=${row.ticket} target=${row.unificationTarget}`)
  if (unwaivered.length > 0) {
    return refusal(unwaivered, "enforce mode refuses public type debt no committed waiver covers")
  }

  const risen = [...walked.entries()]
    .filter(([prefix, count]) => count > (ledger.pins.get(prefix) ?? 0))
    .map(([prefix, count]) =>
      `PUBLIC TYPE UNIVERSE RATCHET: owning prefix=${prefix} walked=${count} pinned=${
        ledger.pins.get(prefix) ?? 0
      } — public type debt only goes down`)
  if (risen.length > 0) {
    return refusal(risen, "the debt ratchet refuses a prefix whose count rose above its pin")
  }

  return ""
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
  auditDebtRoutes()
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
            ...debtRoute(owner),
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

  return {
    classifications: ordered,
    inventory: renderInventory(ordered, command),
  }
}
