/**
 * T3 — the metamorphic tier.
 *
 * Relations that must never change a verdict, applied mechanically across
 * the corpus. Metamorphic testing (Chen et al.) buys what an oracle cannot:
 * we need not know the right answer for a source, only that a
 * semantics-preserving rewrite of it has the SAME answer. Each relation is
 * `source → source` plus the invariance assertion on both engines.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { BASELINE, ENGINES, dropScratch, ledgerSource, listKey } from "./engines";
import { FIXTURES } from "./runtime";
import ledger from "./ledger.json" with { type: "json" };

afterAll(dropScratch);

export type Relation = { name: string; apply: (src: string) => string };

/** Insert a line comment before every statement line inside the generator
 * body. Comments are trivia; a recognizer that reads them is reading the
 * wrong stratum (this is the W3 lesson, generalized). */
const comments: Relation = {
  name: "comment insertion",
  apply: (s) => s.split("\n").map((l) =>
    /^\s{2}(const|return)\b/.test(l) ? `  // interleaved\n${l}` : l).join("\n"),
};

/** Double every leading indent. Whitespace is not syntax here. */
const reflow: Relation = {
  name: "whitespace reflow",
  apply: (s) => s.split("\n").map((l) => {
    const m = l.match(/^(\s+)/);
    return m ? m[1] + l : l;
  }).join("\n"),
};

/** Reorder the properties of the node literal. `canonJson` sorts keys, and
 * the recognizer reads properties by name, so source order must not show up
 * in a verdict. */
const reorder: Relation = {
  name: "object-property reordering",
  apply: (s) => s.replace(
    /\{ kind: (\{[^}]*\}), payload: (hex\([^)]*\)), refs: (\[[^\]]*\]) \}/g,
    "{ refs: $3, payload: $2, kind: $1 }"),
};

/** Drop the statement-terminating semicolons inside the body (ASI). */
const semis: Relation = {
  name: "semicolon presence",
  apply: (s) => s.split("\n").map((l) =>
    /^\s{2}(const|return)\b/.test(l) ? l.replace(/;\s*$/, "") : l).join("\n"),
};

/** CRLF line endings. This repo is worked from two hosts, so the lexers
 * have to agree about them — a defect this tier would otherwise miss. */
const crlf: Relation = {
  name: "CRLF line endings",
  apply: (s) => s.split("\n").join("\r\n"),
};

export const RELATIONS: Relation[] = [comments, reflow, reorder, semis, crlf];

/** The corpus this tier sweeps: the baseline, every ledger source, and the
 * by-construction fixtures when the lane is present on this host. */
function corpus(): { id: string; src: string }[] {
  const out = [{ id: "baseline", src: BASELINE }];
  // OPEN rows are excluded: the engines are known to disagree there and the
  // ruling is owed, so including them would make every relation red for a
  // reason that has nothing to do with the relation. T2 owns those rows.
  for (const row of ledger.rows)
    if (row.status !== "open") out.push({ id: row.id, src: ledgerSource(row) });
  for (const f of FIXTURES) out.push({ id: `fixture:${f.name}`, src: f.src });
  return out;
}

const CORPUS = corpus();

describe("T3 corpus", () => {
  it("is non-empty, so the relations below are not vacuous", () => {
    expect(CORPUS.length).toBeGreaterThan(ledger.rows.length);
  });
});

describe.each(RELATIONS)("T3 $name", (rel) => {
  it.each(ENGINES)("$name: verdicts are invariant across the whole corpus", (engine) => {
    const changed: string[] = [];
    for (const { id, src } of CORPUS) {
      const after = rel.apply(src);
      if (after === src) continue;                 // relation did not apply here
      if (listKey(engine.recognize(src)) !== listKey(engine.recognize(after))) changed.push(id);
    }
    expect(changed).toEqual([]);
  });

  it("the two engines stay in agreement on the transformed corpus", () => {
    const disagree: string[] = [];
    for (const { id, src } of CORPUS) {
      const after = rel.apply(src);
      const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(after)));
      if (ck !== oxc) disagree.push(id);
    }
    expect(disagree).toEqual([]);
  });
});
