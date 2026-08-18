/**
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * The ONE declared term of the expressibility slice, and the only file in this
 * directory where a sentence about `joinAll` is written by a person. `emit.ts`
 * and `project.ts` format what `SHARED` derives here; `wall.ts` reads the
 * results back out of their own bytes and compares. Nothing downstream is
 * hand-written, and no sentence exists twice.
 *
 * Written from `docs/design/2026-08-18-km-algebraic-register.md` — §3.2 for the
 * `law` and `rung` row groups, §6.2–§6.3 for the two registers, §7.1 for the
 * affordance row and its inherited sentence — and from the shipped composition
 * the term denotes: `packages/plait/src/internal/cas.ts` `casJoinLoop` as bound
 * at the observation cell by `packages/plait/src/internal/cells.ts` `merge`.
 *
 * Zero imports beyond `node:crypto`, in the posture `scratch/km-algebra` set:
 * the exemplar stands alone. In the shipped design every row below comes out of
 * the conformance corpus and none of it is typed by a person either.
 *
 * Run: `bash scratch/km-expressibility/run.sh`
 */

import { createHash } from "node:crypto"

// ── The row groups, carried inline so the exemplar stands alone ──────────────

/** The six rungs of KM-17's ladder; only two are needed here. */
export type RungName =
  | "magma"
  | "monoid"
  | "commutative-monoid"
  | "bounded-semilattice"
  | "group"
  | "abelian-group"

/**
 * The corpus `law` group (§3.2): `{ name, equation, reading, donor,
 * donor_source }`. `equation` is the algebraic-register text written at the
 * generic operator `∘`; `reading` is the plain-word one.
 */
export interface LawRow {
  readonly name: string
  readonly equation: string
  readonly reading: string
  readonly donor: string
  readonly donor_source: string
}

/** The corpus `rung` group (§3.2), joined on `name`; there is no rank field. */
export interface RungRow {
  readonly name: RungName
  readonly adjective: string
  readonly laws: readonly string[]
  readonly implies: string
  readonly donor: string
  readonly donor_source: string
}

/**
 * The corpus `operator` group (§6.2): symbol, required rung, and the
 * per-operator plain-word phrasing N-1 forced.
 */
export interface OperatorRow {
  readonly name: string
  readonly symbol: string
  readonly rung: RungName
  /**
   * The plain-word reading of one application, as a TEMPLATE STRING with
   * `{state}` and `{contribution}` holes.
   *
   * Finding **E-1**, surfaced by writing this file: `scratch/km-algebra/
   * two-registers.ts` carries the same datum as a closure. A closure has no
   * canonical bytes — `canonicalBytes` below refuses it — so under a closure
   * the phrasing sits OUTSIDE the term digest, and the plain register could be
   * reworded without moving the digest the parity wall compares. N-1 made the
   * phrasing a per-operator datum; E-1 is the follow-on that a datum a digest
   * cannot reach is not yet inside the term.
   */
  readonly reading: string
}

/** The runtime composition the term denotes, named rather than described. */
export interface RuntimeAnchor {
  readonly entry: string
  readonly entry_module: string
  readonly loop: string
  readonly loop_module: string
  readonly carrier: string
  readonly discipline: string
  readonly attempts: number
  readonly contended: string
}

/**
 * The five law rows the join's rung bundles.
 *
 * Equations and readings are the estate's, not invented here: the ACI three
 * are quoted in §6.3's committed output block, `identity` and `bounded` come
 * from `scratch/km-algebra/two-registers.ts`'s `LAW_WORDS` and `LAW_SYMBOLS`.
 */
export const LAWS: readonly LawRow[] = [
  {
    name: "associative",
    equation: "(a ∘ b) ∘ c = a ∘ (b ∘ c)",
    reading: "order of grouping does not matter",
    donor: "f1_cell_merge_aci",
    donor_source: "verify/fabric",
  },
  {
    name: "commutative",
    equation: "a ∘ b = b ∘ a",
    reading: "order of arrival does not matter",
    donor: "f1_cell_merge_aci",
    donor_source: "verify/fabric",
  },
  {
    name: "idempotent",
    equation: "a ∘ a = a",
    reading: "saying it twice is saying it once",
    donor: "f1_cell_merge_aci",
    donor_source: "verify/fabric",
  },
  {
    name: "identity",
    equation: "e ∘ a = a = a ∘ e",
    reading: "there is a starting value that changes nothing",
    donor: "join_semilattice_of_aci",
    donor_source: "verify/fabric",
  },
  {
    name: "bounded",
    equation: "e ≤ a for every a (e is ⊥ under ∘)",
    reading: "the starting value is below everything",
    donor: "join_semilattice_of_aci",
    donor_source: "verify/fabric",
  },
]

