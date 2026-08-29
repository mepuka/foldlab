/**
 * `census:capture` — run both legs over one labelled slice.
 *
 * Outputs, at the stable paths the proposal fixes (§9b.1):
 *
 *   out/<project>/<slice>.rows.jsonl     one row per TypeScript declaration
 *   out/<project>/<slice>.summary.json   the fold the gate adjudicates
 *
 * IDEMPOTENT means the same committed inputs yield BYTE-IDENTICAL outputs,
 * and two runs that disagree are themselves a gate failure. So: files are
 * walked in sorted order, declarations are emitted in source order, every
 * object is rendered through the harness's canonical JSON (sorted keys at
 * every level), and nothing in a row is a timestamp, an absolute path, or a
 * host fact. The run's provenance lives in the SUMMARY, where it can be read
 * without making the rows unreproducible.
 *
 * The summary carries the pin the manifest names AND the pin the checkout is
 * observed at. A census whose bytes came from a different revision than the
 * committed manifest claims is not a census of the corpus, and `census:gate`
 * says so.
 */
import { Console, Effect, FileSystem, Path } from "effect";
import { CensusPaths } from "./CensusPaths";
import { WITNESS_CAP, type Row, type Summary } from "./census-contract";
import { observedPin, projectFiles, type CorpusProject } from "./corpus";
import { canonJson, observe, spectrumOf } from "./legs";
import { INSTRUMENT } from "./pins";

/** Rows are flushed in batches: a wild project can carry six figures of
 * declarations, and holding them all as strings before the first write is a
 * memory profile nobody needs. */
const FLUSH_ROWS = 4096;

export interface CaptureResult {
  readonly summary: Summary;
  readonly rowsPath: string;
  readonly summaryPath: string;
}

export const captureSlice = (project: CorpusProject, slice: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths = yield* CensusPaths;

    const dir = path.join(paths.repoRoot, project.localPath);
    const outDir = path.join(paths.out, project.id);
    yield* fs.makeDirectory(outDir, { recursive: true });
    const rowsPath = path.join(outDir, `${slice}.rows.jsonl`);
    const summaryPath = path.join(outDir, `${slice}.summary.json`);

    const files = yield* projectFiles(dir);
    // Relative, `/`-separated, sorted: the row's `file` must name the same
    // string on every host or the outputs are not byte-identical.
    const rel = (p: string) => path.relative(dir, p).split("\\").join("/");

    let buffer: string[] = [];
    let first = true;
    const flush = Effect.gen(function* () {
      if (buffer.length === 0) return;
      const data = buffer.join("");
      buffer = [];
      yield* fs.writeFileString(rowsPath, data, first ? undefined : { flag: "a" });
      first = false;
    });

    let filesAgreed = 0, declCountCk = 0, declCountOxc = 0;
    let declCountCorroborated = 0, declCountUncorroboratedCk = 0, declCountUncorroboratedOxc = 0;
    let unparsedCk = 0, unparsedOxc = 0;
    let candidates = 0, lifted = 0, refused = 0, varianceDecls = 0;
    let declDisagreementCount = 0, verdictDisagreementCount = 0, parseDisjointCount = 0;
    const declDisagreements: Array<{ file: string; ck: string; oxc: string }> = [];
    const verdictDisagreements: Array<{ file: string; ck: string; oxc: string }> = [];
    const parseDisjoint: Array<{ file: string; ck: boolean; oxc: boolean }> = [];

    for (const f of files) {
      const src = yield* fs.readFileString(f).pipe(Effect.orElseSucceed(() => ""));
      const o = observe(src);
      const file = rel(f);

      if (!o.parsedCk) unparsedCk++;
      if (!o.parsedOxc) unparsedOxc++;
      declCountCk += o.declsCk.length;
      declCountOxc += o.declsOxc.length;
      // Corroboration is a per-FILE fact: only a file both legs read, and
      // read the same way, contributes declarations the twin has seen.
      if (o.parsedCk && o.parsedOxc && o.declAgree) declCountCorroborated += o.declsCk.length;
      else {
        declCountUncorroboratedCk += o.declsCk.length;
        declCountUncorroboratedOxc += o.declsOxc.length;
      }
      if (o.parseDisjoint) {
        parseDisjointCount++;
        if (parseDisjoint.length < WITNESS_CAP)
          parseDisjoint.push({ file, ck: o.parsedCk, oxc: o.parsedOxc });
      }
      if (o.declAgree) filesAgreed++;
      else {
        declDisagreementCount++;
        if (declDisagreements.length < WITNESS_CAP)
          declDisagreements.push({ file, ck: o.declKeyCk, oxc: o.declKeyOxc });
      }
      if (!o.verdictAgree) {
        verdictDisagreementCount++;
        if (verdictDisagreements.length < WITNESS_CAP)
          verdictDisagreements.push({ file, ck: o.verdictKeyCk, oxc: o.verdictKeyOxc });
      }

      // The ck leg's enumeration is the row spine — it is the admitted
      // Stage-1 extractor pin, and `twin` records whether the oxc leg saw
      // the same file the same way. A row is never invented from agreement:
      // a disagreeing file still emits its ck rows, marked.
      const twin = o.parseDisjoint ? "disjoint" as const
        : o.declAgree ? "agree" as const : "disagree" as const;
      const byName = new Map<string, { kind: "lifted" | "refusal"; code: string | null }>();
      for (const v of o.verdictsCk)
        if (!byName.has(v.name))
          byName.set(v.name, v.kind === "lifted"
            ? { kind: "lifted", code: null }
            : { kind: "refusal", code: v.code });

      for (const d of o.declsCk) {
        if (d.variance) varianceDecls++;
        const hit = d.kind === "variable" ? byName.get(d.name) : undefined;
        if (hit) {
          candidates++;
          if (hit.kind === "lifted") lifted++; else refused++;
        }
        const row: Row = {
          project: project.id, slice, file,
          kind: d.kind, name: d.name,
          exported: d.exported, ambient: d.ambient, variance: d.variance,
          verdict: hit ? hit.kind : null,
          code: hit ? hit.code : null,
          spectrum: hit && hit.code ? spectrumOf(hit.code) : null,
          twin,
        };
        buffer.push(canonJson(row) + "\n");
      }
      if (buffer.length >= FLUSH_ROWS) yield* flush;
    }
    yield* flush;
    // A slice with no rows must still leave the file, or a later tally
    // cannot tell "captured, empty" from "never captured".
    if (first) yield* fs.writeFileString(rowsPath, "");

    const summary: Summary = {
      project: project.id, slice,
      localPath: project.localPath,
      pin: project.pin,
      pinObserved: yield* observedPin(dir),
      instrument: INSTRUMENT,
      files: files.length, filesAgreed,
      declCountCk, declCountOxc,
      declCountCorroborated, declCountUncorroboratedCk, declCountUncorroboratedOxc,
      unparsedCk, unparsedOxc,
      candidates, lifted, refused, varianceDecls,
      declDisagreementCount, verdictDisagreementCount, parseDisjointCount,
      declDisagreements, verdictDisagreements, parseDisjoint,
    };
    yield* fs.writeFileString(summaryPath, canonJson(summary) + "\n");

    yield* Console.log(
      `  ${project.id}/${slice}: files ${files.length}, decls ${declCountCk}` +
      ` (corroborated ${declCountCorroborated}), variance ${varianceDecls},` +
      ` candidates ${candidates} (lifted ${lifted}, refused ${refused}),` +
      ` twin ${filesAgreed}/${files.length}`);

    return { summary, rowsPath, summaryPath } satisfies CaptureResult;
  });
