# ANNOTATE — the cheap-model lane

Status: **STAGED HARNESS LAW — pre-grade, operational**. First live run
2026-08-30 (receipt `db94d656…`, family/wf-preserve, 106s). Governs how
`gpt-5.6-luna` is used inside the model-guided-development lane
([LOOP.md](LOOP.md), [BANK.md](BANK.md)).

## Tool posture

The codex CLI is registered in
[TOOLS.md](../../docs/lab-core/TOOLS.md) (`codex-cli@0.146.0`, models
`gpt-5.6-sol`, `gpt-5.6-luna`) with the role "reference-material
tagger/ingestion assistant" and an untrusted-projection trust statement.
This lane uses it in an adjacent role — bank annotator and candidate
scout over STAGED, pre-gate data. Consistent with the existing trust
statement (nothing it produces enters gated/formal work without operator
grilling), but a **role-extension row in TOOLS.md is owed before any
bank content it touched is promoted**. Until then its outputs live only
in this lane.

Rules, restated once: empty trust contribution; annotations are
proposals landing under `## Annotations` only ([BANK.md](BANK.md)
§Annotation protocol); every call leaves a receipt.

## Invocation shape

Every call is:

```
codex exec -m gpt-5.6-luna --ephemeral -s read-only -C <repo-root>
  -c mcp_servers={} -c model_reasoning_effort=low --color never
  --output-schema <schema.json> -o <out.json> -
```

read-only sandbox (the annotator may read the repo to ground itself,
never write), ephemeral session, MCP servers disabled, low effort,
JSON-schema-constrained final message, prompt on stdin. Escalation to
`gpt-5.6-sol` is NOT this harness's business — the single planner call
of [LOOP.md](LOOP.md) §7 is made deliberately, by hand, and recorded in
the run row.

## Usage

```
cd .staging/model-guided-development
bun annotate/run.ts families [wf-preserve codec ...]   # default: all nine
bun annotate/run.ts candidates --family CODEC \
    --target library/effects/src/cas/Value.ts \
    [--target <file> ...] [--intent "<sentence>" | --intent @file] \
    [--batches 4] [--counterexamples @file] [--label slug]
```

Outputs land in `annotate/out/*.json`; receipts append to
`annotate/receipts.jsonl` (ts, model, cli version, prompt sha256 and
bytes, output path and sha256, duration, exit). Both are local-only by
the staging depth ruling and regenerable; the durable record is what
curation folds into the tracked bank files, each fold carrying
`model, date, receipt sha` inline.

## Materialization

The `annotate/` directory is local-only. If absent (fresh clone, other
host), materialize it from the canonical blocks below into:

```
annotate/run.ts
annotate/schema/family-annotation.schema.json
annotate/schema/candidates.schema.json
annotate/prompts/family-annotation.md
annotate/prompts/candidates.md
```

This file is the source of truth; the local files are its
materialization. Edit here, re-materialize there, never let them drift
silently.

### annotate/run.ts

```ts
#!/usr/bin/env bun
// Model-guided development — cheap-model annotation harness.
// Canonical copy lives in ../ANNOTATE.md (the tracked law); this file is its
// local materialization (gitignored by the .staging depth ruling). Edit the
// .md block and re-materialize; do not let the two drift silently.
//
// Modes:
//   bun run.ts families [wf-preserve codec ...]     annotate bank family files
//   bun run.ts candidates --family CODEC --target <file> [--target <file>...]
//              [--intent "<sentence>" | --intent @file] [--batches 4]
//              [--counterexamples @file] [--label slug]
//
// Every call: gpt-5.6-luna, read-only sandbox, ephemeral session, MCP servers
// disabled, low reasoning effort, JSON-schema-constrained final message.
// Every call appends a receipt row to annotate/receipts.jsonl.

import { mkdirSync, readdirSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";

const LANE = dirname(import.meta.dir); // .staging/model-guided-development
const REPO = dirname(dirname(LANE)); // repo root
const OUT = join(LANE, "annotate", "out");
const RECEIPTS = join(LANE, "annotate", "receipts.jsonl");
const SCHEMAS = join(LANE, "annotate", "schema");
const PROMPTS = join(LANE, "annotate", "prompts");
const MODEL = "gpt-5.6-luna";
const CONCURRENCY = 3;
const CALL_TIMEOUT_MS = 420_000;

const FAMILIES = [
  "wf-preserve", "trace-excludes", "exact-step", "fail-closed",
  "distinctness", "homomorphism", "codec", "rejection-clause", "agreement",
];

const ANGLES = [
  "initialization and admission",
  "preservation, frames, and monotonicity",
  "failure, interruption, retry, and replay",
  "exactness, distinctness, canonicity, and inversion",
];

function sha256(s: string): string {
  const h = new Bun.CryptoHasher("sha256");
  h.update(s);
  return h.digest("hex");
}

async function readText(p: string): Promise<string> {
  return await Bun.file(p).text();
}

function excerpt(text: string, cap: number): string {
  if (text.length <= cap) return text;
  const half = Math.floor(cap / 2);
  return (
    text.slice(0, half) +
    `\n\n[... ${text.length - cap} bytes elided ...]\n\n` +
    text.slice(-half)
  );
}

async function fill(template: string, vars: Record<string, string>): Promise<string> {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{{${k}}}`, v);
  const leftover = out.match(/\{\{[a-zA-Z]+\}\}/g);
  if (leftover) throw new Error(`unfilled template vars: ${leftover.join(", ")}`);
  return out;
}

