# META-OUTPUTS — making the ledgers work harder

Status: **STAGED PROPOSAL — pre-grade**. Written 2026-08-30 on the
operator's ask ("make those meta outputs more useful; what else should
we be catching, for me the developer and for AI models working on
proofs"). Grounded in the day's actual friction: five Lean landings,
each verified by hand-made scratch files and eyeballed byte counts.
Every item is an emitter/tool change (`library/cas/tools/`),
dispatchable to the implementation lane; none changes a law.

## For the developer

- **D1 — the DEBTS projection (highest leverage).** Today "what do I
  owe" lives in four formats: `obligations` owed markers (14),
  `laws` unbound rulings (28), receipts with `resolution: PENDING`,
  and SPECS/staging "awaiting grill" rows. Emit ONE `debts.json` +
  `DEBTS.md` merging them, each row with a stable ID. Prerequisite
  worth doing anyway: **structured owed markers** — `owed(ID): text`
  in docstrings instead of the bare keyword, with `discharges(ID)`
  as the closing act, so the ledger pairs debts to discharges and
  can flag orphans (a discharge with no matching debt is a smell).
  Today's accidental catch (the harvester registering a docstring)
  becomes deliberate addressing.
- **D2 — surface diff.** `surface --check` says stale; it should say
  WHAT: declarations added/removed/signature-changed since the
  committed ledger, by name. Today that was three manual
  verifications of byte counts (992954 → 998233 → …).
- **D3 — the anchor checker (C5 as a lint).** Docstrings, bank
  files, and staged docs carry `File.lean:N` citations and named
  theorems; nothing checks them, and they rot. A checker that (a)
  verifies `File:line` citations still name the cited declaration,
  and (b) verifies `⟦Full.Name⟧`-anchored terms in prose exist in
  the surface — makes "soundness words link their judgment"
  machine-checked. Advisory for `.staging`, gating for `docs/`.

## For AI provers (what I actually wanted today)

- **A1 — `slice <decl>`: the proof-brief extractor.** Statement +
  direct dependencies' statements + axiom set + file neighborhood
  for one declaration. Agents today read whole files to build
  context; a slice standardizes dispatch briefs and cuts their
  context by an order of magnitude.
- **A2 — the `mentions` relation.** Emit an inverted index beside
  the surface: `constant → declarations mentioning it`. This is the
  proof plane's EDB — `decl(name, kind)` + `mentions(decl, const)`
  — and it unifies with the rules-as-views direction: the same
  Datalog machinery that queries the store queries the codebase
  ("all `_append` lemmas over `Word.find`" becomes a rule, not a
  grep). RUN-002's best behavior (the model NAMING held theorems
  instead of reproposing) becomes cheap to induce: hand the scout
  the index, not the files.
- **A3 — axioms as a gate.** Today's ritual, three times: write a
  scratch `#print axioms` file, run it, compare by eye. Emit
  `cas-axioms.json` (per-declaration axiom sets) with `--check`
  against the committed baseline and a hard ceiling assertion (the
  clean set); a landing that introduces `Classical.choice` or
  `sorryAx` goes red without anyone remembering to look.
- **A4 — unbound laws as scout targets.** `laws` already knows the
  28 rulings with no bound declaration; emit them as a ranked
  target list. That IS the formalization backlog, machine-known —
  today it is one number in a check tail.

## Worth catching, new

- **Vacuity census**: extend `emptyDenotations` — theorems whose
  premises have NO witness anywhere in the library (the
  vacuous-premise disease of RUN-002's refuted candidate, at library
  scale). The conformance lane's anti-vacuity kits are the
  precedent; this is the library-wide version.
- **Name-length budget**: `names.json` gains a length distribution —
  the de Bruijn-factor watch (RESEARCH.md) for concatenative names
  in prompts. Trivial, preventive.

## The meta-schema cutover (operator, 2026-08-30): TS consumes Lean JSON, typed

The organization verdict from the survey: the Lean side is
well-factored already — nineteen tools under `tools/`, one exe per
artifact, `--check` discipline throughout; what is MISSING is the
consumer side. The ledger JSONs (surface, obligations, laws, names,
ENVIRONMENT, and now debts/axioms) are touched by exactly two TS
files (`bin/cli/ledgers.ts`, `bin/mcp/http.ts`), both untyped. The
cutover law:

