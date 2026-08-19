/**
 * Prep probe: measure the drift between the plain-TypeScript SDK sketch and
 * the generated kernel vocabulary it claims fidelity to.
 *
 * The sketch states a fidelity contract in its own header — same cardinality
 * and same wire names as the model's closed inventories. Both sides are
 * import-free modules, so the comparison is over RUNNING VALUES rather than
 * over a reading of the source: the sketch's own exported example sentences
 * supply its field names, and the generated tables and builder supply theirs.
 *
 * Nothing here is a judgment. Each row prints what each side spells.
 *
 * Run: bun scratch/dev-codegen-prep/probe-sdk-drift.ts
 */
import * as Sketch from "../../verify/kernel/projections/kernel.js"
import * as Builder from "../../packages/plait/src/kernel/KernelBuilder.generated.js"
import * as Tables from "../../packages/plait/src/kernel/KernelTables.generated.js"

const line = (label: string) => console.log(`\n── ${label} ${"─".repeat(Math.max(0, 62 - label.length))}`)

const setDiff = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => ({
  onlyA: a.filter((x) => !b.includes(x)),
  onlyB: b.filter((x) => !a.includes(x)),
  sameOrder: a.length === b.length && a.every((x, i) => x === b[i]),
})

let drifts = 0
const report = (
  label: string,
  sketch: ReadonlyArray<string>,
  generated: ReadonlyArray<string>,
) => {
  const d = setDiff(sketch, generated)
  const agrees = d.onlyA.length === 0 && d.onlyB.length === 0 && d.sameOrder
  if (!agrees) drifts++
  console.log(
    `${agrees ? "AGREE " : "DRIFT "} ${label}  sketch ${sketch.length} / generated ${generated.length}`,
  )
  if (d.onlyA.length > 0) console.log(`        only in sketch:    ${d.onlyA.join(", ")}`)
  if (d.onlyB.length > 0) console.log(`        only in generated: ${d.onlyB.join(", ")}`)
  if (agrees === false && d.onlyA.length === 0 && d.onlyB.length === 0) {
    console.log(`        same members, DIFFERENT ORDER`)
    console.log(`        sketch:    ${sketch.join(", ")}`)
    console.log(`        generated: ${generated.join(", ")}`)
  }
}

// ── 1. The closed inventories ─────────────────────────────────────────────
line("closed inventories: cardinality and wire spelling")

const sketchKinds: ReadonlyArray<string> = [
  // The sketch's DeclKind is a type, so its members are read from the sketch's
  // own kind-rank witnesses: the digests it mints, one per kind it spells.
  "schema", "program", "policy", "capability", "lane", "algebra",
  "index", "resource", "ontology", "schedule", "template", "language",
]
report("declaration kinds", sketchKinds, Tables.KERNEL_DECL_KINDS)

const sketchStages = ["opened", "filled", "disputed", "decided", "sealed"]
report("hole stages", sketchStages, Tables.KERNEL_HOLE_STAGES)

const sketchReasons = Object.keys(Sketch.TAUGHT)
report("refusal reasons", sketchReasons, Tables.KERNEL_REFUSAL_REASONS)

// ── 2. The taught-refusal texts, string for string ────────────────────────
line("taught-refusal rows: law / repair / applicability, exact strings")

let textDrifts = 0
for (const row of Tables.KERNEL_REFUSALS) {
  const mine = (Sketch.TAUGHT as Record<string, {
    law: string
    repair: string
    applicability: string
  }>)[row.reason]
  if (mine === undefined) {
    console.log(`MISSING  ${row.reason}: the sketch has no row`)
    textDrifts++
    continue
  }
  for (const field of ["law", "repair", "applicability"] as const) {
    if (mine[field] === row[field]) continue
    textDrifts++
    console.log(`DRIFT    ${row.reason}.${field}`)
    console.log(`         sketch:    ${JSON.stringify(mine[field])}`)
    console.log(`         generated: ${JSON.stringify(row[field])}`)
  }
}
console.log(
  textDrifts === 0
    ? `AGREE    all ${Tables.KERNEL_REFUSALS.length} taught rows match byte for byte`
    : `\n${textDrifts} text drift(s) across ${Tables.KERNEL_REFUSALS.length} taught rows`,
)
drifts += textDrifts

// ── 3. Meaning: present on the generated rows, absent from the sketch ─────
line("the meaning field")
const tablesSource = await Bun.file(
  new URL("../../packages/plait/src/kernel/KernelTables.generated.ts", import.meta.url),
).text()
const sketchSource = await Bun.file(
  new URL("../../verify/kernel/projections/kernel.ts", import.meta.url),
).text()
const countMarker = (text: string) =>
  (text.match(/Draft meaning, awaiting ratification\./g) ?? []).length
console.log(`generated tables carry ${countMarker(tablesSource)} draft-meaning markers`)
console.log(`the sketch carries      ${countMarker(sketchSource)}`)
console.log(
  `taught refusals ${Tables.KERNEL_REFUSALS.length}`
  + ` + runtime structural kinds ${Tables.KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS.length}`
  + ` = ${Tables.KERNEL_REFUSALS.length + Tables.KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS.length}`
  + ` spellings in the generated vocabulary`,
)
console.log(`the sketch projects ${sketchReasons.length}`)

