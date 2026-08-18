/**
 * The declared term of the expressibility slice, and the only place in this
 * package where a sentence about `joinAll` is written by a person.
 *
 * One affordance — the batched cell join — carried through the whole
 * meta-language pipeline: this declaration, the four artifacts
 * `expressibility.ts` renders from it, and the wall `check-expressibility.ts`
 * runs over them. Nothing downstream is hand-written and no sentence exists
 * twice; a second spelling of any field below reddens the regeneration check
 * instead of drifting quietly.
 *
 * **Law 1 SKETCH WAIVER — unification ticket DEV-796.** Standing estate law 1
 * requires every public type to derive from the KM corpus
 * (`kernel/KernelCorpusSchemas` + generated tables) or to wear an explicit
 * waiver citing its unification ticket. This module wears the waiver, and the
 * reason is checkable rather than rhetorical: the corpus's nine record groups
 * are `kind`, `stage`, `refusal`, `type`, `encoding`, `admission`, `doc`,
 * `canon`, and `program`. It carries no `law`, `rung`, or `operator` group, and
 * none of the algebraic-register vocabulary appears in it — `grep` for
 * `semilattice`, `associative`, `commutative`, or `rung` over
 * `fixtures/kernel-conformance.ndjson` returns nothing. The rows below are
 * therefore transcribed from `docs/design/2026-08-18-km-algebraic-register.md`
 * (§3.2 for `law`/`rung`, §6.2–§6.3 for the two registers, §7.1 for the
 * affordance row), which is a design record and not a model emission.
 *
 * Hand-authoring rows INTO the corpus is banned (AGENTS.md: hand-authored model
 * verdicts are refused), so the lawful sequence is that the Lean model grows the
 * `law` / `rung` / `operator` groups first and this module is then re-derived
 * from them. Until that lands, these rows are a **sketch**: they are pinned
 * data reviewed as data, and the wall treats the design record as the outside
 * oracle that keeps them honest. What is NOT waived: the runtime anchor is
 * checked against shipped source, and the served schema is checked against the
 * declaration — neither is transcription.
 *
 * The identity door is the estate's, not a local one: canonical bytes and the
 * digest come from `truth/Canonical` and `truth/Digest` (RFC 8785), so the
 * digest this term names is the same identity the rest of the estate computes.
 *
 * @module
 */
import { Effect } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { digestOf } from "../src/truth/Digest.js"

/** The unification ticket this module's sketch waiver cites. */
export const SKETCH_WAIVER_TICKET = "DEV-796"

/** The design record the sketch rows are transcribed from and walled against. */
export const DESIGN_RECORD = "docs/design/2026-08-18-km-algebraic-register.md"

/** The six rungs of KM-17's ladder; only two are needed here. */
export type RungName =
  | "magma"
  | "monoid"
  | "commutative-monoid"
  | "bounded-semilattice"
  | "group"
  | "abelian-group"

/** The corpus `law` group's shape (§3.2), pending DEV-796. */
export interface LawRow {
  readonly name: string
  readonly equation: string
  readonly reading: string
  readonly donor: string
  readonly donor_source: string
}

/** The corpus `rung` group's shape (§3.2), joined on `name`. */
export interface RungRow {
  readonly name: RungName
  readonly adjective: string
  readonly laws: readonly string[]
  readonly implies: string
  readonly donor: string
  readonly donor_source: string
}

/**
 * The corpus `operator` group's shape (§6.2): symbol, required rung, and the
 * per-operator plain-word phrasing N-1 forced.
 */
export interface OperatorRow {
  readonly name: string
  readonly symbol: string
  readonly rung: RungName
  /**
   * The plain reading of one application, as a TEMPLATE STRING with `{state}`
   * and `{contribution}` holes.
   *
   * Finding **E-1**: `scratch/km-algebra/two-registers.ts` carries this same
   * datum as a closure, and a closure has no canonical bytes — so under a
   * closure the phrasing sits OUTSIDE the term digest and the plain register
   * could be reworded without moving the digest the wall compares. Here it is a
   * template string, and the estate's canonicalizer refuses a function at the
   * type level: `WireValue` has no function case, so the constraint is enforced
   * by the compiler rather than by a runtime check. N-1 made the phrasing a
   * per-operator datum; E-1 is the follow-on that a datum the digest cannot
   * reach is not yet inside the term.
   */
  readonly reading: string
}

/** The runtime composition the term denotes, named rather than described. */
export interface RuntimeAnchor {
  readonly entry: string
  readonly entry_module: string
  /** How the entry is spelled where it is defined, so the anchor finds THE fn. */
  readonly entry_binding: string
  readonly loop: string
  readonly loop_module: string
  readonly carrier: string
  readonly discipline: string
  /** Where the discipline the entry passes is bound to the shipped service. */
  readonly discipline_binding: string
  readonly attempts: number
  /** The public constant the call passes, and the module that exports it. */
  readonly attempts_symbol: string
  readonly attempts_module: string
  readonly contended: string
}

/** The JSON Schema shape one served parameter takes at the MCP door. */
export type ServedShape =
  | { readonly kind: "digest-string"; readonly pattern: string }
  | { readonly kind: "string-array" }

/** One parameter of the affordance, in BOTH surfaces it is projected into. */
export interface ParameterDecl {
  readonly name: string
  /** The TypeScript type, with `{State}` and `{Rung}` holes the emitter fills. */
  readonly ts_type: string
  /** The property name at the MCP door, which need not equal `name`. */
  readonly served_name: string
  readonly served: ServedShape
  readonly required: boolean
  /** The served description, with `{rung}` and `{inherited}` holes. */
  readonly served_description: string
}

