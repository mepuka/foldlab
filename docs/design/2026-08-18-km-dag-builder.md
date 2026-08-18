# The DAG builder slice: kernel-algebra §6.2/§6.3 through the verified pipeline

Date: 2026-08-18. Status: SPECIFICATION for the next dispatch — queued
behind the format-2 canonical slice (in flight), which it consumes.
Realizes the ratified dual-construction design
(`2026-08-18-plait-kernel-algebra.md` §5.6, §6.2, §6.3) under the
operator's directive of this session: the builder surface is GENERATED
through the same rigorous toolchain as everything else — model to
corpus to codegen — never hand-authored where the grammar-as-data can
speak.

## 0. What this slice is

The meta DAG language: kernel programs authored as Effect-shaped
monadic builders that resolve to DAGs of typed nodes, where one
authoring act constructs both artifacts (§6.3):

- `program.digest` — the cataloged declaration's identity. Encode is
  total; publication is a separate explicit act (the DEV-705 ruling:
  declare-on-build is publication, never a side effect).
- `program.effect` — the executable, `Effect<_, Refusal, R>` with the
  service requirements visible in `R`.

The one-AST rule (§5.6) governs: the grammar is stated once as data —
now concretely, the kernel conformance corpus — and the builder is its
TS projection, served-equals-derived. A hand-written builder signature
that the corpus could generate is a defect, and the wall that enforces
it is a byte diff between the generated surface and the committed one.

## 1. The canonical program form

The §6.2 program declaration, serialized in the estate canonical form
the format-2 slice pins (one canonicalizer for the corpus AND for
declarations — this is where canonical-JSON compliance pays):

- Value shape (canonical member order applies): `edges` (from/to local
  names — the DAG explicit), `holes` (name and schema digest — R9's
  typed parameters), `lineage` (digest list), `nodes` (local name,
  generator tag, args as tagged references: digest, local name, or
  literal).
- The digest is the content address of exactly those canonical bytes.
  The Lean model carries identity labels as always; the runtime's
  hasher is the trusted base.
- Inside/outside discipline verbatim from §6.2: local names within the
  one canonical value; every outside reference a digest that must
  resolve, inheriting DAG-by-admission (`c7_pin_well_founded`, already
  transported to the kernel by unity's U5).

Model-side obligations (verify/unity):

- A declaration carrier modeling the §6.2 shape, with erasure to
  `Kernel.ProgramNode` lists (args flatten, edges become uses) so the
  existing transport laws (U3–U7) apply to built programs unchanged.
- Canonical encoding of declarations in Lean with the round-trip law
  (decode of encode is identity) and the injectivity statement at the
  model seam (the sentence-encoding precedent, one level up).
- A new corpus record group `program`: generated declaration vectors
  with their canonical bytes and identity labels, in the add-only
  discipline (new group, new counts key, format unchanged) — the
  conformance vectors every consumer replays.

## 2. The builder surface — a generated projection

`Kernel.program(name, ($) => ...)` with one `$`-constructor per
generator, in the record's own sketch shape (§6.3). Division of labor:

- GENERATED (from the corpus type and generator records, plus the doc
  records as annotations): the eight constructor signatures with
  argument order per the grammar (the Dvořák proximity rule applied
  mechanically, as §5.6 rules), the sort brands they accept and
  return, the refusal type, and the Effect Schema annotations on all
  of it. Regenerable, byte-identical, gate-checked.
- HAND-WRITTEN (small, reviewed, conformance-walled): the DAG
  accumulator core (node handles as typed local names), the canonical
  serializer call, the digest computation, the Effect compilation, and
  the CAS hooks below.

Requirements channel: `R` is derived, not declared — the union of the
service brands the program's generators imply (registers for decide,
lanes for emit, the catalog for resolve, folds for fold — the
affordances mapping generated from the corpus) plus the program's
unfilled holes, which surface as requirements exactly per the kernel's
provision correspondence (holes are the R channel read at data level;
filling is providing; the fill laws U-side and K-side already govern).

Unlawful shapes are unrepresentable at the surface (the intrinsic-layer
discipline): no constructor takes a clock, a random seed, a secret, a
closure value, or a last-writer-wins strategy. The negative controls
are compile-time probes in the repo's negative-control idiom — a
candidate spelling of each closure row must fail typechecking, with a
witness twin that compiles through the lawful constructor.

## 3. Execution and the CAS daemon hooks

