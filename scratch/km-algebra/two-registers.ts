/*
 * EXEMPLAR ONLY — wired into nothing, gated by nothing.
 *
 * Demonstrates the KM-18 claim that the plain-word register and the
 * algebraic register are two CONCRETIZATIONS OF ONE ABSTRACTION, not two
 * hand-written texts that happen to agree. One abstract statement type; two
 * total rendering functions over it; a symbol table that is data. Nothing
 * below re-types a sentence in the other register — if it did, the two could
 * drift, which is the whole failure this shape exists to prevent.
 *
 * Run: bun scratch/km-algebra/two-registers.ts
 *
 * In the shipped design the rule data comes out of the conformance corpus's
 * `rule` and `rung` groups and the symbol table out of the `notation` group;
 * this file carries three rows inline so the exemplar stands alone.
 */

/* ── The symbol table: notation is DATA, never an identifier ────────── */

interface OperatorRow {
  /** The plain-word name. This is the only spelling that appears in code. */
  readonly word: string
  /** The math symbol. Appears in docs and prose only — never in a name. */
  readonly symbol: string
  /** The rung this operator's carrier must have earned. */
  readonly rung: RungName
  /**
   * The plain-word reading of one application, as a per-operator datum.
   *
   * Found by running this exemplar: a single generic template ("comes to
   * include at least") rendered the shard-merge rewrite as a join sentence
   * and quietly said something false. The plain register needs one phrasing
   * row per operator; the algebraic register does not, because the symbol
   * already carries the distinction. Recorded in the design as N-1.
   */
  readonly reading: (state: string, contribution: string) => string
}

type RungName =
  | "magma"
  | "monoid"
  | "commutative-monoid"
  | "bounded-semilattice"
  | "group"
  | "abelian-group"

const NOTATION: Record<string, OperatorRow> = {
  join: {
    word: "join",
    symbol: "∨",
    rung: "bounded-semilattice",
    reading: (s, c) => `${s} comes to include at least ${c}`,
  },
  "shard-merge": {
    word: "shard-merge",
    symbol: "⊕",
    rung: "commutative-monoid",
    reading: (s, c) => `${s} accumulates ${c}, and the shards may finish in any order`,
  },
  narrow: {
    word: "narrow",
    symbol: "⊓",
    rung: "bounded-semilattice",
    reading: (s, c) => `${s} is cut down to no more than ${c}`,
  },
}

/** "a" or "an", chosen from the word rather than assumed. */
const article = (word: string): string => ("aeiou".includes(word[0]!) ? "an" : "a")

const LAW_WORDS: Record<string, string> = {
  associative: "order of grouping does not matter",
  commutative: "order of arrival does not matter",
  idempotent: "saying it twice is saying it once",
  identity: "there is a starting value that changes nothing",
  bounded: "the starting value is below everything",
  inverse: "every step can be undone arithmetically",
}

const RUNG_WORDS: Record<RungName, string> = {
  magma: "closed",
  monoid: "groupable",
  "commutative-monoid": "order-free",
  "bounded-semilattice": "duplicate-safe",
  group: "reversible",
  "abelian-group": "order-free and reversible",
}

/* ── The abstract syntax: ONE statement type ────────────────────────── */

type Term =
  | { readonly t: "state"; readonly name: string }
  | { readonly t: "contribution"; readonly of: string }
  | { readonly t: "apply"; readonly op: string; readonly args: readonly Term[] }

type Statement =
  | { readonly s: "rewrite"; readonly from: Term; readonly to: Term }
  | { readonly s: "laws"; readonly op: string; readonly laws: readonly string[] }
  | { readonly s: "derived-order"; readonly op: string }
  | { readonly s: "requires"; readonly op: string; readonly right: string }
  | {
      readonly s: "unearned"
      readonly op: string
      readonly carrier: string
      readonly earned: RungName
      readonly suite: string
    }

/* ── Concretization 1: plain words ──────────────────────────────────── */

const plainTerm = (term: Term): string => {
  switch (term.t) {
    case "state":
      return "what is known here"
    case "contribution":
      return `this ${term.of}`
    case "apply":
      return `${NOTATION[term.op]!.word} of ${term.args.map(plainTerm).join(" and ")}`
  }
}

const plainWords = (stmt: Statement): string => {
  switch (stmt.s) {
    case "rewrite": {
      const applied = stmt.to as { readonly op: string; readonly args: readonly Term[] }
      return NOTATION[applied.op]!.reading(
        plainTerm(stmt.from),
        plainTerm(applied.args[1]!),
      )
    }
    case "laws":
      return `${NOTATION[stmt.op]!.word}: ${stmt.laws.map((l) => LAW_WORDS[l]!).join("; ")}`
    case "derived-order":
      return `one state is at or below another exactly when ${
        NOTATION[stmt.op]!.word
      }ing it in changes nothing`
    case "requires": {
      const word = RUNG_WORDS[NOTATION[stmt.op]!.rung]
      return `${NOTATION[stmt.op]!.word} is allowed only on ${article(word)} ${word} carrier`
    }
    case "unearned": {
      const need = RUNG_WORDS[NOTATION[stmt.op]!.rung]
      return `refused: ${NOTATION[stmt.op]!.word} on ${stmt.carrier} needs ${article(
        need,
      )} ${need} carrier; yours is only ${RUNG_WORDS[stmt.earned]} — run ${stmt.suite}`
    }
  }
}

