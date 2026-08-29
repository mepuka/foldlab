/**
 * T4 — the property tier, the suite's generative arm.
 *
 * (a) IN-GRAMMAR: generate well-formed v0 programs from the manifest as
 *     data and assert both engines lift them with the expected document.
 * (b) ADVERSARIAL: mutate in-grammar sources along the §6 form axes and
 *     assert byte-identical verdicts — or identical silence — between the
 *     engines. Shrinking hands back a minimal witness, and every shrunk
 *     counterexample belongs in the ledger.
 *
 * fast-check is pinned (4.9.0) and admitted in docs/lab-core/TOOLS.md.
 * Generators are derived from the manifest, not hand-tuned to the engines:
 * a generator taught to avoid the shapes that break the engines would find
 * nothing, which is the failure mode this tier is most exposed to.
 */
import { afterAll, describe, expect, it } from "@effect/vitest";
import * as fc from "fast-check";
import { ENGINES, dropScratch, listKey } from "./engines";
import { MANIFEST_V0 } from "../src/contract";

afterAll(dropScratch);

// Deterministic by construction: a fixed seed makes a red run reproducible
// from the record alone, which is what turns a counterexample into evidence.
const RUNS = { numRuns: 120, seed: 20260828, verbose: 0 } as const;

/* ------------------------------------------------------------------ */
/* (a) in-grammar generation                                           */
/* ------------------------------------------------------------------ */

const MAX_NAT = 2 ** MANIFEST_V0.natBits - 1;

const natArb = fc.nat({ max: MAX_NAT });
const hexArb = fc.array(fc.integer({ min: 0, max: 255 }), { maxLength: 8 })
  .map((bs) => bs.map((b) => b.toString(16).padStart(2, "0")).join(""));

type Instr = { version: number; tag: number; hex: string; refs: number[] };

/** A straight-line program: `n` puts, each ref pointing at an EARLIER
 * binder (v0 resolves backwards only), and a dense return. */
const programArb = fc.array(
  fc.record({ version: natArb, tag: natArb, hex: hexArb }), { minLength: 1, maxLength: 6 },
).chain((rows) =>
  fc.tuple(...rows.map((r, i) =>
    fc.array(fc.nat({ max: Math.max(0, i - 1) }), { maxLength: i === 0 ? 0 : 2 })
      .map((refs) => ({ ...r, refs: i === 0 ? [] : refs } as Instr)))),
).map((instrs) => instrs as Instr[]);

const binder = (i: number): string => `a${i}`;

function render(instrs: Instr[]): string {
  const body = instrs.map((n, i) => {
    const refs = n.refs.map((r) => `{ id: ${binder(r)}, expectedTag: ${instrs[r].tag} }`).join(", ");
    return `  const ${binder(i)} = yield* store.put({ kind: { version: ${n.version}, ` +
      `tag: ${n.tag} }, payload: hex("${n.hex}"), refs: [${refs}] });`;
  }).join("\n");
  return 'import * as Effect from "effect/Effect";\n' +
    "export const p = (store) => Effect.gen(function* () {\n" + body + "\n" +
    `  return [${instrs.map((_, i) => binder(i)).join(", ")}];\n});\n`;
}

/** The document both engines must produce for a generated program. */
function expectedInstructions(instrs: Instr[]) {
  return instrs.map((n, i) => ({
    index: i, version: n.version, tag: n.tag, payloadHex: n.hex,
    refs: n.refs.map((r) => ({ source: r, expectedTag: instrs[r].tag })),
  }));
}

describe("T4(a) in-grammar programs", () => {
  it("ck lifts every generated program with the expected document", () => {
    fc.assert(fc.property(programArb, (instrs) => {
      const vs = ENGINES[0].recognize(render(instrs));
      expect(vs.length).toBe(1);
      const v = vs[0];
      expect(v.kind).toBe("lifted");
      if (v.kind !== "lifted") return;
      expect(v.instructions).toEqual(expectedInstructions(instrs));
      expect(v.storeBinder).toBe("store");
      expect(Object.keys(v)).not.toContain("word");     // R8
    }), RUNS);
  });

  it("both engines produce byte-identical verdicts on generated programs", () => {
    // Fewer runs: each one spawns an oxlint process.
    fc.assert(fc.property(programArb, (instrs) => {
      const src = render(instrs);
      const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(src)));
      expect(oxc).toBe(ck);
    }), { ...RUNS, numRuns: 25 });
  });
});

/* ------------------------------------------------------------------ */
/* (b) adversarial mutation along the §6 form axes                     */
/* ------------------------------------------------------------------ */

/** Each mutator varies ONE cell of concrete syntax. None is expected to
 * lift; all are required to make the engines say the SAME thing. */