Each generator application compiles to its runtime carrier (the §6.3
list: the join loop for joins, fold deployment for reductions,
registers for decisions, lanes for evidence). This slice ships the
compilation TYPED and the daemon integration STUBBED: a `CasDaemon`
service interface (publish a declaration, resolve a digest, read at an
anchor, land an outcome) as type-level surface only, so the builder's
`R` channel names it honestly while wiring stays a later, separately
gated slice. The workflow-engine refusal (G34) binds: no scheduler, no
engine, no durable clock enters through this spec.

## 4. The coherence wall — this slice's falsifiability

The T7-shaped suite the record demands of the builder because the
builder IS a compiler (§6.3):

- Generated program/valuation pairs; build-then-declare and
  declare-then-compile compared byte-for-byte.
- The corpus `program` vectors replayed by the TS builder: parsing a
  vector's declaration and re-encoding it must reproduce its committed
  canonical bytes (both-ways at the program level); building the same
  program through `$` must reach the same bytes and the same identity.
- Built candidates run through the admission door vectors: what the
  builder emits, the door admits; and the mutant arm (a deliberately
  degenerate builder that drops edges or flattens holes) must visibly
  diverge from the committed vectors.
- Go replays the `program` group read-only this slice: parse,
  validate, re-emit byte-identically.

## 5. What is deliberately NOT claimed

- The replay composition law stays stated-only and fenced; nothing in
  this slice states, proves, or consumes it, and the unity gate's
  fence extends over every new source. Program vectors are
  declarations, never execution records.
- No Effect-runtime correspondence: the fiber, scopes, and
  interruption are the trusted carrier (§6.5's non-claims verbatim);
  the deep embedding stays refused on the pin fact (§6.6 — closures
  have no canonical bytes, and closure introspection is a closure
  row, not an option).
- No liveness, no external-effect claim, no attribution beyond the
  fence, no second runtime.

## 6. Dispatch shape (when the canonical slice integrates)

Three lanes, disjoint territories, the proven pattern:

- Lane M (verify/unity + the corpus): declaration carrier, canonical
  encoding and laws, the `program` record group, gate arms.
- Lane B (packages + docs/generated): the generated `$` surface from
  the corpus, the builder core, dual construction, CAS stubs, the
  coherence suite, compile-time negative controls.
- Lane G (go): the `program` group consumer, both-ways.

Hard dependency: the format-2 canonical slice must be integrated
first — one canonicalizer, generated schemas with annotations, and doc
records are this slice's inputs. Same rules of engagement: upstream
models byte-frozen, no commits by lanes, coordinator integrates and
re-runs every gate.

## 7. Ratification points before or at the dispatch

- The `program` corpus group as an add-only extension (new group and
  counts key inside the current format) — consistent with the
  versioning discipline; confirm.
- The program declaration as a cataloged KIND through the one door is
  the record's "proposed kind" (§6.2) — this slice builds the form
  and the vectors; minting the kind in the runtime catalog is its own
  ruling.
- Hole typing: the §6.2 shape types holes by schema digest; the Lean
  kernel model's holes are bare names. The declaration carrier models
  the richer shape and erases the typing for law transport —
  confirm, or rule the kernel model grows typed holes first.
- Naming and placement of the builder package surface (public surface
  ruling KB-14 still open).

## 8. Freeze reconciliation at integration (measured, normative)

The build corrected the dispatch freeze in three places; the emitted
corpus is normative and every consumer implements these:

- **A fourth argref form exists**: `{"arg":"hole","name":<nat>}`,
  erasing to the kernel's hole argument. The freeze's own
  holey/filled demand required it — with only digest/local/literal
  there is no way to stand an argument in a hole, filling is the
  identity, and the twin is the same program. Found by the unity
  lane; independently and identically guessed by the Go lane before
  the emission landed.
- **The args map is a subset** of the generator's declared fields,
  never required to be total (a declare node may bind nothing). A
  validator demanding totality rejects every committed vector.
- **Edge rows follow the node walk** (newest-first, then field
  order); the SET is the law (edges must equal exactly the
  consumptions the local and hole references imply), the order is
  the emission's convention, and consumers may compare as sets.

The four committed vectors are ground-two-node, holey, holey-filled,
distill-shape; ground-two-node's erasure IS the bridge's planted
program, so the inhabitation edge of U7 is now an edge of a corpus
vector.
