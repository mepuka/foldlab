/**
 * The analysis algebra — measures with laws (docs/analysis-algebra.md).
 *
 * Every rollup of the rung pipeline is a REDUCER (the pin's own name
 * for combiner-with-identity — `effect/Reducer`, `effect/Combiner`)
 * and the whole reading is one `combineAll` into their product
 * (`Struct.makeReducer`). The algebra is the pin's; the MEASURES and
 * their laws are ours: every reducer here has its rows in the T11 laws
 * tier (associativity, identity, commutativity where claimed, lattice
 * idempotence, split-vs-whole). The law of the lane stands: a rollup
 * that cannot state its reducer is not ready to land.
 */
import * as Reducer from "effect/Reducer";
import * as Struct from "effect/Struct";

/** Commutative. */
export const sum: Reducer.Reducer<number> = Reducer.make((l, r) => l + r, 0);

/** Sorted unique string arrays under union — commutative, idempotent.
 * Sortedness is an invariant of the carrier, so combine is a linear
 * merge and equality is byte equality under canonical JSON. */
export const sortedSet: Reducer.Reducer<readonly string[]> = Reducer.make<readonly string[]>(
  (l, r) => {
    const out: string[] = [];
    let i = 0, j = 0;
    while (i < l.length || j < r.length) {
      if (j >= r.length || (i < l.length && l[i] < r[j])) out.push(l[i++]);
      else if (i >= l.length || r[j] < l[i]) out.push(r[j++]);
      else { out.push(l[i++]); j++; }
    }
    return out;
  },
  [],
);

export const sortedSetOf = (xs: Iterable<string>): readonly string[] =>
  [...new Set(xs)].sort();

/** The generation verdict lattice: indeterminate ⊑ v4, indeterminate ⊑
 * pre-v4, both ⊑ mixed. Join is commutative, associative, idempotent —
 * a verdict can never depend on evidence order, BY SHAPE. */
export type GenVerdict = "indeterminate" | "v4" | "pre-v4" | "mixed";
export const genJoin: Reducer.Reducer<GenVerdict> = Reducer.make<GenVerdict>(
  (l, r) =>
    l === r ? l
    : l === "indeterminate" ? r
    : r === "indeterminate" ? l
    : "mixed",
  "indeterminate",
);

/* ---------------------------------------------------------------------- */
/* The lane's concrete measure: one contribution record per piece of      */
/* evidence, one product reducer, one combineAll in the Reader.           */
/* ---------------------------------------------------------------------- */

export type Contribution = {
  readonly constructHits: number;
  readonly portsIn: number;
  readonly portsOut: number;
  readonly wiringHits: number;
  readonly v4Only: readonly string[];
  readonly preV4: readonly string[];
  readonly legacyModules: readonly string[];
  readonly offUniverse: readonly string[];
  readonly generation: GenVerdict;
};

export const ContributionM: Reducer.Reducer<Contribution> = Struct.makeReducer({
  constructHits: sum,
  portsIn: sum,
  portsOut: sum,
  wiringHits: sum,
  v4Only: sortedSet,
  preV4: sortedSet,
  legacyModules: sortedSet,
  offUniverse: sortedSet,
  generation: genJoin,
});

/** Evidence: an in-universe construct hit. */
export const hitContribution = (
  h: { construct: string; port: "in" | "out" | "interior"; semanticClass: string },
  generation: "v4-only" | "shared",
): Contribution => ({
  ...ContributionM.initialValue,
  constructHits: 1,
  portsIn: h.port === "in" ? 1 : 0,
  portsOut: h.port === "out" ? 1 : 0,
  wiringHits: h.semanticClass === "wiring" ? 1 : 0,
  v4Only: generation === "v4-only" ? [h.construct] : [],
  generation: generation === "v4-only" ? "v4" : "indeterminate",
});

/** Evidence: a chain the current universe refuses (pre-v4 when the
 * older universe explains it). */
export const offContribution = (chain: string, preV4: string | null): Contribution => ({
  ...ContributionM.initialValue,
  offUniverse: [chain],
  preV4: preV4 === null ? [] : [preV4],
  generation: preV4 === null ? "indeterminate" : "pre-v4",
});

/** Evidence: a legacy import specifier — a generation canary at the
 * import line itself. */
export const legacyContribution = (module: string): Contribution => ({
  ...ContributionM.initialValue,
  legacyModules: [module],
  generation: "pre-v4",
});
