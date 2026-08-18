// EXEMPLAR ONLY — not wired into any build or gate.
//
// The third target of the schema: human documentation. The taught table
// and the mini-AST are already documentation data; this renders them as
// Markdown, so reference prose is generated from the model rather than
// written beside it and left to rot.
//
// Run: bun run render-prose.ts sample-kernel-conformance.ndjson > prose-sample.md

const path = process.argv[2] ?? "sample-kernel-conformance.ndjson";
const lines = (await Bun.file(path).text()).split("\n").filter((l) => l.length > 0);
const recs = lines.map((l) => JSON.parse(l));

const head = recs[0];
if (head.record !== "header") throw new Error("first record is not a header");
if (head.format !== 1) throw new Error(`unsupported format ${head.format}; refusing`);

const of = (r: string) => recs.filter((x) => x.record === r);
const out: string[] = [];

out.push(`# The kernel act language: generated reference`);
out.push("");
out.push(`Generated from \`${path}\` (schema v${head.format}, source \`${head.source}\`).`);
out.push(`Do not edit: regenerate. Every row below is a fact the Lean model emitted about itself.`);
out.push("");

out.push(`## Declaration kinds`);
out.push("");
out.push(`Every identifier in the language is the content address of a declaration of one of these ${head.counts.kind} kinds. A digest of one kind never compares with a digest of another.`);
out.push("");
out.push(`| Rank | Kind |`);
out.push(`|---|---|`);
for (const k of of("kind")) out.push(`| ${k.rank} | \`${k.name}\` |`);
out.push("");

out.push(`## Hole stages`);
out.push("");
out.push(`A hole is a declared parameter of a program. Its stage rises and never falls; a production may observe a stage only in the reached-at-least direction.`);
out.push("");
out.push(`| Rank | Stage |`);
out.push(`|---|---|`);
for (const s of of("stage")) out.push(`| ${s.rank} | \`${s.name}\` |`);
out.push("");

out.push(`## Refusals`);
out.push("");
const refusals = of("refusal");
const machine = refusals.filter((r) => r.applicability === "machine-applicable");
out.push(`The door is the one place a candidate act becomes a lawful act. It never refuses without naming the law it defends and teaching a legal next move. ${refusals.length} reasons; ${machine.length} of the repairs are machine-applicable, meaning the lawful rewrite is a function of the refused candidate alone and an agent may apply it with no new information.`);
out.push("");
for (const r of refusals) {
  out.push(`### \`${r.reason}\``);
  out.push("");
  out.push(`**Law.** ${r.law}`);
  out.push("");
  out.push(`**Repair.** ${r.repair}`);
  out.push("");
  out.push(`**Applicability.** ${r.applicability}`);
  out.push("");
}

out.push(`## Machine-applicable repair catalog`);
out.push("");
out.push(`These are the codemods. Each is driven by the door's refusal output alone.`);
out.push("");
out.push(`| Reason | Repair |`);
out.push(`|---|---|`);
for (const r of machine) out.push(`| \`${r.reason}\` | ${r.repair} |`);
out.push("");

out.push(`## Types`);
out.push("");
out.push(`The closed type list, in the model's declaration order. A parameter marked *brand* is part of the type's identity: two values whose brands differ do not compare.`);
out.push("");
for (const t of of("type")) {
  const params = t.params.length
    ? ` \\[${t.params.map((p: any) => `${p.name}: *${p.role}*`).join(", ")}\\]`
    : "";
  out.push(`### \`${t.name}\`${params}`);
  out.push("");
  out.push(`*${t.form}*`);
  out.push("");
  for (const c of t.constructors) {
    const fields = c.fields.length
      ? c.fields.map((f: any) => `${f.name}: \`${f.type}\``).join(", ")
      : "_no fields_";
    out.push(`- \`${c.name}\` — ${fields}`);
  }
  out.push("");
}

out.push(`## Conformance vectors`);
out.push("");
out.push(`These check an implementation against the model's verdicts. They are safety statements about admission and encoding only; they promote no runtime guarantee.`);
out.push("");
out.push(`### Canonical encodings`);
out.push("");
out.push(`| Vector | Encoding |`);
out.push(`|---|---|`);
for (const e of of("encoding")) out.push(`| \`${e.name}\` | \`[${e.act.join(", ")}]\` |`);
out.push("");
out.push(`### Admission verdicts`);
out.push("");
out.push(`| Candidate | Verdict | Reason or encoding |`);
out.push(`|---|---|---|`);
for (const a of of("admission")) {
  out.push(a.verdict === "admitted"
    ? `| \`${a.name}\` | admitted | \`[${a.encoded.join(", ")}]\` |`
    : `| \`${a.name}\` | refused | \`${a.reason}\` |`);
}
out.push("");

console.log(out.join("\n"));