/** The rung the join is licensed at, and nowhere below it. */
export const BOUNDED_SEMILATTICE: RungRow = {
  name: "bounded-semilattice",
  adjective: "duplicate-safe",
  laws: ["associative", "commutative", "idempotent", "identity", "bounded"],
  implies: "commutative-monoid",
  donor: "join_semilattice_of_aci",
  donor_source: "verify/fabric",
}

/** The rung one step down, carried for the emitted surface's control. */
export const COMMUTATIVE_MONOID: RungRow = {
  name: "commutative-monoid",
  adjective: "order-free",
  laws: ["associative", "commutative", "identity"],
  implies: "monoid",
  donor: "",
  donor_source: "",
}

/** The join operator row. `word` is the only spelling that appears in a name. */
export const JOIN: OperatorRow = {
  name: "join",
  symbol: "∨",
  rung: "bounded-semilattice",
  reading: "{state} comes to include at least {contribution}",
}

// ── The denotation ───────────────────────────────────────────────────────────

/** The term language: four constructors, which is all one affordance needs. */
export type Term =
  | { readonly t: "state" }
  | { readonly t: "batch"; readonly of: string }
  | { readonly t: "fold"; readonly op: string; readonly over: Term }
  | { readonly t: "apply"; readonly op: string; readonly args: readonly Term[] }

/** The declared term. Its canonical bytes are `TERM_DIGEST`'s preimage. */
export interface DeclaredTerm {
  readonly affordance: string
  readonly parameters: readonly string[]
  readonly operator: OperatorRow
  readonly rung: RungRow
  readonly laws: readonly LawRow[]
  readonly carrier: string
  readonly donors: readonly string[]
  readonly evidence: string
  readonly inherited: string
  readonly denotation: Term
  readonly runtime: RuntimeAnchor
  readonly bound: string
}

export const TERM: DeclaredTerm = {
  affordance: "joinAll",
  parameters: ["cell", "contributions"],
  operator: JOIN,
  rung: BOUNDED_SEMILATTICE,
  // The three the batch claim rests on. The rung bundles five; ACI is what
  // licenses "any grouping, any order, any duplication".
  laws: LAWS.filter((law) => ["associative", "commutative", "idempotent"].includes(law.name)),
  carrier: "the observation cell",
  donors: ["f1_cell_merge_aci", "f1_history_convergence"],
  evidence: "donor",
  // §7.1's "what the caller no longer has to know" column, verbatim.
  inherited:
    "any grouping, any order, any duplication of the batch gives one result — so batching is free and needs no ordering discipline",
  denotation: {
    t: "apply",
    op: "join",
    args: [{ t: "state" }, { t: "fold", op: "join", over: { t: "batch", of: "contributions" } }],
  },
  runtime: {
    entry: "Cells.merge",
    entry_module: "packages/plait/src/internal/cells.ts",
    loop: "casJoinLoop",
    loop_module: "packages/plait/src/internal/cas.ts",
    carrier: "cellJoin",
    discipline: "lawfulMergeDiscipline",
    attempts: 8,
    contended: "cell-update-contended",
  },
  // `cas.ts`'s own module header, compressed to one line and not softened.
  bound:
    "convergence on success is F1's, never the loop's; completion is not claimed, and an exhausted attempt bound refuses cell-update-contended",
}

// ── Canonical bytes and the digest ───────────────────────────────────────────

/**
 * Canonical bytes for the term preimage: keys sorted, arrays in order, safe
 * integers only, and a hard refusal for everything else.
 *
 * BOUND, stated because a digest invites over-reading: this is a LOCAL
 * canonicalizer over a small closed domain, not the estate's RFC 8785 door
 * (`packages/plait/src/Canonical.ts`). The exemplar cannot import that door —
 * `effect` does not resolve from `scratch/` — and a generator inside the estate
 * would use it rather than this. What the two agree on is the shape of the
 * claim, not the byte rule for floats, `-0`, or non-BMP escapes, none of which
 * this domain admits.
 *
 * The refusal on a function is load-bearing, not defensive: it is what makes
 * E-1 structural instead of a note.
 */
