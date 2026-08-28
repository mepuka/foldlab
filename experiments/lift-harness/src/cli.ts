// One CLI for the harness. Subcommands are thin adapters over pure
// engine functions — the invocation seam stays `source → Verdict[]`.
//
//   bun src/cli.ts gate                 the multi-parser agreement gate
//   bun src/cli.ts lift <file...>       ck-engine verdicts, canonical JSON
//   bun src/cli.ts census               wild refusal histogram + spectrum
//   bun src/cli.ts sieve <file>         anchor-gated line scores
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECTRUM, canonJson } from "./contract";
import { liftSource } from "./lift";
import { runGate } from "./gate";
import { effectBindings, grams, translitFile } from "./sieve";

// fileURLToPath, not `.pathname` (Windows yields "/C:/…"; node:fs rejects it).
const ROOT = fileURLToPath(new URL("../../..", import.meta.url)); // repo root, host-portable
const HERE = fileURLToPath(new URL(".", import.meta.url));
const [cmd, ...args] = process.argv.slice(2);

function* walkTs(d: string): Generator<string> {
  let es: string[];
  try { es = readdirSync(d).sort(); } catch { return; }
  for (const e of es) {
    if (e === "node_modules" || e === ".git" || e === "dist" || e === ".next") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) yield* walkTs(p);
    else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) yield p;
  }
}

if (cmd === "gate") {
  process.exit(runGate() ? 0 : 1);
} else if (cmd === "lift") {
  for (const f of args)
    for (const v of liftSource(readFileSync(f, "utf8"))) console.log(canonJson(v));
} else if (cmd === "census") {
  const man = JSON.parse(readFileSync(join(ROOT, "experiments/parser-census/corpus-manifest.json"), "utf8"));
  const dirs: string[] = man.projects
    .filter((p: { labels: string[] }) => p.labels.includes("wild-effect"))
    .map((p: { localPath: string }) => p.localPath);
  const codeHist: Record<string, number> = {};
  const spectrumHist: Record<string, number> = {};
  let candidates = 0, lifted = 0;
  for (const d of dirs) for (const f of walkTs(join(ROOT, d))) {
    let src: string;
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    if (!src.includes(".gen(")) continue;
    let vs; try { vs = liftSource(src); } catch { continue; }
    for (const v of vs) {
      candidates++;
      if (v.kind === "lifted") { lifted++; continue; }
      codeHist[v.code] = (codeHist[v.code] ?? 0) + 1;
      spectrumHist[SPECTRUM[v.code]] = (spectrumHist[SPECTRUM[v.code]] ?? 0) + 1;
    }
  }
  console.log(`candidates ${candidates}, lifted ${lifted}`);
  for (const [k, v] of Object.entries(codeHist).sort((a, b) => b[1] - a[1]))
    console.log(`  ${k.padEnd(26)} ${v}`);
  console.log("spectrum:", JSON.stringify(spectrumHist));
  writeFileSync(join(HERE, "../records/wild-linearizability.json"),
    JSON.stringify({ candidates, lifted, codeHist, spectrumHist }, null, 1) + "\n");
} else if (cmd === "sieve") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Classifier = require("wink-naive-bayes-text-classifier");
  const saved = JSON.parse(readFileSync(join(HERE, "../models/sieve-r1.json"), "utf8"));
  const nbc = Classifier();
  nbc.definePrepTasks([(t: string | string[]) => (Array.isArray(t) ? t : [t])]);
  nbc.importJSON(JSON.stringify(saved.model));
  nbc.consolidate();
  const score = (g: string[]) => {
    const m = new Map(nbc.computeOdds(g) as [string, number][]);
    return (m.get("effect") ?? 0) - (m.get("host") ?? 0);
  };
  const src = readFileSync(args[0], "utf8");
  if (effectBindings(src).size === 0) { console.log("zero-effect file (no bindings): silent by construction"); process.exit(0); }
  translitFile(src).forEach((r, i) => {
    if (r.sym.trim().length < 2) return;
    const fire = r.sym.includes("§") && score(grams(r.sym, r.depth, r.indent, saved.config.n)) > saved.config.threshold;
    if (fire) console.log(`${String(i + 1).padStart(5)}  ${r.line.trim().slice(0, 90)}`);
  });
} else {
  console.error("usage: bun src/cli.ts gate | lift <file...> | census | sieve <file>");
  process.exit(2);
}
