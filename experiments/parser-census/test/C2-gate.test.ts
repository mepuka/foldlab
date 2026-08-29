/**
 * C2 — the gate's adjudication, and the absent-corpus rule.
 *
 * `adjudicate` is a pure function from a summary to findings, which is
 * exactly why it is worth testing directly: the gate's answer is an exit
 * status, and an exit status is the one thing a caller cannot inspect after
 * the fact. Every finding class gets a case, and so does the green summary —
 * a gate that could not go green would be as useless as one that could not
 * go red.
 *
 * The absent-corpus rule is tested through `CensusPaths`, by pointing the
 * instrument at a directory that is not there. That is the seam the service
 * exists for.
 *
 * Needs no corpus.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Effect, FileSystem, Layer, Path } from "effect";
import { CensusPaths } from "../src/CensusPaths";
import { WITNESS_CAP, type Summary } from "../src/census-contract";
import { corpusPresent, select } from "../src/corpus";
import { adjudicate, gateReport } from "../src/gate";
import { INSTRUMENT, PROVISIONAL, STAMP, pinDrift } from "../src/pins";

const GREEN: Summary = {
  project: "p", slice: "wild-effect", localPath: "corpus/p",
  pin: "0".repeat(40), pinObserved: "0".repeat(40),
  instrument: INSTRUMENT,
  files: 3, filesAgreed: 3,
  declCountCk: 12, declCountOxc: 12,
  declCountCorroborated: 12,
  declCountUncorroboratedCk: 0, declCountUncorroboratedOxc: 0,
  unparsedCk: 0, unparsedOxc: 0,
  candidates: 2, lifted: 1, refused: 1, varianceDecls: 0,
  declDisagreementCount: 0, verdictDisagreementCount: 0, parseDisjointCount: 0,
  declDisagreements: [], verdictDisagreements: [], parseDisjoint: [],
};

const codes = (s: Summary) => adjudicate(s).map((f) => f.code).sort();

describe("C2 — adjudication", () => {
  it("a clean summary yields no findings", () => {
    expect(adjudicate(GREEN)).toEqual([]);
  });

  it("differing declaration enumerations are E-INSTRUMENT-DISAGREE", () => {
    expect(codes({
      ...GREEN, filesAgreed: 2, declDisagreementCount: 1,
      declDisagreements: [{ file: "a.ts", ck: "[]", oxc: '["variable|a|-|-|-"]' }],
    })).toEqual(["E-INSTRUMENT-DISAGREE"]);
  });

  it("a corroborated total that does not reconcile is E-INSTRUMENT-DISAGREE", () => {
    // The capture's own arithmetic is checked, not just the legs': if the
    // corroborated figure and the two raw totals cannot be reconciled, the
    // instrument has miscounted and nothing downstream should trust it.
    expect(codes({ ...GREEN, declCountCorroborated: 11 })).toEqual(["E-INSTRUMENT-DISAGREE"]);
  });

  it("a file only one leg parsed lowers that leg's total WITHOUT an agreement finding", () => {
    // The real-corpus case: neither leg is wrong about what it read, so the
    // finding is E-PARSE-DISJOINT alone and the count keeps its meaning.
    expect(codes({
      ...GREEN,
      declCountCk: 12, declCountOxc: 9,
      declCountCorroborated: 9,
      declCountUncorroboratedCk: 3, declCountUncorroboratedOxc: 0,
      unparsedOxc: 1, parseDisjointCount: 1,
      parseDisjoint: [{ file: "a.ts", ck: true, oxc: false }],
    })).toEqual(["E-PARSE-DISJOINT"]);
  });

  it("differing verdicts are E-INSTRUMENT-DISAGREE — refusals included", () => {
    // Identical refusal matters as much as identical match: a leg that
    // refuses where its twin lifts is a defect in one of them.
    expect(codes({
      ...GREEN, verdictDisagreementCount: 1,
      verdictDisagreements: [{ file: "a.ts", ck: '["lifted"]', oxc: '["E-BRANCH"]' }],
    })).toEqual(["E-INSTRUMENT-DISAGREE"]);
  });

  it("a file only one leg could parse is E-PARSE-DISJOINT", () => {
    expect(codes({
      ...GREEN, parseDisjointCount: 1, unparsedOxc: 1,
      parseDisjoint: [{ file: "a.ts", ck: true, oxc: false }],
    })).toEqual(["E-PARSE-DISJOINT"]);
  });

  it("a summary recorded under other pins is E-PIN-DRIFT", () => {
    expect(codes({
      ...GREEN, instrument: { ...INSTRUMENT, ck: "typescript@5.8.0" },
    })).toEqual(["E-PIN-DRIFT"]);
  });

  it("a grammar revision other than the stamped one is E-PIN-DRIFT", () => {
    // The stamp is inside gate equality, so a count taken under a different
    // grammar pin cannot be quietly folded in with counts taken under this
    // one — which is the entire reason the stamp exists.
    expect(codes({
      ...GREEN, instrument: { ...INSTRUMENT, grammar: "tree-sitter-typescript@465aa162" },
    })).toEqual(["E-PIN-DRIFT"]);
  });

  it("a checkout at the wrong revision, or none, is E-CORPUS-PIN", () => {
    expect(codes({ ...GREEN, pinObserved: "1".repeat(40) })).toEqual(["E-CORPUS-PIN"]);
    expect(codes({ ...GREEN, pinObserved: null })).toEqual(["E-CORPUS-PIN"]);
  });

  it("findings accumulate rather than shadowing each other", () => {
    expect(codes({
      ...GREEN, declCountOxc: 11, parseDisjointCount: 2, pinObserved: null,
    })).toEqual(["E-CORPUS-PIN", "E-INSTRUMENT-DISAGREE", "E-PARSE-DISJOINT"]);
  });
});

describe("C2 — the stamp", () => {
  it("names the grammar revision and says the run is provisional", () => {
    expect(INSTRUMENT.grammar).toMatch(/^tree-sitter-typescript@[0-9a-f]{40}$/);
    expect(INSTRUMENT.provisional).toBe(PROVISIONAL);
    expect(STAMP).toContain("grammar@");
    expect(STAMP).toContain("PROVISIONAL");
  });

  it("the installed parsers are the exact admitted versions", () => {
    expect(pinDrift()).toEqual([]);
    expect(INSTRUMENT.ck).toBe("typescript@5.9.2");
    expect(INSTRUMENT.oxc).toBe("oxc-parser@0.147.0");
  });
});

/* ------------------------------------------------------------------ */

