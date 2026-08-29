/**
 * T8 — the ESTree deviation audit.
 *
 * The oxc parser does not emit standard ESTree, and pretending otherwise is
 * how a recognizer silently mis-reads a shape it was never taught. This
 * tier measures what the parser ACTUALLY emits over the suite's corpus
 * against the pinned specification (`.reference/clones/estree` @ 875bf704,
 * receipt in `.reference/provenance/receipts/estree-spec.json`) and pins
 * the deviation set as data.
 *
 * A deviation is not a defect. The spec fixes what standard ESTree is; it
 * says nothing about what a parser must emit. What matters is that every
 * deviation is KNOWN and handled — so this tier fails when a NEW one shows
 * up, not when a recorded one persists.
 */
import { describe, expect, it } from "@effect/vitest";
import { parseSync } from "oxc-parser";
import { BASELINE, PARSE_OPTIONS, ledgerSource, nestedSpine } from "./engines";
import estree from "./estree-standard.json" with { type: "json" };
import ledger from "./ledger.json" with { type: "json" };

const STANDARD = new Set<string>(estree.interfaces);

/** Every distinct `type` the parser emits over a source. */
function nodeTypes(src: string): Set<string> {
  const { program } = parseSync("probe.ts", src, PARSE_OPTIONS);
  const seen = new Set<string>();
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const o = n as Record<string, unknown>;
    if (typeof o.type === "string") seen.add(o.type);
    for (const [k, v] of Object.entries(o)) {
      if (k === "parent" || k === "loc" || k === "range") continue;
      if (v && typeof v === "object") walk(v);
    }
  };
  walk(program);
  return seen;
}

/** The corpus this audit sweeps: every ledger row plus the shapes the form
 * axes reach that no ledger row happens to carry. */
const CORPUS: string[] = [
  BASELINE,
  ...ledger.rows.map((r) => ledgerSource(r)),
  nestedSpine(3),
  BASELINE.replace("yield* store.put", "yield* (store).put"),
  BASELINE.replace("yield* store.put", "yield* (store as any).put"),
  BASELINE.replace("yield* store.put", "yield* store!.put"),
  BASELINE.replace("yield* store.put", "yield* store?.put"),
  BASELINE.replace("yield* store.put", 'yield* store["put"]'),
  BASELINE.replace('hex("ff")', "hex(`ff`)"),
  BASELINE.replace("version: 0", "version: 1n"),
  BASELINE.replace("import * as Effect", "import type * as Effect"),
];

const OBSERVED = new Set<string>();
for (const src of CORPUS) for (const t of nodeTypes(src)) OBSERVED.add(t);

/**
 * The deviation set, PINNED. Each entry is a node type oxc emits that the
 * ESTree specification does not define, with the reason it is safe here.
 * Adding to this list is a deliberate act; discovering an entry that is not
 * on it is a finding.
 */
const KNOWN_DEVIATIONS: Record<string, string> = {
  ParenthesizedExpression:
    "oxc-parser defaults preserveParens:true; the oxlint pipeline strips parens instead. R5 rules parens to be trivia, so the engine unwraps them and both surfaces must agree.",
  TSAsExpression:
    "TypeScript-only cast wrapper. Deliberately NOT unwrapped: R5 ruled on parentheses, `as` is an unruled form axis, and unwrapping it on this leg alone produced a real divergence (caught by T4(b)). Both legs refuse it as an unrecognizable callee until it is ruled.",
  TSNonNullExpression:
    "TypeScript-only `!`. R2 refuses it EXPLICITLY rather than letting it fall through as an unrecognizable callee.",
  TSTypeReference: "TypeScript type position; never load-bearing for recognition.",
  TSAnyKeyword: "TypeScript type position; never load-bearing for recognition.",
  TSTypeAnnotation: "TypeScript type position; never load-bearing for recognition.",
};

describe("T8 the pinned specification", () => {
  it("carries the ESTree interface set from the pinned commit", () => {
    expect(estree.commit).toBe("875bf70440a8870c4a663865a7a41300cf1add55");
    expect(STANDARD.size).toBeGreaterThan(80);
    for (const t of ["Program", "CallExpression", "MemberExpression", "Literal", "Property"])
      expect(STANDARD.has(t)).toBe(true);
  });

  it("does NOT contain the shapes the engine hedges for", () => {
    // If these ever became standard the hedges would be unnecessary — and
    // this assertion is what would tell us.
    for (const t of ["ParenthesizedExpression", "NumericLiteral", "StringLiteral", "ObjectProperty"])
      expect(STANDARD.has(t), `${t} is now standard — the hedge can be reconsidered`).toBe(false);
  });
});

describe("T8 deviation audit", () => {
  it("the corpus actually exercises the parser", () => {
    expect(OBSERVED.size).toBeGreaterThan(15);
    expect(OBSERVED.has("Program")).toBe(true);
  });

  it("emits no node type that is neither standard nor a KNOWN deviation", () => {
    const unexplained = [...OBSERVED]
      .filter((t) => !STANDARD.has(t) && !(t in KNOWN_DEVIATIONS))
      .sort();
    expect(
      unexplained,
      "new non-standard node types from oxc — handle them in oxc-engine.mjs, then record them here",
    ).toEqual([]);
  });

  it("every pinned deviation carries a reason", () => {
    for (const [t, why] of Object.entries(KNOWN_DEVIATIONS))
      expect(why.length, `${t} has no reason recorded`).toBeGreaterThan(30);
  });

  it("reports the deviations it observed (evidence, not a gate)", () => {
    const observedDeviants = [...OBSERVED].filter((t) => !STANDARD.has(t)).sort();
    // Recorded so a reader sees what this run actually met, rather than
    // inferring it from an assertion that passed.
    console.log("T8 observed non-standard node types:", observedDeviants.join(", ") || "(none)");
    expect(Array.isArray(observedDeviants)).toBe(true);
  });
});

describe("T8 parenthesis deviation is load-bearing", () => {
  // The concrete asymmetry between the two oxc surfaces. If this stops
  // holding, R5's implementation has drifted and W5 is live again.
  it("parseSync DOES emit ParenthesizedExpression by default", () => {
    expect(nodeTypes(BASELINE.replace("yield* store.put", "yield* (store).put"))
      .has("ParenthesizedExpression")).toBe(true);
  });

  it("and the engine still reaches the ruled verdict through it (R5)", async () => {
    const { recognizeOxc } = await import("./engines");
    const vs = recognizeOxc(BASELINE.replace("yield* store.put", "yield* (store).put"));
    expect(vs.length).toBe(1);
    expect(vs[0].kind).toBe("lifted");
  });
});