/** The carrier and result the fluent surface elaborates at. */
export interface SignatureDecl {
  readonly type_parameter: string
  readonly carrier_type: string
  readonly returns: string
  readonly refusal: string
  readonly parameters: readonly ParameterDecl[]
}

/** The term language: four constructors, which is all one affordance needs. */
export type Term =
  | { readonly t: "state" }
  | { readonly t: "batch"; readonly of: string }
  | { readonly t: "fold"; readonly op: string; readonly over: Term }
  | { readonly t: "apply"; readonly op: string; readonly args: readonly Term[] }

/** The declared term. Its canonical bytes are the digest's preimage. */
export interface DeclaredTerm {
  readonly affordance: string
  readonly signature: SignatureDecl
  readonly operator: OperatorRow
  readonly rung: RungRow
  readonly laws: readonly LawRow[]
  readonly carrier: string
  readonly donors: readonly string[]
  readonly evidence: string
  readonly inherited: string
  readonly denotation: Term
  readonly runtime: RuntimeAnchor
  /** Every bound the quoted surfaces must carry; both are the loop's own. */
  readonly bounds: readonly string[]
}

/**
 * The five law rows the join's rung bundles.
 *
 * Equations and readings are the estate's, not invented here: the ACI three are
 * quoted in §6.3's committed output block; `identity` and `bounded` come from
 * `scratch/km-algebra/two-registers.ts`'s `LAW_WORDS` and `LAW_SYMBOLS`.
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

/** The join operator row. */
export const JOIN: OperatorRow = {
  name: "join",
  symbol: "∨",
  rung: "bounded-semilattice",
  reading: "{state} comes to include at least {contribution}",
}

/** The declared signature, from which BOTH projected surfaces derive. */
export const SIGNATURE: SignatureDecl = {
  type_parameter: "State",
  carrier_type: "Cell<{State}, {Rung}>",
  returns: "Effect<Cell<{State}, {Rung}>, Refusal>",
  refusal: "Refusal",
  parameters: [
    {
      name: "cell",
      ts_type: "Cell<{State}, {Rung}>",
      served_name: "cell_digest",
      served: { kind: "digest-string", pattern: "^sha256:[0-9a-f]+$" },
      required: true,
      served_description:
        "Digest of the declared cell resource whose {rung} algebra governs the merge.",
    },
    {
      name: "contributions",
      ts_type: "ReadonlyArray<{State}>",
      served_name: "contributions",
      served: { kind: "string-array" },
      required: true,
      served_description: "The batch, canonical bytes per element — {inherited}.",
    },
  ],
}

export const TERM: DeclaredTerm = {
  affordance: "joinAll",
  signature: SIGNATURE,
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
    entry_binding: 'Effect.fn("Cells.merge")',
    loop: "casJoinLoop",
    loop_module: "packages/plait/src/internal/cas.ts",
    carrier: "cellJoin",
    discipline: "lawfulMergeDiscipline",
    discipline_binding: "makeCellServiceWith(options, lawfulMergeDiscipline)",
    attempts: 8,
    attempts_symbol: "CELL_MERGE_ATTEMPTS",
    attempts_module: "packages/plait/src/planes/Cell.ts",
    contended: "cell-update-contended",
  },
  // `cas.ts`'s own module header, compressed and not softened.
  bounds: [
    "convergence on success is F1's, never the loop's; completion is not claimed, and an exhausted attempt bound refuses cell-update-contended",
    "every claim holds only within a fixed backing-stream incarnation — KV revisions are backing-stream sequences, so a bucket delete/recreate resets the revision order beneath all of it",
  ],
}

/** The TypeScript parameter names, derived so the spelling exists once. */
export const PARAMETER_NAMES: readonly string[] = SIGNATURE.parameters.map((p) => p.name)

/** Every declared bound as one sentence, for the media that carry a line. */
export const BOUND_TEXT: string = TERM.bounds.join("; also, ")

/**
 * The term's canonical bytes, through the estate's RFC 8785 door.
 *
 * The scratch spike carried a local canonicalizer because `effect` did not
 * resolve from `scratch/`. In its package home that reason is gone, so the
 * identity this term names is the estate's identity and not a lookalike.
 */
export const termBytes = (): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(TERM as unknown as WireValue))

/**
 * The canonical preimage as text: the same bytes, decoded once.
 *
 * The door's canonical form is BYTES (`Uint8Array`, UTF-8) — the digest is taken
 * over those, not over a JavaScript string, and the committed artifact is that
 * byte sequence. This decoding exists only so the generator and the wall can
 * hold the artifact in the same representation they hold the other three in; the
 * round trip is exact because the bytes are valid UTF-8 by construction.
 */
export const termPreimage = async (): Promise<string> =>
  new TextDecoder().decode(await termBytes())

/** The one digest every projection names, from the estate's identity door. */
export const termDigest = (): Promise<string> =>
  Effect.runPromise(digestOf(TERM as unknown as WireValue))

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
 * Every field that appears in more than one projection. The wall pulls each of
 * these back out of each projection's own bytes and byte-compares.
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

/** The shared fields, given the digest the identity door computed. */
export const sharedOf = (digest: string): Shared => ({
  affordance: `${TERM.affordance}(${PARAMETER_NAMES.join(", ")})`,
  rung: TERM.rung.name,
  algebraic: `${algebraic(REWRITE)} — ${algebraic(LAWS_OF)}`,
  plain: plainWords(REWRITE),
  inherited: TERM.inherited,
  donors: TERM.donors.join(", "),
  evidence: TERM.evidence,
  term: digest,
})

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
