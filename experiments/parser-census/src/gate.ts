/**
 * `census:gate` — the census's trust mechanism.
 *
 * Four adjudications, from the proposal's §9b.1 line for this task ("twin
 * comparison (documents AND refusals byte-identical), ERROR-disjointness,
 * pin verification"), each rendered into the TS-land instruments the estate
 * has actually admitted:
 *
 *   E-INSTRUMENT-DISAGREE   the two legs enumerated different declarations,
 *                           or reached different recognition verdicts, on
 *                           the same file. Identical REFUSAL matters as much
 *                           as identical match: a leg that refuses where its
 *                           twin lifts is a defect in one of them, and it is
 *                           surfaced, never averaged.
 *   E-PARSE-DISJOINT        exactly one leg could parse the file. This is
 *                           the TS-land analogue of the Lean twin's
 *                           ERROR-disjointness: there, a walk must not
 *                           consume a byte range touching an ERROR node;
 *                           here, the two parsers must agree about which
 *                           sources are parseable at all, because the leg
 *                           that goes silent under R12 silently changes the
 *                           denominator of every count.
 *   E-PIN-DRIFT             a parser pin declared, installed, or recorded in
 *                           a summary that is not the admitted exact version.
 *   E-CORPUS-PIN            a checkout whose observed `.git/HEAD` is not the
 *                           revision `corpus-manifest.json` names, or has no
 *                           readable head at all.
 *
 * ABSENCE IS NOT RED. `corpus/` is gitignored and missing on most hosts, so
 * a gate with nothing to adjudicate reports NOT RUN and exits 0 — "I could
 * not check" must not be mistaken for either green or red. `--require-corpus`
 * is how a caller says a census is DEMANDED; then absence is a failure,
 * because then it is one.
 */
import { Console, Effect, FileSystem, Path } from "effect";
import { CensusPaths } from "./CensusPaths";
import { decodeSummary, type Summary } from "./census-contract";
import { canonJson } from "./legs";
import { INSTRUMENT, pinDrift } from "./pins";

export interface Finding {
  readonly code: "E-INSTRUMENT-DISAGREE" | "E-PARSE-DISJOINT" | "E-PIN-DRIFT" | "E-CORPUS-PIN";
  readonly where: string;
  readonly detail: string;
}

export type GateReport =
  | { readonly kind: "not-run"; readonly out: string; readonly hint: string }
  | {
      readonly kind: "ran";
      readonly green: boolean;
      readonly slices: number;
      readonly files: number;
      /** Summed over slice captures, so a project carrying several labels
       * contributes once per label. A scale figure for the gate's own
       * report — the corpus count lives in `out/histogram.json`, which
       * deduplicates. */
      readonly sliceDeclarations: number;
      readonly findings: ReadonlyArray<Finding>;
    };

const summaryFiles = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* CensusPaths;
  if (!(yield* fs.exists(paths.out))) return [] as string[];
  const out: string[] = [];
  for (const d of [...(yield* fs.readDirectory(paths.out))].sort()) {
    const dir = path.join(paths.out, d);
    const info = yield* fs.stat(dir).pipe(Effect.option);
    if (info._tag === "None" || info.value.type !== "Directory") continue;
    for (const f of [...(yield* fs.readDirectory(dir))].sort())
      if (f.endsWith(".summary.json")) out.push(path.join(dir, f));
  }
  return out;
});

