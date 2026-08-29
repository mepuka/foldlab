/**
 * The two engines, addressed uniformly, plus the probe generators the
 * suite draws on.
 *
 * An engine is `recognize : SourceText → Verdict[]` (README, "The Lean port
 * seam"). Both legs are IN-PROCESS here:
 *
 *   ck   `liftSource` over a `typescript` SourceFile
 *   oxc  `recognizeProgram` over an `oxc-parser` ESTree Program
 *
 * The oxc leg used to reach its engine by spawning `oxlint` once per
 * source. That is ~300ms of process start-up per recognition and nothing
 * per extra file, so the sweeps in T3 and T4 spent minutes — and the box's
 * memory — on spin-up alone. `oxc-parser` hands us the same engine's input
 * directly, so the suite now parses in-process and the oxlint chassis stays
 * where it belongs: in the gate, as the production surface.
 *
 * The engine behind both oxc surfaces is one module (`src/oxc-engine.mjs`),
 * which is the point — a suite that re-implemented the recognizer would be
 * testing a third thing.
 */
import { parseSync } from "oxc-parser";
// @ts-expect-error — .mjs engine, deliberately untyped: it is the independent
// leg and must not acquire types (hence a shape) from the ck leg's contract.
import { recognizeProgram } from "../src/oxc-engine.mjs";
import { canonJson, verdictKey, type Verdict } from "../src/contract";
import { liftSource } from "../src/lift";

export type Engine = {
  name: string;
  recognize: (src: string) => Verdict[];
  recognizeMany: (sources: string[]) => Verdict[][];
};

/** Kept so tiers that used to need a temp dir keep compiling; the
 * in-process legs allocate nothing to clean up. */
export const dropScratch = (): void => {};

/** Parse options are part of the engine's contract with its parser.
 * `preserveParens` is left at its default (true) ON PURPOSE: the oxlint
 * surface strips parentheses and this one does not, so the recognizer must
 * cope with both, and R5 says it must reach the same verdict either way.
 * Pinning the option here would hide that asymmetry instead of testing it. */
export const PARSE_OPTIONS = { lang: "ts", sourceType: "module" } as const;

export function recognizeOxc(src: string): Verdict[] {
  const { program, errors } = parseSync("probe.ts", src, PARSE_OPTIONS);
  // R12 - a source the parser rejects is a non-candidate, and non-candidates
  // are silent. Enforced HERE, at the parse boundary, because that is the
  // only place the fact exists: the engine's input is a Program, which no
  // longer knows whether it came from a clean parse. The oxlint surface gets
  // this for free — it never runs a rule over a file it could not parse — so
  // stating it explicitly on this surface is what makes the two agree BY
  // RULE rather than by coincidence.
  if (errors.length > 0) return [];
  return recognizeProgram(program) as Verdict[];
}

export const CK: Engine = {
  name: "ck",
  recognize: liftSource,
  recognizeMany: (sources) => sources.map(liftSource),
};

export const OXC: Engine = {
  name: "oxc",
  recognize: recognizeOxc,
  recognizeMany: (sources) => sources.map(recognizeOxc),
};

export const ENGINES: Engine[] = [CK, OXC];

/** The gate's equality, lifted to a whole verdict list: declaration order
 * preserved, detail strings included, `pos` excluded (R10). */
export const listKey = (vs: Verdict[]): string => canonJson(vs.map(verdictKey));

/** Recognize a batch on every engine and report, per source, whether the
 * legs agreed. `keys.length > 1` distinct IS a divergence witness. */
export function agreement(sources: string[]): { keys: string[]; agree: boolean }[] {
  const perEngine = ENGINES.map((e) => e.recognizeMany(sources));
  return sources.map((_, i) => {
    const keys = perEngine.map((rs) => listKey(rs[i]));
    return { keys, agree: new Set(keys).size === 1 };
  });
}

/** The baseline lift shape every form probe varies one cell of. */
export const BASELINE =
  'import * as Effect from "effect/Effect";\n' +
  "export const p = (store) => Effect.gen(function* () {\n" +
  '  const a = yield* store.put({ kind: { version: 0, tag: 1 }, payload: hex("ff"), refs: [] });\n' +
  "  return [a];\n" +
  "});\n";

/** A `.gen` spine buried under `depth` array literals — the R4 probe shape.
 * Generated, never hand-typed, so the boundary cases at 64 and 65 are one
 * argument apart and cannot drift from each other. */
export function nestedSpine(depth: number): string {
  const inner =
    "Effect.gen(function* () {\n" +
    '  const a = yield* store.put({ kind: { version: 0, tag: 1 }, payload: hex("ff"), refs: [] });\n' +
    "  return [a];\n" +
    "})";
  return (
    'import * as Effect from "effect/Effect";\n' +
    "export const p = " + "[".repeat(depth) + inner + "]".repeat(depth) + ";\n"
  );
}

/** Materialize a ledger row's source: verbatim when the row carries one,
 * generated when it declares a generator. */
export function ledgerSource(row: { source?: string; generated?: { kind: string; depth: number } }): string {
  if (row.source !== undefined) return row.source;
  if (row.generated?.kind === "nested-array-spine") return nestedSpine(row.generated.depth);
  throw new Error("ledger row has neither `source` nor a known `generated` kind");
}
