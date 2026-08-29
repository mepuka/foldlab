/**
 * The multi-parser agreement gate — the harness's ONLY trust mechanism
 * and its open invocation seam: an engine (this ck leg, the oxc plugin,
 * a future Lean walker) is admitted exactly when its verdicts are
 * canon-identical on the by-construction fixtures. `verdictKey` (contract)
 * defines the equality; nothing else does.
 *
 * Pure Effect: no `node:*` import, no `Bun` global, no default filesystem,
 * and no arithmetic on this module's own URL. `FileSystem`, `Path`, the
 * child-process spawner and `HarnessPaths` all stay in the requirement
 * channel — the gate names what it needs and the caller decides what
 * supplies it. Where the fixtures LIVE is a deployment fact, so it arrives
 * as a service rather than as `../../..` computed here; that is also what
 * lets a test point this gate at a corpus it built itself.
 */
import { Console, Effect, Schema, Stream } from "effect";
import { FileSystem, Path } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { canonJson, decodeVerdict, verdictKey, type Verdict } from "./contract";
import { HarnessPaths } from "./HarnessPaths";
import { liftSource } from "./lift";

/** The by-construction corpus carries exactly this many lifts; a run that
 * finds fewer is recognizing less than it did, however well it agrees. */
export const LIFTS_EXPECTED = 9;

/** Separator-normalized path key. oxlint reports "C:/…" while `Path.join`
 * yields "C:\…" on Windows; without this the gate silently reads every oxc
 * verdict as absent and calls it a disagreement. */
export const pathKey = (p: string): string => p.split("\\").join("/");

export const hasFixtureLane = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* HarnessPaths;
  return yield* fs.exists(paths.fixtures);
});

/** The fixture corpus, or an empty list when the lane is absent on this
 * host. Callers that must distinguish "no fixtures" from "no lane" ask
 * `hasFixtureLane`. */
export const fixtureFiles = Effect.gen(function* () {
  if (!(yield* hasFixtureLane)) return [] as string[];
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* HarnessPaths;
  const entries = yield* fs.readDirectory(paths.fixtures);
  return entries.filter((f) => f.endsWith(".ts")).sort()
    .map((f) => path.join(paths.fixtures, f));
});

/** The shape oxlint's `--format json` emits. Decoded, not asserted: this is
 * another process's output, and the one place a silent shape change would
 * turn into a wrong gate result rather than an error. */
// oxlint's report carries entries this gate does not consume, and they do
// not all share a shape — some have no `code` at all. So the envelope stays
// permissive and the ENTRY we act on is decoded strictly: validate exactly
// what is read, tolerate what is ignored. A stricter envelope would turn
// another tool's unrelated diagnostic into a gate failure.
const OxlintReport = Schema.Struct({
  diagnostics: Schema.optional(Schema.Array(Schema.Record(Schema.String, Schema.Unknown))),
});
const decodeOxlint = Schema.decodeUnknownSync(OxlintReport);

const LiftDiagnostic = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  filename: Schema.String,
});
const decodeLiftDiagnostic = Schema.decodeUnknownSync(LiftDiagnostic);

/** Split a path list into batches whose joined length stays under `budget`.
 * (Observed: a single argv carrying 265 absolute paths exceeds the Windows
 * spawn limit — ENAMETOOLONG. Each file is linted independently, so
 * batching changes nothing but the process count.) */
export function chunk(files: ReadonlyArray<string>, budget: number): string[][] {
  const out: string[][] = [];
  let cur: string[] = [], len = 0;
  for (const f of files) {
    if (cur.length && len + f.length + 1 > budget) { out.push(cur); cur = []; len = 0; }
    cur.push(f); len += f.length + 1;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Run one oxlint invocation and return its stdout. The spawned process is
 * the scope's resource, so it is reaped whether or not parsing succeeds. */
const oxlintStdout = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const paths = yield* HarnessPaths;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(ChildProcess.make(paths.oxlintBin, [...args]));
    const chunks = yield* Stream.runCollect(handle.stdout);
    yield* handle.exitCode;   // oxlint exits non-zero when it reports; expected
    const decoder = new TextDecoder();
    return Array.from(chunks, (c) => decoder.decode(c)).join("");
  }).pipe(Effect.scoped);

