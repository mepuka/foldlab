/*
 * The oxc leg's PATTERN TABLE — the shapes this instrument recognizes, as data.
 *
 * The estate's style for a recognizer is a legible table of patterns, not a pile of
 * hand-rolled visitors: the lift-harness reads its rules out of a manifest, and what
 * makes that gate meaningful is that the rules are inspectable next to the ruling they
 * came from. This module is the same idea at Stage 1 — every shape the oxc extractor
 * looks for is a `Pat` record with a `doc` field naming the census enumeration it
 * serves and the source line it was read off. The walkers in `oxc-extract.ts` do the
 * traversal; they do not decide what a variant class LOOKS like.
 *
 * A `Pat` is plain data over the ESTree shapes `oxc-parser` emits. Field paths are
 * dotted (`id.name`, `typeAnnotation.type`), so a pattern never has to reach through a
 * node by hand. Constraints are deliberately few — equality, membership, arity,
 * presence — because a constraint language rich enough to express the whole walk would
 * just be the walk again, spelled worse.
 *
 * ESTree deviations are ADMITTED, not assumed away, exactly as the lift-harness's oxc
 * engine does it: string literals arrive as `Literal` from `oxc-parser` and as
 * `StringLiteral` from a Babel-flavoured host, class members as `PropertyDefinition`
 * and — when `abstract` — as `TSAbstractPropertyDefinition`. Every such pair is written
 * out in the table below rather than normalized in a helper, so the surface a pattern
 * accepts is readable from the pattern.
 */

// ---------- the node universe ----------

/** An ESTree node as `oxc-parser` hands it over: plain JSON, `type` + a byte span. */
export interface OxcNode {
  readonly type: string
  readonly start: number
  readonly end: number
  readonly [key: string]: unknown
}

export const isNode = (v: unknown): v is OxcNode =>
  typeof v === "object" && v !== null && typeof (v as { type?: unknown }).type === "string"

// ---------- constraints ----------

export type Constraint =
  | { readonly eq: string | number | boolean | null }
  | { readonly oneOf: ReadonlyArray<string> }
  | { readonly len: number }
  | { readonly present: true }
  | { readonly absent: true }

export interface Pat {
  /** Why this shape exists, and where it was read off. Never decorative. */
  readonly doc: string
  readonly type: string | ReadonlyArray<string>
  readonly where?: Readonly<Record<string, Constraint>>
}

/** Resolve a dotted path. Numeric segments index arrays. */
export const at = (node: unknown, path: string): unknown => {
  let cur: unknown = node
  for (const seg of path.split(".")) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      const i = Number(seg)
      cur = Number.isInteger(i) ? cur[i] : undefined
      continue
    }
    if (typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

const holds = (value: unknown, c: Constraint): boolean => {
  if ("eq" in c) return value === c.eq
  if ("oneOf" in c) return typeof value === "string" && c.oneOf.includes(value)
  if ("len" in c) return Array.isArray(value) && value.length === c.len
  if ("present" in c) return value !== undefined && value !== null
  return value === undefined || value === null
}

export const match = (node: unknown, pat: Pat): node is OxcNode => {
  if (!isNode(node)) return false
  const types = typeof pat.type === "string" ? [pat.type] : pat.type
  if (!types.includes(node.type)) return false
  for (const [path, c] of Object.entries(pat.where ?? {})) {
    if (!holds(at(node, path), c)) return false
  }
  return true
}

// ---------- traversal ----------

/**
 * Pre-order walk over every node in the subtree, parents before children.
 *
 * Key order in an ESTree object is not a promise about source order, so callers that
 * need an ORDERED enumeration sort by `start` afterwards rather than trusting the walk
 * (`collect` below does). `parent`, `loc` and `range` are skipped: the first would make
 * the walk non-terminating and the other two are position echoes, never new nodes.
 */
export const visit = (root: unknown, f: (n: OxcNode) => void): void => {
  const go = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const x of v) go(x)
      return
    }
    if (!isNode(v)) return
    f(v)
    for (const k of Object.keys(v)) {
      if (k === "type" || k === "parent" || k === "loc" || k === "range" || k === "start" || k === "end") continue
      go(v[k])
    }
  }
  go(root)
}

/** Every match in the subtree, in SOURCE order. */
export const collect = (root: unknown, pat: Pat): Array<OxcNode> => {
  const out: Array<OxcNode> = []
  visit(root, (n) => {
    if (match(n, pat)) out.push(n)
  })
  return out.sort((a, b) => a.start - b.start)
}

/**
 * A top-level statement, paired with the declaration inside it.
 *
 * The TypeScript compiler API puts `export` in the DECLARATION's modifier list, so
 * `sourceFile.statements` yields the class or alias itself and its start is the `export`
 * keyword. ESTree wraps instead: `ExportNamedDeclaration { declaration }`, whose child
 * starts at `class`. Both facts are kept — `decl` is what patterns match, `stmt` is what
 * line numbers are taken from — because that is what makes this leg's `declLine` the
 * same number the compiler-API leg reports rather than one that merely usually is.
 */
