/**
 * The census contract — the portable, first-order layer.
 *
 * The census's unit of observation is the TypeScript DECLARATION, fixed by
 * `project-labels.json:3` ("the unit of observation downstream is the
 * TypeScript declaration; these labels are the sampling strata every
 * experiment reuses, so per-construct statistics stay comparable across runs
 * and instruments"). Comparability across runs and instruments is only worth
 * something if "declaration" means one thing, so it is DEFINED here, once,
 * and both legs implement that definition independently.
 *
 * THE DEFINITION. A declaration is a TOP-LEVEL statement of a source file
 * that introduces a name:
 *
 *   variable   one declarator of a top-level `var`/`let`/`const` statement
 *              whose binder is a plain identifier (a destructuring binder
 *              introduces several names and no single one of them is the
 *              declaration, so it is counted once under the spelling below)
 *   function   a function declaration, including an ambient one
 *   class      a class declaration
 *   interface  an interface declaration
 *   typeAlias  a type alias
 *   enum       an enum declaration
 *   module     a `module`/`namespace`/`declare global` block
 *
 * Everything else at top level is NOT a declaration for census purposes:
 * imports, bare `export { … }` / `export * from`, `import x = require(…)`,
 * and every expression statement. Nested declarations (inside a function
 * body, a namespace block, or a class) are NOT counted — the unit is the
 * top-level declaration, and a deeper walk would make the two legs' tree
 * shapes, not the language, decide the count.
 *
 * The definition is deliberately spelling-level and type-blind, exactly like
 * the recognition legs it rides beside: this is a CENSUS, and a census that
 * needed a typechecker could not run over a wild corpus at all.
 *
 * No IO, no parser. Both enumerators (`decls-ck.ts` over a `typescript`
 * SourceFile, `decls-oxc.mjs` over an `oxc-parser` ESTree Program) share this
 * file's DATA and nothing else — the same rule that makes the harness's
 * agreement gate mean something (`../lift-harness/src/oxc-engine.mjs:1-5`).
 */
import { Schema } from "effect";

/** The shared declaration vocabulary. A schema, so the list exists at
 * runtime: the tally enumerates it rather than discovering it from data. */
export const DeclKind = Schema.Literals([
  "variable", "function", "class", "interface", "typeAlias", "enum", "module",
]);
export type DeclKind = typeof DeclKind.Type;

export const DECL_KINDS: readonly DeclKind[] = DeclKind.literals;

/** One observed declaration, as both legs see it.
 *
 * `variance` is the D1 evidence fact: whether the declaration carries an
 * `in`/`out` type-parameter variance modifier. That is the stratum
 * `project-labels.json:12` names as "the pinned grammar's held defect (D1
 * evidence stratum)", and the whole reason the label exists — so the census
 * measures it rather than leaving it to prose.
 */
export const Decl = Schema.Struct({
  kind: DeclKind,
  name: Schema.String,
  exported: Schema.Boolean,
  /** Declared without an implementation: a `declare` modifier, or a
   * function signature with no body. The second clause matters — a `.d.ts`
   * writes `export function f(): void;` with no `declare` keyword, and a
   * definition that read only the modifier would count that as an
   * implementation. */
  ambient: Schema.Boolean,
  /** Carries at least one `in`/`out` type-parameter modifier (D1). */
  variance: Schema.Boolean,
});
export type Decl = typeof Decl.Type;

/** The twin's comparison key. Positions are excluded for the same reason
 * `verdictKey` excludes `pos`: byte offsets are engine-local convenience,
 * and two parsers that agree about the language must not be reported as
 * disagreeing because one of them counts a leading trivium differently.
 * Everything the census actually COUNTS is inside the key. */
export const declKey = (d: Decl): string =>
  [d.kind, d.name, d.exported ? "x" : "-", d.ambient ? "d" : "-", d.variance ? "v" : "-"].join("|");

/** The name a nameless `export default function () {}` is counted under.
 * Both legs must spell it identically or every default export is a
 * disagreement, so the spelling lives here rather than in either leg. */
export const ANONYMOUS_DEFAULT = "default";

/** The name a destructuring binder is counted under (see the definition
 * above): the statement declares something, the census declines to guess
 * which name is "the" declaration, and both legs say so the same way. */
export const DESTRUCTURED = "«destructured»";

/** One row of `<slice>.rows.jsonl` — the census's evidence grain.
 *
 * `verdict`/`code`/`spectrum` are the recognition facts, present only for
 * declarations the lift harness considers candidates; `null` everywhere else
 * says "not a candidate", which is a different fact from "refused" and must
 * never be folded into one.
 */
