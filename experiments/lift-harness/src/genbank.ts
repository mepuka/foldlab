/**
 * The construct-universe enumerator — rung 2's bank backbone.
 *
 * Deterministically enumerates EVERY public construct of a pinned
 * `effect` package: each public module is imported and its exports
 * listed with their runtime kind. The universe is CLOSED under the pin,
 * so the bank's complement — constructs no pattern row covers — is
 * computed, never guessed: "the values we cannot model", enumerated.
 *
 * Modes:
 *   bun src/genbank.ts [--check]                      the harness pin (v4)
 *   bun src/genbank.ts --at <pkgDir> <out> [--check]  another pinned effect
 *
 * The second mode is the GENERATION-CANARY path: enumerate an older pin
 * the same way and `v4∖old` / `old∖v4` become computed canary sets —
 * generation detection as set difference, never heuristics. Older pins
 * (effect@3) declare every module explicitly in their exports map and
 * ship `dist/esm/<Name>.js`; they are imported by file URL so resolution
 * never touches the harness's own pin.
 *
 * Output is canonical JSON, regenerable byte-identically under the same
 * pin. Modules that fail to import are RECORDED as failures, never
 * silently dropped. This file enumerates; it does not taxonomize —
 * semantic classes and depth columns join as separate, ruled data.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonJson } from "./contract";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const argv = process.argv.slice(2);
const atMode = argv[0] === "--at";
const PKG = atMode ? argv[1] : join(HERE, "../node_modules/effect");
const OUT = atMode ? argv[2] : join(HERE, "../models/bank-r0.json");
const CHECK = argv.includes("--check");
const DIST = join(PKG, "dist");

type Spec = { spec: string; entry: string };

/** The harness pin's layout (v4): wildcard exports, module files under
 * `dist/`, namespaced groups with optional barrels. Group barrels are
 * spelled `effect/testing` etc.; `index.js` files are implementation
 * detail, and `internal/` is not public API. Bare specifiers resolve
 * against the harness's own node_modules — the same instance every
 * other module of this package imports. */
function v4Specs(): Spec[] {
  const out: Spec[] = [{ spec: "effect", entry: "effect" }];
  for (const f of readdirSync(DIST).sort()) {
    if (f.endsWith(".js") && f !== "index.js")
      out.push({ spec: `effect/${f.slice(0, -3)}`, entry: `effect/${f.slice(0, -3)}` });
  }
  for (const group of ["testing", "unstable"]) {
    if (readdirSync(join(DIST, group)).includes("index.js"))
      out.push({ spec: `effect/${group}`, entry: `effect/${group}` });
    for (const f of readdirSync(join(DIST, group)).sort()) {
      if (f.endsWith(".js") && f !== "index.js")
        out.push({ spec: `effect/${group}/${f.slice(0, -3)}`, entry: `effect/${group}/${f.slice(0, -3)}` });
      else if (!f.includes(".")) {
        out.push({ spec: `effect/${group}/${f}`, entry: `effect/${group}/${f}` });
        for (const g of readdirSync(join(DIST, group, f)).sort())
          if (g.endsWith(".js") && g !== "index.js")
            out.push({ spec: `effect/${group}/${f}/${g.slice(0, -3)}`, entry: `effect/${group}/${f}/${g.slice(0, -3)}` });
      }
    }
  }
  return out.filter((m) => !m.spec.includes("/internal"));
}

/** An explicit-exports pin (effect@3): modules straight from the map,
 * entries as file URLs into `dist/esm/`. */
function explicitSpecs(pkgJson: { exports: Record<string, unknown> }): Spec[] {
  const out: Spec[] = [];
  for (const k of Object.keys(pkgJson.exports).sort()) {
    if (k === ".") out.push({ spec: "effect", entry: pathToFileURL(join(DIST, "esm", "index.js")).href });
    else if (k.startsWith("./") && !k.startsWith("./.") && k !== "./package.json") {
      const name = k.slice(2);
      out.push({ spec: `effect/${name}`, entry: pathToFileURL(join(DIST, "esm", `${name}.js`)).href });
    }
  }
  return out;
}

type Row = {
  module: string;
  stability: "stable" | "testing" | "unstable";
  exports: Record<string, string>;  // export name → runtime kind (typeof)
};
type Failure = { module: string; error: string };

const pkgJson = JSON.parse(await Bun.file(join(PKG, "package.json")).text()) as {
  version: string; exports: Record<string, unknown>;
};
const wildcardLayout = Object.keys(pkgJson.exports).includes("./*");
const specs = wildcardLayout ? v4Specs() : explicitSpecs(pkgJson);

const rows: Row[] = [];
const failures: Failure[] = [];
for (const { spec, entry } of specs) {
  const stability = spec.includes("/unstable/") || spec === "effect/unstable" ? "unstable"
    : spec.includes("/testing") ? "testing" : "stable";
  try {
    const mod = await import(entry);
    const exports: Record<string, string> = {};
    for (const k of Object.keys(mod).sort()) {
      if (k === "default") continue;
      exports[k] = typeof (mod as Record<string, unknown>)[k];
    }
    rows.push({ module: spec, stability, exports });
  } catch (e) {
    failures.push({ module: spec, error: e instanceof Error ? e.message.split("\n")[0] : String(e) });
  }
}

const bank = {
  bankVersion: 0,
  pin: `effect@${pkgJson.version}`,
  modules: rows,
  importFailures: failures,
  counts: {
    modules: rows.length,
    constructs: rows.reduce((n, r) => n + Object.keys(r.exports).length, 0),
    failures: failures.length,
  },
};

const rendered = canonJson(bank) + "\n";
if (CHECK) {
  const actual = await Bun.file(OUT).text().catch(() => "");
  if (actual !== rendered) {
    console.error(`${OUT} differs from regeneration — run \`bun src/genbank.ts\``);
    process.exit(1);
  }
  console.log(`ok ${OUT} (${bank.counts.modules} modules, ${bank.counts.constructs} constructs)`);
} else {
  await Bun.write(OUT, rendered);
  console.log(`wrote ${OUT} (${bank.pin})`);
  console.log(`modules ${bank.counts.modules}, constructs ${bank.counts.constructs}, failures ${bank.counts.failures}`);
  for (const f of failures.slice(0, 8)) console.log(`  FAILED ${f.module}: ${f.error}`);
}