export const MUTATORS: { axis: string; apply: (s: string) => string }[] = [
  { axis: "payload/template", apply: (s) => s.replace(/hex\("([0-9a-f]*)"\)/, "hex(`$1`)") },
  { axis: "payload/escape", apply: (s) => s.replace(/hex\("([0-9a-f]*)"\)/, 'hex("\\x66\\x66")') },
  { axis: "payload/concat", apply: (s) => s.replace(/hex\("([0-9a-f]*)"\)/, 'hex("f" + "f")') },
  { axis: "payload/uppercase", apply: (s) => s.replace(/hex\("([0-9a-f]*)"\)/, 'hex("FF")') },
  { axis: "payload/odd-length", apply: (s) => s.replace(/hex\("([0-9a-f]*)"\)/, 'hex("f")') },
  { axis: "numeric/separator", apply: (s) => s.replace(/version: (\d+)/, "version: 1_000") },
  { axis: "numeric/hex-radix", apply: (s) => s.replace(/version: (\d+)/, "version: 0x1f") },
  { axis: "numeric/binary-radix", apply: (s) => s.replace(/version: (\d+)/, "version: 0b11") },
  { axis: "numeric/octal-radix", apply: (s) => s.replace(/version: (\d+)/, "version: 0o17") },
  { axis: "numeric/float", apply: (s) => s.replace(/version: (\d+)/, "version: 1.5") },
  { axis: "numeric/exponent", apply: (s) => s.replace(/version: (\d+)/, "version: 1e2") },
  { axis: "numeric/leading-zero", apply: (s) => s.replace(/version: (\d+)/, "version: 0_1") },
  { axis: "numeric/negative", apply: (s) => s.replace(/version: (\d+)/, "version: -1") },
  { axis: "numeric/bigint", apply: (s) => s.replace(/version: (\d+)/, "version: 1n") },
  { axis: "numeric/overflow", apply: (s) => s.replace(/version: (\d+)/, "version: 4294967296") },
  { axis: "chain/optional", apply: (s) => s.replace("yield* store.put", "yield* store?.put") },
  { axis: "chain/non-null", apply: (s) => s.replace("yield* store.put", "yield* store!.put") },
  { axis: "chain/parenthesized", apply: (s) => s.replace("yield* store.put", "yield* (store).put") },
  { axis: "chain/computed", apply: (s) => s.replace("yield* store.put", 'yield* store["put"]') },
  { axis: "chain/as-cast", apply: (s) => s.replace("yield* store.put", "yield* (store as any).put") },
  { axis: "import/comment", apply: (s) => s.replace(/^import /, "// import ") },
  { axis: "import/aliased", apply: (s) => s.replace('import * as Effect from', "import * as Eff from")
      .replace(/Effect\.gen/, "Eff.gen") },
  { axis: "import/type-only", apply: (s) => s.replace("import * as Effect", "import type * as Effect") },
  { axis: "import/require", apply: (s) => s.replace(/^import \* as Effect from ("[^"]+");/m,
      "const Effect = require($1);") },
  { axis: "import/dynamic", apply: (s) => s.replace(/^import \* as Effect from ("[^"]+");/m,
      "const Effect = await import($1);") },
  { axis: "candidate/export-default", apply: (s) => s.replace("export const p =", "export default") },
  { axis: "candidate/namespaced", apply: (s) =>
      s.replace("export const p =", "namespace N { export const p =").replace(/\);\n$/, "); }\n") },
  { axis: "trivia/crlf", apply: (s) => s.split("\n").join("\r\n") },
  { axis: "identifier/dollar", apply: (s) => s.split("store").join("$store") },
  { axis: "identifier/unicode-escape", apply: (s) => s.replace("(store)", "(\\u0073tore)") },
  { axis: "return/reordered", apply: (s) => s.replace(/return \[(a0), (a1)\]/, "return [$2, $1]") },
  { axis: "binder/destructured", apply: (s) => s.replace(/const a0 =/, "const [a0] =") },
];

/** Axes with an OPEN ledger row. The engines are KNOWN to diverge here and
 * the ruling is owed, so demanding agreement would just re-report a witness
 * already on the register. These axes assert the divergence still
 * reproduces instead — the same discipline T2 applies to an open row. */
const OPEN_AXES: Record<string, string> = {
  // (numeric/leading-zero was W6; RULED R12 on 2026-08-28 — unparseable
  // source is a non-candidate and goes silent on both legs, so the axis is
  // back under the ordinary agreement assertion below.)
};

describe.each(MUTATORS.filter((m) => !(m.axis in OPEN_AXES)))(
  "T4(b) adversarial $axis", (m) => {
    it("engines agree byte-for-byte on every mutated program", () => {
      fc.assert(fc.property(programArb, (instrs) => {
        const src = m.apply(render(instrs));
        const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(src)));
        // The whole point: we assert AGREEMENT, never a particular verdict.
        // A shrunk failure here is a divergence witness for the ledger.
        expect(oxc, `divergence on axis ${m.axis}:\n${src}`).toBe(ck);
      }), { ...RUNS, numRuns: 8 });
    });
  });

describe.each(MUTATORS.filter((m) => m.axis in OPEN_AXES))(
  "T4(b) OPEN axis $axis", (m) => {
    it(`still diverges (ledger row ${OPEN_AXES[m.axis]}, ruling owed)`, () => {
      const src = m.apply(render([{ version: 0, tag: 1, hex: "ff", refs: [] }]));
      const [ck, oxc] = ENGINES.map((e) => listKey(e.recognize(src)));
      expect(oxc, `${m.axis} no longer diverges — it was resolved without a ruling`).not.toBe(ck);
    });
  });

describe("T4(b) mutator hygiene", () => {
  it("every mutator actually changes the baseline it is given", () => {
    const src = render([{ version: 0, tag: 1, hex: "ff", refs: [] },
                        { version: 2, tag: 3, hex: "00", refs: [0] }]);
    const inert = MUTATORS.filter((m) => m.apply(src) === src).map((m) => m.axis);
    expect(inert, "an inert mutator asserts nothing and hides its axis").toEqual([]);
  });
});