1. **The Lean-emitted JSONs are the authority; TS never re-states
   their shapes by hand — and the shapes themselves live in OUR OWN
   CLOSED SCHEMA TYPE** (operator refinement, 2026-08-30). A small
   `MetaSchema` AST inductive in `tools/MetaShapes.lean` — closed
   and still like the sort registry; a shape exists on the meta
   plane only if the AST can spell it, and the universe grows by
   grill. The three artifact shapes are TERMS of it; the printers
   (JSON Schema; the TS projection) are TOTAL functions over the
   AST, exhaustive by construction — which is where the matching
   functions come free. The TS emission carries the AST TYPE ITSELF
   as a discriminated union (`metaSchemaAst.ts` — the estate's own
   Effect-TS-facing AST type) plus the shapes as const VALUES of
   it; the Effect-Schema interpreter (`toEffectSchema`, written
   once, exhaustive over the union) is the consumer-cutover
   follow-on, so the AST value stays the single source of truth and
   arbitrary Effect Schemas cannot enter the plane. (v0 artifacts:
   names.json, cas-debts.json, cas-axioms.json;
   surface/obligations/laws follow once their shapes are worth
   freezing.)
2. **Consumers decode through the Effect Schemas, fail-closed** — a
   drifted ledger is a typed refusal at the boundary, never a
   silently misread field. Cutover order: `bin/cli/ledgers.ts` →
   `bin/mcp/http.ts` → the UI's DEBTS pane (which is then just
   another view over decoded ledger rows).
3. **New meta artifacts get the triple from birth** — debts and
   axioms land with their schemas in the same package of work.
4. The shapes live ONCE, as `MetaSchema` terms with doc comments
   (`MetaShapes.lean`); the projections are printers. Any future
   "stable core API" claim about these surfaces refers to the AST
   term and its emitted schema version, nothing else.
5. **Two flags, not taken here**: (a) `MetaSchema` values serialize
   canonically, so the meta-schemas can later become STORE CITIZENS
   — payloads under the existing schema sort (0x53), addresses and
   history included, no wire change (decision 23's new-sorts-NO
   honored); (b) the relation between `MetaSchema` and the schema
   sort's Effect-representation payloads is a ruling for the
   schema-json context owner — the meta plane's universe is
   deliberately smaller and deliberately its own.
6. **The Effect-4 leverage** (operator: "Effect4 schema has a lot of
   power here" — used on the consumer side of the interpreter, never
   as the authority): once `toEffectSchema` lands, v4 gives the meta
   plane for free — fail-closed decoding at every consumer;
   fast-check ARBITRARIES derived from the schema (property tests
   over meta artifacts without writing generators); equivalence and
   pretty-printing; annotations carrying the DERIVED NAMES (the
   naming homomorphism's strings riding the schema as v4
   annotations); and the store-citizenship path of flag 5a is
   concretely the EXISTING `CanonicalSchema.put` — v4 schemas
   already serialize to the representation the schema sort stores.
   One agreement gate owed when it lands: v4's derived JSON Schema
   byte-compared against the Lean-emitted one — two independent
   printers checking each other (the AGREEMENT family, again);
   the Lean printer remains the committed authority.

## Projects, sessions, and where APIs come from (operator, 2026-08-30)

The operator's close of the arc: *"the concept of a session or
project can now be defined as basically the unique data that creates
your metadata outputs."* Adopted framing, spelled with what exists:

- **A project IS its generating data**: the content roots + the
  pinned environment (ENVIRONMENT.json already carries tasks, exes,
  pins) + the pinned emitter set. Every meta output — surface,
  obligations, laws, names, debts, axioms — is a DERIVED VIEW of
  that data, deterministically emitted. Two projects with the same
  generating data have byte-identical meta outputs. Project
  identity is therefore content-derived, like everything else here.
- **The API of a project = its emitted meta surface** (the
  schema-typed ledgers + names + ViewSpec). "Where APIs come from"
  is now an answer, not a question: `API(P) = emit(generating(P))`.
  API versioning is content versioning; and on the monotone
  fragment, grow-only generating data yields GROW-ONLY APIs — views
  and names appear, none vanish — backward compatibility by
  construction, an inclusion question (`Store.Sub`) rather than a
  policy.
- **A session is a sub-word**: the admissions contributed in an
  interval — a pointwise-classifiable view, whose meta FOOTPRINT is
  the ledger delta the append-localization laws already isolate.
  The fold law at project scale: the project's present (its API,
  its debts) is a pure function of its history, no hidden state.