// ── 4. The generators and their field names ───────────────────────────────
line("the eight generators: field names, per generator")

// The sketch's own exported example sentences are its field-name witnesses.
const witnesses: Record<string, unknown> = {
  declare: Sketch.s1,
  resolve: Sketch.s2,
  emit: Sketch.s3,
  join: Sketch.s4,
  fold: Sketch.s5,
  decide: Sketch.s6,
  trigger: Sketch.s7,
  spawn: Sketch.s8,
}

const sketchTags = Object.values(witnesses).map((w) => (w as { act: string }).act)
report("generator tags", sketchTags, Builder.KERNEL_GENERATORS)

let fieldDrifts = 0
for (const generator of Builder.KERNEL_GENERATORS) {
  const modelFields = Builder.KERNEL_GENERATOR_FIELDS[generator].map((f) => f.name)
  const sketchFields = Object.keys(witnesses[generator] as object).filter((k) => k !== "act")
  const same = modelFields.length === sketchFields.length
    && modelFields.every((f, i) => f === sketchFields[i])
  if (!same) fieldDrifts++
  console.log(`${same ? "AGREE " : "DRIFT "} ${generator}`)
  console.log(`        model:  ${modelFields.join(", ")}`)
  console.log(`        sketch: ${sketchFields.join(", ")}`)
  const absent = Builder.KERNEL_GENERATOR_FIELDS[generator]
    .filter((f) => f.form.form === "absent").map((f) => f.name)
  if (absent.length > 0) {
    console.log(`        the declaration form carries no reference for: ${absent.join(", ")}`)
  }
}
drifts += fieldDrifts

// ── 5. The tag convention ─────────────────────────────────────────────────
line("the discriminant")
console.log(`sketch discriminant key:  "act"  (values ${sketchTags.slice(0, 3).join(", ")}, ...)`)
console.log(`runtime discriminant key: "_tag" (the door switches on candidate._tag / act._tag)`)
const sketchPredicateTag = (Sketch.s7 as { predicate: { production: string } }).predicate.production
console.log(`sketch trigger production: "${sketchPredicateTag}"  (key "production", kebab-case)`)
console.log(`runtime trigger tag:       "outcomeLanded" (key "_tag", camelCase)`)
drifts++

// ── 6. The carrier ────────────────────────────────────────────────────────
line("the number domain / carrier")
console.log(`model carrier, per the generated brand table:`)
for (const sort of Tables.KERNEL_BRANDED_SORTS) {
  console.log(`   ${sort.name}(${sort.params.join(",")}) carrier ${sort.carrier}`)
}
for (const sort of Tables.KERNEL_UNBRANDED_INDEXED_SORTS) {
  console.log(`   ${sort.name}(${sort.params.join(",")}) — no single carrier, no scalar alias`)
}
console.log(`generated alias default carrier: number  (KernelDigest<Kind, Carrier = number>)`)
console.log(`generated builder carrier:       bigint  (KernelDigestRef.id, literal.value, hole.name)`)
console.log(`the door's carrier:              bigint  (identity labels stay bigint through the door)`)
console.log(`the sketch's carrier:            string  (Digest<K> = string & brand; Value = string)`)
console.log(`the sketch's scalars:            number  (fence, floor, head, shard, hole, name)`)
console.log(`the builder's provenance format: ${Builder.KERNEL_BUILDER_PROVENANCE.format}`)
console.log(`the tables' provenance format:   ${Tables.KERNEL_TABLE_PROVENANCE.format}`)
drifts++

// ── 7. The brand mechanism ────────────────────────────────────────────────
line("the brand mechanism")
console.log(`generated: string-literal brand keys —`)
console.log(`   KernelBrand<Tag> = { readonly "~foldlab/plait/kernel/Brand": Tag }`)
console.log(`   the tables say why: that is how the estate's pinned Effect release`)
console.log(`   spells a type identity.`)
console.log(`sketch:    unique symbol brand keys —`)
console.log(`   declare const KIND: unique symbol; Digest<K> = string & { [KIND]: K }`)
console.log(`generated per-kind aliases: ${Tables.KERNEL_DECL_KINDS.length} (SchemaDigest ... LanguageDigest)`)
console.log(`sketch per-kind aliases:    0 (one parameterised Digest<K>)`)
drifts++

// ── 8. Provenance under law 10 ────────────────────────────────────────────
line("provenance shape")
console.log("tables:  " + JSON.stringify(Tables.KERNEL_TABLE_PROVENANCE, (_, v) =>
  typeof v === "bigint" ? `${v}n` : v))
console.log("builder: " + JSON.stringify(Builder.KERNEL_BUILDER_PROVENANCE, (_, v) =>
  typeof v === "bigint" ? `${v}n` : v))

line("total")
console.log(`${drifts} drift row(s) between the sketch and the generated vocabulary.`)
