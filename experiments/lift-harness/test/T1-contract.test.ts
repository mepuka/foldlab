/**
 * T1 — the contract unit tier. Pure-function facts about the portable
 * layer: no engine, no IO, no corpus. If these fail, every other tier is
 * measuring the wrong thing.
 */
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MANIFEST_V0, SPECTRUM, UNREACHABLE_V0, canonJson, detail,
  isCanonicalNat, isPayloadHex, verdictKey,
  type RefusalCode, type Verdict,
} from "../src/contract";
// @ts-expect-error — .mjs engine, deliberately untyped (see test/engines.ts):
// it is the independent leg and must not acquire a shape from the ck leg.
import { MANIFEST as OXC_MANIFEST, MANIFEST_PATH } from "../src/oxc-engine.mjs";
import { ENGINES, ledgerSource } from "./engines";
import ledger from "./ledger.json" with { type: "json" };
import manifestJson from "../../../library/effects/src/cas/generated/lift/manifest.json" with { type: "json" };

/** Every code in the taxonomy. Kept as a runtime value beside the type so
 * the totality claim is checkable, not merely compilable. */
const ALL_CODES = Object.keys(SPECTRUM) as RefusalCode[];

describe("T1 canonJson", () => {
  it("is independent of key insertion order", () => {
    expect(canonJson({ b: 1, a: 2 })).toBe(canonJson({ a: 2, b: 1 }));
    expect(canonJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys at EVERY level, not just the top", () => {
    expect(canonJson({ z: { d: 1, c: 2 } })).toBe('{"z":{"c":2,"d":1}}');
    expect(canonJson([{ b: 1, a: 0 }])).toBe('[{"a":0,"b":1}]');
  });

  it("is deterministic across repeated calls", () => {
    const v = { k: [3, { y: 1, x: 2 }], a: "s" };
    expect(canonJson(v)).toBe(canonJson(v));
  });

  it("preserves array order (arrays are sequences, not sets)", () => {
    expect(canonJson([1, 2])).not.toBe(canonJson([2, 1]));
  });
});

describe("T1 verdictKey", () => {
  const base: Verdict = { kind: "refusal", name: "p", code: "E-STMT-SHAPE", detail: "d" };

  it("excludes `pos` — it is engine-local byte convenience", () => {
    expect(verdictKey({ ...base, pos: 7 })).toBe(verdictKey({ ...base, pos: 999 }));
    expect(verdictKey({ ...base, pos: 7 })).toBe(verdictKey(base));
  });

  it("INCLUDES detail strings (R10) — they are manifest-pinned law", () => {
    expect(verdictKey(base)).not.toBe(verdictKey({ ...base, detail: "other" }));
  });

  it("separates verdicts differing only in code or name", () => {
    expect(verdictKey(base)).not.toBe(verdictKey({ ...base, code: "E-LOOP" }));
    expect(verdictKey(base)).not.toBe(verdictKey({ ...base, name: "q" }));
  });

  it("is stable across repeated calls", () => {
    expect(verdictKey(base)).toBe(verdictKey(base));
  });
});

describe("T1 SPECTRUM totality", () => {
  it("classifies every code, with no extra keys", () => {
    for (const c of ALL_CODES) expect(SPECTRUM[c]).toBeDefined();
    expect(new Set(ALL_CODES).size).toBe(ALL_CODES.length);
  });

  it("uses only declared spectrum classes", () => {
    const classes = new Set([
      "applicative-gap", "selective", "monadic", "instrument", "classification",
    ]);
    for (const c of ALL_CODES) expect(classes.has(SPECTRUM[c])).toBe(true);
  });

  it("leaves `selective` empty — v0 does not attempt branch arms", () => {
    expect(ALL_CODES.filter((c) => SPECTRUM[c] === "selective")).toEqual([]);
  });
});

describe("T1 R6 canonical decimal Nat32", () => {
  it("admits canonical decimals inside the width", () => {
    for (const t of ["0", "1", "31", "1000", "4294967295"]) expect(isCanonicalNat(t)).toBe(true);
  });

  it("refuses separators, radix prefixes, floats, exponents and leading zeros", () => {
    for (const t of ["1_000", "0x1f", "0b11", "0o17", "1.5", "1e2", "01", "-1", "1n"])
      expect(isCanonicalNat(t)).toBe(false);
  });

  it("refuses values at or past the declared width", () => {
    expect(isCanonicalNat("4294967296")).toBe(false);
    expect(MANIFEST_V0.natBits).toBe(32);
  });
});

describe("T1 R7 payload hex domain", () => {
  it("admits lowercase even-length hex, empty included", () => {
    for (const t of ["", "ff", "00ff", "deadbeef"]) expect(isPayloadHex(t)).toBe(true);
  });

  it("refuses uppercase, odd length and non-hex", () => {
    for (const t of ["FF", "f", "zz", "0xff", "ff "]) expect(isPayloadHex(t)).toBe(false);
  });

  it("decodes through the estate's stock hex transformation with ZERO normalization", () => {
    // R7's reason for existing: once the domain is pinned, the recognizer's
    // output is already what `Schema.Uint8ArrayFromHex` accepts, so nothing
    // downstream has to clean it up first.
    const decode = Schema.decodeUnknownSync(Schema.Uint8ArrayFromHex);
    expect(Array.from(decode("00ff"))).toEqual([0, 255]);
    expect(Array.from(decode(""))).toEqual([]);
  });
});

describe("T1 pinned detail strings", () => {
  it("substitutes every placeholder it is given", () => {
    expect(detail("natNotCanonical", { role: "tag" })).toBe("tag is not canonical decimal");
    expect(detail("natOutOfRange", { role: "version", bits: 32 }))
      .toBe("version does not fit 32 bits");
  });

  it("leaves no unfilled placeholder in any manifest detail", () => {
    const subs = { role: "version", bits: MANIFEST_V0.natBits };
    for (const key of Object.keys(MANIFEST_V0.details))
      expect(detail(key, subs)).not.toMatch(/[{][a-z]+[}]/i);
  });

  it("refuses an unpinned key rather than inventing a string", () => {
    expect(() => detail("nope")).toThrow(/no pinned detail/);
  });
});

describe("T1 R9 reachability audit", () => {
  // The claim: every code the taxonomy declares is either produced by some
  // pinned input, or explicitly declared unreachable-in-v0 with its revival
  // condition. A code in neither bucket is a taxonomy that has drifted from
  // the engines — which is what this tier exists to catch.
  const produced = new Set<string>();
  for (const row of ledger.rows) {
    for (const e of ENGINES)
      for (const v of e.recognize(ledgerSource(row)))
        if (v.kind === "refusal") produced.add(v.code);
  }

  it("declares exactly the three v0-unreachable codes, each with a revival condition", () => {
    expect([...UNREACHABLE_V0].sort())
      .toEqual(["E-HELPER-UNPINNED", "E-IMPORT-OPAQUE", "E-REF-FORWARD"]);
    for (const u of MANIFEST_V0.unreachableV0) expect(u.revival.length).toBeGreaterThan(10);
  });

  it("never produces a code declared unreachable", () => {
    for (const c of UNREACHABLE_V0) expect(produced.has(c)).toBe(false);
  });

  it("accounts for every code: produced, or declared unreachable, or listed as ledger-uncovered", () => {
    // Codes no ledger row reaches yet. They are reachable in principle and
    // the fixture corpus exercises them; naming them here keeps the gap
    // VISIBLE instead of letting an empty assertion imply full coverage.
    const LEDGER_UNCOVERED: RefusalCode[] = [
      "E-PARAM-SHAPE", "E-BIND-SHAPE", "E-OP-RECEIVER", "E-OP-UNKNOWN",
      "E-BRANCH", "E-LOOP", "E-HANDLER", "E-RETURN-SHAPE", "E-NODE-SHAPE",
      "E-ARG-CLOSURE", "E-REF-UNBOUND", "E-ANSWER-HIGHER-ORDER",
      "E-FAIL-NOT-DOCUMENTED", "E-YIELD-POSITION",
    ];
    const unexplained = ALL_CODES.filter(
      (c) => !produced.has(c) && !UNREACHABLE_V0.includes(c) && !LEDGER_UNCOVERED.includes(c),
    );
    expect(unexplained).toEqual([]);
    // and the uncovered list must not rot into a dumping ground
    for (const c of LEDGER_UNCOVERED) expect(produced.has(c)).toBe(false);
  });
});

describe("T1 manifest shape (R11)", () => {
  it("carries the ruled bounds as data", () => {
    expect(MANIFEST_V0.candidateDepthMax).toBe(64);
    expect(MANIFEST_V0.natBits).toBe(32);
    expect(MANIFEST_V0.natLiteralPattern).toBe("^(0|[1-9][0-9]*)$");
    expect(MANIFEST_V0.payloadHexPattern).toBe("^([0-9a-f]{2})*$");
  });

  it("keeps the two v0-disabled rules disabled (standing deviations)", () => {
    const byName = Object.fromEntries(MANIFEST_V0.rules.map((r) => [r.name, r.enabled]));
    expect(byName["hex-helper"]).toBe(false);
    expect(byName["const-yield-load"]).toBe(false);
  });

  it("round-trips through canonical JSON", () => {
    expect(canonJson(JSON.parse(canonJson(MANIFEST_V0)))).toBe(canonJson(MANIFEST_V0));
  });
});

/**
 * R11's premise, made a test. The two engines are only each other's check
 * while they read ONE manifest: `contract.ts` (ck leg) imports it, and
 * `oxc-engine.mjs` (oxc leg) readFileSyncs it. They diverged once — the oxc
 * leg read a stale `src/manifest.json`, and every load-bearing field happened
 * to still be byte-equal, so the gate stayed green while the authority had
 * already forked. These assertions are about the BYTES and the PATH, not the
 * decoded values, because it was the values agreeing that hid the defect.
 */
describe("T1 manifest authority (R11 — one file, both legs)", () => {
  const AUTHORITY = fileURLToPath(
    new URL("../../../library/effects/src/cas/generated/lift/manifest.json", import.meta.url),
  );

  it("has the oxc leg reading the Lean-generated file, not a local copy", () => {
    expect(resolve(MANIFEST_PATH)).toBe(resolve(AUTHORITY));
  });

  it("gives both legs byte-identical manifests", () => {
    expect(readFileSync(MANIFEST_PATH).equals(readFileSync(AUTHORITY))).toBe(true);
    expect(canonJson(OXC_MANIFEST)).toBe(canonJson(manifestJson));
  });

  it("has no second manifest anywhere in src/ to drift against", () => {
    const srcDir = fileURLToPath(new URL("../src", import.meta.url));
    const strays = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
      .filter((p) => p.endsWith("manifest.json"));
    expect(strays).toEqual([]);
  });
});