/** oxc engine invocation: oxlint runs, evidence comes out of diagnostics.
 * (oxlint ignores dot-directories, so fixture files are passed explicitly.) */
export const runOxc = (files: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const byFile = new Map<string, Verdict[]>();
    if (files.length === 0) return byFile;
    const paths = yield* HarnessPaths;
    for (const batch of chunk(files, 6000)) {
      const stdout = yield* oxlintStdout([
        "-c", paths.oxlintConfig, "-A", "all", "--format", "json", ...batch,
      ]);
      for (const raw of decodeOxlint(JSON.parse(stdout)).diagnostics ?? []) {
        if (raw["code"] !== "dslv0(lift)") continue;
        const d = decodeLiftDiagnostic(raw);
        const k = pathKey(d.filename);
        let list = byFile.get(k);
        if (list === undefined) { list = []; byFile.set(k, list); }
        list.push(decodeVerdict(JSON.parse(d.message)));
      }
    }
    return byFile;
  });

/** The gate's outcome, as data. A missing fixture lane is a REPORTED state,
 * never a crash: `.staging/fixture-gen/` is gitignored, so a fresh clone has
 * the harness without the corpus, and "I could not check" must not be
 * mistaken for either green or red. */
export type GateReport =
  | { readonly kind: "missing-lane"; readonly fixtures: string; readonly hint: string }
  | {
      readonly kind: "ran";
      readonly green: boolean;
      readonly files: number;
      readonly agree: number;
      readonly ckLifts: number;
      readonly oxLifts: number;
      readonly disagreements: ReadonlyArray<string>;
    };

export const gateReport: Effect.Effect<
  GateReport, never,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner | HarnessPaths
> = Effect.gen(function* () {
  const paths = yield* HarnessPaths;
  if (!(yield* hasFixtureLane))
    return {
      kind: "missing-lane" as const,
      fixtures: paths.fixtures,
      hint: "the fixture-gen lane is gitignored; regenerate it with `mise run gen` in .staging/fixture-gen/",
    };
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fixtureFiles;
  const oxc = yield* runOxc(files);
  let agree = 0, ckLifts = 0, oxLifts = 0;
  const disagreements: string[] = [];
  for (const f of files) {
    const ck = liftSource(yield* fs.readFileString(f));
    const ox = oxc.get(pathKey(f)) ?? [];
    ckLifts += ck.filter((v) => v.kind === "lifted").length;
    oxLifts += ox.filter((v) => v.kind === "lifted").length;
    // R10 — DECLARATION ORDER, not sorted. Two engines that disagree about
    // which declaration refused must not be able to hide behind a sort.
    // Detail strings ride along inside `verdictKey`.
    if (canonJson(ck.map(verdictKey)) === canonJson(ox.map(verdictKey))) agree++;
    else disagreements.push(path.basename(f));
  }
  return {
    kind: "ran" as const,
    green: disagreements.length === 0 && ckLifts === LIFTS_EXPECTED && oxLifts === LIFTS_EXPECTED,
    files: files.length, agree, ckLifts, oxLifts, disagreements,
  };
}).pipe(Effect.orDie);

/** Render a report and answer whether the gate is green. */
export const runGate = Effect.gen(function* () {
  const r = yield* gateReport;
  if (r.kind === "missing-lane") {
    yield* Console.log(`GATE NOT RUN — fixture lane absent at ${r.fixtures}`);
    yield* Console.log(`  ${r.hint}`);
    return false;
  }
  yield* Console.log(`fixtures ${r.files}; verdict agreement ${r.agree}/${r.files}`);
  yield* Console.log(`lifts: ck ${r.ckLifts}, oxc ${r.oxLifts} (must both be ${LIFTS_EXPECTED})`);
  for (const d of r.disagreements.slice(0, 8)) yield* Console.log(`DISAGREE ${d}`);
  yield* Console.log(r.green ? "MULTI-PARSER AGREEMENT GATE GREEN" : "GATE RED");
  return r.green;
});
