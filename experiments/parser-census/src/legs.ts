/**
 * The two legs, addressed uniformly — the census's whole instrument surface.
 *
 * NOTHING IS RE-IMPLEMENTED HERE. The recognition legs are the lift
 * harness's, imported verbatim:
 *
 *   ck   `liftSource`        over a `typescript@5.9.2` SourceFile
 *   oxc  `recognizeProgram`  over an `oxc-parser@0.147.0` ESTree Program
 *
 * — the same two engines the admitted multi-parser agreement gate runs
 * (`../../lift-harness/src/gate.ts`), reached through the same in-process
 * surface the harness's own suite uses (`../../lift-harness/test/engines.ts`).
 * A census that re-implemented recognition would be measuring a third thing
 * that no gate has ever held to the other two.
 *
 * The census's OWN contribution is the declaration enumerator, and it obeys
 * the same discipline: two independent walks (`decls-ck.ts`, `decls-oxc.mjs`)
 * sharing only the definition in `census-contract.ts`.
 *
 * R12 IS ENFORCED AT THE PARSE BOUNDARY, per leg. A source a leg's own
 * parser rejects is a non-candidate FOR THAT LEG: it contributes no
 * declarations and no verdicts, and the fact that it could not be parsed is
 * recorded instead of a count of zero. The two legs asking their own parsers
 * is exactly what makes a file only one of them can read a FINDING
 * (`parseDisjoint`) rather than a silent difference in denominator.
 */
import { parseSync } from "oxc-parser";
// @ts-expect-error — untyped `.mjs` leg, deliberately: see the header.
import { oxcDecls } from "./decls-oxc.mjs";
// @ts-expect-error — the harness's untyped oxc engine, imported as-is.
import { recognizeProgram } from "../../lift-harness/src/oxc-engine.mjs";
import { liftSource } from "../../lift-harness/src/lift";
import { SPECTRUM, canonJson, verdictKey, type RefusalCode, type Verdict }
  from "../../lift-harness/src/contract";
import { ckDecls, ckParsed, ckSourceFile } from "./decls-ck";
import { declKey, type Decl } from "./census-contract";

export { SPECTRUM, canonJson, type RefusalCode, type Verdict };

/** Parse options are part of a leg's contract with its parser. Identical to
 * the harness suite's (`test/engines.ts:44`), including leaving
 * `preserveParens` at its default: the recognizer must cope with both
 * surfaces, and pinning the option here would hide that. */
export const PARSE_OPTIONS = { lang: "ts", sourceType: "module" } as const;

/** What one file yielded on both legs. */
export interface Observation {
  readonly parsedCk: boolean;
  readonly parsedOxc: boolean;
  readonly declsCk: ReadonlyArray<Decl>;
  readonly declsOxc: ReadonlyArray<Decl>;
  /** Compared ONLY when both legs parsed — see `parseDisjoint` below. */
  readonly declAgree: boolean;
  readonly verdictsCk: ReadonlyArray<Verdict>;
  readonly verdictAgree: boolean;
  /** Exactly one leg parsed the file. Reported in its own bucket rather
   * than as a declaration disagreement, so one underlying finding is
   * counted once. */
  readonly parseDisjoint: boolean;
  /** Canonical renderings, kept for the gate report's byte evidence. */
  readonly declKeyCk: string;
  readonly declKeyOxc: string;
  readonly verdictKeyCk: string;
  readonly verdictKeyOxc: string;
}

const declListKey = (ds: ReadonlyArray<Decl>): string => canonJson(ds.map(declKey));
const verdictListKey = (vs: ReadonlyArray<Verdict>): string => canonJson(vs.map(verdictKey));

export function observe(src: string): Observation {
  const sf = ckSourceFile(src);
  const parsedCk = ckParsed(sf);
  const declsCk = parsedCk ? ckDecls(sf) : [];
  const verdictsCk = liftSource(src);          // enforces R12 internally

  let parsedOxc = false;
  let declsOxc: Decl[] = [];
  let verdictsOxc: Verdict[] = [];
  try {
    const { program, errors } = parseSync("f.ts", src, PARSE_OPTIONS);
    parsedOxc = errors.length === 0;
    if (parsedOxc) {
      declsOxc = oxcDecls(program) as Decl[];
      verdictsOxc = recognizeProgram(program) as Verdict[];
    }
  } catch {
    // A parser that THROWS has rejected the source just as surely as one
    // that returns errors. Treated as a refusal to parse, never as a crash
    // of the census: a wild corpus is exactly where this happens.
    parsedOxc = false;
  }

  const parseDisjoint = parsedCk !== parsedOxc;
  const declKeyCk = declListKey(declsCk);
  const declKeyOxc = declListKey(declsOxc);
  const verdictKeyCk = verdictListKey(verdictsCk);
  const verdictKeyOxc = verdictListKey(verdictsOxc);

  return {
    parsedCk, parsedOxc, declsCk, declsOxc,
    declAgree: parseDisjoint ? true : declKeyCk === declKeyOxc,
    verdictsCk,
    verdictAgree: parseDisjoint ? true : verdictKeyCk === verdictKeyOxc,
    parseDisjoint,
    declKeyCk, declKeyOxc, verdictKeyCk, verdictKeyOxc,
  };
}

/** The spectrum class of a refusal code, or `null` for a code outside the
 * pinned taxonomy. Never invents a class: an unknown code is a defect to be
 * seen, not a bucket to be filled. */
export const spectrumOf = (code: string): string | null =>
  SPECTRUM[code as RefusalCode] ?? null;