export interface TopLevel {
  readonly stmt: OxcNode
  readonly decl: OxcNode
}

export const topLevel = (program: OxcNode): Array<TopLevel> => {
  const body = (program["body"] ?? []) as Array<OxcNode>
  const out: Array<TopLevel> = []
  for (const stmt of body) {
    if (!isNode(stmt)) continue
    const inner = stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration"
      ? stmt["declaration"]
      : stmt
    if (isNode(inner)) out.push({ stmt, decl: inner })
  }
  return out
}

// ---------- the table ----------

/**
 * Node-type spellings this leg admits for one concept. Written out rather than folded
 * into a helper: the point of a table is that its acceptance surface is readable.
 */
export const SPELLINGS = {
  /** `oxc-parser` emits `Literal`; Babel-flavoured hosts emit `StringLiteral`. */
  stringLiteral: ["Literal", "StringLiteral"],
  /** `abstract readonly x: T` is a distinct node type in the TS-ESTree extension. */
  classProperty: ["PropertyDefinition", "TSAbstractPropertyDefinition"],
  /** A parameter may be bare, defaulted, or a TS parameter property. */
  parameter: ["Identifier", "AssignmentPattern", "TSParameterProperty"]
} as const

export const PATTERNS = {
  // ---- enumeration A: the union alias (SchemaAST.ts:53) ----
  unionAliasAST: {
    doc: "A - `export type AST = X | Y | ...`; the members are the 21 variants, source order kept",
    type: "TSTypeAliasDeclaration",
    where: { "id.name": { eq: "AST" } }
  },

  // ---- enumeration B: the guard call sites (SchemaAST.ts:109-380) ----
  guardCall: {
    doc: "B - `makeGuard(\"Tag\")`; exactly one argument, and it must BE a string literal",
    type: "CallExpression",
    where: { "callee.type": { eq: "Identifier" }, "callee.name": { eq: "makeGuard" }, arguments: { len: 1 } }
  },

  // ---- enumeration C: the variant classes ----
  variantClass: {
    doc: "C - `class X extends Base`; the 21 carriers. Filter/FilterGroup carry _tags but not Base",
    type: "ClassDeclaration",
    where: { "id.type": { eq: "Identifier" }, "superClass.type": { eq: "Identifier" }, "superClass.name": { eq: "Base" } }
  },
  baseClass: {
    doc: "the shared header: `abstract class Base` (SchemaAST.ts:636), source of baseFields",
    type: "ClassDeclaration",
    where: { "id.name": { eq: "Base" } }
  },
  classProperty: {
    doc: "a named, non-computed class property. Computed keys ([TypeId]) are NOT properties here",
    type: SPELLINGS.classProperty,
    where: { computed: { eq: false }, "key.type": { eq: "Identifier" } }
  },
  constructorMember: {
    doc: "`constructor(...)`; its params are the ctorParams the generator needs",
    type: ["MethodDefinition", "TSAbstractMethodDefinition"],
    where: { kind: { eq: "constructor" }, "value.type": { eq: "FunctionExpression" } }
  },
  functionType: {
    doc: "a syntactic arrow type `(a: A) => B` - the SYNTAX half of the closure classification",
    type: "TSFunctionType"
  },

  // ---- enumeration D: the Representation union (SchemaRepresentation.ts:406-428) ----
  representationAlias: {
    doc: "D - `export type Representation = ...`; expected to be the AST union plus Reference",
    type: "TSTypeAliasDeclaration",
    where: { "id.name": { eq: "Representation" } }
  },

  // ---- enumeration E: the runtime array (SchemaRepresentation.ts:1071-1094) ----
  representationUnionDecl: {
    doc: "E - the `RepresentationUnion` declarator; its first call argument is the array literal",
    type: "VariableDeclarator",
    where: { "id.type": { eq: "Identifier" }, "id.name": { eq: "RepresentationUnion" }, "init.type": { eq: "CallExpression" } }
  },
  keywordSchemaCall: {
    doc: "E - `makeKeywordSchema(\"Tag\")`, one of the two admitted element spellings",
    type: "CallExpression",
    where: { "callee.type": { eq: "Identifier" }, "callee.name": { eq: "makeKeywordSchema" } }
  },

  // ---- the surface census: what tree-sitter cannot read ----
  varianceTypeParameter: {
    doc: "D1 - a type parameter carrying `in` and/or `out`. The pinned grammar has no rule for these: `type_parameter` admits `const` only (define-grammar.js:1005-1010), so every site is an ERROR node to the twin",
    type: "TSTypeParameter"
  },
  objectTypeLiteral: {
    doc: "D1b - an object type; the enclosing shape for the newline-separated generic call-signature overloads that no reachable tree-sitter pin parses",
    type: "TSTypeLiteral"
  },
  callSignature: {
    doc: "D1b - a bare call signature `<C>(a: C): R` inside an object type",
    type: "TSCallSignatureDeclaration"
  }
} as const satisfies Record<string, Pat>
