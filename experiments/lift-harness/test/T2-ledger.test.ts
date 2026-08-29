/**
 * T2 — the divergence ledger tier.
 *
 * Every ledger row runs on BOTH engines. A `ruled` row asserts the ruled
 * outcome on each leg and byte-identical verdicts between them. An `open`
 * row asserts the recorded divergence still reproduces — so a quiet engine
 * edit cannot bury a witness before it has been grilled.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { ENGINES, dropScratch, ledgerSource, listKey } from "./engines";
import type { Verdict } from "../src/contract";
import ledger from "./ledger.json" with { type: "json" };

afterAll(dropScratch);

type Row = (typeof ledger.rows)[number];

const only = (vs: Verdict[], id: string): Verdict => {
  expect(vs.length, `${id}: expected exactly one verdict, got ${vs.length}`).toBe(1);
  return vs[0];
};

describe("T2 ledger integrity", () => {
  it("has unique ids and a known status on every row", () => {
    const ids = ledger.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ledger.rows) expect(["open", "ruled", "pinned"]).toContain(r.status);
  });

  it("cites a ruling on every row that claims to be ruled", () => {
    for (const r of ledger.rows)
      if (r.status !== "open") expect(r.ruling).toMatch(/^R\d+$/);
  });

  it("materializes a source for every row", () => {
    for (const r of ledger.rows) expect(ledgerSource(r as Row).length).toBeGreaterThan(0);
  });
});

describe.each(ledger.rows as Row[])("T2 $id ($ruling, $axis)", (row) => {
  const src = ledgerSource(row);

  if (row.status === "open") {
    // An open row asserts that the EVIDENCE still reproduces, so that no
    // quiet engine edit can bury it before the grill rules. What counts as
    // evidence differs by class, and the two are exact opposites:
    //
    //   witness       the engines DISAGREE — the disagreement is the fact
    //   contract gap  the engines AGREE on a verdict the contract should
    //                 refuse — the agreement is the fact, and the gate is
    //                 structurally blind to it
    if (row.class === "contract gap") {
      it("still reproduces the recorded gap: the engines agree, wrongly", () => {
        const [a, b] = ENGINES.map((e) => listKey(e.recognize(src)));
        expect(b, `${row.id} now diverges — the gap changed shape without a ruling`).toBe(a);
        const vs = ENGINES[0].recognize(src);
        expect(vs.length, `${row.id} produced no verdict — the gap was closed without a ruling`)
          .toBeGreaterThan(0);
        expect(vs[0].kind, `${row.id} no longer lifts — closed without a ruling`).toBe("lifted");
      });
      return;
    }
    it("still reproduces the recorded divergence", () => {
      const [a, b] = ENGINES.map((e) => listKey(e.recognize(src)));
      expect(a, `${row.id} no longer diverges — it was resolved without a ruling`).not.toBe(b);
    });
    return;
  }

  it("both engines agree byte-for-byte", () => {
    const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(src)));
    expect(oxc).toBe(ck);
  });

  const expected = row.expect as { kind: string; code?: string; detail?: string };

  if (expected.kind === "silent") {
    it.each(ENGINES)("$name is silent (non-candidate by rule)", (engine) => {
      expect(engine.recognize(src)).toEqual([]);
    });
    return;
  }

  if (expected.kind === "lifted") {
    it.each(ENGINES)("$name lifts", (engine) => {
      const v = only(engine.recognize(src), `${row.id}/${engine.name}`);
      expect(v.kind).toBe("lifted");
    });
    return;
  }

  if (expected.kind === "multi") {
    const e = row.expect as unknown as { count: number; kinds: string[] };
    it.each(ENGINES)("$name yields the declarations in source order", (engine) => {
      const vs = engine.recognize(src);
      expect(vs.length).toBe(e.count);
      // Order is the assertion (R10): a verdict list is a sequence, and the
      // engines must agree on which declaration produced which verdict.
      expect(vs.map((v) => v.kind)).toEqual(e.kinds);
      expect(vs.map((v) => v.name)).toEqual(["first", "second"]);
    });
    return;
  }

  it.each(ENGINES)("$name refuses with the ruled code and pinned detail", (engine) => {
    const v = only(engine.recognize(src), `${row.id}/${engine.name}`);
    expect(v.kind).toBe("refusal");
    if (v.kind !== "refusal") return;
    expect(v.code).toBe(expected.code);
    expect(v.detail).toBe(expected.detail);
  });
});

describe("T2 R8 — the hoover-side document mints no word", () => {
  // The direction law: words are minted by the execute leg (the Lean
  // reference handler) alone. A recognizer that emitted one would be
  // minting, so its absence is asserted on every lift the ledger produces.
  it.each(ENGINES)("$name emits no `word` field on any lift", (engine) => {
    let lifts = 0;
    for (const row of ledger.rows as Row[])
      for (const v of engine.recognize(ledgerSource(row)))
        if (v.kind === "lifted") {
          lifts++;
          expect(Object.keys(v)).not.toContain("word");
        }
    expect(lifts, "no lift observed — this assertion would be vacuous").toBeGreaterThan(0);
  });
});
