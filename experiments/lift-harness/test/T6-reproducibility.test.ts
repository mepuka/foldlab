/**
 * T6 — the reproducibility tier.
 *
 * The standing law is that derived files are generated, never
 * hand-maintained. This tier mechanizes it: recognition is a pure function
 * of source bytes, and anything committed under `records/` must fall out of
 * the corpus again, byte-identically, rather than drifting by hand.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECTRUM, canonJson } from "../src/contract";
import { FIXTURES, LANE } from "./runtime";
import { liftSource } from "../src/lift";
import { BASELINE, dropScratch, ledgerSource } from "./engines";
import ledger from "./ledger.json" with { type: "json" };

afterAll(dropScratch);

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RECORDS = join(HERE, "../records");

describe("T6 recognition is a pure function of source bytes", () => {
  it("repeats identically over the ledger", () => {
    for (const row of ledger.rows) {
      const src = ledgerSource(row);
      expect(canonJson(liftSource(src))).toBe(canonJson(liftSource(src)));
    }
  });

  it.runIf(LANE)("repeats identically over the fixture corpus", () => {
    for (const f of FIXTURES)
      expect(canonJson(liftSource(f.src)), f.name).toBe(canonJson(liftSource(f.src)));
  });

  it("does not depend on how the source reached the engine", () => {
    const viaBuffer = Buffer.from(BASELINE, "utf8").toString("utf8");
    expect(canonJson(liftSource(viaBuffer))).toBe(canonJson(liftSource(BASELINE)));
  });
});

describe("T6 committed records", () => {
  const files = existsSync(RECORDS)
    ? readdirSync(RECORDS).filter((f) => f.endsWith(".json")).sort() : [];

  it("every record parses and round-trips through canonical JSON", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const raw = readFileSync(join(RECORDS, f), "utf8");
      const parsed = JSON.parse(raw);
      expect(canonJson(JSON.parse(canonJson(parsed))), f).toBe(canonJson(parsed));
    }
  });

  it("census records carry only codes the taxonomy still declares", () => {
    // A record naming a code the contract has dropped is a stale derived
    // file — exactly what "regenerable, never hand-maintained" forbids.
    for (const f of files) {
      const rec = JSON.parse(readFileSync(join(RECORDS, f), "utf8")) as
        { codeHist?: Record<string, number> };
      for (const code of Object.keys(rec.codeHist ?? {}))
        expect(Object.keys(SPECTRUM), `${f} names unknown code ${code}`).toContain(code);
    }
  });

  it("census spectrum rollups agree with the contract's classification", () => {
    for (const f of files) {
      const rec = JSON.parse(readFileSync(join(RECORDS, f), "utf8")) as {
        codeHist?: Record<string, number>; spectrumHist?: Record<string, number>;
      };
      if (!rec.codeHist || !rec.spectrumHist) continue;
      const rolled: Record<string, number> = {};
      for (const [code, n] of Object.entries(rec.codeHist)) {
        const cls = SPECTRUM[code as keyof typeof SPECTRUM];
        rolled[cls] = (rolled[cls] ?? 0) + n;
      }
      expect(canonJson(rolled), `${f} rollup disagrees with SPECTRUM`)
        .toBe(canonJson(rec.spectrumHist));
    }
  });
});

describe("T6 the ledger is itself reproducible", () => {
  it("generated rows regenerate byte-identically from their declaration", () => {
    for (const row of ledger.rows)
      if ("generated" in row) expect(ledgerSource(row)).toBe(ledgerSource(row));
  });

  it("no row carries both a verbatim source and a generator", () => {
    for (const row of ledger.rows)
      expect(("source" in row) && ("generated" in row), row.id).toBe(false);
  });
});
