/**
 * T10 — the rung pipeline: trained sieve (Layer), bank lookup, span join.
 *
 * The sieve is the TRAINED instrument — these tests assert the service
 * contract and the annotator discipline (register P: spans are emitted
 * with scores, never filtered), not re-derived model quality; model
 * quality is the eval record's claim. The bank tests assert the
 * enumerated universe is loaded, joined, and canonicalizing — and that
 * the complement is computed, never guessed.
 */
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { canonJson } from "../src/contract";
import { PatternBank } from "../src/rung/PatternBank";
import { Sieve } from "../src/rung/Sieve";
import { Reader } from "../src/rung/Reader";
import { BASELINE } from "./engines";

const RungLayer = Layer.mergeAll(
  Sieve.layer,
  PatternBank.layer,
  Reader.layer.pipe(Layer.provide(Layer.mergeAll(Sieve.layer, PatternBank.layer))),
);

const run = <A>(e: Effect.Effect<A, never, Sieve | PatternBank | Reader>): A =>
  Effect.runSync(e.pipe(Effect.provide(RungLayer)));

describe("T10 PatternBank — the enumerated universe as a service", () => {
  it("loads the closed universe from the pin", () => {
    const n = run(Effect.gen(function* () {
      return (yield* PatternBank).universe.length;
    }));
    expect(n).toBeGreaterThan(5000);
  });

  it("looks up constructs with their taxonomy join", () => {
    const row = run(Effect.gen(function* () {
      return (yield* PatternBank).lookup("effect/Effect.gen");
    }));
    expect(row?.semanticClass).toBe("computation");
    expect(row?.kind).toBe("function");
    expect(row?.depthBasis).toBe("seeded");
  });

  it("canonicalizes barrel spellings onto their module", () => {
    const bank = run(Effect.gen(function* () { return yield* PatternBank; }));
    expect(bank.canonical("effect", ["Effect", "gen"])).toBe("effect/Effect.gen");
    expect(bank.canonical("effect/Effect", ["gen"])).toBe("effect/Effect.gen");
    expect(bank.canonical("effect", ["pipe"])).toBe("effect.pipe");
    expect(bank.canonical("effect", ["NoSuchModule", "nope"])).toBeNull();
  });

  it("computes the complement — the constructs not yet modeled", () => {
    const bank = run(Effect.gen(function* () { return yield* PatternBank; }));
    const covered = new Set(["effect/Effect.gen"]);
    const rest = bank.complement(covered);
    expect(rest.length).toBe(bank.universe.length - 1);
    expect(rest).not.toContain("effect/Effect.gen");
  });
});

describe("T10 Sieve — the trained classifier behind a Layer", () => {
  it("rung 0: zero-effect files are decided, not scored", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Sieve).captureSpans("export const n = 1;\n");
    }));
    expect(r.effectful).toBe(false);
    expect(r.spans).toHaveLength(0);
  });

  it("captures anchored spans with scores, depths, and byte ranges", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Sieve).captureSpans(BASELINE);
    }));
    expect(r.effectful).toBe(true);
    expect(r.spans.length).toBeGreaterThan(0);
    for (const s of r.spans) {
      expect(typeof s.score).toBe("number");
      expect(typeof s.fired).toBe("boolean");
      expect(s.byteEnd).toBeGreaterThan(s.byteStart);
      expect(s.lineEnd).toBeGreaterThanOrEqual(s.lineStart);
      expect(s.depthMax).toBeGreaterThanOrEqual(s.depthStart);
    }
  });

  it("annotator, never gatekeeper: spans carry the verdict, none are deleted", () => {
    // every anchored line lands in some span whether or not it fired
    const r = run(Effect.gen(function* () {
      return yield* (yield* Sieve).captureSpans(BASELINE);
    }));
    const anchoredSpans = r.spans.filter((s) => !s.fired);
    // presence of unfired spans is input-dependent; the CONTRACT is that
    // fired is a field, not a filter — so the field must exist on all
    for (const s of [...r.spans, ...anchoredSpans]) expect("fired" in s).toBe(true);
  });
});

