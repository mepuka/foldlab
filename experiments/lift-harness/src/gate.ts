// The multi-parser agreement gate — the harness's ONLY trust mechanism
// and its open invocation seam: an engine (this ck leg, the oxc plugin,
// a future Lean walker) is admitted exactly when its verdicts are
// canon-identical on the 265 by-construction fixtures. `verdictKey`
// (contract) defines the equality; nothing else does.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonJson, verdictKey, type Verdict } from "./contract";
import { liftSource } from "./lift";

// fileURLToPath, not `.pathname`: on Windows the latter yields "/C:/…",
// which every node:fs call rejects. Host-portable by construction.
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const FIXTURES = join(HERE, "../../../.staging/fixture-gen/ts-leg/fixtures");

/** The gate's outcome, as data. A missing fixture lane is a REPORTED state,
 * never a crash: `.staging/fixture-gen/` is gitignored, so a fresh clone has
 * the harness without the corpus, and "I could not check" must not be
 * mistaken for either green or red. */
export type GateReport =
  | { kind: "missing-lane"; fixtures: string; hint: string }
  | {
      kind: "ran";
      green: boolean;
      files: number;
      agree: number;
      ckLifts: number;
      oxLifts: number;
      disagreements: string[];
    };

/** The fixture corpus, or an empty list when the lane is absent on this
 * host. Callers that need to distinguish "no fixtures" from "no lane" ask
 * `hasFixtureLane()`. */
export function fixtureFiles(): string[] {
  if (!hasFixtureLane()) return [];
  return readdirSync(FIXTURES).filter((f) => f.endsWith(".ts")).sort()
    .map((f) => join(FIXTURES, f));
}

export const hasFixtureLane = (): boolean => existsSync(FIXTURES);

/** oxc engine invocation: one oxlint run, evidence out of diagnostics.
 * (oxlint ignores dot-directories, so fixture files are passed explicitly.) */
export function runOxc(files: string[]): Map<string, Verdict[]> {
  const byFile = new Map<string, Verdict[]>();
  // Chunked: Windows rejects a single argv carrying 265 absolute paths
  // (ENAMETOOLONG from uv_spawn). Each file is linted independently, so
  // batching changes nothing but the process count.
  for (const batch of chunk(files, 6000)) {
    // node:child_process, not Bun.spawnSync: the engine has to be callable
    // from the test runner (node) as well as the CLI (bun). An engine that
    // only one runtime can invoke is not an engine the gate can admit.
    const proc = spawnSync(
      join(HERE, "../node_modules/.bin/oxlint"),
      ["-c", join(HERE, "../.oxlintrc.json"), "-A", "all", "--format", "json", ...batch],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, shell: process.platform === "win32" },
    );
    const out = JSON.parse(proc.stdout);
    for (const d of out.diagnostics ?? []) {
      if (d.code !== "dslv0(lift)") continue;
      const k = pathKey(d.filename);
      (byFile.get(k) ?? byFile.set(k, []).get(k)!).push(JSON.parse(d.message));
    }
  }
  return byFile;
}

/** Separator-normalized path key. oxlint reports "C:/…" while node:path
 * `join` yields "C:\…" on Windows; without this the gate silently reads
 * every oxc verdict as absent and calls it a disagreement. */
export const pathKey = (p: string): string => p.split("\\").join("/");

/** Split a path list into batches whose joined length stays under `budget`. */
function chunk(files: string[], budget: number): string[][] {
  const out: string[][] = [];
  let cur: string[] = [], len = 0;
  for (const f of files) {
    if (cur.length && len + f.length + 1 > budget) { out.push(cur); cur = []; len = 0; }
    cur.push(f); len += f.length + 1;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Run the gate and return its outcome as data. Printing is the caller's
 * job — a test tier wants the report, not stdout. */
export function gateReport(): GateReport {
  if (!hasFixtureLane())
    return {
      kind: "missing-lane",
      fixtures: FIXTURES,
      hint: "the fixture-gen lane is gitignored; regenerate it with `mise run gen` in .staging/fixture-gen/",
    };
  const files = fixtureFiles();
  const oxc = runOxc(files);
  let agree = 0, ckLifts = 0, oxLifts = 0;
  const disagreements: string[] = [];
  for (const f of files) {
    const ck = liftSource(readFileSync(f, "utf8"));
    const ox = oxc.get(pathKey(f)) ?? [];
    ckLifts += ck.filter((v) => v.kind === "lifted").length;
    oxLifts += ox.filter((v) => v.kind === "lifted").length;
    // R10 — DECLARATION ORDER, not sorted. Two engines that disagree about
    // which declaration refused must not be able to hide behind a sort.
    // Detail strings ride along inside `verdictKey`.
    if (canonJson(ck.map(verdictKey)) === canonJson(ox.map(verdictKey))) agree++;
    else disagreements.push(basename(f));
  }
  return {
    kind: "ran",
    green: disagreements.length === 0 && ckLifts === LIFTS_EXPECTED && oxLifts === LIFTS_EXPECTED,
    files: files.length, agree, ckLifts, oxLifts, disagreements,
  };
}

/** The by-construction corpus carries exactly this many lifts; a run that
 * finds fewer is recognizing less than it did, however well it agrees. */
export const LIFTS_EXPECTED = 9;

export function runGate(): boolean {
  const r = gateReport();
  if (r.kind === "missing-lane") {
    console.log(`GATE NOT RUN — fixture lane absent at ${r.fixtures}`);
    console.log(`  ${r.hint}`);
    return false;
  }
  console.log(`fixtures ${r.files}; verdict agreement ${r.agree}/${r.files}`);
  console.log(`lifts: ck ${r.ckLifts}, oxc ${r.oxLifts} (must both be ${LIFTS_EXPECTED})`);
  for (const d of r.disagreements.slice(0, 8)) console.log("DISAGREE", d);
  console.log(r.green ? "MULTI-PARSER AGREEMENT GATE GREEN" : "GATE RED");
  return r.green;
}
