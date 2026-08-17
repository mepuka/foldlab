#!/usr/bin/env node
// Own-authored, no third-party code. Run from the repository root:
//
//   bun docs/research/reference/rq4-verify-existing-implementations/subset-census.mjs
//   node docs/research/reference/rq4-verify-existing-implementations/subset-census.mjs
//
// What it does: counts, in the two pure decision routines that DEV-674/675
// concentrated the seam's behaviour into, the source constructs that the
// documented input subsets of the candidate verifiers exclude or handle
// badly. It is a census, not a verifier: a zero here does not mean a tool
// accepts the file, and a nonzero means the tool's own documentation says
// the construct is outside or weakly inside its subset.
//
// Every exclusion below is anchored to a primary source, quoted in
// ./README.md with its URL, commit/tag and retrieval date (2026-08-16).
// Nothing is asserted from memory.

import { readFileSync } from "node:fs";

const files = {
  "proto/go/protod/protocol_step.go": "go",
  "go/canonical/canonical.go": "go",
  "packages/moves/src/kernel.ts": "ts",
  "packages/moves/src/wire.ts": "ts",
  "packages/core/src/jcs.ts": "ts",
};

// lang -> [label, regex, why-it-matters, source-key in README.md]
const probes = {
  go: [
    ["dynamic `any` values", /\bany\b/g, "Gobra: interfaces are supported but the values here carry decoded-JSON dynamic types", "gobra-tutorial-448"],
    ["`encoding/json` calls", /\bjson\.[A-Z]/g, "Gobra stdlib support list does not include encoding/json; reflection is out of scope", "gobra-tutorial-38"],
    ["string operations", /\bstring\b/g, "Gobra: \"support for strings ... is very limited\"", "gobra-tutorial-448"],
    ["`sort.` calls", /\bsort\.[A-Z]/g, "higher-order comparator; needs a trusted spec", "gobra-tutorial-38"],
    ["closures", /:= func\(/g, "Gobra closure support is incomplete", "gobra-readme-prototype"],
    ["maps", /\bmap\[/g, "goose: maps supported; Gobra: supported, historically buggy", "goose-impl"],
    ["signed ints", /\bint(8|16|32|64)?\b/g, "goose: \"no signed integers are supported\"", "goose-writing"],
    ["float64", /\bfloat64\b/g, "float reasoning is outside every SMT-backed Go verifier surveyed", "gillian-cav21-caveats"],
    ["strconv float parse/print", /strconv\.(ParseFloat|FormatFloat|AppendFloat)/g, "shortest-round-trip printing; see RQ-9", "gillian-cav21-caveats"],
    ["utf8/utf16", /\bunicode\/utf(8|16)\b|utf16\./g, "surrogate-pair handling over strings", "gobra-tutorial-448"],
    ["goroutines", /\bgo func\b/g, "in-subset for both tools; recorded to show the seam has none", "goose-writing"],
    ["select", /\bselect\s*\{/g, "Gobra issue #902, open", "gobra-902"],
    ["generics", /\bfunc [A-Za-z_]+\[/g, "Gobra issue #671, open", "gobra-671"],
  ],
  ts: [
    ["generic type params", /\b(type|interface|const|function)\s+[A-Za-z_]+\s*=?\s*<[A-Z]/g, "Gillian-JS analyses ES5 Strict; types are elided before analysis", "gillian-cav21-caveats"],
    ["`JSON.` calls", /\bJSON\.[a-z]/g, "JSON is a built-in library that must be axiomatised or transpiled away", "gillian-cav21-caveats"],
    ["arrow functions", /=>/g, "ES6; Gillian-JS rewrites ES6 to ES5 Strict", "gillian-readme-es5"],
    ["`const`/`let`", /\b(const|let)\s/g, "ES6 block scoping", "gillian-readme-es5"],
    ["template literals", /`/g, "ES6", "gillian-readme-es5"],
    ["spread/rest", /\.\.\./g, "ES6", "gillian-readme-es5"],
    ["function-typed values (comparators, fences)", /\bCmp<|\bFence[A-Za-z]*<|\)\s*=>\s*[A-Z]/g, "\"Gillian does not support higher-order reasoning\"", "gillian-cav21-caveats"],
    ["Number formatting", /\b(Number|toFixed|toPrecision|toExponential)\b/g, "IEEE-754 shortest round trip; see RQ-9", "gillian-cav21-caveats"],
    ["BigInt", /\bBigInt\b|\d+n\b/g, "not in ES5", "gillian-readme-es5"],
  ],
};

let out = [];
out.push(`subset census — retrieved/executed 2026-08-16`);
out.push(``);
let totals = { go: 0, ts: 0 };
for (const [path, lang] of Object.entries(files)) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    out.push(`${path}: NOT FOUND (${e.code}) — run from the repository root`);
    continue;
  }
  const lines = text.split("\n").length;
  totals[lang] += lines;
  out.push(`## ${path}  (${lines} lines, ${lang})`);
  for (const [label, re, why, src] of probes[lang]) {
    const n = (text.match(re) || []).length;
    if (n === 0) continue;
    out.push(`  ${String(n).padStart(4)}  ${label.padEnd(32)} ${why}  [${src}]`);
  }
  out.push(``);
}
out.push(`total Go seam lines: ${totals.go}`);
out.push(`total TS seam lines: ${totals.ts}`);
console.log(out.join("\n"));
