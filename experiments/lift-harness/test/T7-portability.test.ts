/**
 * T7 — the portability tier.
 *
 * The harness is worked from two hosts (Windows primary, macOS annex), so
 * "it runs here" is not a property of the code until both hosts agree. Each
 * assertion below corresponds to a defect actually observed on the Windows
 * host while landing this suite — recorded as a test so it cannot come back.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURES, fixtureFiles, gateReport, hasFixtureLane, pathKey } from "../src/gate";
import { BASELINE, ENGINES, dropScratch, listKey } from "./engines";

afterAll(dropScratch);

describe("T7 path resolution", () => {
  // OBSERVED: `new URL(".", import.meta.url).pathname` yields "/C:/Users/…"
  // on Windows, and every node:fs call rejects it. `fileURLToPath` is the
  // portable spelling.
  it("resolves module-relative paths to a usable absolute path", () => {
    const here = fileURLToPath(new URL(".", import.meta.url));
    expect(isAbsolute(here)).toBe(true);
    expect(here.startsWith("/C:")).toBe(false);
    expect(existsSync(here)).toBe(true);
  });

  it("the fixture path the gate uses is absolute and well-formed", () => {
    expect(isAbsolute(FIXTURES)).toBe(true);
    expect(FIXTURES.startsWith("/C:")).toBe(false);
  });
});

describe("T7 path keys", () => {
  // OBSERVED: oxlint reports "C:/Users/…" while node:path `join` produces
  // "C:\Users\…". Every gate lookup missed, and the gate read the silence
  // as 9 disagreements rather than as its own defect.
  it("normalizes separators so the two spellings compare equal", () => {
    expect(pathKey("C:\\a\\b\\c.ts")).toBe("C:/a/b/c.ts");
    expect(pathKey("C:/a/b/c.ts")).toBe("C:/a/b/c.ts");
    expect(pathKey("/home/u/a.ts")).toBe("/home/u/a.ts");
  });

  it("is idempotent", () => {
    expect(pathKey(pathKey("C:\\a\\b"))).toBe(pathKey("C:\\a\\b"));
  });
});

describe("T7 process invocation", () => {
  // OBSERVED: passing all 265 fixture paths in one argv exceeded the
  // Windows spawn limit (ENAMETOOLONG from uv_spawn). The gate chunks.
  it.runIf(hasFixtureLane())("survives the whole fixture corpus in one gate run", () => {
    const r = gateReport();
    expect(r.kind).toBe("ran");
    if (r.kind !== "ran") return;
    expect(r.files).toBe(fixtureFiles().length);
    // every file accounted for: chunking must not silently drop a batch
    expect(r.agree + r.disagreements.length).toBe(r.files);
  });

  it("the oxc leg returns verdicts for a freshly written file", () => {
    expect(ENGINES[1].recognize(BASELINE).length).toBe(1);
  });
});

describe("T7 missing fixture lane", () => {
  // `.staging/` is gitignored, so a fresh clone has the harness without the
  // corpus. That state must be REPORTED, never crash and never be confused
  // with a green or a red run.
  it("is a typed report, not an exception", () => {
    expect(() => gateReport()).not.toThrow();
    const r = gateReport();
    expect(["ran", "missing-lane"]).toContain(r.kind);
  });

  it("fixtureFiles() is empty rather than throwing when the lane is absent", () => {
    expect(() => fixtureFiles()).not.toThrow();
    if (!hasFixtureLane()) expect(fixtureFiles()).toEqual([]);
  });
});

describe("T7 line endings", () => {
  // The two hosts check out different line endings; the lexers must agree.
  it("both engines are indifferent to CRLF", () => {
    const lf = BASELINE;
    const crlf = BASELINE.split("\n").join("\r\n");
    for (const e of ENGINES) expect(listKey(e.recognize(crlf)), e.name).toBe(listKey(e.recognize(lf)));
  });
});
