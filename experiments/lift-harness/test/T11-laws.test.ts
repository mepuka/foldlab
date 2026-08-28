/**
 * T11 — the laws tier (docs/analysis-algebra.md §2, the law of the lane).
 *
 * Every measure in the analysis algebra proves its algebra here:
 * associativity, identity, commutativity (claimed for the whole product,
 * which is what makes corpus merges order-free), lattice idempotence,
 * and split-vs-whole (foldMap over a concatenation equals the combine
 * of the parts). A rollup without its rows in this tier is not ready
 * to land.
 */
import { describe, expect, it } from "vitest";
import * as fc from "effect/testing/FastCheck";
import { canonJson } from "../src/contract";
import {
  type Contribution, ContributionM, type GenVerdict, genJoin,
  hitContribution, legacyContribution, offContribution, sortedSet,
} from "../src/rung/Algebra";

const port = fc.constantFrom("in" as const, "out" as const, "interior" as const);
const cls = fc.constantFrom("computation", "wiring", "data", "unseeded");
const name = fc.stringMatching(/^[a-z][a-zA-Z]{0,8}$/);
const construct = fc.tuple(name, name).map(([m, e]) => `effect/${m}.${e}`);

const contribution: fc.Arbitrary<Contribution> = fc.oneof(
  fc.tuple(construct, port, cls, fc.boolean()).map(([c, p, s, v4]) =>
    hitContribution({ construct: c, port: p, semanticClass: s }, v4 ? "v4-only" : "shared")),
  fc.tuple(construct, fc.option(construct)).map(([c, o]) => offContribution(c, o)),
  name.map((m) => legacyContribution(`@effect-ts/${m}`)),
);

const eq = (a: unknown, b: unknown): void => { expect(canonJson(a)).toBe(canonJson(b)); };

describe("T11 laws — the contribution product monoid", () => {
  it("associativity", () => {
    fc.assert(fc.property(contribution, contribution, contribution, (a, b, c) => {
      eq(ContributionM.combine(a, ContributionM.combine(b, c)),
         ContributionM.combine(ContributionM.combine(a, b), c));
    }));
  });

  it("identity, both sides", () => {
    fc.assert(fc.property(contribution, (a) => {
      eq(ContributionM.combine(ContributionM.initialValue, a), a);
      eq(ContributionM.combine(a, ContributionM.initialValue), a);
    }));
  });

  it("commutativity — corpus merges are order-free", () => {
    fc.assert(fc.property(contribution, contribution, (a, b) => {
      eq(ContributionM.combine(a, b), ContributionM.combine(b, a));
    }));
  });

  it("split-vs-whole: combineAll over a concatenation equals combine of parts", () => {
    fc.assert(fc.property(fc.array(contribution), fc.array(contribution), (xs, ys) => {
      eq(ContributionM.combineAll([...xs, ...ys]),
         ContributionM.combine(ContributionM.combineAll(xs), ContributionM.combineAll(ys)));
    }));
  });
});

describe("T11 laws — the generation lattice", () => {
  const verdicts: GenVerdict[] = ["indeterminate", "v4", "pre-v4", "mixed"];

  it("is idempotent, commutative, associative (exhaustively)", () => {
    for (const a of verdicts) {
      expect(genJoin.combine(a, a)).toBe(a);
      for (const b of verdicts) {
        expect(genJoin.combine(a, b)).toBe(genJoin.combine(b, a));
        for (const c of verdicts)
          expect(genJoin.combine(a, genJoin.combine(b, c)))
            .toBe(genJoin.combine(genJoin.combine(a, b), c));
      }
    }
  });

  it("has indeterminate as bottom and mixed as top", () => {
    for (const a of verdicts) {
      expect(genJoin.combine("indeterminate", a)).toBe(a);
      expect(genJoin.combine("mixed", a)).toBe("mixed");
    }
  });
});

describe("T11 laws — the sorted-set carrier invariant", () => {
  it("combine preserves sorted uniqueness", () => {
    const arr = fc.array(name).map((xs) => [...new Set(xs)].sort() as readonly string[]);
    fc.assert(fc.property(arr, arr, (a, b) => {
      const c = sortedSet.combine(a, b);
      eq(c, [...new Set(c)].sort());
    }));
  });
});