/* The world these tests run in.
 *
 * NOT the Bun platform layer — this suite runs under vitest on node, and
 * more to the point the instrument's whole design is that nothing under
 * `src/` decides what a filesystem is. So the tests decide: `Path.layer` is
 * platform-independent, and the filesystem is a `layerNoop` carrying exactly
 * the two operations these cases exercise. That is the seam `CensusPaths`
 * and the requirement channel exist for, used as intended. */

const NOWHERE = "/definitely/not/a/checkout";

const nowherePaths = Layer.succeed(CensusPaths)(CensusPaths.of({
  repoRoot: NOWHERE,
  corpus: `${NOWHERE}/corpus`,
  corpusManifest: `${NOWHERE}/corpus-manifest.json`,
  projectLabels: `${NOWHERE}/project-labels.json`,
  out: `${NOWHERE}/out`,
}));

/** A host where nothing exists. */
const emptyFs = FileSystem.layerNoop({
  exists: () => Effect.succeed(false),
});

const inNowhere = <A, E>(e: Effect.Effect<A, E, any>): Promise<A> =>
  Effect.runPromise(
    e.pipe(Effect.provide(Layer.mergeAll(emptyFs, Path.layer, nowherePaths))) as Effect.Effect<A, E, never>);

describe("C2 — the absent-corpus rule", () => {
  it("reports absence rather than failing", async () => {
    expect(await inNowhere(corpusPresent)).toBe(false);
  });

  it("a gate with nothing to adjudicate is NOT RUN — neither green nor red", async () => {
    const r = await inNowhere(gateReport);
    expect(r.kind).toBe("not-run");
    // The distinction the harness's own gate insists on: "I could not check"
    // must not be mistaken for either answer.
    expect(r).not.toHaveProperty("green");
  });
});

describe("C2 — the CLOSED label vocabulary", () => {
  // The two committed artifacts, and nothing else: `select` reads exactly
  // these, so the world it needs is exactly this.
  const HERE = new URL("..", import.meta.url).pathname;
  const realPaths = Layer.succeed(CensusPaths)(CensusPaths.of({
    repoRoot: `${HERE}../..`,
    corpus: `${HERE}../../corpus`,
    corpusManifest: `${HERE}corpus-manifest.json`,
    projectLabels: `${HERE}project-labels.json`,
    out: `${HERE}out`,
  }));
  const readingFs = FileSystem.layerNoop({
    readFileString: (p: string) => Effect.succeed(readFileSync(p, "utf8")),
  });
  const world = Layer.mergeAll(readingFs, Path.layer, realPaths);
  const run = <A, E>(e: Effect.Effect<A, E, any>): Promise<A> =>
    Effect.runPromise(e.pipe(Effect.provide(world)) as Effect.Effect<A, E, never>);

  it("refuses a slice outside project-labels.json", async () => {
    expect(await run(select("all", "not-a-real-label").pipe(
      Effect.map(() => "accepted"),
      Effect.catchTag("BadSelection", (e) => Effect.succeed(e.reason)),
    ))).toContain("CLOSED label vocabulary");
  });

  it("refuses a project the manifest does not name", async () => {
    expect(await run(select("no-such-project", "all").pipe(
      Effect.map(() => "accepted"),
      Effect.catchTag("BadSelection", (e) => Effect.succeed(e.reason)),
    ))).toContain("no project");
  });

  it("accepts a slice the vocabulary declares", async () => {
    expect(await run(select("all", "wild-effect").pipe(
      Effect.map((ps) => ps.length),
      Effect.catchTag("BadSelection", () => Effect.succeed(0)),
    ))).toBeGreaterThan(0);
  });
});

describe("C2 — witness capping", () => {
  it("keeps counts exact while capping the witness lists", () => {
    // The gate must never infer a count by measuring a list: a slice that
    // disagrees ten thousand times reports ten thousand, and quotes 200.
    const s: Summary = {
      ...GREEN, declDisagreementCount: 10_000,
      declDisagreements: Array.from({ length: WITNESS_CAP }, (_, i) => ({
        file: `f${i}.ts`, ck: "[]", oxc: "[]",
      })),
    };
    expect(adjudicate(s)[0].detail).toContain("10000 file(s)");
  });
});
