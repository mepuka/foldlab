/**
 * The harness contract — the portable, first-order layer.
 *
 * Everything in this module is data and pure functions: verdict shapes,
 * the refusal taxonomy with its spectrum rollup, the v0 rule manifest,
 * and canonical JSON. No IO, no parser, no engine. This is the stratum
 * a Lean port consumes verbatim (the recognition proposal's §7.2 data
 * model, whose ratified authoring surface is Lean first-order data —
 * this file is its TypeScript mirror, pre-grade until grilled).
 *
 * Invocation semantics are deliberately OPEN: an engine is any function
 * `recognize(source) → Verdict[]` whose output round-trips through
 * `canonJson`. Two engines are interchangeable exactly when their
 * verdicts are canon-identical on the by-construction fixture corpus —
 * that equality IS the agreement gate (`gate.ts`), and it is the
 * criterion a Lean engine must meet, no more and no less.
 */

/** An answer reference, resolved to an INDEX — names die at the boundary. */
export type Ref = { source: number; expectedTag: number };

/** One linear store operation of a lifted program. */
export type Instruction = {
  index: number;
  version: number;
  tag: number;
  payloadHex: string;
  refs: Ref[];
};

/** A recognized straight-line program: its instructions and its word. */
export type Lift = {
  kind: "lifted";
  name: string;
  storeBinder: string;
  instructions: Instruction[];
  word: number[];
  /** Rule 7 (hex pinning) is not enforced in v0; always true, honestly. */
  helperUnpinned: boolean;
};

/** A classified refusal — fail-closed, never an approximation. */
export type Refusal = {
  kind: "refusal";
  name: string;
  code: RefusalCode;
  detail: string;
  /** Byte position; engine-local convenience, EXCLUDED from gate equality. */
  pos?: number;
};

export type Verdict = Lift | Refusal;

/** The v0 refusal taxonomy (recognition proposal §8, codes verbatim). */
export type RefusalCode =
  | "E-PARAM-SHAPE" | "E-SPINE-ESCAPE" | "E-YIELD-POSITION"
  | "E-BIND-SHAPE" | "E-STMT-SHAPE" | "E-OP-RECEIVER" | "E-OP-UNKNOWN"
  | "E-BRANCH" | "E-LOOP" | "E-HANDLER" | "E-RETURN-SHAPE"
  | "E-NODE-SHAPE" | "E-ARG-DYNAMIC" | "E-ARG-CLOSURE"
  | "E-REF-UNBOUND" | "E-REF-FORWARD" | "E-ANSWER-HIGHER-ORDER"
  | "E-FAIL-NOT-DOCUMENTED" | "E-IMPORT-OPAQUE" | "E-HELPER-UNPINNED";

export type SpectrumClass =
  | "applicative-gap" | "selective" | "monadic" | "instrument" | "classification";

/** Spectrum rollup. Deviation, held: E-BRANCH maps to `monadic` because
 * v0 does not attempt the arms (the proposal grades attempted arms as
 * `selective`); nothing lands in `selective` until arms are attempted. */
export const SPECTRUM: Record<RefusalCode, SpectrumClass> = {
  "E-BIND-SHAPE": "applicative-gap",
  "E-BRANCH": "monadic", "E-LOOP": "monadic", "E-HANDLER": "monadic",
  "E-ARG-CLOSURE": "monadic", "E-ANSWER-HIGHER-ORDER": "monadic",
  "E-SPINE-ESCAPE": "monadic", "E-YIELD-POSITION": "monadic",
  "E-FAIL-NOT-DOCUMENTED": "classification",
  "E-OP-RECEIVER": "classification", "E-OP-UNKNOWN": "classification",
  "E-STMT-SHAPE": "classification", "E-RETURN-SHAPE": "classification",
  "E-NODE-SHAPE": "classification", "E-ARG-DYNAMIC": "classification",
  "E-REF-UNBOUND": "classification", "E-REF-FORWARD": "classification",
  "E-PARAM-SHAPE": "classification",
  "E-IMPORT-OPAQUE": "instrument", "E-HELPER-UNPINNED": "instrument",
};

/** The v0 rule manifest, as data (§7.2 Layer 2/3 shape, pre-grade).
 * Engines implement these rules; the manifest is what a Lean walker
 * would be generated from (R11: both surfaces from one manifest). */
export const MANIFEST_V0 = {
  manifestVersion: 0,
  language: "cas-libfree",
  pins: {
    compilerLeg: "typescript@5.9.2",
    oxcLeg: "oxlint@1.80.0 + effect-oxlint@0.3.4 (mpsuesser/effect-oxlint @ d8c892f4)",
    effect: "4.0.0-rc.112 (rule-authoring dependency; recognition is version-neutral by import resolution)",
  },
  rules: [
    { name: "program-decl", register: "R-GEN", scope: "declaration", enabled: true },
    { name: "const-yield-put", register: "R-GEN", scope: "statement", enabled: true },
    { name: "node-literal", register: "R-GEN", scope: "expression", enabled: true },
    { name: "answer-ref", register: "R-GEN", scope: "expression", enabled: true },
    { name: "return-word", register: "R-GEN", scope: "statement", enabled: true },
    { name: "hex-helper", register: "R-GEN", scope: "declaration", enabled: false /* unpinned in v0 */ },
    { name: "const-yield-load", register: "R-GEN", scope: "statement", enabled: false /* load-not-yet-documented */ },
    { name: "body-partition", register: "R-GEN", scope: "body", enabled: true },
  ],
} as const;

/** Import specifiers whose bindings count as effect ops (all generations). */
export const EFFECT_MODULE = /^(effect(\/|$)|@effect\/|@effect-ts\/)/;

/** Canonical JSON: sorted keys at every level (the CAS-003 shape).
 * Gate equality and every evidence row go through this, so key order
 * can never smuggle a difference between engines. */
export function canonJson(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonJson).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v as object).sort()
      .map((k) => JSON.stringify(k) + ":" + canonJson((v as Record<string, unknown>)[k]))
      .join(",") + "}";
  return JSON.stringify(v);
}

/** The gate's comparison key: `pos` stripped (engine-local), refusals
 * compared on (kind, name, code), lifts on the whole document. */
export function verdictKey(v: Verdict): string {
  if (v.kind === "lifted") return canonJson(v);
  return canonJson({ kind: v.kind, name: v.name, code: v.code });
}
