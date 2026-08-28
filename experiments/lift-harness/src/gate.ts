// The multi-parser agreement gate — the harness's ONLY trust mechanism
// and its open invocation seam: an engine (this ck leg, the oxc plugin,
// a future Lean walker) is admitted exactly when its verdicts are
// canon-identical on the 265 by-construction fixtures. `verdictKey`
// (contract) defines the equality; nothing else does.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { canonJson, verdictKey, type Verdict } from "./contract";
import { liftSource } from "./lift";

const HERE = new URL(".", import.meta.url).pathname;
export const FIXTURES = join(HERE, "../../../.staging/fixture-gen/ts-leg/fixtures");

/** oxc engine invocation: one oxlint run, evidence out of diagnostics.
 * (oxlint ignores dot-directories, so fixture files are passed explicitly.) */
export function runOxc(files: string[]): Map<string, Verdict[]> {
  const proc = Bun.spawnSync([
    join(HERE, "../node_modules/.bin/oxlint"),
    "-c", join(HERE, "../.oxlintrc.json"), "-A", "all", "--format", "json", ...files,
  ]);
  const out = JSON.parse(proc.stdout.toString());
  const byFile = new Map<string, Verdict[]>();
  for (const d of out.diagnostics ?? []) {
    if (d.code !== "dslv0(lift)") continue;
    (byFile.get(d.filename) ?? byFile.set(d.filename, []).get(d.filename)!)
      .push(JSON.parse(d.message));
  }
  return byFile;
}

export function runGate(): boolean {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith(".ts")).sort()
    .map((f) => join(FIXTURES, f));
  const oxc = runOxc(files);
  let agree = 0, ckLifts = 0, oxLifts = 0;
  const disagreements: string[] = [];
  for (const f of files) {
    const ck = liftSource(readFileSync(f, "utf8"));
    const ox = oxc.get(f) ?? [];
    ckLifts += ck.filter((v) => v.kind === "lifted").length;
    oxLifts += ox.filter((v) => v.kind === "lifted").length;
    const a = canonJson(ck.map(verdictKey).sort());
    const b = canonJson(ox.map(verdictKey).sort());
    if (a === b) agree++;
    else disagreements.push(f.split("/").pop()!);
  }
  console.log(`fixtures ${files.length}; verdict agreement ${agree}/${files.length}`);
  console.log(`lifts: ck ${ckLifts}, oxc ${oxLifts} (must both be 9)`);
  for (const d of disagreements.slice(0, 8)) console.log("DISAGREE", d);
  const green = disagreements.length === 0 && ckLifts === 9 && oxLifts === 9;
  console.log(green ? "MULTI-PARSER AGREEMENT GATE GREEN" : "GATE RED");
  return green;
}