/** Findings from one captured slice. */
export function adjudicate(s: Summary): Finding[] {
  const out: Finding[] = [];
  const at = `${s.project}/${s.slice}`;

  if (s.declDisagreementCount > 0)
    out.push({
      code: "E-INSTRUMENT-DISAGREE", where: at,
      detail: `${s.declDisagreementCount} file(s) enumerated differently by the two legs; ` +
        `first witness: ${s.declDisagreements[0]?.file ?? "?"}`,
    });
  // Agreement is asserted over the CORROBORATED total, not the raw one. A
  // file only one leg can parse changes that leg's total without either leg
  // being wrong about the declarations it did read — that condition is
  // E-PARSE-DISJOINT below, and reporting it twice would make one finding
  // look like two. This check is the invariant that must hold once the
  // per-file disagreements are zero; it firing anyway is a defect in the
  // capture's own arithmetic, which is exactly why it is checked.
  if (s.declCountCorroborated !== s.declCountCk - s.declCountUncorroboratedCk ||
      s.declCountCorroborated !== s.declCountOxc - s.declCountUncorroboratedOxc)
    out.push({
      code: "E-INSTRUMENT-DISAGREE", where: at,
      detail: `corroborated total ${s.declCountCorroborated} does not reconcile: ` +
        `ck ${s.declCountCk}-${s.declCountUncorroboratedCk}, ` +
        `oxc ${s.declCountOxc}-${s.declCountUncorroboratedOxc}`,
    });
  if (s.verdictDisagreementCount > 0)
    out.push({
      code: "E-INSTRUMENT-DISAGREE", where: at,
      detail: `${s.verdictDisagreementCount} file(s) with differing verdict lists; ` +
        `first witness: ${s.verdictDisagreements[0]?.file ?? "?"}`,
    });
  if (s.parseDisjointCount > 0)
    out.push({
      code: "E-PARSE-DISJOINT", where: at,
      detail: `${s.parseDisjointCount} file(s) parseable by exactly one leg ` +
        `(ck rejected ${s.unparsedCk}, oxc rejected ${s.unparsedOxc}); ` +
        `first witness: ${s.parseDisjoint[0]?.file ?? "?"}`,
    });

  // The summary must name the build that produced it, and that build must be
  // the admitted one. A capture recorded under a different parser is
  // evidence about a different instrument.
  const expected = INSTRUMENT;
  if (canonJson(s.instrument) !== canonJson(expected))
    out.push({
      code: "E-PIN-DRIFT", where: at,
      detail: `summary recorded ${canonJson(s.instrument)}, this host is ${canonJson(expected)}`,
    });

  if (s.pinObserved === null)
    out.push({
      code: "E-CORPUS-PIN", where: at,
      detail: `no readable .git/HEAD under ${s.localPath}; the measured bytes ` +
        `cannot be tied to the manifest pin ${s.pin}`,
    });
  else if (s.pinObserved !== s.pin)
    out.push({
      code: "E-CORPUS-PIN", where: at,
      detail: `checkout is at ${s.pinObserved}; corpus-manifest.json names ${s.pin}`,
    });

  return out;
}

export const gateReport: Effect.Effect<
  GateReport, never, FileSystem.FileSystem | Path.Path | CensusPaths
> = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* CensusPaths;

  const files = yield* summaryFiles;
  if (files.length === 0)
    return {
      kind: "not-run" as const,
      out: paths.out,
      hint: "nothing captured on this host; `mise run census:capture` needs the " +
        "gitignored corpus/ (see corpus-manifest.json's fetchMethod)",
    };

  const findings: Finding[] = [];
  let filesSeen = 0, sliceDeclarations = 0;
  for (const f of files) {
    const s = decodeSummary(JSON.parse(yield* fs.readFileString(f)));
    filesSeen += s.files;
    sliceDeclarations += s.declCountCk;
    findings.push(...adjudicate(s));
  }
  for (const d of pinDrift())
    findings.push({
      code: "E-PIN-DRIFT", where: "package.json",
      detail: `${d.what}: declared ${d.declared}, installed ${d.installed} — ` +
        `version drift of an admitted parser is a re-admission event`,
    });

  const report = {
    kind: "ran" as const,
    green: findings.length === 0,
    slices: files.length,
    files: filesSeen,
    sliceDeclarations,
    findings,
  };
  yield* fs.writeFileString(
    path.join(paths.out, "gate-report.json"), canonJson(report) + "\n");
  return report;
}).pipe(Effect.orDie);

/** Render the report and answer whether the gate is GREEN. `null` is the
 * third answer — not run — which is neither. */
export const runGate = Effect.gen(function* () {
  const r = yield* gateReport;
  if (r.kind === "not-run") {
    yield* Console.log(`CENSUS GATE NOT RUN — no captured slices under ${r.out}`);
    yield* Console.log(`  ${r.hint}`);
    return null;
  }
  yield* Console.log(
    `slices ${r.slices}; files ${r.files}; declarations ${r.sliceDeclarations} (summed over slice captures)`);
  for (const f of r.findings.slice(0, 20))
    yield* Console.log(`${f.code} ${f.where}: ${f.detail}`);
  if (r.findings.length > 20)
    yield* Console.log(`  … and ${r.findings.length - 20} more (see out/gate-report.json)`);
  yield* Console.log(r.green ? "CENSUS GATE GREEN" : "CENSUS GATE RED");
  return r.green;
});