interface CallResult {
  outPath: string;
  ok: boolean;
  durationMs: number;
  exitCode: number;
}

async function callLuna(
  mode: string,
  slug: string,
  prompt: string,
  schemaPath: string,
): Promise<CallResult> {
  mkdirSync(OUT, { recursive: true });
  const ts = new Date().toISOString().replaceAll(":", "").slice(0, 15);
  const outPath = join(OUT, `${mode}-${slug}-${ts}.json`);
  const args = [
    "exec",
    "-m", MODEL,
    "--ephemeral",
    "-s", "read-only",
    "-C", REPO,
    "-c", "mcp_servers={}",
    "-c", "model_reasoning_effort=low",
    "--color", "never",
    "--output-schema", schemaPath,
    "-o", outPath,
    "-",
  ];
  const t0 = Date.now();
  const proc = Bun.spawn(["codex", ...args], {
    stdin: new TextEncoder().encode(prompt),
    stdout: "pipe",
    stderr: "pipe",
    timeout: CALL_TIMEOUT_MS,
  });
  const [exitCode, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
  const durationMs = Date.now() - t0;
  let ok = exitCode === 0 && existsSync(outPath);
  let outSha = "";
  if (ok) {
    const outText = await readText(outPath);
    try {
      JSON.parse(outText);
      outSha = sha256(outText);
    } catch {
      ok = false;
    }
  }
  const receipt = {
    ts: new Date().toISOString(),
    mode,
    slug,
    model: MODEL,
    cli: "codex-cli 0.146.0",
    promptSha256: sha256(prompt),
    promptBytes: prompt.length,
    outPath: outPath.replace(REPO + "/", ""),
    outSha256: outSha,
    durationMs,
    exitCode,
    ok,
  };
  appendFileSync(RECEIPTS, JSON.stringify(receipt) + "\n");
  if (!ok) {
    console.error(`FAIL ${mode}/${slug} exit=${exitCode} ${durationMs}ms`);
    console.error(stderr.slice(-2000));
  } else {
    console.log(`ok   ${mode}/${slug} ${durationMs}ms -> ${receipt.outPath}`);
  }
  return { outPath, ok, durationMs, exitCode };
}

async function pool<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await jobs[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

async function familiesMode(requested: string[]) {
  const targets = requested.length > 0 ? requested : FAMILIES;
  for (const f of targets) {
    if (!FAMILIES.includes(f)) throw new Error(`unknown family: ${f}`);
  }
  const template = await readText(join(PROMPTS, "family-annotation.md"));
  const schemaPath = join(SCHEMAS, "family-annotation.schema.json");
  const jobs = targets.map((f) => async () => {
    const familyPath = join(LANE, "bank", `${f}.md`);
    const familyDoc = existsSync(familyPath)
      ? await readText(familyPath)
      : `(no bank file yet — family ${f.toUpperCase()})`;
    const prompt = await fill(template, {
      family: f.toUpperCase(),
      familyDoc: excerpt(familyDoc, 32_000),
      familyList: FAMILIES.map((x) => x.toUpperCase()).join(", "),
    });
    return callLuna("family", f, prompt, schemaPath);
  });
  const res = await pool(jobs, CONCURRENCY);
  const failed = res.filter((r) => !r.ok).length;
  console.log(`families done: ${res.length - failed}/${res.length} ok`);
  if (failed > 0) process.exit(1);
}

interface CandidatesArgs {
  family: string;
  targets: string[];
  intent: string;
  batches: number;
  counterexamples: string;
  label: string;
}

function parseCandidatesArgs(argv: string[]): CandidatesArgs {
  const a: CandidatesArgs = {
    family: "", targets: [], intent: "", batches: 4, counterexamples: "", label: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--family") a.family = v();
    else if (k === "--target") a.targets.push(v());
    else if (k === "--intent") a.intent = v();
    else if (k === "--batches") a.batches = Number(v());
    else if (k === "--counterexamples") a.counterexamples = v();
    else if (k === "--label") a.label = v();
    else throw new Error(`unknown arg: ${k}`);
  }
  if (a.targets.length === 0) throw new Error("--target required");
  if (!a.family) throw new Error("--family required");
  return a;
}

async function candidatesMode(argv: string[]) {
  const a = parseCandidatesArgs(argv);
  const fam = a.family.toLowerCase();
  const template = await readText(join(PROMPTS, "candidates.md"));
  const schemaPath = join(SCHEMAS, "candidates.schema.json");

  let targetDoc = "";
  let budget = 80_000;
  for (const t of a.targets) {
    const text = await readText(t);
    const piece = excerpt(text, Math.min(24_000, budget));
    budget -= piece.length;
    targetDoc += `\n### ${t.replace(REPO + "/", "")}\n\n\`\`\`\n${piece}\n\`\`\`\n`;
    if (budget <= 0) break;
  }
  const intent = a.intent.startsWith("@") ? await readText(a.intent.slice(1)) : a.intent;
  const cx = a.counterexamples
    ? await readText(a.counterexamples.startsWith("@") ? a.counterexamples.slice(1) : a.counterexamples)
    : "(none recorded yet)";
  const familyPath = join(LANE, "bank", `${fam}.md`);
  const familyDoc = existsSync(familyPath) ? await readText(familyPath) : "(no bank entry)";
  const label = a.label || fam;

  const jobs = Array.from({ length: a.batches }, (_, i) => async () => {
    const prompt = await fill(template, {
      family: a.family.toUpperCase(),
      angle: ANGLES[i % ANGLES.length],
      batch: String(i + 1),
      targetDoc,
      intent: intent || "(none stated — infer conservatively from the target)",
      familyDoc: excerpt(familyDoc, 16_000),
      counterexamples: excerpt(cx, 12_000),
    });
    return callLuna("candidates", `${label}-b${i + 1}`, prompt, schemaPath);
  });
  const res = await pool(jobs, CONCURRENCY);
  const failed = res.filter((r) => !r.ok).length;
  console.log(`candidates done: ${res.length - failed}/${res.length} ok`);
  if (failed > 0) process.exit(1);
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "families") await familiesMode(rest);
else if (mode === "candidates") await candidatesMode(rest);
else {
  console.error("usage: bun run.ts families [family...] | bun run.ts candidates --family F --target <file> ...");
  process.exit(1);
}
```

### annotate/schema/family-annotation.schema.json

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["family", "applicability", "templates", "falsifiers", "negativeExamples", "relatedFamilies", "openQuestions"],
  "properties": {
    "family": { "type": "string" },
    "applicability": { "type": "array", "items": { "type": "string" } },
    "templates": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "form"],
        "properties": {
          "name": { "type": "string" },
          "form": { "type": "string" }
        }
      }
    },
    "falsifiers": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "mutation", "detects"],
        "properties": {
          "name": { "type": "string" },
          "mutation": { "type": "string" },
          "detects": { "type": "string" }
        }
      }
    },
    "negativeExamples": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["description", "whyExcluded"],
        "properties": {
          "description": { "type": "string" },
          "whyExcluded": { "type": "string" }
        }
      }
    },
    "relatedFamilies": { "type": "array", "items": { "type": "string" } },
    "openQuestions": { "type": "array", "items": { "type": "string" } }
  }
}
```

### annotate/schema/candidates.schema.json

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["candidates"],
  "properties": {
    "candidates": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["family", "statement", "whyUseful", "expectedFalsifier", "dependencies"],
        "properties": {
          "family": { "type": "string" },
          "statement": { "type": "string" },
          "whyUseful": { "type": "string" },
          "expectedFalsifier": { "type": "string" },
          "dependencies": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

### annotate/prompts/family-annotation.md

```text
You are an annotator for the outcome bank of a formal-verification estate
(TypeScript host + Lean 4 models; content-addressed store; effects language).
Your output is a SEARCH AID with zero trust contribution: everything you
propose will be checked or discarded by humans and machine checkers. Be
concrete and atomic; never invent APIs, file paths, or theorem names — only
cite what you actually saw in the repository or the bank entry below.

You are annotating the obligation family: {{family}}

The fixed family vocabulary is: {{familyList}}
(these are the only values allowed in relatedFamilies).

Current bank entry for {{family}}:

---BEGIN BANK ENTRY---
{{familyDoc}}
---END BANK ENTRY---

You are running inside the repository with read access. If the bank entry
cites sites (file:line), open a few of them to ground your proposals; prefer
`library/effects/`, `library/cas/`, and `experiments/` for context. Spend at
most a few minutes reading.

Propose, for this family:

1. applicability — questions a scout asks to decide whether this family
   applies to a piece of work (short, answerable yes/no against a target).
2. templates — candidate-invariant templates: a short name and a form
   written as an informal grammar over the target's own vocabulary, e.g.
   "forall op in <operations>: wf(s) and step(s,op,s') implies wf(s')".
   Atomic: one predicate shape per template.
3. falsifiers — mutations that SHOULD break instances of this family:
   name, the mutation to perform, and what a surviving (unbroken) check
   would reveal.
4. negativeExamples — sketches of states/inputs any correct instance must
   exclude, with why.
5. relatedFamilies — other families from the fixed vocabulary that often
   co-occur, worth checking in the same scout run.
6. openQuestions — anything ambiguous, missing, or suspicious in the bank
   entry itself.

Quality bar: every item must be specific enough that a checker could act on
it; drop anything generic ("test edge cases") rather than padding the list.
Final answer: the JSON object only.
```

### annotate/prompts/candidates.md

```text
You are a candidate scout for a formal-verification estate (TypeScript host +
Lean 4 models). You propose INGREDIENTS, not proofs: small atomic candidate
invariants and lemma shapes for the target below. Everything you emit will be
checked by deterministic tools; your output carries zero trust and is judged
only on whether it speeds the search. Never weaken, rewrite, or "fix" the
stated intent; never invent APIs or names not present in the material.

Batch {{batch}} — your assigned angle for THIS batch: {{angle}}.
Bias your candidates toward that angle; do not repeat obvious candidates
another angle would produce.

Obligation family in focus: {{family}}

Stated intent / draft contract:

{{intent}}

Target material (excerpts; you also have read access to the repository if
you need surrounding definitions — spend at most a few minutes):

{{targetDoc}}

Bank entry for the family (templates, falsifiers, history):

---BEGIN BANK ENTRY---
{{familyDoc}}
---END BANK ENTRY---

Known counterexamples so far (a candidate that any of these kills is worth
proposing ONLY if you say how it survives them):

{{counterexamples}}

Emit at most 8 candidates. For each:
- family: which family it serves (from: WF-PRESERVE, TRACE-EXCLUDES,
  EXACT-STEP, FAIL-CLOSED, DISTINCTNESS, HOMOMORPHISM, CODEC,
  REJECTION-CLAUSE, AGREEMENT).
- statement: ONE predicate or lemma shape, written over the target's own
  names (quantifiers explicit; assumption vs conclusion distinguished).
- whyUseful: one sentence — which obligation it would help close.
- expectedFalsifier: the concrete mutation or input class that would kill it
  if it is wrong.
- dependencies: names/definitions it needs; use "MISSING: <what>" to tag
  information you did not have.

Prefer candidates that separate known-good from known-bad behavior; drop
tautologies and restatements of the type signature.
Final answer: the JSON object only.
```

## Cost observations (running)

- family annotation, low effort: ~1.8–2 min wall, one call, repo
  exploration included (first receipt: 106s).
- Smoke test (trivial prompt, no exploration): ~35s. Budget scout runs
  accordingly: a 4-batch candidate wave ≈ 4–8 min wall at concurrency 3.
