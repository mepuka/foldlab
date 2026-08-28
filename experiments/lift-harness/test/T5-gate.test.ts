/**
 * T5 — the agreement gate, plus its adequacy check.
 *
 * The gate is the harness's only trust mechanism, so the tier that guards
 * it must ask the harder question too: could this corpus catch an engine
 * that was WRONG? Declared mutants answer it. A corpus no mutant can trip
 * is too weak, and a green gate over it means nothing.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { readFileSync } from "node:fs";
import { LIFTS_EXPECTED, fixtureFiles, gateReport, hasFixtureLane } from "../src/gate";
import { ENGINES, dropScratch, ledgerSource, listKey } from "./engines";
import { canonJson, verdictKey, type Verdict } from "../src/contract";
import { liftSource } from "../src/lift";
import ledger from "./ledger.json" with { type: "json" };

afterAll(dropScratch);

const LANE = hasFixtureLane();

describe("T5 agreement gate", () => {
  it.runIf(LANE)("is green over the by-construction corpus", () => {
    const r = gateReport();
    expect(r.kind).toBe("ran");
    if (r.kind !== "ran") return;
    expect(r.disagreements).toEqual([]);
    expect(r.agree).toBe(r.files);
    expect(r.ckLifts).toBe(LIFTS_EXPECTED);
    expect(r.oxLifts).toBe(LIFTS_EXPECTED);
    expect(r.green).toBe(true);
  });

  it.skipIf(LANE)("reports a MISSING LANE rather than crashing or claiming green", () => {
    const r = gateReport();
    expect(r.kind).toBe("missing-lane");
    if (r.kind !== "missing-lane") return;
    expect(r.fixtures).toContain("fixture-gen");
    expect(r.hint).toContain("mise run gen");
  });

  it("never reports green without having run", () => {
    const r = gateReport();
    if (r.kind === "missing-lane") expect(Object.keys(r)).not.toContain("green");
  });
});

/* ------------------------------------------------------------------ */
/* adequacy: declared mutants of the ck engine                         */
/* ------------------------------------------------------------------ */

/** A mutant is a small, DECLARED defect injected into the ck engine's
 * output — the cheapest faithful stand-in for "an engine got this wrong".
 * Each must be caught by the ledger (T2) or the gate (T5); a mutant that
 * survives both names a hole in the corpus. */
type Mutant = { name: string; mutate: (vs: Verdict[]) => Verdict[] };

const MUTANTS: Mutant[] = [
  {
    name: "flip-refusal-code",
    mutate: (vs) => vs.map((v) => v.kind === "refusal" ? { ...v, code: "E-LOOP" as const } : v),
  },
  {
    name: "drop-detail-string",
    mutate: (vs) => vs.map((v) => v.kind === "refusal" ? { ...v, detail: "" } : v),
  },
  {
    name: "forgive-normalization",   // the R6 defect: accept-and-normalize
    mutate: (vs) => vs.map((v) =>
      v.kind === "refusal" && v.detail.includes("canonical decimal")
        ? { kind: "lifted", name: v.name, storeBinder: "store", instructions: [], helperUnpinned: true }
        : v),
  },
  {
    name: "swallow-verdict",
    mutate: (vs) => vs.slice(0, Math.max(0, vs.length - 1)),
  },
  {
    name: "reorder-verdicts",        // the defect R10's ordered equality exists to catch
    mutate: (vs) => [...vs].reverse(),
  },
  {
    name: "reintroduce-word",        // the R8 defect: hoover-side minting
    mutate: (vs) => vs.map((v) => v.kind === "lifted"
      ? ({ ...v, word: v.instructions.map((i) => i.index) } as unknown as Verdict) : v),
  },
];

/** The inputs adequacy is measured over: every ledger row, plus the
 * fixtures when the lane is present. */
function adequacyCorpus(): string[] {
  const out = ledger.rows.map((r) => ledgerSource(r));
  for (const f of fixtureFiles()) out.push(readFileSync(f, "utf8"));
  return out;
}

describe.each(MUTANTS)("T5 adequacy — mutant $name", (m) => {
  it("is caught: some input's verdicts change under the mutation", () => {
    const caught = adequacyCorpus().some((src) => {
      const real = liftSource(src);
      if (real.length === 0) return false;
      return canonJson(m.mutate(real).map(verdictKey)) !== canonJson(real.map(verdictKey));
    });
    expect(caught, `mutant ${m.name} survives — the corpus cannot see this defect`).toBe(true);
  });
});

describe("T5 adequacy hygiene", () => {
  it("the corpus is large enough for the claim to mean something", () => {
    const n = adequacyCorpus().length;
    expect(n).toBeGreaterThanOrEqual(ledger.rows.length);
    if (LANE) expect(n).toBeGreaterThan(200);
  });

  it("the two engines agree on every RULED adequacy input", () => {
    // Ledger rows only; the fixtures are the gate's own job. Open rows are
    // excluded by construction — a row is open precisely because the
    // engines disagree and the ruling is owed. T2 asserts those still
    // diverge, so excluding them here hides nothing.
    for (const row of ledger.rows) {
      if (row.status === "open") continue;
      const src = ledgerSource(row);
      const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(src)));
      expect(oxc, `engines disagree on ledger row ${row.id}`).toBe(ck);
    }
  });

  it("names the open rows, so an excluded divergence stays visible", () => {
    const open = ledger.rows.filter((r) => r.status === "open").map((r) => r.id);
    // Not an assertion about how many there should be — a record of which
    // rows the agreement checks above are NOT covering.
    console.log("T5 open ledger rows (ruling owed):", open.join(", ") || "(none)");
    expect(Array.isArray(open)).toBe(true);
  });
});