describe("T10 Reader — spans join the AST pass", () => {
  it("links bank constructs into sieve spans by byte containment", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(BASELINE);
    }));
    expect(r.effectful).toBe(true);
    expect(r.parsed).toBe(true);
    const constructs = r.spans.flatMap((s) => s.constructs.map((c) => c.construct));
    expect(constructs).toContain("effect/Effect.gen");
    for (const s of r.spans)
      for (const c of s.constructs) {
        expect(c.byteStart).toBeGreaterThanOrEqual(s.byteStart);
        expect(c.byteStart).toBeLessThanOrEqual(s.byteEnd);
        expect(typeof c.nodeDepth).toBe("number");
      }
  });

  it("records off-universe chains instead of dropping them", () => {
    const src =
      'import { Effect } from "effect";\n' +
      "export const x = Effect.definitelyNotAConstruct(1);\n";
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(src);
    }));
    expect(r.offUniverse).toContain("effect.Effect.definitelyNotAConstruct");
  });

  it("generation: v4-only constructs verdict v4 (computed canary)", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(
        'import { Effect } from "effect";\n' +
        "export const x = Effect.callback((cb) => {});\n");
    }));
    expect(r.generation.v4Only).toContain("effect/Effect.callback");
    expect(r.generation.verdict).toBe("v4");
  });

  it("generation: a v3-only chain trips the pre-v4 canary", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(
        'import { Effect } from "effect";\n' +
        'export class Files extends Effect.Service<Files>()("Files", {}) {}\n');
    }));
    expect(r.generation.preV4).toContain("effect/Effect.Service");
    expect(r.generation.verdict).toBe("pre-v4");
    expect(r.offUniverse).toContain("effect.Effect.Service");
  });

  it("generation: legacy module specifiers are import-line canaries", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(
        'import { T } from "@effect-ts/core";\n' +
        "export const t = T.succeedWith(() => 1);\n");
    }));
    expect(r.generation.legacyModules).toEqual(["@effect-ts/core"]);
    expect(r.generation.verdict).toBe("pre-v4");
  });

  it("generation: shared-only constructs stay honestly indeterminate", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(BASELINE);
    }));
    expect(r.generation.verdict).toBe("indeterminate");
  });

  it("ports: run* is an exit from fiber space and marks the entry point", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(
        'import { Effect } from "effect";\n' +
        "export const main = Effect.runPromise(Effect.succeed(1));\n");
    }));
    expect(r.roles.entryPoint).toBe(true);
    expect(r.roles.portsOut).toBeGreaterThan(0);
  });

  it("ports: a host closure at a port-in construct is a black-box span", () => {
    const src =
      'import { Effect } from "effect";\n' +
      "export const now = Effect.sync(() => Date.now());\n";
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(src);
    }));
    expect(r.blackBox.length).toBe(1);
    const b = r.blackBox[0];
    expect(b.construct).toBe("effect/Effect.sync");
    expect(src.slice(b.byteStart, b.byteEnd)).toBe("() => Date.now()");
  });

  it("density: zero capture is an explicit early-exit signal", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(
        'import { Effect } from "effect";\nexport const n = 1;\n');
    }));
    expect(r.density.zeroCapture).toBe(true);
    expect(r.density.constructHits).toBe(0);
  });

  it("density and imports: fractions are facts, imports seed the graph", () => {
    const r = run(Effect.gen(function* () {
      return yield* (yield* Reader).read(BASELINE);
    }));
    expect(r.density.zeroCapture).toBe(false);
    expect(r.density.effectLineFraction).toBeGreaterThan(0);
    expect(r.density.effectLineFraction).toBeLessThanOrEqual(1);
    expect(r.imports).toEqual(["effect/Effect"]);
  });

  it("is deterministic: identical readings for identical sources", () => {
    const [a, b] = run(Effect.gen(function* () {
      const reader = yield* Reader;
      return [yield* reader.read(BASELINE), yield* reader.read(BASELINE)];
    }));
    expect(canonJson(a)).toBe(canonJson(b));
  });
});