/* ── Concretization 2: the algebraic register ───────────────────────── */

const algebraicTerm = (term: Term): string => {
  switch (term.t) {
    case "state":
      return term.name
    case "contribution":
      return `c(${term.of})`
    case "apply":
      return term.args.map(algebraicTerm).join(` ${NOTATION[term.op]!.symbol} `)
  }
}

const LAW_SYMBOLS: Record<string, (op: string) => string> = {
  associative: (o) => `(a ${o} b) ${o} c = a ${o} (b ${o} c)`,
  commutative: (o) => `a ${o} b = b ${o} a`,
  idempotent: (o) => `a ${o} a = a`,
  identity: (o) => `e ${o} a = a = a ${o} e`,
  bounded: (o) => `e ≤ a for every a (e is ⊥ under ${o})`,
  inverse: (o) => `a ${o} a⁻¹ = e`,
}

const RUNG_SYMBOLS: Record<RungName, string> = {
  magma: "magma",
  monoid: "monoid",
  "commutative-monoid": "commutative monoid",
  "bounded-semilattice": "bounded semilattice",
  group: "group",
  "abelian-group": "abelian group",
}

const algebraic = (stmt: Statement): string => {
  switch (stmt.s) {
    case "rewrite":
      return `${algebraicTerm(stmt.from)} ↦ ${algebraicTerm(stmt.to)}`
    case "laws": {
      const symbol = NOTATION[stmt.op]!.symbol
      return `${symbol}: ${stmt.laws.map((l) => LAW_SYMBOLS[l]!(symbol)).join("; ")}`
    }
    case "derived-order": {
      const symbol = NOTATION[stmt.op]!.symbol
      return `a ≤ b ⟺ a ${symbol} b = b`
    }
    case "requires": {
      const row = NOTATION[stmt.op]!
      return `${row.symbol} : A × A → A requires A ∈ ${RUNG_SYMBOLS[row.rung]}`
    }
    case "unearned": {
      const row = NOTATION[stmt.op]!
      return `refused: ${stmt.carrier} under ${row.symbol} requires ${
        RUNG_SYMBOLS[row.rung]
      }; earned brand is ${RUNG_SYMBOLS[stmt.earned]} — missing ${
        row.rung === "bounded-semilattice" ? "a ∨ a = a" : "a ⊕ b = b ⊕ a"
      }; run ${stmt.suite}`
    }
  }
}

/* ── Three rows of rule data, rendered both ways ────────────────────── */

const ROWS: readonly { readonly label: string; readonly stmts: readonly Statement[] }[] = [
  {
    label: "join (the monotone write at a lattice carrier)",
    stmts: [
      {
        s: "rewrite",
        from: { t: "state", name: "s" },
        to: {
          t: "apply",
          op: "join",
          args: [
            { t: "state", name: "s" },
            { t: "contribution", of: "observation" },
          ],
        },
      },
      { s: "laws", op: "join", laws: ["associative", "commutative", "idempotent"] },
      { s: "derived-order", op: "join" },
      { s: "requires", op: "join" },
    ],
  },
  {
    label: "partition merge (one meaning from many shards)",
    stmts: [
      {
        s: "rewrite",
        from: { t: "state", name: "s" },
        to: {
          t: "apply",
          op: "shard-merge",
          args: [
            { t: "state", name: "s" },
            { t: "contribution", of: "shard fold" },
          ],
        },
      },
      { s: "laws", op: "shard-merge", laws: ["associative", "commutative", "identity"] },
      { s: "requires", op: "shard-merge" },
    ],
  },
  {
    label: "the taught refusal",
    stmts: [
      {
        s: "unearned",
        op: "shard-merge",
        carrier: "the first-write-wins carrier",
        earned: "magma",
        suite: "suite:commutative-monoid",
      },
    ],
  },
]

for (const row of ROWS) {
  console.log(`\n### ${row.label}`)
  for (const stmt of row.stmts) {
    console.log(`  plain      : ${plainWords(stmt)}`)
    console.log(`  algebraic  : ${algebraic(stmt)}`)
  }
}

console.log("\n### the doc-layer sentence, assembled from the same data")
const j = ROWS[0]!.stmts
console.log(
  `  /** join: ${algebraic(j[0]!)} — ${algebraic(j[1]!)}. Derived order: ${algebraic(
    j[2]!,
  )}. */`,
)
console.log(`  ${plainWords(j[0]!)}.`)
