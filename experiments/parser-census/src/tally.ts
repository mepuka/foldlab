/**
 * `census:tally` — fold captured rows into `out/histogram.json`.
 *
 * Codes × strata × counts, with the spectrum roll-up (§9b.1). It is a pure
 * fold over committed-plus-captured data: it parses no source, consults no
 * parser, and cannot therefore disagree with the capture about anything. If
 * a number in the histogram is wrong, the row that produced it is on disk.
 *
 * The reproducibility rule the winkjs admission rows state as the GATE on
 * any statistical aid — "every tally must be reproducible by a batch
 * (non-streaming) replay of the same corpus slice" — is satisfied here
 * trivially and by construction: this IS the batch replay, over the rows,
 * with plain integer counters and no estimator, no interval, and no
 * streaming approximation anywhere. That is also why the census needs
 * neither `winkComposer` nor `wink-statistics` (see README, "TOOLS.md
 * disposition").
 */
import { Console, Effect, FileSystem, Path } from "effect";
import { CensusPaths } from "./CensusPaths";
import { DECL_KINDS, type DeclKind } from "./census-contract";
import { canonJson } from "./legs";
import { INSTRUMENT, PROVISIONAL_REASON } from "./pins";

interface Bucket {
  declarations: number;
  variance: number;
  candidates: number;
  lifted: number;
  refused: number;
  kinds: Record<string, number>;
  codes: Record<string, number>;
  spectrum: Record<string, number>;
}

const emptyBucket = (): Bucket => ({
  declarations: 0, variance: 0, candidates: 0, lifted: 0, refused: 0,
  // Every declaration kind is present at zero rather than absent: a stratum
  // with no interfaces should SAY so, and a consumer should never have to
  // decide whether a missing key means zero or means "not measured".
  kinds: Object.fromEntries(DECL_KINDS.map((k) => [k, 0])),
  codes: {}, spectrum: {},
});

const bump = (r: Record<string, number>, k: string) => { r[k] = (r[k] ?? 0) + 1; };

function add(b: Bucket, row: {
  kind: DeclKind; variance: boolean;
  verdict: string | null; code: string | null; spectrum: string | null;
}): void {
  b.declarations++;
  if (row.variance) b.variance++;
  bump(b.kinds, row.kind);
  if (row.verdict === null) return;
  b.candidates++;
  if (row.verdict === "lifted") { b.lifted++; return; }
  b.refused++;
  if (row.code !== null) bump(b.codes, row.code);
  // A refusal whose code is outside the pinned taxonomy has no spectrum
  // class, and it is counted as `unclassified` rather than dropped: a code
  // the census cannot place is a defect to see, not a row to lose.
  bump(b.spectrum, row.spectrum ?? "unclassified");
}

/** Every `<slice>.rows.jsonl` under `out/`, sorted — the fold's input, in a
 * host-independent order so the histogram's bytes do not depend on the order
 * a directory happened to be read in.
 *
 * `canonical` marks, per project, the ONE slice file that stands for it. A
 * project carrying three labels is captured three times over the SAME tree,
 * so its declarations appear in three row files; folding all of them into a
 * corpus total would multiply that project's declarations by how many labels
 * it happens to carry. The strata still get every capture — a stratum IS a
 * label, and a declaration belongs to every stratum whose label its project
 * carries — but the corpus total and the per-project figures count each
 * declaration once. The canonical slice is the alphabetically first, which
 * is also the order `select` emits pairs in, so the choice is stable. */
interface RowFile {
  readonly path: string;
  readonly project: string;
  readonly canonical: boolean;
}

const rowFiles = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* CensusPaths;
  if (!(yield* fs.exists(paths.out))) return [] as RowFile[];
  const out: RowFile[] = [];
  for (const d of [...(yield* fs.readDirectory(paths.out))].sort()) {
    const dir = path.join(paths.out, d);
    const info = yield* fs.stat(dir).pipe(Effect.option);
    if (info._tag === "None" || info.value.type !== "Directory") continue;
    let firstSeen = false;
    for (const f of [...(yield* fs.readDirectory(dir))].sort())
      if (f.endsWith(".rows.jsonl")) {
        out.push({ path: path.join(dir, f), project: d, canonical: !firstSeen });
        firstSeen = true;
      }
  }
  return out;
});

export const runTally = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* CensusPaths;

  const files = yield* rowFiles;
  if (files.length === 0) {
    yield* Console.log(`TALLY NOT RUN — no captured rows under ${paths.out}`);
    yield* Console.log("  run `mise run census:capture` first (it needs the gitignored corpus/)");
    return null;
  }

  const total = emptyBucket();
  const byStratum: Record<string, Bucket> = {};
  const byProject: Record<string, Bucket> = {};
  let rows = 0, twinDisagreeingRows = 0, twinDisjointRows = 0;

  for (const f of files) {
    const text = yield* fs.readFileString(f.path);
    for (const line of text.split("\n")) {
      if (line === "") continue;
      const row = JSON.parse(line) as {
        project: string; slice: string; kind: DeclKind; variance: boolean;
        verdict: string | null; code: string | null; spectrum: string | null;
        twin: string;
      };
      rows++;
      // A stratum is a label: every capture counts, including the second and
      // third capture of a project that carries several labels.
      add((byStratum[row.slice] ??= emptyBucket()), row);
      // The corpus total and the per-project figures count each declaration
      // once, from the project's canonical slice only.
      if (!f.canonical) continue;
      if (row.twin === "disagree") twinDisagreeingRows++;
      if (row.twin === "disjoint") twinDisjointRows++;
      add(total, row);
      add((byProject[row.project] ??= emptyBucket()), row);
    }
  }

  const sortKeys = <T>(r: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]]));

  const histogram = {
    instrument: INSTRUMENT,
    provisional: PROVISIONAL_REASON,
    note:
      "Counts only. Every number is an exact integer count over the captured " +
      "rows; no estimator, no interval, no sampling correction. The strata are " +
      "the CLOSED labels of project-labels.json, and a slice is a whole project " +
      "tree attributed to one of its labels (project-labels.json's `slices` are " +
      "prose, not machine globs — see src/corpus.ts). `total` and `byProject` " +
      "count each declaration ONCE, from each project's canonical (alphabetically " +
      "first) slice; `byStratum` counts every capture, because a declaration " +
      "belongs to every stratum whose label its project carries. So the strata " +
      "do not sum to the total, by design — `rows` is the raw line count.",
    rows,
    twinDisagreeingRows,
    twinDisjointRows,
    sources: files.map((f) =>
      (f.canonical ? "" : "(non-canonical) ") +
      path.relative(paths.out, f.path).split("\\").join("/")).sort(),
    total,
    byStratum: sortKeys(byStratum),
    byProject: sortKeys(byProject),
  };

  const outPath = path.join(paths.out, "histogram.json");
  yield* fs.writeFileString(outPath, canonJson(histogram) + "\n");

  yield* Console.log(`rows ${rows} from ${files.length} slice files`);
  yield* Console.log(
    `declarations ${total.declarations}; variance ${total.variance}; ` +
    `candidates ${total.candidates} (lifted ${total.lifted}, refused ${total.refused})`);
  for (const [k, v] of Object.entries(total.codes).sort((a, b) => b[1] - a[1]))
    yield* Console.log(`  ${k.padEnd(26)} ${v}`);
  yield* Console.log(`spectrum: ${canonJson(total.spectrum)}`);
  yield* Console.log(`wrote ${outPath}`);
  return histogram;
});
