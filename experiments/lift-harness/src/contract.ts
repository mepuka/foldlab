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
import manifestJson from "./manifest.json" with { type: "json" };

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

/** A recognized straight-line program: its instructions, and nothing else.
 * R8: the hoover-side document carries INSTRUCTIONS ONLY. Words are minted
 * exclusively by the execute leg (the Lean reference handler) under the
 * direction law — a recognizer that emitted one would be minting. */
export type Lift = {
  kind: "lifted";
  name: string;
  storeBinder: string;
  instructions: Instruction[];
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

/** The v0 rule manifest (R11). The AUTHORITY is `./manifest.json`; this
 * module imports those bytes and types them. `plugin.mjs` reads the same
 * file — the engines share DATA, never code, so the gate stays meaningful.
 * When the Lean port lands this file stops being hand-authored and becomes
 * the generated projection of Lean first-order data: same bytes, new
 * authority. (§7.2 Layer 2/3 shape, pre-grade.) */
export type Manifest = {
  manifestVersion: number;
  language: string;
  pins: Record<string, string>;
  rules: { name: string; register: string; scope: string; enabled: boolean }[];
  /** R4 — spine depth past which a declaration is not a candidate at all. */
  candidateDepthMax: number;
  /** R6 — the width a recognized numeric literal must fit. */
  natBits: number;
  /** R6 — raw literal text must match this to be canonical decimal. */
  natLiteralPattern: string;
  /** R7 — the admissible payload hex domain. */
  payloadHexPattern: string;
  /** R1/R2/R6/R7 — refusal detail strings, pinned so R10 can compare them. */
  details: Record<string, string>;
  /** R9 — codes declared unreachable in v0, each with its revival condition. */
  unreachableV0: { code: RefusalCode; revival: string }[];
};

export const MANIFEST_V0: Manifest = manifestJson as Manifest;

/** R6 — canonical decimal Nat<natBits>. The source must BE canonical, not
 * be forgiven into it: separators, radix prefixes, floats, exponents and
 * negatives are all outside the domain, and normalization is never applied. */
export function isCanonicalNat(rawText: string, m: Manifest = MANIFEST_V0): boolean {
  if (!new RegExp(m.natLiteralPattern).test(rawText)) return false;
  return Number(rawText) < 2 ** m.natBits;
}

/** R7 — lowercase even-length hex; empty admissible. The recognizer's
 * output decodes through the estate's stock hex transformation
 * (`Schema.Uint8ArrayFromHex`) with ZERO normalization. */
export function isPayloadHex(text: string, m: Manifest = MANIFEST_V0): boolean {
  return new RegExp(m.payloadHexPattern).test(text);
}

/** Fill a pinned detail template. Both engines implement this substitution
 * independently; R10 makes any divergence a gate failure, by design. */
export function detail(key: string, subs: Record<string, string | number> = {},
                      m: Manifest = MANIFEST_V0): string {
  let out = m.details[key];
  if (out === undefined) throw new Error(`no pinned detail "${key}"`);
  for (const [k, v] of Object.entries(subs)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** R9 — the codes v0 cannot produce. T1 asserts every code NOT listed here
 * is produced by some pinned input, so the list can never quietly grow. */
export const UNREACHABLE_V0: readonly RefusalCode[] =
  MANIFEST_V0.unreachableV0.map((u) => u.code);

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

/** The gate's comparison key (R10). `pos` is stripped — it is engine-local
 * byte-offset convenience and nothing more. EVERYTHING else is compared,
 * detail strings included: after R1/R2/R6/R7 those strings are
 * manifest-pinned law, so an engine that gets one wrong is wrong. Verdict
 * LISTS are compared in declaration order (see `gate.ts`), never sorted —
 * two engines that disagree about which declaration refused must not be
 * able to hide behind a sort. */
export function verdictKey(v: Verdict): string {
  if (v.kind === "lifted") return canonJson(v);
  return canonJson({ kind: v.kind, name: v.name, code: v.code, detail: v.detail });
}
