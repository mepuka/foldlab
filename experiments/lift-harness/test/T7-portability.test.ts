/**
 * T7 — the portability tier.
 *
 * The harness is worked from two hosts (Windows primary, macOS annex), so
 * "it runs here" is not a property of the code until both hosts agree. Each
 * assertion below corresponds to a defect actually observed on the Windows
 * host while landing this suite — recorded as a test so it cannot come back.
 *
 * Several of those defects are now structurally impossible rather than
 * merely fixed: path resolution moved behind the `Path` service and the
 * fixture location behind `HarnessPaths`, so no module computes its own
 * depth in the tree. The assertions stay, because "impossible by
 * construction" is a claim about the construction, and constructions change.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";
import { gateReport, pathKey } from "../src/gate";
import { FIXTURES, LANE, PATHS, run } from "./runtime";
import { BASELINE, ENGINES, dropScratch, listKey } from "./engines";

afterAll(dropScratch);

/** Absolute, and not the "/C:/Users/…" shape that `URL.pathname` produces
 * on Windows and every filesystem call rejects. */
const usable = (p: string): boolean =>
  p.length > 0 && !p.startsWith("/C:") && (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p));

describe("T7 path resolution", () => {
  // OBSERVED: `new URL(".", import.meta.url).pathname` yields "/C:/Users/…"
  // on Windows. The fix was `Path.fromFileUrl`, which is now reached through
  // the service rather than imported from `node:url`.
  it("every path the layout service reports is usable on this host", () => {
    for (const [name, p] of Object.entries(PATHS))
      expect(usable(p), `${name} = ${p}`).toBe(true);
  });

  it("the paths the service reports actually exist", async () => {
    const missing = await run(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const out: string[] = [];
      for (const name of ["oxlintConfig", "records", "models", "repoRoot"] as const)
        if (!(yield* fs.exists(PATHS[name]))) out.push(`${name} = ${PATHS[name]}`);
      return out;
    }).pipe(Effect.orDie));
    expect(missing).toEqual([]);
  });
});

describe("T7 path keys", () => {
  // OBSERVED: oxlint reports "C:/Users/…" while `Path.join` produces
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
  it.runIf(LANE)("survives the whole fixture corpus in one gate run", async () => {
    const r = await run(gateReport);
    expect(r.kind).toBe("ran");
    if (r.kind !== "ran") return;
    expect(r.files).toBe(FIXTURES.length);
    // every file accounted for: chunking must not silently drop a batch
    expect(r.agree + r.disagreements.length).toBe(r.files);
  });

  it("the oxc leg returns verdicts for an unsaved source", () => {
    expect(ENGINES[1].recognize(BASELINE).length).toBe(1);
  });
});

describe("T7 missing fixture lane", () => {
  // `.staging/` is gitignored, so a fresh clone has the harness without the
  // corpus. That state must be REPORTED, never crash, and never be confused
  // with a green or a red run.
  it("is a typed report, not a failure", async () => {
    const r = await run(gateReport);
    expect(["ran", "missing-lane"]).toContain(r.kind);
  });

  it("carries no `green` field when it did not run", async () => {
    const r = await run(gateReport);
    if (r.kind === "missing-lane") expect(Object.keys(r)).not.toContain("green");
  });

  it.skipIf(LANE)("reports the lane it looked for", async () => {
    const r = await run(gateReport);
    if (r.kind !== "missing-lane") return;
    expect(r.fixtures).toBe(PATHS.fixtures);
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

describe("T7 no ambient platform", () => {
  // The refactor's actual claim: `src/` names its requirements and satisfies
  // none of them. If a module reached for a global instead, it would work
  // here and fail in the other host's runtime — the exact failure mode that
  // motivated the change, and one no other assertion in this suite catches.
  it("the suite's world is node, and the engines still agree", () => {
    expect(typeof (globalThis as Record<string, unknown>)["Bun"]).toBe("undefined");
    const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(BASELINE)));
    expect(oxc).toBe(ck);
  });
});
