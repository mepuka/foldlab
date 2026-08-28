/**
 * The harness contract — the portable, first-order layer.
 *
 * Every shape here is an Effect `Schema`, and the TypeScript types are
 * derived from it rather than declared beside it. That is not decoration:
 * verdicts cross a process boundary (the oxc leg emits canonical JSON in an
 * oxlint diagnostic and the gate reads it back), and the manifest is JSON on
 * disk. Those are exactly the places a hand-written `type` is a promise
 * nobody checks. A schema is the promise plus its check.
 *
 * The ENCODED side is the wire, and it is fixed: `canonJson` of a decoded
 * verdict must be byte-identical to what the engines emit, because that
 * equality IS the agreement gate (`gate.ts`). Schema is therefore used in
 * its transparent form — no renaming, no defaults, no coercion. Decoding
 * validates; it never repairs. (R6/R7 make the same point about source
 * text: the input must BE canonical, not be forgiven into it.)
 *
 * No IO, no parser, no engine. This is the stratum a Lean port consumes
 * verbatim (the recognition proposal's §7.2 data model, whose ratified
 * authoring surface is Lean first-order data — this file is its TypeScript
 * mirror, pre-grade until grilled).
 *
 * Invocation semantics are deliberately OPEN: an engine is any function
 * `recognize(source) → Verdict[]` whose output round-trips through
 * `canonJson`. Two engines are interchangeable exactly when their verdicts
 * are canon-identical on the by-construction fixture corpus.
 */
import { Schema } from "effect";
import manifestJson from "../../../library/effects/src/cas/generated/lift/manifest.json" with { type: "json" };

/** The v0 refusal taxonomy (recognition proposal §8, codes verbatim).
 * A schema, so the code list exists at runtime — T1's totality and
 * reachability audits need to enumerate it, not just typecheck against it. */
export const RefusalCode = Schema.Literals([
  "E-PARAM-SHAPE", "E-SPINE-ESCAPE", "E-YIELD-POSITION",
  "E-BIND-SHAPE", "E-STMT-SHAPE", "E-OP-RECEIVER", "E-OP-UNKNOWN",
  "E-BRANCH", "E-LOOP", "E-HANDLER", "E-RETURN-SHAPE",
  "E-NODE-SHAPE", "E-ARG-DYNAMIC", "E-ARG-CLOSURE",
  "E-REF-UNBOUND", "E-REF-FORWARD", "E-ANSWER-HIGHER-ORDER",
  "E-FAIL-NOT-DOCUMENTED", "E-IMPORT-OPAQUE", "E-HELPER-UNPINNED",
]);
export type RefusalCode = typeof RefusalCode.Type;

/** Every code, as data. Derived from the schema so the two cannot drift. */
export const REFUSAL_CODES: readonly RefusalCode[] = RefusalCode.literals;

/** An answer reference, resolved to an INDEX — names die at the boundary. */
export const Ref = Schema.Struct({
  source: Schema.Number,
  expectedTag: Schema.Number,
});
export type Ref = typeof Ref.Type;

/** One linear store operation of a lifted program. */
export const Instruction = Schema.Struct({
  index: Schema.Number,
  version: Schema.Number,
  tag: Schema.Number,
  payloadHex: Schema.String,
  refs: Schema.Array(Ref),
});
export type Instruction = typeof Instruction.Type;

/** A recognized straight-line program: its instructions, and nothing else.
 * R8: the hoover-side document carries INSTRUCTIONS ONLY. Words are minted
 * exclusively by the execute leg (the Lean reference handler) under the
 * direction law — a recognizer that emitted one would be minting. */
export const Lift = Schema.Struct({
  kind: Schema.Literal("lifted"),
  name: Schema.String,
  storeBinder: Schema.String,
  instructions: Schema.Array(Instruction),
  /** Rule 7 (hex pinning) is not enforced in v0; always true, honestly. */
  helperUnpinned: Schema.Boolean,
});
export type Lift = typeof Lift.Type;

/** A classified refusal — fail-closed, never an approximation. */
export const Refusal = Schema.Struct({
  kind: Schema.Literal("refusal"),
  name: Schema.String,
  code: RefusalCode,
  detail: Schema.String,
  /** Byte position; engine-local convenience, EXCLUDED from gate equality. */
  pos: Schema.optional(Schema.Number),
});
export type Refusal = typeof Refusal.Type;

/** The discriminant is `kind`, not `_tag`: this union is a WIRE format the
 * oxc leg already emits, and renaming it would change the bytes the gate
 * compares. The tag stays where the recognition proposal put it. */
export const Verdict = Schema.Union([Lift, Refusal]);
export type Verdict = typeof Verdict.Type;

/** Decode a verdict that crossed a process boundary (an oxlint diagnostic
 * message). Validating here is the point: an engine that emitted a code
 * outside the taxonomy would otherwise reach gate equality as a plain
 * string mismatch, reported as a disagreement rather than as the malformed
 * verdict it is. */
export const decodeVerdict = Schema.decodeUnknownSync(Verdict);

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
 * module DECODES those bytes rather than asserting a type over them, so a
 * malformed manifest fails here instead of somewhere downstream that has
 * already trusted it. `plugin.mjs` reads the same file — the engines share
 * DATA, never code, so the gate stays meaningful. When the Lean port lands
 * this file stops being hand-authored and becomes the generated projection
 * of Lean first-order data: same bytes, new authority. */
export const Manifest = Schema.Struct({
  manifestVersion: Schema.Number,
  language: Schema.String,
  pins: Schema.Record(Schema.String, Schema.String),
  rules: Schema.Array(Schema.Struct({
    name: Schema.String,
    register: Schema.String,
    scope: Schema.String,
    enabled: Schema.Boolean,
  })),
  /** R4 — spine depth past which a declaration is not a candidate at all. */
  candidateDepthMax: Schema.Number,
  /** R6 — the width a recognized numeric literal must fit. */
  natBits: Schema.Number,
  /** R6 — raw literal text must match this to be canonical decimal. */
  natLiteralPattern: Schema.String,
  /** R7 — the admissible payload hex domain. */
  payloadHexPattern: Schema.String,
  /** R1/R2/R6/R7 — refusal detail strings, pinned so R10 can compare them. */
  details: Schema.Record(Schema.String, Schema.String),
  /** R9 — codes declared unreachable in v0, each with its revival condition. */
  unreachableV0: Schema.Array(Schema.Struct({
    code: RefusalCode,
    revival: Schema.String,
  })),
});
export type Manifest = typeof Manifest.Type;

export const MANIFEST_V0: Manifest = Schema.decodeUnknownSync(Manifest)(manifestJson);

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
  const out = m.details[key];
  if (out === undefined) throw new Error(`no pinned detail "${key}"`);
  return Object.entries(subs).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), out);
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
