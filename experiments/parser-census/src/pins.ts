/**
 * The instrument's pins — declared, and as actually installed.
 *
 * Both admitted parsers are exact-version admissions whose "version drift is
 * a re-admission event" (`docs/lab-core/TOOLS.md`, the `typescript@5.9.2` and
 * `oxc-parser@0.147.0` rows). A census that measured a corpus with a
 * different build than the one admitted would be evidence for nothing, and
 * the failure mode is silent — a lockfile drifts, the numbers move, and the
 * artifact still looks like a census.
 *
 * So the pins are read from THREE independent places and `census:gate`
 * compares them: what this package DECLARES, what is INSTALLED, and what the
 * capture RECORDED in its summaries. Agreement is checked, never assumed.
 */
import ownPkg from "../package.json" with { type: "json" };
import tsPkg from "typescript/package.json" with { type: "json" };
import oxcPkg from "oxc-parser/package.json" with { type: "json" };
// R11 — the recognition manifest is the shared AUTHORITY; the census reads
// the same bytes its two legs do, so its evidence names the rule set it was
// produced under.
import liftManifest from "../../../library/effects/src/cas/generated/lift/manifest.json" with { type: "json" };
// The grammar stamp's AUTHORITY. Read from the admission receipt rather than
// transcribed, so a pin bump moves the stamp and cannot leave a stale
// revision sitting in an artifact that claims to name it.
import standup from "../../../.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json" with { type: "json" };
import { CENSUS_VERSION } from "./census-contract";

/** What this package declares. Exact strings — a range here would already
 * be the drift the admission forbids. */
export const DECLARED = {
  typescript: ownPkg.dependencies.typescript,
  oxcParser: ownPkg.devDependencies["oxc-parser"],
} as const;

/** What is actually installed under `node_modules`. */
export const INSTALLED = {
  typescript: tsPkg.version as string,
  oxcParser: oxcPkg.version as string,
} as const;

/** The pins a run records. Deliberately the INSTALLED versions: the summary
 * must name the build that produced the numbers, not the build that was
 * asked for. The gate is what insists the two are the same. */
export const PINS = {
  typescript: INSTALLED.typescript,
  oxcParser: INSTALLED.oxcParser,
  /** R11 — the recognition manifest the harness's two legs share. The
   * census reads the same bytes so its evidence names the rule set it was
   * produced under. */
  liftManifestVersion: liftManifest.manifestVersion as number,
} as const;

/* ------------------------------------------------------------------ */
/* The grammar stamp                                                    */
/* ------------------------------------------------------------------ */

/**
 * THE GRAMMAR STAMP, and why a census run by two non-tree-sitter parsers
 * carries one anyway.
 *
 * Operator requirement (2026-08-29, coordinator): every `declCount` this
 * instrument writes must be stamped with the grammar revision it was counted
 * under, and a run on the current pin is PROVISIONAL — a pin bump is a
 * re-run event. The stamp is part of the output SCHEMA, not a comment, and
 * an unstamped count is refused (`census-contract.ts`'s `Summary`, and
 * `manifest.ts`, write the two together or not at all).
 *
 * What must be said honestly alongside it: census v0's two legs are
 * `typescript@5.9.2` and `oxc-parser@0.147.0`. NEITHER IS TREE-SITTER, and
 * both parse `in`/`out` type-parameter variance correctly — the census in
 * fact MEASURES variance as a per-declaration fact, which is the whole point
 * of the `variance-annotations` stratum. So D1 does not depress the counts
 * this run produces, and this file must not be read as saying it does.
 *
 * The stamp is still required and still load-bearing, for two reasons. The
 * proposal's L2 tier is `T ∧ Cs` — the Lean tree-sitter walker AND the
 * compiler API — and census v0 runs neither T nor a tree-sitter leg at all;
 * when that leg joins, its counts will be taken under a grammar revision,
 * and a count with no revision on it cannot be compared with one that has
 * it. And a pin bump (the vendored PR head under consideration for D1) is
 * exactly the event on which the comparison must be redone. A count whose
 * provenance is not in the artifact is a number without a witness.
 */
const repo = (id: string): string => {
  const r = standup.repositories.find((x) => x.id === id);
  // A missing repository in the admission receipt is a build defect, not a
  // runtime condition: the stamp is not optional, so it dies here rather
  // than emitting a count with an empty revision on it.
  if (!r) throw new Error(`admission receipt names no repository "${id}"`);
  return r.commit;
};

export const GRAMMAR = {
  leanTreeSitter: repo("lean4-tree-sitter"),
  treeSitterCore: repo("tree-sitter-core"),
  treeSitterTypescript: repo("tree-sitter-typescript"),
  receipt: standup.id as string,
} as const;

/** Every run on the current grammar pin is provisional. Flipping this to
 * `false` is a RULING, not an edit: it means the D1 defect no longer bears
 * on the comparison the stamp exists to make possible. */
export const PROVISIONAL = true;

export const PROVISIONAL_REASON =
  "counted under tree-sitter-typescript@" + GRAMMAR.treeSitterTypescript.slice(0, 8) +
  ", the grammar revision whose held D1 defect is `in`/`out` type-parameter " +
  "variance. Census v0's two legs are typescript and oxc-parser, which parse " +
  "variance correctly, so these counts are NOT depressed by D1 — the stamp " +
  "exists so a later tree-sitter (T register) count is comparable, and so a " +
  "grammar pin bump is a legible re-run trigger. Re-run owed on pin bump.";

/** The one-line stamp that rides beside every count. Compact on purpose:
 * it goes on 34 manifest entries, and the expansion sits once at the top. */
export const STAMP =
  `parser-census/v0 ts@${INSTALLED.typescript} oxc@${INSTALLED.oxcParser} ` +
  `grammar@${GRAMMAR.treeSitterTypescript.slice(0, 8)}` +
  (PROVISIONAL ? " PROVISIONAL" : "");

/** The instrument block every artifact carries, built in ONE place so the
 * capture that writes it and the gate that checks it cannot drift. */
export const INSTRUMENT = {
  census: CENSUS_VERSION,
  ck: `typescript@${PINS.typescript}`,
  oxc: `oxc-parser@${PINS.oxcParser}`,
  manifestVersion: PINS.liftManifestVersion,
  grammar: `tree-sitter-typescript@${GRAMMAR.treeSitterTypescript}`,
  grammarReceipt: GRAMMAR.receipt,
  provisional: PROVISIONAL,
} as const;

export interface PinFinding {
  readonly what: string;
  readonly declared: string;
  readonly installed: string;
}

/** Declared-vs-installed drift, as data. Empty is green. */
export function pinDrift(): PinFinding[] {
  const out: PinFinding[] = [];
  if (DECLARED.typescript !== INSTALLED.typescript)
    out.push({ what: "typescript", declared: DECLARED.typescript, installed: INSTALLED.typescript });
  if (DECLARED.oxcParser !== INSTALLED.oxcParser)
    out.push({ what: "oxc-parser", declared: DECLARED.oxcParser, installed: INSTALLED.oxcParser });
  return out;
}