export const Row = Schema.Struct({
  project: Schema.String,
  slice: Schema.String,
  /** Path relative to the project's `localPath`, `/`-separated. */
  file: Schema.String,
  kind: DeclKind,
  name: Schema.String,
  exported: Schema.Boolean,
  ambient: Schema.Boolean,
  variance: Schema.Boolean,
  /** `null` when the declaration is not a recognition candidate. */
  verdict: Schema.NullOr(Schema.Literals(["lifted", "refusal"])),
  code: Schema.NullOr(Schema.String),
  spectrum: Schema.NullOr(Schema.String),
  /** How the two legs fared on this row's FILE. `disjoint` is its own state,
   * not a flavour of `agree`: one leg's parser rejected the file, so its
   * declarations were never corroborated by anything, and calling that
   * agreement would be claiming a witness that does not exist. */
  twin: Schema.Literals(["agree", "disagree", "disjoint"]),
});
export type Row = typeof Row.Type;

/** How one leg fared on one file. `parsed: false` is R12's "non-candidate":
 * a source a leg's own parser rejects is not classified by that leg, and the
 * census records the fact rather than a count of zero. */
export const LegFile = Schema.Struct({
  parsed: Schema.Boolean,
  decls: Schema.Number,
});
export type LegFile = typeof LegFile.Type;

/** The per-slice summary — what `census:gate` adjudicates and what fills
 * `corpus-manifest.json`'s `declCount`. Rows are the grain; this is the
 * fold, and it exists so the gate never has to re-read half a million rows
 * to answer a question about disagreement. */
export const Summary = Schema.Struct({
  project: Schema.String,
  slice: Schema.String,
  localPath: Schema.String,
  /** The pin the manifest names, and the pin the checkout is actually at. */
  pin: Schema.String,
  pinObserved: Schema.NullOr(Schema.String),
  /** What produced the numbers. REQUIRED, not optional: an unstamped count
   * is refused, because a count whose provenance is not in the artifact is
   * a number without a witness. `grammar` names the tree-sitter revision the
   * count is comparable against and `provisional` says a pin bump is a
   * re-run event — see `pins.ts` for why a census run by two
   * non-tree-sitter parsers carries a grammar revision at all. */
  instrument: Schema.Struct({
    census: Schema.String,
    ck: Schema.String,
    oxc: Schema.String,
    manifestVersion: Schema.Number,
    grammar: Schema.String,
    grammarReceipt: Schema.String,
    provisional: Schema.Boolean,
  }),
  files: Schema.Number,
  /** Files whose two legs' declaration lists were byte-identical. */
  filesAgreed: Schema.Number,
  declCountCk: Schema.Number,
  declCountOxc: Schema.Number,
  /** Declarations in files BOTH legs parsed AND enumerated identically —
   * the part of the count the twin actually corroborates. This, not the raw
   * total, is what instrument agreement is asserted over: a file only one
   * leg can parse changes that leg's total without either leg being wrong
   * about the declarations it did read. */
  declCountCorroborated: Schema.Number,
  /** Each leg's declarations in files its twin could not parse. Reported
   * rather than dropped: it is the exact size of the residue no second
   * instrument has seen, and a consumer of `declCount` deserves to know it. */
  declCountUncorroboratedCk: Schema.Number,
  declCountUncorroboratedOxc: Schema.Number,
  unparsedCk: Schema.Number,
  unparsedOxc: Schema.Number,
  candidates: Schema.Number,
  lifted: Schema.Number,
  refused: Schema.Number,
  varianceDecls: Schema.Number,
  /** COUNTS are exact; the witness lists below are capped at
   * `WITNESS_CAP` so a slice that disagrees everywhere still produces a
   * readable summary. The gate adjudicates the counts and quotes the
   * witnesses — it never infers a count by measuring a list. */
  declDisagreementCount: Schema.Number,
  verdictDisagreementCount: Schema.Number,
  parseDisjointCount: Schema.Number,
  /** Files where the legs enumerated different declarations. */
  declDisagreements: Schema.Array(Schema.Struct({
    file: Schema.String,
    ck: Schema.String,
    oxc: Schema.String,
  })),
  /** Files where the legs reached different RECOGNITION verdicts. */
  verdictDisagreements: Schema.Array(Schema.Struct({
    file: Schema.String,
    ck: Schema.String,
    oxc: Schema.String,
  })),
  /** Files exactly one leg could parse — the TS-land analogue of the
   * proposal's ERROR-disjointness check (§9b.1 `census:gate`). */
  parseDisjoint: Schema.Array(Schema.Struct({
    file: Schema.String,
    ck: Schema.Boolean,
    oxc: Schema.Boolean,
  })),
});
export type Summary = typeof Summary.Type;

export const decodeSummary = Schema.decodeUnknownSync(Summary);

/** How many witnesses a summary keeps per finding class. Enough to read and
 * act on; not so many that a systematically-disagreeing slice writes a
 * hundred megabytes of evidence nobody opens. */
export const WITNESS_CAP = 200;

/** This instrument's declared identity. It rides in every summary for the
 * same reason the Stage-1 twin stamps `extractor.instrument`: a run whose
 * provenance is not in the artifact is a number without a witness. */
export const CENSUS_VERSION = "parser-census/v0";