- **No new sorts needed**: a project spells as a `context` fold over
  its generating pieces with an `entry` chain as its session trail —
  the grammar's existing rows (12/13), exactly as the agent-step
  consumer already uses them. Decision 23 honored.

**Narrowed same day (operator: "that's the UI's hydrating API better
defined").** The general claim above stays as background theory — but
"API" already has ruled meanings here (the cas-http/0 wire profile,
the R14 stable strata, the library surface), so the coinage is
narrowed to the thing this machinery precisely defines: **the
hydration API**, the UI's boot-and-follow contract, two verbs:

- **`hydrate(P, cut)`** — the typed boot payload: names, the sort
  table, the meta-schema AST values, the ViewSpec(s), and each
  subscribed view's state folded to the cut. Everything a trunk
  instance needs to render from zero; all derived from P's
  generating data; all decoded fail-closed through the meta schemas;
  content-versioned, so "same data ⇒ same hydration" is a fact, not
  a promise. Served on the existing projections plane (decisions
  21/32) — this is what `/projections` serves, now typed.
- **`since(P, cut)`** — the delta stream: per-view append deltas
  (the localization laws make them well-defined), consumed as
  patches between cuts. Hydrate at a cut, patch until the next one —
  the whole client protocol, and it is the streaming research's own
  conclusion (`since(n)` as the resumption mechanism) landing on the
  view plane.

A UI **session** is then (generating data, cut, subscription set) —
nothing more. Ruling ask **M3 (narrowed)**: adopt `hydrate`/`since`
as the UI's API contract, typed by the meta schemas, served on the
projections plane; keep the general project-identity framing as
theory, unminted.

## The meta plane's home — one directory, declared inputs (operator, 2026-08-30)

The operator's requirement: the meta plane powers the APP, not just
development — so its file layout is API surface and gets ruled like
one. Proposed layout, migration to follow the in-flight emitter
package (paths land as briefed first; moving them mid-flight churns):

```
library/cas/meta/
  MANIFEST.json     the meta plane's own registry: one row per INPUT
                    (path, role, authority, which emitter reads it)
                    and one per OUTPUT (path, emitter, schema ref,
                    consumers) — REGISTRY.md's discipline applied to
                    the meta plane itself
  in/               every FILE-shaped input an emitter consumes:
                    the laws/rulings source, measurement fragments
                    (the compositionality pairs), ViewSpec instances.
                    THE INPUT-ADMISSION LAW: an emitter may read only
                    files with a MANIFEST row — inputs are declared
                    or refused. This is what makes hydration
                    provenance enumerable: generating data = Lean env
                    + store content + declared inputs, nothing
                    ambient.
  out/              every emitted ledger (surface, obligations, laws,
                    debts, axioms — today scattered under `surface/`
                    and `docs/lab-core/ENVIRONMENT.json`, both
                    migrated here)
```

TS-side consumer face stays `library/effects/src/cas/generated/meta/`
(the emitted AST + schemas). The daemon's `hydrate` serves from
`meta/out` + `generated/meta` — one directory to serve, one manifest
to trust. Migration items: move the three surface ledgers + retarget
ENVIRONMENT.json (envledger's write path + its consumers), update
mise task outputs and every `--check`, add the MANIFEST emitter or
hand-curated v0, wire the input-admission check (an emitter opening
an undeclared path is a red build).

Ruling ask **M4**: adopt the layout + the input-admission law;
migration package dispatched after the emitter lane lands.

## The app's own verification loop (operator, 2026-08-30)

"Not for the users' programs but for this one." With the cutover, the
app's TS stratifies into three trust strata, and the loop tightens by
making the strata ENUMERABLE and the bottom one shrink:

1. **Emitted TS** (kindTags, names, metaSchemaAst, vectors, mirrors,
   programs — growing): authority = the Lean source + deterministic
   emitter + byte gates. Drift is structurally caught (`--check`,
   `gen:ci`'s clean-tree assertion). Verification here IS the emitter
   loop.
2. **Gated handwritten TS** (Store.ts, Programs.ts, …): verified by
   conformance against the Lean model — vectors, byte gates,
   differential legs, fast-check, the SLS/PBT lane. The Lean model is
   the spec; the gates are the discharge.
3. **Shell TS** (components, the layout engine): verified by
   CONSUMING ONLY strata 1–2 through fail-closed typed boundaries
   (the meta schemas), plus purity — render is a pure function of
   (decoded hydration, spec, cut), so replay is the test harness.

**M5 — the trust census** (the actionable artifact): an emitter that
classifies every TS file in the app packages as
`emitted | gated (naming its gate) | bare`, with counters — a
debts-shaped ledger for the app's trust boundary. "Verifying this
app" becomes a measured, monotonically shrinking `bare` list instead
of a mood. Rides the same meta discipline (schema, `--check`,
hydration-servable).

## The service law — implementation + materialization (operator, 2026-08-30)

The operator's architecture model, adopted as the standing shape for
the estate's own TS (not literally every function — every MODULE
BOUNDARY): **all our TS is an implementation of a materialized
shape.** The Effect service pattern is the native spelling — a
Context.Service is exactly (declared shape, supplied implementation)
— and the estate already half-practices it (`CasStoreShape` +
`makeCasStoreOver`; the meta plane's AST + the coming interpreter).
The law makes it uniform:

- The SHAPE side is emitted or declared-and-gated, never implicit:
  service interfaces, wire types, vocabulary, spec records — stratum
  1 of the trust census, or on their way there.
- The IMPLEMENTATION side is what the census grades: model-gated
  where a Lean law exists, tested otherwise, `bare` never for long.
- This is the expressibility principle (the AE-8 proposal: every
  public API is a meta-language term; fluent surfaces are generated
  sugar) executed at module granularity.

**Where it points** (the operator's arrow, kept): once
`CasStoreShape`/`CasLoaderShape` and the door signatures are
DECLARED — a Lean-side API object emitted the way the grammar and
meta shapes are — the TS `Cas` object becomes one binding of a
canonical API declaration, and **CAS APIs for other languages are
emissions of the same declaration**: one authority, per-language
printers, conformance vectors as the cross-language gate (the
existing cross-host discipline, generalized). The API declaration
itself can then live as store content (the schema sort), making the
API a citizen with an address — versioned, hydratable, judged like
everything else.

**M7**: adopt the service law; first declared-API target =
`CasStoreShape`/`CasLoaderShape` + the program-plane doors, emitted
as the canonical CAS API object after the M4 reorg (sequenced:
census → triage cutovers → reorg → API object).

## The Dafny question (operator, 2026-08-30) — posture proposal

The ambition (an assembled verified-JS substrate) is right; the door
matters. Estate frictions with adopting Dafny-verified JS components
as trust sources:

- **A second proof authority.** The estate's anchor is the Lean
  kernel; Dafny's assurance chain is SMT-shaped (Dafny → Boogie →
  Z3) plus an unverified compile-to-JS step. The Coq-annex precedent
  governs: external verification is "evidence and technique only" —
  it enters as a TOOLS row with a trust statement, never as a grade.
- **The compiled-JS gap.** Dafny's theorems are about Dafny source;
  the JS emission is the compiler's claim. Our own discipline would
  demand vector/differential gates on the emitted JS anyway — at
  which point its marginal value over stratum 2 is stronger UPSTREAM
  assurance with identical downstream obligations.
- **The house-shaped use that survives both objections**: a
  Dafny-verified implementation as a DIFFERENTIAL PEER — another
  agreement leg beside ours, exactly the LeanServer pattern ("a peer
  under test, never an oracle"). High value for a bounded component
  (codec/canonicalization class), zero new trust anchor.
- **The sharper path to "verified JS" for this app** is the one
  already underway: grow the Lean→TS emission toward behavioral code
  (the materialize discipline IS the extractor), keep the kernel as
  the one authority, and discharge the emission gap with byte gates
  and differential conformance — stratum 1 eating stratum 2.

**M6**: adopt the posture — Dafny admissible as a TOOLS-row
experiment for one bounded component as a differential peer; never a
second trust anchor; the verified-substrate ambition routes through
emission growth + gates.

## Census results + the cutover queue (2026-08-30, M5 executed)

`cas-trust.json` live and gated: **59 files — 7 emitted, 12
model-gated, 27 tested, 13 bare** (test-spawned binaries and
barrel-reached files documented as v0-coarse). Full triage in the
lane report (session record); the durable queue:

**Two alarms found by the sweep:**

- **The refusal-vocabulary divergence**: TS `Cas.Error` has 7 tags,
  Lean `Cas.Lang.Refusal` has 6 constructors — different spellings,
  different arities, NOTHING joins them, and the TS tag crosses the
  wire as `Refused.clause`. An AGREEMENT-family gap at the
  vocabulary level; a correspondence (join table + gate) is
  model-first work.
- **The wire law has no model**: the whole cas-http/0 surface (path
  grammar, profile header, status table, capability envelope) exists
  only as prose (`PROFILE-CAS-HTTP-0.md`) mirrored by hand in
  `Protocol.ts`/`wire.ts` — the largest ungated protocol surface in
  the package. A Lean profile manifest is the prerequisite for any
  emission there.

**The 770-line finding**: `src/internal/merkle{Chunk,Graph,Tree}.ts`
hand-mirror the RETIRED lean-model-0.3, reachable only for a
four-line `pow2Below`. The honest disposition is DELETION (keep
`pow2Below` where its two model-gated consumers need it), not
emission from a retired model.

**Cutover queue, ranked by mechanical-ness** (each lands as an
emitter row + deletion of the hand twin): 1. `Architecture.ts` (57
verbatim strings; direct lowering, nothing to design);
2. `Exchanges.ts` + the Schema half of `Annotations.ts` (rows on the
existing emitwire/emitword path); 3. `refMarkers.ts` (two
constants); 4. `ledgers.ts` registry (after four more `MetaSchema`
shapes: environment, laws, obligations, admission-map);
5. `kindTags.ts` replay tags (blocked on the archived-Replay
ruling); 6. `canonicalJson.ts` and `mcp/handlers.ts` join their
gates (gate-candidates, not emissions).

## Audit verdicts + adoptions (2026-08-30)

The Lean-API audit's headline: the `Cas.Json` hand-roll is JUSTIFIED
but for corrected reasons — core DOES sort keys (the brief's premise
was wrong and the auditor refuted it); the real boundaries are
`JsonNumber`'s decimal form vs the no-float law, `partial` printers
(injectivity theorems cannot be stated of them), and `Format`'s
width-dependent layout. Boundary restated, hand-roll kept.

Adoptions (follow-on packages, bundle with the M4 reorg):

- `Lake.Toml.loadToml` replaces EnvLedger's ~250-line hand TOML
  grammar (importable with zero new deps — the tool's own "core has
  no TOML parser" premise is false of the toolchain).
- `IO.ofExcept` replaces `Gate.liftE`.
- `Lean.findDeclarationRanges?` gives obligation rows `file:line`.
- `Walk.isGenerated` → the env's own predicates (isAuxRecursor,
  isReservedName, …) — NOTE: moves the surface row set, so it is a
  byte-gated diff and a RULING, not a refactor.
- **The uniform emitted header** — `emitted: { schemaVersion,
  emitter, module, toolchain }` at every artifact's top level,
  unifying seven existing version spellings; `Lean.versionString`
  (deterministic, catches wrong-elan builds) with the stated cost
  that a toolchain bump diffs every artifact — a ruling; NO inputs
  fingerprint (defeats per-artifact gating; mise fingerprints out of
  band); the header shape joins `MetaSchema` (five lines); migration
  = one lane, one large regeneration diff across ~16 emitters.
- **The #guard rule**: elaboration-time guards are invisible to
  every ledger — load-bearing guards get promoted to named
  `theorem … := by decide` so they earn rows, axiom census entries,
  and ruling bindability.

Ruling asks: **M8** (the emitted header + audit-adoptions bundle,
one lane, one regeneration commit); **M9** (execute the cutover
queue in the ranked order, merkle deletion first); **M10** (the two
model-first items: the refusal-vocabulary correspondence and the
cas-http/0 profile manifest in Lean — formalization lanes, not
emissions).

## Sequencing recommendation

D1 (with structured owed IDs) and A3 first — both replace rituals
performed several times today. A2 second (it feeds every future
scout run and the Datalog direction at once). A1, D2, D3, A4, the
censuses after. Each is a bounded emitter change with a
deterministic output and a `--check`; all ride the existing
`mise run gen` discipline.

## Ruling asks

- **M1**: adopt structured owed markers (`owed(ID):` /
  `discharges(ID):`) as the docstring convention.
- **M2**: commission D1+A3 now; A2 next; rest on demand.
