/**
 * `census:manifest` — write the measured `declCount` back into the committed
 * corpus manifest.
 *
 * `corpus-manifest.json`'s own header says how this number is allowed to
 * arrive: "declCount is null pending a census instrument run — never
 * hand-counted." So the only thing permitted to fill it is a run, and the
 * only run permitted to fill it is one the gate accepted.
 *
 * THE ADMISSION RULE, and the one distinction it turns on.
 *
 * A project's `declCount` is written only when every slice captured for it
 * is free of findings that impeach the COUNT: the two legs enumerated the
 * same declarations wherever both could read the file, reached the same
 * verdicts, ran under the admitted pins, and measured a checkout at the
 * revision the manifest names. A project with any of those keeps its old
 * value and gains a `declCountNote` saying why. A number that entered the
 * committed artifact under an instrument disagreement would be worse than
 * `null`: `null` is honest about not knowing.
 *
 * `E-PARSE-DISJOINT` is deliberately NOT in that list. A file only one leg
 * can parse does not make the other leg wrong about the declarations it did
 * read — it means part of the count has no second witness. Holding the
 * whole project's count for it would discard a good measurement to avoid
 * naming a caveat. So the caveat is named instead: the count is written with
 * `declCountUncorroborated`, the exact number of declarations no second
 * instrument has seen. The gate still reports the finding and still goes
 * red; the artifact still gets its number, with the residue on its face.
 *
 * The manifest is rewritten from the PARSED ORIGINAL object, key order
 * preserved, so the diff shows the counts and nothing else.
 */
import { Console, Effect, FileSystem } from "effect";
import { CensusPaths } from "./CensusPaths";
import { decodeSummary, type Summary } from "./census-contract";
import { adjudicate } from "./gate";
import { INSTRUMENT, PINS, PROVISIONAL_REASON, STAMP } from "./pins";

interface ManifestProject {
  id: string;
  declCount: number | null;
  declCountStamp?: string;
  declCountUncorroborated?: number;
  declCountNote?: string;
  [k: string]: unknown;
}

interface ManifestDoc {
  _provenance: string;
  declCountProvenance?: unknown;
  projects: ManifestProject[];
  [k: string]: unknown;
}

const summaryPaths = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* CensusPaths;
  if (!(yield* fs.exists(paths.out))) return [] as string[];
  const out: string[] = [];
  for (const d of [...(yield* fs.readDirectory(paths.out))].sort()) {
    const dir = `${paths.out}/${d}`;
    const info = yield* fs.stat(dir).pipe(Effect.option);
    if (info._tag === "None" || info.value.type !== "Directory") continue;
    for (const f of [...(yield* fs.readDirectory(dir))].sort())
      if (f.endsWith(".summary.json")) out.push(`${dir}/${f}`);
  }
  return out;
});

export const writeDeclCounts = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* CensusPaths;

  const files = yield* summaryPaths;
  if (files.length === 0) {
    yield* Console.log(`MANIFEST NOT UPDATED — no captured slices under ${paths.out}`);
    return;
  }

  // Per project: the declaration count, and whether every one of its slices
  // was finding-free. Slices of one project partition nothing — a project
  // carrying two labels is captured twice over the SAME tree — so the count
  // is the per-slice count, asserted equal across that project's slices
  // rather than summed. Summing would multiply a project's declarations by
  // how many labels it happens to carry.
  const counts = new Map<string, number>();
  const uncorroborated = new Map<string, number>();
  const clean = new Map<string, boolean>();
  for (const f of files) {
    const s: Summary = decodeSummary(JSON.parse(yield* fs.readFileString(f)));
    // Everything except the parse-disjointness finding impeaches the count.
    const impeaching = adjudicate(s).filter((x) => x.code !== "E-PARSE-DISJOINT");
    const prev = counts.get(s.project);
    if (prev !== undefined && prev !== s.declCountCk)
      // Two slices of one project measured the same tree and disagreed:
      // that is an instrument defect, not a number to average.
      clean.set(s.project, false);
    counts.set(s.project, s.declCountCk);
    uncorroborated.set(s.project, s.declCountUncorroboratedCk);
    clean.set(s.project, (clean.get(s.project) ?? true) && impeaching.length === 0);
  }

  const doc = JSON.parse(yield* fs.readFileString(paths.corpusManifest)) as ManifestDoc;
  let written = 0, held = 0;
  for (const p of doc.projects) {
    const n = counts.get(p.id);
    if (n === undefined) continue;
    if (clean.get(p.id) === true) {
      // THE COUNT AND ITS STAMP ARE WRITTEN TOGETHER, in one statement, so
      // there is no path through this code that emits one without the
      // other. That is the operator's requirement made structural rather
      // than remembered: an unstamped count cannot be produced here.
      p.declCount = n;
      p.declCountStamp = STAMP;
      const u = uncorroborated.get(p.id) ?? 0;
      if (u > 0) p.declCountUncorroborated = u;
      else delete p.declCountUncorroborated;
      delete p.declCountNote;
      written++;
    } else {
      p.declCountNote =
        `census v0 measured ${n} declarations, HELD: the run carried findings ` +
        `impeaching the count (see out/gate-report.json). declCount stays as recorded.`;
      held++;
    }
  }

  doc._provenance = doc._provenance.replace(
    "declCount is null pending a census instrument run - never hand-counted.",
    "declCount is the parser-census instrument's measurement - never hand-counted: " +
    `the count of top-level TypeScript declarations (the unit fixed in ` +
    `experiments/parser-census/src/census-contract.ts) under localPath, ` +
    `excluding vendored and build directories, read by two admitted legs ` +
    `(typescript@${PINS.typescript} and oxc-parser@${PINS.oxcParser}) and written ` +
    `only for projects whose run carried no finding impeaching the count. Every ` +
    `count carries declCountStamp, and declCountUncorroborated where part of it ` +
    `has no second witness; see declCountProvenance.`);

  // The stamp's expansion, once. Per-project `declCountStamp` stays a single
  // line because it repeats 34 times; this is where it is spelled out.
  doc.declCountProvenance = {
    stamp: STAMP,
    instrument: INSTRUMENT,
    provisional: PROVISIONAL_REASON,
    unit: "top-level TypeScript declaration, defined in " +
      "experiments/parser-census/src/census-contract.ts",
    admission: "written only for projects whose run carried no finding impeaching " +
      "the count: both legs enumerated the same declarations wherever both could " +
      "read the file, reached the same verdicts, ran under the admitted pins, and " +
      "measured a checkout at the revision this manifest names",
    declCountUncorroborated: "declarations the second leg could not see because " +
      "its parser rejected the file (E-PARSE-DISJOINT). Present only when non-zero. " +
      "The count is still the ck leg's honest measurement; this is the size of the " +
      "residue no second instrument has witnessed",
  };

  // One-space indent and a trailing newline — the file's existing shape,
  // preserved exactly. A reformat here would bury the counts in a whole-file
  // diff, and the point of writing them back is that they are reviewable.
  yield* fs.writeFileString(paths.corpusManifest, JSON.stringify(doc, null, 1) + "\n");
  yield* Console.log(`corpus-manifest.json: ${written} declCount(s) written, ${held} held`);
});