export const canonicalBytes = (value: unknown): string => {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value)
    case "boolean":
      return value ? "true" : "false"
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new Error(`the term preimage carries the non-integer ${String(value)}`)
      }
      return String(value)
    case "object":
      break
    default:
      throw new Error(
        `the term preimage carries a ${typeof value}, which has no canonical bytes` +
          " — a datum a digest cannot reach is not inside the term (E-1)",
      )
  }
  if (value === null) throw new Error("the term preimage carries null; absence is not a value here")
  if (Array.isArray(value)) return `[${value.map(canonicalBytes).join(",")}]`
  const record = value as Record<string, unknown>
  return `{${
    Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalBytes(record[key])}`)
      .join(",")
  }}`
}

/** SHA-256 over canonical bytes, in the estate's digest shape (64 lowercase hex). */
export const digestOf = (value: unknown): string =>
  createHash("sha256").update(canonicalBytes(value), "utf8").digest("hex")

/** The one digest every projection names. */
export const TERM_DIGEST: string = digestOf(TERM)

// ── One abstract statement type, two concretizations (§6.3) ─────────────────

export type Statement =
  | { readonly s: "rewrite"; readonly from: Term; readonly to: Term }
  | { readonly s: "laws" }
  | { readonly s: "derived-order" }
  | { readonly s: "requires" }

export const REWRITE: Statement = { s: "rewrite", from: { t: "state" }, to: TERM.denotation }
export const LAWS_OF: Statement = { s: "laws" }
export const DERIVED_ORDER: Statement = { s: "derived-order" }
export const REQUIRES: Statement = { s: "requires" }

/** The four statements this term makes, in the order §6.3 renders them. */
export const STATEMENTS: readonly Statement[] = [REWRITE, LAWS_OF, DERIVED_ORDER, REQUIRES]

const fill = (template: string, state: string, contribution: string): string =>
  template.replace("{state}", state).replace("{contribution}", contribution)

// Concretization 1: plain words.

const plainTerm = (term: Term): string => {
  switch (term.t) {
    case "state":
      return "what is known here"
    case "batch":
      return `the ${term.of} in the batch`
    case "fold":
      return `the ${TERM.operator.name} of ${plainTerm(term.over)}`
    case "apply":
      return `the ${TERM.operator.name} of ${term.args.map(plainTerm).join(" and ")}`
  }
}

export const plainWords = (statement: Statement): string => {
  const { adjective } = TERM.rung
  const { name } = TERM.operator
  switch (statement.s) {
    case "rewrite": {
      const applied = statement.to
      if (applied.t !== "apply") throw new Error("a rewrite's right side is an application")
      // No generic fallback: the phrasing is the operator's own datum (N-1).
      return fill(TERM.operator.reading, plainTerm(statement.from), plainTerm(applied.args[1]!))
    }
    case "laws":
      return `${name}: ${TERM.laws.map((law) => law.reading).join("; ")}`
    case "derived-order":
      return `one state is at or below another exactly when ${name}ing it in changes nothing`
    case "requires":
      return `${name} is allowed only on ${
        "aeiou".includes(adjective[0]!) ? "an" : "a"
      } ${adjective} carrier`
  }
}

// Concretization 2: the algebraic register.

const algebraicTerm = (term: Term): string => {
  switch (term.t) {
    case "state":
      return "s"
    case "batch":
      return term.of
    case "fold":
      return `(⋁ ${algebraicTerm(term.over)})`
    case "apply":
      return term.args.map(algebraicTerm).join(` ${TERM.operator.symbol} `)
  }
}

export const algebraic = (statement: Statement): string => {
  const { symbol } = TERM.operator
  switch (statement.s) {
    case "rewrite":
      return `${algebraicTerm(statement.from)} ↦ ${algebraicTerm(statement.to)}`
    case "laws":
      return `${symbol}: ${
        TERM.laws.map((law) => law.equation.replaceAll("∘", symbol)).join("; ")
      }`
    case "derived-order":
      return `a ≤ b ⟺ a ${symbol} b = b`
    case "requires":
      return `${symbol} : A × A → A requires A ∈ ${TERM.rung.name.replaceAll("-", " ")}`
  }
}

// ── The shared fields: derived once, formatted three ways ────────────────────

/**
 * Every field that appears in more than one projection. The parity wall pulls
 * each of these back out of each projection's own bytes and byte-compares.
 *
 * The rung's plain-word adjective is deliberately NOT here: it appears in the
 * plain register alone, so it is a register rendering rather than a shared
 * field, and the wall says so rather than pretending to compare it.
 */
export interface Shared {
  readonly affordance: string
  readonly rung: string
  readonly algebraic: string
  readonly plain: string
  readonly inherited: string
  readonly donors: string
  readonly evidence: string
  readonly term: string
}

export const SHARED: Shared = {
  affordance: `${TERM.affordance}(${TERM.parameters.join(", ")})`,
  rung: TERM.rung.name,
  algebraic: `${algebraic(REWRITE)} — ${algebraic(LAWS_OF)}`,
  plain: plainWords(REWRITE),
  inherited: TERM.inherited,
  donors: TERM.donors.join(", "),
  evidence: TERM.evidence,
  term: TERM_DIGEST,
}

/** The field order the wall reports in, so two runs read the same. */
export const SHARED_FIELDS: readonly (keyof Shared)[] = [
  "affordance",
  "rung",
  "algebraic",
  "plain",
  "inherited",
  "donors",
  "evidence",
  "term",
]
